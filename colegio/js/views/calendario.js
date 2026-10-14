/* Calendario escolar con eventos por tipo. */
(function () {
  'use strict';
  const SGE = window.SGE, U = SGE.ui, { h, btn } = U, L = SGE.logic, q = SGE.q;
  const TIPOS = ['Académico', 'Evaluación', 'Reunión', 'Institucional', 'Festivo'];

  function formEvento(fecha) {
    const me = SGE.auth.me(), db = SGE.store.db;
    const grupos = me.rol === 'admin' ? db.grupos : SGE.auth.grupos();
    const f = U.form([
      { name: 'titulo', label: 'Título', required: true, span: 2 },
      { name: 'fecha', label: 'Fecha', type: 'date', required: true },
      { name: 'tipo', label: 'Tipo', type: 'select', options: TIPOS },
      { name: 'grupoId', label: 'Para', type: 'select', span: 2, options: [...(me.rol === 'admin' ? [{ value: '', label: 'Todo el colegio' }] : []), ...grupos.map((g) => ({ value: g.id, label: 'Grupo ' + g.nombre }))] },
    ], { fecha, tipo: 'Académico' });
    U.modal({ title: 'Nuevo evento', size: 'sm', body: f.el, actions: [{ label: 'Cancelar', kind: 'ghost' }, { label: 'Agregar evento', kind: 'primary', onClick: () => {
      if (!f.valid()) return false;
      SGE.store.add('eventos', { ...f.get(), autor: me.rol }, 'v'); U.toast('Evento agregado.'); SGE.repintar();
    } }] });
  }

  function diaModal(fecha, evs) {
    const me = SGE.auth.me();
    U.modal({ title: L.fechaLarga(fecha), size: 'sm',
      body: evs.length ? h('ul', { class: 'list' }, evs.map((e) => h('li', {}, h('span', { class: 'ev ev-' + e.tipo }, e.tipo), h('div', { class: 'grow' }, h('b', {}, e.titulo), h('span', { class: 'muted small' }, e.grupoId ? 'Grupo ' + q.gn(e.grupoId) : 'Todo el colegio')),
        me.rol === 'admin' ? h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Eliminar evento', onclick: () => { SGE.store.remove('eventos', e.id); U.toast('Evento eliminado.'); SGE.repintar(); } }, U.icon('trash', 16)) : null))) : h('p', { class: 'muted' }, 'No hay eventos este día.'),
      actions: [{ label: 'Cerrar', kind: 'ghost' }, me.rol !== 'acudiente' ? { label: 'Agregar evento', kind: 'primary', icon: 'plus', onClick: () => { setTimeout(() => formEvento(fecha), 20); } } : null].filter(Boolean) });
  }

  function render(el) {
    const me = SGE.auth.me(), hoy = L.isoHoy();
    let y = +hoy.slice(0, 4), m = +hoy.slice(5, 7) - 1;
    const evs = q.eventosVisibles(me);
    el.append(U.pageHead('Calendario', 'Evaluaciones, reuniones y fechas importantes del año lectivo.', [me.rol !== 'acudiente' ? btn('Nuevo evento', 'primary', () => formEvento(hoy), 'plus') : null]));
    const cab = h('div', { class: 'row', style: { justifyContent: 'space-between', marginBottom: '12px' } });
    const cuadro = h('div', {});
    function pintar() {
      U.clear(cab); U.clear(cuadro);
      cab.append(h('h2', { style: { textTransform: 'capitalize', fontSize: '1.3rem' } }, `${L.MESES_COMPLETOS[m]} ${y}`),
        h('div', { class: 'row' }, h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Mes anterior', onclick: () => { m--; if (m < 0) { m = 11; y--; } pintar(); } }, U.icon('left')), btn('Hoy', 'ghost', () => { y = +hoy.slice(0, 4); m = +hoy.slice(5, 7) - 1; pintar(); }), h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Mes siguiente', onclick: () => { m++; if (m > 11) { m = 0; y++; } pintar(); } }, U.icon('right'))));
      const cal = h('div', { class: 'cal', role: 'grid' }, ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => h('div', { class: 'dh' }, d)));
      const primero = new Date(y, m, 1), lead = (primero.getDay() + 6) % 7, dias = new Date(y, m + 1, 0).getDate();
      for (let i = 0; i < lead; i++) cal.append(h('div', { class: 'day out', 'aria-hidden': 'true' }));
      for (let d = 1; d <= dias; d++) {
        const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, delDia = evs.filter((e) => e.fecha === iso);
        cal.append(h('button', { type: 'button', class: 'day' + (iso === hoy ? ' today' : ''), 'aria-label': `${L.fechaLarga(iso)}${delDia.length ? ', ' + delDia.length + ' evento(s)' : ''}`, onclick: () => diaModal(iso, delDia) },
          h('span', {}, d), delDia.slice(0, 3).map((e) => h('div', { class: 'ev ev-' + e.tipo, title: e.titulo }, e.titulo)), delDia.length > 3 ? h('small', { class: 'muted' }, `+${delDia.length - 3} más`) : null));
      }
      cuadro.append(cal);
    }
    const prox = evs.filter((e) => e.fecha >= hoy).slice(0, 8);
    el.append(h('div', { class: 'grid g21' },
      h('section', { class: 'card' }, cab, cuadro, h('ul', { class: 'legend' }, TIPOS.map((t) => h('li', {}, h('span', { class: 'ev ev-' + t }, t))))),
      h('section', { class: 'card' }, h('header', { class: 'card-head' }, h('h2', {}, 'Lo que viene')),
        prox.length ? h('ul', { class: 'list' }, prox.map((e) => h('li', {}, h('div', { class: 'grow' }, h('b', {}, e.titulo), h('span', { class: 'muted small' }, L.fechaLarga(e.fecha))), h('span', { class: 'ev ev-' + e.tipo }, e.tipo)))) : h('p', { class: 'muted' }, 'Sin eventos próximos.'))));
    pintar();
  }
  SGE.views.calendario = { render };
})();
