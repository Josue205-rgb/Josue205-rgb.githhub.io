/* Ajustes: colegio, reglas académicas, pensiones y gestión de datos. */
(function () {
  'use strict';
  const SGE = window.SGE, U = SGE.ui, { h, btn } = U, L = SGE.logic;

  function render(el) {
    const db = SGE.store.db, c = db.settings;
    el.append(U.pageHead('Ajustes', 'Datos del colegio, reglas de calificación y copia de seguridad.', []));

    const f = U.form([
      { section: 'Colegio' },
      { name: 'colegio', label: 'Nombre', required: true }, { name: 'lema', label: 'Lema' },
      { name: 'rector', label: 'Rector(a)' }, { name: 'anio', label: 'Año lectivo', type: 'number', min: 2000, max: 2100, required: true },
      { name: 'direccion', label: 'Dirección' }, { name: 'telefono', label: 'Teléfono' }, { name: 'correo', label: 'Correo', type: 'email', span: 2 },
      { section: 'Reglas académicas' },
      { name: 'aprobado', label: 'Nota mínima para aprobar', type: 'number', min: 1, max: 5, step: 0.1, required: true },
      { name: 'periodo', label: 'Periodo actual', type: 'select', options: [{ value: '', label: 'Automático según la fecha' }, ...[1, 2, 3, 4].map((p) => ({ value: p, label: 'Periodo ' + p }))] },
      { name: 'pt', label: 'Peso de tareas (%)', type: 'number', min: 0, max: 100, required: true }, { name: 'pe', label: 'Peso de exámenes (%)', type: 'number', min: 0, max: 100, required: true },
      { name: 'pp', label: 'Peso de participación (%)', type: 'number', min: 0, max: 100, required: true, check: (v, all) => (Math.round(all.pt + all.pe + all.pp) !== 100 ? 'Los tres pesos deben sumar 100%.' : '') },
      { section: 'Pensiones' },
      { name: 'pension', label: 'Pensión mensual (COP)', type: 'number', min: 0, step: 1000, required: true }, { name: 'mora', label: 'Recargo por mora (%)', type: 'number', min: 0, max: 100, step: 0.5 },
    ], { ...c, periodo: c.periodoManual || '', pt: Math.round(c.pesos.t * 100), pe: Math.round(c.pesos.e * 100), pp: Math.round(c.pesos.p * 100) });
    el.append(h('section', { class: 'card' }, f.el, h('div', { class: 'row', style: { marginTop: '16px', justifyContent: 'flex-end' } }, btn('Guardar ajustes', 'primary', () => {
      if (!f.valid()) return;
      const v = f.get();
      Object.assign(c, { colegio: v.colegio, lema: v.lema, rector: v.rector, anio: v.anio, direccion: v.direccion, telefono: v.telefono, correo: v.correo, aprobado: v.aprobado, periodoManual: v.periodo ? +v.periodo : null, pesos: { t: v.pt / 100, e: v.pe / 100, p: v.pp / 100 }, pension: v.pension, mora: v.mora || 0 });
      SGE.store.guardar(); U.toast('Ajustes guardados.'); SGE.repintar();
    }, 'check'))));

    const archivo = h('input', { type: 'file', accept: 'application/json,.json', class: 'sr-only', 'aria-label': 'Importar copia de seguridad', onchange: (e) => {
      const file = e.target.files[0]; if (!file) return;
      file.text().then((t) => { try { SGE.store.importar(t); U.toast('Copia importada.'); SGE.auth.salir(); location.hash = ''; location.reload(); } catch (err) { U.toast('Archivo no válido: ' + err.message, 'bad'); } });
    } });
    const kb = Math.round(SGE.store.bytes() / 1024);
    el.append(h('section', { class: 'card', style: { marginTop: '16px' } },
      h('header', { class: 'card-head' }, h('div', {}, h('h2', {}, 'Datos y copia de seguridad'), h('p', {}, `Los datos viven en este navegador (${kb} KB). ${SGE.store.persistente ? '' : 'Atención: el navegador bloquea el almacenamiento, los cambios se perderán al cerrar.'}`))),
      h('div', { class: 'row' },
        btn('Descargar copia (JSON)', 'ghost', () => U.descargar(`sge-copia-${L.isoHoy()}.json`, SGE.store.exportar(), 'application/json'), 'download'),
        btn('Importar copia…', 'ghost', () => archivo.click(), 'upload'), archivo,
        btn('Restaurar datos de demostración', 'ghost', async () => { if (await U.confirmar('Se reemplazarán TODOS los datos actuales por los de demostración.', { ok: 'Restaurar', danger: true })) { SGE.store.reiniciarDemo(); U.toast('Datos de demostración restaurados.'); location.hash = '#/panel'; location.reload(); } }, 'refresh'),
        btn('Empezar desde cero', 'danger', async () => { if (await U.confirmar('Se borrarán estudiantes, docentes, notas, pagos y todo lo demás. Descarga una copia antes si la necesitas.', { ok: 'Borrar todo', danger: true, title: 'Empezar desde cero' })) { SGE.store.vaciar(); U.toast('Sistema vacío. Crea grupos y docentes para empezar.'); location.hash = '#/panel'; location.reload(); } }, 'trash'))));

    el.append(h('section', { class: 'card', style: { marginTop: '16px' } }, h('h2', {}, 'Acerca de este sistema'),
      h('p', { class: 'muted', style: { marginTop: '6px' } }, 'Esta es una aplicación de demostración que corre 100% en el navegador, sin servidor. Los roles controlan lo que se muestra, pero no son seguridad real: para usarla con datos reales de menores hace falta un backend con autenticación, permisos en el servidor, copias automáticas y cumplimiento de la ley de protección de datos personales.')));
  }
  SGE.views.ajustes = { render };
})();
