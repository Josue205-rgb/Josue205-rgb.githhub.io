/* Sesión y permisos de DEMOSTRACIÓN.
   Importante: todo corre en el navegador, así que estos permisos solo controlan qué muestra la interfaz.
   No son seguridad real; un sistema en producción necesita servidor, contraseñas y autorización en el backend. */
(function () {
  'use strict';
  const SGE = (window.SGE = window.SGE || {});
  const KEY = 'sge.session';
  let ses = null;

  const auth = {
    cargar() { try { ses = JSON.parse(localStorage.getItem(KEY)); } catch (e) { ses = null; } return ses; },
    entrar(rol, userId) { ses = { rol, userId: userId || null }; try { localStorage.setItem(KEY, JSON.stringify(ses)); } catch (e) { /* noop */ } },
    salir() { ses = null; try { localStorage.removeItem(KEY); } catch (e) { /* noop */ } },
    get activa() { return ses; },

    /** Contexto del usuario actual (se recalcula cada vez: los datos pueden cambiar). */
    me() {
      const db = SGE.store.db;
      if (!ses) return null;
      if (ses.rol === 'docente') {
        const d = db.docentes.find((x) => x.id === ses.userId);
        if (!d) return null;
        const asigs = db.asignaciones.filter((a) => a.docenteId === d.id);
        const gids = new Set(asigs.map((a) => a.grupoId));
        db.grupos.filter((g) => g.directorId === d.id).forEach((g) => gids.add(g.id));
        const mat = db.materias.find((m) => m.id === d.materiaId);
        return { rol: 'docente', user: d, nombre: d.nombre, sub: 'Docente · ' + (mat ? mat.nombre : ''), asigs, grupoIds: db.grupos.filter((g) => gids.has(g.id)).map((g) => g.id) };
      }
      if (ses.rol === 'acudiente') {
        const a = db.acudientes.find((x) => x.id === ses.userId);
        if (!a) return null;
        const hijos = db.estudiantes.filter((e) => e.acudienteId === a.id && e.estado !== 'Retirado');
        return { rol: 'acudiente', user: a, nombre: a.nombre, sub: a.parentesco + ' · ' + hijos.length + (hijos.length === 1 ? ' hijo' : ' hijos'), hijos, grupoIds: [...new Set(hijos.map((h) => h.grupoId))] };
      }
      return { rol: 'admin', user: null, nombre: 'Administración', sub: db.settings.rector || 'Rectoría', grupoIds: db.grupos.map((g) => g.id) };
    },
    /** Grupos que el usuario puede ver. */
    grupos() { const m = auth.me(); return SGE.store.db.grupos.filter((g) => m.grupoIds.includes(g.id)); },
    /** Estudiantes que el usuario puede ver (admin: todos; docente: sus grupos; acudiente: sus hijos). */
    estudiantes() {
      const m = auth.me(), db = SGE.store.db;
      if (m.rol === 'admin') return db.estudiantes;
      if (m.rol === 'acudiente') return m.hijos;
      return db.estudiantes.filter((e) => m.grupoIds.includes(e.grupoId));
    },
    puedeVerFicha(e) { return auth.estudiantes().some((x) => x.id === e.id); },
    esAdmin() { return ses && ses.rol === 'admin'; },
  };
  /* Consultas de apoyo compartidas por las vistas. */
  const D = () => SGE.store.db;
  const q = {
    grupo: (id) => D().grupos.find((g) => g.id === id),
    gn: (id) => (q.grupo(id) || { nombre: '—' }).nombre,
    materia: (id) => D().materias.find((m) => m.id === id),
    docente: (id) => D().docentes.find((d) => d.id === id),
    est: (id) => D().estudiantes.find((e) => e.id === id),
    acu: (id) => D().acudientes.find((a) => a.id === id),
    asig: (id) => D().asignaciones.find((a) => a.id === id),
    primerNombre: (n) => String(n).split(' ')[0],
    comunicadosVisibles(me) {
      const ok = (c) => {
        if (me.rol === 'admin' || c.audiencia === 'todos') return true;
        if (c.audiencia === 'docentes') return me.rol === 'docente';
        if (c.audiencia === 'acudientes') return me.rol === 'acudiente';
        if (c.audiencia.startsWith('grupo:')) return me.grupoIds.includes(c.audiencia.slice(6));
        return false;
      };
      return D().comunicados.filter(ok).sort((a, b) => (b.fijado - a.fijado) || b.fecha.localeCompare(a.fecha));
    },
    eventosVisibles(me) { return D().eventos.filter((e) => !e.grupoId || me.rol === 'admin' || me.grupoIds.includes(e.grupoId)).sort((a, b) => a.fecha.localeCompare(b.fecha)); },
    /** Docentes que dictan clase al grupo (para saber quién puede tomar asistencia). */
    clasesDe(docenteId, grupoId) { return D().asignaciones.filter((a) => a.docenteId === docenteId && (!grupoId || a.grupoId === grupoId)); },
  };
  SGE.q = q;
  SGE.auth = auth;
  SGE.views = SGE.views || {};
})();
