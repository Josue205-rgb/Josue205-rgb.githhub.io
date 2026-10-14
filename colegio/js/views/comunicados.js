/* Comunicados: tablón con audiencias (todos, docentes, acudientes o un grupo). */
(function () {
  'use strict';
  const SGE = window.SGE, U = SGE.ui, { h, badge, btn } = U, L = SGE.logic, q = SGE.q;
  const audiencia = (a) => (a === 'todos' ? 'Toda la comunidad' : a === 'docentes' ? 'Docentes' : a === 'acudientes' ? 'Acudientes' : 'Grupo ' + q.gn(a.slice(6)));

  function nuevo() {
    const me = SGE.auth.me(), db = SGE.store.db;
    const opciones = me.rol === 'admin'
      ? [{ value: 'todos', label: 'Toda la comunidad' }, { value: 'docentes', label: 'Solo docentes' }, { value: 'acudientes', label: 'Solo acudientes' }, ...db.grupos.map((g) => ({ value: 'grupo:' + g.id, label: 'Grupo ' + g.nombre }))]
      : SGE.auth.grupos().map((g) => ({ value: 'grupo:' + g.id, label: 'Grupo ' + g.nombre }));
    if (!opciones.length) return U.toast('No tienes grupos a quienes escribir.', 'bad');
    const campos = [
      { name: 'titulo', label: 'Título', required: true, span: 2, maxlength: 90 },
      { name: 'cuerpo', label: 'Mensaje', type: 'textarea', required: true, span: 2, rows: 5 },
      { name: 'audiencia', label: 'Dirigido a', type: 'select', options: opciones, span: me.rol === 'admin' ? 1 : 2 },
    ];
    if (me.rol === 'admin') campos.push({ name: 'fijado', label: 'Fijar arriba del tablón', type: 'checkbox' });
    const f = U.form(campos, {});
    U.modal({ title: 'Nuevo comunicado', size: 'md', body: f.el, actions: [{ label: 'Cancelar', kind: 'ghost' }, { label: 'Publicar', kind: 'primary', onClick: () => {
      if (!f.valid()) return false;
      const v = f.get();
      SGE.store.add('comunicados', { titulo: v.titulo, cuerpo: v.cuerpo, audiencia: v.audiencia, fijado: !!v.fijado, fecha: L.isoHoy(), autor: me.rol === 'admin' ? 'Rectoría' : me.nombre }, 'c');
      U.toast('Comunicado publicado.'); SGE.repintar();
    } }] });
  }

  function render(el) {
    const me = SGE.auth.me();
    const puedeEscribir = me.rol !== 'acudiente';
    el.append(U.pageHead('Comunicados', puedeEscribir ? 'Publica avisos para toda la comunidad o para un grupo.' : 'Avisos del colegio para ti y tus hijos.', [puedeEscribir ? btn('Nuevo comunicado', 'primary', nuevo, 'plus') : null]));
    const lista = h('div', {});
    let texto = '';
    function pintar() {
      U.clear(lista);
      const cs = q.comunicadosVisibles(me).filter((c) => !texto || (c.titulo + ' ' + c.cuerpo).toLowerCase().includes(texto));
      if (!cs.length) return lista.append(U.empty('No hay comunicados', texto ? 'Prueba con otra palabra.' : 'Cuando se publique uno, aparecerá aquí.', puedeEscribir && !texto ? btn('Nuevo comunicado', 'primary', nuevo, 'plus') : null));
      cs.forEach((c) => {
        const puedeBorrar = me.rol === 'admin' || c.autor === me.nombre;
        lista.append(h('article', { class: 'card post' + (c.fijado ? ' pinned' : '') },
          h('div', { class: 'row', style: { justifyContent: 'space-between', alignItems: 'flex-start' } }, h('h3', {}, c.titulo), puedeBorrar ? h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Eliminar comunicado', onclick: async () => { if (await U.confirmar('¿Eliminar este comunicado?', { ok: 'Eliminar', danger: true })) { SGE.store.remove('comunicados', c.id); U.toast('Comunicado eliminado.'); pintar(); } } }, U.icon('trash', 16)) : null),
          h('div', { class: 'post-meta' }, c.fijado ? badge('Fijado', 'warn') : null, badge(audiencia(c.audiencia), 'info'), h('span', {}, L.fechaLarga(c.fecha) + ' · ' + c.autor)),
          h('p', { style: { whiteSpace: 'pre-line' } }, c.cuerpo)));
      });
    }
    el.append(h('label', { class: 'search', style: { marginBottom: '14px', maxWidth: '360px' } }, U.icon('search', 16), h('input', { type: 'search', placeholder: 'Buscar en comunicados…', 'aria-label': 'Buscar', oninput: (e) => { texto = e.target.value.trim().toLowerCase(); pintar(); } })), lista);
    pintar();
  }
  SGE.views.comunicados = { render };
})();
