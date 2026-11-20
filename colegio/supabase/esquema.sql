-- =====================================================================
--  SGE · Esquema y permisos para Supabase
--  Pega TODO este archivo en Supabase → SQL Editor → "Run".
--  Se puede volver a ejecutar sin perder datos (usa IF NOT EXISTS y
--  recrea solo funciones y políticas).
--
--  Al final hay UNA línea que debes editar con tu correo de administración.
-- =====================================================================

-- ---------- Tablas ----------------------------------------------------
-- Cada tabla guarda el registro completo en `data` (jsonb) y, aparte, las
-- columnas que necesitan las reglas de acceso (grupo, estudiante, docente…).
-- La app toma esas columnas como la verdad: no se pueden "esconder" cambios
-- en `data` para saltarse un permiso.

create table if not exists public.config (
  id   text primary key,              -- 'settings' | 'horario'
  data jsonb not null default '{}'::jsonb,
  actualizado timestamptz not null default now()
);

create table if not exists public.materias (
  id text primary key, data jsonb not null default '{}'::jsonb, actualizado timestamptz not null default now()
);

create table if not exists public.docentes (
  id text primary key, data jsonb not null default '{}'::jsonb, actualizado timestamptz not null default now()
);

create table if not exists public.grupos (
  id text primary key,
  director_id text,
  data jsonb not null default '{}'::jsonb, actualizado timestamptz not null default now()
);

create table if not exists public.asignaciones (
  id text primary key,
  grupo_id text not null,
  materia_id text not null,
  docente_id text,
  data jsonb not null default '{}'::jsonb, actualizado timestamptz not null default now()
);

create table if not exists public.acudientes (
  id text primary key, data jsonb not null default '{}'::jsonb, actualizado timestamptz not null default now()
);

create table if not exists public.estudiantes (
  id text primary key,
  grupo_id text,
  acudiente_id text,
  data jsonb not null default '{}'::jsonb, actualizado timestamptz not null default now()
);

create table if not exists public.notas (
  id text primary key,                -- '<estudiante>|<asignación>'
  estudiante_id text not null,
  asignacion_id text not null,
  data jsonb not null default '{}'::jsonb, -- { "1": {t,e,p}, "2": {...} }
  actualizado timestamptz not null default now()
);

create table if not exists public.asistencia (
  id text primary key,                -- '<grupo>|<fecha>|<estudiante>'
  grupo_id text not null,
  fecha text not null,                -- AAAA-MM-DD
  estudiante_id text not null,
  estado text not null check (estado in ('P','T','E','A')),
  actualizado timestamptz not null default now()
);

create table if not exists public.observaciones (
  id text primary key,                -- '<estudiante>|<periodo>'
  estudiante_id text not null,
  texto text not null,
  actualizado timestamptz not null default now()
);

create table if not exists public.pagos (
  id text primary key,
  estudiante_id text not null,
  data jsonb not null default '{}'::jsonb, actualizado timestamptz not null default now()
);

create table if not exists public.comunicados (
  id text primary key,
  audiencia text not null,            -- 'todos' | 'docentes' | 'acudientes' | 'grupo:<id>'
  autor_id uuid default auth.uid(),
  data jsonb not null default '{}'::jsonb, actualizado timestamptz not null default now()
);

create table if not exists public.eventos (
  id text primary key,
  grupo_id text,                      -- null = todo el colegio
  data jsonb not null default '{}'::jsonb, actualizado timestamptz not null default now()
);

-- Quién es quién. Solo se llena con la función reclamar_perfil().
create table if not exists public.perfiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  rol text not null check (rol in ('admin','docente','acudiente')),
  docente_id text,
  acudiente_id text,
  creado timestamptz not null default now()
);

-- Correos con permiso de administración (rectoría, secretaría).
create table if not exists public.administradores (
  email text primary key check (email = lower(email))
);

create index if not exists asignaciones_docente_idx on public.asignaciones (docente_id);
create index if not exists asignaciones_grupo_idx   on public.asignaciones (grupo_id);
create index if not exists estudiantes_grupo_idx    on public.estudiantes (grupo_id);
create index if not exists estudiantes_acudiente_idx on public.estudiantes (acudiente_id);
create index if not exists notas_estudiante_idx     on public.notas (estudiante_id);
create index if not exists notas_asignacion_idx     on public.notas (asignacion_id);
create index if not exists asistencia_grupo_idx     on public.asistencia (grupo_id);
create index if not exists asistencia_estudiante_idx on public.asistencia (estudiante_id);
create index if not exists pagos_estudiante_idx     on public.pagos (estudiante_id);
create index if not exists observaciones_est_idx    on public.observaciones (estudiante_id);

-- ---------- Funciones de apoyo para las reglas -----------------------
-- SECURITY DEFINER: leen perfiles/asignaciones sin quedar atrapadas en las
-- mismas reglas que están evaluando.

create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfiles where user_id = auth.uid() and rol = 'admin');
$$;

create or replace function public.mi_docente() returns text
language sql stable security definer set search_path = public as $$
  select docente_id from perfiles where user_id = auth.uid() and rol = 'docente';
$$;

create or replace function public.mi_acudiente() returns text
language sql stable security definer set search_path = public as $$
  select acudiente_id from perfiles where user_id = auth.uid() and rol = 'acudiente';
$$;

-- Grupos donde el docente dicta clase o es director.
create or replace function public.grupos_docente() returns setof text
language sql stable security definer set search_path = public as $$
  select grupo_id from asignaciones where docente_id = mi_docente()
  union
  select id from grupos where director_id = mi_docente();
$$;

-- Grupos de los hijos del acudiente.
create or replace function public.grupos_acudiente() returns setof text
language sql stable security definer set search_path = public as $$
  select grupo_id from estudiantes where acudiente_id = mi_acudiente() and grupo_id is not null;
$$;

create or replace function public.mis_grupos() returns setof text
language sql stable security definer set search_path = public as $$
  select * from grupos_docente() union select * from grupos_acudiente();
$$;

-- ¿Puede el usuario actual ver a este estudiante?
create or replace function public.ve_estudiante(eid text) returns boolean
language sql stable security definer set search_path = public as $$
  select es_admin()
      or exists (select 1 from estudiantes e where e.id = eid and e.acudiente_id = mi_acudiente())
      or exists (select 1 from estudiantes e where e.id = eid and e.grupo_id in (select grupos_docente()));
$$;

-- ¿Es este estudiante de un grupo del docente actual?
create or replace function public.docente_ve_estudiante(eid text) returns boolean
language sql stable security definer set search_path = public as $$
  select mi_docente() is not null
     and exists (select 1 from estudiantes e where e.id = eid and e.grupo_id in (select grupos_docente()));
$$;

-- ¿Puede el docente actual calificar esta asignación para este estudiante?
create or replace function public.docente_califica(eid text, aid text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from asignaciones a join estudiantes e on e.grupo_id = a.grupo_id
    where a.id = aid and e.id = eid and a.docente_id is not null and a.docente_id = mi_docente());
$$;

-- Vincula la cuenta que acaba de entrar con su rol, buscando su correo
-- (ya confirmado) en administradores, docentes y acudientes. Devuelve el perfil.
create or replace function public.reclamar_perfil() returns public.perfiles
language plpgsql security definer set search_path = public as $$
declare
  correo text;
  p perfiles;
  did text;
  aid text;
begin
  select * into p from perfiles where user_id = auth.uid();
  if found then return p; end if;

  select lower(email) into correo from auth.users
   where id = auth.uid() and email_confirmed_at is not null;
  if correo is null then return null; end if;

  if exists (select 1 from administradores where email = correo) then
    insert into perfiles (user_id, rol) values (auth.uid(), 'admin') returning * into p;
    return p;
  end if;

  select id into did from docentes
   where lower(data->>'email') = correo and coalesce(data->>'estado','Activo') <> 'Inactivo'
   order by id limit 1;
  if did is not null then
    insert into perfiles (user_id, rol, docente_id) values (auth.uid(), 'docente', did) returning * into p;
    return p;
  end if;

  select id into aid from acudientes where lower(data->>'email') = correo order by id limit 1;
  if aid is not null then
    insert into perfiles (user_id, rol, acudiente_id) values (auth.uid(), 'acudiente', aid) returning * into p;
    return p;
  end if;

  return null;
end;
$$;

revoke all on function public.reclamar_perfil() from public, anon;
grant execute on function public.reclamar_perfil() to authenticated;

-- ---------- Reglas de acceso (RLS) ------------------------------------
do $$
declare t text;
begin
  foreach t in array array['config','materias','docentes','grupos','asignaciones','acudientes','estudiantes',
                           'notas','asistencia','observaciones','pagos','comunicados','eventos','perfiles','administradores']
  loop
    execute format('alter table public.%I enable row level security', t);
    -- borra políticas anteriores para poder re-ejecutar este archivo
    execute (select coalesce(string_agg(format('drop policy if exists %I on public.%I;', policyname, t), ' '), 'select 1')
               from pg_policies where schemaname = 'public' and tablename = t);
  end loop;
end $$;

-- Nadie entra sin sesión: todas las políticas son "to authenticated".

-- Catálogos que todos necesitan para pintar pantallas (nombres de grupos,
-- materias, horario). Solo administración los cambia.
create policy leer on public.config       for select to authenticated using (true);
create policy leer on public.materias     for select to authenticated using (true);
create policy leer on public.grupos       for select to authenticated using (true);
create policy leer on public.asignaciones for select to authenticated using (true);
create policy admin on public.config       for all to authenticated using (es_admin()) with check (es_admin());
create policy admin on public.materias     for all to authenticated using (es_admin()) with check (es_admin());
create policy admin on public.grupos       for all to authenticated using (es_admin()) with check (es_admin());
create policy admin on public.asignaciones for all to authenticated using (es_admin()) with check (es_admin());

-- Docentes: los ve administración y el cuerpo docente; un acudiente solo
-- ve a los docentes que dan clase o dirigen los grupos de sus hijos.
create policy leer on public.docentes for select to authenticated using (
  es_admin() or mi_docente() is not null
  or id in (select docente_id from asignaciones where grupo_id in (select grupos_acudiente()))
  or id in (select director_id from grupos where id in (select grupos_acudiente())));
create policy admin on public.docentes for all to authenticated using (es_admin()) with check (es_admin());

-- Estudiantes: administración todos; docente los de sus grupos; acudiente sus hijos.
create policy leer on public.estudiantes for select to authenticated using (
  es_admin() or acudiente_id = mi_acudiente() or grupo_id in (select grupos_docente()));
create policy admin on public.estudiantes for all to authenticated using (es_admin()) with check (es_admin());

-- Acudientes: administración todos; docente los de sus estudiantes; cada acudiente a sí mismo.
create policy leer on public.acudientes for select to authenticated using (
  es_admin() or id = mi_acudiente()
  or id in (select acudiente_id from estudiantes where grupo_id in (select grupos_docente())));
create policy admin on public.acudientes for all to authenticated using (es_admin()) with check (es_admin());

-- Notas: se ven si se ve al estudiante; las escribe administración o el
-- docente de esa materia en ese grupo.
create policy leer on public.notas for select to authenticated using (ve_estudiante(estudiante_id));
create policy admin on public.notas for all to authenticated using (es_admin()) with check (es_admin());
create policy docente_inserta on public.notas for insert to authenticated with check (docente_califica(estudiante_id, asignacion_id));
create policy docente_edita on public.notas for update to authenticated
  using (docente_califica(estudiante_id, asignacion_id)) with check (docente_califica(estudiante_id, asignacion_id));
create policy docente_borra on public.notas for delete to authenticated using (docente_califica(estudiante_id, asignacion_id));

-- Asistencia: el acudiente solo ve los registros de sus hijos (no los de
-- los compañeros). La toma administración o un docente del grupo.
create policy leer on public.asistencia for select to authenticated using (
  es_admin() or grupo_id in (select grupos_docente())
  or estudiante_id in (select id from estudiantes where acudiente_id = mi_acudiente()));
create policy admin on public.asistencia for all to authenticated using (es_admin()) with check (es_admin());
create policy docente_toma on public.asistencia for insert to authenticated with check (
  grupo_id in (select grupos_docente()) and exists (select 1 from estudiantes e where e.id = estudiante_id and e.grupo_id = asistencia.grupo_id));
create policy docente_corrige on public.asistencia for update to authenticated
  using (grupo_id in (select grupos_docente()))
  with check (grupo_id in (select grupos_docente()) and exists (select 1 from estudiantes e where e.id = estudiante_id and e.grupo_id = asistencia.grupo_id));
create policy docente_borra on public.asistencia for delete to authenticated using (grupo_id in (select grupos_docente()));

-- Observaciones del boletín.
create policy leer on public.observaciones for select to authenticated using (ve_estudiante(estudiante_id));
create policy admin on public.observaciones for all to authenticated using (es_admin()) with check (es_admin());
create policy docente_escribe on public.observaciones for insert to authenticated with check (docente_ve_estudiante(estudiante_id));
create policy docente_edita on public.observaciones for update to authenticated
  using (docente_ve_estudiante(estudiante_id)) with check (docente_ve_estudiante(estudiante_id));
create policy docente_borra on public.observaciones for delete to authenticated using (docente_ve_estudiante(estudiante_id));

-- Pensiones: solo administración y el acudiente del estudiante. Los docentes no.
create policy leer on public.pagos for select to authenticated using (
  es_admin() or estudiante_id in (select id from estudiantes where acudiente_id = mi_acudiente()));
create policy admin on public.pagos for all to authenticated using (es_admin()) with check (es_admin());

-- Comunicados según audiencia. Un docente publica solo a sus grupos y
-- solo borra los suyos.
create policy leer on public.comunicados for select to authenticated using (
  es_admin() or audiencia = 'todos'
  or (audiencia = 'docentes' and mi_docente() is not null)
  or (audiencia = 'acudientes' and mi_acudiente() is not null)
  or (audiencia like 'grupo:%' and substr(audiencia, 7) in (select mis_grupos())));
create policy admin on public.comunicados for all to authenticated using (es_admin()) with check (es_admin());
create policy docente_publica on public.comunicados for insert to authenticated with check (
  autor_id = auth.uid() and audiencia like 'grupo:%' and substr(audiencia, 7) in (select grupos_docente()));
create policy docente_edita on public.comunicados for update to authenticated
  using (autor_id = auth.uid())
  with check (autor_id = auth.uid() and audiencia like 'grupo:%' and substr(audiencia, 7) in (select grupos_docente()));
create policy autor_borra on public.comunicados for delete to authenticated using (autor_id = auth.uid());

-- Calendario: eventos generales para todos; los de un grupo, para ese grupo.
create policy leer on public.eventos for select to authenticated using (
  grupo_id is null or es_admin() or grupo_id in (select mis_grupos()));
create policy admin on public.eventos for all to authenticated using (es_admin()) with check (es_admin());
create policy docente_agrega on public.eventos for insert to authenticated with check (grupo_id in (select grupos_docente()));

-- Perfiles: cada quien ve el suyo; administración ve todos. Nadie los
-- escribe directamente (solo reclamar_perfil()).
create policy leer on public.perfiles for select to authenticated using (user_id = auth.uid() or es_admin());
create policy admin_borra on public.perfiles for delete to authenticated using (es_admin());

-- Administradores: solo administración ve y edita la lista.
create policy admin on public.administradores for all to authenticated using (es_admin()) with check (es_admin());

-- ---------- Primer administrador --------------------------------------
-- ✏️  Cambia el correo por el tuyo (en minúsculas) y vuelve a ejecutar.
insert into public.administradores (email) values ('tu-correo@ejemplo.com') on conflict do nothing;
