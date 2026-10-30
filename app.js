'use strict';

/* =====================================================================
   Utilidades
   ===================================================================== */
const APP_VERSION = 'v8';
const SKIP = 30;
const RATES = [1, 1.25, 1.5, 1.75, 2];
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const now = () => Date.now();
const uid = () => Math.random().toString(36).slice(2, 8) + now().toString(36).slice(-4);
function hash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}
function fmtDur(sec) {
  if (!sec) return '';
  const m = Math.round(sec / 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
}
function fmtDate(ms) {
  if (!ms) return '';
  const d = new Date(ms);
  const opts = { day: 'numeric', month: 'short' };
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
  return d.toLocaleDateString('es-ES', opts);
}
function fmtBytes(b) {
  if (b < 1e6) return Math.round(b / 1e3) + ' KB';
  if (b < 1e9) return Math.round(b / 1e6) + ' MB';
  return (b / 1e9).toFixed(1) + ' GB';
}
const short = (t, n = 40) => (t && t.length > n ? t.slice(0, n - 1) + '…' : t || '');

/* Iconos (trazo, 24x24) */
const ICONS = {
  play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor" stroke="none"/>',
  back: '<path d="M12 4.5V1.5L7.5 5.5 12 9.5v-3a6.5 6.5 0 1 1-6.5 6.5"/><text x="12" y="16.2" font-size="7.6" font-weight="700" text-anchor="middle" fill="currentColor" stroke="none">30</text>',
  fwd: '<path d="M12 4.5V1.5l4.5 4-4.5 4v-3a6.5 6.5 0 1 0 6.5 6.5"/><text x="12" y="16.2" font-size="7.6" font-weight="700" text-anchor="middle" fill="currentColor" stroke="none">30</text>',
  down: '<path d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  up: '<path d="M6 14l6-6 6 6"/>',
  dn: '<path d="M6 10l6 6 6-6"/>',
  more: '<circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
  chevl: '<path d="M15 5l-7 7 7 7"/>',
  chevd: '<path d="M6 9l6 6 6-6"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  shows: '<rect x="4" y="4" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="2"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2"/>',
  lists: '<path d="M4 6h11M4 12h11M4 18h6"/><path d="M17.5 14v6l4.5-3z" fill="currentColor"/>',
  prev: '<path d="M6 5v14"/><path d="M19 5.5v13L9.5 12z" fill="currentColor" stroke="none"/>',
  next: '<path d="M18 5v14"/><path d="M5 5.5v13L14.5 12z" fill="currentColor" stroke="none"/>',
  grip: '<path d="M5 8h14M5 12h14M5 16h14"/>',
  circle: '<circle cx="12" cy="12" r="9"/>',
  checkfill: '<circle cx="12" cy="12" r="10" fill="currentColor" stroke="none"/><path d="M7.5 12.5l3 3 6-7" stroke="var(--on-accent)"/>',
  checkall: '<path d="M3 12.5l3.5 3.5L13 8M11 15.5l1.5 1.5L21 8"/>',
  gear: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
};
const icon = (n) =>
  `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[n]}</svg>`;

/* =====================================================================
   Estado y almacenamiento local
   ===================================================================== */
const LS = { state: 'pc.state', cfg: 'pc.cfg', feeds: 'pc.feeds', dl: 'pc.dl' };
const jget = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const jset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.warn(e); } };

// Estado que se sincroniza entre dispositivos
let state = Object.assign({ shows: {}, playlists: {}, episodes: {}, pos: {} }, jget(LS.state, {}));
// Configuración de este dispositivo
let cfg = Object.assign({ worker: '', key: '', rate: 1, autoDelete: false, lastSync: 0, last: null }, jget(LS.cfg, {}));
let feeds = {};                          // showId -> { at, episodes: [] } (se guarda en IndexedDB)
let dlMeta = jget(LS.dl, {});            // epId -> { size, at }
let downloaded = new Set();              // epId descargados en este dispositivo (IndexedDB)
const dlProg = {};                       // epId -> progreso (0..1, -1 = en cola/desconocido)
const dlCtl = {};
const loading = {};
const epMap = new Map();

const saveState = () => jset(LS.state, state);
const saveCfg = () => jset(LS.cfg, cfg);
const cfgOK = () => !!(cfg.worker && cfg.key);
const findEp = (id) => epMap.get(id) || state.episodes[id] || null;
const visibleShows = () => Object.values(state.shows).filter((s) => !s.del).sort((a, b) => (a.added || 0) - (b.added || 0));
const visibleLists = () => Object.values(state.playlists).filter((l) => !l.del).sort((a, b) => (a.order ?? a.added ?? 0) - (b.order ?? b.added ?? 0));

/* IndexedDB (audios descargados) */
let dbp;
function db() {
  return (dbp ||= new Promise((res, rej) => {
    const r = indexedDB.open('podcast-db', 2);
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains('audio')) d.createObjectStore('audio');
      if (!d.objectStoreNames.contains('feeds')) d.createObjectStore('feeds');
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
}
async function tx(mode, fn, store = 'audio') {
  const d = await db();
  return new Promise((res, rej) => {
    const t = d.transaction(store, mode);
    const req = fn(t.objectStore(store));
    t.oncomplete = () => res(req && req.result);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error || new Error('Transacción cancelada'));
  });
}
const idbGet = (k) => tx('readonly', (s) => s.get(k));
const idbSet = (k, v) => tx('readwrite', (s) => s.put(v, k));
const idbDel = (k) => tx('readwrite', (s) => s.delete(k));
const idbKeys = () => tx('readonly', (s) => s.getAllKeys());
const feedPut = (k, v) => tx('readwrite', (s) => s.put(v, k), 'feeds');
const feedDel = (k) => tx('readwrite', (s) => s.delete(k), 'feeds');
async function loadFeeds() {
  try {
    const keys = await tx('readonly', (s) => s.getAllKeys(), 'feeds');
    const vals = await tx('readonly', (s) => s.getAll(), 'feeds');
    keys.forEach((k, i) => { feeds[k] = vals[i]; });
  } catch (e) { console.warn('No se pudieron leer los RSS guardados', e); }
  // Migración desde la versión anterior (guardaba los RSS en localStorage)
  const old = jget(LS.feeds, null);
  if (old) {
    for (const [k, v] of Object.entries(old)) {
      if (!feeds[k]) { feeds[k] = v; try { await feedPut(k, v); } catch {} }
    }
    try { localStorage.removeItem(LS.feeds); } catch {}
  }
}

async function reconcileDownloads() {
  try {
    downloaded = new Set(await idbKeys());
    for (const k of Object.keys(dlMeta)) if (!downloaded.has(k)) delete dlMeta[k];
    jset(LS.dl, dlMeta);
  } catch (e) { console.warn(e); }
}

/* =====================================================================
   Servidor (Worker) y sincronización
   ===================================================================== */
async function api(path, opts = {}) {
  if (!cfgOK()) throw new Error('Configura el servidor en Ajustes');
  const r = await fetch(cfg.worker.replace(/\/+$/, '') + path, {
    ...opts,
    headers: { 'X-Key': cfg.key, ...(opts.headers || {}) },
  });
  if (r.status === 401) throw new Error('La clave no es correcta');
  if (!r.ok) {
    let msg = 'Error ' + r.status;
    try { const j = await r.clone().json(); if (j.error) msg = j.error; } catch {}
    throw new Error(msg);
  }
  return r;
}

const stable = (o) =>
  JSON.stringify(o, (k, v) =>
    v && typeof v === 'object' && !Array.isArray(v) ? Object.keys(v).sort().reduce((a, x) => ((a[x] = v[x]), a), {}) : v
  );
function mergeMaps(a, b, ts) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b || {})) if (!out[k] || (v[ts] || 0) > (out[k][ts] || 0)) out[k] = v;
  return out;
}
const norm = (s) => ({ shows: s?.shows || {}, playlists: s?.playlists || {}, episodes: s?.episodes || {}, pos: s?.pos || {} });
function mergeState(a, b) {
  b = norm(b);
  return {
    shows: mergeMaps(a.shows, b.shows, 'mod'),
    playlists: mergeMaps(a.playlists, b.playlists, 'mod'),
    episodes: mergeMaps(a.episodes, b.episodes, 'mod'),
    pos: mergeMaps(a.pos, b.pos, 'at'),
  };
}

let syncTimer = null, syncing = false;
function touch() { saveState(); syncSoon(); }
function syncSoon(ms = 30000) {
  if (syncTimer || !cfgOK()) return;
  syncTimer = setTimeout(() => { syncTimer = null; sync(); }, ms);
}
function setSyncStatus(t) { const el = $('#sync-status'); if (el) el.textContent = t; }
function syncLabel() {
  return cfg.lastSync ? 'Última sincronización: ' + new Date(cfg.lastSync).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Sin sincronizar todavía';
}
async function sync(manual = false) {
  if (!cfgOK()) { if (manual) toast('Configura el servidor y la clave'); return false; }
  if (syncing) return false;
  if (!navigator.onLine) { if (manual) toast('Sin conexión'); return false; }
  syncing = true;
  setSyncStatus('Sincronizando…');
  try {
    const remote = norm(await (await api('/sync')).json());
    const before = stable(state);
    state = mergeState(state, remote);
    if (stable(state) !== before) {
      saveState(); render();
      visibleShows().filter((x) => !feeds[x.id]).forEach((x) => refreshShow(x.id, false));
    }
    if (stable(state) !== stable(remote)) {
      await api('/sync', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(state) });
    }
    cfg.lastSync = now(); saveCfg();
    setSyncStatus(syncLabel());
    if (manual) toast('Sincronizado');
    return true;
  } catch (e) {
    setSyncStatus('No se pudo sincronizar: ' + e.message);
    if (manual) toast(e.message);
    return false;
  } finally { syncing = false; }
}

/* =====================================================================
   RSS
   ===================================================================== */
const child = (el, name) => (el ? Array.from(el.children).find((c) => c.tagName === name) : null);
const childText = (el, name) => (child(el, name)?.textContent || '').trim();
function parseDuration(s) {
  if (!s) return 0;
  if (/^\d+$/.test(s)) return +s;
  const p = s.split(':').map(Number);
  if (p.some(isNaN)) return 0;
  return p.reduce((a, v) => a * 60 + v, 0);
}
function plainText(h, max = 800) {
  if (!h) return '';
  let t = h.replace(/<\s*(br|\/p|\/div|\/li|\/h\d)[^>]*>/gi, '\n').replace(/<[^>]+>/g, '');
  t = t.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n)).replace(/&#x([0-9a-f]+);/gi, (m, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, '&');
  t = t.replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{2,}/g, '\n').trim();
  return t.length > max ? t.slice(0, max).replace(/\s+\S*$/, '') + '…' : t;
}
function parseFeed(xml, feedUrl) {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const ch = doc.getElementsByTagName('channel')[0];
  if (doc.getElementsByTagName('parsererror').length || !ch) throw new Error('Eso no parece un RSS de podcast');
  const showId = hash(feedUrl);
  const image = child(ch, 'itunes:image')?.getAttribute('href') || childText(child(ch, 'image'), 'url') || '';
  const episodes = [];
  for (const it of Array.from(ch.children).filter((c) => c.tagName === 'item').slice(0, 3000)) {
    const audio = child(it, 'enclosure')?.getAttribute('url');
    if (!audio) continue;
    const guid = childText(it, 'guid') || audio;
    episodes.push({
      id: showId + '.' + hash(guid),
      showId,
      title: childText(it, 'title') || 'Sin título',
      audio,
      pub: Date.parse(childText(it, 'pubDate')) || 0,
      dur: parseDuration(childText(it, 'itunes:duration')),
      desc: plainText(childText(it, 'description') || childText(it, 'itunes:summary') || childText(it, 'content:encoded')),
      image: ((u) => (u && u !== image ? u : ''))(child(it, 'itunes:image')?.getAttribute('href')),
    });
  }
  episodes.sort((a, b) => b.pub - a.pub);
  return { title: childText(ch, 'title'), author: childText(ch, 'itunes:author'), image, episodes };
}
async function fetchFeed(feedUrl) {
  const r = await api('/feed?url=' + encodeURIComponent(feedUrl));
  return parseFeed(await r.text(), feedUrl);
}
async function refreshShow(id, force = false) {
  const s = state.shows[id];
  if (!s || s.del) return;
  const c = feeds[id];
  if (!force && c && now() - c.at < 30 * 60e3) return;
  loading[id] = true;
  try {
    const p = await fetchFeed(s.feed);
    // Se acumulan los episodios: los que la emisora retira del RSS se conservan (marcados como retirados)
    const fresh = new Set(p.episodes.map((e) => e.id));
    const byId = new Map((feeds[id]?.episodes || []).map((e) => [e.id, e]));
    byId.forEach((e) => { if (!fresh.has(e.id)) e.gone = true; });
    p.episodes.forEach((e) => { const prev = byId.get(e.id); byId.set(e.id, prev ? { ...prev, ...e, gone: false } : e); });
    const merged = Array.from(byId.values()).sort((a, b) => b.pub - a.pub).slice(0, 3000);
    feeds[id] = { at: now(), episodes: merged };
    merged.forEach((e) => epMap.set(e.id, e));
    feedPut(id, feeds[id]).catch((e) => console.warn('No se pudo guardar el RSS', e));
    if (!s.image && p.image) { s.image = p.image; s.mod = now(); touch(); }
  } catch (e) {
    if (force || !feeds[id]) toast(navigator.onLine ? 'No se pudo actualizar: ' + e.message : 'Sin conexión: se muestran los episodios guardados');
  } finally {
    delete loading[id];
    render();
  }
}
async function refreshAll(force = false) {
  const ids = visibleShows().map((s) => s.id);
  let i = 0;
  const worker = async () => { while (i < ids.length) await refreshShow(ids[i++], force); };
  await Promise.all([worker(), worker(), worker()]);
}

/* =====================================================================
   Programas y listas
   ===================================================================== */
function addShow({ title, author, image, feed }) {
  const id = hash(feed);
  const ex = state.shows[id];
  if (ex && !ex.del) { toast('Ya tienes este programa'); return false; }
  state.shows[id] = { id, title, author: author || '', image: image || '', feed, added: now(), mod: now() };
  touch();
  refreshShow(id, true);
  toast('Añadido: ' + short(title));
  return true;
}
function removeShow(id) {
  const s = state.shows[id];
  if (!s) return;
  s.del = true; s.mod = now();
  delete feeds[id]; feedDel(id).catch(() => {});
  touch();
}
function newList(name) {
  const id = 'l' + uid();
  state.playlists[id] = { id, name, items: [], added: now(), mod: now() };
  touch();
  return id;
}
function addToList(listId, epId) {
  const l = state.playlists[listId], ep = findEp(epId);
  if (!l || !ep) return;
  if (l.items.includes(epId)) { toast('Ya está en esa lista'); return; }
  state.episodes[epId] = { ...ep, mod: now() };
  l.items.push(epId); l.mod = now();
  touch();
  toast('Añadido a ' + short(l.name, 24));
}
function addManyToList(listId, ids) {
  const l = state.playlists[listId];
  if (!l) return;
  let added = 0, dup = 0;
  ids.forEach((id) => {
    const ep = findEp(id);
    if (!ep) return;
    if (l.items.includes(id)) { dup++; return; }
    state.episodes[id] = { ...ep, desc: (ep.desc || '').slice(0, 400), gone: undefined, mod: now() };
    l.items.push(id); added++;
  });
  if (added) { l.mod = now(); touch(); }
  const nm = short(l.name, 24);
  if (!added) toast(ids.length === 1 ? 'Ya está en esa lista' : 'Ya estaban todos en esa lista');
  else toast(`Añadido${added === 1 ? '' : 's'} ${added} a ${nm}${dup ? ` (${dup} ya estaba${dup === 1 ? '' : 'n'})` : ''}`);
}
const inOtherLists = (id, exceptId) => visibleLists().some((l) => l.id !== exceptId && l.items.includes(id));
const normTxt = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
function filterEps(eps, q) {
  const words = normTxt(q).split(/\s+/).filter(Boolean);
  if (!words.length) return eps;
  return eps.filter((e) => { const t = normTxt(e.title); return words.every((w) => t.includes(w)); });
}
function moveList(from, to) {
  const arr = visibleLists();
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return;
  const [x] = arr.splice(from, 1);
  arr.splice(to, 0, x);
  arr.forEach((l, i) => { if (l.order !== i) { l.order = i; l.mod = now(); } });
  touch();
}
function removeEverywhere(id) {
  visibleLists().forEach((l) => { if (l.items.includes(id)) { l.items = l.items.filter((x) => x !== id); l.mod = now(); } });
  touch();
}
function removeItemFromList(listId, epId) {
  const l = state.playlists[listId];
  if (!l || !l.items.includes(epId)) return;
  l.items = l.items.filter((x) => x !== epId);
  l.mod = now(); touch();
  if (downloaded.has(epId) && !inOtherLists(epId, listId)) deleteDl(epId);
  toast('Quitado: ' + short(findEp(epId)?.title, 34));
  render();
}
async function askDeleteList(id) {
  const l = state.playlists[id];
  if (!l) return;
  if (!(await confirmBox('Eliminar lista', `Se eliminará "${l.name}". Las descargas no se borran.`, 'Eliminar', true))) return;
  closeSheet(); l.del = true; l.mod = now(); touch(); render();
}
function moveItemTo(listId, from, to) {
  const l = state.playlists[listId];
  if (!l || from === to || from < 0 || to < 0 || from >= l.items.length || to >= l.items.length) return;
  const [x] = l.items.splice(from, 1);
  l.items.splice(to, 0, x);
  l.mod = now(); touch();
}

/* =====================================================================
   Descargas
   ===================================================================== */
const dlQueue = [];
let dlRunning = false;
function mimeFor(url, ct) {
  if (ct && ct.startsWith('audio/')) return ct;
  return /\.(m4a|mp4)(\?|$)/i.test(url) ? 'audio/mp4' : 'audio/mpeg';
}
function enqueueDl(id) {
  if (downloaded.has(id) || dlProg[id] !== undefined) return;
  if (!cfgOK()) { toast('Configura el servidor en Ajustes'); return; }
  if (!navigator.onLine) { toast('Sin conexión'); return; }
  dlProg[id] = -1;
  dlQueue.push(id);
  refreshDl(id);
  runDl();
}
async function runDl() {
  if (dlRunning) return;
  dlRunning = true;
  while (dlQueue.length) {
    const id = dlQueue.shift();
    if (dlProg[id] === undefined) continue; // cancelada
    await doDl(id);
  }
  dlRunning = false;
}
async function doDl(id) {
  const ep = findEp(id);
  const ctl = new AbortController();
  dlCtl[id] = ctl;
  try {
    if (!ep) throw new Error('Episodio no encontrado');
    const r = await api('/audio?url=' + encodeURIComponent(ep.audio), { signal: ctl.signal });
    const total = +r.headers.get('Content-Length') || 0;
    const reader = r.body.getReader();
    const chunks = [];
    let got = 0, last = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value); got += value.length;
      dlProg[id] = total ? got / total : -1;
      if (performance.now() - last > 400) { last = performance.now(); refreshDl(id); }
    }
    const blob = new Blob(chunks, { type: mimeFor(ep.audio, r.headers.get('Content-Type')) });
    if (blob.size < 50000) throw new Error('El archivo descargado está vacío');
    await idbSet(id, { blob, at: now() });
    downloaded.add(id);
    dlMeta[id] = { size: blob.size, at: now() };
    jset(LS.dl, dlMeta);
    toast('Descargado: ' + short(ep.title, 32));
  } catch (e) {
    if (e.name !== 'AbortError') toast('Descarga fallida: ' + (e.message || e));
  } finally {
    delete dlProg[id]; delete dlCtl[id];
    refreshDl(id);
    refreshStorageInfo();
  }
}
function cancelDl(id) {
  delete dlProg[id];
  dlCtl[id]?.abort();
  refreshDl(id);
}
async function deleteDl(id) {
  try { await idbDel(id); } catch (e) { console.warn(e); }
  downloaded.delete(id); delete dlMeta[id]; jset(LS.dl, dlMeta);
  refreshDl(id); refreshStorageInfo();
}
function dlBtn(id) {
  const a = `data-dl-id="${id}"`;
  if (dlProg[id] !== undefined) {
    const p = dlProg[id];
    return `<button class="icon-btn dl busy" ${a} data-act="cancel-dl" data-id="${id}" aria-label="Cancelar descarga">${p >= 0 ? Math.round(p * 100) + '%' : '…'}</button>`;
  }
  if (downloaded.has(id)) return `<button class="icon-btn dl done" ${a} data-act="del-dl" data-id="${id}" aria-label="Descargado. Tocar para borrar">${icon('check')}</button>`;
  return `<button class="icon-btn dl" ${a} data-act="dl" data-id="${id}" aria-label="Descargar">${icon('down')}</button>`;
}
function refreshDl(id) {
  document.querySelectorAll(`[data-dl-id="${CSS.escape(id)}"]`).forEach((el) => { el.outerHTML = dlBtn(id); });
}
function storageUsed() { return Object.values(dlMeta).reduce((a, m) => a + (m.size || 0), 0); }
function refreshStorageInfo() {
  const el = $('#storage-info');
  if (el) el.textContent = `${downloaded.size} episodio${downloaded.size === 1 ? '' : 's'} descargado${downloaded.size === 1 ? '' : 's'}, ${fmtBytes(storageUsed())}`;
}

/* =====================================================================
   Reproductor
   ===================================================================== */
const A = $('#audio');
let cur = null, queue = [], qi = -1, ready = false, objUrl = null, triedProxy = false;
let lastSave = 0, lastPosState = 0, scrubbing = false, startAt = 0;

function proxyUrl(u) { return cfg.worker.replace(/\/+$/, '') + '/audio?url=' + encodeURIComponent(u) + '&k=' + encodeURIComponent(cfg.key); }

async function playEp(id, q) {
  const ep = findEp(id);
  if (!ep) return;
  queue = q && q.length ? q : [id];
  qi = Math.max(0, queue.indexOf(id));
  await loadEp(ep, true);
}
async function loadEp(ep, autoplay) {
  saveCurrentPos();
  ready = false; triedProxy = false;
  cur = ep;
  cfg.last = { id: ep.id, queue, qi }; saveCfg();
  if (objUrl) { URL.revokeObjectURL(objUrl); objUrl = null; }
  let src = ep.audio;
  if (downloaded.has(ep.id)) {
    try {
      const rec = await idbGet(ep.id);
      if (rec && rec.blob) { objUrl = URL.createObjectURL(rec.blob); src = objUrl; }
    } catch (e) { console.warn(e); }
  }
  const p = state.pos[ep.id];
  startAt = p && !p.done && p.t > 5 ? p.t : 0;
  A.src = src;
  A.addEventListener('loadedmetadata', () => {
    ready = true;
    A.playbackRate = cfg.rate;
    if (startAt && Math.abs(A.currentTime - startAt) > 1) { try { A.currentTime = startAt; } catch {} }
    onTime();
  }, { once: true });
  A.playbackRate = cfg.rate;
  setMedia(ep);
  renderMini(); renderPlayer(); render();
  if (autoplay) { try { await A.play(); } catch (e) { console.warn(e); } }
}
function saveCurrentPos() {
  if (!cur || !ready || !isFinite(A.duration) || !A.duration) return;
  const t = A.currentTime, d = A.duration;
  const done = d - t < 15 || t / d > 0.98;
  state.pos[cur.id] = { t: Math.floor(t), d: Math.floor(d), done, at: now() };
  lastSave = performance.now();
  touch();
}
function skip(d) {
  if (!cur) return;
  const dur = isFinite(A.duration) ? A.duration : 1e9;
  A.currentTime = Math.min(dur, Math.max(0, A.currentTime + d));
}
function togglePlay() {
  if (!cur) return;
  if (A.paused) A.play().catch((e) => console.warn(e)); else A.pause();
}
function setPlaying(on) {
  $('#mini [data-act="toggle-play"]') && ($('#mini [data-act="toggle-play"]').innerHTML = icon(on ? 'pause' : 'play'));
  $('#player [data-act="toggle-play"]') && ($('#player [data-act="toggle-play"]').innerHTML = icon(on ? 'pause' : 'play'));
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = on ? 'playing' : 'paused';
}
function onTime() {
  if (!cur || !ready) return;
  const d = A.duration || cur.dur || 0, t = A.currentTime;
  const pct = d ? Math.min(100, (t / d) * 100) : 0;
  const mb = $('#mini-bar'); if (mb) mb.style.width = pct + '%';
  if (!scrubbing) updateScrubUI(t, d);
  if (performance.now() - lastSave > 5000) saveCurrentPos();
  if (performance.now() - lastPosState > 1000 && 'mediaSession' in navigator && d && isFinite(d)) {
    lastPosState = performance.now();
    try { navigator.mediaSession.setPositionState({ duration: d, position: Math.min(t, d), playbackRate: A.playbackRate || 1 }); } catch {}
  }
}
function updateScrubUI(t, d) {
  const r = $('#p-range'), c = $('#p-cur'), l = $('#p-total');
  if (!r) return;
  const pct = d ? (t / d) * 100 : 0;
  r.value = d ? Math.round((t / d) * 1000) : 0;
  r.style.setProperty('--pct', pct + '%');
  c.textContent = fmtTime(t);
  l.textContent = d ? '/ ' + fmtTime(d) : '';
}
function onEnded() {
  if (!cur) return;
  state.pos[cur.id] = { t: Math.floor(A.duration || 0), d: Math.floor(A.duration || 0), done: true, at: now() };
  touch();
  const finished = cur.id;
  if (cfg.autoDelete && downloaded.has(finished)) deleteDl(finished);
  if (qi + 1 < queue.length) {
    qi++;
    const next = findEp(queue[qi]);
    if (next) loadEp(next, true);
  } else {
    setPlaying(false);
    render();
  }
}
function onAudioError() {
  if (!cur) return;
  if (objUrl && A.src === objUrl) {
    toast('La descarga está dañada. Se borra y se reproduce en línea.');
    const id = cur.id; deleteDl(id);
    A.src = cur.audio; A.play().catch(() => {});
    return;
  }
  if (!triedProxy && cfgOK() && navigator.onLine) {
    triedProxy = true;
    const t = ready ? A.currentTime : startAt;
    A.src = proxyUrl(cur.audio);
    A.addEventListener('loadedmetadata', () => { ready = true; A.playbackRate = cfg.rate; if (t) { try { A.currentTime = t; } catch {} } onTime(); }, { once: true });
    A.play().catch(() => {});
    return;
  }
  toast(navigator.onLine ? 'No se puede reproducir este episodio' : 'Sin conexión. Descarga el episodio para escucharlo sin red.');
}
A.addEventListener('play', () => setPlaying(true));
A.addEventListener('pause', () => { setPlaying(false); saveCurrentPos(); render(); });
A.addEventListener('timeupdate', onTime);
A.addEventListener('ended', onEnded);
A.addEventListener('error', onAudioError);
A.addEventListener('durationchange', () => { if (ready) onTime(); });

function setMedia(ep) {
  if (!('mediaSession' in navigator)) return;
  const s = state.shows[ep.showId];
  const art = ep.image || s?.image;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: ep.title, artist: s?.title || '', album: s?.title || '',
    artwork: art ? [{ src: art, sizes: '512x512' }] : [],
  });
}
(function mediaKeys() {
  if (!('mediaSession' in navigator)) return;
  const h = (a, f) => { try { navigator.mediaSession.setActionHandler(a, f); } catch {} };
  h('play', () => A.play());
  h('pause', () => A.pause());
  h('seekbackward', () => skip(-SKIP));
  h('seekforward', () => skip(SKIP));
  // AirPods: doble pulsación = siguiente, triple = anterior. Aquí se convierten en +30 s y -30 s
  h('nexttrack', () => skip(SKIP));
  h('previoustrack', () => skip(-SKIP));
  h('seekto', (d) => { if (d.seekTime != null) A.currentTime = d.seekTime; });
})();

function prevEp() {
  if (!cur) return;
  if (A.currentTime > 5 || qi <= 0) { A.currentTime = 0; return; }
  qi--;
  const e = findEp(queue[qi]);
  if (e) loadEp(e, true);
}
function nextEp() {
  if (!cur) return;
  if (qi + 1 < queue.length) { qi++; const e = findEp(queue[qi]); if (e) loadEp(e, true); }
  else toast('Es el último episodio de la lista');
}
function cycleRate() {
  const i = RATES.indexOf(cfg.rate);
  cfg.rate = RATES[(i + 1) % RATES.length];
  saveCfg();
  A.playbackRate = cfg.rate;
  const b = $('#p-rate'); if (b) b.textContent = cfg.rate + '×';
}

/* =====================================================================
   Interfaz: vistas
   ===================================================================== */
let route = { tab: 'shows' };
let ui = { q: '', rss: '', worker: cfg.worker, key: cfg.key, searching: false };
let searchRes = null;
let askRes = null;

const back = `<button class="icon-btn" data-act="back" aria-label="Volver">${icon('chevl')}</button>`;
const empty = (t, p, a) => `<div class="empty"><h2>${esc(t)}</h2><p>${esc(p)}</p>${a || ''}</div>`;
function cover(url, title, cls) {
  const hue = parseInt(hash(title || 'x'), 36) % 360;
  const ini = (title || '?').replace(/[^\p{L}\p{N} ]/gu, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return `<span class="${cls}" style="--h:${hue}"><b>${esc(ini)}</b>${url ? `<img src="${esc(url)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}</span>`;
}
function epCover(ep, cls = 'thumb') {
  const s = state.shows[ep.showId];
  return cover(ep.image || s?.image, s?.title || ep.title, cls);
}

function viewShows() {
  const shows = visibleShows();
  if (!shows.length) {
    return `<div class="page"><header class="top"><h1>Programas</h1></header>${empty('Aún no tienes programas', 'Busca un programa por su nombre o pega su dirección RSS en Ajustes.', '<button class="btn primary" data-act="tab" data-tab="settings">Añadir programas</button>')}</div>`;
  }
  const cards = shows.map((s) => {
    const last = feeds[s.id]?.episodes?.[0];
    return `<button class="show" data-act="open-show" data-id="${s.id}">${cover(s.image, s.title, 'cover')}<span class="show-title">${esc(s.title)}</span><span class="show-sub">${last ? fmtDate(last.pub) : loading[s.id] ? 'Cargando…' : 'Sin cargar'}</span></button>`;
  }).join('');
  return `<div class="page"><header class="top"><h1>Programas</h1><button class="icon-btn" data-act="refresh-all" aria-label="Actualizar todos">${icon('refresh')}</button></header><div class="grid">${cards}</div></div>`;
}

function epRow(ep, o = {}) {
  const p = state.pos[ep.id];
  const pct = p && p.d ? Math.min(100, Math.round((p.t / p.d) * 100)) : 0;
  const on = cur && cur.id === ep.id;
  const s = state.shows[ep.showId];
  const first = (o.list || o.dl) && s ? s.title : '';
  const second = o.dl ? fmtBytes(dlMeta[ep.id]?.size || 0) : [fmtDate(ep.pub), fmtDur(ep.dur)].filter(Boolean).join(', ');
  const meta = [first, second].filter(Boolean).join(' - ');
  let stateTxt = p && p.done ? 'Escuchado' : pct > 0 ? 'Va por ' + fmtTime(p.t) : '';
  if (!stateTxt && ep.gone && !downloaded.has(ep.id) && !o.list && !o.dl) stateTxt = 'Retirado del RSS';
  const isSel = !!(o.sel && sel.has(ep.id));
  let lead = '', side = '';
  if (o.list) {
    lead = `<button class="grip" data-grip="1" aria-label="Mantén pulsado y arrastra para cambiar el orden">${icon('grip')}</button>`;
    side = dlBtn(ep.id);
  } else if (!o.dl) {
    side = `<button class="icon-btn" data-act="add-to-list" data-id="${ep.id}" aria-label="Añadir a una lista">${icon('plus')}</button>${dlBtn(ep.id)}`;
  }
  const lst = o.list ? ` data-list="${o.list}" data-i="${o.i}" data-lp="1"` : ' data-lp="1"';
  const swipe = o.list ? ` data-swipe="item" data-list="${o.list}" data-epid="${ep.id}"` : '';
  const under = o.list ? `<div class="swipe-under" aria-hidden="true">${icon('trash')}</div>` : '';
  return `<li class="ep${o.list ? ' swipe' : ''}${on ? ' on' : ''}${isSel ? ' sel' : ''}"${swipe}>${under}<div class="row">${lead}<button class="ep-main" data-act="open-ep" data-id="${ep.id}"${lst}>${epCover(ep)}<span class="ep-text"><span class="ep-title">${esc(ep.title)}</span><span class="ep-meta">${esc(meta)}</span>${stateTxt ? `<span class="ep-state">${stateTxt}</span>` : ''}${pct > 0 && !(p && p.done) ? `<span class="bar"><i style="width:${pct}%"></i></span>` : ''}</span></button><div class="ep-side">${side}</div></div></li>`;
}

/* Barra superior mientras se selecciona (sin círculos: el episodio se ve en gris) */
function selBar(kind) {
  const b = (act, ic, label) => `<button class="icon-btn" data-act="${act}" aria-label="${label}">${icon(ic)}</button>`;
  const btns = kind === 'list'
    ? b('sel-all', 'checkall', 'Seleccionar todos') + b('sel-dl', 'down', 'Descargar seleccionados') + b('sel-remove', 'trash', 'Quitar seleccionados')
    : kind === 'show'
      ? b('sel-all', 'checkall', 'Seleccionar todos los que se ven') + b('sel-dl', 'down', 'Descargar seleccionados') + b('sel-add', 'plus', 'Añadir seleccionados a una lista')
      : b('sel-all', 'checkall', 'Seleccionar todos') + b('sel-remove', 'trash', 'Borrar seleccionados');
  return `<header class="top sub sel-bar"><button class="icon-btn" data-act="sel-cancel" aria-label="Cancelar selección">${icon('close')}</button><b class="sel-count">${sel.size} seleccionado${sel.size === 1 ? '' : 's'}</b><div class="top-actions">${btns}</div></header>`;
}

function showEpsToShow(s) {
  const all = feeds[s.id]?.episodes || [];
  const q = (ui.epq || '').trim();
  const matches = filterEps(all, q);
  const limit = ui.epN || (q ? 100 : 40);
  return { all, q, matches, shown: matches.slice(0, limit) };
}
function showListHtml(s) {
  const { all, q, matches, shown } = showEpsToShow(s);
  const selecting = sel.size > 0;
  if (!all.length) {
    return loading[s.id] ? '<p class="muted pad">Cargando episodios…</p>' : '<p class="muted pad">No hay episodios guardados. Conéctate y toca actualizar.</p>';
  }
  const oldest = all.length ? all[all.length - 1].pub : 0;
  const since = oldest ? `, el más antiguo de ${fmtDate(oldest)}` : '';
  const count = q
    ? `<p class="muted tip">${matches.length} episodio${matches.length === 1 ? '' : 's'} con «${esc(q)}»${matches.length > shown.length ? `, se ven ${shown.length}` : ''}. Hay ${all.length} cargados${since}.</p>`
    : `<p class="muted tip">${all.length} episodios cargados${since}.</p>`;
  const more = matches.length > shown.length
    ? `<button class="btn wide" style="margin-top:12px" data-act="more-eps">Ver más episodios</button>` : '';
  const none = q && !matches.length ? '<p class="muted pad">Ningún episodio coincide. Prueba con menos palabras.</p>' : '';
  return `${count}${none}<ul class="eps">${shown.map((e) => epRow(e, { sel: selecting })).join('')}</ul>${more}`;
}
function viewShow() {
  const s = state.shows[route.show];
  if (!s || s.del) return viewShows();
  const selecting = sel.size > 0;
  const head = selecting
    ? selBar('show')
    : `<header class="top sub">${back}<div class="top-actions"><button class="icon-btn" data-act="refresh-show" data-id="${s.id}" aria-label="Actualizar">${icon('refresh')}</button><button class="icon-btn" data-act="remove-show" data-id="${s.id}" aria-label="Quitar programa">${icon('trash')}</button></div></header>`;
  const hasEps = (feeds[s.id]?.episodes || []).length > 0;
  return `<div class="page">${head}
  <div class="hero">${cover(s.image, s.title, 'cover lg')}<div><h1 class="hero-title">${esc(s.title)}</h1><p class="muted">${esc(s.author || '')}</p></div></div>
  ${hasEps ? `<input class="field" data-bind="epq" type="text" placeholder="Buscar en los episodios…" value="${esc(ui.epq || '')}" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="search" aria-label="Buscar en los episodios">` : ''}
  ${hasEps && !selecting && !ui.epq ? '<p class="muted tip">Toca un episodio para ver su descripción. Mantenlo pulsado para seleccionar varios.</p>' : ''}
  <div id="show-eps">${showListHtml(s)}</div></div>`;
}
function updateShowList() {
  const s = state.shows[route.show], box = $('#show-eps');
  if (s && box) box.innerHTML = showListHtml(s);
}

function viewLists() {
  const ls = visibleLists();
  const body = ls.length
    ? `<ul class="cards" data-kind="lists">${ls.map((l) => {
        const n = l.items.length, d = l.items.filter((id) => downloaded.has(id)).length;
        return `<li class="swipe" data-swipe="list" data-id="${l.id}"><div class="swipe-under" aria-hidden="true">${icon('trash')}</div><div class="row"><button class="grip" data-grip="1" aria-label="Mantén pulsado y arrastra para cambiar el orden">${icon('grip')}</button><button class="card" data-act="open-list" data-id="${l.id}"><span class="card-title">${esc(l.name)}</span><span class="card-sub">${n} ${n === 1 ? 'episodio' : 'episodios'}${n ? `, ${d} descargado${d === 1 ? '' : 's'}` : ''}</span></button></div></li>`;
      }).join('')}</ul>`
    : empty('Todavía no tienes listas', 'Crea una y añade los episodios que quieras escuchar mientras corres.', '<button class="btn primary" data-act="new-list">Crear lista</button>');
  return `<div class="page"><header class="top"><h1>Listas</h1><button class="icon-btn" data-act="new-list" aria-label="Nueva lista">${icon('plus')}</button></header>${body}</div>`;
}

function viewList() {
  const l = state.playlists[route.list];
  if (!l || l.del) return viewLists();
  const selecting = sel.size > 0;
  const rows = l.items.map((id, i) => {
    const ep = findEp(id) || { id, title: 'Episodio no disponible', showId: '' };
    return epRow(ep, { list: l.id, i, n: l.items.length, sel: selecting });
  }).join('');
  const actions = l.items.length
    ? `<div class="list-actions"><button class="btn primary" data-act="list-play" data-id="${l.id}">${icon('play')} Reproducir</button><button class="btn" data-act="list-dl-all" data-id="${l.id}">${icon('down')} Descargar todo</button></div>`
    : '';
  const head = selecting
    ? selBar('list')
    : `<header class="top sub">${back}<div class="top-actions"><button class="icon-btn" data-act="list-menu" data-id="${l.id}" aria-label="Más opciones">${icon('more')}</button></div></header>`;
  return `<div class="page">${head}
  <h1 class="hero-title" style="font-size:28px;margin-bottom:12px">${esc(l.name)}</h1>
  ${selecting ? '' : actions}
  ${l.items.length ? `<ul class="eps compact" data-kind="items">${rows}</ul>` : empty('Lista vacía', 'Abre un programa y toca + en los episodios que quieras añadir.', '<button class="btn primary" data-act="tab" data-tab="shows">Ver programas</button>')}</div>`;
}

function downloadedIds() {
  return Array.from(downloaded).sort((a, b) => (dlMeta[b]?.at || 0) - (dlMeta[a]?.at || 0));
}
function viewDownloads() {
  const ids = downloadedIds();
  const selecting = sel.size > 0;
  const total = ids.reduce((a, id) => a + (dlMeta[id]?.size || 0), 0);
  const head = selecting ? selBar('dl') : `<header class="top sub">${back}<div class="top-actions"></div></header>`;
  const rows = ids.map((id) => epRow(findEp(id) || { id, title: 'Episodio descargado', showId: '' }, { dl: true, sel: selecting })).join('');
  return `<div class="page">${head}
  <h1 class="hero-title" style="font-size:28px;margin-bottom:4px">Descargas</h1>
  <p class="muted" style="margin-bottom:10px">${ids.length} episodio${ids.length === 1 ? '' : 's'}, ${fmtBytes(total)}</p>
  ${ids.length ? `<ul class="eps compact">${rows}</ul>` : empty('No hay descargas', 'Descarga episodios desde un programa o una lista para escucharlos sin conexión.', '')}</div>`;
}

function viewSettings() {
  const isIOS = /iphone|ipad/i.test(navigator.userAgent);
  const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  const hint = !standalone
    ? `<div class="hint">${isIOS ? 'Para instalarla: en Safari toca Compartir y después Añadir a pantalla de inicio.' : 'Para instalarla: en Chrome abre el menú y toca Instalar aplicación.'} Abre siempre la app desde el icono.</div>`
    : '';
  const mine = visibleShows();
  const results = searchRes
    ? searchRes.length
      ? `<ul class="results">${searchRes.map((r, i) => {
          const has = state.shows[hash(r.feed)] && !state.shows[hash(r.feed)].del;
          return `<li class="result">${cover(r.image, r.title, 'thumb')}<span class="ep-text"><span class="ep-title">${esc(r.title)}</span><span class="ep-meta">${esc(r.author || '')}</span></span><button class="btn" data-act="add-result" data-i="${i}" ${has ? 'disabled' : ''}>${has ? 'Añadido' : 'Añadir'}</button></li>`;
        }).join('')}</ul>`
      : '<p class="status">No se encontró nada. Prueba con otro nombre o pega el RSS.</p>'
    : '';
  return `<div class="page"><header class="top"><h1>Ajustes</h1></header>
  <section class="sect"><h2>Servidor y sincronización</h2><p>Dirección del puente y clave. Hay que ponerlas en cada móvil.</p>
    <input class="field" data-bind="worker" placeholder="https://podcast-puente.tuusuario.workers.dev" value="${esc(ui.worker)}" autocapitalize="off" autocorrect="off" spellcheck="false" inputmode="url" aria-label="Dirección del servidor">
    <input class="field" data-bind="key" type="password" placeholder="Clave" value="${esc(ui.key)}" autocapitalize="off" autocorrect="off" aria-label="Clave">
    <button class="btn primary wide" data-act="save-cfg">Guardar y sincronizar</button>
    <p class="status" id="sync-status">${syncLabel()}</p></section>
  <section class="sect"><h2>Añadir programa</h2><p>Busca por nombre. Si no aparece, pega la dirección RSS.</p>
    <div class="inline"><input class="field" data-bind="q" placeholder="Más de uno, Espacio en blanco…" value="${esc(ui.q)}" aria-label="Buscar programa" enterkeyhint="search"><button class="btn primary" data-act="search" ${ui.searching ? 'disabled' : ''}>${ui.searching ? 'Buscando…' : 'Buscar'}</button></div>
    ${results}
    <div class="inline" style="margin-top:12px"><input class="field" data-bind="rss" placeholder="https://…/feed.xml" value="${esc(ui.rss)}" autocapitalize="off" autocorrect="off" spellcheck="false" inputmode="url" aria-label="Dirección RSS"><button class="btn" data-act="add-rss">Añadir</button></div></section>
  <section class="sect"><h2>Mis programas</h2>
    ${mine.length ? `<ul class="results" style="margin-top:6px">${mine.map((s) => `<li class="result">${cover(s.image, s.title, 'thumb')}<span class="ep-text"><span class="ep-title">${esc(s.title)}</span></span><button class="icon-btn" data-act="remove-show" data-id="${s.id}" aria-label="Quitar ${esc(s.title)}">${icon('trash')}</button></li>`).join('')}</ul>` : '<p>Todavía no hay ninguno.</p>'}</section>
  <section class="sect"><h2>Descargas</h2><div class="dl-line"><p id="storage-info"></p><button class="btn" data-act="open-dl">Ver episodios</button></div>
    <label class="switch"><span>Borrar la descarga al terminar un episodio</span><input type="checkbox" data-act="toggle-autodel" ${cfg.autoDelete ? 'checked' : ''}></label>
    <button class="btn danger wide" data-act="clear-dl" style="margin-top:8px">Borrar todas las descargas</button></section>
  <section class="sect"><h2>Aplicación</h2><div class="dl-line"><p>Versión ${APP_VERSION}</p><button class="btn" data-act="update-app">Actualizar la app</button></div>
    <p class="status">Borra la copia guardada de la app y la vuelve a cargar. No toca tus descargas, listas ni programas.</p></section>
  ${hint}</div>`;
}

function renderView() {
  if (drag) return;
  const v = $('#view');
  if (document.activeElement && document.activeElement.matches('#view input[type="text"], #view input:not([type]), #view input[type="password"]')) return;
  const key = JSON.stringify([route.tab, route.show, route.list, route.dl]);
  const keep = v.dataset.key === key ? v.scrollTop : 0;
  let html;
  if (route.show) html = viewShow();
  else if (route.list) html = viewList();
  else if (route.dl) html = viewDownloads();
  else if (route.tab === 'lists') html = viewLists();
  else if (route.tab === 'settings') html = viewSettings();
  else html = viewShows();
  v.innerHTML = html;
  v.dataset.key = key;
  v.scrollTop = keep;
  if (route.tab === 'settings' && !route.show && !route.list && !route.dl) refreshStorageInfo();
}
function renderTabs() {
  const t = route.show ? 'shows' : route.list ? 'lists' : route.tab;
  const items = [['shows', 'Programas', 'shows'], ['lists', 'Listas', 'lists'], ['settings', 'Ajustes', 'gear']];
  $('#tabs').innerHTML = items.map(([k, label, ic]) => `<button data-act="tab" data-tab="${k}" ${t === k ? 'aria-current="page"' : ''}>${icon(ic)}<span>${label}</span></button>`).join('');
}
function renderMini() {
  const m = $('#mini');
  if (!cur) { m.hidden = true; return; }
  const s = state.shows[cur.showId];
  m.hidden = false;
  m.innerHTML = `<button class="mini-main" data-act="open-player">${epCover(cur)}<span class="mini-text"><span class="mini-title">${esc(cur.title)}</span><span class="mini-sub">${esc(s?.title || '')}</span></span></button>
    <button class="icon-btn pn" data-act="ep-prev" aria-label="Episodio anterior">${icon('prev')}</button>
    <button class="icon-btn skip" data-act="skip" data-d="-${SKIP}" aria-label="Retroceder ${SKIP} segundos">${icon('back')}</button>
    <button class="icon-btn play" data-act="toggle-play" aria-label="Reproducir o pausar">${icon(A.paused ? 'play' : 'pause')}</button>
    <button class="icon-btn skip" data-act="skip" data-d="${SKIP}" aria-label="Adelantar ${SKIP} segundos">${icon('fwd')}</button>
    <button class="icon-btn pn" data-act="ep-next" aria-label="Episodio siguiente">${icon('next')}</button>
    <div class="mini-bar"><i id="mini-bar"></i></div>`;
  onTime();
}
function renderPlayer() {
  const p = $('#player');
  if (!cur) { p.hidden = true; return; }
  const s = state.shows[cur.showId];
  p.innerHTML = `<div class="p-top"><button class="icon-btn" data-act="close-player" aria-label="Cerrar reproductor">${icon('chevd')}</button><span>Reproduciendo</span><button class="icon-btn" data-act="add-to-list" data-id="${cur.id}" aria-label="Añadir a una lista">${icon('plus')}</button></div>
    ${epCover(cur, 'cover p-cover')}
    <h2 class="p-title">${esc(cur.title)}</h2><p class="p-show">${esc(s?.title || '')}</p>
    <div class="p-time"><b id="p-cur">0:00</b><span id="p-total"></span></div>
    <input id="p-range" type="range" min="0" max="1000" value="0" aria-label="Posición">
    <div class="transport">
      <button class="icon-btn pn" data-act="ep-prev" aria-label="Episodio anterior">${icon('prev')}</button>
      <button class="icon-btn skip" data-act="skip" data-d="-${SKIP}" aria-label="Retroceder ${SKIP} segundos">${icon('back')}</button>
      <button class="icon-btn play" data-act="toggle-play" aria-label="Reproducir o pausar">${icon(A.paused ? 'play' : 'pause')}</button>
      <button class="icon-btn skip" data-act="skip" data-d="${SKIP}" aria-label="Adelantar ${SKIP} segundos">${icon('fwd')}</button>
      <button class="icon-btn pn" data-act="ep-next" aria-label="Episodio siguiente">${icon('next')}</button>
    </div>
    <div class="transport2">
      <button class="icon-btn rate" id="p-rate" data-act="rate" aria-label="Velocidad">${cfg.rate}×</button>
      ${dlBtn(cur.id)}
    </div>`;
  onTime();
}
function render() { renderView(); renderTabs(); renderMini(); if (playerOpen) renderPlayer(); }

/* Navegación */
let playerOpen = false;
function go(r, push = true) {
  try { document.activeElement && document.activeElement.blur && document.activeElement.blur(); } catch {}
  if (sel.size) { sel.clear(); selPushed = false; }
  route = r;
  if (push) history.pushState(r, '');
  render();
  enter();
}
function enter() { if (route.show) refreshShow(route.show); }
window.addEventListener('popstate', (e) => {
  const st = e.state || { tab: 'shows' };
  if (playerOpen && !st.player) { playerOpen = false; $('#player').hidden = true; return; }
  if (st.player) { return; }
  if (selPushed && !st.sel) { selPushed = false; sel.clear(); route = st; render(); return; }
  if (st.sel) { return; }
  route = st; render(); enter();
});
function openPlayer() {
  if (!cur) return;
  playerOpen = true;
  history.pushState({ ...route, player: true }, '');
  renderPlayer();
  $('#player').hidden = false;
}
function closePlayer() { if (playerOpen) history.back(); }

/* Hojas y avisos */
function sheet(html) {
  const el = $('#sheet');
  el.innerHTML = `<div class="scrim" data-act="close-sheet"></div><div class="panel" role="dialog" aria-modal="true">${html}</div>`;
  el.hidden = false;
}
function closeSheet() {
  $('#sheet').hidden = true; $('#sheet').innerHTML = '';
  if (askRes) { const r = askRes; askRes = null; r(null); }
}
function askText(title, value = '', ok = 'Guardar') {
  return new Promise((res) => {
    sheet(`<h2>${esc(title)}</h2><input id="ask-in" class="field" value="${esc(value)}" maxlength="60" autocomplete="off"><div class="row-btns"><button class="btn" data-act="ask-cancel">Cancelar</button><button class="btn primary" data-act="ask-ok">${esc(ok)}</button></div>`);
    askRes = res;
    setTimeout(() => $('#ask-in')?.focus(), 60);
  });
}
function confirmBox(title, text, ok, danger = false) {
  return new Promise((res) => {
    sheet(`<h2>${esc(title)}</h2>${text ? `<p>${esc(text)}</p>` : ''}<div class="row-btns"><button class="btn" data-act="ask-cancel">Cancelar</button><button class="btn ${danger ? 'danger' : 'primary'}" data-act="ask-ok">${esc(ok)}</button></div>`);
    askRes = res;
  });
}
let pendingIds = [], pendingSel = false;
function pickListSheet(ids, fromSel = false) {
  pendingIds = ids; pendingSel = fromSel;
  const ls = visibleLists();
  const n = ids.length;
  const rows = ls.map((l) => {
    const has = ids.filter((id) => l.items.includes(id)).length;
    const tag = !has ? String(l.items.length) : n === 1 ? 'ya está' : `${has} de ${n} ya están`;
    return `<li><button data-act="add-to" data-list="${l.id}">${esc(l.name)}<span>${tag}</span></button></li>`;
  }).join('');
  sheet(`<h2>${n > 1 ? `Añadir ${n} episodios a una lista` : 'Añadir a una lista'}</h2>${ls.length ? `<ul class="sheet-list">${rows}</ul>` : ''}<button class="btn wide" data-act="new-list-add">${icon('plus')} Nueva lista</button>`);
}
let toastT;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('on'), 3200);
}

/* =====================================================================
   Acciones (delegación de eventos)
   ===================================================================== */
async function doSearch() {
  const q = ui.q.trim();
  if (!q) return;
  if (!cfgOK()) { toast('Primero configura el servidor y la clave'); return; }
  document.activeElement?.blur?.();
  ui.searching = true; render();
  try {
    try { searchRes = await (await api('/search?term=' + encodeURIComponent(q))).json(); }
    catch (e1) {
      // Si el puente falla (p. ej. Apple limita sus peticiones), se busca directamente desde este navegador
      console.warn('Búsqueda por el puente falló:', e1.message);
      searchRes = await itunesDirect(q);
    }
  } catch (e) { toast('No se pudo buscar. Prueba en unos minutos o pega el RSS.'); searchRes = null; }
  ui.searching = false; render();
}
function itunesDirect(term) {
  return new Promise((resolve, reject) => {
    const cb = 'itcb' + uid();
    const s = document.createElement('script');
    const clean = () => { clearTimeout(timer); delete window[cb]; s.remove(); };
    const timer = setTimeout(() => { clean(); reject(new Error('Tiempo agotado')); }, 10000);
    window[cb] = (d) => {
      clean();
      resolve((d.results || []).filter((r) => r.feedUrl).map((r) => ({
        title: r.collectionName, author: r.artistName, image: r.artworkUrl600 || r.artworkUrl100 || '', feed: r.feedUrl,
      })));
    };
    s.onerror = () => { clean(); reject(new Error('No se pudo buscar')); };
    s.src = 'https://itunes.apple.com/search?media=podcast&entity=podcast&country=ES&limit=15&term=' + encodeURIComponent(term) + '&callback=' + cb;
    document.head.appendChild(s);
  });
}
async function addRss() {
  const url = ui.rss.trim();
  if (!/^https?:\/\//i.test(url)) { toast('Pega una dirección que empiece por https://'); return; }
  if (!cfgOK()) { toast('Primero configura el servidor y la clave'); return; }
  document.activeElement?.blur?.();
  toast('Leyendo el RSS…');
  try {
    const p = await fetchFeed(url);
    if (addShow({ title: p.title || url, author: p.author, image: p.image, feed: url })) { ui.rss = ''; render(); }
  } catch (e) { toast(e.message); }
}

const actions = {
  tab: (el) => { const t = el.dataset.tab; if (!route.show && !route.list && route.tab === t) { $('#view').scrollTop = 0; return; } go({ tab: t }); },
  back: () => history.back(),
  'open-show': (el, id) => { ui.epq = ''; ui.epN = 0; go({ tab: 'shows', show: id }); },
  'open-list': (el, id) => go({ tab: 'lists', list: id }),
  'refresh-all': async () => { toast('Actualizando programas…'); await refreshAll(true); toast('Programas actualizados'); },
  'refresh-show': (el, id) => refreshShow(id, true),
  'remove-show': async (el, id) => {
    const s = state.shows[id];
    if (!(await confirmBox('Quitar programa', `Se quitará "${s?.title}". Los episodios que tengas en listas se mantienen.`, 'Quitar', true))) return;
    closeSheet(); removeShow(id);
    if (route.show === id) history.back(); else render();
  },
  'open-ep': (el, id) => {
    if (sel.size) { toggleSel(id); return; }
    openEpSheet(id, el.dataset.list, el.dataset.i);
  },
  'play-sheet': (el, id) => {
    const l = el.dataset.list && state.playlists[el.dataset.list];
    closeSheet();
    if (l) playEp(id, l.items.slice(+el.dataset.i)); else playEp(id);
  },
  'ep-prev': () => prevEp(),
  'ep-next': () => nextEp(),
  'open-dl': () => go({ tab: 'settings', dl: true }),
  'update-app': async () => {
    toast('Actualizando la app…');
    try {
      if ('serviceWorker' in navigator) (await navigator.serviceWorker.getRegistrations()).forEach((r) => r.unregister());
      if (window.caches) (await caches.keys()).forEach((k) => caches.delete(k));
    } catch (e) { console.warn(e); }
    setTimeout(() => location.reload(), 500);
  },
  'add-to-list': (el, id) => pickListSheet([id]),
  'add-to': (el) => {
    const ids = pendingIds.slice(), fromSel = pendingSel;
    closeSheet(); addManyToList(el.dataset.list, ids);
    if (fromSel) exitSel(); else render();
  },
  'new-list-add': async () => {
    const ids = pendingIds.slice(), fromSel = pendingSel;
    const name = await askText('Nombre de la lista', '', 'Crear');
    if (!name) return;
    const lid = newList(name); addManyToList(lid, ids);
    if (fromSel) exitSel(); else render();
  },
  'new-list': async () => {
    const name = await askText('Nombre de la lista', '', 'Crear');
    if (!name) return;
    const lid = newList(name); go({ tab: 'lists', list: lid });
  },
  'toggle-sel': (el, id) => toggleSel(id),
  'sel-cancel': () => exitSel(),
  'sel-all': () => {
    unfocus();
    let ids = [];
    if (route.dl) ids = downloadedIds();
    else if (route.show) { const s = state.shows[route.show]; ids = s ? showEpsToShow(s).shown.map((e) => e.id) : []; }
    else { const l = state.playlists[route.list]; ids = l ? l.items.slice() : []; }
    if (ids.length && ids.every((x) => sel.has(x))) { exitSel(); return; }
    ids.forEach((x) => sel.add(x)); render();
  },
  'sel-add': () => pickListSheet(Array.from(sel), true),
  'more-eps': () => { const q = (ui.epq || '').trim(); ui.epN = (ui.epN || (q ? 100 : 40)) + 60; updateShowList(); },
  'sel-dl': () => { const n = sel.size; Array.from(sel).forEach(enqueueDl); toast(`Descargando ${n} episodio${n === 1 ? '' : 's'}`); exitSel(); },
  'sel-remove': () => {
    const n = sel.size, ids = Array.from(sel);
    if (route.dl) {
      sheet(`<h2>${n} episodio${n === 1 ? '' : 's'} descargado${n === 1 ? '' : 's'}</h2>
        <p>"Borrar la descarga" libera espacio, pero el episodio se queda en sus listas. "Borrar episodio y descarga" también lo quita de todas las listas.</p>
        <div class="row-stack"><button class="btn danger wide" data-act="dl-del-files">Borrar la descarga</button>
        <button class="btn danger wide" data-act="dl-del-all">Borrar episodio y descarga</button>
        <button class="btn wide" data-act="close-sheet">Cancelar</button></div>`);
      return;
    }
    const withDl = ids.filter((x) => downloaded.has(x) && !inOtherLists(x, route.list)).length;
    const shared = ids.filter((x) => downloaded.has(x) && inOtherLists(x, route.list)).length;
    const extra = withDl ? ` También se borrará ${withDl === 1 ? 'su descarga' : 'la descarga de ' + withDl}.` : '';
    sheet(`<h2>Quitar ${n} episodio${n === 1 ? '' : 's'} de la lista</h2><p>Siguen disponibles en su programa.${extra}${shared ? ' Los que están también en otras listas conservan su descarga.' : ''}</p>
      <div class="row-stack"><button class="btn danger wide" data-act="sel-remove-ok">Quitar de la lista</button>
      <button class="btn wide" data-act="close-sheet">Cancelar</button></div>`);
  },
  'sel-remove-ok': () => removeSelected(),
  'dl-del-files': () => deleteDownloads(Array.from(sel), false),
  'dl-del-all': () => deleteDownloads(Array.from(sel), true),
  'list-menu': (el, id) => sheet(`<h2>${esc(state.playlists[id]?.name || '')}</h2><ul class="sheet-list"><li><button data-act="list-rename" data-id="${id}">Cambiar nombre</button></li><li><button data-act="list-delete" data-id="${id}">Eliminar lista</button></li></ul><button class="btn wide" data-act="close-sheet">Cerrar</button>`),
  'list-rename': async (el, id) => {
    const l = state.playlists[id]; closeSheet();
    const name = await askText('Cambiar nombre', l.name);
    if (!name) return;
    l.name = name; l.mod = now(); touch(); render();
  },
  'list-delete': async (el, id) => {
    const l = state.playlists[id]; closeSheet();
    if (!(await confirmBox('Eliminar lista', `Se eliminará "${l.name}". Las descargas no se borran.`, 'Eliminar', true))) return;
    closeSheet(); l.del = true; l.mod = now(); touch(); history.back();
  },
  'list-play': (el, id) => { const l = state.playlists[id]; if (l.items.length) playEp(l.items[0], l.items.slice()); },
  'list-dl-all': (el, id) => { state.playlists[id].items.forEach(enqueueDl); },
  dl: (el, id) => enqueueDl(id),
  'cancel-dl': (el, id) => cancelDl(id),
  'del-dl': async (el, id) => {
    const ep = findEp(id);
    if (await confirmBox('Borrar descarga', `Se borrará el audio de "${short(ep?.title, 50)}" de este móvil.`, 'Borrar', true)) { closeSheet(); deleteDl(id); }
  },
  'open-player': () => openPlayer(),
  'close-player': () => closePlayer(),
  'toggle-play': () => togglePlay(),
  skip: (el) => skip(+el.dataset.d),
  rate: () => cycleRate(),
  'close-sheet': () => closeSheet(),
  'ask-cancel': () => closeSheet(),
  'ask-ok': () => {
    const input = $('#ask-in');
    const r = askRes; askRes = null;
    const v = input ? input.value.trim() : true;
    closeSheet();
    if (r) r(v || null);
  },
  search: () => doSearch(),
  'add-result': (el) => { const r = searchRes?.[+el.dataset.i]; if (r && addShow(r)) render(); },
  'add-rss': () => addRss(),
  'save-cfg': async () => {
    cfg.worker = ui.worker.trim().replace(/\/+$/, ''); cfg.key = ui.key.trim(); saveCfg();
    if (!cfgOK()) { toast('Rellena la dirección y la clave'); return; }
    try {
      await api('/ping');
    } catch (e) { toast(e.message === 'La clave no es correcta' ? e.message : 'No se puede conectar con el servidor'); return; }
    if (await sync(true)) refreshAll(false);
  },
  'clear-dl': async () => {
    if (!(await confirmBox('Borrar todas las descargas', 'Tendrás que volver a descargar los episodios para escucharlos sin conexión.', 'Borrar todo', true))) return;
    closeSheet();
    for (const id of Array.from(downloaded)) await deleteDl(id);
    render();
  },
};

/* ---------- Selección múltiple en listas ---------- */
const sel = new Set();
let selPushed = false;
const unfocus = () => { try { document.activeElement && document.activeElement.blur && document.activeElement.blur(); } catch {} };
function enterSel(id) {
  unfocus();
  sel.add(id);
  if (!selPushed) { history.pushState({ ...route, sel: true }, ''); selPushed = true; }
  render();
}
function exitSel() {
  unfocus();
  if (selPushed) history.back();           // popstate limpia la selección
  else { sel.clear(); render(); }
}
function toggleSel(id) {
  unfocus();
  if (sel.has(id)) sel.delete(id); else sel.add(id);
  if (!sel.size) exitSel(); else render();
}
function removeSelected() {
  const l = state.playlists[route.list];
  const ids = new Set(sel);
  closeSheet();
  if (!l) return;
  l.items = l.items.filter((x) => !ids.has(x));
  l.mod = now(); touch();
  ids.forEach((x) => { if (downloaded.has(x) && !inOtherLists(x, l.id)) deleteDl(x); });
  toast(`Quitado${ids.size === 1 ? '' : 's'} ${ids.size} episodio${ids.size === 1 ? '' : 's'}`);
  exitSel();
}
async function deleteDownloads(ids, alsoFromLists) {
  closeSheet();
  for (const id of ids) {
    if (alsoFromLists) removeEverywhere(id);
    try { await deleteDl(id); } catch (e) { console.warn(e); }
  }
  toast(alsoFromLists ? `Borrado${ids.length === 1 ? '' : 's'} ${ids.length} episodio${ids.length === 1 ? '' : 's'} y su descarga` : `Borrada${ids.length === 1 ? '' : 's'} ${ids.length} descarga${ids.length === 1 ? '' : 's'}`);
  exitSel();
}
function openEpSheet(id, listId, idx) {
  const ep = findEp(id);
  if (!ep) return;
  const s = state.shows[ep.showId];
  const meta = [s && s.title, fmtDate(ep.pub), fmtDur(ep.dur)].filter(Boolean).join(' - ');
  const desc = ep.desc ? esc(ep.desc).replace(/\n/g, '<br>') : '<span class="muted">Este episodio no tiene descripción.</span>';
  const gone = ep.gone && !downloaded.has(id) ? '<p class="muted small">Este episodio ya no está en el RSS del programa: puede que no se pueda reproducir.</p>' : '';
  const ctx = listId ? ` data-list="${listId}" data-i="${idx}"` : '';
  sheet(`<div class="es-head">${epCover(ep, 'thumb')}<div class="es-text"><h2>${esc(ep.title)}</h2><p>${esc(meta)}</p></div><button class="icon-btn es-play" data-act="play-sheet" data-id="${id}"${ctx} aria-label="Reproducir">${icon('play')}</button></div><div class="desc">${desc}</div>${gone}`);
}

/* Pulsación larga (1 s) sobre un episodio de una lista: empieza la selección */
let lp = null, lpFired = false;
document.addEventListener('pointerdown', (e) => {
  lpFired = false;
  if (sel.size || drag) return;
  const m = e.target.closest('.ep-main[data-lp]');
  if (!m || (e.pointerType === 'mouse' && e.button !== 0)) return;
  const li = m.closest('li');
  const id = m.dataset.id;
  const t = setTimeout(() => { li && li.classList.add('pressing'); }, 120);
  const t2 = setTimeout(() => {
    lp = null; lpFired = true;
    enterSel(id);
  }, 500);
  lp = { pid: e.pointerId, x: e.clientX, y: e.clientY, li, cancel: () => { clearTimeout(t); clearTimeout(t2); li && li.classList.remove('pressing'); } };
});
document.addEventListener('pointermove', (e) => {
  if (lp && e.pointerId === lp.pid && Math.hypot(e.clientX - lp.x, e.clientY - lp.y) > 10) { lp.cancel(); lp = null; }
});
['pointerup', 'pointercancel'].forEach((ev) => document.addEventListener(ev, (e) => {
  if (lp && e.pointerId === lp.pid) { lp.cancel(); lp = null; }
}));
// Si tras soltar no llega ningún clic (la fila se repintó), la marca caduca enseguida
document.addEventListener('pointerup', () => { if (lpFired) setTimeout(() => { lpFired = false; }, 80); });
// El "clic" que llega al soltar tras la pulsación larga no debe reproducir el episodio
document.addEventListener('click', (e) => {
  if (lpFired) { lpFired = false; e.stopPropagation(); e.preventDefault(); }
}, true);
document.addEventListener('contextmenu', (e) => { if (e.target.closest('.ep-main, .grip')) e.preventDefault(); });

/* ---------- Arrastrar para ordenar (rayas de la izquierda) ---------- */
let drag = null;
let sw = null;
document.addEventListener('pointerdown', (e) => {
  const g = e.target.closest('[data-grip]');
  if (!g || sel.size || (e.pointerType === 'mouse' && e.button !== 0)) return;
  const li = g.closest('li');
  const ul = li && li.parentElement;
  const kind = ul && ul.dataset.kind;
  if (!kind) return;
  if (lp) { lp.cancel(); lp = null; }
  sw = null;
  const rows = Array.from(ul.children);
  const view = $('#view');
  const gap = rows.length > 1 ? Math.max(0, rows[1].offsetTop - rows[0].offsetTop - rows[0].offsetHeight) : 0;
  drag = {
    kind, pid: e.pointerId, li, rows, view,
    from: rows.indexOf(li), to: rows.indexOf(li),
    tops: rows.map((r) => r.offsetTop), hs: rows.map((r) => r.offsetHeight),
    h: li.offsetHeight, step: li.offsetHeight + gap, y0: e.clientY, y: e.clientY, s0: view.scrollTop, raf: 0,
  };
  try { g.setPointerCapture(e.pointerId); } catch {}
  li.classList.add('dragging');
  rows.forEach((r) => { if (r !== li) r.classList.add('shifting'); });
  e.preventDefault();
  drag.raf = requestAnimationFrame(dragLoop);
});
function dragLoop() {
  const d = drag;
  if (!d) return;
  const r = d.view.getBoundingClientRect();
  let v = 0;
  if (d.y < r.top + 70) v = -Math.min(14, (r.top + 70 - d.y) / 5);
  else if (d.y > r.bottom - 70) v = Math.min(14, (d.y - (r.bottom - 70)) / 5);
  if (v) d.view.scrollTop += v;
  const dy = d.y - d.y0 + (d.view.scrollTop - d.s0);
  d.li.style.transform = `translateY(${dy}px)`;
  const c = d.tops[d.from] + d.h / 2 + dy;
  let to = d.from;
  for (let i = d.from + 1; i < d.rows.length; i++) if (c > d.tops[i] + d.hs[i] / 2) to = i;
  for (let i = d.from - 1; i >= 0; i--) if (c < d.tops[i] + d.hs[i] / 2) to = i;
  if (to !== d.to) {
    d.to = to;
    d.rows.forEach((row, i) => {
      if (i === d.from) return;
      let t = '';
      if (to > d.from && i > d.from && i <= to) t = `translateY(${-d.step}px)`;
      else if (to < d.from && i < d.from && i >= to) t = `translateY(${d.step}px)`;
      row.style.transform = t;
    });
  }
  d.raf = requestAnimationFrame(dragLoop);
}
document.addEventListener('pointermove', (e) => { if (drag && e.pointerId === drag.pid) drag.y = e.clientY; });
function dragEnd(e) {
  const d = drag;
  if (!d || e.pointerId !== d.pid) return;
  cancelAnimationFrame(d.raf);
  drag = null;
  d.rows.forEach((r) => { r.style.transform = ''; r.classList.remove('shifting', 'dragging'); });
  if (e.type !== 'pointercancel' && d.to !== d.from) { if (d.kind === 'lists') moveList(d.from, d.to); else moveItemTo(route.list, d.from, d.to); }
  render();
}
document.addEventListener('pointerup', dragEnd);
document.addEventListener('pointercancel', dragEnd);

/* ---------- Deslizar a la izquierda: quitar un episodio de la lista / borrar una lista (con confirmación) ---------- */
document.addEventListener('pointerdown', (e) => {
  if (sel.size || drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
  const li = e.target.closest('li[data-swipe]');
  if (!li || e.target.closest('[data-grip], .dl, .icon-btn, input')) return;
  sw = { pid: e.pointerId, li, row: li.querySelector(':scope > .row'), x0: e.clientX, y0: e.clientY, dx: 0, active: false, w: li.offsetWidth || 360 };
});
document.addEventListener('pointermove', (e) => {
  const d = sw;
  if (!d || e.pointerId !== d.pid) return;
  const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
  if (!d.active) {
    if (dx < -12 && Math.abs(dx) > Math.abs(dy) * 1.6) {
      d.active = true; d.li.classList.add('swiping');
      if (lp) { lp.cancel(); lp = null; }
      try { d.li.setPointerCapture(e.pointerId); } catch {}
    } else if (Math.abs(dy) > 12 || dx > 12) { sw = null; return; }
    else return;
  }
  d.dx = Math.min(0, dx);
  d.row.style.transform = `translateX(${d.dx}px)`;
});
function swipeEnd(e) {
  const d = sw;
  if (!d || e.pointerId !== d.pid) return;
  sw = null;
  if (!d.active) return;
  lpFired = true;                                   // el clic de al soltar no debe abrir el episodio
  setTimeout(() => { lpFired = false; }, 120);
  d.li.classList.remove('swiping');
  const far = e.type !== 'pointercancel' && d.dx < -Math.min(140, d.w * 0.4);
  const snap = () => {
    d.row.style.transition = 'transform .18s ease';
    d.row.style.transform = '';
    setTimeout(() => { d.row.style.transition = ''; }, 220);
  };
  if (!far) { snap(); return; }
  if (d.li.dataset.swipe === 'item') {
    d.row.style.transition = 'transform .15s ease';
    d.row.style.transform = 'translateX(-110%)';
    setTimeout(() => removeItemFromList(d.li.dataset.list, d.li.dataset.epid), 150);
  } else {
    snap();
    askDeleteList(d.li.dataset.id);
  }
}
document.addEventListener('pointerup', swipeEnd);
document.addEventListener('pointercancel', swipeEnd);

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled || el.type === 'checkbox') return;
  const fn = actions[el.dataset.act];
  if (fn) fn(el, el.dataset.id, e);
});
document.addEventListener('change', (e) => {
  if (e.target.dataset?.act === 'toggle-autodel') { cfg.autoDelete = e.target.checked; saveCfg(); }
  if (e.target.id === 'p-range') {
    scrubbing = false;
    if (isFinite(A.duration)) A.currentTime = (e.target.value / 1000) * A.duration;
  }
});
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset?.bind) ui[t.dataset.bind] = t.value;
  if (t.dataset?.bind === 'epq') { ui.epN = 0; updateShowList(); }
  if (t.id === 'p-range' && isFinite(A.duration)) {
    scrubbing = true;
    updateScrubUI((t.value / 1000) * A.duration, A.duration);
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const t = e.target;
  if (t.id === 'ask-in') { e.preventDefault(); actions['ask-ok'](); }
  else if (t.dataset?.bind === 'epq') { e.preventDefault(); t.blur(); }
  else if (t.dataset?.bind === 'q') { e.preventDefault(); doSearch(); }
  else if (t.dataset?.bind === 'rss') { e.preventDefault(); addRss(); }
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { saveCurrentPos(); }
  else if (cfgOK()) sync();
});
window.addEventListener('online', () => { if (cfgOK()) sync(); });

/* =====================================================================
   Arranque
   ===================================================================== */
async function boot() {
  await loadFeeds();
  Object.values(feeds).forEach((f) => (f.episodes || []).forEach((e) => epMap.set(e.id, e)));
  await reconcileDownloads();
  history.replaceState(route, '');
  render();
  if (cfg.last && findEp(cfg.last.id)) {
    queue = cfg.last.queue || [cfg.last.id];
    qi = cfg.last.qi || 0;
    await loadEp(findEp(cfg.last.id), false);
  }
  if (cfgOK()) { await sync(); refreshAll(false); }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch((e) => console.warn(e));
}
boot();
