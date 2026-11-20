/* Arranque: inicio de sesión (demo por rol o cuenta real en Supabase), estructura, enrutador y paleta de comandos. */
(function () {
  'use strict';
  const SGE = window.SGE, { h, icon, clear } = SGE.ui, L = SGE.logic;

  const NAV = [
    { id: 'panel', label: 'Panel', alt: { acudiente: 'Mi familia' }, icon: 'panel', roles: ['admin', 'docente', 'acudiente'] },
    { id: 'estudiantes', label: 'Estudiantes', icon: 'estudiantes', roles: ['admin', 'docente'] },
    { id: 'docentes', label: 'Docentes', icon: 'docentes', roles: ['admin'] },
    { id: 'grupos', label: 'Grupos y materias', icon: 'grupos', roles: ['admin'] },
    { sep: true },
    { id: 'horarios', label: 'Horarios', icon: 'horarios', roles: ['admin', 'docente', 'acudiente'] },
    { id: 'asistencia', label: 'Asistencia', icon: 'asistencia', roles: ['admin', 'docente', 'acudiente'] },
    { id: 'notas', label: 'Calificaciones', icon: 'notas', roles: ['admin', 'docente'] },
    { id: 'boletin', label: 'Boletines', icon: 'boletin', roles: ['admin', 'docente', 'acudiente'] },
    { sep: true },
    { id: 'pagos', label: 'Pensiones', icon: 'pagos', roles: ['admin', 'acudiente'] },
    { id: 'comunicados', label: 'Comunicados', icon: 'comunicados', roles: ['admin', 'docente', 'acudiente'] },
    { id: 'calendario', label: 'Calendario', icon: 'calendario', roles: ['admin', 'docente', 'acudiente'] },
    { sep: true, roles: ['admin'] },
    { id: 'ajustes', label: 'Ajustes', icon: 'ajustes', roles: ['admin'] },
  ];
  const root = document.getElementById('root');
  let viewEl = null, navEl = null;

  const navPara = (rol) => NAV.filter((n) => n.sep ? (!n.roles || n.roles.includes(rol)) : n.roles.includes(rol));
  const labelDe = (n, rol) => (n.alt && n.alt[rol]) || n.label;

  /* ---------- tema ---------- */
  function setTema(t) { document.documentElement.dataset.theme = t; try { localStorage.setItem('sge.theme', t); } catch (e) { /* noop */ } }
  const alternarTema = () => setTema(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');

  /* ---------- login ---------- */
  function renderLogin() {
    const db = SGE.store.db;
    clear(root).appendChild(h('main', { class: 'login' }, h('div', { class: 'login-box' },
      h('div', { class: 'brand' }, h('div', { class: 'brand-mark' }, 'N'), h('div', {}, h('b', {}, db.settings.colegio), h('small', {}, db.settings.lema))),
      h('h1', {}, 'Todo el colegio, en una sola pizarra.'),
      h('p', { class: 'login-lead' }, 'Matrícula, horarios, asistencia, calificaciones, boletines y pensiones. Elige un rol para recorrer el sistema con datos de demostración.'),
      h('div', { class: 'roles' },
        rolCard('Administración', 'Rectoría y secretaría: ve y gestiona todo, genera horarios y controla la cartera.', null, () => entrar('admin')),
        rolCard('Docente', 'Toma asistencia y califica sus materias. Solo ve a sus grupos.', db.docentes.map((d) => ({ value: d.id, label: d.nombre })), (v) => entrar('docente', v)),
        rolCard('Acudiente', 'Consulta boletines, asistencia, horario y pensiones de sus hijos.', db.acudientes.filter((a) => db.estudiantes.some((e) => e.acudienteId === a.id && e.estado !== 'Retirado')).map((a) => ({ value: a.id, label: a.nombre + ' — ' + db.estudiantes.filter((e) => e.acudienteId === a.id).map((e) => e.nombre.split(' ')[0]).join(', ') })), (v) => entrar('acudiente', v))),
      h('p', { class: 'login-note' }, 'Modo demostración: sin contraseñas. Los datos viven solo en este navegador.'))));
  }
  function rolCard(titulo, texto, opciones, go) {
    let sel = null;
    if (opciones) sel = h('select', { 'aria-label': 'Elegir ' + titulo }, opciones.map((o) => h('option', { value: o.value }, o.label)));
    return h('section', { class: 'role' }, h('h2', {}, titulo), h('p', {}, texto), sel, h('button', { type: 'button', class: 'btn primary', onclick: () => go(sel ? sel.value : null) }, 'Entrar como ' + titulo.toLowerCase()));
  }
  function entrar(rol, id) { SGE.auth.entrar(rol, id); location.hash = '#/panel'; arrancar(); }

  /* ---------- login con Supabase ---------- */
  const CFG = window.SGE_CONFIG || {};
  // Enlaces de los correos de Supabase (invitación o recuperar contraseña): se leen antes de que la librería limpie la URL.
  const enlaceCorreo = (/type=(recovery|invite)/.exec(location.hash) || [])[1] || null;
  const MENSAJES = [
    [/invalid login credentials/i, 'Correo o contraseña incorrectos.'],
    [/email not confirmed/i, 'Tu correo aún no está confirmado. Revisa el mensaje que te llegó.'],
    [/password should be at least|weak password/i, 'La contraseña es muy corta: usa al menos 8 caracteres.'],
    [/rate limit|too many/i, 'Demasiados intentos. Espera un momento y vuelve a probar.'],
    [/failed to fetch|network/i, 'No hay conexión con el servidor. Revisa tu internet.'],
    [/row-level security|permission denied/i, 'No tienes permiso para ese cambio.'],
  ];
  const traducir = (m) => { m = String(m || ''); const t = MENSAJES.find(([re]) => re.test(m)); return t ? t[1] : m; };
  SGE.traducirError = traducir;

  function cajaLogin(titulo, lead, contenido) {
    const nombre = CFG.colegio || 'Sistema de gestión escolar';
    clear(root).appendChild(h('main', { class: 'login' }, h('div', { class: 'login-box login-narrow' },
      h('div', { class: 'brand' }, h('div', { class: 'brand-mark' }, nombre.replace(/^Colegio\s+/i, '')[0] || 'S'), h('div', {}, h('b', {}, nombre), h('small', {}, 'Sistema de gestión escolar'))),
      h('h1', {}, titulo), lead ? h('p', { class: 'login-lead' }, lead) : null, contenido)));
  }
  function campo(label, attrs) { const inp = h('input', attrs); return { inp, el: h('label', { class: 'login-field' }, h('span', {}, label), inp) }; }

  function renderLoginNube(aviso) {
    const email = campo('Correo', { type: 'email', autocomplete: 'username', required: true });
    const clave = campo('Contraseña', { type: 'password', autocomplete: 'current-password', required: true });
    const msg = h('p', { class: 'login-msg', role: 'alert' }, aviso || '');
    const enviar = h('button', { type: 'submit', class: 'btn primary' }, 'Entrar');
    const olvide = h('button', { type: 'button', class: 'login-link', onclick: async () => {
      const e = email.inp.value.trim();
      if (!e) { msg.textContent = 'Escribe tu correo y vuelve a tocar «Olvidé mi contraseña».'; email.inp.focus(); return; }
      const { error } = await SGE.nube.cliente.auth.resetPasswordForEmail(e, { redirectTo: location.origin + location.pathname });
      msg.textContent = error ? traducir(error.message) : 'Si ese correo tiene cuenta, te llegó un enlace para crear una contraseña nueva.';
    } }, 'Olvidé mi contraseña');
    const form = h('form', { class: 'role login-form', onsubmit: async (ev) => {
      ev.preventDefault(); msg.textContent = ''; enviar.disabled = true; enviar.textContent = 'Entrando…';
      const { error } = await SGE.nube.cliente.auth.signInWithPassword({ email: email.inp.value.trim(), password: clave.inp.value });
      enviar.disabled = false; enviar.textContent = 'Entrar';
      if (error) { msg.textContent = traducir(error.message); return; }
      location.hash = '#/panel'; arrancar();
    } }, email.el, clave.el, msg, enviar, olvide);
    cajaLogin('Bienvenido', 'Entra con el correo que registró el colegio. Cada persona ve solo lo que le corresponde: administración, sus grupos o sus hijos.', h('div', {}, form,
      h('p', { class: 'login-note' }, '¿No tienes cuenta? Pide a la secretaría del colegio que te invite con tu correo.')));
    email.inp.focus();
  }

  function renderNuevaClave(tipo) {
    const c1 = campo('Contraseña nueva', { type: 'password', autocomplete: 'new-password', minlength: 8, required: true });
    const c2 = campo('Repítela', { type: 'password', autocomplete: 'new-password', minlength: 8, required: true });
    const msg = h('p', { class: 'login-msg', role: 'alert' });
    const form = h('form', { class: 'role login-form', onsubmit: async (ev) => {
      ev.preventDefault();
      if (c1.inp.value.length < 8) { msg.textContent = 'Usa al menos 8 caracteres.'; return; }
      if (c1.inp.value !== c2.inp.value) { msg.textContent = 'Las dos contraseñas no coinciden.'; return; }
      const { error } = await SGE.nube.cliente.auth.updateUser({ password: c1.inp.value });
      if (error) { msg.textContent = traducir(error.message); return; }
      SGE.ui.toast('Contraseña guardada.'); location.hash = '#/panel'; arrancar();
    } }, c1.el, c2.el, msg, h('button', { type: 'submit', class: 'btn primary' }, 'Guardar contraseña'));
    cajaLogin(tipo === 'invite' ? 'Crea tu contraseña' : 'Contraseña nueva', 'La usarás junto con tu correo para entrar al sistema.', form);
    c1.inp.focus();
  }

  function renderMensaje(titulo, texto) {
    cajaLogin(titulo, texto, h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn primary', onclick: async () => { await SGE.auth.salir(); arrancar(); } }, 'Salir'),
      h('button', { type: 'button', class: 'btn ghost', onclick: () => location.reload() }, 'Reintentar')));
  }

  async function arrancarNube() {
    cajaLogin('Cargando…', 'Conectando con la base de datos del colegio.', null);
    const sb = SGE.nube.cliente;
    const { data: { session } } = await sb.auth.getSession();
    if (session && (enlaceCorreo || pedirClave)) { pedirClave = false; const t = enlaceCorreo; history.replaceState(null, '', location.pathname); return renderNuevaClave(t); }
    if (!session) return renderLoginNube();
    const { data: perfil, error } = await sb.rpc('reclamar_perfil');
    if (error) return renderMensaje('No se pudo abrir tu cuenta', traducir(error.message));
    if (!perfil || !perfil.rol) return renderMensaje('Tu cuenta aún no está vinculada', `Entraste como ${session.user.email}, pero ese correo no aparece como administración, docente ni acudiente. Pide a la secretaría que lo registre tal cual en tu ficha y vuelve a intentarlo.`);
    SGE.auth.desdePerfil({ ...perfil, email: session.user.email });
    try { await SGE.store.iniciarNube(perfil.rol === 'admin'); }
    catch (e) { return renderMensaje('No se pudieron cargar los datos', traducir(e.message)); }
    if (!SGE.auth.me()) return renderMensaje('Tu ficha ya no existe', 'Tu cuenta estaba vinculada a una ficha de docente o acudiente que fue eliminada. Pide a la secretaría que la revise.');
    if (!/^#\//.test(location.hash)) location.hash = '#/panel';
    renderShell();
    navegar();
  }
  let pedirClave = false;

  /* ---------- shell ---------- */
  function renderShell() {
    const me = SGE.auth.me(), db = SGE.store.db;
    navEl = h('nav', { class: 'nav', 'aria-label': 'Principal' }, navPara(me.rol).map((n) => n.sep ? h('div', { class: 'nav-sep' }) : h('a', { href: '#/' + n.id, 'data-id': n.id, onclick: () => document.body.classList.remove('nav-open') }, icon(n.icon), labelDe(n, me.rol))));
    viewEl = h('main', { id: 'view', tabindex: -1 });
    clear(root).appendChild(h('div', { id: 'app' },
      h('aside', { class: 'sidebar' },
        h('div', { class: 'brand' }, h('div', { class: 'brand-mark' }, 'N'), h('div', {}, h('b', {}, db.settings.colegio), h('small', {}, 'Año lectivo ' + db.settings.anio))),
        navEl,
        h('div', { class: 'side-foot' },
          h('div', { class: 'who' }, SGE.ui.avatar(me.nombre, 36), h('div', {}, h('b', {}, me.nombre), h('small', {}, me.sub))),
          h('div', { class: 'side-btns' },
            h('button', { type: 'button', 'aria-label': 'Cambiar tema', onclick: alternarTema }, icon('moon', 16), 'Tema'),
            h('button', { type: 'button', onclick: async () => { await SGE.auth.salir(); location.hash = ''; arrancar(); } }, icon('logout', 16), 'Salir')))),
      h('div', { class: 'main-col' },
        h('header', { class: 'topbar' },
          h('button', { type: 'button', class: 'icon-btn burger', 'aria-label': 'Abrir menú', onclick: () => document.body.classList.toggle('nav-open') }, icon('menu', 22)),
          h('div', { class: 'top-date' }, h('b', {}, (() => { const f = L.fechaLarga(L.isoHoy()); return f[0].toUpperCase() + f.slice(1); })()), ' · Periodo ', String(periodoActual())),
          h('button', { type: 'button', class: 'cmdk', onclick: abrirPaleta, 'aria-label': 'Buscar y saltar a…' }, icon('search', 16), h('span', {}, 'Buscar o saltar a…'), h('kbd', {}, /Mac/.test(navigator.platform) ? '⌘K' : 'Ctrl K'))),
        viewEl)));
  }
  const periodoActual = () => SGE.store.db.settings.periodoManual || L.periodoDe(L.isoHoy());
  SGE.periodoActual = periodoActual;

  /* ---------- enrutador ---------- */
  function ruta() {
    const m = (location.hash || '').replace(/^#\/?/, '').split('/');
    return { id: m[0] || 'panel', arg: m[1] ? decodeURIComponent(m[1]) : null };
  }
  function navegar() {
    if (!SGE.auth.activa || !viewEl) return;
    const me = SGE.auth.me();
    if (!me) { return Promise.resolve(SGE.auth.salir()).then(arrancar); }
    const r = ruta();
    const item = NAV.find((n) => n.id === r.id);
    if (!item || !item.roles.includes(me.rol) || !SGE.views[r.id]) { location.hash = '#/panel'; return; }
    navEl.querySelectorAll('a').forEach((a) => (a.dataset.id === r.id ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
    document.title = labelDe(item, me.rol) + ' · ' + SGE.store.db.settings.colegio;
    clear(viewEl);
    SGE.ui.tip.hide();
    try { SGE.views[r.id].render(viewEl, r.arg); }
    catch (e) { console.error(e); viewEl.appendChild(SGE.ui.empty('No se pudo mostrar esta pantalla', String(e.message || e), SGE.ui.btn('Volver al panel', 'primary', () => (location.hash = '#/panel')))); }
    window.scrollTo(0, 0);
  }
  SGE.go = (id, arg) => { const nuevo = '#/' + id + (arg ? '/' + encodeURIComponent(arg) : ''); if (location.hash === nuevo) navegar(); else location.hash = nuevo; };
  SGE.repintar = navegar;

  /* ---------- paleta de comandos ---------- */
  const norm = (t) => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  function itemsPaleta() {
    const me = SGE.auth.me(), db = SGE.store.db, out = [];
    navPara(me.rol).filter((n) => !n.sep).forEach((n) => out.push({ t: labelDe(n, me.rol), k: 'Ir a', ic: n.icon, run: () => SGE.go(n.id) }));
    out.push({ t: 'Cambiar tema claro/oscuro', k: 'Acción', ic: 'moon', run: alternarTema });
    if (me.rol === 'admin') {
      out.push({ t: 'Nueva matrícula', k: 'Acción', ic: 'plus', run: () => { SGE.go('estudiantes'); setTimeout(() => SGE.views.estudiantes.nuevo(), 50); } });
      out.push({ t: 'Generar horarios automáticamente', k: 'Acción', ic: 'wand', run: () => { SGE.go('horarios'); setTimeout(() => SGE.views.horarios.generar(), 50); } });
    }
    SGE.auth.estudiantes().forEach((e) => out.push({ t: e.nombre, k: 'Estudiante · ' + ((db.grupos.find((g) => g.id === e.grupoId) || {}).nombre || '—'), ic: 'user', run: () => SGE.views.estudiantes.ficha(e.id), q: e.codigo + ' ' + e.documento }));
    if (me.rol !== 'acudiente') db.docentes.forEach((d) => out.push({ t: d.nombre, k: 'Docente', ic: 'docentes', run: () => SGE.views.docentes.ficha(d.id) }));
    return out;
  }
  function abrirPaleta() {
    const items = itemsPaleta();
    let res = items.slice(0, 12), sel = 0;
    const list = h('ul', { role: 'listbox' });
    const inp = h('input', { type: 'text', placeholder: 'Escribe un nombre, código o pantalla…', 'aria-label': 'Buscar', autocomplete: 'off' });
    const m = SGE.ui.modal({ title: 'Buscar', size: 'sm', body: h('div', {}) });
    // Reemplaza el modal estándar por la paleta (reutiliza backdrop, foco y Escape)
    const back = m.el.parentNode; clear(back);
    const pal = h('div', { class: 'pal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Paleta de comandos' }, h('div', { class: 'pal-in' }, icon('search', 18), inp), list, h('div', { class: 'pal-foot' }, h('span', {}, '↑↓ moverse'), h('span', {}, '↵ abrir'), h('span', {}, 'Esc cerrar')));
    back.appendChild(pal);
    function pintar() {
      clear(list);
      if (!res.length) list.appendChild(h('li', { class: 'muted' }, 'Sin resultados'));
      res.forEach((it, i) => list.appendChild(h('li', { role: 'option', 'aria-selected': i === sel ? 'true' : 'false', onmousemove: () => { if (sel !== i) { sel = i; pintar(); } }, onclick: () => ir(it) }, icon(it.ic, 18), it.t, h('small', {}, it.k))));
      const on = list.querySelector('[aria-selected=true]'); if (on) on.scrollIntoView({ block: 'nearest' });
    }
    function ir(it) { m.close(); setTimeout(it.run, 30); }
    inp.addEventListener('input', () => {
      const toks = norm(inp.value).split(/\s+/).filter(Boolean);
      res = items.filter((it) => { const t = norm(it.t + ' ' + (it.q || '') + ' ' + it.k); return toks.every((x) => t.includes(x)); }).slice(0, 30);
      sel = 0; pintar();
    });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { sel = Math.min(res.length - 1, sel + 1); pintar(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); pintar(); e.preventDefault(); }
      else if (e.key === 'Enter') { e.preventDefault(); if (res[sel]) ir(res[sel]); }
    });
    pintar(); inp.focus();
  }
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && SGE.auth.activa && viewEl) {
      e.preventDefault();
      if (!document.querySelector('.pal')) abrirPaleta();
    }
  });

  /* ---------- arranque ---------- */
  function arrancar() {
    viewEl = null;
    if (SGE.store.enNube) return arrancarNube().catch((e) => { console.error(e); renderMensaje('Algo salió mal', traducir(e.message || e)); });
    SGE.store.iniciar();
    SGE.auth.cargar();
    if (!SGE.auth.activa || !SGE.auth.me()) { SGE.auth.salir(); viewEl = null; renderLogin(); return; }
    renderShell();
    navegar();
  }
  window.addEventListener('hashchange', navegar);
  if (SGE.store.enNube) {
    SGE.nube.onError((errs) => SGE.ui.toast('No se guardó en la base de datos: ' + traducir(errs[0]) + ' Recarga la página para ver lo último guardado.', 'bad'));
    SGE.nube.cliente.auth.onAuthStateChange((ev) => { if (ev === 'PASSWORD_RECOVERY' && !enlaceCorreo) { pedirClave = true; setTimeout(arrancar, 0); } });
    window.addEventListener('beforeunload', (e) => { if (SGE.nube.ocupada) { e.preventDefault(); e.returnValue = ''; } });
  }
  arrancar();
})();
