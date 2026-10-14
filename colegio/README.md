# Sistema de gestión escolar (SGE)

Aplicación web completa para un colegio. Sin servidor ni instalación: abre `index.html`
(o publícala con GitHub Pages en `/colegio/`). Los datos viven en el navegador (`localStorage`).

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

## Roles (demostración)
Administración, Docente (solo sus grupos) y Acudiente (solo sus hijos). **Los permisos solo controlan la
interfaz**: al correr todo en el navegador no son seguridad real. Para datos reales de menores hace falta un
backend con autenticación y autorización en el servidor.

## Reglas de negocio por defecto (editables en Ajustes)
Escala 1,0–5,0 · aprobado desde 3,0 · 4 periodos · tareas 30 % / exámenes 50 % / participación 20 % ·
desempeño Superior ≥ 4,6, Alto ≥ 4,0, Básico ≥ 3,0, Bajo < 3,0 · asistencia = (presentes + tardanzas) /
(presentes + tardanzas + ausencias), las excusas no penalizan · pensión vence el día 10, mora configurable.

## Estructura
```
index.html  css/app.css
js/logic.js    reglas puras (notas, riesgo, horarios, cartera)   ← con pruebas
js/seed.js     datos de demostración deterministas
js/store.js    persistencia   js/auth.js  sesión y permisos   js/ui.js  componentes y gráficos SVG
js/views/*.js  una vista por módulo   js/app.js  enrutador, navegación, paleta
tests/logic.test.js
```

## Pruebas
`node colegio/tests/logic.test.js` (desde la raíz del repositorio)
