# Sistema de gestión escolar (SGE) — diseño

Fecha: 2026-10-14 · Ruta: `colegio/` dentro del sitio estático existente.

## Intención
Mostrar un sistema de gestión escolar completo, sin módulos omitidos, que se abra con un clic
(sin servidor, sin instalación) y sorprenda. Lo pidió el usuario con "no omitas nada, sorpréndeme";
eligió la entrega "web estática sin servidor" (aprobación delegada).

## Supuestos (explícitos)
- Colegio de básica secundaria/media, en español, escala 1.0–5.0, aprobado ≥ 3.0, 4 periodos.
- Roles: Administración, Docente, Acudiente. Acceso de **demostración** (sin contraseñas):
  la seguridad real exige backend; aquí los permisos solo controlan la interfaz.
- Datos en `localStorage`, con datos de demostración generados con semilla fija. Exportar/importar JSON y reinicio.

## Alcance (módulos)
Panel · Estudiantes/matrícula (+ ficha) · Docentes · Grupos y cargas académicas · Horarios
(generador automático sin choques + edición manual con detección de conflictos) · Asistencia ·
Calificaciones (3 componentes ponderados) · Boletín imprimible con observaciones automáticas ·
Pagos/pensiones (becas, mora, recibo) · Comunicados · Calendario · Ajustes (colegio, pesos, datos).
Transversales: roles, paleta de comandos Ctrl/⌘+K, modo oscuro, alertas de riesgo, cuadro de honor.

## Arquitectura
Scripts clásicos (funciona desde `file://`), espacio de nombres `SGE`:
- `js/logic.js` — lógica pura y testeable (notas, desempeño, riesgo, generador de horarios, pagos).
- `js/seed.js` — generador de datos de demostración (PRNG con semilla).
- `js/store.js` — persistencia y CRUD sobre colecciones.
- `js/ui.js` — helpers de DOM, modal, toast, tablas, formularios, gráficos SVG.
- `js/views/*.js` — una vista por módulo, cada una `SGE.views[nombre] = {render(el, ctx)}`.
- `js/app.js` — sesión, router por hash, navegación por rol, paleta de comandos.
- `tests/logic.test.js` — pruebas en Node de la lógica pura.

## Diseño visual
Pizarra verde (#1F3A34) en el menú, papel frío (#F3F5F4), tiza amarilla (#F2C94C), tinta azul (#2D5BFF).
Bricolage Grotesque + Instrument Sans. Gráficos SVG con leyenda, etiquetas directas y vista de tabla.

## Pruebas
Node para `logic.js`; navegador (Playwright) para recorrer cada vista y revisar errores de consola.
