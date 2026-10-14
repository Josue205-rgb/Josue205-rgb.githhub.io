/* Calificaciones: planilla por materia y periodo + consolidado de grupo. */
(function () {
  'use strict';
  const SGE = window.SGE, U = SGE.ui, { h, badge, avatar, btn } = U, L = SGE.logic, q = SGE.q;
  const clamp = (v) => L.round1(Math.max(1, Math.min(5, v)));
  const parse = (txt) => { const s = String(txt).replace(',', '.').trim(); if (s === '') return null; const n = Number(s); return isNaN(n) ? NaN : n; };

  /* ---------- planilla ---------- */
  function planilla(wrap, st) {
    const db = SGE.store.db, cfg = db.settings, me = SGE.auth.me();
    U.clear(wrap);
    const a = q.asig(st.asigId);
    if (!a) return wrap.append(U.empty('Elige una materia', 'Selecciona materia y grupo para empezar a calificar.'));
    const m = q.materia(a.materiaId), pe = cfg.pesos;
    const ests = db.estudiantes.filter((e) => e.grupoId === a.grupoId && e.estado === 'Activo').sort((x, y) => x.nombre.localeCompare(y.nombre, 'es'));
    const datos = {}; // estId -> {t,e,p}
    ests.forEach((e) => { const c = (db.notas[`${e.id}|${a.id}`] || {})[st.periodo] || {}; datos[e.id] = { t: c.t ?? null, e: c.e ?? null, p: c.p ?? null }; });
    let sucio = false;
    const resumen = h('div', { class: 'row', style: { marginBottom: '12px' } });
    const estado = h('span', { class: 'muted small' });
    const refs = {};

    function calcular(e) {
      const per = { ...(db.notas[`${e.id}|${a.id}`] || {}) }; per[st.periodo] = datos[e.id];
      const np = L.notaPeriodo(datos[e.id], pe), nf = L.notaFinal(per, pe).final;
      return { np, nf };
    }
    function pintarFila(e) {
      const { np, nf } = calcular(e), r = refs[e.id];
      U.clear(r.np); r.np.append(np == null ? '—' : U.notaChip(np));
      U.clear(r.nf); r.nf.append(nf == null ? '—' : U.notaChip(nf));
      U.clear(r.des); r.des.append(U.desBadge(L.desempeno(np, cfg)));
    }
    function pintarResumen() {
      const nps = ests.map((e) => calcular(e).np);
      const con = nps.filter((n) => n != null), apr = con.filter((n) => n >= cfg.aprobado).length;
      U.clear(resumen);
      resumen.append(h('span', { class: 'badge b-info' }, 'Promedio del grupo: ' + (con.length ? U.nota(L.promedio(con)) : '—')),
        h('span', { class: 'badge b-ok' }, `Aprueban: ${apr}/${con.length || 0}`), h('span', { class: 'badge b-bad' }, `En bajo: ${con.length - apr}`), h('span', { class: 'badge b-neutral' }, `Sin nota: ${nps.length - con.length}`));
      U.clear(estado); estado.append(sucio ? '● Cambios sin guardar' : '');
    }

    const inputs = {};
    function celda(e, k) {
      const inp = h('input', { class: 'gin', type: 'text', inputmode: 'decimal', value: datos[e.id][k] == null ? '' : datos[e.id][k].toFixed(1), 'aria-label': `${{ t: 'Tareas', e: 'Examen', p: 'Participación' }[k]} de ${e.nombre}`, autocomplete: 'off',
        oninput: (ev) => {
          const v = parse(ev.target.value);
          const bad = v !== null && (isNaN(v) || v < 1 || v > 5);
          inp.classList.toggle('bajo', bad || (v !== null && v < cfg.aprobado));
          inp.setAttribute('aria-invalid', bad ? 'true' : 'false');
          if (!bad) { datos[e.id][k] = v === null ? null : clamp(v); sucio = true; pintarFila(e); pintarResumen(); }
        },
        onblur: (ev) => { const v = datos[e.id][k]; if (!inp.classList.contains('bajo') || (v != null && v < cfg.aprobado)) ev.target.value = v == null ? '' : v.toFixed(1); },
        onkeydown: (ev) => { if (ev.key === 'Enter' || ev.key === 'ArrowDown' || ev.key === 'ArrowUp') { const i = ests.indexOf(e) + (ev.key === 'ArrowUp' ? -1 : 1); const nx = ests[i]; if (nx) { inputs[nx.id + k].focus(); inputs[nx.id + k].select(); ev.preventDefault(); } } } });
      inputs[e.id + k] = inp;
      if (datos[e.id][k] != null && datos[e.id][k] < cfg.aprobado) inp.classList.add('bajo');
      return inp;
    }
    const filas = ests.map((e) => {
      refs[e.id] = { np: h('td', { class: 'al-center' }), nf: h('td', { class: 'al-center' }), des: h('td', {}) };
      return h('tr', {}, h('td', {}, h('div', { class: 'person' }, avatar(e.nombre, 28), h('b', {}, e.nombre))), h('td', { class: 'al-center' }, celda(e, 't')), h('td', { class: 'al-center' }, celda(e, 'e')), h('td', { class: 'al-center' }, celda(e, 'p')), refs[e.id].np, refs[e.id].nf, refs[e.id].des);
    });
    ests.forEach(pintarFila); pintarResumen();

    function guardar() {
      ests.forEach((e) => {
        const k = `${e.id}|${a.id}`, d = datos[e.id];
        const per = db.notas[k] || (db.notas[k] = {});
        if (d.t == null && d.e == null && d.p == null) delete per[st.periodo]; else per[st.periodo] = { t: d.t, e: d.e, p: d.p };
      });
      SGE.store.guardar(); sucio = false; pintarResumen(); U.toast(`Calificaciones de ${m.nombre} · ${q.gn(a.grupoId)} guardadas.`);
    }
    wrap.append(h('div', { class: 'card' },
      h('div', { class: 'row', style: { justifyContent: 'space-between', marginBottom: '8px' } },
        h('div', {}, h('h2', {}, `${m.nombre} · ${q.gn(a.grupoId)}`), h('p', { class: 'muted small' }, `Periodo ${st.periodo} · Tareas ${Math.round(pe.t * 100)}% · Exámenes ${Math.round(pe.e * 100)}% · Participación ${Math.round(pe.p * 100)}% · Escala 1,0 a 5,0 (aprobado desde ${cfg.aprobado.toFixed(1)})`)),
        h('div', { class: 'row' }, estado, btn('Guardar calificaciones', 'primary', guardar, 'check'))),
      resumen,
      ests.length ? h('div', { class: 'tbl-scroll' }, h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, ['Estudiante', 'Tareas', 'Examen', 'Participación', 'Nota del periodo', 'Acumulado', 'Desempeño'].map((x, i) => h('th', { class: i > 0 && i < 6 ? 'al-center' : '' }, x)))), h('tbody', {}, filas))) : U.empty('Grupo sin estudiantes activos'),
      h('p', { class: 'muted small', style: { marginTop: '10px' } }, 'Deja un campo vacío si aún no hay nota: el periodo se calcula con lo registrado. Usa ↑ ↓ o Enter para bajar de fila.')));
    window.onbeforeunload = null;
  }

  /* ---------- consolidado ---------- */
  function consolidado(wrap, st) {
    const db = SGE.store.db, cfg = db.settings;
    U.clear(wrap);
    const gid = st.grupoId;
    const asigs = db.asignaciones.filter((a) => a.grupoId === gid);
    const asis = L.asistenciaMap(db);
    const pos = L.puestos(db, gid, asis);
    const rows = db.estudiantes.filter((e) => e.grupoId === gid && e.estado === 'Activo').map((e) => ({ e, r: L.resumenEstudiante(db, e, asis), puesto: pos.puestos[e.id] || null }));
    wrap.append(U.table({
      rows, pageSize: 40, search: ({ e }, t) => e.nombre.toLowerCase().includes(t), searchPlaceholder: 'Buscar estudiante…',
      toolbar: [btn('Exportar CSV', 'ghost', () => U.descargar(`consolidado-${q.gn(gid)}.csv`, L.csv([['Puesto', 'Estudiante', ...asigs.map((a) => q.materia(a.materiaId).nombre), 'Promedio'], ...rows.slice().sort((x, y) => (x.puesto || 99) - (y.puesto || 99)).map(({ e, r, puesto }) => [puesto, e.nombre, ...asigs.map((a) => { const mm = r.materias.find((x) => x.asigId === a.id); return mm && mm.final != null ? mm.final.toFixed(1) : ''; }), r.promedio != null ? r.promedio.toFixed(1) : ''])]), 'text/csv;charset=utf-8'), 'download')],
      cols: [
        { label: 'Puesto', align: 'center', sortValue: ({ puesto }) => puesto || 999, render: ({ puesto }) => h('b', { class: 'num' }, puesto || '—') },
        { label: 'Estudiante', sortValue: ({ e }) => e.nombre, render: ({ e }) => h('div', { class: 'person' }, avatar(e.nombre, 28), h('b', {}, e.nombre)) },
        ...asigs.map((a) => ({ label: q.materia(a.materiaId).nombre.split(' ')[0], align: 'center', sortValue: ({ r }) => (r.materias.find((x) => x.asigId === a.id) || {}).final, render: ({ r }) => U.notaChip((r.materias.find((x) => x.asigId === a.id) || {}).final) })),
        { label: 'Promedio', align: 'center', sortValue: ({ r }) => r.promedio, render: ({ r }) => U.notaChip(r.promedio) },
      ],
    }));
    wrap.append(h('p', { class: 'muted small', style: { marginTop: '8px' } }, 'Acumulado: promedio de los periodos con nota. Pasa el cursor sobre los encabezados ordenables para clasificar.'));
  }

  function render(el, arg) {
    const db = SGE.store.db, me = SGE.auth.me();
    const asigs = (me.rol === 'docente' ? me.asigs : db.asignaciones).slice().sort((x, y) => (q.gn(x.grupoId).localeCompare(q.gn(y.grupoId), 'es', { numeric: true })) || q.materia(x.materiaId).nombre.localeCompare(q.materia(y.materiaId).nombre, 'es'));
    const grupos = SGE.auth.grupos();
    const st = { asigId: arg && asigs.find((a) => a.id === arg) ? arg : (asigs[0] || {}).id, periodo: SGE.periodoActual(), grupoId: (grupos[0] || {}).id };
    el.append(U.pageHead('Calificaciones', 'Planilla por materia y periodo con cálculo automático de la nota definitiva.', []));
    if (!asigs.length) return el.append(U.empty('Sin materias asignadas', 'Cuando tengas carga académica podrás calificar aquí.'));
    const barra = h('div', { class: 'row no-print', style: { marginBottom: '14px' } });
    const cont = h('div', {});
    let tab = 'planilla';
    function pintar() {
      U.clear(barra);
      if (tab === 'planilla') {
        barra.append(U.selectEl(asigs.map((a) => ({ value: a.id, label: `${q.gn(a.grupoId)} · ${q.materia(a.materiaId).nombre}` })), st.asigId, (v) => { st.asigId = v; pintar(); }, 'Materia y grupo'),
          U.seg([1, 2, 3, 4].map((p) => ({ value: p, label: 'P' + p })), st.periodo, (v) => { st.periodo = v; pintar(); }, 'Periodo'));
        planilla(cont, st);
      } else {
        barra.append(U.selectEl(grupos.map((g) => ({ value: g.id, label: g.nombre })), st.grupoId, (v) => { st.grupoId = v; pintar(); }, 'Grupo'));
        consolidado(cont, st);
      }
    }
    el.append(U.seg([{ value: 'planilla', label: 'Planilla de notas' }, { value: 'consolidado', label: 'Consolidado del grupo' }], tab, (v) => { tab = v; pintar(); }, 'Sección'), h('div', { style: { height: '14px' } }), barra, cont);
    pintar();
  }
  SGE.views.notas = { render };
})();
