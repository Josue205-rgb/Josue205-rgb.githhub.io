/* Docentes: listado, ficha con carga académica y horario, alta/edición. */
(function () {
  'use strict';
  const SGE = window.SGE, U = SGE.ui, { h, badge, avatar, btn } = U, L = SGE.logic, q = SGE.q;
  const chip = (m) => h('span', { class: 'chip', style: { '--h': m ? m.hue : 200 } }, m ? m.nombre : '—');
  const carga = (id) => SGE.store.db.asignaciones.filter((a) => a.docenteId === id);

  function abrirForm(d) {
    const db = SGE.store.db, nuevo = !d;
    d = d || { vinculacion: 'Planta', estado: 'Activo', materiaId: db.materias[0] && db.materias[0].id };
    const f = U.form([
      { name: 'nombre', label: 'Nombre completo', required: true, span: 2 },
      { name: 'documento', label: 'Documento', required: true },
      { name: 'materiaId', label: 'Especialidad', type: 'select', options: db.materias.map((m) => ({ value: m.id, label: m.nombre })) },
      { name: 'titulo', label: 'Formación', span: 2 },
      { name: 'email', label: 'Correo', type: 'email', required: true }, { name: 'telefono', label: 'Teléfono' },
      { name: 'vinculacion', label: 'Vinculación', type: 'select', options: ['Planta', 'Contrato', 'Cátedra'] },
      { name: 'estado', label: 'Estado', type: 'select', options: ['Activo', 'Inactivo'] },
      { name: 'ingreso', label: 'Fecha de ingreso', type: 'date' },
    ], d);
    U.modal({ title: nuevo ? 'Nuevo docente' : 'Editar docente', size: 'md', body: f.el, actions: [{ label: 'Cancelar', kind: 'ghost' }, { label: nuevo ? 'Agregar docente' : 'Guardar', kind: 'primary', onClick: () => {
      if (!f.valid()) return false;
      if (nuevo) SGE.store.add('docentes', f.get(), 'd'); else SGE.store.update('docentes', d.id, f.get());
      U.toast(nuevo ? 'Docente agregado.' : 'Cambios guardados.'); SGE.repintar();
    } }] });
  }

  function ficha(id) {
    const db = SGE.store.db, d = q.docente(id), me = SGE.auth.me();
    if (!d) return;
    const asigs = carga(id), horas = asigs.reduce((a, x) => a + x.horas, 0);
    const dirige = db.grupos.filter((g) => g.directorId === id);
    const dato = (k, v) => h('div', {}, h('span', { class: 'muted small' }, k), h('div', {}, v || '—'));
    const items = [
      { id: 'carga', label: 'Carga académica', render: () => asigs.length ? h('div', { class: 'tbl-scroll' }, h('table', { class: 'tbl compact' }, h('thead', {}, h('tr', {}, ['Materia', 'Grupo', 'Horas/sem'].map((x) => h('th', {}, x)))), h('tbody', {}, asigs.map((a) => h('tr', {}, h('td', {}, chip(q.materia(a.materiaId))), h('td', {}, q.gn(a.grupoId)), h('td', { class: 'num' }, a.horas)))))) : h('p', { class: 'muted' }, 'Sin carga asignada. Asígnala en «Grupos y materias».') },
      { id: 'hor', label: 'Horario', render: () => SGE.views.horarios.miniGrid({ docenteId: id }) },
      { id: 'datos', label: 'Datos', render: () => h('div', { class: 'grid g2' }, dato('Documento', d.documento), dato('Formación', d.titulo), dato('Correo', d.email), dato('Teléfono', d.telefono), dato('Vinculación', d.vinculacion), dato('Ingreso', d.ingreso), dato('Director de grupo', dirige.map((g) => g.nombre).join(', ') || 'No dirige grupo')) },
    ];
    const actions = [{ label: 'Cerrar', kind: 'ghost' }];
    if (me.rol === 'admin') actions.unshift({ label: 'Editar', kind: 'primary', icon: 'edit', onClick: () => { setTimeout(() => abrirForm(d), 20); } },
      { label: 'Eliminar', kind: 'ghost', icon: 'trash', onClick: () => { setTimeout(async () => {
        if (asigs.length || dirige.length) return U.toast('Tiene carga o dirige un grupo: reasígnalos antes de eliminar, o márcalo como Inactivo.', 'bad');
        if (await U.confirmar(`¿Eliminar a ${d.nombre}? Esta acción no se puede deshacer.`, { ok: 'Eliminar', danger: true })) { SGE.store.remove('docentes', d.id); U.toast('Docente eliminado.'); SGE.repintar(); }
      }, 20); } });
    U.modal({ title: '', size: 'lg', body: h('div', {},
      h('div', { class: 'person', style: { marginBottom: '16px' } }, avatar(d.nombre, 56), h('div', {}, h('h2', { style: { fontSize: '1.4rem' } }, d.nombre), h('div', { class: 'row', style: { gap: '8px', marginTop: '4px' } }, chip(q.materia(d.materiaId)), badge(d.estado, d.estado === 'Activo' ? 'ok' : 'neutral'), h('span', { class: 'muted small' }, `${horas} h/semana`)))),
      U.tabs(items)), actions });
  }

  function render(el) {
    const db = SGE.store.db;
    el.append(U.pageHead('Docentes', 'Plantilla, carga académica y horarios.', [btn('Nuevo docente', 'primary', () => abrirForm(), 'plus')]));
    const kp = db.docentes.map((d) => ({ d, horas: carga(d.id).reduce((a, x) => a + x.horas, 0), dirige: db.grupos.filter((g) => g.directorId === d.id) }));
    el.append(U.table({
      rows: kp, pageSize: 15, searchPlaceholder: 'Buscar docente…', search: ({ d }, t) => (d.nombre + ' ' + d.email + ' ' + (q.materia(d.materiaId) || {}).nombre).toLowerCase().includes(t),
      filters: [{ label: 'Especialidad', options: db.materias.map((m) => ({ value: m.id, label: m.nombre })), test: ({ d }, v) => d.materiaId === v }],
      cols: [
        { label: 'Docente', sortValue: ({ d }) => d.nombre, render: ({ d }) => h('div', { class: 'person' }, avatar(d.nombre), h('div', {}, h('b', {}, d.nombre), h('small', {}, d.email))) },
        { label: 'Especialidad', sortValue: ({ d }) => (q.materia(d.materiaId) || {}).nombre, render: ({ d }) => chip(q.materia(d.materiaId)) },
        { label: 'Carga', align: 'center', sortValue: ({ horas }) => horas, render: ({ horas }) => h('div', {}, h('b', { class: 'num' }, horas + ' h'), h('div', { class: 'bar-h', title: horas + ' de 30 horas posibles' }, h('i', { style: { width: Math.min(100, (horas / 30) * 100) + '%' } }))) },
        { label: 'Dirige', render: ({ dirige }) => dirige.map((g) => g.nombre).join(', ') || h('span', { class: 'muted' }, '—') },
        { label: 'Vinculación', key: 'vinc', sortValue: ({ d }) => d.vinculacion, render: ({ d }) => d.vinculacion },
        { label: 'Estado', render: ({ d }) => badge(d.estado, d.estado === 'Activo' ? 'ok' : 'neutral') },
      ],
      onRow: ({ d }) => ficha(d.id),
      empty: U.empty('Aún no hay docentes', 'Agrega el primero para asignarle materias.', btn('Nuevo docente', 'primary', () => abrirForm(), 'plus')),
    }));
  }
  SGE.views.docentes = { render, ficha };
})();
