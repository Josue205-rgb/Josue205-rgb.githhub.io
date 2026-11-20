/* Conexión con Supabase: convierte la base en memoria (SGE.store.db) a filas de tablas y viceversa,
   carga lo que la cuenta tiene permitido y guarda solo lo que cambió.
   Los permisos reales los impone la base de datos (ver supabase/esquema.sql). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.SGE = root.SGE || {}; root.SGE.nube = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- correspondencia colección ⇄ tabla ---------- */
  // claves: [columna, campo en el objeto, valor cuando la columna es null]
  const ARREGLOS = {
    materias: [],
    docentes: [],
    grupos: [['director_id', 'directorId', '']],
    asignaciones: [['grupo_id', 'grupoId', ''], ['materia_id', 'materiaId', ''], ['docente_id', 'docenteId', '']],
    acudientes: [],
    estudiantes: [['grupo_id', 'grupoId', ''], ['acudiente_id', 'acudienteId', '']],
    pagos: [['estudiante_id', 'estudianteId', '']],
    comunicados: [['audiencia', 'audiencia', 'todos']],
    eventos: [['grupo_id', 'grupoId', '']],
  };
  const TABLAS = [...Object.keys(ARREGLOS), 'config', 'notas', 'asistencia', 'observaciones'];
  const NOT_NULL = { asignaciones: ['grupo_id', 'materia_id'], pagos: ['estudiante_id'], comunicados: ['audiencia'] };

  function filaDeObjeto(tabla, o) {
    const data = { ...o }; delete data.id;
    const fila = { id: o.id, data };
    ARREGLOS[tabla].forEach(([col, campo, vacio]) => {
      const v = o[campo];
      fila[col] = v == null || v === '' ? ((NOT_NULL[tabla] || []).includes(col) ? vacio : null) : String(v);
    });
    return fila;
  }
  function objetoDeFila(tabla, f) {
    const o = { ...(f.data || {}), id: f.id };
    // las columnas mandan: son lo que revisan los permisos
    ARREGLOS[tabla].forEach(([col, campo, vacio]) => { o[campo] = f[col] == null ? vacio : f[col]; });
    return o;
  }

  /** db en memoria → { tabla: [filas] } */
  function aFilas(db) {
    const out = {};
    Object.keys(ARREGLOS).forEach((t) => { out[t] = (db[t] || []).map((o) => filaDeObjeto(t, o)); });
    out.config = [{ id: 'settings', data: db.settings || {} }, { id: 'horario', data: db.horario || [] }];
    out.notas = Object.entries(db.notas || {}).map(([k, per]) => {
      const [estudiante_id, asignacion_id] = k.split('|');
      return { id: k, estudiante_id, asignacion_id, data: per };
    });
    out.asistencia = [];
    Object.entries(db.asistencia || {}).forEach(([k, regs]) => {
      const [grupo_id, fecha] = k.split('|');
      Object.entries(regs || {}).forEach(([eid, estado]) => { if (estado) out.asistencia.push({ id: `${k}|${eid}`, grupo_id, fecha, estudiante_id: eid, estado }); });
    });
    out.observaciones = Object.entries(db.observaciones || {}).map(([k, texto]) => ({ id: k, estudiante_id: k.split('|')[0], texto }));
    return out;
  }

  /** { tabla: [filas] } → partes del db en memoria */
  function deFilas(filas) {
    const db = {};
    Object.keys(ARREGLOS).forEach((t) => { db[t] = (filas[t] || []).map((f) => objetoDeFila(t, f)).sort((a, b) => String(a.id).localeCompare(String(b.id), 'es', { numeric: true })); });
    const cfg = {}; (filas.config || []).forEach((f) => { cfg[f.id] = f.data; });
    db.settings = cfg.settings && Object.keys(cfg.settings).length ? cfg.settings : null;
    db.horario = Array.isArray(cfg.horario) ? cfg.horario : [];
    db.notas = {}; (filas.notas || []).forEach((f) => { db.notas[`${f.estudiante_id}|${f.asignacion_id}`] = f.data || {}; });
    db.asistencia = {};
    (filas.asistencia || []).forEach((f) => { const k = `${f.grupo_id}|${f.fecha}`; (db.asistencia[k] = db.asistencia[k] || {})[f.estudiante_id] = f.estado; });
    db.observaciones = {}; (filas.observaciones || []).forEach((f) => { db.observaciones[f.id] = f.texto; });
    return db;
  }

  /* ---------- diferencias ---------- */
  const firma = (f) => JSON.stringify(f);
  function instantanea(filas) {
    const s = {};
    TABLAS.forEach((t) => { s[t] = new Map((filas[t] || []).map((f) => [f.id, firma(f)])); });
    return s;
  }
  /** Qué hay que subir y qué borrar en cada tabla, comparando con la última instantánea. */
  function diferencias(prev, filas) {
    const out = {};
    TABLAS.forEach((t) => {
      const antes = prev[t] || new Map(), ahora = new Map((filas[t] || []).map((f) => [f.id, f]));
      const subir = [], borrar = [];
      ahora.forEach((f, id) => { if (antes.get(id) !== firma(f)) subir.push(f); });
      antes.forEach((_, id) => { if (!ahora.has(id)) borrar.push(id); });
      if (subir.length || borrar.length) out[t] = { subir, borrar };
    });
    return out;
  }

  /* ---------- cliente (solo navegador) ---------- */
  let cliente = null, snap = null, cola = Promise.resolve(), avisar = () => {}, enCurso = 0;
  const cfg = () => (typeof window !== 'undefined' && window.SGE_CONFIG) || {};

  const api = {
    aFilas, deFilas, diferencias, instantanea, TABLAS,
    get activa() { const c = cfg(); return !!(c.supabaseUrl && c.supabaseKey); },
    get cliente() {
      if (!cliente && api.activa) {
        if (!window.supabase) throw new Error('No se cargó la librería de Supabase.');
        cliente = window.supabase.createClient(cfg().supabaseUrl, cfg().supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
      }
      return cliente;
    },
    onError(f) { avisar = f; },

    /** Trae todas las filas visibles para la cuenta actual (en páginas de 1000). */
    async cargar() {
      const sb = api.cliente, filas = {};
      await Promise.all(TABLAS.map(async (t) => {
        const todas = [];
        for (let desde = 0; ; desde += 1000) {
          const { data, error } = await sb.from(t).select('*').order('id').range(desde, desde + 999);
          if (error) throw new Error(`No se pudo leer "${t}": ${error.message}`);
          todas.push(...data.map(limpiar));
          if (data.length < 1000) break;
        }
        filas[t] = todas;
      }));
      return filas;
    },
    /** Marca el estado actual como ya guardado. */
    fijar(db) { snap = instantanea(aFilas(db)); },

    /** Sube los cambios (en orden: nunca dos guardados a la vez). */
    sincronizar(db) {
      const filas = aFilas(db);
      enCurso++;
      cola = cola.then(async () => {
        const dif = diferencias(snap, filas), sb = api.cliente, errores = [];
        for (const t of Object.keys(dif)) {
          const { subir, borrar } = dif[t];
          let ok = true;
          for (let i = 0; i < subir.length; i += 500) {
            const { error } = await sb.from(t).upsert(subir.slice(i, i + 500), { onConflict: 'id' });
            if (error) { ok = false; errores.push(`${t}: ${error.message}`); break; }
          }
          for (let i = 0; ok && i < borrar.length; i += 200) {
            const { error } = await sb.from(t).delete().in('id', borrar.slice(i, i + 200));
            if (error) { ok = false; errores.push(`${t}: ${error.message}`); }
          }
          if (ok) snap[t] = new Map((filas[t] || []).map((f) => [f.id, firma(f)]));
        }
        if (errores.length) avisar(errores);
        return errores;
      }).catch((e) => { avisar([String(e.message || e)]); return [String(e.message || e)]; })
        .finally(() => { enCurso--; });
      return cola;
    },
    pendiente() { return cola; },
    get ocupada() { return enCurso > 0; },
  };
  // quita columnas de servicio para que la firma coincida con lo que genera aFilas()
  function limpiar(f) { const o = { ...f }; delete o.actualizado; delete o.autor_id; return o; }
  return api;
});
