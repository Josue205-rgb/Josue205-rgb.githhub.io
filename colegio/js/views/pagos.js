/* Pensiones: cartera, registro de pagos, recibos. */
(function () {
  'use strict';
  const SGE = window.SGE, U = SGE.ui, { h, badge, avatar, btn, money, kpi } = U, L = SGE.logic, q = SGE.q;
  const METODOS = ['Transferencia', 'PSE', 'Efectivo', 'Tarjeta', 'Consignación'];
  const fmtM = (v) => '$' + (v / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace('.', ',') + ' M';

  function imprimirModal() {
    document.body.classList.add('print-modal');
    const fin = () => { document.body.classList.remove('print-modal'); window.removeEventListener('afterprint', fin); };
    window.addEventListener('afterprint', fin);
    window.print();
  }

  /** Estado de cuenta de un estudiante: por mes -> {st, pago}, más deuda vencida con mora. */
  function cuenta(e) {
    const db = SGE.store.db, cfg = db.settings, hoy = L.isoHoy();
    const pagos = db.pagos.filter((p) => p.estudianteId === e.id);
    const meses = {};
    let deuda = 0, vencidas = 0;
    for (let m = 2; m <= 11; m++) {
      const pago = pagos.find((p) => p.mes === m);
      const st = e.beca >= 100 ? 'exenta' : L.estadoCuota(m, cfg.anio, !!pago, hoy);
      meses[m] = { st, pago };
      if (st === 'vencida') { vencidas++; deuda += L.cuotaNeta(e, cfg) + L.moraDe(e, cfg); }
    }
    return { meses, deuda, vencidas };
  }

  function recibo(p) {
    const db = SGE.store.db, cfg = db.settings, e = q.est(p.estudianteId), me = SGE.auth.me();
    const fila = (k, v) => h('div', {}, h('span', {}, k), h('b', {}, v));
    const actions = [{ label: 'Cerrar', kind: 'ghost' }, { label: 'Imprimir', kind: 'primary', icon: 'print', keep: true, onClick: imprimirModal }];
    if (me.rol === 'admin') actions.splice(1, 0, { label: 'Anular pago', kind: 'ghost', icon: 'trash', onClick: () => { setTimeout(async () => { if (await U.confirmar(`¿Anular el recibo ${p.recibo}? La cuota volverá a quedar pendiente.`, { ok: 'Anular', danger: true })) { SGE.store.remove('pagos', p.id); U.toast('Pago anulado.'); SGE.repintar(); } }, 20); } });
    U.modal({ title: 'Recibo de pago ' + p.recibo, size: 'md', actions, body: h('article', { class: 'paper', style: { boxShadow: 'none', padding: '8px 4px', border: 0 } },
      h('header', { class: 'paper-head' }, h('div', { class: 'school' }, h('div', { class: 'brand-mark' }, 'N'), h('div', {}, h('h1', { style: { fontSize: '1.2rem' } }, cfg.colegio), h('small', {}, cfg.direccion))), h('div', { style: { textAlign: 'right' } }, h('b', {}, 'RECIBO DE CAJA'), h('small', {}, p.recibo))),
      h('div', { class: 'paper-data' }, fila('Estudiante', e ? e.nombre : '—'), fila('Grupo', e ? q.gn(e.grupoId) : '—'), fila('Código', e ? e.codigo : '—'), fila('Concepto', `Pensión de ${L.MESES[p.mes]} ${cfg.anio}`), fila('Fecha de pago', L.fechaLarga(p.fecha)), fila('Medio de pago', p.metodo)),
      h('p', { style: { fontSize: '1.4rem', margin: '14px 0' } }, 'Valor recibido: ', h('b', {}, money(p.monto))),
      p.nota ? h('p', { class: 'small' }, 'Nota: ' + p.nota) : null,
      h('div', { class: 'sign' }, h('div', {}, 'Tesorería'), h('div', {}, 'Sello del colegio')))});
  }

  function registrar(e, mes) {
    const db = SGE.store.db, cfg = db.settings, hoy = L.isoHoy();
    const venc = L.estadoCuota(mes, cfg.anio, false, hoy) === 'vencida';
    const cuota = L.cuotaNeta(e, cfg), mora = venc ? L.moraDe(e, cfg) : 0;
    const f = U.form([
      { name: 'monto', label: 'Valor recibido (COP)', type: 'number', required: true, min: 1, step: 1000, value: cuota + mora },
      { name: 'fecha', label: 'Fecha de pago', type: 'date', required: true, max: hoy, value: hoy },
      { name: 'metodo', label: 'Medio de pago', type: 'select', options: METODOS },
      { name: 'nota', label: 'Nota (opcional)', span: 2 },
    ], {});
    U.modal({ title: `Registrar pago · ${L.MESES[mes]}`, size: 'sm', body: h('div', {}, h('p', { style: { marginBottom: '12px' } }, h('b', {}, e.nombre), ` · ${q.gn(e.grupoId)}`, h('br'), `Cuota: ${money(cuota)}`, e.beca ? ` (beca ${e.beca}%)` : '', venc ? h('span', { style: { color: 'var(--bad)' } }, ` + mora ${money(mora)}`) : null), f.el),
      actions: [{ label: 'Cancelar', kind: 'ghost' }, { label: 'Registrar y generar recibo', kind: 'primary', onClick: () => {
        if (!f.valid()) return false;
        const v = f.get();
        const nro = db.pagos.reduce((m, p) => Math.max(m, +String(p.recibo).replace(/\D/g, '') || 0), 1000) + 1;
        const p = SGE.store.add('pagos', { estudianteId: e.id, mes, monto: v.monto, fecha: v.fecha, metodo: v.metodo, nota: v.nota, recibo: 'R-' + nro }, 'p');
        U.toast('Pago registrado.'); SGE.repintar(); setTimeout(() => recibo(p), 60);
      } }] });
  }

  function chips(e, c, editable) {
    return h('div', { class: 'mes' }, Object.entries(c.meses).map(([m, x]) => h('button', { type: 'button', 'data-s': x.st === 'exenta' ? 'futura' : x.st, disabled: x.st === 'exenta' || (!editable && !x.pago),
      title: `${L.MESES[m]}: ${{ pagada: 'pagada', vencida: 'vencida', pendiente: 'por pagar', futura: 'aún no vence', exenta: 'exenta' }[x.st]}`, 'aria-label': `${L.MESES[m]}: ${x.st}`,
      onclick: () => (x.pago ? recibo(x.pago) : registrar(e, +m)) }, L.MESES[m].slice(0, 1) + m)));
  }

  /* ---------- administración ---------- */
  function admin(el) {
    const db = SGE.store.db, cfg = db.settings, hoy = L.isoHoy(), mesAct = Math.min(+hoy.slice(5, 7), 11);
    const elegibles = db.estudiantes.filter((e) => e.estado === 'Activo' && e.beca < 100);
    const rows = elegibles.map((e) => ({ e, c: cuenta(e) }));
    const pagadoTotal = db.pagos.reduce((a, p) => a + p.monto, 0);
    let esperado = 0, cobrado = 0;
    rows.forEach(({ e }) => { for (let m = 2; m <= mesAct; m++) { esperado += L.cuotaNeta(e, cfg); } });
    db.pagos.forEach((p) => { if (p.mes <= mesAct && elegibles.some((e) => e.id === p.estudianteId)) cobrado += L.cuotaNeta(q.est(p.estudianteId), cfg); });
    const cartera = rows.reduce((a, r) => a + r.c.deuda, 0), morosos = rows.filter((r) => r.c.vencidas > 0);
    const porMes = []; for (let m = 2; m <= mesAct; m++) porMes.push({ label: L.MESES[m].slice(0, 3), long: L.MESES[m], value: db.pagos.filter((p) => p.mes === m).reduce((a, p) => a + p.monto, 0) });
    const est = { pagada: 0, pendiente: 0, vencida: 0 }; rows.forEach(({ c }) => { const x = c.meses[mesAct]; if (x && est[x.st] !== undefined) est[x.st]++; });

    el.append(U.pageHead('Pensiones', `Cartera del año ${cfg.anio}. Pensión: ${money(cfg.pension)} al mes, vence el día 10; mora del ${cfg.mora}%.`, [
      btn('Exportar morosos', 'ghost', () => U.descargar('morosos.csv', L.csv([['Estudiante', 'Grupo', 'Acudiente', 'Teléfono', 'Cuotas vencidas', 'Deuda con mora'], ...morosos.map(({ e, c }) => { const a = q.acu(e.acudienteId) || {}; return [e.nombre, q.gn(e.grupoId), a.nombre, a.telefono, c.vencidas, c.deuda]; })]), 'text/csv;charset=utf-8'), 'download')]));
    el.append(h('div', { class: 'grid g4' },
      kpi({ label: 'Recaudado en el año', value: money(pagadoTotal), sub: `${db.pagos.length} pagos registrados`, icon: 'pagos' }),
      kpi({ label: 'Cartera vencida', value: money(cartera), sub: 'Incluye mora', icon: 'alert', tone: cartera ? 'bad' : 'ok' }),
      kpi({ label: 'Cumplimiento', value: esperado ? Math.round((cobrado / esperado) * 100) + '%' : '—', sub: 'Cobrado frente a lo causado', icon: 'chart' }),
      kpi({ label: 'Familias con mora', value: new Set(morosos.map((r) => r.e.acudienteId)).size, sub: `${morosos.length} estudiantes`, icon: 'estudiantes', tone: morosos.length ? 'bad' : 'ok' })));
    el.append(h('div', { class: 'grid g21', style: { margin: '16px 0' } },
      U.chartCard({ title: 'Recaudo por mes', sub: 'Pagos recibidos', label: 'Recaudo mensual', render: () => U.barChart({ data: porMes, fmt: money, valFmt: fmtM, axisFmt: fmtM }), table: { head: ['Mes', 'Recaudo'], rows: porMes.map((r) => [r.long, money(r.value)]) } }),
      h('section', { class: 'card' }, h('header', { class: 'card-head' }, h('div', {}, h('h2', {}, 'Cuotas de ' + L.MESES[mesAct]), h('p', {}, 'Estado de este mes'))),
        U.donut({ label: 'Estado de cuotas del mes', parts: [{ label: 'Pagadas', value: est.pagada, color: 'var(--c3)' }, { label: 'Por pagar', value: est.pendiente, color: 'var(--d-basico)' }, { label: 'Vencidas', value: est.vencida, color: 'var(--d-bajo)' }], center: { big: rows.length ? Math.round((est.pagada / rows.length) * 100) + '%' : '—', small: 'al día' } }))));
    el.append(U.table({
      rows, pageSize: 14, searchPlaceholder: 'Buscar estudiante…', search: ({ e }, t) => (e.nombre + ' ' + e.codigo).toLowerCase().includes(t),
      filters: [{ label: 'Grupo', options: db.grupos.map((g) => ({ value: g.id, label: g.nombre })), test: ({ e }, v) => e.grupoId === v }, { label: 'Estado', options: [{ value: 'mora', label: 'Con mora' }, { value: 'dia', label: 'Al día' }], test: ({ c }, v) => (v === 'mora' ? c.vencidas > 0 : c.vencidas === 0) }],
      cols: [
        { label: 'Estudiante', sortValue: ({ e }) => e.nombre, render: ({ e }) => h('div', { class: 'person' }, avatar(e.nombre, 30), h('div', {}, h('b', {}, e.nombre), h('small', {}, q.gn(e.grupoId) + (e.beca ? ` · beca ${e.beca}%` : '')))) },
        { label: 'Cuota', align: 'right', sortValue: ({ e }) => L.cuotaNeta(e, cfg), render: ({ e }) => h('span', { class: 'num' }, money(L.cuotaNeta(e, cfg))) },
        { label: 'Feb → Nov', nosort: true, render: ({ e, c }) => chips(e, c, true) },
        { label: 'Debe', align: 'right', sortValue: ({ c }) => c.deuda, render: ({ c }) => (c.deuda ? h('b', { class: 'num', style: { color: 'var(--bad)' } }, money(c.deuda)) : badge('Al día', 'ok')) },
      ],
      toolbar: [h('ul', { class: 'legend', style: { margin: 0 } }, [['Pagada', 'var(--ok)'], ['Vencida', 'var(--bad)'], ['Por pagar', '#d9a21b']].map(([l, c]) => h('li', {}, h('i', { style: { background: c } }), l)))],
    }));
    el.append(h('p', { class: 'muted small', style: { marginTop: '8px' } }, 'Haz clic en un mes para registrar el pago; si ya está pagado se abre el recibo.'));
  }

  /* ---------- acudiente ---------- */
  function familia(el, arg) {
    const db = SGE.store.db, cfg = db.settings, me = SGE.auth.me();
    const hijos = arg && me.hijos.find((x) => x.id === arg) ? me.hijos.filter((x) => x.id === arg) : me.hijos;
    el.append(U.pageHead('Pensiones', `La pensión vence el día 10 de cada mes. Para pagar, acércate a tesorería o transfiere a la cuenta del colegio (${cfg.telefono}).`, []));
    hijos.forEach((e) => {
      const c = cuenta(e);
      el.append(h('section', { class: 'card', style: { marginBottom: '16px' } },
        h('div', { class: 'row', style: { justifyContent: 'space-between', marginBottom: '12px' } }, h('div', { class: 'person' }, avatar(e.nombre, 40), h('div', {}, h('b', {}, e.nombre), h('small', {}, q.gn(e.grupoId) + ' · cuota ' + money(L.cuotaNeta(e, cfg))))), c.deuda ? badge('Debe ' + money(c.deuda), 'bad') : badge('Al día', 'ok')),
        e.beca >= 100 ? h('p', {}, 'Exento de pensión (beca del 100%).') : h('div', { class: 'tbl-scroll' }, h('table', { class: 'tbl compact' }, h('thead', {}, h('tr', {}, ['Mes', 'Vence', 'Estado', 'Pagado', 'Recibo'].map((x) => h('th', {}, x)))),
          h('tbody', {}, Object.entries(c.meses).filter(([m, x]) => x.st !== 'futura' || x.pago).map(([m, x]) => h('tr', {}, h('td', {}, L.MESES[m]), h('td', {}, `10 ${L.MESES_COMPLETOS[m - 1].slice(0, 3)}`), h('td', {}, badge({ pagada: 'Pagada', vencida: 'Vencida', pendiente: 'Por pagar', futura: 'Adelantada' }[x.st], { pagada: 'ok', vencida: 'bad', pendiente: 'warn', futura: 'info' }[x.st])), h('td', { class: 'num' }, x.pago ? money(x.pago.monto) : '—'), h('td', {}, x.pago ? btn(x.pago.recibo, 'link', () => recibo(x.pago), 'print') : '—'))))))));
    });
  }

  SGE.views.pagos = { render(el, arg) { if (SGE.auth.me().rol === 'acudiente') familia(el, arg); else admin(el); } };
})();
