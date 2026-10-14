/* Ejecutar: node colegio/tests/logic.test.js */
const assert = require('assert');
const L = require('../js/logic.js');
const S = require('../js/seed.js');

let n = 0;
function test(name, fn) { fn(); n++; console.log('  ok  ' + name); }

test('notaPeriodo pondera 30/50/20', () => {
  assert.strictEqual(L.notaPeriodo({ t: 4, e: 3, p: 5 }), 3.7); // 1.2 + 1.5 + 1.0
});
test('notaPeriodo renormaliza si falta un componente', () => {
  assert.strictEqual(L.notaPeriodo({ t: 4, e: null, p: 4 }), 4);
  assert.strictEqual(L.notaPeriodo({ t: null, e: null, p: null }), null);
  assert.strictEqual(L.notaPeriodo(undefined), null);
});
test('notaFinal promedia solo los periodos con nota', () => {
  const r = L.notaFinal({ 1: { t: 4, e: 4, p: 4 }, 2: { t: 2, e: 2, p: 2 } });
  assert.deepStrictEqual(r.porPeriodo, [4, 2, null, null]);
  assert.strictEqual(r.final, 3);
});
test('desempeño por rangos', () => {
  const c = { aprobado: 3 };
  assert.strictEqual(L.desempeno(4.6, c).key, 'superior');
  assert.strictEqual(L.desempeno(4.0, c).key, 'alto');
  assert.strictEqual(L.desempeno(3.0, c).key, 'basico');
  assert.strictEqual(L.desempeno(2.9, c).key, 'bajo');
  assert.strictEqual(L.desempeno(null, c).key, 'sin');
});
test('asistencia: excusas no penalizan', () => {
  assert.strictEqual(L.pctAsistencia({ P: 8, T: 1, A: 1, E: 5 }), 90);
  assert.strictEqual(L.pctAsistencia({ P: 0, T: 0, A: 0, E: 3 }), null);
});
test('riesgo combina notas y asistencia', () => {
  assert.strictEqual(L.riesgo(0, 95).nivel, 'ok');
  assert.strictEqual(L.riesgo(1, 95).nivel, 'medio');
  assert.strictEqual(L.riesgo(3, 95).nivel, 'alto');
  assert.strictEqual(L.riesgo(0, 70).nivel, 'alto');
  assert.strictEqual(L.riesgo(0, 80).nivel, 'medio');
});
test('una sola ausencia no marca riesgo (muestra mínima)', () => {
  const db = S.generate('2026-10-14');
  const e = db.estudiantes.find((x) => x.estado === 'Activo');
  db.asistencia = { [e.grupoId + '|2026-10-14']: { [e.id]: 'A' } };
  const r = L.resumenEstudiante(db, e);
  assert.strictEqual(r.asistPct, 0);
  assert.ok(!r.riesgo.razones.some((t) => /asistencia/.test(t)));
});
test('fechas: hábiles y periodos', () => {
  assert.strictEqual(L.addDias('2026-10-14', 1), '2026-10-15');
  assert.strictEqual(L.esHabil('2026-10-17'), false); // sábado
  const h = L.habilesAtras('2026-10-14', 5);
  assert.deepStrictEqual(h, ['2026-10-08', '2026-10-09', '2026-10-12', '2026-10-13', '2026-10-14']);
  assert.deepStrictEqual([2, 5, 7, 8, 10].map((m) => L.periodoDe(`2026-${String(m).padStart(2, '0')}-10`)), [1, 2, 2, 3, 4]);
});
test('cuotas: beca, mora y estado', () => {
  const cfg = { pension: 400000, mora: 5 };
  assert.strictEqual(L.cuotaNeta({ beca: 25 }, cfg), 300000);
  assert.strictEqual(L.moraDe({ beca: 0 }, cfg), 20000);
  assert.strictEqual(L.estadoCuota(10, 2026, true, '2026-10-14'), 'pagada');
  assert.strictEqual(L.estadoCuota(10, 2026, false, '2026-10-14'), 'vencida');
  assert.strictEqual(L.estadoCuota(10, 2026, false, '2026-10-05'), 'pendiente');
  assert.strictEqual(L.estadoCuota(11, 2026, false, '2026-10-14'), 'futura');
});

function checkHorario(db) {
  assert.ok(db._horarioOk, 'el generador debe producir un horario');
  assert.deepStrictEqual(L.conflictosDocentes(db.horario, db.asignaciones), [], 'sin choques de docentes');
  db.grupos.forEach((g) => {
    const slots = db.horario.filter((s) => s.grupoId === g.id);
    const keys = new Set(slots.map((s) => s.dia + '|' + s.bloque));
    assert.strictEqual(keys.size, slots.length, 'un solo curso por bloque en ' + g.nombre);
    db.asignaciones.filter((a) => a.grupoId === g.id).forEach((a) => {
      assert.strictEqual(slots.filter((s) => s.asigId === a.id).length, a.horas, 'horas semanales exactas');
    });
  });
}
test('generador de horarios: completo y sin choques (varias fechas)', () => {
  for (const f of ['2026-10-14', '2026-03-03', '2027-05-20']) checkHorario(S.generate(f));
});
test('generador: falla limpio si un grupo no cabe', () => {
  const asigs = [{ id: 'x', grupoId: 'g', materiaId: 'm', docenteId: 'd', horas: 31 }];
  assert.strictEqual(L.generarHorario(asigs, ['g'], { intentos: 3 }).ok, false);
});
test('generador: dos grupos con un único docente nunca coinciden', () => {
  const asigs = [
    { id: 'a1', grupoId: 'g1', materiaId: 'm', docenteId: 'd', horas: 10 },
    { id: 'a2', grupoId: 'g2', materiaId: 'm', docenteId: 'd', horas: 10 },
  ];
  const r = L.generarHorario(asigs, ['g1', 'g2'], { rng: L.mulberry32(5) });
  assert.ok(r.ok);
  assert.deepStrictEqual(L.conflictosDocentes(r.slots, asigs), []);
});

test('semilla: datos coherentes', () => {
  const db = S.generate('2026-10-14');
  assert.strictEqual(db.grupos.length, 7);
  assert.strictEqual(db.docentes.length, 13);
  assert.ok(db.estudiantes.length > 100);
  const ids = db.estudiantes.map((e) => e.id);
  assert.strictEqual(new Set(ids).size, ids.length, 'ids únicos');
  db.estudiantes.forEach((e) => assert.ok(db.acudientes.find((a) => a.id === e.acudienteId), 'acudiente existe'));
  const act = db.estudiantes.find((e) => e.estado === 'Activo');
  const res = L.resumenEstudiante(db, act);
  assert.strictEqual(res.materias.length, 9);
  assert.ok(res.promedio >= 1 && res.promedio <= 5);
  assert.ok(L.observacion(res, 'Ana', db.settings).length > 20);
  const p = L.puestos(db, act.grupoId);
  assert.ok(p.total > 10 && p.puestos[act.id] >= 1);
});
test('semilla: determinista', () => {
  assert.strictEqual(JSON.stringify(S.generate('2026-10-14')), JSON.stringify(S.generate('2026-10-14')));
});

console.log(`\n${n} pruebas OK`);
