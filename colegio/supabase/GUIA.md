# Conectar el SGE a Supabase (cuentas reales y permisos)

Con esto cada persona entra con su correo y contraseña, y la base de datos solo le entrega lo que le
corresponde:

| Rol | Ve | Puede cambiar |
|---|---|---|
| Administración | Todo | Todo |
| Docente | Sus grupos (donde dicta o es director): estudiantes, acudientes, notas, asistencia, horario. **No ve pensiones.** | Notas de sus materias, asistencia y observaciones de sus grupos, comunicados y eventos para sus grupos |
| Acudiente | Solo a sus hijos: notas, asistencia, boletín, horario y sus pagos | Nada |

Las reglas están en [`esquema.sql`](esquema.sql) y se cumplen en el servidor: aunque alguien manipule la
página, no puede leer ni escribir lo que no le toca.

Tiempo estimado: 15 minutos.

## 1. Crear el proyecto

1. Entra a <https://supabase.com>, crea una cuenta gratis y pulsa **New project**.
2. Nombre: por ejemplo `sge-champagnat`. Región: **South America (São Paulo)**, la más cercana a Colombia.
3. Supabase te pide una contraseña para la base de datos. Guárdala tú en un lugar seguro.
   **No se la pases a nadie**, tampoco a Claude: el sistema no la necesita.

## 2. Crear las tablas y los permisos

1. Abre [`esquema.sql`](esquema.sql) y, en la **última línea**, cambia `tu-correo@ejemplo.com` por el correo
   con el que vas a administrar el sistema (en minúsculas).
2. En Supabase ve a **SQL Editor → New query**, pega todo el archivo y pulsa **Run**.
   Debe terminar con "Success". Puedes volver a ejecutarlo cuando quieras: no borra datos.

Para agregar otra persona de administración más adelante, ejecuta en el SQL Editor:

```sql
insert into public.administradores (email) values ('otra-persona@colegio.edu.co');
```

## 3. Cerrar el registro abierto

En **Authentication → Sign In / Providers → Email**:

- Deja **Email** activado y **Confirm email** activado.
- **Desactiva "Allow new users to sign up"**. Así solo existen las cuentas que tú crees.

## 4. Decirle a Supabase dónde vive la página

En **Authentication → URL Configuration**:

- **Site URL:** `https://josue205-rgb.github.io/Josue205-rgb.githhub.io/colegio/`
- **Redirect URLs:** agrega esa misma dirección.

Así los enlaces de invitación y de "Olvidé mi contraseña" llevan de vuelta al sistema.

## 5. Conectar la página

En **Project Settings → API Keys** (o **Data API**) copia:

- **Project URL** (algo como `https://abcdefghijkl.supabase.co`)
- La clave **publishable** (`sb_publishable_…`) o, si tu proyecto muestra claves antiguas, la **anon public** (`eyJ…`).

Pégalas en [`../js/config.js`](../js/config.js). Estas dos claves son públicas: viajan dentro de la página
y por sí solas no dan acceso a nada sin una cuenta.
**Nunca uses la clave `service_role` / `secret`**: esa salta todos los permisos.

## 6. Crear tu cuenta de administración

1. **Authentication → Users → Add user → Create new user.**
2. Correo: el mismo del paso 2. Pon una contraseña y marca **Auto Confirm User**.
3. Abre el sistema y entra. La primera vez se guardan las reglas académicas por defecto.

## 7. Cargar los datos

En **Ajustes** tienes tres caminos:

- **Cargar datos de ejemplo** para probar con estudiantes inventados (luego "Empezar desde cero" los borra).
- **Importar copia a la base de datos** si ya tenías datos en el modo demostración (descárgalos antes con
  "Descargar copia (JSON)" desde ese navegador).
- **Empezar desde cero** y crear grupos, docentes y estudiantes a mano.

## 8. Dar acceso a docentes y acudientes

Las cuentas se vinculan **por correo**: el correo de la cuenta debe ser exactamente el que está en la ficha
del docente (Docentes) o del acudiente (Estudiantes → ficha → acudiente).

1. Revisa que el correo esté bien escrito en la ficha.
2. En Supabase: **Authentication → Users → Invite user** con ese correo. Le llega un enlace, lo abre y
   crea su contraseña.
   - Alternativa: **Add user** con una contraseña temporal y **Auto Confirm User**; se la entregas en persona
     y luego la cambia con "Olvidé mi contraseña".
3. La primera vez que entra, el sistema reconoce su correo y le asigna su rol.

Si alguien ve "Tu cuenta aún no está vinculada", el correo de su cuenta no coincide con ninguna ficha.

Para **quitar el acceso** a alguien: **Authentication → Users →** su cuenta **→ Delete user**.

> El correo integrado de Supabase envía pocos mensajes por hora. Para invitar a muchas familias a la vez,
> configura un SMTP propio en **Authentication → Emails → SMTP Settings**, o hazlo por tandas.

## Antes de usarlo con datos reales

- **Protección de datos (Ley 1581 de 2012):** se trata de datos de menores. El colegio debe tener la
  autorización de los padres para tratarlos y una política de tratamiento de datos.
- **Copias de seguridad:** descarga la copia JSON desde Ajustes con regularidad y revisa qué copias
  automáticas incluye tu plan de Supabase.
- **Plan gratuito:** Supabase pausa los proyectos gratuitos que pasan una semana sin uso; se reactivan desde
  el panel. Durante el año escolar el uso diario lo mantiene activo.
- Las sesiones quedan guardadas en el navegador hasta pulsar **Salir**: pide a los docentes que salgan en
  computadores compartidos.

## Comprobar los permisos (opcional, para quien programe)

`colegio/tests/rls.test.js` aplica `esquema.sql` a un PostgreSQL **local y vacío**, carga los datos de
demostración y verifica qué ve y qué puede escribir cada rol:

```sh
SGE_PG="postgresql://postgres@localhost:5432/sge_prueba" node colegio/tests/rls.test.js
```

No lo ejecutes contra el proyecto real: borra el esquema `public`.
