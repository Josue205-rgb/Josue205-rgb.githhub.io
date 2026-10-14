/* Grupos (cargas académicas) y materias. */
(function () {
  'use strict';
  const SGE = window.SGE, U = SGE.ui, { h, badge, btn } = U, L = SGE.logic, q = SGE.q;
  const chip = (m) => h('span', { class: 'chip', style: { '--h': m ? m.hue : 200 } }, m ? m.nombre : '—');

  function avisoChoques() {
    const db = SGE.store.db, c = L.conflictosDocentes(db.horario, db.asignaciones);
    if (c.length) U.toast(`Atención: ${c.length} choque${c.length > 1 ? 's' : ''} de docentes en el horario. Revísalo en «Horarios».`, 'bad');
  }

  function formGrupo(g) {
    const db = SGE.store.db, nuevo = !g;
    g = g || { cupo: 30, jornada: 'Mañana', directorId: db.docentes[0] && db.docentes[0].id };
    const f = U.form([
      { name: 'nombre', label: 'Nombre del grupo', required: true, placeholder: 'Ej. 7°B' },
      { name: 'grado', label: 'Grado', type: 'number', required: true, min: 0, max: 11 },
      { name: 'salon', label: 'Salón' }, { name: 'cupo', label: 'Cupo máximo', type: 'number', min: 1, max: 60 },
      { name: 'directorId', label: 'Director de grupo', type: 'select', span: 2, options: db.docentes.map((d) => ({ value: d.id, label: d.nombre })) },
    ], g);
    U.modal({ title: nuevo ? 'Nuevo grupo' : 'Editar grupo', size: 'sm', body: f.el, actions: [{ label: 'Cancelar', kind: 'ghost' }, { label: nuevo ? 'Crear grupo' : 'Guardar', kind: 'primary', onClick: () => {
      if (!f.valid()) return false;
      const v = f.get();
      if (nuevo) {
        const ng = SGE.store.add('grupos', { ...v, jornada: 'Mañana' }, 'g');
        db.materias.forEach((m) => { const ds = db.docentes.filter((d) => d.materiaId === m.id && d.estado === 'Activo'); if (ds.length) SGE.store.add('asignaciones', { grupoId: ng.id, materiaId: m.id, docenteId: ds[0].id, horas: m.horas }, 'a'); });
        U.toast('Grupo creado con la carga académica por defecto.');
      } else { SGE.store.update('grupos', g.id, v); U.toast('Grupo actualizado.'); }
      SGE.repintar();
    } }] });
  }

  function detalle(gid) {
    const db = SGE.store.db, g = q.grupo(gid);
    const cuerpo = h('div', {});
    function pintar() {
      U.clear(cuerpo);
      const asigs = db.asignaciones.filter((a) => a.grupoId === gid);
      const horas = asigs.reduce((a, x) => a + x.horas, 0);
      const usadas = new Set(asigs.map((a) => a.materiaId));
      const libres = db.materias.filter((m) => !usadas.has(m.id));
      U.add(cuerpo, 
        h('p', { class: 'muted', style: { marginBottom: '12px' } }, `${g.salon || 'Sin salón'} · Director: ${(q.docente(g.directorId) || {}).nombre || '—'} · `, h('b', { class: horas > 30 ? 'low' : '', style: horas > 30 ? { color: 'var(--bad)' } : null }, `${horas} de 30 bloques semanales`)),
        h('div', { class: 'tbl-scroll' }, h('table', { class: 'tbl compact' }, h('thead', {}, h('tr', {}, ['Materia', 'Docente', 'Horas/sem', ''].map((x) => h('th', {}, x)))),
          h('tbody', {}, asigs.map((a) => {
            const m = q.materia(a.materiaId);
            const ordenados = db.docentes.slice().sort((x, y) => (y.materiaId === a.materiaId) - (x.materiaId === a.materiaId));
            return h('tr', {},
              h('td', {}, chip(m)),
              h('td', {}, U.selectEl(ordenados.map((d) => ({ value: d.id, label: d.nombre + (d.materiaId === a.materiaId ? '' : ' (otra especialidad)') })), a.docenteId, (v) => { SGE.store.update('asignaciones', a.id, { docenteId: v }); U.toast('Docente reasignado.'); avisoChoques(); }, 'Docente de ' + m.nombre)),
              h('td', {}, h('input', { type: 'number', min: 0, max: 10, value: a.horas, style: { width: '70px' }, 'aria-label': 'Horas de ' + m.nombre, onchange: (e) => { const v = Math.max(0, Math.min(10, +e.target.value || 0)); SGE.store.update('asignaciones', a.id, { horas: v }); pintar(); } })),
              h('td', {}, h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Quitar ' + m.nombre, onclick: () => { SGE.store.remove('asignaciones', a.id); SGE.store.db.horario = SGE.store.db.horario.filter((s) => s.asigId !== a.id); SGE.store.guardar(); pintar(); } }, U.icon('trash', 16))));
          })))),
        libres.length ? h('div', { class: 'row', style: { marginTop: '12px' } }, h('span', { class: 'muted small' }, 'Agregar materia:'), libres.map((m) => h('button', { type: 'button', class: 'chip', style: { '--h': m.hue, border: 0, cursor: 'pointer' }, onclick: () => { const ds = db.docentes.filter((d) => d.materiaId === m.id); if (!ds.length) return U.toast('No hay docentes de esa especialidad.', 'bad'); SGE.store.add('asignaciones', { grupoId: gid, materiaId: m.id, docenteId: ds[0].id, horas: m.horas }, 'a'); pintar(); } }, '+ ' + m.nombre))) : null,
        h('p', { class: 'muted small', style: { marginTop: '12px' } }, 'Si cambias las horas, vuelve a generar o ajustar el horario en «Horarios».'));
    }
    pintar();
    U.modal({ title: 'Carga académica · ' + g.nombre, size: 'lg', body: cuerpo, onClose: () => SGE.repintar(),
      actions: [{ label: 'Editar grupo', kind: 'ghost', icon: 'edit', onClick: () => { setTimeout(() => formGrupo(g), 20); } }, { label: 'Listo', kind: 'primary' }] });
  }

  function formMateria(m) {
    const nuevo = !m;
    m = m || { horas: 2, hue: Math.floor(Math.random() * 360) };
    const f = U.form([{ name: 'nombre', label: 'Nombre de la materia', required: true, span: 2 }, { name: 'horas', label: 'Horas semanales por defecto', type: 'number', min: 1, max: 10, required: true }, { name: 'hue', label: 'Color (0–359)', type: 'number', min: 0, max: 359, help: 'Se usa en horarios y chips' }], m);
    U.modal({ title: nuevo ? 'Nueva materia' : 'Editar materia', size: 'sm', body: f.el, actions: [{ label: 'Cancelar', kind: 'ghost' }, { label: 'Guardar', kind: 'primary', onClick: () => {
      if (!f.valid()) return false;
      if (nuevo) SGE.store.add('materias', f.get(), 'm'); else SGE.store.update('materias', m.id, f.get());
      U.toast('Materia guardada.'); SGE.repintar();
    } }] });
  }

  function render(el) {
    const db = SGE.store.db, asis = L.asistenciaMap(db);
    const gruposTab = () => {
      if (!db.grupos.length) return U.empty('Todavía no hay grupos', 'Crea el primero para empezar a matricular.', btn('Nuevo grupo', 'primary', () => formGrupo(), 'plus'));
      return h('div', { class: 'grid g3' }, db.grupos.map((g) => {
        const ests = db.estudiantes.filter((e) => e.grupoId === g.id && e.estado === 'Activo');
        const rs = ests.map((e) => L.resumenEstudiante(db, e, asis));
        const asigs = db.asignaciones.filter((a) => a.grupoId === g.id), horas = asigs.reduce((a, x) => a + x.horas, 0);
        return h('button', { type: 'button', class: 'card', style: { textAlign: 'left', cursor: 'pointer' }, onclick: () => detalle(g.id) },
          h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('h2', { style: { fontSize: '1.5rem' } }, g.nombre), badge(`${ests.length}/${g.cupo || 30}`, ests.length > (g.cupo || 30) ? 'bad' : 'neutral')),
          h('p', { class: 'muted small', style: { margin: '4px 0 12px' } }, `${g.salon || ''} · Dir. ${(q.docente(g.directorId) || { nombre: '—' }).nombre}`),
          h('div', { class: 'row', style: { gap: '18px' } },
            h('div', {}, h('span', { class: 'muted small' }, 'Promedio'), h('div', {}, U.notaChip(L.promedio(rs.map((r) => r.promedio))))),
            h('div', {}, h('span', { class: 'muted small' }, 'Asistencia'), h('div', { class: 'pct' }, (() => { const p = L.promedio(rs.map((r) => r.asistPct)); return p != null ? Math.round(p) + '%' : '—'; })())),
            h('div', {}, h('span', { class: 'muted small' }, 'Horario'), h('div', { class: 'pct', style: horas !== 30 ? { color: 'var(--warn)' } : null }, horas + '/30 h'))));
      }));
    };
    const materiasTab = () => U.table({
      rows: db.materias, pageSize: 20, cols: [
        { label: 'Materia', sortValue: (m) => m.nombre, render: (m) => chip(m) },
        { label: 'Horas por defecto', align: 'center', sortValue: (m) => m.horas, render: (m) => m.horas },
        { label: 'Docentes', render: (m) => db.docentes.filter((d) => d.materiaId === m.id).map((d) => d.nombre).join(', ') || h('span', { class: 'muted' }, 'Sin docentes') },
        { label: 'Grupos', align: 'center', render: (m) => db.asignaciones.filter((a) => a.materiaId === m.id).length },
        { label: '', nosort: true, render: (m) => h('div', { class: 'row' }, h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Editar ' + m.nombre, onclick: () => formMateria(m) }, U.icon('edit', 16)),
          h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Eliminar ' + m.nombre, onclick: async () => { if (db.asignaciones.some((a) => a.materiaId === m.id)) return U.toast('Está asignada a grupos: quítala primero.', 'bad'); if (await U.confirmar(`¿Eliminar ${m.nombre}?`, { ok: 'Eliminar', danger: true })) { SGE.store.remove('materias', m.id); SGE.repintar(); } } }, U.icon('trash', 16))) },
      ],
    });
    el.append(U.pageHead('Grupos y materias', 'Quién enseña qué, a quién y cuántas horas a la semana.', [btn('Nueva materia', 'ghost', () => formMateria(), 'plus'), btn('Nuevo grupo', 'primary', () => formGrupo(), 'plus')]));
    el.append(U.tabs([{ id: 'g', label: 'Grupos', render: gruposTab }, { id: 'm', label: 'Materias', render: materiasTab }]));
  }
  SGE.views.grupos = { render };
})();
