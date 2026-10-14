/* Boletín imprimible con observaciones automáticas editables. */
(function () {
  'use strict';
  const SGE = window.SGE, U = SGE.ui, { h, btn } = U, L = SGE.logic, q = SGE.q;
  const isNum = (v) => typeof v === 'number';

  /** Resumen del estudiante considerando solo los periodos 1..p. */
  function hasta(db, e, p, asis) {
    const r = L.resumenEstudiante(db, e, asis), cfg = db.settings;
    const materias = r.materias.map((m) => {
      const v = m.porPeriodo.slice(0, p).filter(isNum);
      const def = v.length ? L.round1(v.reduce((a, b) => a + b, 0) / v.length) : null;
      return { ...m, def, des: L.desempeno(def, cfg) };
    });
    const prom = L.promedio(materias.map((m) => m.def));
    const bajas = materias.filter((m) => isNum(m.def) && m.def < cfg.aprobado).length;
    return { ...r, materias, promedio: prom, bajas, riesgo: L.riesgo(bajas, r.asistencia.P + r.asistencia.T + r.asistencia.A >= 5 ? r.asistPct : null) };
  }
  function puestoEn(db, e, p, asis) {
    const compañeros = db.estudiantes.filter((x) => x.grupoId === e.grupoId && x.estado === 'Activo').map((x) => ({ id: x.id, pr: hasta(db, x, p, asis).promedio })).filter((x) => isNum(x.pr)).sort((a, b) => b.pr - a.pr);
    const mi = compañeros.find((x) => x.id === e.id);
    if (!mi) return null;
    return { puesto: compañeros.findIndex((x) => x.pr === mi.pr) + 1, total: compañeros.length };
  }

  function papel(e, p, editable, asis) {
    const db = SGE.store.db, cfg = db.settings, g = q.grupo(e.grupoId), dir = g && q.docente(g.directorId);
    const r = hasta(db, e, p, asis), pu = puestoEn(db, e, p, asis), ac = q.acu(e.acudienteId);
    const k = `${e.id}|${p}`;
    const auto = L.observacion(r, q.primerNombre(e.nombre), cfg);
    const area = h('textarea', { rows: 3, 'aria-label': 'Observaciones del director de grupo', readonly: !editable, placeholder: 'Observaciones…',
      onchange: (ev) => { const v = ev.target.value.trim(); if (v && v !== auto) db.observaciones[k] = v; else delete db.observaciones[k]; SGE.store.guardar(); } }, db.observaciones[k] || auto);
    return h('article', { class: 'paper' },
      h('header', { class: 'paper-head' },
        h('div', { class: 'school' }, h('div', { class: 'brand-mark' }, 'N'), h('div', {}, h('h1', {}, cfg.colegio), h('small', {}, cfg.lema), h('small', {}, `${cfg.direccion} · ${cfg.telefono}`))),
        h('div', { style: { textAlign: 'right' } }, h('b', { style: { fontSize: '1.05rem' } }, 'INFORME ACADÉMICO'), h('small', {}, `Año lectivo ${cfg.anio}`), h('small', {}, `Hasta el periodo ${p}`))),
      h('div', { class: 'paper-data' },
        h('div', {}, h('span', {}, 'Estudiante'), h('b', {}, e.nombre)), h('div', {}, h('span', {}, 'Código'), h('b', {}, e.codigo)), h('div', {}, h('span', {}, 'Grupo'), h('b', {}, g ? g.nombre : '—')),
        h('div', {}, h('span', {}, 'Documento'), h('b', {}, e.documento)), h('div', {}, h('span', {}, 'Director de grupo'), h('b', {}, dir ? dir.nombre : '—')), h('div', {}, h('span', {}, 'Puesto'), h('b', {}, pu ? `${pu.puesto}° de ${pu.total}` : '—'))),
      h('table', {}, h('thead', {}, h('tr', {}, ['Asignatura', 'IH', 'P1', 'P2', 'P3', 'P4', 'Definitiva', 'Desempeño'].map((x, i) => h('th', { class: i > 1 && i < 6 && i - 1 === p ? 'sel' : '' }, x)))),
        h('tbody', {}, r.materias.map((m) => h('tr', {}, h('td', {}, m.materia, h('small', {}, m.docente)), h('td', {}, m.horas),
          m.porPeriodo.map((n, i) => h('td', { class: n != null && n < cfg.aprobado ? 'low' : '', style: i + 1 === p ? { background: '#fff8dc' } : null }, i < p && n != null ? n.toFixed(1) : '')),
          h('td', { class: m.def != null && m.def < cfg.aprobado ? 'low' : '' }, h('b', {}, m.def != null ? m.def.toFixed(1) : '')), h('td', {}, m.des.label)))),
        h('tfoot', {}, h('tr', {}, h('td', { class: 'l' }, h('b', {}, 'Promedio general')), h('td', { colspan: 5 }), h('td', {}, h('b', {}, r.promedio != null ? r.promedio.toFixed(1) : '')), h('td', {}, L.desempeno(r.promedio, cfg).label)))),
      h('div', { class: 'paper-data' },
        h('div', {}, h('span', {}, 'Asistencia'), h('b', {}, r.asistPct != null ? r.asistPct + '%' : '—')), h('div', {}, h('span', {}, 'Ausencias / tardanzas'), h('b', {}, `${r.asistencia.A} / ${r.asistencia.T}`)), h('div', {}, h('span', {}, 'Materias en desempeño bajo'), h('b', {}, r.bajas))),
      h('p', { style: { fontSize: '.78rem', color: '#666', margin: '0 0 10px' } }, `Escala: Superior 4,6–5,0 · Alto 4,0–4,5 · Básico ${cfg.aprobado.toFixed(1)}–3,9 · Bajo 1,0–${(cfg.aprobado - 0.1).toFixed(1)}. IH = intensidad horaria semanal.`),
      h('div', { class: 'obs' }, h('b', { style: { fontSize: '.8rem' } }, 'Observaciones'), area),
      h('div', { class: 'sign' }, h('div', {}, cfg.rector), h('div', {}, dir ? dir.nombre : 'Director de grupo'), h('div', {}, ac ? ac.nombre : 'Acudiente')));
  }

  function render(el, arg) {
    const db = SGE.store.db, me = SGE.auth.me(), asis = L.asistenciaMap(db);
    const lista = SGE.auth.estudiantes().filter((e) => e.estado === 'Activo');
    el.append(U.pageHead('Boletines', 'Informe académico listo para imprimir o guardar como PDF.', []));
    if (!lista.length) return el.append(U.empty('Sin estudiantes para mostrar', 'Aquí aparecerán los boletines cuando haya estudiantes activos.'));
    const grupos = db.grupos.filter((g) => lista.some((e) => e.grupoId === g.id));
    const inicial = arg && lista.find((e) => e.id === arg) ? lista.find((e) => e.id === arg) : lista[0];
    const st = { grupoId: inicial.grupoId, estId: inicial.id, p: SGE.periodoActual(), todos: false };
    const barra = h('div', { class: 'row no-print', style: { marginBottom: '16px' } });
    const cont = h('div', {});
    function pintar() {
      U.clear(barra); U.clear(cont);
      const delGrupo = lista.filter((e) => e.grupoId === st.grupoId).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
      if (!delGrupo.find((e) => e.id === st.estId)) st.estId = delGrupo[0].id;
      if (me.rol !== 'acudiente' && grupos.length > 1) U.add(barra, U.selectEl(grupos.map((g) => ({ value: g.id, label: g.nombre })), st.grupoId, (v) => { st.grupoId = v; st.todos = false; pintar(); }, 'Grupo'));
      U.add(barra, U.selectEl(delGrupo.map((e) => ({ value: e.id, label: e.nombre })), st.estId, (v) => { st.estId = v; st.todos = false; pintar(); }, 'Estudiante'),
        U.seg([1, 2, 3, 4].map((p) => ({ value: p, label: 'Hasta P' + p })), st.p, (v) => { st.p = v; pintar(); }, 'Periodo'),
        h('span', { style: { marginLeft: 'auto' } }), me.rol !== 'acudiente' ? btn(st.todos ? 'Ver uno solo' : 'Todo el grupo', 'ghost', () => { st.todos = !st.todos; pintar(); }, 'grupos') : null,
        btn(st.todos ? `Imprimir ${delGrupo.length} boletines` : 'Imprimir / PDF', 'primary', () => window.print(), 'print'));
      const editable = me.rol !== 'acudiente';
      if (st.todos) delGrupo.forEach((e) => cont.append(papel(e, st.p, editable, asis)));
      else cont.append(papel(lista.find((e) => e.id === st.estId), st.p, editable, asis));
    }
    el.append(barra, cont);
    pintar();
  }
  SGE.views.boletin = { render };
})();
