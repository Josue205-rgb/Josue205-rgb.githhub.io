/* Componentes de interfaz. Todo el texto de usuario entra por textContent: nunca innerHTML. */
(function () {
  'use strict';
  const SGE = (window.SGE = window.SGE || {});
  const NS = 'http://www.w3.org/2000/svg';

  /* ---------- DOM ---------- */
  function append(el, kids) {
    for (const k of kids) {
      if (k == null || k === false || k === true) continue;
      if (Array.isArray(k)) append(el, k);
      else if (k instanceof Node) el.appendChild(k);
      else el.appendChild(document.createTextNode(String(k)));
    }
  }
  function setAttrs(el, attrs, svg) {
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.setAttribute('class', v);
      else if (k === 'style' && typeof v === 'object') { for (const [sk, sv] of Object.entries(v)) { if (sk.startsWith('--')) el.style.setProperty(sk, sv); else el.style[sk] = sv; } }
      else if (k === 'value' && !svg) el.value = v;
      else if (k === 'checked' && !svg) el.checked = !!v;
      else if (k === 'disabled' && !svg) el.disabled = !!v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    setAttrs(el, attrs, false);
    append(el, kids);
    return el;
  }
  function s(tag, attrs, ...kids) {
    const el = document.createElementNS(NS, tag);
    setAttrs(el, attrs, true);
    append(el, kids);
    return el;
  }
  const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };

  /* ---------- iconos ---------- */
  const ICONS = {
    panel: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
    estudiantes: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    docentes: 'M22 10 12 5 2 10l10 5 10-5zM6 12v5c3 2 9 2 12 0v-5',
    grupos: 'M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
    horarios: 'M3 4h18v18H3zM16 2v4M8 2v4M3 10h18M8 14h2M14 14h2M8 18h2',
    asistencia: 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
    notas: 'M9 2h6v4H9zM7 4H5a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-2M8 12h8M8 16h5',
    boletin: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8',
    pagos: 'M3 7h18v12H3zM3 7l2-3h14l2 3M16 13h2',
    comunicados: 'M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1zM16 8a5 5 0 0 1 0 8',
    calendario: 'M3 4h18v18H3zM16 2v4M8 2v4M3 10h18',
    ajustes: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
    search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
    plus: 'M12 5v14M5 12h14',
    trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6',
    edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z',
    print: 'M6 9V2h12v7M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2M6 14h12v8H6z',
    download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
    upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
    sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
    moon: 'M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z',
    x: 'M18 6 6 18M6 6l12 12',
    left: 'M15 18l-6-6 6-6',
    right: 'M9 18l6-6-6-6',
    alert: 'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01',
    check: 'M20 6 9 17l-5-5',
    logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
    wand: 'M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M17.8 6.2 19 5M12.2 6.2 11 5M3 21l9-9',
    menu: 'M3 6h18M3 12h18M3 18h18',
    user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    star: 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z',
    table: 'M3 3h18v18H3zM3 9h18M3 15h18M9 3v18',
    chart: 'M3 3v18h18M7 15l4-4 3 3 5-6',
    refresh: 'M21 12a9 9 0 0 1-15.5 6.2L3 16M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M3 21v-5h5',
  };
  function icon(name, size) {
    const svg = s('svg', { viewBox: '0 0 24 24', width: size || 18, height: size || 18, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', class: 'ic' });
    svg.appendChild(s('path', { d: ICONS[name] || ICONS.alert }));
    return svg;
  }

  /* ---------- formato ---------- */
  const moneyFmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  const money = (n) => moneyFmt.format(n || 0);
  const nota = (n) => (typeof n === 'number' ? n.toFixed(1) : '—');
  function hueDe(str) { let x = 0; for (const c of String(str)) x = (x * 31 + c.charCodeAt(0)) % 360; return x; }
  function avatar(nombre, size) {
    const a = h('span', { class: 'avatar', 'aria-hidden': 'true', style: { '--h': hueDe(nombre) } }, SGE.logic.iniciales(nombre).toUpperCase());
    if (size) { a.style.width = a.style.height = size + 'px'; a.style.fontSize = Math.round(size * 0.38) + 'px'; }
    return a;
  }
  function badge(text, kind) { return h('span', { class: 'badge b-' + (kind || 'neutral') }, text); }
  function desBadge(d) { return badge(d.label, { superior: 'info', alto: 'ok', basico: 'warn', bajo: 'bad', sin: 'neutral' }[d.key]); }
  function notaChip(n, cfg) {
    const d = SGE.logic.desempeno(n, cfg || SGE.store.db.settings);
    return h('span', { class: 'nota n-' + d.key }, nota(n));
  }
  function descargar(nombre, texto, mime) {
    const blob = new Blob([texto], { type: mime || 'text/plain;charset=utf-8' });
    const a = h('a', { href: URL.createObjectURL(blob), download: nombre });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  /* ---------- toast ---------- */
  function toast(msg, kind) {
    let box = document.getElementById('toasts');
    if (!box) { box = h('div', { id: 'toasts', 'aria-live': 'polite' }); document.body.appendChild(box); }
    const t = h('div', { class: 'toast t-' + (kind || 'ok'), role: 'status' }, icon(kind === 'bad' ? 'alert' : 'check', 16), h('span', {}, msg));
    box.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 250); }, 3200);
  }

  /* ---------- modal ---------- */
  const pila = [];
  function modal(o) {
    const prev = document.activeElement;
    const back = h('div', { class: 'backdrop' });
    const body = h('div', { class: 'modal-body' });
    if (typeof o.body === 'function') append(body, [o.body(close)]); else append(body, [o.body]);
    const foot = h('div', { class: 'modal-foot' });
    (o.actions || []).forEach((a) => {
      foot.appendChild(h('button', { type: 'button', class: 'btn ' + (a.kind || 'ghost'), onclick: () => { const r = a.onClick ? a.onClick(close) : undefined; if (!a.keep && r !== false) close(); } }, a.icon ? icon(a.icon, 16) : null, a.label));
    });
    const box = h('div', { class: 'modal ' + (o.size || 'md'), role: 'dialog', 'aria-modal': 'true', 'aria-label': o.title || 'Diálogo' },
      h('div', { class: 'modal-head' }, h('h2', {}, o.title || ''), h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Cerrar', onclick: () => close() }, icon('x'))),
      body, (o.actions && o.actions.length) ? foot : null);
    back.appendChild(box);
    back.addEventListener('mousedown', (e) => { if (e.target === back) close(); });
    function onKey(e) { if (e.key === 'Escape' && pila[pila.length - 1] === back) { e.stopPropagation(); close(); } }
    pila.push(back);
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(back);
    document.body.classList.add('no-scroll');
    const first = box.querySelector('input:not([type=hidden]),select,textarea');
    (first || box).focus && (first || box).focus();
    function close() {
      document.removeEventListener('keydown', onKey, true);
      const ix = pila.indexOf(back); if (ix >= 0) pila.splice(ix, 1);
      back.remove();
      if (!document.querySelector('.backdrop')) document.body.classList.remove('no-scroll');
      if (o.onClose) o.onClose();
      if (prev && prev.focus) try { prev.focus(); } catch (e) { /* noop */ }
    }
    return { close, el: box };
  }
  function confirmar(msg, o) {
    o = o || {};
    return new Promise((res) => {
      let hecho = false;
      modal({ title: o.title || 'Confirmar', size: 'sm', body: h('p', {}, msg), onClose: () => { if (!hecho) res(false); },
        actions: [{ label: 'Cancelar', kind: 'ghost' }, { label: o.ok || 'Confirmar', kind: o.danger ? 'danger' : 'primary', onClick: () => { hecho = true; res(true); } }] });
    });
  }

  /* ---------- formularios ---------- */
  function form(fields, vals) {
    vals = vals || {};
    const refs = {};
    const el = h('form', { class: 'form', novalidate: true, onsubmit: (e) => e.preventDefault() });
    fields.forEach((f) => {
      if (f.section) { el.appendChild(h('h3', { class: 'form-sec' }, f.section)); return; }
      const v = vals[f.name] != null ? vals[f.name] : (f.value != null ? f.value : '');
      let input;
      const common = { id: 'f_' + f.name, name: f.name, placeholder: f.placeholder, 'aria-required': f.required ? 'true' : null };
      if (f.type === 'select') {
        input = h('select', common, (f.options || []).map((op) => { const o2 = typeof op === 'object' ? op : { value: op, label: op }; return h('option', { value: o2.value, selected: String(o2.value) === String(v) }, o2.label); }));
      } else if (f.type === 'textarea') input = h('textarea', { ...common, rows: f.rows || 3 }, v);
      else if (f.type === 'checkbox') input = h('input', { ...common, type: 'checkbox', checked: !!v });
      else input = h('input', { ...common, type: f.type || 'text', value: v, min: f.min, max: f.max, step: f.step, maxlength: f.maxlength });
      refs[f.name] = { input, f };
      el.appendChild(h('div', { class: 'field' + (f.span === 2 ? ' span2' : '') + (f.type === 'checkbox' ? ' check' : '') },
        f.type === 'checkbox' ? h('label', { for: 'f_' + f.name }, input, f.label) : [h('label', { for: 'f_' + f.name }, f.label, f.required ? h('b', { class: 'req', 'aria-hidden': 'true' }, ' *') : null), input],
        f.help ? h('small', {}, f.help) : null, h('em', { class: 'err', id: 'e_' + f.name })));
    });
    function get() {
      const out = {};
      for (const [k, { input, f }] of Object.entries(refs)) {
        if (f.type === 'checkbox') out[k] = input.checked;
        else if (f.type === 'number') out[k] = input.value === '' ? null : Number(input.value);
        else out[k] = input.value.trim();
      }
      return out;
    }
    function valid() {
      let ok = true, firstBad = null;
      for (const [k, { input, f }] of Object.entries(refs)) {
        const err = el.querySelector('#e_' + k);
        let msg = '';
        const v = f.type === 'checkbox' ? input.checked : input.value.trim();
        if (f.required && (v === '' || v === false)) msg = 'Este campo es obligatorio.';
        else if (v !== '' && f.type === 'email' && !/^\S+@\S+\.\S+$/.test(v)) msg = 'Escribe un correo válido.';
        else if (v !== '' && f.type === 'number' && (isNaN(Number(v)) || (f.min != null && Number(v) < f.min) || (f.max != null && Number(v) > f.max))) msg = `Valor entre ${f.min != null ? f.min : '…'} y ${f.max != null ? f.max : '…'}.`;
        else if (f.check) msg = f.check(v, get()) || '';
        err.textContent = msg; input.classList.toggle('invalid', !!msg);
        if (msg) { ok = false; firstBad = firstBad || input; }
      }
      if (firstBad) firstBad.focus();
      return ok;
    }
    return { el, get, valid };
  }

  /* ---------- tabs, segmentado, vacío, KPI ---------- */
  function tabs(items, active, onChange) {
    let cur = active || items[0].id;
    const bar = h('div', { class: 'tabs', role: 'tablist' });
    const panel = h('div', { class: 'tab-panel', role: 'tabpanel' });
    function paint() {
      clear(bar);
      items.forEach((it) => bar.appendChild(h('button', { type: 'button', role: 'tab', class: 'tab' + (it.id === cur ? ' on' : ''), 'aria-selected': it.id === cur ? 'true' : 'false', onclick: () => { cur = it.id; paint(); if (onChange) onChange(cur); } }, it.label)));
      clear(panel).appendChild(items.find((i) => i.id === cur).render());
    }
    paint();
    return h('div', { class: 'tabs-wrap' }, bar, panel);
  }
  function seg(options, value, onChange, label) {
    const wrap = h('div', { class: 'seg', role: 'group', 'aria-label': label || null });
    function paint(v) {
      clear(wrap);
      options.forEach((o) => {
        const op = typeof o === 'object' ? o : { value: o, label: o };
        wrap.appendChild(h('button', { type: 'button', class: op.value === v ? 'on' : '', 'aria-pressed': op.value === v ? 'true' : 'false', onclick: () => { paint(op.value); onChange(op.value); } }, op.label));
      });
    }
    paint(value);
    return wrap;
  }
  function empty(titulo, texto, accion) {
    return h('div', { class: 'empty' }, h('div', { class: 'empty-art', 'aria-hidden': 'true' }, icon('grupos', 28)), h('h3', {}, titulo), texto ? h('p', {}, texto) : null, accion || null);
  }
  function kpi(o) {
    return h('div', { class: 'kpi' + (o.tone ? ' k-' + o.tone : '') },
      h('div', { class: 'kpi-top' }, h('span', { class: 'kpi-l' }, o.label), o.icon ? icon(o.icon, 18) : null),
      h('div', { class: 'kpi-v' }, o.value), o.sub ? h('div', { class: 'kpi-s' }, o.sub) : null);
  }
  function pageHead(titulo, sub, acciones) {
    return h('header', { class: 'page-head' }, h('div', {}, h('h1', {}, titulo), sub ? h('p', {}, sub) : null), h('div', { class: 'actions' }, acciones || []));
  }
  function btn(label, kind, onclick, ic) {
    return h('button', { type: 'button', class: 'btn ' + (kind || 'ghost'), onclick }, ic ? icon(ic, 16) : null, label);
  }
  function selectEl(options, value, onChange, label) {
    return h('select', { 'aria-label': label || null, onchange: (e) => onChange(e.target.value) },
      options.map((op) => { const o = typeof op === 'object' ? op : { value: op, label: op }; return h('option', { value: o.value, selected: String(o.value) === String(value) }, o.label); }));
  }

  /* ---------- tabla con búsqueda, filtros, orden y paginación ---------- */
  function table(o) {
    const st = { q: '', sort: null, dir: 1, page: 0, f: {} };
    let rows = o.rows;
    const size = o.pageSize || 12;
    const wrap = h('div', { class: 'tbl-wrap' });
    const tools = h('div', { class: 'tbl-tools' });
    const holder = h('div', { class: 'tbl-scroll' });
    const pager = h('div', { class: 'pager' });
    wrap.append(tools, holder, pager);

    if (o.search) {
      tools.appendChild(h('label', { class: 'search' }, icon('search', 16), h('input', { type: 'search', placeholder: o.searchPlaceholder || 'Buscar…', 'aria-label': 'Buscar', oninput: (e) => { st.q = e.target.value.trim().toLowerCase(); st.page = 0; paint(); } })));
    }
    (o.filters || []).forEach((f, i) => {
      st.f[i] = f.value != null ? f.value : '';
      tools.appendChild(h('label', { class: 'filter' }, h('span', {}, f.label), selectEl([{ value: '', label: f.all || 'Todos' }, ...f.options], st.f[i], (v) => { st.f[i] = v; st.page = 0; paint(); }, f.label)));
    });
    if (o.toolbar) tools.appendChild(h('div', { class: 'tools-right' }, o.toolbar));

    function filtered() {
      let r = rows.filter((row) => (!st.q || o.search(row, st.q)) && (o.filters || []).every((f, i) => !st.f[i] || f.test(row, st.f[i])));
      if (st.sort != null) {
        const c = o.cols[st.sort];
        const val = c.sortValue || ((row) => row[c.key]);
        r = r.slice().sort((a, b) => { const x = val(a), y = val(b); if (x == null) return 1; if (y == null) return -1; return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'es')) * st.dir; });
      }
      return r;
    }
    function paint() {
      const all = filtered();
      const pages = Math.max(1, Math.ceil(all.length / size));
      st.page = Math.min(st.page, pages - 1);
      const view = all.slice(st.page * size, st.page * size + size);
      clear(holder);
      if (!all.length) { holder.appendChild(o.empty || empty('Sin resultados', 'Prueba con otra búsqueda o cambia los filtros.')); clear(pager); return; }
      const thead = h('thead', {}, h('tr', {}, o.cols.map((c, i) => {
        const sortable = c.sortValue || c.key;
        return h('th', { class: c.align ? 'al-' + c.align : '', 'aria-sort': st.sort === i ? (st.dir > 0 ? 'ascending' : 'descending') : null, style: c.width ? { width: c.width } : null },
          sortable && !c.nosort ? h('button', { type: 'button', class: 'th-btn', onclick: () => { if (st.sort === i) st.dir *= -1; else { st.sort = i; st.dir = 1; } paint(); } }, c.label, st.sort === i ? (st.dir > 0 ? ' ↑' : ' ↓') : null) : c.label);
      })));
      const tbody = h('tbody', {}, view.map((row) => {
        const tr = h('tr', { class: (o.onRow ? 'clickable ' : '') + (o.rowClass ? o.rowClass(row) : ''), tabindex: o.onRow ? 0 : null,
          onclick: o.onRow ? (e) => { if (!e.target.closest('button,a,input,select')) o.onRow(row); } : null,
          onkeydown: o.onRow ? (e) => { if (e.key === 'Enter' && e.target === tr) o.onRow(row); } : null },
          o.cols.map((c) => h('td', { class: c.align ? 'al-' + c.align : '', 'data-label': c.label }, c.render ? c.render(row) : row[c.key])));
        return tr;
      }));
      holder.appendChild(h('table', { class: 'tbl' }, thead, tbody));
      clear(pager);
      pager.appendChild(h('span', {}, `${all.length} resultado${all.length === 1 ? '' : 's'}`));
      if (pages > 1) {
        pager.appendChild(h('div', { class: 'pg' },
          h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Página anterior', disabled: st.page === 0, onclick: () => { st.page--; paint(); } }, icon('left')),
          h('span', {}, `${st.page + 1} / ${pages}`),
          h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Página siguiente', disabled: st.page >= pages - 1, onclick: () => { st.page++; paint(); } }, icon('right'))));
      }
    }
    wrap.setRows = (r) => { rows = r; paint(); };
    paint();
    return wrap;
  }

  /* ---------- gráficos SVG ---------- */
  const tipEl = h('div', { id: 'tip', role: 'tooltip' });
  document.addEventListener('DOMContentLoaded', () => document.body.appendChild(tipEl));
  const tip = {
    show(nodes, x, y) {
      clear(tipEl); append(tipEl, [nodes]);
      tipEl.classList.add('on');
      const w = tipEl.offsetWidth, hh = tipEl.offsetHeight;
      tipEl.style.left = Math.max(6, Math.min(x + 14, window.innerWidth - w - 6)) + 'px';
      tipEl.style.top = Math.max(6, Math.min(y - hh - 10, window.innerHeight - hh - 6)) + 'px';
    },
    hide() { tipEl.classList.remove('on'); },
  };
  const fill = (v) => ({ style: `fill:${v}` });
  const nice = (max) => { const p = Math.pow(10, Math.floor(Math.log10(max || 1))); const f = max / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; };

  function legend(items) {
    return h('ul', { class: 'legend' }, items.map((i) => h('li', {}, h('i', { style: { background: i.color } }), i.label)));
  }

  /** series: [{name,color,points:[{x,y}]}] */
  function lineChart(o) {
    const W = 640, H = o.h || 230, m = { l: 42, r: 14, t: 14, b: 28 };
    const pts = o.series[0].points, n = pts.length;
    const ys = o.series.flatMap((se) => se.points.map((p) => p.y)).filter((v) => v != null);
    const lo = o.yMin != null ? o.yMin : Math.min(...ys), hi = o.yMax != null ? o.yMax : Math.max(...ys);
    const X = (i) => m.l + (n === 1 ? 0.5 : i / (n - 1)) * (W - m.l - m.r);
    const Y = (v) => m.t + (1 - (v - lo) / ((hi - lo) || 1)) * (H - m.t - m.b);
    const fmt = o.fmt || ((v) => v);
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': o.label || 'Gráfico de líneas' });
    for (let i = 0; i <= 4; i++) {
      const v = lo + ((hi - lo) * i) / 4, y = Y(v);
      svg.appendChild(s('line', { x1: m.l, x2: W - m.r, y1: y, y2: y, class: 'grid' }));
      svg.appendChild(s('text', { x: m.l - 8, y: y + 4, class: 'axis', 'text-anchor': 'end' }, fmt(Math.round(v * 10) / 10)));
    }
    const every = Math.ceil(n / 7);
    pts.forEach((p, i) => { if ((n - 1 - i) % every === 0) svg.appendChild(s('text', { x: X(i), y: H - 8, class: 'axis', 'text-anchor': 'middle' }, p.x)); });
    o.series.forEach((se) => {
      const d = se.points.map((p, i) => (p.y == null ? '' : `${i && se.points[i - 1].y != null ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.y).toFixed(1)}`)).join('');
      svg.appendChild(s('path', { d, class: 'line', style: `stroke:${se.color}` }));
    });
    const cross = s('line', { y1: m.t, y2: H - m.b, class: 'cross', style: 'display:none' });
    const dots = o.series.map((se) => s('circle', { r: 4.5, class: 'dot', style: `fill:${se.color};display:none` }));
    svg.appendChild(cross); dots.forEach((d) => svg.appendChild(d));
    const hit = s('rect', { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: 'transparent', tabindex: 0, 'aria-label': 'Explorar valores del gráfico' });
    function at(i, cx, cy) {
      i = Math.max(0, Math.min(n - 1, i));
      cross.setAttribute('x1', X(i)); cross.setAttribute('x2', X(i)); cross.style.display = '';
      o.series.forEach((se, k) => { const v = se.points[i].y; dots[k].style.display = v == null ? 'none' : ''; if (v != null) { dots[k].setAttribute('cx', X(i)); dots[k].setAttribute('cy', Y(v)); } });
      tip.show(h('div', {}, h('b', {}, o.series[0].points[i].tip || o.series[0].points[i].x), o.series.map((se) => h('div', { class: 'tip-row' }, h('i', { style: { background: se.color } }), `${se.name}: `, h('b', {}, se.points[i].y == null ? '—' : fmt(se.points[i].y))))), cx, cy);
    }
    hit.addEventListener('mousemove', (e) => { const r = svg.getBoundingClientRect(); const px = ((e.clientX - r.left) / r.width) * W; at(Math.round(((px - m.l) / (W - m.l - m.r)) * (n - 1)), e.clientX, e.clientY); });
    const off = () => { cross.style.display = 'none'; dots.forEach((d) => (d.style.display = 'none')); tip.hide(); };
    hit.addEventListener('mouseleave', off); hit.addEventListener('blur', off);
    let ki = n - 1;
    hit.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') ki--; else if (e.key === 'ArrowRight') ki++; else return; ki = Math.max(0, Math.min(n - 1, ki)); const r = svg.getBoundingClientRect(); at(ki, r.left + (X(ki) / W) * r.width, r.top + r.height / 2); e.preventDefault(); });
    svg.appendChild(hit);
    const out = h('div', {}, svg);
    if (o.series.length > 1) out.appendChild(legend(o.series.map((se) => ({ label: se.name, color: se.color }))));
    return out;
  }

  /** data: [{label,value,color,tip}] — barras verticales u horizontales. */
  function barChart(o) {
    const data = o.data, fmt = o.fmt || ((v) => v);
    const max = o.max || nice(Math.max(...data.map((d) => d.value), 1));
    if (o.horizontal) {
      const rowH = 30, W = 640, lw = o.labelW || 120, H = data.length * rowH + 8;
      const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': o.label || 'Gráfico de barras' });
      data.forEach((d, i) => {
        const y = 4 + i * rowH, w = ((W - lw - 56) * d.value) / max;
        svg.appendChild(s('text', { x: lw - 8, y: y + 17, class: 'axis', 'text-anchor': 'end' }, d.label));
        const bar = s('path', { d: `M${lw},${y + 4} h${Math.max(w - 4, 0)} a4,4 0 0 1 4,4 v10 a4,4 0 0 1 -4,4 h-${Math.max(w - 4, 0)} z`, class: 'bar', style: `fill:${d.color || 'var(--c1)'}`, tabindex: 0, 'aria-label': `${d.label}: ${fmt(d.value)}` });
        const over = (e) => tip.show(h('div', {}, h('b', {}, d.label), h('div', {}, fmt(d.value), d.tip ? ' · ' + d.tip : '')), e.clientX, e.clientY);
        bar.addEventListener('mousemove', over); bar.addEventListener('mouseleave', tip.hide);
        bar.addEventListener('focus', () => { const r = bar.getBoundingClientRect(); tip.show(h('div', {}, h('b', {}, d.label), h('div', {}, fmt(d.value))), r.right, r.top); }); bar.addEventListener('blur', tip.hide);
        svg.appendChild(bar);
        svg.appendChild(s('text', { x: lw + w + 6, y: y + 17, class: 'val' }, fmt(d.value)));
      });
      return h('div', {}, svg);
    }
    const W = 640, H = o.h || 220, m = { l: 40, r: 10, t: 22, b: 30 };
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': o.label || 'Gráfico de barras' });
    for (let i = 0; i <= 4; i++) {
      const v = (max * i) / 4, y = m.t + (1 - i / 4) * (H - m.t - m.b);
      svg.appendChild(s('line', { x1: m.l, x2: W - m.r, y1: y, y2: y, class: 'grid' }));
      svg.appendChild(s('text', { x: m.l - 8, y: y + 4, class: 'axis', 'text-anchor': 'end' }, o.axisFmt ? o.axisFmt(v) : fmt(v)));
    }
    const slot = (W - m.l - m.r) / data.length, bw = Math.min(slot * 0.6, 44);
    data.forEach((d, i) => {
      const x = m.l + slot * i + (slot - bw) / 2, hgt = (d.value / max) * (H - m.t - m.b), y = H - m.b - hgt;
      const r = Math.min(4, hgt / 2, bw / 2);
      const bar = s('path', { d: hgt > 0 ? `M${x},${H - m.b} V${y + r} a${r},${r} 0 0 1 ${r},-${r} h${bw - 2 * r} a${r},${r} 0 0 1 ${r},${r} V${H - m.b} z` : '', class: 'bar', style: `fill:${d.color || 'var(--c1)'}`, tabindex: 0, 'aria-label': `${d.label}: ${fmt(d.value)}` });
      const show = (cx, cy) => tip.show(h('div', {}, h('b', {}, d.long || d.label), h('div', {}, fmt(d.value), d.tip ? ' · ' + d.tip : '')), cx, cy);
      bar.addEventListener('mousemove', (e) => show(e.clientX, e.clientY)); bar.addEventListener('mouseleave', tip.hide);
      bar.addEventListener('focus', () => { const rr = bar.getBoundingClientRect(); show(rr.left + rr.width / 2, rr.top); }); bar.addEventListener('blur', tip.hide);
      svg.appendChild(bar);
      if (data.length <= 12 && d.value > 0 && !o.noValues) svg.appendChild(s('text', { x: x + bw / 2, y: y - 6, class: 'val', 'text-anchor': 'middle' }, o.valFmt ? o.valFmt(d.value) : fmt(d.value)));
      svg.appendChild(s('text', { x: x + bw / 2, y: H - 10, class: 'axis', 'text-anchor': 'middle' }, d.label));
    });
    return h('div', {}, svg);
  }

  /** Barras apiladas horizontales al 100%. rows:[{label, parts:{key:n}}], keys:[{key,label,color}] */
  function stackedBars(o) {
    const W = 640, rowH = 30, lw = o.labelW || 56, H = o.rows.length * rowH + 6, bw = W - lw - 8;
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': o.label || 'Barras apiladas' });
    o.rows.forEach((r, i) => {
      const y = 3 + i * rowH, tot = o.keys.reduce((a, k) => a + (r.parts[k.key] || 0), 0) || 1;
      svg.appendChild(s('text', { x: lw - 8, y: y + 18, class: 'axis', 'text-anchor': 'end' }, r.label));
      let x = lw;
      o.keys.forEach((k) => {
        const v = r.parts[k.key] || 0;
        if (!v) return;
        const w = (v / tot) * bw;
        const seg = s('rect', { x, y: y + 4, width: Math.max(w - 2, 1), height: 18, rx: 3, class: 'bar', style: `fill:${k.color}`, tabindex: 0, 'aria-label': `${r.label}, ${k.label}: ${v}` });
        const show = (cx, cy) => tip.show(h('div', {}, h('b', {}, `${r.label} · ${k.label}`), h('div', {}, `${v} estudiante${v === 1 ? '' : 's'} (${Math.round((v / tot) * 100)}%)`)), cx, cy);
        seg.addEventListener('mousemove', (e) => show(e.clientX, e.clientY)); seg.addEventListener('mouseleave', tip.hide);
        seg.addEventListener('focus', () => { const rr = seg.getBoundingClientRect(); show(rr.left + rr.width / 2, rr.top); }); seg.addEventListener('blur', tip.hide);
        svg.appendChild(seg);
        if (w > 26) svg.appendChild(s('text', { x: x + w / 2 - 1, y: y + 17, class: 'seg-val', 'text-anchor': 'middle' }, v));
        x += w;
      });
    });
    return h('div', {}, svg, legend(o.keys.map((k) => ({ label: k.label, color: k.color }))));
  }

  function donut(o) {
    const size = 168, r = 64, sw = 22, c = size / 2, circ = 2 * Math.PI * r;
    const tot = o.parts.reduce((a, p) => a + p.value, 0) || 1;
    const svg = s('svg', { viewBox: `0 0 ${size} ${size}`, class: 'donut', role: 'img', 'aria-label': o.label || 'Gráfico circular' });
    svg.appendChild(s('circle', { cx: c, cy: c, r, class: 'donut-bg', 'stroke-width': sw, fill: 'none' }));
    let off = 0;
    o.parts.forEach((p) => {
      if (!p.value) return;
      const len = (p.value / tot) * circ;
      const arc = s('circle', { cx: c, cy: c, r, fill: 'none', 'stroke-width': sw, class: 'bar', style: `stroke:${p.color}`, 'stroke-dasharray': `${Math.max(len - 2, 0.5)} ${circ}`, 'stroke-dashoffset': -off, transform: `rotate(-90 ${c} ${c})`, tabindex: 0, 'aria-label': `${p.label}: ${p.value}` });
      const show = (cx, cy) => tip.show(h('div', {}, h('b', {}, p.label), h('div', {}, `${p.fmt ? p.fmt(p.value) : p.value} · ${Math.round((p.value / tot) * 100)}%`)), cx, cy);
      arc.addEventListener('mousemove', (e) => show(e.clientX, e.clientY)); arc.addEventListener('mouseleave', tip.hide);
      arc.addEventListener('focus', () => { const rr = arc.getBoundingClientRect(); show(rr.left + rr.width / 2, rr.top); }); arc.addEventListener('blur', tip.hide);
      svg.appendChild(arc);
      off += len;
    });
    if (o.center) {
      svg.appendChild(s('text', { x: c, y: c + 2, class: 'donut-big', 'text-anchor': 'middle' }, o.center.big));
      svg.appendChild(s('text', { x: c, y: c + 20, class: 'axis', 'text-anchor': 'middle' }, o.center.small));
    }
    return h('div', { class: 'donut-wrap' }, svg, h('ul', { class: 'legend v' }, o.parts.map((p) => h('li', {}, h('i', { style: { background: p.color } }), `${p.label}: `, h('b', {}, p.fmt ? p.fmt(p.value) : p.value)))));
  }

  /** Tarjeta de gráfico con alternancia gráfico / tabla (accesibilidad). */
  function chartCard(o) {
    let vista = 'chart';
    const body = h('div', { class: 'cc-body' });
    const toggle = h('button', { type: 'button', class: 'btn ghost sm', 'aria-pressed': 'false', onclick: () => { vista = vista === 'chart' ? 'table' : 'chart'; paint(); } });
    function paint() {
      toggle.setAttribute('aria-pressed', vista === 'table');
      clear(toggle); append(toggle, [icon(vista === 'chart' ? 'table' : 'chart', 14), vista === 'chart' ? 'Ver tabla' : 'Ver gráfico']);
      clear(body);
      if (vista === 'chart') body.appendChild(o.render());
      else body.appendChild(h('div', { class: 'tbl-scroll' }, h('table', { class: 'tbl compact' }, h('thead', {}, h('tr', {}, o.table.head.map((x) => h('th', {}, x)))), h('tbody', {}, o.table.rows.map((r) => h('tr', {}, r.map((c) => h('td', {}, c))))))));
    }
    paint();
    return h('section', { class: 'card chart-card ' + (o.class || '') }, h('header', { class: 'card-head' }, h('div', {}, h('h2', {}, o.title), o.sub ? h('p', {}, o.sub) : null), toggle), body);
  }

  SGE.ui = { h, s, clear, add: (el, ...k) => { append(el, k); return el; }, icon, money, nota, avatar, badge, desBadge, notaChip, hueDe, descargar, toast, modal, confirmar, form, tabs, seg, empty, kpi, pageHead, btn, selectEl, table, tip, legend, lineChart, barChart, stackedBars, donut, chartCard, fill };
})();
