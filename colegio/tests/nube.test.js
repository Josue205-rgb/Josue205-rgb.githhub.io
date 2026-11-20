/* Ejecutar: node colegio/tests/nube.test.js
   Prueba la conversión base en memoria ⇄ filas de Supabase y el cálculo de cambios. */
const assert = require('assert');
const N = require('../js/nube.js');
const S = require('../js/seed.js');

let n = 0;
function test(name, fn) { fn(); n++; console.log('  ok  ' + name); }
const COLS = ['settings', 'materias', 'docentes', 'grupos', 'asignaciones', 'estudiantes', 'acudientes', 'horario', 'notas', 'asistencia', 'pagos', 'comunicados', 'eventos', 'observaciones'];
const db0 = () => { const d = S.generate('2026-09-15'); d.observaciones = { [d.estudiantes[0].id + '|3']: 'Muy buen periodo.' }; return d; };

test('ida y vuelta conserva todos los datos', () => {
  const db = db0(), back = N.deFilas(N.aFilas(db));
  COLS.forEach((c) => assert.deepStrictEqual(back[c], db[c], c));
});
test('la asistencia se guarda una fila por estudiante (el acudiente no ve a los compañeros)', () => {
  const f = N.aFilas(db0()).asistencia[0];
  assert.deepStrictEqual(Object.keys(f).sort(), ['estado', 'estudiante_id', 'fecha', 'grupo_id', 'id']);
  assert.ok(/^g\d+\|\d{4}-\d\d-\d\d\|e\d+$/.test(f.id));
});
test('las columnas de permisos mandan sobre lo que diga data', () => {
  const filas = N.aFilas(db0());
  filas.eventos[0].data.grupoId = 'g9'; filas.eventos[0].grupo_id = 'g1';
  assert.strictEqual(N.deFilas(filas).eventos.find((e) => e.id === filas.eventos[0].id).grupoId, 'g1');
});
test('sin cambios no hay nada que subir', () => {
  const db = db0(), snap = N.instantanea(N.aFilas(db));
  assert.deepStrictEqual(N.diferencias(snap, N.aFilas(db)), {});
});
test('detecta solo lo que cambió: una nota, un estudiante nuevo y un pago borrado', () => {
  const db = db0(), snap = N.instantanea(N.aFilas(db));
  const k = Object.keys(db.notas)[0]; db.notas[k] = { ...db.notas[k], 1: { t: 5, e: 5, p: 5 } };
  db.estudiantes.push({ id: 'eNUEVO', nombre: 'Prueba', grupoId: 'g1', acudienteId: 'ac1' });
  const pid = db.pagos[0].id; db.pagos.shift();
  const d = N.diferencias(snap, N.aFilas(db));
  assert.deepStrictEqual(Object.keys(d).sort(), ['estudiantes', 'notas', 'pagos']);
  assert.deepStrictEqual(d.notas.subir.map((f) => f.id), [k]);
  assert.deepStrictEqual(d.estudiantes.subir.map((f) => f.id), ['eNUEVO']);
  assert.strictEqual(d.estudiantes.subir[0].grupo_id, 'g1');
  assert.deepStrictEqual(d.pagos, { subir: [], borrar: [pid] });
});
test('un día de asistencia corregido sube solo los estudiantes que cambiaron', () => {
  const db = db0(), snap = N.instantanea(N.aFilas(db));
  const k = Object.keys(db.asistencia)[0], eid = Object.keys(db.asistencia[k])[0];
  db.asistencia[k] = { ...db.asistencia[k], [eid]: db.asistencia[k][eid] === 'A' ? 'P' : 'A' };
  const d = N.diferencias(snap, N.aFilas(db));
  assert.deepStrictEqual(d.asistencia.subir.map((f) => f.id), [`${k}|${eid}`]);
});
test('base vacía de Supabase da colecciones vacías y sin ajustes', () => {
  const back = N.deFilas({});
  assert.strictEqual(back.settings, null);
  assert.deepStrictEqual(back.estudiantes, []);
  assert.deepStrictEqual(back.notas, {});
});
console.log(`\n${n} pruebas OK`);
