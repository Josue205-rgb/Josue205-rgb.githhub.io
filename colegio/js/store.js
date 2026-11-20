/* Persistencia: localStorage en modo demostración; Supabase cuando está configurado (js/config.js).
   En modo Supabase no se guarda nada de los datos en el navegador. */
(function () {
  'use strict';
  const SGE = (window.SGE = window.SGE || {});
  const KEY = 'sge.db.v1';
  let db = null;
  let persistente = true;
  let timer = null;
  const listeners = new Set();
  const enNube = () => !!(SGE.nube && SGE.nube.activa);

  function leer() {
    try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; }
    catch (e) { persistente = false; return null; }
  }
  function escribir() {
    if (enNube()) return SGE.nube.sincronizar(db);
    try { localStorage.setItem(KEY, JSON.stringify(db)); persistente = true; }
    catch (e) { persistente = false; }
  }
  function guardar() {
    clearTimeout(timer);
    timer = setTimeout(() => { escribir(); listeners.forEach((f) => f()); }, 120);
  }

  /** Base vacía con reglas y materias por defecto. */
  function base() {
    const b = SGE.seed.generate();
    return { meta: { v: 1, sembrado: null, demo: false }, settings: b.settings, materias: b.materias, docentes: [], grupos: [], asignaciones: [], estudiantes: [], acudientes: [], horario: [], notas: {}, asistencia: {}, pagos: [], comunicados: [], eventos: [], observaciones: {}, _nid: 1000 };
  }

  const store = {
    get db() { return db; },
    get persistente() { return persistente; },
    get enNube() { return enNube(); },
    /** Carga desde Supabase solo lo que la cuenta puede ver. */
    async iniciarNube(esAdmin) {
      const partes = SGE.nube.deFilas(await SGE.nube.cargar());
      const b = base();
      const sinAjustes = !partes.settings;
      db = { ...b, ...partes, meta: { v: 1, demo: false, nube: true }, settings: { ...b.settings, ...(partes.settings || {}) } };
      if (sinAjustes && !esAdmin) db.settings.colegio = (window.SGE_CONFIG && window.SGE_CONFIG.colegio) || db.settings.colegio;
      SGE.nube.fijar(sinAjustes && esAdmin ? { ...db, settings: null } : db);
      if (sinAjustes && esAdmin) await escribir(); // primera vez: guarda las reglas por defecto
      return db;
    },
    /** Espera a que lo pendiente quede guardado (antes de recargar o salir). */
    async listo() {
      if (timer) { clearTimeout(timer); timer = null; await escribir(); listeners.forEach((f) => f()); }
      if (enNube()) await SGE.nube.pendiente();
    },
    iniciar() {
      db = leer();
      if (!db || !db.meta) { db = SGE.seed.generate(); escribir(); }
      return db;
    },
    guardar,
    onChange(f) { listeners.add(f); return () => listeners.delete(f); },
    reiniciarDemo() { db = SGE.seed.generate(); return escribir(); },
    vaciar() { db = base(); return escribir(); },
    nuevoId(p) {
      // Con varias personas guardando a la vez, un contador local chocaría: en la nube usamos ids aleatorios.
      if (enNube()) return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      db._nid = (db._nid || 1000) + 1; return p + db._nid;
    },
    exportar() { return JSON.stringify(db, null, 1); },
    importar(txt) {
      const o = JSON.parse(txt);
      const req = ['settings', 'materias', 'docentes', 'grupos', 'asignaciones', 'estudiantes', 'acudientes', 'horario', 'notas', 'asistencia', 'pagos', 'comunicados', 'eventos'];
      for (const k of req) if (!(k in o)) throw new Error('Falta la sección "' + k + '"');
      o.observaciones = o.observaciones || {};
      o.meta = o.meta || { v: 1, demo: false };
      db = o; return escribir();
    },
    /* CRUD sobre colecciones tipo arreglo */
    add(col, obj, prefijo) { obj.id = obj.id || store.nuevoId(prefijo || col[0]); db[col].push(obj); guardar(); return obj; },
    update(col, id, patch) { const o = db[col].find((x) => x.id === id); if (o) { Object.assign(o, patch); guardar(); } return o; },
    remove(col, id) { db[col] = db[col].filter((x) => x.id !== id); guardar(); },
    find(col, id) { return db[col].find((x) => x.id === id); },
    bytes() { if (enNube()) return 0; try { return (localStorage.getItem(KEY) || '').length * 2; } catch (e) { return 0; } },
  };
  SGE.store = store;
})();
