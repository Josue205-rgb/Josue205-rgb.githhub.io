/* Persistencia en localStorage (con respaldo en memoria si el navegador la bloquea). */
(function () {
  'use strict';
  const SGE = (window.SGE = window.SGE || {});
  const KEY = 'sge.db.v1';
  let db = null;
  let persistente = true;
  let timer = null;
  const listeners = new Set();

  function leer() {
    try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; }
    catch (e) { persistente = false; return null; }
  }
  function escribir() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); persistente = true; }
    catch (e) { persistente = false; }
  }
  function guardar() {
    clearTimeout(timer);
    timer = setTimeout(() => { escribir(); listeners.forEach((f) => f()); }, 120);
  }

  const store = {
    get db() { return db; },
    get persistente() { return persistente; },
    iniciar() {
      db = leer();
      if (!db || !db.meta) { db = SGE.seed.generate(); escribir(); }
      return db;
    },
    guardar,
    onChange(f) { listeners.add(f); return () => listeners.delete(f); },
    reiniciarDemo() { db = SGE.seed.generate(); escribir(); },
    vaciar() {
      const base = SGE.seed.generate();
      db = { meta: { v: 1, sembrado: null, demo: false }, settings: base.settings, materias: base.materias, docentes: [], grupos: [], asignaciones: [], estudiantes: [], acudientes: [], horario: [], notas: {}, asistencia: {}, pagos: [], comunicados: [], eventos: [], observaciones: {}, _nid: 1000 };
      escribir();
    },
    nuevoId(p) { db._nid = (db._nid || 1000) + 1; return p + db._nid; },
    exportar() { return JSON.stringify(db, null, 1); },
    importar(txt) {
      const o = JSON.parse(txt);
      const req = ['settings', 'materias', 'docentes', 'grupos', 'asignaciones', 'estudiantes', 'acudientes', 'horario', 'notas', 'asistencia', 'pagos', 'comunicados', 'eventos'];
      for (const k of req) if (!(k in o)) throw new Error('Falta la sección "' + k + '"');
      o.observaciones = o.observaciones || {};
      o.meta = o.meta || { v: 1, demo: false };
      db = o; escribir();
    },
    /* CRUD sobre colecciones tipo arreglo */
    add(col, obj, prefijo) { obj.id = obj.id || store.nuevoId(prefijo || col[0]); db[col].push(obj); guardar(); return obj; },
    update(col, id, patch) { const o = db[col].find((x) => x.id === id); if (o) { Object.assign(o, patch); guardar(); } return o; },
    remove(col, id) { db[col] = db[col].filter((x) => x.id !== id); guardar(); },
    find(col, id) { return db[col].find((x) => x.id === id); },
    bytes() { try { return (localStorage.getItem(KEY) || '').length * 2; } catch (e) { return 0; } },
  };
  SGE.store = store;
})();
