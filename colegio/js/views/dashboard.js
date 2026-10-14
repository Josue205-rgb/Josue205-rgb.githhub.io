/* Panel: una versión por rol. */
(function () {
  'use strict';
  const SGE = window.SGE, U = SGE.ui, { h, icon, kpi, chartCard, badge, money, avatar, btn } = U, L = SGE.logic, q = SGE.q;
  const saludo = () => { const hr = new Date().getHours(); return hr < 12 ? 'Buenos días' : hr < 19 ? 'Buenas tardes' : 'Buenas noches'; };
  const DES = [{ key: 'bajo', label: 'Bajo', color: 'var(--d-bajo)' }, { key: 'basico', label: 'Básico', color: 'var(--d-basico)' }, { key: 'alto', label: 'Alto', color: 'var(--d-alto)' }, { key: 'superior', label: 'Superior', color: 'var(--d-superior)' }];
  const card = (titulo, sub, ...kids) => h('section', { class: 'card' }, h('header', { class: 'card-head' }, h('div', {}, h('h2', {}, titulo), sub ? h('p', {}, sub) : null)), ...kids);
  const fmtM = (v) => '$' + (v / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace('.', ',') + ' M';

  function eventosLista(me, n) {
    const hoy = L.isoHoy();
    const evs = q.eventosVisibles(me).filter((e) => e.fecha >= hoy).slice(0, n || 5);
    if (!evs.length) return h('p', { class: 'muted' }, 'No hay eventos próximos.');
    return h('ul', { class: 'list' }, evs.map((e) => {
      const d = L.fechaCorta(e.fecha).split(' ');
      return h('li', {}, h('div', { class: 'badge b-neutral', style: { flexDirection: 'column', padding: '4px 9px', borderRadius: '8px' } }, h('b', {}, d[0]), h('span', {}, d[1])),
        h('div', { class: 'grow' }, h('b', {}, e.titulo), h('span', { class: 'muted small' }, e.grupoId ? q.gn(e.grupoId) : 'Todo el colegio')), h('span', { class: 'ev ev-' + e.tipo }, e.tipo));
    }));
  }
  function comunicadosLista(me, n) {
    const cs = q.comunicadosVisibles(me).slice(0, n || 3);
    if (!cs.length) return h('p', { class: 'muted' }, 'Sin comunicados.');
    return h('ul', { class: 'list' }, cs.map((c) => h('li', {}, icon('comunicados', 18), h('div', { class: 'grow' }, h('b', {}, c.titulo), h('span', { class: 'muted small' }, L.fechaCorta(c.fecha) + ' · ' + c.autor)), c.fijado ? badge('Fijado', 'warn') : null)));
  }
  function riesgoLista(items, vacio) {
    if (!items.length) return h('p', { class: 'muted' }, vacio || 'Sin alertas por ahora.');
    return h('ul', { class: 'list' }, items.map(({ e, r }) => h('li', { class: 'clickable', style: { cursor: 'pointer' }, onclick: () => SGE.views.estudiantes.ficha(e.id) },
      h('span', { class: 'dot-r r-' + r.riesgo.nivel, title: 'Riesgo ' + r.riesgo.nivel }), avatar(e.nombre, 30),
      h('div', { class: 'grow' }, h('b', {}, e.nombre), h('span', { class: 'muted small' }, q.gn(e.grupoId) + ' · ' + r.riesgo.razones.join(' · '))), badge(r.riesgo.nivel === 'alto' ? 'Riesgo alto' : 'Atención', r.riesgo.nivel === 'alto' ? 'bad' : 'warn'))));
  }
  function honor(items) {
    if (!items.length) return h('p', { class: 'muted' }, 'Aún no hay notas suficientes.');
    return h('ol', { class: 'list' }, items.map(({ e, r }, i) => h('li', {}, h('b', { class: 'num', style: { width: '18px', color: i === 0 ? 'var(--chalk)' : 'var(--muted)', textShadow: i === 0 ? '0 0 1px #8a6d00' : 'none' } }, i + 1), avatar(e.nombre, 30),
      h('div', { class: 'grow' }, h('b', {}, e.nombre), h('span', { class: 'muted small' }, q.gn(e.grupoId))), U.notaChip(r.promedio))));
  }

  /* ---------- Administración ---------- */
  function admin(el) {
    const db = SGE.store.db, cfg = db.settings, hoy = L.isoHoy(), mesAct = +hoy.slice(5, 7);
    const activos = db.estudiantes.filter((e) => e.estado === 'Activo');
    const fechas = [...new Set(Object.keys(db.asistencia).map((k) => k.split('|')[1]))].sort().slice(-20);
    const asis = L.asistenciaMap(db, fechas);
    const res = activos.map((e) => ({ e, r: L.resumenEstudiante(db, e, asis) }));
    const proms = res.map((x) => x.r.promedio).filter((v) => v != null);
    const promGeneral = L.promedio(proms);
    const tot = fechas.reduce((a, f) => { Object.entries(db.asistencia).forEach(([k, regs]) => { if (k.endsWith('|' + f)) Object.values(regs).forEach((c) => { if (c === 'P' || c === 'T') a.p++; if (c === 'A') a.a++; }); }); return a; }, { p: 0, a: 0 });
    const asisGlobal = tot.p + tot.a ? Math.round((tot.p / (tot.p + tot.a)) * 100) : null;
    const riesgos = res.filter((x) => x.r.riesgo.nivel !== 'ok').sort((a, b) => (b.r.riesgo.nivel === 'alto') - (a.r.riesgo.nivel === 'alto') || b.r.bajas - a.r.bajas);
    // cartera
    const pagados = new Set(db.pagos.map((p) => p.estudianteId + '|' + p.mes));
    let vencido = 0, nVenc = 0, pend = 0, pag = 0, pagMes = 0, nMes = 0;
    const deben = new Set();
    activos.forEach((e) => {
      if (e.beca >= 100) return;
      for (let m = 2; m <= Math.min(mesAct, 11); m++) {
        const st = L.estadoCuota(m, cfg.anio, pagados.has(e.id + '|' + m), hoy);
        if (st === 'vencida') { vencido += L.cuotaNeta(e, cfg); nVenc++; deben.add(e.id); }
        if (m === mesAct) { nMes++; if (st === 'pagada') pag++; else if (st === 'pendiente') pend++; }
      }
    });
    const venc = nVenc ? [...deben].length : 0;
    const recMes = []; for (let m = 2; m <= Math.min(mesAct, 11); m++) recMes.push({ label: L.MESES[m].slice(0, 3), long: L.MESES[m], value: db.pagos.filter((p) => p.mes === m).reduce((a, p) => a + p.monto, 0) });
    const faltanHoy = L.esHabil(hoy) ? db.grupos.filter((g) => !db.asistencia[g.id + '|' + hoy]) : [];

    el.append(U.pageHead(`${saludo()}, ${cfg.rector.split(' ').slice(0, 1)[0] === 'Dra.' ? 'Dra. ' + cfg.rector.split(' ')[1] : 'equipo directivo'}`, `${L.fechaLarga(hoy)} · Periodo ${SGE.periodoActual()} · ${db.meta.demo ? 'Datos de demostración' : 'Datos propios'}`,
      [btn('Buscar…', 'ghost', () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true })), 'search'), btn('Nueva matrícula', 'primary', () => { SGE.go('estudiantes'); setTimeout(() => SGE.views.estudiantes.nuevo(), 50); }, 'plus')]));

    el.append(h('div', { class: 'grid g4' },
      kpi({ label: 'Estudiantes activos', value: activos.length, sub: `${db.grupos.length} grupos · ${db.docentes.length} docentes`, icon: 'estudiantes' }),
      kpi({ label: 'Asistencia (20 días)', value: asisGlobal != null ? asisGlobal + '%' : '—', sub: 'Excusas no penalizan', icon: 'asistencia', tone: asisGlobal < 90 ? 'bad' : 'ok' }),
      kpi({ label: 'Promedio general', value: U.nota(promGeneral), sub: `Aprobación desde ${cfg.aprobado.toFixed(1)}`, icon: 'notas' }),
      kpi({ label: 'Cartera vencida', value: money(vencido), sub: `${venc} estudiantes con cuotas vencidas`, icon: 'pagos', tone: venc ? 'bad' : 'ok' })));

    if (faltanHoy.length) {
      el.append(h('div', { class: 'card', style: { marginTop: '16px', borderLeft: '4px solid var(--chalk)' } }, h('div', { class: 'row' }, icon('alert', 20), h('b', {}, 'Asistencia de hoy pendiente en ' + faltanHoy.length + (faltanHoy.length === 1 ? ' grupo:' : ' grupos:')), faltanHoy.map((g) => h('a', { class: 'badge b-warn', href: '#/asistencia/' + g.id }, g.nombre)))));
    }

    el.append(h('div', { class: 'grid g21', style: { marginTop: '16px' } },
      chartCard({ title: 'Asistencia diaria', sub: 'Porcentaje de presentes y tardanzas, todo el colegio', label: 'Asistencia diaria de los últimos 20 días hábiles',
        render: () => {
          const pts = fechas.map((f) => { let p = 0, a = 0; db.grupos.forEach((g) => Object.values(db.asistencia[g.id + '|' + f] || {}).forEach((c) => { if (c === 'P' || c === 'T') p++; else if (c === 'A') a++; })); return { x: L.fechaCorta(f), tip: L.fechaLarga(f), y: p + a ? Math.round((p / (p + a)) * 1000) / 10 : null }; });
          const ys = pts.map((p) => p.y).filter((v) => v != null);
          return U.lineChart({ series: [{ name: 'Asistencia', color: 'var(--c1)', points: pts }], yMin: Math.max(0, Math.floor(Math.min(...ys, 90) / 5) * 5 - 5), yMax: 100, fmt: (v) => v + '%', label: 'Asistencia diaria' });
        },
        table: { head: ['Fecha', 'Asistencia'], rows: fechas.map((f) => { let p = 0, a = 0; db.grupos.forEach((g) => Object.values(db.asistencia[g.id + '|' + f] || {}).forEach((c) => { if (c === 'P' || c === 'T') p++; else if (c === 'A') a++; })); return [L.fechaLarga(f), p + a ? Math.round((p / (p + a)) * 1000) / 10 + '%' : '—']; }) } }),
      card('Alertas de riesgo', `${riesgos.length} estudiantes con notas o asistencia por mejorar`, riesgoLista(riesgos.slice(0, 6), 'Ningún estudiante en riesgo.'))));

    el.append(h('div', { class: 'grid g2', style: { marginTop: '16px' } },
      chartCard({ title: 'Desempeño por grupo', sub: 'Estudiantes según su promedio acumulado', label: 'Desempeño por grupo',
        render: () => U.stackedBars({ keys: DES, rows: db.grupos.map((g) => { const parts = {}; res.filter((x) => x.e.grupoId === g.id).forEach((x) => { const k = L.desempeno(x.r.promedio, cfg).key; parts[k] = (parts[k] || 0) + 1; }); return { label: g.nombre, parts }; }) }),
        table: { head: ['Grupo', ...DES.map((d) => d.label)], rows: db.grupos.map((g) => { const c = {}; res.filter((x) => x.e.grupoId === g.id).forEach((x) => { const k = L.desempeno(x.r.promedio, cfg).key; c[k] = (c[k] || 0) + 1; }); return [g.nombre, ...DES.map((d) => c[d.key] || 0)]; }) } }),
      chartCard({ title: 'Recaudo mensual', sub: 'Pensiones pagadas por mes', label: 'Recaudo mensual',
        render: () => U.barChart({ data: recMes, fmt: money, valFmt: fmtM, axisFmt: fmtM, label: 'Recaudo mensual' }),
        table: { head: ['Mes', 'Recaudo'], rows: recMes.map((r) => [r.long, money(r.value)]) } })));

    el.append(h('div', { class: 'grid g3', style: { marginTop: '16px' } },
      card('Cuadro de honor', 'Mejores promedios del colegio', honor(res.filter((x) => x.r.promedio != null).sort((a, b) => b.r.promedio - a.r.promedio || (b.r.asistPct || 0) - (a.r.asistPct || 0)).slice(0, 5))),
      card(`Pensión de ${L.MESES[Math.min(mesAct, 11)] || 'este mes'}`, 'Estado de las cuotas del mes en curso',
        U.donut({ label: 'Estado de pensiones del mes', parts: [{ label: 'Pagadas', value: pag, color: 'var(--c3)' }, { label: 'Por pagar', value: pend, color: 'var(--d-basico)' }, { label: 'Vencidas', value: nMes - pag - pend, color: 'var(--d-bajo)' }], center: { big: nMes ? Math.round((pag / nMes) * 100) + '%' : '—', small: 'al día' } })),
      card('Próximos eventos', null, eventosLista({ rol: 'admin', grupoIds: [] }, 5))));

    el.append(h('div', { style: { marginTop: '16px' } }, card('Comunicados recientes', null, comunicadosLista({ rol: 'admin' }, 4))));
  }

  /* ---------- Docente ---------- */
  function docente(el) {
    const db = SGE.store.db, me = SGE.auth.me(), hoy = L.isoHoy(), d = me.user;
    const dow = L.diaSemana(hoy) - 1; // 0 = lunes
    const asigIds = new Set(me.asigs.map((a) => a.id));
    const clasesHoy = dow >= 0 && dow <= 4 ? db.horario.filter((s) => s.dia === dow && asigIds.has(s.asigId)).sort((a, b) => a.bloque - b.bloque) : [];
    const periodo = SGE.periodoActual();
    const asis = L.asistenciaMap(db);
    const grupos = SGE.auth.grupos();
    el.append(U.pageHead(`${saludo()}, ${q.primerNombre(d.nombre)}`, `${L.fechaLarga(hoy)} · Periodo ${periodo}`, [btn('Tomar asistencia', 'primary', () => SGE.go('asistencia'), 'asistencia'), btn('Calificar', 'ghost', () => SGE.go('notas'), 'notas')]));

    const pendientes = me.asigs.map((a) => {
      const ests = db.estudiantes.filter((e) => e.grupoId === a.grupoId && e.estado === 'Activo');
      const falta = ests.filter((e) => { const c = (db.notas[`${e.id}|${a.id}`] || {})[periodo]; return !c || c.t == null || c.e == null || c.p == null; }).length;
      return { a, falta, total: ests.length };
    }).filter((x) => x.falta > 0);

    el.append(h('div', { class: 'grid g3' },
      kpi({ label: 'Clases hoy', value: clasesHoy.length, sub: dow >= 0 && dow <= 4 ? 'Según tu horario' : 'Hoy no hay clases', icon: 'horarios' }),
      kpi({ label: 'Mis grupos', value: grupos.length, sub: `${SGE.auth.estudiantes().filter((e) => e.estado === 'Activo').length} estudiantes`, icon: 'grupos' }),
      kpi({ label: 'Notas por completar', value: pendientes.reduce((a, x) => a + x.falta, 0), sub: `Periodo ${periodo}`, icon: 'notas', tone: pendientes.length ? 'bad' : 'ok' })));

    el.append(h('div', { class: 'grid g2', style: { marginTop: '16px' } },
      card('Tu día', 'Clases de hoy en orden', clasesHoy.length ? h('ul', { class: 'list' }, clasesHoy.map((s) => { const a = q.asig(s.asigId), m = q.materia(a.materiaId), tomada = !!db.asistencia[a.grupoId + '|' + hoy]; return h('li', {}, h('span', { class: 'badge b-neutral num' }, L.BLOQUES[s.bloque].ini), h('div', { class: 'grow' }, h('b', {}, `${m.nombre} · ${q.gn(a.grupoId)}`), h('span', { class: 'muted small' }, q.grupo(a.grupoId).salon)), tomada ? badge('Asistencia lista', 'ok') : h('a', { class: 'btn ghost sm', href: '#/asistencia/' + a.grupoId }, 'Tomar asistencia')); })) : h('p', { class: 'muted' }, 'No tienes clases hoy. Revisa tu horario semanal.')),
      card('Calificaciones pendientes', `Componentes sin nota en el periodo ${periodo}`, pendientes.length ? h('ul', { class: 'list' }, pendientes.map((x) => h('li', {}, h('i', { class: 'dot-r', style: { background: `hsl(${q.materia(x.a.materiaId).hue} 60% 50%)` } }), h('div', { class: 'grow' }, h('b', {}, `${q.materia(x.a.materiaId).nombre} · ${q.gn(x.a.grupoId)}`), h('span', { class: 'muted small' }, `${x.falta} de ${x.total} estudiantes incompletos`)), h('a', { class: 'btn ghost sm', href: '#/notas/' + x.a.id }, 'Calificar')))) : h('p', { class: 'muted' }, 'Todo calificado.'))));

    const riesgos = SGE.auth.estudiantes().filter((e) => e.estado === 'Activo').map((e) => ({ e, r: L.resumenEstudiante(db, e, asis) })).filter((x) => x.r.riesgo.nivel !== 'ok').sort((a, b) => b.r.bajas - a.r.bajas);
    el.append(h('div', { class: 'grid g2', style: { marginTop: '16px' } },
      card('Estudiantes en alerta', 'En tus grupos', riesgoLista(riesgos.slice(0, 6), 'Ningún estudiante en alerta.')),
      card('Próximos eventos', null, eventosLista(me, 5))));
  }

  /* ---------- Acudiente ---------- */
  function acudiente(el) {
    const db = SGE.store.db, me = SGE.auth.me(), cfg = db.settings, hoy = L.isoHoy(), mesAct = Math.min(+hoy.slice(5, 7), 11);
    const asis = L.asistenciaMap(db);
    el.append(U.pageHead(`${saludo()}, ${q.primerNombre(me.user.nombre)}`, `${L.fechaLarga(hoy)} · Periodo ${SGE.periodoActual()}`, []));
    if (!me.hijos.length) { el.append(U.empty('Sin estudiantes vinculados', 'Comunícate con la secretaría del colegio.')); return; }
    me.hijos.forEach((e) => {
      const r = L.resumenEstudiante(db, e, asis), g = q.grupo(e.grupoId);
      const pagados = new Set(db.pagos.filter((p) => p.estudianteId === e.id).map((p) => p.mes));
      const vencidas = []; for (let m = 2; m <= mesAct; m++) if (e.beca < 100 && L.estadoCuota(m, cfg.anio, pagados.has(m), hoy) === 'vencida') vencidas.push(m);
      const peores = r.materias.filter((m) => m.final != null).sort((a, b) => a.final - b.final).slice(0, 3);
      el.append(h('section', { class: 'card', style: { marginBottom: '16px' } },
        h('div', { class: 'row', style: { justifyContent: 'space-between', marginBottom: '14px' } },
          h('div', { class: 'person' }, avatar(e.nombre, 48), h('div', {}, h('b', { style: { fontSize: '1.1rem' } }, e.nombre), h('small', {}, `${g ? g.nombre : '—'} · Código ${e.codigo}${e.estado !== 'Activo' ? ' · ' + e.estado : ''}`))),
          h('div', { class: 'actions' }, btn('Boletín', 'primary', () => SGE.go('boletin', e.id), 'boletin'), btn('Horario', 'ghost', () => SGE.go('horarios', e.id), 'horarios'), btn('Asistencia', 'ghost', () => SGE.go('asistencia', e.id), 'asistencia'), btn('Pensiones', 'ghost', () => SGE.go('pagos', e.id), 'pagos'))),
        h('div', { class: 'grid g4' },
          kpi({ label: 'Promedio', value: U.nota(r.promedio), sub: L.desempeno(r.promedio, cfg).label, icon: 'notas' }),
          kpi({ label: 'Asistencia', value: r.asistPct != null ? r.asistPct + '%' : '—', sub: `${r.asistencia.A} ausencias · ${r.asistencia.T} tardanzas`, icon: 'asistencia', tone: r.asistPct != null && r.asistPct < 85 ? 'bad' : 'ok' }),
          kpi({ label: 'Materias en bajo', value: r.bajas, sub: r.bajas ? 'Requieren refuerzo' : 'Todas aprobadas hasta ahora', icon: 'alert', tone: r.bajas ? 'bad' : 'ok' }),
          kpi({ label: 'Pensiones vencidas', value: vencidas.length, sub: vencidas.length ? vencidas.map((m) => L.MESES[m]).join(', ') : 'Estás al día', icon: 'pagos', tone: vencidas.length ? 'bad' : 'ok' })),
        peores.length ? h('p', { class: 'small', style: { marginTop: '12px' } }, h('b', {}, 'Para reforzar: '), peores.map((m) => `${m.materia} (${m.final.toFixed(1)})`).join(' · ')) : null));
    });
    el.append(h('div', { class: 'grid g2' }, card('Comunicados', null, comunicadosLista(me, 4)), card('Próximos eventos', null, eventosLista(me, 5))));
  }

  SGE.views.panel = { render(el) { const rol = SGE.auth.activa.rol; (rol === 'docente' ? docente : rol === 'acudiente' ? acudiente : admin)(el); } };
})();
