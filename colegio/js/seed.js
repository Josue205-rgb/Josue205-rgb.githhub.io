/* Generador de datos de demostración (determinista: misma fecha -> mismos datos). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./logic.js'));
  else { root.SGE = root.SGE || {}; root.SGE.seed = factory(root.SGE.logic); }
})(typeof self !== 'undefined' ? self : this, function (L) {
  'use strict';

  const NOM_F = ['Valentina', 'Sofía', 'Isabella', 'Mariana', 'Camila', 'Daniela', 'Luciana', 'Salomé', 'Gabriela', 'Juliana', 'Samantha', 'Antonella', 'Manuela', 'Laura', 'Paula', 'Emma', 'Mía', 'Sara', 'Nicole', 'Karol'];
  const NOM_M = ['Santiago', 'Mateo', 'Sebastián', 'Samuel', 'Juan David', 'Emmanuel', 'Nicolás', 'Daniel', 'Alejandro', 'Tomás', 'Felipe', 'Andrés', 'Gabriel', 'Miguel Ángel', 'Julián', 'Esteban', 'Simón', 'Thiago', 'Lucas', 'Diego'];
  const APE = ['García', 'Rodríguez', 'Martínez', 'López', 'González', 'Hernández', 'Pérez', 'Sánchez', 'Ramírez', 'Torres', 'Flórez', 'Díaz', 'Vargas', 'Castro', 'Moreno', 'Jiménez', 'Rojas', 'Ortiz', 'Gómez', 'Ruiz', 'Mendoza', 'Silva', 'Herrera', 'Medina', 'Aguirre', 'Cardona', 'Quintero', 'Zapata', 'Arango', 'Duque', 'Salazar', 'Parra', 'Ospina', 'Giraldo', 'Bedoya'];
  const MADRES = ['Martha', 'Claudia', 'Liliana', 'Patricia', 'Adriana', 'Ximena', 'Yolanda', 'Carolina', 'Lucía', 'Marcela', 'Beatriz', 'Diana'];
  const PADRES = ['Jhon Fredy', 'Carlos', 'Luis Fernando', 'Óscar', 'Wilson', 'Ricardo', 'Jairo', 'Mauricio', 'Edgar', 'Fabián', 'Gustavo', 'Rafael'];
  const BARRIOS = ['El Poblado', 'Laureles', 'Belén', 'Envigado', 'Robledo', 'Castilla', 'Sabaneta', 'La América', 'Buenos Aires', 'Itagüí'];
  const EPS = ['Sura', 'Sanitas', 'Nueva EPS', 'Compensar', 'Salud Total', 'Coosalud'];

  const MATERIAS = [
    { id: 'm1', nombre: 'Matemáticas', horas: 5, hue: 222 },
    { id: 'm2', nombre: 'Lengua Castellana', horas: 5, hue: 345 },
    { id: 'm3', nombre: 'Ciencias Naturales', horas: 5, hue: 150 },
    { id: 'm4', nombre: 'Ciencias Sociales', horas: 3, hue: 32 },
    { id: 'm5', nombre: 'Inglés', horas: 4, hue: 270 },
    { id: 'm6', nombre: 'Educación Física', horas: 2, hue: 8 },
    { id: 'm7', nombre: 'Artes', horas: 2, hue: 300 },
    { id: 'm8', nombre: 'Informática', horas: 2, hue: 190 },
    { id: 'm9', nombre: 'Ética y Valores', horas: 2, hue: 84 },
  ];
  const DOCENTES = [
    ['Carlos Andrés Ramírez', 'm1', 'Licenciado en Matemáticas'], ['Luz Marina Ortiz', 'm1', 'Magíster en Educación Matemática'],
    ['Sandra Patricia Gómez', 'm2', 'Licenciada en Lengua Castellana'], ['Jorge Iván Mejía', 'm2', 'Magíster en Literatura'],
    ['Diana Carolina Rojas', 'm3', 'Bióloga, especialista en docencia'], ['Hernán Darío Cárdenas', 'm3', 'Licenciado en Química y Biología'],
    ['Paola Andrea Vargas', 'm4', 'Historiadora, licenciada en Sociales'], ['Michael Anthony Torres', 'm5', 'Licenciado en Lenguas Extranjeras'],
    ['Natalia Ospina', 'm5', 'Licenciada en Inglés (C1)'], ['Andrés Felipe Suárez', 'm6', 'Licenciado en Educación Física'],
    ['Camila Restrepo', 'm7', 'Maestra en Artes Plásticas'], ['Julián David Peña', 'm8', 'Ingeniero de Sistemas'],
    ['Ana María Beltrán', 'm9', 'Psicóloga, licenciada en Filosofía'],
  ];
  const GRUPOS = [['6°A', 6], ['6°B', 6], ['7°A', 7], ['8°A', 8], ['9°A', 9], ['10°A', 10], ['11°A', 11]];

  const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');

  function generate(hoy) {
    hoy = hoy || L.isoHoy();
    const anio = +hoy.slice(0, 4);
    const mesActual = +hoy.slice(5, 7);
    const periodoActual = L.periodoDe(hoy);
    const rng = L.mulberry32(20260 + anio);
    const pick = (a) => a[Math.floor(rng() * a.length)];
    const norm = () => { let s = 0; for (let i = 0; i < 6; i++) s += rng(); return (s - 3) / 0.7; };
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const nota = (v) => L.round1(clamp(v, 1, 5));
    const phone = () => '3' + String(100000000 + Math.floor(rng() * 899999999));
    let nid = 0;
    const id = (p) => p + (++nid);

    const settings = {
      colegio: 'Colegio Nuevo Horizonte', lema: 'Aprender para transformar', anio,
      rector: 'Dra. Marta Lucía Caicedo', direccion: 'Cra. 45 # 32-18, Medellín', telefono: '604 555 0142', correo: 'secretaria@nuevohorizonte.edu.co',
      escalaMax: 5, aprobado: 3, pesos: { ...L.PESOS_DEFECTO }, pension: 380000, mora: 3, periodoManual: null,
    };

    const materias = MATERIAS.map((m) => ({ ...m }));
    const docentes = DOCENTES.map(([nombre, materiaId, titulo], i) => ({
      id: 'd' + (i + 1), nombre, materiaId, titulo, documento: String(70000000 + Math.floor(rng() * 29999999)),
      email: slug(nombre) + '@nuevohorizonte.edu.co', telefono: phone(), vinculacion: i % 4 === 3 ? 'Contrato' : 'Planta',
      ingreso: `${2008 + Math.floor(rng() * 16)}-0${1 + Math.floor(rng() * 9)}-15`, estado: 'Activo',
    }));
    const docPorMateria = {};
    docentes.forEach((d) => { (docPorMateria[d.materiaId] = docPorMateria[d.materiaId] || []).push(d); });

    const grupos = GRUPOS.map(([nombre, grado], i) => ({ id: 'g' + (i + 1), nombre, grado, salon: 'Aula ' + (101 + i), jornada: 'Mañana', cupo: 30, directorId: docentes[(i * 2) % docentes.length].id }));
    const asignaciones = [];
    grupos.forEach((g, gi) => {
      materias.forEach((m) => {
        const ds = docPorMateria[m.id];
        asignaciones.push({ id: id('a'), grupoId: g.id, materiaId: m.id, docenteId: ds[gi % ds.length].id, horas: m.horas });
      });
    });

    /* estudiantes y familias */
    const estudiantes = [], acudientes = [];
    const familias = {};
    grupos.forEach((g, gi) => {
      const n = 16 + Math.floor(rng() * 5);
      for (let k = 0; k < n; k++) {
        const fem = rng() < 0.5;
        let apellidos, ac;
        const reuse = Object.values(familias).filter((f) => f.grupos.indexOf(g.id) < 0 && f.n < 3);
        if (reuse.length && rng() < 0.1) {
          const f = pick(reuse); apellidos = f.apellidos; ac = f.ac; f.grupos.push(g.id); f.n++;
        } else {
          apellidos = pick(APE) + ' ' + pick(APE);
          const madre = rng() < 0.7;
          const nombreAc = (madre ? pick(MADRES) : pick(PADRES)) + ' ' + apellidos.split(' ')[0] + ' ' + apellidos.split(' ')[1];
          ac = { id: id('ac'), nombre: nombreAc, parentesco: madre ? 'Madre' : 'Padre', telefono: phone(), email: slug(nombreAc) + '@correo.com', ocupacion: pick(['Contadora', 'Comerciante', 'Ingeniero', 'Enfermera', 'Independiente', 'Docente', 'Administrador']) };
          acudientes.push(ac);
          familias[ac.id] = { apellidos, ac, grupos: [g.id], n: 1 };
        }
        const nombre = (fem ? pick(NOM_F) : pick(NOM_M)) + ' ' + apellidos;
        const edad = g.grado + 5 + (rng() < 0.25 ? 1 : 0);
        const nivel = rng() < 0.13 ? 2.7 + rng() * 0.8 : clamp(3.85 + norm() * 0.42, 3.0, 4.95);
        const r = rng();
        estudiantes.push({
          id: id('e'), codigo: `${anio}-${String(gi * 40 + k + 1).padStart(4, '0')}`, nombre, sexo: fem ? 'F' : 'M', grupoId: g.id,
          documento: String(1000000000 + Math.floor(rng() * 99999999)), nacimiento: `${anio - edad}-${String(1 + Math.floor(rng() * 12)).padStart(2, '0')}-${String(1 + Math.floor(rng() * 28)).padStart(2, '0')}`,
          acudienteId: ac.id, direccion: `${pick(BARRIOS)}, Cl ${10 + Math.floor(rng() * 90)} # ${10 + Math.floor(rng() * 80)}-${10 + Math.floor(rng() * 80)}`,
          telefono: phone(), eps: pick(EPS), salud: rng() < 0.12 ? pick(['Alergia a la penicilina', 'Asma leve', 'Usa lentes', 'Rinitis alérgica']) : '',
          beca: rng() < 0.12 ? pick([25, 50, 50, 100]) : 0, matricula: `${anio}-01-${String(10 + Math.floor(rng() * 15))}`,
          estado: r < 0.02 ? 'Retirado' : r < 0.035 ? 'Pre-matrícula' : 'Activo', _nivel: nivel,
        });
      }
    });

    /* notas: periodos anteriores completos; el actual, parcial */
    const notas = {};
    const activos = estudiantes.filter((e) => e.estado === 'Activo');
    activos.forEach((e) => {
      asignaciones.filter((a) => a.grupoId === e.grupoId).forEach((a) => {
        const base = e._nivel + norm() * 0.25;
        const per = {};
        for (let p = 1; p <= periodoActual; p++) {
          const completo = p < periodoActual;
          const dr = base + norm() * 0.12;
          per[p] = {
            t: completo || rng() < 0.92 ? nota(dr + norm() * 0.35) : null,
            e: completo || rng() < 0.5 ? nota(dr + norm() * 0.45) : null,
            p: completo || rng() < 0.6 ? nota(dr + 0.15 + norm() * 0.3) : null,
          };
        }
        notas[`${e.id}|${a.id}`] = per;
      });
    });

    /* asistencia: 40 días hábiles hasta el día hábil anterior a hoy */
    const asistencia = {};
    const ayer = L.addDias(hoy, -1);
    const dias = L.habilesAtras(ayer, 40);
    activos.forEach((e) => { e._presencia = e._nivel < 3 ? 0.74 + rng() * 0.1 : 0.93 + rng() * 0.06; });
    dias.forEach((fecha) => {
      grupos.forEach((g) => {
        const regs = {};
        activos.filter((e) => e.grupoId === g.id).forEach((e) => {
          const r = rng();
          regs[e.id] = r < e._presencia ? (rng() < 0.04 ? 'T' : 'P') : (rng() < 0.3 ? 'E' : 'A');
        });
        asistencia[`${g.id}|${fecha}`] = regs;
      });
    });

    /* horario */
    const gen = L.generarHorario(asignaciones, grupos.map((g) => g.id), { rng });
    const horario = gen.ok ? gen.slots : [];

    /* pagos */
    const pagos = [];
    let recibo = 1000;
    activos.concat(estudiantes.filter((e) => e.estado === 'Retirado')).forEach((e) => {
      if (e.beca >= 100) return;
      const q = rng() < 0.11 ? 0.45 : 0.94;
      for (let mes = 2; mes <= Math.min(mesActual, 11); mes++) {
        const actual = mes === mesActual;
        if (rng() < (actual ? Math.min(q, 0.6) : q)) {
          const dia = Math.min(1 + Math.floor(rng() * 11), actual ? +hoy.slice(8, 10) : 28);
          pagos.push({ id: id('p'), estudianteId: e.id, mes, monto: L.cuotaNeta(e, settings), fecha: `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`, metodo: pick(['Transferencia', 'PSE', 'Efectivo', 'Tarjeta', 'Transferencia']), recibo: 'R-' + (++recibo) });
        }
      }
    });

    /* comunicados y eventos */
    const comunicados = [
      { id: id('c'), titulo: 'Entrega de boletines del tercer periodo', cuerpo: 'Los boletines estarán disponibles en la plataforma. Los acudientes con compromisos académicos serán citados por el director de grupo.', fecha: L.addDias(hoy, -6), audiencia: 'todos', autor: 'Rectoría', fijado: true },
      { id: id('c'), titulo: 'Jornada de vacunación', cuerpo: 'Este jueves llegará la brigada de salud a la sede. Recuerden enviar el carné de vacunación en el cuaderno comunicador.', fecha: L.addDias(hoy, -3), audiencia: 'acudientes', autor: 'Coordinación', fijado: false },
      { id: id('c'), titulo: 'Reunión de área: ajuste de planes de aula', cuerpo: 'Se convoca a todos los docentes a la reunión de áreas en la sala de profesores. Traer los planes del cuarto periodo.', fecha: L.addDias(hoy, -2), audiencia: 'docentes', autor: 'Rectoría', fijado: false },
      { id: id('c'), titulo: 'Salida pedagógica: Parque Explora', cuerpo: 'Los grupos de grado 6° visitarán el Parque Explora. Se requiere autorización firmada y el uniforme de educación física.', fecha: L.addDias(hoy, -1), audiencia: 'grupo:g1', autor: 'Coordinación', fijado: false },
      { id: id('c'), titulo: 'Recordatorio de pensión', cuerpo: 'La pensión vence el día 10 de cada mes. Pasada esa fecha se aplica el recargo por mora definido en el manual de convivencia.', fecha: L.addDias(hoy, -9), audiencia: 'acudientes', autor: 'Tesorería', fijado: false },
    ];
    const eventos = [
      { id: id('v'), fecha: L.addDias(hoy, 2), titulo: 'Evaluación de periodo: Matemáticas', tipo: 'Evaluación', grupoId: '' },
      { id: id('v'), fecha: L.addDias(hoy, 3), titulo: 'Jornada de vacunación', tipo: 'Institucional', grupoId: '' },
      { id: id('v'), fecha: L.addDias(hoy, 5), titulo: 'Reunión general de padres', tipo: 'Reunión', grupoId: '' },
      { id: id('v'), fecha: L.addDias(hoy, 8), titulo: 'Salida pedagógica Parque Explora', tipo: 'Institucional', grupoId: 'g1' },
      { id: id('v'), fecha: L.addDias(hoy, 12), titulo: 'Feria de la ciencia', tipo: 'Académico', grupoId: '' },
      { id: id('v'), fecha: L.addDias(hoy, 16), titulo: 'Cierre de notas del periodo 4', tipo: 'Académico', grupoId: '' },
      { id: id('v'), fecha: L.addDias(hoy, -4), titulo: 'Día del idioma (inglés)', tipo: 'Institucional', grupoId: '' },
      { id: id('v'), fecha: `${anio}-${String(mesActual).padStart(2, '0')}-28`, titulo: 'Entrega de informes finales', tipo: 'Reunión', grupoId: '' },
      { id: id('v'), fecha: `${anio}-11-02`, titulo: 'Festivo: Todos los Santos', tipo: 'Festivo', grupoId: '' },
      { id: id('v'), fecha: `${anio}-11-16`, titulo: 'Festivo: Independencia de Cartagena', tipo: 'Festivo', grupoId: '' },
      { id: id('v'), fecha: `${anio}-11-27`, titulo: 'Clausura y graduación grado 11°', tipo: 'Institucional', grupoId: 'g7' },
    ];

    estudiantes.forEach((e) => { delete e._nivel; delete e._presencia; });
    return { meta: { v: 1, sembrado: hoy, demo: true }, settings, materias, docentes, grupos, asignaciones, estudiantes, acudientes, horario, notas, asistencia, pagos, comunicados, eventos, observaciones: {}, _nid: nid, _horarioOk: gen.ok };
  }

  return { generate };
});
