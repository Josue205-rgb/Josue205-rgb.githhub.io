/* Prueba de permisos (RLS) contra un PostgreSQL local que imita a Supabase.
   Necesita `psql` y una base vacía. Ejemplo:
     SGE_PG="postgresql://postgres@localhost:5432/sge_prueba" node colegio/tests/rls.test.js
   Crea un esquema `auth` mínimo, aplica supabase/esquema.sql, carga los datos de demostración y
   comprueba qué ve y qué puede escribir cada rol. NO lo ejecutes contra tu proyecto real. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const N = require('../js/nube.js');
const S = require('../js/seed.js');

const PG = process.env.SGE_PG;
if (!PG) { console.log('Omitida: define SGE_PG con una base PostgreSQL vacía de prueba.'); process.exit(0); }

const psql = (sql, extra = []) => execFileSync('psql', [PG, '-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', ...extra], { input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
const lit = (v) => (v == null ? 'null' : "'" + String(typeof v === 'object' ? JSON.stringify(v) : v).replace(/'/g, "''") + "'");

/* ---------- preparar ---------- */
psql(`drop schema if exists public cascade; create schema public; drop schema if exists auth cascade;
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
create schema auth;
create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql stable as $f$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $f$;
grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;`);
psql(fs.readFileSync(path.join(__dirname, '../supabase/esquema.sql'), 'utf8'));

const db = S.generate('2026-09-15');
db.observaciones = { [db.estudiantes[0].id + '|3']: 'Observación de prueba' };
const filas = N.aFilas(db);
let carga = 'begin;\n';
for (const [t, rows] of Object.entries(filas)) {
  if (!rows.length) continue;
  const cols = Object.keys(rows[0]);
  for (let i = 0; i < rows.length; i += 500) {
    carga += `insert into public.${t} (${cols.join(',')}) values\n` + rows.slice(i, i + 500).map((r) => '(' + cols.map((c) => lit(r[c]) + (c === 'data' ? '::jsonb' : '')).join(',') + ')').join(',\n') + ';\n';
  }
}
psql(carga + 'commit;');

/* ---------- personas de prueba ---------- */
const doc = db.docentes[0];                                   // dicta en varios grupos
const gDoc = new Set([...db.asignaciones.filter((a) => a.docenteId === doc.id).map((a) => a.grupoId), ...db.grupos.filter((g) => g.directorId === doc.id).map((g) => g.id)]);
const acu = db.acudientes.find((a) => db.estudiantes.filter((e) => e.acudienteId === a.id).length >= 1);
const hijos = db.estudiantes.filter((e) => e.acudienteId === acu.id);
const ajeno = db.estudiantes.find((e) => e.acudienteId !== acu.id && !gDoc.has(e.grupoId));
const U = {
  admin: ['00000000-0000-0000-0000-00000000000a', 'rectoria@colegio.test', true],
  docente: ['00000000-0000-0000-0000-00000000000d', doc.email.toUpperCase(), true],
  acudiente: ['00000000-0000-0000-0000-0000000000ac', acu.email, true],
  extrano: ['00000000-0000-0000-0000-0000000000ee', 'nadie@correo.test', true],
  sinConfirmar: ['00000000-0000-0000-0000-0000000000cc', db.docentes[1].email, false],
};
psql(`insert into public.administradores values ('rectoria@colegio.test');
insert into auth.users values ${Object.values(U).map(([id, em, ok]) => `('${id}', ${lit(em)}, ${ok ? 'now()' : 'null'})`).join(',')};`);

/** Ejecuta SQL como la cuenta indicada (rol authenticated, con su uid). */
function como(quien, sql) {
  return psql(`set role authenticated; select set_config('request.jwt.claim.sub', '${U[quien][0]}', false);\n${sql}`).split('\n').slice(1).join('\n');
}
function falla(quien, sql) {
  try { como(quien, sql); } catch (e) { return String(e.stderr || e.message); }
  return null;
}
const cuenta = (quien, t, where = 'true') => +como(quien, `select count(*) from public.${t} where ${where};`);

let n = 0;
function test(name, fn) { fn(); n++; console.log('  ok  ' + name); }

/* ---------- vinculación de cuentas ---------- */
test('cada cuenta se vincula por su correo confirmado', () => {
  assert.strictEqual(como('admin', 'select rol from reclamar_perfil();'), 'admin');
  assert.strictEqual(como('docente', 'select rol || \':\' || docente_id from reclamar_perfil();'), 'docente:' + doc.id);
  assert.strictEqual(como('acudiente', 'select rol || \':\' || acudiente_id from reclamar_perfil();'), 'acudiente:' + acu.id);
  assert.strictEqual(como('extrano', 'select coalesce(rol, \'-\') from reclamar_perfil();'), '-');
  assert.strictEqual(como('sinConfirmar', 'select coalesce(rol, \'-\') from reclamar_perfil();'), '-');
});
test('nadie puede crearse un perfil a mano', () => {
  assert.ok(/row-level security/.test(falla('extrano', `insert into public.perfiles (user_id, rol) values ('${U.extrano[0]}', 'admin');`)));
});
test('sin sesión (anon) no se ve nada', () => {
  assert.strictEqual(psql('set role anon; select count(*) from public.estudiantes;'), '0');
  assert.strictEqual(psql('set role anon; select count(*) from public.config;'), '0');
});
test('una cuenta sin vincular no ve datos de nadie', () => {
  ['estudiantes', 'notas', 'asistencia', 'pagos', 'acudientes', 'docentes'].forEach((t) => assert.strictEqual(cuenta('extrano', t), 0, t));
});

/* ---------- lectura ---------- */
test('administración ve todo', () => {
  assert.strictEqual(cuenta('admin', 'estudiantes'), db.estudiantes.length);
  assert.strictEqual(cuenta('admin', 'pagos'), db.pagos.length);
  assert.strictEqual(cuenta('admin', 'asistencia'), filas.asistencia.length);
});
test('el docente ve solo los estudiantes de sus grupos y no ve pensiones', () => {
  const esperados = db.estudiantes.filter((e) => gDoc.has(e.grupoId)).length;
  assert.ok(esperados > 0 && esperados < db.estudiantes.length);
  assert.strictEqual(cuenta('docente', 'estudiantes'), esperados);
  assert.strictEqual(cuenta('docente', 'pagos'), 0);
  assert.strictEqual(cuenta('docente', 'estudiantes', `id = '${ajeno.id}'`), 0);
  assert.strictEqual(cuenta('docente', 'notas', `estudiante_id = '${ajeno.id}'`), 0);
});
test('el acudiente ve solo a sus hijos, sus notas, su asistencia y sus pagos', () => {
  const ids = hijos.map((e) => `'${e.id}'`).join(',');
  assert.strictEqual(cuenta('acudiente', 'estudiantes'), hijos.length);
  assert.strictEqual(cuenta('acudiente', 'estudiantes', `id not in (${ids})`), 0);
  assert.strictEqual(cuenta('acudiente', 'notas', `estudiante_id not in (${ids})`), 0);
  assert.strictEqual(cuenta('acudiente', 'asistencia', `estudiante_id not in (${ids})`), 0);
  assert.strictEqual(cuenta('acudiente', 'pagos'), db.pagos.filter((p) => hijos.some((h) => h.id === p.estudianteId)).length);
  assert.strictEqual(cuenta('acudiente', 'acudientes'), 1);
});
test('comunicados y eventos llegan según la audiencia', () => {
  assert.strictEqual(cuenta('docente', 'comunicados', `audiencia = 'acudientes'`), 0);
  assert.strictEqual(cuenta('acudiente', 'comunicados', `audiencia = 'docentes'`), 0);
  const gHijos = new Set(hijos.map((e) => e.grupoId));
  const grupoAjeno = db.grupos.find((g) => !gHijos.has(g.id));
  assert.strictEqual(cuenta('acudiente', 'eventos', `grupo_id = '${grupoAjeno.id}'`), 0);
});

/* ---------- escritura ---------- */
const asigPropia = db.asignaciones.find((a) => a.docenteId === doc.id);
const asigAjena = db.asignaciones.find((a) => a.docenteId !== doc.id && a.grupoId === asigPropia.grupoId);
const estDelGrupo = db.estudiantes.find((e) => e.grupoId === asigPropia.grupoId && e.estado === 'Activo');
test('el docente califica su materia, pero no la de otro docente', () => {
  como('docente', `insert into public.notas (id, estudiante_id, asignacion_id, data) values ('${estDelGrupo.id}|${asigPropia.id}', '${estDelGrupo.id}', '${asigPropia.id}', '{"1":{"t":5,"e":5,"p":5}}')
    on conflict (id) do update set data = excluded.data;`);
  assert.strictEqual(psql(`select data->'1'->>'t' from public.notas where id = '${estDelGrupo.id}|${asigPropia.id}';`), '5');
  const r = como('docente', `update public.notas set data = '{}' where id = '${estDelGrupo.id}|${asigAjena.id}' returning id;`);
  assert.strictEqual(r, '', 'no debió poder editar la nota de otra materia');
  assert.ok(/row-level security/.test(falla('docente', `insert into public.notas (id, estudiante_id, asignacion_id, data) values ('x|${asigAjena.id}', '${estDelGrupo.id}', '${asigAjena.id}', '{}');`)));
});
test('el docente toma asistencia en su grupo, pero no en otro', () => {
  como('docente', `insert into public.asistencia (id, grupo_id, fecha, estudiante_id, estado) values ('${estDelGrupo.grupoId}|2026-09-14|${estDelGrupo.id}', '${estDelGrupo.grupoId}', '2026-09-14', '${estDelGrupo.id}', 'T')
    on conflict (id) do update set estado = excluded.estado;`);
  assert.ok(/row-level security/.test(falla('docente', `insert into public.asistencia (id, grupo_id, fecha, estudiante_id, estado) values ('z', '${ajeno.grupoId}', '2026-09-14', '${ajeno.id}', 'A');`)));
  // ni colando a un estudiante ajeno en su propio grupo
  assert.ok(/row-level security/.test(falla('docente', `insert into public.asistencia (id, grupo_id, fecha, estudiante_id, estado) values ('z2', '${estDelGrupo.grupoId}', '2026-09-14', '${ajeno.id}', 'A');`)));
});
test('el docente no puede editar estudiantes, pagos ni ajustes', () => {
  assert.strictEqual(como('docente', `update public.estudiantes set data = '{}' where id = '${estDelGrupo.id}' returning id;`), '');
  assert.strictEqual(como('docente', `update public.config set data = '{}' where id = 'settings' returning id;`), '');
  assert.ok(/row-level security/.test(falla('docente', `insert into public.pagos (id, estudiante_id, data) values ('px', '${estDelGrupo.id}', '{}');`)));
});
test('el docente publica comunicados solo a sus grupos y borra solo los suyos', () => {
  const g = [...gDoc][0];
  como('docente', `insert into public.comunicados (id, audiencia, data) values ('cdoc', 'grupo:${g}', '{"titulo":"x"}');`);
  assert.ok(/row-level security/.test(falla('docente', `insert into public.comunicados (id, audiencia, data) values ('cdoc2', 'todos', '{}');`)));
  assert.strictEqual(como('docente', `delete from public.comunicados where id = '${db.comunicados[0].id}' returning id;`), '');
  assert.strictEqual(como('docente', `delete from public.comunicados where id = 'cdoc' returning id;`), 'cdoc');
});
test('la app guarda con upsert: también funciona para lo que un docente crea', () => {
  const g = [...gDoc][0];
  como('docente', `insert into public.eventos (id, grupo_id, data) values ('vdoc', '${g}', '{"titulo":"x"}') on conflict (id) do update set data = excluded.data;`);
  como('docente', `insert into public.comunicados (id, audiencia, data) values ('cdoc3', 'grupo:${g}', '{}') on conflict (id) do update set data = excluded.data;`);
  como('docente', `insert into public.observaciones (id, estudiante_id, texto) values ('${estDelGrupo.id}|1', '${estDelGrupo.id}', 'Bien') on conflict (id) do update set texto = excluded.texto;`);
  assert.strictEqual(psql(`select count(*) from public.eventos where id = 'vdoc';`), '1');
  assert.ok(/row-level security/.test(falla('docente', `insert into public.eventos (id, grupo_id, data) values ('vdoc2', null, '{}') on conflict (id) do update set data = excluded.data;`)));
});
test('el acudiente no puede escribir nada', () => {
  const hijo = hijos[0], asig = db.asignaciones.find((a) => a.grupoId === hijo.grupoId);
  assert.ok(/row-level security/.test(falla('acudiente', `insert into public.notas (id, estudiante_id, asignacion_id, data) values ('n', '${hijo.id}', '${asig.id}', '{}');`)));
  assert.ok(/row-level security/.test(falla('acudiente', `insert into public.asistencia (id, grupo_id, fecha, estudiante_id, estado) values ('a', '${hijo.grupoId}', '2026-09-14', '${hijo.id}', 'P');`)));
  assert.strictEqual(como('acudiente', `update public.pagos set data = '{}' returning id;`), '');
  assert.strictEqual(como('acudiente', `update public.estudiantes set grupo_id = 'g1' returning id;`), '');
  assert.ok(/row-level security/.test(falla('acudiente', `insert into public.comunicados (id, audiencia, data) values ('ca', 'todos', '{}');`)));
});
test('administración puede escribir', () => {
  assert.strictEqual(como('admin', `update public.config set data = data || '{"lema":"ok"}' where id = 'settings' returning id;`), 'settings');
});
console.log(`\n${n} pruebas de permisos OK`);
