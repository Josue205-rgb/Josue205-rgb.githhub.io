/* Lógica pura del SGE: sin DOM, sin almacenamiento. Probada en tests/logic.test.js */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.SGE = root.SGE || {}; root.SGE.logic = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  const BLOQUES = [
    { ini: '06:30', fin: '07:20' }, { ini: '07:20', fin: '08:10' }, { ini: '08:10', fin: '09:00' },
    { ini: '09:30', fin: '10:20' }, { ini: '10:20', fin: '11:10' }, { ini: '11:10', fin: '12:00' },
  ];
  const MESES = { 2: 'Febrero', 3: 'Marzo', 4: 'Abril', 5: 'Mayo', 6: 'Junio', 7: 'Julio', 8: 'Agosto', 9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre' };
  const MESES_COMPLETOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const DIAS_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const PESOS_DEFECTO = { t: 0.3, e: 0.5, p: 0.2 };

  /* ---------- utilidades ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  const round1 = (n) => Math.round(n * 10) / 10;
  const isNum = (v) => typeof v === 'number' && !isNaN(v);

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, rng) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /* ---------- fechas (cadenas ISO AAAA-MM-DD, sin zonas horarias) ---------- */
  function fmtISO(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
  function isoHoy() { return fmtISO(new Date()); }
  function toDate(iso) { return new Date(iso + 'T12:00:00'); }
  function addDias(iso, n) { const d = toDate(iso); d.setDate(d.getDate() + n); return fmtISO(d); }
  function diaSemana(iso) { return toDate(iso).getDay(); }
  function esHabil(iso) { const w = diaSemana(iso); return w >= 1 && w <= 5; }
  /** Últimos n días hábiles que terminan en `iso` (inclusive si es hábil), en orden ascendente. */
  function habilesAtras(iso, n) {
    const out = [];
    let cur = iso;
    while (out.length < n) { if (esHabil(cur)) out.unshift(cur); cur = addDias(cur, -1); }
    return out;
  }
  function fechaLarga(iso) {
    const d = toDate(iso);
    return `${DIAS_LARGOS[d.getDay()]} ${d.getDate()} de ${MESES_COMPLETOS[d.getMonth()]} de ${d.getFullYear()}`;
  }
  function fechaCorta(iso) {
    const d = toDate(iso);
    return `${d.getDate()} ${MESES_COMPLETOS[d.getMonth()].slice(0, 3)}`;
  }
  /** Periodo académico (1–4) según el mes. */
  function periodoDe(iso) {
    const m = +iso.slice(5, 7);
    if (m <= 4) return 1;
    if (m <= 7) return 2;
    if (m <= 9) return 3;
    return 4;
  }

  /* ---------- notas ---------- */
  /** Nota del periodo: promedio ponderado de los componentes presentes (los pesos se renormalizan). */
  function notaPeriodo(c, pesos) {
    if (!c) return null;
    pesos = pesos || PESOS_DEFECTO;
    let s = 0, w = 0;
    for (const k of ['t', 'e', 'p']) {
      if (isNum(c[k])) { s += c[k] * pesos[k]; w += pesos[k]; }
    }
    return w ? round1(s / w) : null;
  }
  /** `periodos` = {1:{t,e,p},...}. Devuelve las 4 notas y la definitiva acumulada. */
  function notaFinal(periodos, pesos) {
    const porPeriodo = [1, 2, 3, 4].map((p) => notaPeriodo(periodos && periodos[p], pesos));
    const val = porPeriodo.filter(isNum);
    return { porPeriodo, final: val.length ? round1(val.reduce((a, b) => a + b, 0) / val.length) : null };
  }
  function desempeno(nota, cfg) {
    const aprob = (cfg && cfg.aprobado) || 3;
    if (!isNum(nota)) return { key: 'sin', label: 'Sin nota' };
    if (nota >= 4.6) return { key: 'superior', label: 'Superior' };
    if (nota >= 4.0) return { key: 'alto', label: 'Alto' };
    if (nota >= aprob) return { key: 'basico', label: 'Básico' };
    return { key: 'bajo', label: 'Bajo' };
  }
  function promedio(arr) {
    const v = arr.filter(isNum);
    return v.length ? round1(v.reduce((a, b) => a + b, 0) / v.length) : null;
  }

  /* ---------- asistencia ---------- */
  /** { estId: {P,A,T,E} } sumando todos los registros (o solo las fechas de `fechas`). */
  function asistenciaMap(db, fechas) {
    const set = fechas ? new Set(fechas) : null;
    const out = {};
    for (const [key, regs] of Object.entries(db.asistencia || {})) {
      const fecha = key.split('|')[1];
      if (set && !set.has(fecha)) continue;
      for (const [eid, code] of Object.entries(regs)) {
        const o = out[eid] || (out[eid] = { P: 0, A: 0, T: 0, E: 0 });
        if (o[code] !== undefined) o[code]++;
      }
    }
    return out;
  }
  /** % de asistencia: presentes+tardes sobre (presentes+tardes+ausencias injustificadas). Las excusas no penalizan. */
  function pctAsistencia(a) {
    if (!a) return null;
    const den = a.P + a.T + a.A;
    return den ? Math.round(((a.P + a.T) / den) * 100) : null;
  }

  /* ---------- resumen académico ---------- */
  function riesgo(bajas, asistPct) {
    const r = [];
    let nivel = 'ok';
    if (bajas >= 3) { nivel = 'alto'; r.push(`${bajas} materias en desempeño bajo`); }
    else if (bajas >= 1) { nivel = 'medio'; r.push(`${bajas} materia${bajas > 1 ? 's' : ''} en desempeño bajo`); }
    if (asistPct != null) {
      if (asistPct < 75) { nivel = 'alto'; r.push(`asistencia de ${asistPct}%`); }
      else if (asistPct < 85) { if (nivel === 'ok') nivel = 'medio'; r.push(`asistencia de ${asistPct}%`); }
    }
    return { nivel, razones: r };
  }

  /** Resumen de un estudiante: notas por materia, promedio, asistencia y riesgo. `asis` es opcional (asistenciaMap). */
  function resumenEstudiante(db, est, asis) {
    const cfg = db.settings;
    const asigs = db.asignaciones.filter((a) => a.grupoId === est.grupoId);
    const materias = asigs.map((a) => {
      const mat = db.materias.find((m) => m.id === a.materiaId);
      const doc = db.docentes.find((d) => d.id === a.docenteId);
      const nf = notaFinal(db.notas[`${est.id}|${a.id}`], cfg.pesos);
      return { asigId: a.id, materia: mat ? mat.nombre : '—', hue: mat ? mat.hue : 200, docente: doc ? doc.nombre : '—', horas: a.horas, ...nf, des: desempeno(nf.final, cfg) };
    });
    const prom = promedio(materias.map((m) => m.final));
    const bajas = materias.filter((m) => isNum(m.final) && m.final < cfg.aprobado).length;
    const a = (asis || asistenciaMap(db))[est.id] || { P: 0, A: 0, T: 0, E: 0 };
    const pct = pctAsistencia(a);
    // con menos de 5 registros la asistencia aún no es una señal fiable de riesgo
    const muestra = a.P + a.T + a.A >= 5;
    return { materias, promedio: prom, bajas, asistencia: a, asistPct: pct, riesgo: riesgo(bajas, muestra ? pct : null) };
  }

  /** Puesto (1 = mejor) de cada estudiante activo del grupo según el promedio. */
  function puestos(db, grupoId, asis) {
    const lista = db.estudiantes.filter((e) => e.grupoId === grupoId && e.estado === 'Activo')
      .map((e) => ({ id: e.id, prom: resumenEstudiante(db, e, asis).promedio }))
      .filter((x) => isNum(x.prom)).sort((a, b) => b.prom - a.prom);
    const out = {};
    let last = null, pos = 0;
    lista.forEach((x, i) => { if (x.prom !== last) { pos = i + 1; last = x.prom; } out[x.id] = pos; });
    return { puestos: out, total: lista.length };
  }

  function observacion(res, nombre, cfg) {
    const aprob = (cfg && cfg.aprobado) || 3;
    const con = res.materias.filter((m) => isNum(m.final));
    if (!con.length) return `${nombre} aún no tiene calificaciones registradas en este periodo.`;
    const mejor = con.slice().sort((a, b) => b.final - a.final)[0];
    const peor = con.slice().sort((a, b) => a.final - b.final)[0];
    const partes = [];
    if (res.promedio >= 4.6) partes.push(`${nombre} muestra un desempeño sobresaliente y un compromiso constante con su proceso.`);
    else if (res.promedio >= 4.0) partes.push(`${nombre} presenta un buen desempeño académico general.`);
    else if (res.promedio >= aprob) partes.push(`${nombre} alcanza los logros básicos y puede mejorar con más constancia.`);
    else partes.push(`${nombre} presenta dificultades académicas que requieren acompañamiento en casa y en el colegio.`);
    partes.push(`Su mejor resultado es ${mejor.materia} (${mejor.final.toFixed(1)}).`);
    if (peor.final < aprob) partes.push(`Debe reforzar ${peor.materia} (${peor.final.toFixed(1)}) con un plan de apoyo.`);
    else if (peor.asigId !== mejor.asigId && peor.final < 3.6) partes.push(`Se recomienda fortalecer ${peor.materia}.`);
    if (res.asistPct != null && res.asistPct < 85) partes.push(`Su asistencia (${res.asistPct}%) debe mejorar.`);
    else if (res.asistPct != null && res.asistPct >= 97) partes.push('Su asistencia es ejemplar.');
    return partes.join(' ');
  }

  /* ---------- horarios ---------- */
  /** Intenta llenar los D×B bloques de un grupo sin chocar con docentes ya ocupados (`busy`). Devuelve slots o null. */
  function llenarGrupo(asigs, D, B, busy, rng) {
    const total = asigs.reduce((s, a) => s + a.horas, 0);
    if (total > D * B) return null;
    const rem = {};
    asigs.forEach((a) => { rem[a.id] = a.horas; });
    const dayCount = {};
    const at = new Array(D * B).fill(null);
    let nodes = 0;
    let remTotal = total;

    function dfs(i) {
      if (remTotal === 0) return true;
      if (i === D * B) return false;
      if (remTotal > D * B - i) return false;
      if (++nodes > 40000) return false;
      const d = Math.floor(i / B), b = i % B;
      let cands = asigs.filter((a) => {
        if (rem[a.id] <= 0 || busy.has(`${a.docenteId}|${d}|${b}`)) return false;
        const c = dayCount[`${d}|${a.id}`] || 0;
        if (c === 0) return true;
        return c === 1 && b > 0 && at[i - 1] === a.id; // la 2.ª hora del día debe ser seguida
      });
      cands = cands.map((a) => ({ a, k: rem[a.id] + rng() * 2.5 })).sort((x, y) => y.k - x.k).map((x) => x.a);
      const opciones = cands.map((a) => a.id);
      if (remTotal < D * B - i) opciones.push(null); // se permite hueco solo si sobran bloques
      for (const id of opciones) {
        if (id === null) { at[i] = null; if (dfs(i + 1)) return true; continue; }
        rem[id]--; remTotal--; dayCount[`${d}|${id}`] = (dayCount[`${d}|${id}`] || 0) + 1; at[i] = id;
        if (dfs(i + 1)) return true;
        rem[id]++; remTotal++; dayCount[`${d}|${id}`]--; at[i] = null;
      }
      return false;
    }

    if (!dfs(0)) return null;
    const out = [];
    at.forEach((id, i) => {
      if (!id) return;
      const a = asigs.find((x) => x.id === id);
      out.push({ dia: Math.floor(i / B), bloque: i % B, asigId: id, docenteId: a.docenteId });
    });
    return out;
  }

  /** Genera el horario de todos los grupos sin choques de docentes. */
  function generarHorario(asignaciones, grupoIds, opts) {
    opts = opts || {};
    const D = opts.dias || 5, B = opts.bloques || 6, rng = opts.rng || Math.random, intentos = opts.intentos || 400;
    const porGrupo = {};
    grupoIds.forEach((g) => { porGrupo[g] = asignaciones.filter((a) => a.grupoId === g && a.horas > 0); });
    for (let t = 0; t < intentos; t++) {
      const busy = new Set();
      const out = [];
      let ok = true;
      for (const g of shuffle(grupoIds.slice(), rng)) {
        const res = llenarGrupo(porGrupo[g], D, B, busy, rng);
        if (!res) { ok = false; break; }
        res.forEach((s) => { busy.add(`${s.docenteId}|${s.dia}|${s.bloque}`); out.push({ grupoId: g, dia: s.dia, bloque: s.bloque, asigId: s.asigId }); });
      }
      if (ok) return { ok: true, slots: out, intentos: t + 1 };
    }
    return { ok: false, slots: [], intentos };
  }

  /** Docentes asignados a dos grupos a la misma hora. */
  function conflictosDocentes(slots, asignaciones) {
    const am = {};
    asignaciones.forEach((a) => { am[a.id] = a; });
    const m = {};
    slots.forEach((s) => {
      const a = am[s.asigId];
      if (!a) return;
      const k = `${a.docenteId}|${s.dia}|${s.bloque}`;
      (m[k] = m[k] || []).push(s);
    });
    return Object.entries(m).filter(([, v]) => v.length > 1).map(([k, v]) => {
      const [docenteId, dia, bloque] = k.split('|');
      return { docenteId, dia: +dia, bloque: +bloque, slots: v };
    });
  }

  /* ---------- pagos ---------- */
  const cuotaNeta = (est, cfg) => Math.round(cfg.pension * (1 - (est.beca || 0) / 100));
  const moraDe = (est, cfg) => Math.round(cuotaNeta(est, cfg) * (cfg.mora || 0) / 100);
  /** 'pagada' | 'vencida' (vence el día 10) | 'pendiente' (mes en curso) | 'futura' */
  function estadoCuota(mes, anio, pagada, hoy) {
    if (pagada) return 'pagada';
    if (hoy > `${anio}-${pad(mes)}-10`) return 'vencida';
    if (hoy >= `${anio}-${pad(mes)}-01`) return 'pendiente';
    return 'futura';
  }

  /* ---------- varios ---------- */
  function iniciales(nombre) {
    const p = String(nombre || '').trim().split(/\s+/);
    return ((p[0] || '')[0] || '') + ((p.length > 1 ? p[p.length > 2 ? 2 : 1] : '')[0] || '');
  }
  function csv(rows) {
    const esc = (v) => { const s = v == null ? '' : String(v); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    return rows.map((r) => r.map(esc).join(',')).join('\n');
  }

  return {
    DIAS, BLOQUES, MESES, MESES_COMPLETOS, PESOS_DEFECTO,
    round1, mulberry32, shuffle,
    isoHoy, addDias, diaSemana, esHabil, habilesAtras, fechaLarga, fechaCorta, periodoDe, fmtISO,
    notaPeriodo, notaFinal, desempeno, promedio,
    asistenciaMap, pctAsistencia, riesgo, resumenEstudiante, puestos, observacion,
    generarHorario, conflictosDocentes,
    cuotaNeta, moraDe, estadoCuota, iniciales, csv,
  };
});
