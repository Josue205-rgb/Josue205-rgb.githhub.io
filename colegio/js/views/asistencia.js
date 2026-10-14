/* Asistencia: tomar lista, resumen por grupo y vista para acudientes. */
(function () {
  'use strict';
  const SGE = window.SGE, U = SGE.ui, { h, badge, avatar, btn } = U, L = SGE.logic, q = SGE.q;
  const NOMBRE = { P: 'Presente', T: 'Tardanza', E: 'Excusa', A: 'Ausente', '': 'Sin registro' };

  function fechaDefecto() { let f = L.isoHoy(); while (!L.esHabil(f)) f = L.addDias(f, -1); return f; }
  const heat = (codes, fechas) => h('div', { class: 'heat', role: 'img', 'aria-label': 'Registro de asistencia por día' }, codes.map((c, i) => h('i', { 'data-c': c, title: (fechas ? L.fechaLarga(fechas[i]) + ': ' : '') + NOMBRE[c] })));

  /* ---------- tomar asistencia ---------- */
  function tomar(wrap, st) {
    const db = SGE.store.db, grupos = SGE.auth.grupos();
    U.clear(wrap);
    if (!grupos.length) return wrap.append(U.empty('Sin grupos asignados', 'No tienes grupos para tomar asistencia.'));
    const key = () => `${st.grupoId}|${st.fecha}`;
    const ests = () => db.estudiantes.filter((e) => e.grupoId === st.grupoId && e.estado === 'Activo').sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    const previo = db.asistencia[key()];
    const cur = {};
    ests().forEach((e) => { cur[e.id] = (previo && previo[e.id]) || 'P'; });
    const habil = L.esHabil(st.fecha), futura = st.fecha > L.isoHoy();
    const conteo = h('div', { class: 'row' });
    function pintarConteo() {
      U.clear(conteo);
      ['P', 'T', 'E', 'A'].forEach((c) => conteo.append(h('span', { class: 'badge b-' + { P: 'ok', T: 'warn', E: 'info', A: 'bad' }[c] }, `${NOMBRE[c]}: ${Object.values(cur).filter((x) => x === c).length}`)));
    }
    const filas = ests().map((e) => {
      const grupo = h('div', { class: 'att', role: 'group', 'aria-label': 'Asistencia de ' + e.nombre });
      function pintar() { U.clear(grupo); ['P', 'T', 'E', 'A'].forEach((c) => grupo.append(h('button', { type: 'button', 'data-c': c, class: cur[e.id] === c ? 'on' : '', 'aria-pressed': cur[e.id] === c ? 'true' : 'false', title: NOMBRE[c], onclick: () => { cur[e.id] = c; pintar(); pintarConteo(); } }, c))); }
      pintar();
      return { e, grupo, pintar, tr: h('tr', {}, h('td', {}, h('div', { class: 'person' }, avatar(e.nombre, 30), h('b', {}, e.nombre))), h('td', {}, grupo)) };
    });
    pintarConteo();
    const bar = h('div', { class: 'row', style: { justifyContent: 'space-between', marginBottom: '12px' } }, conteo,
      h('div', { class: 'row' }, btn('Todos presentes', 'ghost', () => { Object.keys(cur).forEach((k) => (cur[k] = 'P')); filas.forEach((f) => f.pintar()); pintarConteo(); }, 'check'),
        btn(previo ? 'Actualizar asistencia' : 'Guardar asistencia', 'primary', () => {
          if (!habil || futura) return U.toast('Solo se puede registrar en días hábiles que ya llegaron.', 'bad');
          db.asistencia[key()] = { ...cur }; SGE.store.guardar(); U.toast(`Asistencia de ${q.gn(st.grupoId)} guardada.`); SGE.repintar();
        }, 'check')));
    wrap.append(h('div', { class: 'card' },
      habil && !futura ? null : h('p', { class: 'badge b-warn', style: { marginBottom: '10px' } }, futura ? 'Esa fecha aún no llega.' : 'Ese día no es hábil (fin de semana).'),
      previo ? h('p', { class: 'small', style: { marginBottom: '10px' } }, badge('Ya registrada', 'ok'), ' Puedes corregirla y volver a guardar.') : null,
      bar, ests().length ? h('div', { class: 'tbl-scroll' }, h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, h('th', {}, 'Estudiante'), h('th', {}, 'P presente · T tardanza · E excusa · A ausente'))), h('tbody', {}, filas.map((f) => f.tr)))) : U.empty('Grupo sin estudiantes activos')));
  }

  /* ---------- resumen por grupo ---------- */
  function resumen(wrap, st) {
    const db = SGE.store.db;
    U.clear(wrap);
    const fechas = Object.keys(db.asistencia).filter((k) => k.startsWith(st.grupoId + '|')).map((k) => k.split('|')[1]).sort().slice(-20);
    if (!fechas.length) return wrap.append(U.empty('Aún no hay registros', 'Toma la primera lista para ver el resumen.'));
    const ests = db.estudiantes.filter((e) => e.grupoId === st.grupoId && e.estado === 'Activo');
    const am = L.asistenciaMap(db, fechas);
    const rows = ests.map((e) => ({ e, codes: fechas.map((f) => (db.asistencia[st.grupoId + '|' + f] || {})[e.id] || ''), a: am[e.id] || { P: 0, A: 0, T: 0, E: 0 } }));
    wrap.append(U.table({
      rows, pageSize: 30, search: ({ e }, t) => e.nombre.toLowerCase().includes(t), searchPlaceholder: 'Buscar estudiante…',
      cols: [
        { label: 'Estudiante', sortValue: ({ e }) => e.nombre, render: ({ e }) => h('div', { class: 'person' }, avatar(e.nombre, 30), h('b', {}, e.nombre)) },
        { label: `Últimos ${fechas.length} días`, nosort: true, render: ({ codes }) => heat(codes, fechas) },
        { label: 'Ausencias', align: 'center', sortValue: ({ a }) => a.A, render: ({ a }) => a.A },
        { label: 'Tardanzas', align: 'center', sortValue: ({ a }) => a.T, render: ({ a }) => a.T },
        { label: 'Excusas', align: 'center', sortValue: ({ a }) => a.E, render: ({ a }) => a.E },
        { label: '% asistencia', align: 'center', sortValue: ({ a }) => L.pctAsistencia(a), render: ({ a }) => { const p = L.pctAsistencia(a); return p == null ? '—' : h('span', { class: 'pct', style: { color: p < 85 ? 'var(--bad)' : 'inherit' } }, p + '%'); } },
      ],
    }));
    wrap.append(h('ul', { class: 'legend' }, [['P', 'var(--ok)'], ['T', '#d9a21b'], ['E', 'var(--brand)'], ['A', 'var(--bad)']].map(([c, col]) => h('li', {}, h('i', { style: { background: col } }), NOMBRE[c]))));
  }

  /* ---------- acudiente ---------- */
  function familia(el, arg) {
    const db = SGE.store.db, me = SGE.auth.me();
    const hijos = arg && q.est(arg) && me.hijos.find((x) => x.id === arg) ? me.hijos.filter((x) => x.id === arg) : me.hijos;
    el.append(U.pageHead('Asistencia', 'Registro diario de tus hijos en los últimos 20 días hábiles.', []));
    hijos.forEach((e) => {
      const fechas = Object.keys(db.asistencia).filter((k) => k.startsWith(e.grupoId + '|')).map((k) => k.split('|')[1]).sort().slice(-20);
      const codes = fechas.map((f) => (db.asistencia[e.grupoId + '|' + f] || {})[e.id] || '');
      const a = L.asistenciaMap(db, fechas)[e.id] || { P: 0, A: 0, T: 0, E: 0 }, p = L.pctAsistencia(a);
      const faltas = fechas.filter((f, i) => codes[i] === 'A' || codes[i] === 'E');
      el.append(h('section', { class: 'card', style: { marginBottom: '16px' } },
        h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('div', { class: 'person' }, avatar(e.nombre, 40), h('div', {}, h('b', {}, e.nombre), h('small', {}, q.gn(e.grupoId)))), h('div', { class: 'kpi-v', style: { color: p != null && p < 85 ? 'var(--bad)' : 'var(--ok)' } }, p != null ? p + '%' : '—')),
        h('div', { style: { margin: '14px 0' } }, heat(codes, fechas)),
        h('div', { class: 'row' }, ['P', 'T', 'E', 'A'].map((c) => badge(`${NOMBRE[c]}: ${a[c]}`, { P: 'ok', T: 'warn', E: 'info', A: 'bad' }[c]))),
        faltas.length ? h('p', { class: 'small muted', style: { marginTop: '10px' } }, 'Ausencias y excusas: ' + faltas.map((f) => L.fechaCorta(f)).join(', ')) : h('p', { class: 'small muted', style: { marginTop: '10px' } }, 'Sin ausencias en este periodo. ¡Excelente!')));
    });
  }

  function render(el, arg) {
    const me = SGE.auth.me();
    if (me.rol === 'acudiente') return familia(el, arg);
    const grupos = SGE.auth.grupos();
    const st = { grupoId: arg && grupos.find((g) => g.id === arg) ? arg : (grupos[0] || {}).id, fecha: fechaDefecto() };
    el.append(U.pageHead('Asistencia', 'Pasa lista en segundos y revisa quién está faltando.', []));
    const barra = h('div', { class: 'row no-print', style: { marginBottom: '14px' } });
    const cont = h('div', {});
    let tab = 'tomar';
    function pintar() {
      U.clear(barra);
      barra.append(U.selectEl(grupos.map((g) => ({ value: g.id, label: g.nombre })), st.grupoId, (v) => { st.grupoId = v; pintar(); }, 'Grupo'));
      if (tab === 'tomar') barra.append(h('input', { type: 'date', value: st.fecha, max: L.isoHoy(), style: { width: 'auto' }, 'aria-label': 'Fecha', onchange: (e) => { if (e.target.value) { st.fecha = e.target.value; pintar(); } } }), h('span', { class: 'muted small' }, L.fechaLarga(st.fecha)));
      (tab === 'tomar' ? tomar : resumen)(cont, st);
    }
    el.append(U.seg([{ value: 'tomar', label: 'Tomar asistencia' }, { value: 'resumen', label: 'Resumen del grupo' }], tab, (v) => { tab = v; pintar(); }, 'Sección'), h('div', { style: { height: '14px' } }), barra, cont);
    pintar();
  }
  SGE.views.asistencia = { render };
})();
