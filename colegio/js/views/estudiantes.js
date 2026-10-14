/* Estudiantes: listado, ficha con pestañas, matrícula y edición. */
(function () {
  'use strict';
  const SGE = window.SGE, U = SGE.ui, { h, icon, badge, avatar, btn, money } = U, L = SGE.logic, q = SGE.q;
  const estadoKind = { Activo: 'ok', Retirado: 'bad', 'Pre-matrícula': 'warn' };
  const fechaNac = (iso) => (iso ? L.fechaLarga(iso).replace(/^\S+ /, '') : '—');
  const edad = (iso) => { if (!iso) return ''; const n = new Date(iso + 'T12:00:00'), t = new Date(); let a = t.getFullYear() - n.getFullYear(); if (t < new Date(t.getFullYear(), n.getMonth(), n.getDate())) a--; return a + ' años'; };
  const riesgoBadge = (n) => (n === 'alto' ? badge('Riesgo alto', 'bad') : n === 'medio' ? badge('Atención', 'warn') : badge('Sin riesgo', 'ok'));

  /* ---------- formulario ---------- */
  function abrirForm(est) {
    const db = SGE.store.db, nuevo = !est, hoy = L.isoHoy();
    est = est || { sexo: 'F', estado: 'Pre-matrícula', beca: 0, grupoId: db.grupos[0] && db.grupos[0].id, parentesco: 'Madre' };
    if (!db.grupos.length) return U.toast('Primero crea un grupo en «Grupos y materias».', 'bad');
    const vals = { ...est, acudienteId: est.acudienteId || '__nuevo' };
    const f = U.form([
      { section: 'Datos del estudiante' },
      { name: 'nombre', label: 'Nombre completo', required: true, span: 2 },
      { name: 'documento', label: 'Documento', required: true },
      { name: 'sexo', label: 'Sexo', type: 'select', options: [{ value: 'F', label: 'Femenino' }, { value: 'M', label: 'Masculino' }] },
      { name: 'nacimiento', label: 'Fecha de nacimiento', type: 'date', required: true, max: hoy },
      { name: 'grupoId', label: 'Grupo', type: 'select', options: db.grupos.map((g) => ({ value: g.id, label: g.nombre })) },
      { name: 'estado', label: 'Estado de matrícula', type: 'select', options: ['Activo', 'Pre-matrícula', 'Retirado'] },
      { name: 'beca', label: 'Beca / descuento (%)', type: 'number', min: 0, max: 100, step: 5, help: '100 = exento de pensión' },
      { name: 'telefono', label: 'Teléfono' }, { name: 'eps', label: 'EPS' },
      { name: 'direccion', label: 'Dirección', span: 2 },
      { name: 'salud', label: 'Observaciones de salud', type: 'textarea', span: 2, rows: 2, placeholder: 'Alergias, condiciones, medicamentos…' },
      { section: 'Acudiente' },
      { name: 'acudienteId', label: 'Acudiente', type: 'select', span: 2, options: [{ value: '__nuevo', label: '＋ Crear nuevo acudiente' }, ...db.acudientes.map((a) => ({ value: a.id, label: a.nombre }))] },
      { name: 'acNombre', label: 'Nombre del nuevo acudiente', check: (v, all) => (all.acudienteId === '__nuevo' && !v ? 'Escribe el nombre del acudiente.' : '') },
      { name: 'acParentesco', label: 'Parentesco', type: 'select', options: ['Madre', 'Padre', 'Abuelo/a', 'Tío/a', 'Otro'] },
      { name: 'acTelefono', label: 'Teléfono del acudiente' }, { name: 'acEmail', label: 'Correo del acudiente', type: 'email' },
    ], vals);
    U.modal({ title: nuevo ? 'Nueva matrícula' : 'Editar estudiante', size: 'lg', body: f.el,
      actions: [{ label: 'Cancelar', kind: 'ghost' }, { label: nuevo ? 'Matricular' : 'Guardar cambios', kind: 'primary', onClick: () => {
        if (!f.valid()) return false;
        const v = f.get();
        let acId = v.acudienteId;
        if (acId === '__nuevo') acId = SGE.store.add('acudientes', { nombre: v.acNombre, parentesco: v.acParentesco, telefono: v.acTelefono, email: v.acEmail, ocupacion: '' }, 'ac').id;
        const datos = { nombre: v.nombre, documento: v.documento, sexo: v.sexo, nacimiento: v.nacimiento, grupoId: v.grupoId, estado: v.estado, beca: v.beca || 0, telefono: v.telefono, eps: v.eps, direccion: v.direccion, salud: v.salud, acudienteId: acId };
        if (nuevo) {
          const seq = db.estudiantes.reduce((m, e) => Math.max(m, +(e.codigo.split('-')[1] || 0)), 0) + 1;
          SGE.store.add('estudiantes', { ...datos, codigo: `${db.settings.anio}-${String(seq).padStart(4, '0')}`, matricula: hoy }, 'e');
          U.toast('Matrícula registrada.');
        } else { SGE.store.update('estudiantes', est.id, datos); U.toast('Cambios guardados.'); }
        SGE.repintar();
      } }] });
  }

  /* ---------- ficha ---------- */
  function ficha(id) {
    const db = SGE.store.db, e = q.est(id), me = SGE.auth.me();
    if (!e || !SGE.auth.puedeVerFicha(e)) return U.toast('No tienes acceso a esa ficha.', 'bad');
    const cfg = db.settings, hoy = L.isoHoy();
    const r = L.resumenEstudiante(db, e), g = q.grupo(e.grupoId), ac = q.acu(e.acudienteId);
    const pos = L.puestos(db, e.grupoId);
    const resumen = () => h('div', { class: 'stack' },
      h('div', { class: 'grid g4' },
        U.kpi({ label: 'Promedio', value: U.nota(r.promedio), sub: L.desempeno(r.promedio, cfg).label }),
        U.kpi({ label: 'Puesto en el grupo', value: pos.puestos[e.id] ? `${pos.puestos[e.id]}°` : '—', sub: `de ${pos.total}` }),
        U.kpi({ label: 'Asistencia', value: r.asistPct != null ? r.asistPct + '%' : '—', sub: `${r.asistencia.A} ausencias` }),
        U.kpi({ label: 'Materias en bajo', value: r.bajas, tone: r.bajas ? 'bad' : 'ok' })),
      h('div', { class: 'row' }, riesgoBadge(r.riesgo.nivel), h('span', { class: 'muted' }, r.riesgo.razones.join(' · ') || 'Sin señales de alerta.')),
      h('p', {}, L.observacion(r, q.primerNombre(e.nombre), cfg)));
    const notas = () => h('div', { class: 'tbl-scroll' }, h('table', { class: 'tbl compact' }, h('thead', {}, h('tr', {}, ['Materia', 'Docente', 'P1', 'P2', 'P3', 'P4', 'Acumulado'].map((x, i) => h('th', { class: i > 1 ? 'al-center' : '' }, x)))),
      h('tbody', {}, r.materias.map((m) => h('tr', {}, h('td', {}, m.materia), h('td', { class: 'muted' }, m.docente), m.porPeriodo.map((n) => h('td', { class: 'al-center' }, n == null ? h('span', { class: 'muted' }, '—') : U.notaChip(n))), h('td', { class: 'al-center' }, U.notaChip(m.final)))))));
    const asist = () => {
      const fechas = L.habilesAtras(L.addDias(hoy, -1), 20);
      const celdas = fechas.map((f) => (db.asistencia[e.grupoId + '|' + f] || {})[e.id] || '');
      return h('div', { class: 'stack' },
        h('div', { class: 'heat', role: 'img', 'aria-label': 'Asistencia de los últimos 20 días hábiles' }, celdas.map((c, i) => h('i', { 'data-c': c, title: L.fechaLarga(fechas[i]) + ': ' + ({ P: 'Presente', A: 'Ausente', T: 'Tardanza', E: 'Excusa', '': 'Sin registro' }[c]) }))),
        h('ul', { class: 'legend' }, [['P', 'Presente', 'var(--ok)'], ['T', 'Tardanza', '#d9a21b'], ['E', 'Excusa', 'var(--brand)'], ['A', 'Ausente', 'var(--bad)']].map(([c, l, col]) => h('li', {}, h('i', { style: { background: col } }), `${l}: ${r.asistencia[c]}`))),
        h('p', { class: 'muted small' }, 'Cada barra es un día hábil, del más antiguo al más reciente. El % descuenta las excusas.'));
    };
    const pagos = () => {
      const pag = new Set(db.pagos.filter((p) => p.estudianteId === e.id).map((p) => p.mes));
      if (e.beca >= 100) return h('p', {}, 'Estudiante exento de pensión (beca del 100%).');
      return h('div', { class: 'stack' }, h('p', {}, `Cuota mensual: `, h('b', {}, money(L.cuotaNeta(e, cfg))), e.beca ? ` (beca del ${e.beca}%)` : ''),
        h('div', { class: 'mes' }, Object.keys(L.MESES).map((m) => h('button', { type: 'button', 'data-s': L.estadoCuota(+m, cfg.anio, pag.has(+m), hoy), title: L.MESES[m], disabled: true }, L.MESES[m].slice(0, 1) + m))),
        h('ul', { class: 'legend' }, [['Pagada', 'var(--ok)'], ['Vencida', 'var(--bad)'], ['Pendiente', '#d9a21b']].map(([l, c]) => h('li', {}, h('i', { style: { background: c } }), l))));
    };
    const dato = (k, v) => h('div', {}, h('span', { class: 'muted small' }, k), h('div', {}, v || '—'));
    const datos = () => h('div', { class: 'grid g2' },
      dato('Documento', e.documento), dato('Nacimiento', fechaNac(e.nacimiento) + (e.nacimiento ? ' · ' + edad(e.nacimiento) : '')), dato('Teléfono', e.telefono), dato('EPS', e.eps),
      dato('Dirección', e.direccion), dato('Salud', e.salud || 'Sin observaciones'), dato('Fecha de matrícula', fechaNac(e.matricula)), dato('Director de grupo', g && q.docente(g.directorId) ? q.docente(g.directorId).nombre : '—'),
      dato('Acudiente', ac ? `${ac.nombre} (${ac.parentesco})` : '—'), dato('Contacto del acudiente', ac ? `${ac.telefono} · ${ac.email}` : '—'));
    const items = [{ id: 'res', label: 'Resumen', render: resumen }, { id: 'notas', label: 'Notas', render: notas }, { id: 'asis', label: 'Asistencia', render: asist }];
    if (me.rol !== 'docente') items.push({ id: 'pagos', label: 'Pensiones', render: pagos });
    items.push({ id: 'datos', label: 'Datos', render: datos });
    const actions = [{ label: 'Cerrar', kind: 'ghost' }, { label: 'Ver boletín', kind: 'ghost', icon: 'boletin', onClick: () => { SGE.go('boletin', e.id); } }];
    if (me.rol === 'admin') {
      actions.unshift({ label: 'Editar', kind: 'primary', icon: 'edit', onClick: () => { setTimeout(() => abrirForm(e), 20); } });
      if (e.estado === 'Activo') actions.splice(1, 0, { label: 'Retirar', kind: 'ghost', onClick: () => { setTimeout(async () => { if (await U.confirmar(`¿Retirar a ${e.nombre}? Conservará su historial pero saldrá de las listas activas.`, { ok: 'Retirar', danger: true })) { SGE.store.update('estudiantes', e.id, { estado: 'Retirado' }); U.toast('Estudiante retirado.'); SGE.repintar(); } }, 20); } });
    }
    U.modal({ title: '', size: 'lg', body: h('div', {},
      h('div', { class: 'person', style: { marginBottom: '16px' } }, avatar(e.nombre, 56), h('div', {}, h('h2', { style: { fontSize: '1.4rem' } }, e.nombre), h('div', { class: 'row', style: { gap: '8px', marginTop: '4px' } }, badge(g ? g.nombre : 'Sin grupo', 'info'), badge(e.estado, estadoKind[e.estado]), h('span', { class: 'muted small' }, 'Código ' + e.codigo)))),
      U.tabs(items)), actions });
  }

  /* ---------- vista ---------- */
  function render(el, arg) {
    const db = SGE.store.db, me = SGE.auth.me(), admin = me.rol === 'admin';
    const asis = L.asistenciaMap(db);
    const lista = SGE.auth.estudiantes();
    const rows = lista.map((e) => ({ e, r: e.estado === 'Activo' ? L.resumenEstudiante(db, e, asis) : null }));
    el.append(U.pageHead('Estudiantes', admin ? 'Matrícula, fichas y seguimiento académico.' : 'Estudiantes de tus grupos.',
      [btn('Exportar CSV', 'ghost', () => U.descargar('estudiantes.csv', L.csv([['Código', 'Nombre', 'Documento', 'Grupo', 'Estado', 'Acudiente', 'Teléfono acudiente', 'Promedio', 'Asistencia %'], ...rows.map(({ e, r }) => { const ac = q.acu(e.acudienteId) || {}; return [e.codigo, e.nombre, e.documento, q.gn(e.grupoId), e.estado, ac.nombre, ac.telefono, r ? r.promedio : '', r && r.asistPct != null ? r.asistPct : '']; })]), 'text/csv;charset=utf-8'), 'download'),
        admin ? btn('Nueva matrícula', 'primary', () => abrirForm(), 'plus') : null]));
    el.append(U.table({
      rows, pageSize: 14, searchPlaceholder: 'Buscar por nombre, código o documento…',
      search: ({ e }, t) => (e.nombre + ' ' + e.codigo + ' ' + e.documento).toLowerCase().includes(t),
      filters: [
        { label: 'Grupo', options: db.grupos.filter((g) => me.grupoIds.includes(g.id)).map((g) => ({ value: g.id, label: g.nombre })), test: ({ e }, v) => e.grupoId === v },
        { label: 'Estado', value: 'Activo', all: 'Todos', options: ['Activo', 'Pre-matrícula', 'Retirado'].map((s) => ({ value: s, label: s })), test: ({ e }, v) => e.estado === v },
        { label: 'Riesgo', options: [{ value: 'alto', label: 'Alto' }, { value: 'medio', label: 'Atención' }], test: ({ r }, v) => r && r.riesgo.nivel === v },
      ],
      cols: [
        { label: 'Estudiante', sortValue: ({ e }) => e.nombre, render: ({ e }) => h('div', { class: 'person' }, avatar(e.nombre), h('div', {}, h('b', {}, e.nombre), h('small', {}, e.codigo))) },
        { label: 'Grupo', sortValue: ({ e }) => q.gn(e.grupoId), render: ({ e }) => q.gn(e.grupoId) },
        { label: 'Acudiente', sortValue: ({ e }) => (q.acu(e.acudienteId) || {}).nombre, render: ({ e }) => { const a = q.acu(e.acudienteId); return a ? h('div', {}, a.nombre, h('small', { class: 'muted', style: { display: 'block' } }, a.telefono)) : '—'; } },
        { label: 'Promedio', align: 'center', sortValue: ({ r }) => (r ? r.promedio : null), render: ({ r }) => (r ? U.notaChip(r.promedio) : '—') },
        { label: 'Asistencia', align: 'center', sortValue: ({ r }) => (r ? r.asistPct : null), render: ({ r }) => (r && r.asistPct != null ? h('span', { class: 'pct' }, r.asistPct + '%') : '—') },
        { label: 'Riesgo', sortValue: ({ r }) => (r ? { alto: 2, medio: 1, ok: 0 }[r.riesgo.nivel] : -1), render: ({ r }) => (r ? h('span', { class: 'dot-r r-' + r.riesgo.nivel, title: r.riesgo.razones.join(', ') || 'Sin riesgo', style: { display: 'inline-block' } }) : '—'), align: 'center' },
        { label: 'Estado', sortValue: ({ e }) => e.estado, render: ({ e }) => badge(e.estado, estadoKind[e.estado]) },
      ],
      onRow: ({ e }) => ficha(e.id),
      empty: U.empty('No hay estudiantes con esos filtros', admin ? 'Registra la primera matrícula del año.' : 'Prueba con otro grupo o estado.', admin ? btn('Nueva matrícula', 'primary', () => abrirForm(), 'plus') : null),
    }));
    if (arg && q.est(arg)) setTimeout(() => ficha(arg), 30);
  }

  SGE.views.estudiantes = { render, ficha, nuevo: () => abrirForm(), editar: (id) => abrirForm(q.est(id)) };
})();
