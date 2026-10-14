/* Horarios: vista por grupo o docente, edición manual con detección de choques y generador automático. */
(function () {
  'use strict';
  const SGE = window.SGE, U = SGE.ui, { h, badge, btn } = U, L = SGE.logic, q = SGE.q;

  function bloqueActual() {
    const d = new Date(), hhmm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    const dow = d.getDay() - 1;
    const b = L.BLOQUES.findIndex((x) => hhmm >= x.ini && hhmm < x.fin);
    return dow >= 0 && dow <= 4 && b >= 0 ? `${dow}|${b}` : null;
  }
  const choquesSet = () => { const db = SGE.store.db; return new Set(L.conflictosDocentes(db.horario, db.asignaciones).map((c) => `${c.docenteId}|${c.dia}|${c.bloque}`)); };

  /** Mapa 'dia|bloque' -> [{slot, asig}] para un grupo o un docente. */
  function mapaDe(f) {
    const db = SGE.store.db, m = {};
    db.horario.forEach((s) => {
      const a = q.asig(s.asigId);
      if (!a) return;
      if ((f.grupoId && s.grupoId !== f.grupoId) || (f.docenteId && a.docenteId !== f.docenteId)) return;
      (m[`${s.dia}|${s.bloque}`] = m[`${s.dia}|${s.bloque}`] || []).push({ s, a });
    });
    return m;
  }

  /** o: {grupoId|docenteId, edit, onCell(dia,bloque,entries)} */
  function grid(o) {
    const mapa = mapaDe(o), confl = choquesSet(), ahora = bloqueActual();
    const g = h('div', { class: 'hor', role: 'table', 'aria-label': 'Horario semanal' });
    g.append(h('div', {}), ...L.DIAS.map((d) => h('div', { class: 'hh', role: 'columnheader' }, d)));
    for (let b = 0; b < L.BLOQUES.length; b++) {
      if (b === 3) g.append(h('div', { class: 'recreo' }, 'RECREO · 9:00 – 9:30'));
      g.append(h('div', { class: 'hl' }, L.BLOQUES[b].ini, h('br'), L.BLOQUES[b].fin));
      for (let d = 0; d < 5; d++) {
        const es = mapa[`${d}|${b}`] || [];
        const key = `${d}|${b}`;
        const cls = (c) => c + (o.edit ? ' edit' : '') + (key === ahora ? ' now' : '');
        if (!es.length) {
          g.append(o.edit ? h('button', { type: 'button', class: cls('hcell vacio'), 'aria-label': `${L.DIAS[d]} ${L.BLOQUES[b].ini}: libre. Asignar`, onclick: () => o.onCell(d, b, []) }, '+') : h('div', { class: cls('hcell vacio') }, '·'));
          continue;
        }
        const { s, a } = es[0];
        const m = q.materia(a.materiaId), doc = q.docente(a.docenteId);
        const malo = es.length > 1 || confl.has(`${a.docenteId}|${d}|${b}`);
        const sub = o.docenteId ? q.gn(s.grupoId) : (doc ? doc.nombre : '—');
        const attrs = { class: cls('hcell' + (malo ? ' choque' : '')), style: { '--h': m ? m.hue : 200 }, title: malo ? 'Choque: el docente está en dos grupos a la misma hora' : null };
        const kids = [h('b', {}, m ? m.nombre : '—'), h('span', {}, sub + (malo ? ' ⚠ choque' : ''))];
        g.append(o.edit ? h('button', { type: 'button', ...attrs, 'aria-label': `${L.DIAS[d]} ${L.BLOQUES[b].ini}: ${m ? m.nombre : ''}. Cambiar`, onclick: () => o.onCell(d, b, es) }, kids) : h('div', attrs, kids));
      }
    }
    return h('div', { class: 'hor-wrap' }, g);
  }

  function miniGrid(f) { return grid({ ...f, edit: false }); }

  /* ---------- generador ---------- */
  function diagnostico() {
    const db = SGE.store.db, out = [];
    db.grupos.forEach((g) => { const t = db.asignaciones.filter((a) => a.grupoId === g.id).reduce((s, a) => s + a.horas, 0); if (t > 30) out.push(`${g.nombre} suma ${t} horas y solo hay 30 bloques.`); });
    db.docentes.forEach((d) => { const t = db.asignaciones.filter((a) => a.docenteId === d.id).reduce((s, a) => s + a.horas, 0); if (t > 30) out.push(`${d.nombre} tiene ${t} horas de carga y solo hay 30 bloques.`); });
    return out;
  }
  async function generar() {
    const db = SGE.store.db;
    if (!db.grupos.length) return U.toast('Primero crea grupos y cargas académicas.', 'bad');
    const prob = diagnostico();
    if (prob.length) return U.modal({ title: 'No se puede generar', size: 'sm', body: h('div', {}, h('p', {}, 'Ajusta primero estas cargas en «Grupos y materias»:'), h('ul', {}, prob.map((p) => h('li', {}, p)))), actions: [{ label: 'Entendido', kind: 'primary' }] });
    if (db.horario.length && !(await U.confirmar('Se reemplazará todo el horario actual, incluidos los cambios manuales. ¿Continuar?', { ok: 'Generar de nuevo', title: 'Generar horarios' }))) return;
    const t0 = performance.now();
    const r = L.generarHorario(db.asignaciones, db.grupos.map((g) => g.id), { rng: L.mulberry32((Date.now() % 1e9) | 0), intentos: 600 });
    if (!r.ok) return U.toast('No se encontró un horario sin choques. Reduce la carga de algún docente o reparte las materias entre más docentes.', 'bad');
    db.horario = r.slots; SGE.store.guardar();
    U.toast(`Horario generado: ${r.slots.length} bloques, 0 choques (${Math.round(performance.now() - t0)} ms, ${r.intentos} intento${r.intentos > 1 ? 's' : ''}).`);
    SGE.repintar();
  }

  /* ---------- edición de una celda ---------- */
  function editarCelda(grupoId, dia, bloque, entries) {
    const db = SGE.store.db;
    const asigs = db.asignaciones.filter((a) => a.grupoId === grupoId);
    const puestas = (id) => db.horario.filter((s) => s.asigId === id).length;
    const actual = entries[0] ? entries[0].a.id : '';
    let elegida = actual;
    const lista = h('div', { class: 'stack', style: { display: 'grid', gap: '6px' } });
    function pintar() {
      U.clear(lista);
      asigs.forEach((a) => {
        const m = q.materia(a.materiaId), d = q.docente(a.docenteId);
        const ocupado = db.horario.find((s) => s.grupoId !== grupoId && s.dia === dia && s.bloque === bloque && (q.asig(s.asigId) || {}).docenteId === a.docenteId);
        lista.appendChild(h('label', { class: 'hcell', style: { '--h': m.hue, cursor: 'pointer', flexDirection: 'row', alignItems: 'center', gap: '10px', outline: elegida === a.id ? '2px solid var(--brand)' : 'none' } },
          h('input', { type: 'radio', name: 'asig', checked: elegida === a.id, onchange: () => { elegida = a.id; pintar(); } }),
          h('div', { style: { flex: 1 } }, h('b', {}, m.nombre), h('span', { style: { display: 'block' } }, `${d ? d.nombre : '—'} · ${puestas(a.id)}/${a.horas} h asignadas`)),
          ocupado ? badge('Ocupado en ' + q.gn(ocupado.grupoId), 'bad') : null));
      });
      lista.appendChild(h('label', { class: 'hcell vacio', style: { cursor: 'pointer', flexDirection: 'row', gap: '8px', justifyContent: 'flex-start', outline: elegida === '' ? '2px solid var(--brand)' : 'none' } }, h('input', { type: 'radio', name: 'asig', checked: elegida === '', onchange: () => { elegida = ''; pintar(); } }), 'Dejar libre'));
    }
    pintar();
    U.modal({ title: `${q.gn(grupoId)} · ${L.DIAS[dia]} ${L.BLOQUES[bloque].ini}–${L.BLOQUES[bloque].fin}`, size: 'sm', body: lista, actions: [{ label: 'Cancelar', kind: 'ghost' }, { label: 'Aplicar', kind: 'primary', onClick: () => {
      db.horario = db.horario.filter((s) => !(s.grupoId === grupoId && s.dia === dia && s.bloque === bloque));
      if (elegida) db.horario.push({ grupoId, dia, bloque, asigId: elegida });
      SGE.store.guardar();
      const c = L.conflictosDocentes(db.horario, db.asignaciones).length;
      if (c && elegida) U.toast('Se aplicó, pero el docente ya está en otro grupo a esa hora (choque marcado en rojo).', 'bad'); else U.toast('Horario actualizado.');
      SGE.repintar();
    } }] });
  }

  /* ---------- vista ---------- */
  function render(el, arg) {
    const db = SGE.store.db, me = SGE.auth.me(), admin = me.rol === 'admin';
    const grupos = SGE.auth.grupos();
    const st = { modo: me.rol === 'docente' ? 'docente' : 'grupo', grupoId: grupos[0] && grupos[0].id, docenteId: me.rol === 'docente' ? me.user.id : (db.docentes[0] || {}).id };
    if (arg) {
      if (arg.startsWith('d') && q.docente(arg) && me.rol !== 'acudiente') { st.modo = 'docente'; st.docenteId = arg; }
      else if (q.grupo(arg) && me.grupoIds.includes(arg)) { st.modo = 'grupo'; st.grupoId = arg; }
      else if (q.est(arg) && SGE.auth.puedeVerFicha(q.est(arg))) { st.modo = 'grupo'; st.grupoId = q.est(arg).grupoId; }
    }
    const body = h('div', {});
    const nChoques = L.conflictosDocentes(db.horario, db.asignaciones).length;
    el.append(U.pageHead('Horarios', 'Semana tipo de cada grupo y docente. El bloque en curso se resalta con borde amarillo.',
      [admin ? btn('Generar automáticamente', 'primary', generar, 'wand') : null, btn('Imprimir', 'ghost', () => window.print(), 'print')]));
    el.append(h('div', { class: 'row no-print', style: { marginBottom: '14px' } },
      me.rol !== 'acudiente' ? U.seg([{ value: 'grupo', label: 'Por grupo' }, { value: 'docente', label: 'Por docente' }], st.modo, (v) => { st.modo = v; pintar(); }, 'Modo de vista') : null,
      h('span', { id: 'sel-slot' }),
      admin ? (nChoques ? badge(`${nChoques} choque${nChoques > 1 ? 's' : ''} de docentes`, 'bad') : badge('Sin choques de docentes', 'ok')) : null));
    el.append(body);
    const selSlot = el.querySelector('#sel-slot');

    function pintar() {
      U.clear(selSlot); U.clear(body);
      if (st.modo === 'grupo') {
        if (!grupos.length) return body.append(U.empty('Sin grupos', 'No hay grupos para mostrar.'));
        if (grupos.length > 1) selSlot.append(U.selectEl(grupos.map((g) => ({ value: g.id, label: g.nombre })), st.grupoId, (v) => { st.grupoId = v; pintar(); }, 'Grupo'));
        else selSlot.append(h('b', {}, grupos[0].nombre));
        const g = q.grupo(st.grupoId);
        const asigs = db.asignaciones.filter((a) => a.grupoId === st.grupoId);
        if (!db.horario.length && admin) return body.append(U.empty('Aún no hay horario', 'Genera uno automáticamente: el sistema reparte las materias sin choques de docentes.', btn('Generar horario', 'primary', generar, 'wand')));
        body.append(h('div', { class: 'card' },
          h('div', { class: 'row', style: { justifyContent: 'space-between', marginBottom: '12px' } }, h('h2', {}, `Horario de ${g.nombre}`), h('span', { class: 'muted small' }, `${g.salon || ''} · Director: ${(q.docente(g.directorId) || {}).nombre || '—'}`)),
          grid({ grupoId: st.grupoId, edit: admin, onCell: (d, b, es) => editarCelda(st.grupoId, d, b, es) }),
          admin ? h('p', { class: 'muted small no-print', style: { marginTop: '10px' } }, 'Haz clic en una celda para cambiar la materia de ese bloque.') : null),
          h('div', { class: 'card', style: { marginTop: '16px' } }, h('h3', { style: { marginBottom: '8px' } }, 'Intensidad horaria'), h('div', { class: 'chips' }, asigs.map((a) => { const n = db.horario.filter((s) => s.asigId === a.id).length, m = q.materia(a.materiaId); return h('span', { class: 'chip' + (n !== a.horas ? ' mal' : ''), style: { '--h': m.hue }, title: n !== a.horas ? 'No coincide con las horas definidas para la materia' : '' }, `${m.nombre}: ${n}/${a.horas}`); }))));
      } else {
        const docs = me.rol === 'docente' ? db.docentes.filter((d) => d.id === me.user.id) : db.docentes;
        selSlot.append(me.rol === 'docente' ? h('b', {}, me.user.nombre) : U.selectEl(docs.map((d) => ({ value: d.id, label: d.nombre })), st.docenteId, (v) => { st.docenteId = v; pintar(); }, 'Docente'));
        const d = q.docente(st.docenteId); if (!d) return;
        const horas = db.horario.filter((s) => (q.asig(s.asigId) || {}).docenteId === d.id).length;
        body.append(h('div', { class: 'card' }, h('div', { class: 'row', style: { justifyContent: 'space-between', marginBottom: '12px' } }, h('h2', {}, `Horario de ${d.nombre}`), h('span', { class: 'muted small' }, `${horas} bloques por semana`)), grid({ docenteId: d.id, edit: false })));
      }
    }
    pintar();
  }

  SGE.views.horarios = { render, generar, miniGrid };
})();
