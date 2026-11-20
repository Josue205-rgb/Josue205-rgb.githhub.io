# Sistema de gestión escolar (SGE)

Aplicación web completa para un colegio, publicada con GitHub Pages en `/colegio/`. Funciona de dos formas:

- **Con Supabase** (para uso real): cada persona entra con correo y contraseña, los datos viven en la base de
  datos del colegio y los permisos se aplican en el servidor. Configuración paso a paso en
  [`supabase/GUIA.md`](supabase/GUIA.md).
- **Modo demostración** (si `js/config.js` está vacío): se elige un rol sin contraseña y los datos viven solo
  en ese navegador (`localStorage`).

## Qué incluye
| Módulo | Qué hace |
|---|---|
| Panel | Indicadores, asistencia diaria, desempeño por grupo, recaudo, alertas de riesgo, cuadro de honor. Una versión distinta por rol. |
| Estudiantes | Matrícula, ficha con pestañas (resumen, notas, asistencia, pensiones, datos), retiro, exportar CSV. |
| Docentes | Alta/edición, carga académica y horario personal. |
| Grupos y materias | Director, cupo, quién enseña qué y cuántas horas. |
| Horarios | **Generador automático sin choques de docentes**, edición manual con detección de conflictos, vista por grupo o docente. |
| Asistencia | Lista rápida (P/T/E/A), resumen por grupo en mapa de calor. |
| Calificaciones | Planilla con 3 componentes ponderados, cálculo en vivo, consolidado con puestos. |
| Boletines | Informe imprimible/PDF con observaciones automáticas editables; imprime todo el grupo. |
| Pensiones | Cartera, becas, mora, registro de pagos y recibos imprimibles. |
| Comunicados · Calendario · Ajustes | Avisos por audiencia, calendario de eventos, reglas y copia de seguridad (JSON). |

Extras: paleta de comandos `Ctrl/⌘ + K`, modo oscuro, vista de tabla en cada gráfico, diseño para móvil.

## Roles
Administración (todo), Docente (solo sus grupos; no ve pensiones) y Acudiente (solo sus hijos, solo lectura).
Con Supabase estas reglas las impone la base de datos (RLS en `supabase/esquema.sql`). En el modo
demostración solo controlan la interfaz y no son seguridad real.

## Reglas de negocio por defecto (editables en Ajustes)
Escala 1,0–5,0 · aprobado desde 3,0 · 4 periodos · tareas 30 % / exámenes 50 % / participación 20 % ·
desempeño Superior ≥ 4,6, Alto ≥ 4,0, Básico ≥ 3,0, Bajo < 3,0 · asistencia = (presentes + tardanzas) /
(presentes + tardanzas + ausencias), las excusas no penalizan · pensión vence el día 10, mora configurable.

## Estructura
```
index.html  css/app.css
js/logic.js    reglas puras (notas, riesgo, horarios, cartera)   ← con pruebas
js/seed.js     datos de demostración deterministas
js/store.js    persistencia (localStorage o Supabase)   js/auth.js  sesión y permisos   js/ui.js  componentes y gráficos SVG
js/config.js   URL y clave pública de Supabase (vacío = demostración)
js/nube.js     carga lo permitido y guarda solo lo que cambió   js/vendor/  supabase-js 2.49.4 (MIT)
supabase/      esquema.sql (tablas + permisos) y GUIA.md
js/views/*.js  una vista por módulo   js/app.js  enrutador, navegación, paleta
tests/  logic, nube (conversión y cambios) y rls (permisos contra PostgreSQL)
```

## Pruebas
Desde la raíz del repositorio:
```
node colegio/tests/logic.test.js
node colegio/tests/nube.test.js
SGE_PG="postgresql://…/base_vacia_de_prueba" node colegio/tests/rls.test.js   # permisos por rol
```
