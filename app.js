'use strict';

/* =====================================================================
   Utilidades
   ===================================================================== */
const APP_VERSION = 'v27';
const ES_IOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const DUAL = !ES_IOS;      // Android y demás: dos elementos de audio, el segundo prepara el siguiente episodio (relevo sin silencio)   // en iPhone mandan Siri y los AirPods; en Android, los botones de la pantalla de bloqueo
const RAPIDO = !!window.__PC_RAPIDO;                 // solo para las pruebas automáticas: acorta las esperas
const T_PRIMER_INTENTO = RAPIDO ? 600 : 12000;       // tras una interrupción, primer intento de reanudar
const T_SONDEO = RAPIDO ? 900 : 8000;                // si en este tiempo vuelve a pausarse, la interrupción sigue
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
const LS = { state: 'pc.state', cfg: 'pc.cfg', feeds: 'pc.feeds', dl: 'pc.dl', log: 'pc.log' };
const jget = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const jset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.warn(e); } };

// Estado que se sincroniza entre dispositivos
let state = Object.assign({ shows: {}, playlists: {}, episodes: {}, pos: {} }, jget(LS.state, {}));
// Configuración de este dispositivo
let cfg = Object.assign({ worker: '', key: '', rate: 1, autoDelete: false, lastSync: 0, last: null, keepAlive: true, keepAliveUser: false, npMode: 'time' }, jget(LS.cfg, {}));
if (!cfg.keepAliveUser) cfg.keepAlive = ES_IOS;      // en Android no aporta nada con el reproductor de dos elementos; en iPhone se mantiene      // salvo que el usuario la haya cambiado a mano, el audio entre episodios va activado
let feeds = {};                          // showId -> { at, episodes: [] } (se guarda en IndexedDB)
let dlMeta = jget(LS.dl, {});            // epId -> { size, at }
let downloaded = new Set();              // epId descargados en este dispositivo (IndexedDB)
const dlProg = {};                       // epId -> progreso (0..1, -1 = en cola/desconocido)
const dlCtl = {};
const loading = {};
const epMap = new Map();

/* ---------- Registro de reproducción: apunta lo que ocurre al cambiar de episodio, para poder averiguar fallos ---------- */
let plogBuf = jget(LS.log, []), plogT = 0;
function plog(m) {
  plogBuf.push([Date.now(), (document.visibilityState || '?')[0], String(m)]);
  if (plogBuf.length > 700) plogBuf.splice(0, plogBuf.length - 700);
  clearTimeout(plogT);
  plogT = setTimeout(() => jset(LS.log, plogBuf), 1500);
}
function plogText(n = 700) {
  const hd = `Podcasts ${typeof APP_VERSION === 'string' ? APP_VERSION : ''} - ${navigator.userAgent}\n(v = pantalla visible, h = pantalla bloqueada o app en segundo plano)\n`;
  return hd + plogBuf.slice(-n).map(([t, v, m]) => `${new Date(t).toLocaleTimeString('es-ES', { hour12: false })} ${v} ${m}`).join('\n');
}
const saveState = () => jset(LS.state, state);
const saveCfg = () => jset(LS.cfg, cfg);
const cfgOK = () => !!(cfg.worker && cfg.key);
const findEp = (id) => epMap.get(id) || state.episodes[id] || (dlMeta[id] && dlMeta[id].ep) || null;
const visibleShows = () => Object.values(state.shows).filter((s) => !s.del).sort((a, b) => (a.added || 0) - (b.added || 0));
const visibleLists = () => Object.values(state.playlists).filter((l) => !l.del).sort((a, b) => (a.order ?? a.added ?? 0) - (b.order ?? b.added ?? 0));

/* IndexedDB (audios descargados) */
let dbp;
function db() {
  return (dbp ||= new Promise((res, rej) => {
    const r = indexedDB.open('podcast-db', 3);
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains('audio')) d.createObjectStore('audio');
      if (!d.objectStoreNames.contains('feeds')) d.createObjectStore('feeds');
      if (!d.objectStoreNames.contains('imgs')) d.createObjectStore('imgs');
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

/* ---------- Portadas guardadas en el móvil: sin parpadeos y también sin conexión ---------- */
const imgMem = new Map();      // dirección remota -> dirección local (blob:)
const imgTried = new Set();    // direcciones ya intentadas en esta sesión
const imgQueue = [];
let imgActive = 0, imgTrimT = 0;
const imgPut = (k, v) => tx('readwrite', (st) => st.put(v, k), 'imgs');
async function loadImgCache() {
  try {
    const keys = await tx('readonly', (st) => st.getAllKeys(), 'imgs');
    const vals = await tx('readonly', (st) => st.getAll(), 'imgs');
    keys.forEach((k, i) => { if (vals[i] && vals[i].blob) imgMem.set(k, URL.createObjectURL(vals[i].blob)); });
  } catch (e) { console.warn('No se pudieron leer las portadas guardadas', e); }
}
function imgSrc(url) {
  if (!url) return '';
  const m = imgMem.get(url);
  if (m) return m;
  if (!imgTried.has(url) && /^https?:/i.test(url) && cfgOK() && navigator.onLine) { imgTried.add(url); imgQueue.push(url); pumpImgs(); }
  return url;
}
function pumpImgs() {
  while (imgActive < 3 && imgQueue.length) {
    const url = imgQueue.shift();
    imgActive++;
    cacheImage(url).catch(() => {}).finally(() => { imgActive--; pumpImgs(); });
  }
}
async function shrinkImage(blob, max) {
  try {
    const bmp = await createImageBitmap(blob);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(bmp, 0, 0, c.width, c.height);
    if (bmp.close) bmp.close();
    const out = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.85));
    if (out) return out;
  } catch (e) { /* se usa la original si es pequeña */ }
  if (blob.size < 250000) return blob;
  throw new Error('imagen demasiado grande');
}
async function cacheImage(url) {
  const r = await api('/audio?url=' + encodeURIComponent(url));   // el puente sirve cualquier archivo; aquí, la imagen
  const blob = await shrinkImage(await r.blob(), 240);
  await imgPut(url, { blob, at: now() });
  imgMem.set(url, URL.createObjectURL(blob));
  clearTimeout(imgTrimT);
  imgTrimT = setTimeout(async () => {
    try {
      const keys = await tx('readonly', (st) => st.getAllKeys(), 'imgs');
      if (keys.length > 700) for (const k of keys.slice(0, keys.length - 600)) { await tx('readwrite', (st) => st.delete(k), 'imgs'); imgMem.delete(k); }
    } catch {}
  }, 4000);
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
// Las copias de episodios solo se sincronizan mientras estén en alguna lista (si no, el estado crece sin parar
// y el puente rechaza lo que pase de ~900 KB)
function pruneEpisodes() {
  const used = new Set();
  visibleLists().forEach((l) => l.items.forEach((id) => used.add(id)));
  Object.keys(state.episodes).forEach((id) => { if (!used.has(id)) delete state.episodes[id]; });
}
function mergeState(a, b) {
  b = norm(b);
  return {
    shows: mergeMaps(a.shows, b.shows, 'mod'),
    playlists: mergeMaps(a.playlists, b.playlists, 'mod'),
    episodes: mergeMaps(a.episodes, b.episodes, 'mod'),
    pos: mergeMaps(a.pos, b.pos, 'at'),
  };
}

let syncTimer = null, syncAt = 0, syncing = false, syncBackoff = 0;
function touch() { saveState(); syncSoon(); }
// Posición de reproducción: se guarda en el móvil enseguida, pero se sube a la nube de tarde en tarde
// (el plan gratuito de Cloudflare permite 1.000 escrituras al día)
function touchPos() { saveState(); syncSoon(5 * 60e3); }
function syncSoon(ms = 30000) {
  if (!cfgOK()) return;
  const due = now() + ms;
  if (syncTimer && syncAt <= due) return;          // ya hay una subida programada igual de pronto o antes
  clearTimeout(syncTimer);
  syncAt = due;
  syncTimer = setTimeout(() => { syncTimer = null; sync(); }, ms);
}
function setSyncStatus(t) { const el = $('#sync-status'); if (el) el.textContent = t; }
function syncLabel() {
  return cfg.lastSync ? 'Última sincronización: ' + new Date(cfg.lastSync).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Sin sincronizar todavía';
}
async function sync(manual = false) {
  if (!cfgOK()) { if (manual) toast('Configura el servidor y la clave'); return false; }
  if (syncing) return false;
  if (!manual && now() < syncBackoff) return false;
  if (!navigator.onLine) { if (manual) toast('Sin conexión'); return false; }
  syncing = true;
  setSyncStatus('Sincronizando…');
  try {
    const remote = norm(await (await api('/sync')).json());
    const before = stable(state);
    state = mergeState(state, remote);
    pruneEpisodes();
    if (stable(state) !== before) {
      saveState(); render();
      visibleShows().filter((x) => !feeds[x.id]).forEach((x) => refreshShow(x.id, false));
    }
    if (stable(state) !== stable(remote)) {
      await api('/sync', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(state) });
    }
    cfg.lastSync = now(); saveCfg();
    syncBackoff = 0;
    setSyncStatus(syncLabel());
    if (manual) toast('Sincronizado');
    return true;
  } catch (e) {
    if (/429|too many|l[ií]mite|limit/i.test(e.message)) {
      syncBackoff = now() + 30 * 60e3;
      setSyncStatus('Sincronización en pausa: se ha alcanzado el límite diario de Cloudflare. Se reintenta sola más tarde.');
      if (manual) toast('Límite diario de Cloudflare alcanzado');
    } else {
      setSyncStatus('No se pudo sincronizar: ' + e.message);
      if (manual) toast(e.message);
    }
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
function addManyToList(listId, ids) {
  const l = state.playlists[listId];
  let added = 0, dup = 0;
  if (!l) return { added, dup };
  ids.forEach((id) => {
    const ep = findEp(id);
    if (!ep) return;
    if (l.items.includes(id)) { dup++; return; }
    state.episodes[id] = { ...ep, desc: (ep.desc || '').slice(0, 400), gone: undefined, mod: now() };
    l.items.push(id); added++;
  });
  if (added) { l.mod = now(); touch(); }
  return { added, dup };
}
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
function removeEverywhere(ids) {
  const set = new Set(Array.isArray(ids) ? ids : [ids]);
  visibleLists().forEach((l) => {
    if (l.items.some((x) => set.has(x))) { l.items = l.items.filter((x) => !set.has(x)); l.mod = now(); }
  });
  touch();
}
// Quita los episodios de todas las listas y borra sus descargas; siguen disponibles en su programa
async function purgeEpisodes(ids) {
  removeEverywhere(ids);
  for (const id of ids) {
    if (downloaded.has(id)) { try { await deleteDl(id); } catch (e) { console.warn(e); } }
  }
}
async function removeItemFromList(listId, epId) {
  if (!visibleLists().some((l) => l.items.includes(epId))) return;
  await purgeEpisodes([epId]);
  toast('Quitado de todas las listas');
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
// Primero se descarga a través del puente. Si el servidor del audio lo rechaza (RNE, por ejemplo),
// se intenta directamente desde este navegador, como al escuchar. Si tampoco se puede, se avisa.
async function fetchAudioForDownload(ep, signal) {
  try {
    return await api('/audio?url=' + encodeURIComponent(ep.audio), { signal });
  } catch (e) {
    if (e.name === 'AbortError' || !/^Error (401|403|404|410|451)$/.test(e.message)) throw e;
    try {
      const r = await fetch(ep.audio, { signal, referrerPolicy: 'no-referrer' });
      if (!r.ok) throw new Error('Error ' + r.status);
      return r;
    } catch (e2) {
      if (e2.name === 'AbortError') throw e2;
      throw new Error(`ese servidor no deja descargar el audio desde la app (${e.message.toLowerCase()}). Se puede escuchar en línea, pero no sin conexión`);
    }
  }
}
async function doDl(id) {
  const ep = findEp(id);
  const ctl = new AbortController();
  dlCtl[id] = ctl;
  try {
    if (!ep) throw new Error('Episodio no encontrado');
    const r = await fetchAudioForDownload(ep, ctl.signal);
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
    dlMeta[id] = { size: blob.size, at: now(), ep: { id: ep.id, showId: ep.showId, title: ep.title, audio: ep.audio, pub: ep.pub, dur: ep.dur, image: ep.image || '' } };   // datos para mostrarlo en Descargas aunque salga de las listas y del RSS
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
  plog('descarga borrada: «' + short((findEp(id) || {}).title || id, 40) + '»');
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
function dlMark(id) {
  const a = `data-dl-id="${id}" data-dl-kind="mark"`;
  if (dlProg[id] !== undefined) { const p = dlProg[id]; return `<span class="dl-mark busy" ${a}>${p >= 0 ? Math.round(p * 100) + '%' : '…'}</span>`; }
  if (downloaded.has(id)) return `<span class="dl-mark done" ${a} role="img" aria-label="Descargado">${icon('check')}</span>`;
  return `<span class="dl-mark" ${a}></span>`;
}
function refreshDl(id) {
  const v = $('#view'); if (v) v._html = null;
  document.querySelectorAll(`[data-dl-id="${CSS.escape(id)}"]`).forEach((el) => { el.outerHTML = el.dataset.dlKind === 'mark' ? dlMark(id) : dlBtn(id); });
}
function storageUsed() { return Object.values(dlMeta).reduce((a, m) => a + (m.size || 0), 0); }
function refreshStorageInfo() {
  const el = $('#storage-info');
  if (el) el.textContent = `${downloaded.size} episodio${downloaded.size === 1 ? '' : 's'} descargado${downloaded.size === 1 ? '' : 's'}, ${fmtBytes(storageUsed())}`;
}

/* =====================================================================
   Reproductor
   ===================================================================== */
let A = $('#audio');           // elemento de audio activo
let B = null;                  // segundo elemento (solo DUAL): el que prepara el siguiente episodio
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
let preload = null;                       // { id, url }: el siguiente episodio descargado, ya leído de la memoria
let handingOff = false, lastDurChange = 0, handoffTimer = 0, lastTU = 0, tuGap = 250, lastNear = 0, blobRetried = false, needsKick = false;
// Las direcciones de archivos descargados no se anulan al momento: el audio que se está dejando podría seguir leyéndolas
function retireUrl(u) { if (u) setTimeout(() => { try { URL.revokeObjectURL(u); } catch {} }, 20000); }
async function preloadNext() {
  const nid = queue[qi + 1];
  if (!nid || !downloaded.has(nid) || (preload && preload.id === nid)) return;
  try {
    const rec = await idbGet(nid);
    if (rec && rec.blob && queue[qi + 1] === nid) {
      if (preload) retireUrl(preload.url);
      preload = { id: nid, url: URL.createObjectURL(rec.blob) };
      plog('siguiente descargado preparado en memoria');
    }
  } catch (e) { console.warn(e); }
}
async function playWithRetry() {
  for (let i = 0; i < 3; i++) {
    try { await A.play(); plog('play() correcto' + (i ? ` (intento ${i + 1})` : '')); needsKick = false; return true; }
    catch (e) {
      plog('play() falló: ' + (e && e.name) + ' ' + ((e && e.message) || ''));
      console.warn(e);
      if (e && e.name === 'NotAllowedError') break;           // el sistema exige tocar play: no se puede forzar
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  needsKick = true;                                            // se reintenta al volver a la app
  if (!A.paused) return true;
  setPlaying(false);
  if (document.visibilityState === 'visible') toast('Pulsa play para continuar');
  return false;
}
// Al volver a la app (o al primer toque), si un episodio no llegó a arrancar, se reintenta
// A veces iOS da el audio por «sonando» sin que se oiga (por ejemplo, al volver a ponerse los AirPods): pausar y reanudar lo arregla
let lastProgressAt = 0, lastCT = -1, lastKickAt = 0, lastPlayCallAt = 0, stallKicks = 0;
function restartPlayback(origen) {
  if (!cur || now() - lastKickAt < 3000) return;
  lastKickAt = now();
  plog(`el audio figura sonando pero no se oye o no avanza (${origen}): se reinicia la reproducción`);
  selfPause = now();
  try { A.pause(); } catch {}
  setTimeout(() => { if (wantPlay && cur) { lastPlayCallAt = now(); A.play().catch((e) => plog('reinicio: play() falló (' + (e && e.name) + ')')); } }, 300);
}
function kickIfNeeded() {
  if (!needsKick || !wantPlay || !cur || !A.paused) return;
  plog('reintento de reproducción al volver a la app');
  A.play().then(() => { needsKick = false; }).catch((e) => { plog('el reintento falló: ' + (e && e.name)); if (e && e.name === 'NotSupportedError') needsKick = false; });
}
async function loadEp(ep, autoplay) {
  clearTimeout(handoffTimer); handoffTimer = 0;
  sysPause = null; clearTimeout(resumeT);
  saveCurrentPos();
  ready = false; triedProxy = false; blobRetried = false;
  cur = ep;
  retireUrl(objUrl); objUrl = null;
  if (preload && preload.id !== ep.id) { retireUrl(preload.url); preload = null; }
  let src = ep.audio, origen = 'red';
  if (DUAL && standby && standby.id === ep.id && standby.blobUrl) {
    objUrl = standby.blobUrl; src = objUrl; standby.blobUrl = null; origen = 'descarga (preparada en el segundo reproductor)';
  } else if (downloaded.has(ep.id)) {
    if (preload && preload.id === ep.id) { objUrl = preload.url; src = objUrl; preload = null; origen = 'descarga (ya preparada)'; }   // sin esperar a la memoria
    else {
      try {
        const rec = await idbGet(ep.id);
        if (rec && rec.blob) { objUrl = URL.createObjectURL(rec.blob); src = objUrl; origen = 'descarga (leída ahora)'; }
      } catch (e) { console.warn(e); }
    }
  }
  if (DUAL && standby && standby.id === ep.id) dropStandby();
  plog(`cargar «${short(ep.title, 40)}» desde ${origen}`);
  const p = state.pos[ep.id];
  startAt = p && !p.done && p.t > 5 ? p.t : 0;
  A.src = src;
  handingOff = false;
  A.addEventListener('loadedmetadata', () => {
    ready = true;
    A.playbackRate = cfg.rate;
    if (startAt && Math.abs(A.currentTime - startAt) > 1) { try { A.currentTime = startAt; } catch {} }
    onTime();
  }, { once: true });
  A.playbackRate = cfg.rate;
  setMedia(ep);
  renderMini(); renderPlayer(); markPlaying();
  setWant(!!autoplay);
  if (autoplay) await playWithRetry();
  if (DUAL) prepareStandby(); else preloadNext();
}
/* ---------- Segundo reproductor (Android y demás): el siguiente episodio se prepara con el sonido ya cargado y empieza
   un poco antes de que acabe el actual, que se desvanece. Nunca se cambia la fuente de un audio que está sonando
   (en el Samsung, Android pausaba el audio justo después de ese cambio). ---------- */
let standby = null, fading = null, pendingPrepare = false;
const standbyReady = () => !!(standby && standby.ready && !standby.error && standby.el && standby.el.readyState >= 2);
function newAudioEl() {
  const el = document.createElement('audio');
  el.preload = 'auto'; el.setAttribute('playsinline', ''); el.style.display = 'none';
  document.body.appendChild(el);
  wireAudio(el);
  return el;
}
function dropStandby() {
  const st = standby; standby = null;
  if (!st) return;
  if (st.blobUrl) retireUrl(st.blobUrl);
  const el = st.el;
  if (el && el !== A && el !== fading) { try { el.pause(); el.removeAttribute('src'); el.load(); } catch {} }
}
function prepareStandby() {
  if (!DUAL) return;
  if (fading) { pendingPrepare = true; return; }                  // el elemento anterior aún se está desvaneciendo
  const nid = queue[qi + 1];
  if (!nid) { dropStandby(); return; }
  if (standby && standby.id === nid) return;
  dropStandby();
  const ep = findEp(nid);
  if (!ep) return;
  const st = { id: nid, ep, ready: false, error: false, el: null, url: '', blobUrl: null, startAt: 0 };
  standby = st;
  (async () => {
    let src = ep.audio;
    if (downloaded.has(nid)) {
      try { const rec = await idbGet(nid); if (rec && rec.blob) { st.blobUrl = URL.createObjectURL(rec.blob); src = st.blobUrl; } } catch (e) { console.warn(e); }
    }
    if (standby !== st) { if (st.blobUrl) retireUrl(st.blobUrl); return; }
    if (!B) B = newAudioEl();
    const el = B;
    st.el = el; st.url = src;
    const p = state.pos[nid];
    st.startAt = p && !p.done && p.t > 5 ? p.t : 0;
    el.addEventListener('canplay', () => {
      if (standby !== st || st.ready) return;
      st.ready = true;
      if (st.startAt) { try { el.currentTime = st.startAt; } catch {} }
      plog(`siguiente preparado en el segundo reproductor: «${short(ep.title, 40)}»`);
    }, { once: true });
    el.addEventListener('error', () => { if (standby === st) { st.error = true; plog('segundo reproductor: error al preparar el siguiente'); } }, { once: true });
    try { el.volume = 1; el.playbackRate = cfg.rate; } catch {}
    el.src = src;
    try { el.load(); } catch {}
  })();
}
function fadeOutAndRelease(el, blobUrl) {
  let v = 1, hecho = false;
  const fin = () => {
    if (hecho) return;
    hecho = true; clearInterval(iv); clearTimeout(tm);
    try { el.pause(); el.removeAttribute('src'); el.load(); el.volume = 1; } catch {}
    retireUrl(blobUrl);
    if (fading === el) fading = null;
    if (pendingPrepare) { pendingPrepare = false; prepareStandby(); }
  };
  const iv = setInterval(() => { v -= 0.25; try { el.volume = Math.max(0, v); } catch {} if (v <= 0) fin(); }, 100);
  const tm = setTimeout(fin, 2000);                              // por si los temporizadores se espacian en segundo plano
}
// Pasa al episodio que ya está preparado: empieza el segundo elemento ANTES de soltar el primero
function swapToStandby(motivo) {
  const st = standby;
  if (!st || !standbyReady()) return false;
  const nb = st.el, old = A, oldObj = objUrl, ep = st.ep;
  const t0 = performance.now();
  let pr;
  try { nb.playbackRate = cfg.rate; pr = nb.play(); } catch (e) { plog('segundo reproductor: play() lanzó ' + (e && e.name)); return false; }
  qi++; cur = ep; objUrl = st.blobUrl; ready = true; triedProxy = false; blobRetried = false; startAt = st.startAt;
  A = nb; B = old; standby = null; fading = old; pendingPrepare = true;
  lastStartAt = lastPlayAt = now(); lastDurChange = performance.now();
  setMedia(ep); renderMini(); renderPlayer(); markPlaying();
  setWant(true);
  plog(`relevo sin silencio (${motivo}) → «${short(ep.title, 40)}»`);
  if (pr && pr.then) {
    pr.then(() => plog(`segundo reproductor: play() correcto (${Math.round(performance.now() - t0)} ms)`))
      .catch((e) => { plog('segundo reproductor: play() falló (' + (e && e.name) + '): se reintenta'); needsKick = true; playWithRetry(); });
  }
  fadeOutAndRelease(old, oldObj);
  return true;
}
function markPlaying() {
  const v = $('#view');
  v._html = null;
  v.querySelectorAll('li.ep[data-epid]').forEach((li) => li.classList.toggle('on', !!cur && li.dataset.epid === cur.id));
}
function saveCurrentPos() {
  if (!cur || !ready || !isFinite(A.duration) || !A.duration) return;
  const t = A.currentTime, d = A.duration;
  const done = d - t < 15 || t / d > 0.98;
  state.pos[cur.id] = { t: Math.floor(t), d: Math.floor(d), done, at: now() };
  lastSave = performance.now();
  touchPos();
}
function skip(d) {
  if (!cur) return;
  const dur = isFinite(A.duration) ? A.duration : 1e9;
  A.currentTime = Math.min(dur, Math.max(0, A.currentTime + d));
}
let wantPlay = false;          // el usuario quiere que suene (pasa a false al pausar a propósito)
let ac = null, kaOsc = null;   // audio inaudible opcional para que iOS no congele la app entre episodios
// iOS añade el estado «interrupted» (tras una llamada o Siri): hay que reanudar tanto ese como «suspended»
function resumeAc() {
  if (!ac || (ac.state !== 'suspended' && ac.state !== 'interrupted')) return;
  try { const p = ac.resume(); if (p && p.catch) p.catch(() => {}); } catch {}
}
function onAcState() {
  plog('audio inaudible: estado «' + (ac && ac.state) + '»');
  if (ac && ac.state === 'interrupted') { noteInterruption('AudioContext'); if (!A.paused) pauseForInterruption(); return; }
  if (wantPlay && cfg.keepAlive && !sysPause && !A.paused) resumeAc();     // durante una llamada o Siri NO se fuerza
}
function unlockAudio() {
  if (!cfg.keepAlive) return;
  try {
    if (!ac) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      ac = new C();
      if (ac.addEventListener) ac.addEventListener('statechange', onAcState);
      plog('audio inaudible preparado: estado «' + ac.state + '»');
    }
    resumeAc();
  } catch (e) { console.warn(e); }
}
function keepAliveSync() {
  try {
    const enMarcha = !A.paused || !ready || handingOff || A.ended || (isFinite(A.duration) && A.duration - A.currentTime < 1.5);
    const on = cfg.keepAlive && wantPlay && ac && !sysPause && enMarcha;
    if (on && !kaOsc) {
      resumeAc();
      const osc = ac.createOscillator(), g = ac.createGain();
      osc.frequency.value = 30; g.gain.value = 0.002;           // 30 Hz a unos -54 dB: inaudible, pero por encima del umbral de silencio del sistema
      osc.connect(g); g.connect(ac.destination); osc.start();
      plog('audio inaudible activado');
      kaOsc = { osc, g };
    } else if (!on && kaOsc) {
      kaOsc.osc.stop(); kaOsc.osc.disconnect(); kaOsc.g.disconnect(); kaOsc = null;
      plog('audio inaudible desactivado');
    }
  } catch (e) { console.warn(e); }
}
function setWant(v) { wantPlay = v; if (!v) { sysPause = null; clearTimeout(resumeT); } keepAliveSync(); }
let sysPause = null, resumeT = 0, selfPause = 0, lastInterruptAt = 0, lastPlayAt = 0, lastStartAt = 0;   // ver «Llamadas, Siri y otras interrupciones»
function pauseByUs() { selfPause = now(); A.pause(); }
function togglePlay() {
  if (!cur) return;
  if (A.paused) { setWant(true); A.play().catch((e) => console.warn(e)); }
  else { setWant(false); pauseByUs(); }
}
function setPlaying(on) {
  $('#mini [data-act="toggle-play"]') && ($('#mini [data-act="toggle-play"]').innerHTML = icon(on ? 'pause' : 'play'));
  $('#player [data-act="toggle-play"]') && ($('#player [data-act="toggle-play"]').innerHTML = icon(on ? 'pause' : 'play'));
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = on ? 'playing' : 'paused';
}
// Motivo por el que NO se puede hacer el relevo ahora (cadena vacía = se puede)
function handoffBlock() {
  if (!cur) return 'sin episodio';
  if (A.paused) return 'en pausa';
  if (handingOff) return 'relevo en curso';
  if (qi + 1 >= queue.length) return 'último de la lista';
  if (!isFinite(A.duration) || A.duration <= 10) return `duración no válida (${A.duration})`;
  if (objUrl && A.src === objUrl) return '';                       // descargado: manda la duración del archivo
  if (cur.dur && Math.abs(A.duration - cur.dur) <= Math.max(20, cur.dur * 0.04)) return '';
  if (performance.now() - lastDurChange > 6000) return '';         // en línea: la duración lleva 6 s sin cambiar
  return `duración aún inestable (RSS ${cur.dur || '?'} s, audio ${Math.round(A.duration)} s)`;
}
const canHandoff = () => !handoffBlock();
function handoffWindow() { return Math.min(2.5, Math.max(DUAL && standbyReady() ? 0.6 : 1.0, (tuGap / 1000) * 1.5 + 0.2)); }   // más ancha si los avisos llegan espaciados
let handoffId = '', handoffDue = 0;
function scheduleHandoff() {
  if (!canHandoff()) return;
  const id = cur.id, rem = A.duration - A.currentTime;
  const delay = Math.max(0, (rem - 0.4) * 1000 / (A.playbackRate || 1));
  const due = performance.now() + delay;
  if (handoffTimer && handoffId === id && handoffDue <= due + 100) return;      // ya hay uno programado igual de pronto
  clearTimeout(handoffTimer);
  handoffId = id; handoffDue = due;
  handoffTimer = setTimeout(() => {
    handoffTimer = 0;
    if (cur && cur.id === id && canHandoff() && A.duration - A.currentTime < handoffWindow() + 0.4) advanceQueue('temporizador');
  }, delay);
}
// Comprueba si toca pasar al siguiente episodio (lo llaman los avisos de progreso y un latido propio)
function checkHandoff(medir) {
  if (!cur || !isFinite(A.duration)) return false;
  const rem = A.duration - A.currentTime;
  if (rem > 0 && rem < 4 && performance.now() - lastNear > 1000) {
    lastNear = performance.now();
    plog(`faltan ${rem.toFixed(1)} s · ventana ${handoffWindow().toFixed(1)} s · ${handoffBlock() || 'relevo posible'}`);
  }
  if (handoffBlock()) return false;
  if (medir) {
    const n = performance.now();
    if (lastTU && n - lastTU < 5000) tuGap = Math.min(3000, Math.max(200, 0.7 * tuGap + 0.3 * (n - lastTU)));
    lastTU = n;
  }
  if (rem > 0 && rem < handoffWindow()) { advanceQueue('ventana'); return true; }
  if (rem < 600) scheduleHandoff();
  return false;
}
setInterval(() => {
  if (!cur || !ready || A.paused || handingOff) return;
  checkHandoff(false);
  if (wantPlay && A.readyState >= 3 && stallKicks < 2 && now() - lastProgressAt > 6000) { stallKicks++; restartPlayback('vigilancia'); }
}, 400);   // por si los avisos de progreso se espacian o se pierden
// Al desbloquear el móvil: si el episodio terminó mientras estaba bloqueado y no se encadenó, se encadena ya
function catchUpAfterHidden() {
  if (!cur || !wantPlay || handingOff || qi + 1 >= queue.length) return;
  const d = A.duration;
  if ((A.ended || (isFinite(d) && d > 10 && d - A.currentTime < 1.2)) && A.paused) advanceQueue('al volver a la app');
}
function onTime() {
  if (!cur || !ready) return;
  if (A.currentTime !== lastCT) { lastCT = A.currentTime; lastProgressAt = now(); stallKicks = 0; }
  const d = A.duration || cur.dur || 0, t = A.currentTime;
  const pct = d ? Math.min(100, (t / d) * 100) : 0;
  const mb = $('#mini-bar'); if (mb) mb.style.width = pct + '%';
  const mc = $('#mini-cur'), md = $('#mini-dur');
  if (mc) { const a = fmtTime(t); if (mc.textContent !== a) mc.textContent = a; }
  if (md) { const b = isFinite(d) ? fmtTime(d) : '0:00'; if (md.textContent !== b) md.textContent = b; }
  if (!scrubbing) updateScrubUI(t, d);
  // Con el móvil bloqueado el aviso de «ha terminado» puede llegar tarde o no llegar, y los avisos de progreso
  // pueden espaciarse: el relevo se hace un poco antes del final, mientras el audio sigue sonando.
  if (checkHandoff(true)) return;
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
function markFinished() {
  state.pos[cur.id] = { t: Math.floor(A.duration || 0), d: Math.floor(A.duration || 0), done: true, at: now() };
  touch();
  if (cfg.autoDelete && downloaded.has(cur.id)) deleteDl(cur.id);
}
function advanceQueue(motivo) {
  if (!cur || handingOff) return;
  clearTimeout(handoffTimer); handoffTimer = 0;
  handingOff = true;
  markFinished();
  if (qi + 1 < queue.length) {
    if (DUAL && standbyReady() && swapToStandby(motivo || '?')) { handingOff = false; return; }
    qi++;
    const next = findEp(queue[qi]);
    if (next) { plog(`relevo (${motivo || '?'}) → «${short(next.title, 40)}»`); loadEp(next, true); return; }
    plog('relevo: no se encuentra el siguiente episodio de la lista');
  }
  handingOff = false;
  setWant(false);
  setPlaying(false);
  render();
}
function onEnded() { plog('evento «ended»'); advanceQueue('fin del audio'); }
function streamFallback(t, porPuente) {
  A.src = porPuente ? proxyUrl(cur.audio) : cur.audio;
  A.addEventListener('loadedmetadata', () => { ready = true; A.playbackRate = cfg.rate; if (t) { try { A.currentTime = t; } catch {} } onTime(); }, { once: true });
  A.play().catch(() => {});
}
async function reloadBlob(ep, t) {
  try {
    const rec = await idbGet(ep.id);
    if (!rec || !rec.blob || !cur || cur.id !== ep.id) throw new Error('el archivo ya no está');
    retireUrl(objUrl);
    objUrl = URL.createObjectURL(rec.blob);
    A.src = objUrl;
    A.addEventListener('loadedmetadata', () => { ready = true; A.playbackRate = cfg.rate; if (t) { try { A.currentTime = t; } catch {} } onTime(); }, { once: true });
    await A.play();
    plog('descarga leída de nuevo: correcto');
  } catch (e) {
    plog('no se pudo leer de nuevo la descarga: ' + e.message);
    if (cur && cur.id === ep.id) { toast('No se pudo leer la descarga: se reproduce en línea'); streamFallback(t, false); }
  }
}
function onAudioError() {
  if (!cur) return;
  const code = A.error ? A.error.code : 0;
  const local = !!(objUrl && A.src === objUrl);
  plog(`ERROR de audio, código ${code} (${local ? 'archivo descargado' : 'en línea'})`);
  const t = ready ? A.currentTime : startAt;
  if (local) {                                                    // la descarga NUNCA se borra por un error de lectura
    if (!blobRetried) { blobRetried = true; reloadBlob(cur, t); return; }
    toast('No se pudo leer la descarga: se reproduce en línea');
    streamFallback(t, false);
    return;
  }
  if (!triedProxy && cfgOK() && navigator.onLine) { triedProxy = true; streamFallback(t, true); return; }
  toast(navigator.onLine ? 'No se puede reproducir este episodio' : 'Sin conexión. Descarga el episodio para escucharlo sin red.');
}
function onPlayEvt() {
  needsKick = false; lastPlayAt = lastStartAt = lastProgressAt = now();
  const sondeando = sysPause && sysPause.resumedAt && now() - sysPause.resumedAt < T_SONDEO + 1000;
  if (!sondeando) { sysPause = null; clearTimeout(resumeT); }     // si es un intento nuestro, se mantiene hasta confirmar que aguanta
  plog('evento «play»'); setWant(true); setPlaying(true);
}
function onPauseEvt() {
  const cambiando = wantPlay && !ready;                           // cambio de episodio en curso: no es una pausa de verdad
  const alFinal = wantPlay && qi + 1 < queue.length && (A.ended || (isFinite(A.duration) && A.duration - A.currentTime < 1));
  const propia = now() - selfPause < 1500;
  const noti = 'mediaSession' in navigator ? ` · notificación «${navigator.mediaSession.playbackState}»` : '';
  const det = ` · ${A.currentTime.toFixed(1)}/${isFinite(A.duration) ? A.duration.toFixed(1) : '?'} s · readyState ${A.readyState}${noti}`;
  plog('evento «pause»' + (cambiando ? ' (cambio de episodio)' : alFinal ? ' (fin, sigue otro)' : propia ? ' (pedida por el usuario)' : det));
  if (!cambiando && !alFinal) setPlaying(false);                 // así Android no retira la notificación entre episodios
  if (!cambiando) { saveCurrentPos(); syncSoon(3000); render(); }
  keepAliveSync();
  if (cambiando || alFinal || !wantPlay || propia) return;       // lo demás es una pausa que no ha pedido ni la app ni el usuario
  if (sysPause && sysPause.resumedAt && now() - sysPause.resumedAt < T_SONDEO + 500) {
    if (!ES_IOS && sysPause.quick && sysPause.tries < 6) {       // Android: el sistema vuelve a pausar tras el intento; se insiste varias veces
      clearTimeout(sysPause.probeT);
      plog(`Android vuelve a pausar tras el intento ${sysPause.tries}: se reintenta`);
      scheduleResume(300 * sysPause.tries);
      return;
    }
    sysPause.callActive = true; clearTimeout(sysPause.probeT);   // se vuelve a interrumpir justo tras nuestro intento: la interrupción sigue
    plog('la interrupción sigue (¿llamada en curso?): no se insiste, se espera a que termine');
    keepAliveSync();
    return;
  }
  systemPaused();
}
function wireAudio(el) {
  const g = (f) => () => { if (el === A) f(); };                  // solo importa lo que dice el elemento activo
  el.addEventListener('play', g(onPlayEvt));
  el.addEventListener('pause', g(onPauseEvt));
  el.addEventListener('timeupdate', g(onTime));
  el.addEventListener('ended', g(onEnded));
  el.addEventListener('error', g(onAudioError));
  ['waiting', 'stalled', 'emptied', 'loadedmetadata'].forEach((n) => el.addEventListener(n, g(() => plog('evento «' + n + '»'))));
  el.addEventListener('durationchange', g(() => { lastDurChange = performance.now(); if (ready) onTime(); }));
}
wireAudio(A);

function setMedia(ep) {
  if (!('mediaSession' in navigator)) return;
  const s = state.shows[ep.showId];
  const art = ep.image || s?.image;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: ep.title, artist: s?.title || '', album: s?.title || '',
    artwork: art ? [{ src: art, sizes: '512x512' }] : [],
  });
}
const fmtSalto = (sg) => { sg = Math.abs(Math.round(sg)); return sg < 60 ? `${sg} s` : sg % 60 === 0 ? `${sg / 60} min` : `${Math.floor(sg / 60)} min ${sg % 60} s`; };
function jump(sg) {
  skip(sg);
  plog(`salto ${sg > 0 ? '+' : '-'}${fmtSalto(sg)}`);
  if (document.visibilityState === 'visible') toast((sg > 0 ? 'Adelantado ' : 'Retrocedido ') + fmtSalto(sg));
}
// Saltos repetidos en pocos segundos: 30 s, 30 s, 1 min y 3 min. Como se suman, el total va siendo 30 s, 1, 2 y 5 min
const SALTOS = [30, 30, 60, 180];
let growIdx = 0, growAt = 0, growDir = 1;
function growJump(dir) {
  const n = now();
  growIdx = n - growAt < 5000 && dir === growDir ? Math.min(growIdx + 1, SALTOS.length - 1) : 0;
  growAt = n; growDir = dir;
  jump(dir * SALTOS[growIdx]);
}
(function mediaKeys() {
  if (!('mediaSession' in navigator)) return;
  // Cada orden se anota en el registro con todos sus datos y el tiempo desde la última interrupción
  const h = (a, f) => {
    try {
      navigator.mediaSession.setActionHandler(a, (d) => {
        const hace = lastInterruptAt ? ` · interrupción hace ${Math.round((now() - lastInterruptAt) / 1000)} s` : '';
        plog(`orden «${a}» ${JSON.stringify(d || {})}${hace} · notificación «${navigator.mediaSession.playbackState}»`);
        f(d || {});
      });
    } catch {}
  };
  // «Adelanta 40 segundos» / «retrocede 5 minutos»: se usa el tiempo que mande el sistema. 10 s es el valor por defecto de
  // Android y 15 s el de iOS; con otros valores se usa el que llegue.
  const tiempo = (d) => (typeof d.seekOffset === 'number' && d.seekOffset > 0 && d.seekOffset !== 10 ? d.seekOffset : SKIP);
  h('play', () => {
    sysPause = null; clearTimeout(resumeT); setWant(true);
    if (cur && !A.paused && now() - lastPlayCallAt > 1500 && now() - lastPlayAt > 1500) { restartPlayback('orden de reanudar con el audio ya en marcha'); return; }
    lastPlayCallAt = now(); A.play().catch(() => {});
  });
  h('pause', () => { setWant(false); pauseByUs(); });
  h('stop', () => { setWant(false); pauseByUs(); });
  // Siri convierte «siguiente pista» / «pista anterior» en un salto estándar de 15 s. Con una lista sonando, ese salto cambia de episodio
  // (si hay otro episodio en esa dirección); con cualquier otro tiempo («adelanta 4 minutos») salta ese tiempo.
  h('seekforward', (d) => {
    if (ES_IOS && d.seekOffset === 15 && qi + 1 < queue.length) { plog('«siguiente pista» de Siri (salto estándar de 15 s) → siguiente episodio'); nextEp(); return; }
    jump(tiempo(d));
  });
  h('seekbackward', (d) => {
    if (ES_IOS && d.seekOffset === 15 && qi > 0) { plog('«pista anterior» de Siri (salto estándar de 15 s) → episodio anterior'); prevEp(); return; }
    jump(-tiempo(d));
  });
  // iPhone: doble y triple pulsación de los AirPods = saltos de tiempo que crecen si se repiten.
  // Android: ⏮ ⏭ de la pantalla de bloqueo y de los AirPods = lo mismo, o episodio anterior / siguiente según el botón del reproductor.
  h('nexttrack', () => { if (ES_IOS || cfg.npMode !== 'episode') growJump(1); else nextEp(); });
  h('previoustrack', () => { if (ES_IOS || cfg.npMode !== 'episode') growJump(-1); else prevEp(); });
  h('seekto', (d) => { if (d.seekTime != null) A.currentTime = d.seekTime; });
})();

/* Llamadas, Siri y otras interrupciones del audio (según lo observado en iPhone):
   - Safari avisa («statechange» de audioSession) sin indicar el estado: un aviso justo antes de que el audio se pause
     marca el comienzo de una interrupción; uno posterior, mientras esperamos, su final.
   - Reanudar demasiado pronto hace sonar la canción durante la llamada. Se espera T_PRIMER_INTENTO y se hace UN intento:
     si el sistema vuelve a pausar el audio enseguida, la interrupción sigue y no se insiste; se espera una señal de fin,
     que WebKit reanude por su cuenta o que lo reanude el usuario.
   - Una pausa SIN señal de interrupción (por ejemplo, quitarse un AirPod) no se reanuda sola, salvo si ocurre nada más
     empezar un episodio (en Android, el sistema a veces lo pausa justo en el relevo). */
let wasInterrupted = false;
function noteInterruption(origen) { lastInterruptAt = now(); plog('señal de interrupción del audio (' + origen + ')'); }
function interruptionEvidence() {
  return now() - lastInterruptAt < 4000 || !!(navigator.audioSession && navigator.audioSession.state === 'interrupted') || !!(ac && ac.state === 'interrupted');
}
function scheduleResume(ms) { clearTimeout(resumeT); resumeT = setTimeout(tryResume, ms); }
function tryResume() {
  const sp = sysPause;
  if (!sp || !wantPlay || !cur) { sysPause = null; keepAliveSync(); return; }
  if (!A.paused) { sysPause = null; keepAliveSync(); return; }
  if (now() - sp.at > 30 * 60e3) { plog('se deja de esperar: han pasado 30 minutos'); sysPause = null; keepAliveSync(); return; }
  if (sp.callActive) return;                                      // la interrupción sigue: se espera una señal de fin
  sp.tries++; sp.resumedAt = now();
  plog(`intento de reanudación ${sp.tries}`);
  A.play().then(() => plog(`reanudación: play() correcto (intento ${sp.tries})`))
    .catch((e) => { plog(`reanudación: play() falló (${e && e.name}, intento ${sp.tries})`); sp.callActive = true; if (e && e.name === 'NotAllowedError') needsKick = true; });
  clearTimeout(sp.probeT);
  sp.probeT = setTimeout(() => {                                  // ¿aguanta sonando, o la interrupción sigue?
    if (sysPause !== sp) return;
    if (!A.paused) { plog('reanudación confirmada: la interrupción había terminado'); sysPause = null; keepAliveSync(); }
    else if (!ES_IOS && sp.quick && sp.tries < 6) scheduleResume(1000);
    else { sp.callActive = true; plog('la interrupción sigue (¿llamada en curso?): se espera a que termine'); }
  }, T_SONDEO);
}
function systemPaused() {
  if (sysPause) return;
  const alEmpezar = now() - lastStartAt < 6000;
  const ev = interruptionEvidence();
  if (ES_IOS) {
    // En iPhone play() funciona incluso con una llamada en curso (la canción sonaría durante la llamada), así que nunca
    // se reanuda por tiempo: solo con un aviso explícito de fin o con la orden de reanudar del sistema o del usuario.
    if (ev) { sysPause = { at: now(), tries: 0, evidencia: true, callActive: true }; keepAliveSync(); plog('pausa del sistema por una interrupción: se espera el aviso de fin o la orden de reanudar'); }
    else plog('pausa del sistema (llamada, Siri, auriculares…): se reanudará con la orden del sistema o la tuya');
    return;
  }
  sysPause = { at: now(), tries: 0, evidencia: ev };
  keepAliveSync();                                                // el audio inaudible no se mantiene durante la interrupción
  if (alEmpezar && !ev) {                                         // Android pausa a veces justo al empezar un episodio: reintento inmediato
    sysPause.quick = true;
    plog('pausa inesperada nada más empezar el episodio: se reintenta enseguida');
    scheduleResume(250);
    return;
  }
  setTimeout(() => {                                              // las señales pueden llegar uno o dos segundos después de la pausa
    const sp = sysPause;
    if (!sp || sp.quick) return;
    if (!sp.evidencia) sp.evidencia = interruptionEvidence();
    if (sp.evidencia) { plog(`pausa del sistema por una interrupción: primer intento de reanudar en ${Math.round(T_PRIMER_INTENTO / 1000)} s`); scheduleResume(Math.max(0, T_PRIMER_INTENTO - 1800)); }
    else { plog('pausa del sistema sin señal de interrupción (¿auricular quitado?): no se reanuda sola'); sysPause = null; keepAliveSync(); }
  }, 1800);
}
function pauseForInterruption() {
  if (!wantPlay || !cur || A.paused || sysPause) return;
  plog('interrupción con el audio sonando: se pausa hasta que termine (Siri, llamada…)');
  sysPause = { at: now(), tries: 0, evidencia: true, callActive: ES_IOS };
  keepAliveSync();
  try { A.pause(); } catch {}
  if (!ES_IOS) scheduleResume(T_PRIMER_INTENTO);                  // respaldo por si nunca llega el aviso de fin (en iPhone no: sonaría durante la llamada)
}
function interruptionEnded(origen) {
  plog('fin de la interrupción del audio (' + origen + ')');
  if (!wantPlay || !cur) return;
  if (!sysPause) sysPause = { at: now(), tries: 0, evidencia: true };
  sysPause.evidencia = true; sysPause.callActive = false;
  scheduleResume(1200);
}
function checkAudioSession() {                                    // por si se perdió el aviso de fin al estar bloqueado el móvil
  const st = navigator.audioSession && navigator.audioSession.state;
  if (wasInterrupted && st && st !== 'interrupted') { wasInterrupted = false; interruptionEnded('al volver a la app'); }
}
if (navigator.audioSession) {
  try { navigator.audioSession.type = 'playback'; } catch {}
  plog('audioSession disponible, estado «' + navigator.audioSession.state + '»');
  navigator.audioSession.addEventListener('statechange', () => {
    const st = navigator.audioSession.state;
    const sonando = !A.paused;
    plog(`audioSession: aviso, estado «${st}», audio ${sonando ? 'sonando' : 'parado'}`);
    if (st === 'interrupted') { wasInterrupted = true; noteInterruption('audioSession'); pauseForInterruption(); return; }
    if (st && wasInterrupted) { wasInterrupted = false; interruptionEnded('audioSession'); return; }
    // Sin estado (lo habitual en Safari de iPhone) el aviso solo acompaña a nuestras propias pausas y reanudaciones:
    // llega igual con una llamada que al pausar a mano, así que no se usa como señal.
  });
} else plog('audioSession NO disponible en este navegador');

function prevEp() {
  if (!cur) return;
  if (qi > 0) { qi--; const e = findEp(queue[qi]); if (e) { loadEp(e, true); return; } }
  A.currentTime = 0;
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
  return `<span class="${cls}" style="--h:${hue}"><b>${esc(ini)}</b>${url ? `<img src="${esc(imgSrc(url))}" alt="" decoding="sync" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}</span>`;
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
    return `<button class="show" data-act="open-show" data-id="${s.id}" data-lp="1">${cover(s.image, s.title, 'cover')}<span class="show-title">${esc(s.title)}</span><span class="show-sub">${last ? fmtDate(last.pub) : loading[s.id] ? 'Cargando…' : 'Sin cargar'}</span></button>`;
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
  const isSel = sel.has(ep.id);
  let lead = '', side = '';
  if (o.list) {
    lead = `<button class="grip" data-grip="1" aria-label="Mantén pulsado y arrastra para cambiar el orden">${icon('grip')}</button>`;
    side = dlMark(ep.id);
  }
  const lst = o.list ? ` data-list="${o.list}" data-i="${o.i}" data-lp="1"` : ' data-lp="1"';
  const swipe = o.list ? ` data-swipe="item" data-list="${o.list}"` : '';
  const under = o.list ? `<div class="swipe-under" aria-hidden="true">${icon('trash')}</div>` : '';
  const inline = !o.list && !o.dl;      // en Programas, «Escuchado» / «Va por…» va junto a la fecha
  const metaHtml = esc(meta) + (inline && stateTxt ? `${meta ? ' - ' : ''}<span class="ep-state-inline">${stateTxt}</span>` : '');
  return `<li class="ep${o.list ? ' swipe' : ''}${on ? ' on' : ''}${isSel ? ' sel' : ''}" data-epid="${ep.id}"${swipe}>${under}<div class="row">${lead}<button class="ep-main" data-act="open-ep" data-id="${ep.id}"${lst}>${epCover(ep)}<span class="ep-text"><span class="ep-title">${esc(ep.title)}</span><span class="ep-meta">${metaHtml}</span>${stateTxt && !inline ? `<span class="ep-state">${stateTxt}</span>` : ''}${pct > 0 && !(p && p.done) ? `<span class="bar"><i style="width:${pct}%"></i></span>` : ''}</span></button>${side ? `<div class="ep-side">${side}</div>` : ''}</div></li>`;
}

/* Barra superior mientras se selecciona (sin círculos: el episodio se ve en gris) */
function selBar(kind) {
  const b = (act, ic, label) => `<button class="icon-btn" data-act="${act}" aria-label="${label}">${icon(ic)}</button>`;
  const btns = kind === 'list'
    ? b('sel-all', 'checkall', 'Seleccionar todos') + b('sel-add', 'plus', 'Añadir seleccionados a una lista') + b('sel-dl', 'down', 'Descargar seleccionados') + b('sel-remove', 'trash', 'Quitar seleccionados')
    : kind === 'show'
      ? b('sel-add', 'plus', 'Añadir seleccionados a una lista') + b('sel-dl', 'down', 'Descargar seleccionados')
      : b('sel-all', 'checkall', 'Seleccionar todos') + b('sel-remove', 'trash', 'Borrar seleccionados');
  return `<header class="top sub sel-bar"><button class="icon-btn" data-act="sel-cancel" aria-label="Cancelar selección">${icon('close')}</button><b class="sel-count">${sel.size} seleccionado${sel.size === 1 ? '' : 's'}</b><div class="top-actions">${btns}</div></header>`;
}

function headHtml() {
  const selecting = sel.size > 0;
  if (route.show) {
    const s = state.shows[route.show];
    if (!s || s.del) return '';
    return selecting ? selBar('show') : `<header class="top sub">${back}<div class="top-actions"><button class="icon-btn" data-act="refresh-show" data-id="${s.id}" aria-label="Actualizar">${icon('refresh')}</button><button class="icon-btn" data-act="remove-show" data-id="${s.id}" aria-label="Quitar programa">${icon('trash')}</button></div></header>`;
  }
  if (route.list) {
    const l = state.playlists[route.list];
    if (!l || l.del) return '';
    return selecting ? selBar('list') : `<header class="top sub">${back}<div class="top-actions"><button class="icon-btn" data-act="list-menu" data-id="${l.id}" aria-label="Más opciones">${icon('more')}</button></div></header>`;
  }
  if (route.dl) return selecting ? selBar('dl') : `<header class="top sub">${back}<div class="top-actions">${downloaded.size ? `<button class="icon-btn" data-act="sel-all" aria-label="Seleccionar todos">${icon('checkall')}</button>` : ''}</div></header>`;
  return '';
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
  return `${count}${none}<ul class="eps tight">${shown.map((e) => epRow(e, { sel: selecting })).join('')}</ul>${more}`;
}
function viewShow() {
  const s = state.shows[route.show];
  if (!s || s.del) return viewShows();
  const hasEps = (feeds[s.id]?.episodes || []).length > 0;
  return `<div class="page${sel.size ? ' selecting' : ''}">${headHtml()}
  <div class="hero">${cover(s.image, s.title, 'cover lg')}<div><h1 class="hero-title">${esc(s.title)}</h1><p class="muted">${esc(s.author || '')}</p></div></div>
  ${hasEps ? `<input class="field" data-bind="epq" type="text" placeholder="Buscar en los episodios…" value="${esc(ui.epq || '')}" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="search" aria-label="Buscar en los episodios">` : ''}
  <div id="show-eps">${showListHtml(s)}</div></div>`;
}
function updateShowList() {
  const s = state.shows[route.show], box = $('#show-eps');
  if (s && box) { box.innerHTML = showListHtml(s); $('#view')._html = null; }
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
  const rows = l.items.map((id, i) => {
    const ep = findEp(id) || { id, title: 'Episodio no disponible', showId: '' };
    return epRow(ep, { list: l.id, i, n: l.items.length });
  }).join('');
  const actions = l.items.length
    ? `<div class="list-actions"><button class="btn primary" data-act="list-play" data-id="${l.id}">${icon('play')} Reproducir</button><button class="btn" data-act="list-dl-all" data-id="${l.id}">${icon('down')} Descargar todo</button></div>`
    : '';
  return `<div class="page${sel.size ? ' selecting' : ''}">${headHtml()}
  <h1 class="hero-title" style="font-size:28px;margin-bottom:12px">${esc(l.name)}</h1>
  ${actions}
  ${l.items.length ? `<ul class="eps compact" data-kind="items">${rows}</ul>` : empty('Lista vacía', 'Abre un programa y toca + en los episodios que quieras añadir.', '<button class="btn primary" data-act="tab" data-tab="shows">Ver programas</button>')}</div>`;
}

function downloadedIds() {
  return Array.from(downloaded).sort((a, b) => (dlMeta[b]?.at || 0) - (dlMeta[a]?.at || 0));
}
function viewDownloads() {
  const ids = downloadedIds();
  const total = ids.reduce((a, id) => a + (dlMeta[id]?.size || 0), 0);
  const rows = ids.map((id) => epRow(findEp(id) || { id, title: 'Episodio descargado', showId: '' }, { dl: true })).join('');
  return `<div class="page${sel.size ? ' selecting' : ''}">${headHtml()}
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
  <section class="sect"><h2>Descargas</h2><div class="dl-line"><p id="storage-info"></p><button class="btn" data-act="open-dl">Ver episodios</button></div>
    <label class="switch"><span>Borrar la descarga al terminar un episodio</span><input type="checkbox" data-act="toggle-autodel" ${cfg.autoDelete ? 'checked' : ''}></label>
    <button class="btn danger wide" data-act="clear-dl" style="margin-top:8px">Borrar todas las descargas</button></section>
  ${ES_IOS
    ? `<section class="sect"><h2>AirPods y Siri</h2><p>AirPods: doble pulsación, +30 s; si repites en 5 segundos se van sumando hasta 1, 2 y 5 min en total; triple, lo mismo hacia atrás. Una pulsación, pausa o play.</p>
    <p class="status">Siri: «adelanta 4 minutos», «retrocede 2 minutos», «pausa», «reanuda» y «siguiente pista» / «pista anterior» (con una lista sonando, cambian de episodio).</p></section>`
    : `<section class="sect"><h2>Botones de la pantalla de bloqueo y AirPods</h2><p>⏪ y ⏩: 30 segundos. ⏮ y ⏭ (y la doble y triple pulsación de los AirPods): saltos de tiempo de 30 s; si repites en 5 segundos se van sumando hasta 1, 2 y 5 min en total. Con el botón «⏮⏭» del reproductor puedes cambiarlos a episodio anterior y siguiente.</p></section>`}
  <section class="sect"><h2>Pantalla bloqueada</h2><p>Mantiene el audio activo entre episodios con un sonido inaudible, para que el móvil no suspenda la app al pasar de un episodio al siguiente con la pantalla bloqueada. Gasta algo más de batería.${ES_IOS ? '' : ' En Android no hace falta: el relevo entre episodios ya usa dos reproductores.'}</p>
    <label class="switch"><span>Mantener activa la reproducción</span><input type="checkbox" data-act="toggle-keepalive" ${cfg.keepAlive ? 'checked' : ''}></label></section>
  <section class="sect"><h2>Registro de reproducción</h2><p>Apunta lo que ocurre al cambiar de episodio. Si algo falla, haz la prueba, pulsa «Copiar» y pégame el texto para ver qué pasó.</p>
    <div class="row-btns"><button class="btn" data-act="log-view">Ver</button><button class="btn" data-act="log-copy">Copiar</button><button class="btn" data-act="log-clear">Borrar</button></div></section>
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
  if (v._html === html && v.dataset.key === key) return;      // nada ha cambiado: no se toca la pantalla
  v.innerHTML = html;
  v._html = html;
  v.dataset.key = key;
  v.scrollTop = keep;
  if (route.tab === 'settings' && !route.show && !route.list && !route.dl) refreshStorageInfo();
}
function renderTabs() {
  const t = route.show ? 'shows' : route.list ? 'lists' : route.tab;
  const items = [['shows', 'Programas', 'shows'], ['lists', 'Listas', 'lists'], ['settings', 'Ajustes', 'gear']];
  const html = items.map(([k, label, ic]) => `<button data-act="tab" data-tab="${k}" ${t === k ? 'aria-current="page"' : ''}>${icon(ic)}<span>${label}</span></button>`).join('');
  const tabs = $('#tabs');
  if (tabs._html !== html) { tabs.innerHTML = html; tabs._html = html; }
}
function renderMini() {
  const m = $('#mini');
  if (!cur) { m.hidden = true; m.dataset.ep = ''; return; }
  m.hidden = false;
  if (m.dataset.ep !== cur.id) renderMiniHtml(m);
  onTime();
}
function renderMiniHtml(m) {
  const s = state.shows[cur.showId];
  m.dataset.ep = cur.id;
  m.innerHTML = `<button class="mini-main" data-act="open-player">${epCover(cur)}<span class="mini-text"><span class="mini-title">${esc(cur.title)}</span><span class="mini-sub">${esc(s?.title || '')}</span></span></button>
    <button class="icon-btn skip" data-act="skip" data-d="-${SKIP}" aria-label="Retroceder ${SKIP} segundos">${icon('back')}</button>
    <button class="icon-btn pn" data-act="ep-prev" aria-label="Episodio anterior">${icon('prev')}</button>
    <button class="icon-btn play" data-act="toggle-play" aria-label="Reproducir o pausar">${icon(A.paused ? 'play' : 'pause')}</button>
    <button class="icon-btn pn" data-act="ep-next" aria-label="Episodio siguiente">${icon('next')}</button>
    <button class="icon-btn skip" data-act="skip" data-d="${SKIP}" aria-label="Adelantar ${SKIP} segundos">${icon('fwd')}</button>
    <div class="mini-prog"><div class="mini-bar"><i id="mini-bar"></i></div><span class="mini-time"><span id="mini-cur">0:00</span> / <span id="mini-dur">${fmtTime(cur.dur || 0)}</span></span></div>`;
}
function renderPlayer() {
  const p = $('#player');
  if (!cur) { p.hidden = true; p.dataset.ep = ''; return; }
  if (p.dataset.ep !== cur.id) renderPlayerHtml(p);
  onTime();
}
const npLabel = () => '⏮⏭ ' + (cfg.npMode === 'episode' ? 'episodio' : 'tiempo');
function renderPlayerHtml(p) {
  const s = state.shows[cur.showId];
  p.dataset.ep = cur.id;
  p.innerHTML = `<div class="p-top"><button class="icon-btn" data-act="close-player" aria-label="Cerrar reproductor">${icon('chevd')}</button><span>Reproduciendo</span><button class="icon-btn" data-act="add-to-list" data-id="${cur.id}" aria-label="Añadir a una lista">${icon('plus')}</button></div>
    ${epCover(cur, 'cover p-cover')}
    <h2 class="p-title">${esc(cur.title)}</h2><p class="p-show">${esc(s?.title || '')}</p>
    <div class="p-time"><b id="p-cur">0:00</b><span id="p-total"></span></div>
    <input id="p-range" type="range" min="0" max="1000" value="0" aria-label="Posición">
    <div class="transport">
      <button class="icon-btn skip" data-act="skip" data-d="-${SKIP}" aria-label="Retroceder ${SKIP} segundos">${icon('back')}</button>
      <button class="icon-btn pn" data-act="ep-prev" aria-label="Episodio anterior">${icon('prev')}</button>
      <button class="icon-btn play" data-act="toggle-play" aria-label="Reproducir o pausar">${icon(A.paused ? 'play' : 'pause')}</button>
      <button class="icon-btn pn" data-act="ep-next" aria-label="Episodio siguiente">${icon('next')}</button>
      <button class="icon-btn skip" data-act="skip" data-d="${SKIP}" aria-label="Adelantar ${SKIP} segundos">${icon('fwd')}</button>
    </div>
    <div class="transport2">
      <button class="icon-btn rate" id="p-rate" data-act="rate" aria-label="Velocidad">${cfg.rate}×</button>
      ${ES_IOS ? '' : `<button class="pill" id="p-np" data-act="np-mode" aria-label="Qué hacen los botones anterior y siguiente de la pantalla de bloqueo y de los AirPods">${npLabel()}</button>`}
      ${dlBtn(cur.id)}
    </div>`;
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
  if (skipPop) { skipPop = false; return; }
  const st = e.state || { tab: 'shows' };
  if (playerOpen && !st.player) { playerOpen = false; $('#player').hidden = true; return; }
  if (st.player) { return; }
  if (selPushed && !st.sel) { selPushed = false; sel.clear(); route = st; applySelUI(); return; }
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
  el.innerHTML = `<div class="scrim"></div><div class="panel" role="dialog" aria-modal="true">${html}</div>`;
  el.querySelector('.scrim').addEventListener('click', () => closeSheet());
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
let pendingIds = [], pendingSel = false, pendingLists = new Set();
function pickListSheet(ids, fromSel = false) {
  pendingIds = ids; pendingSel = fromSel; pendingLists = new Set();
  renderPick();
}
function renderPick() {
  const ids = pendingIds, n = ids.length, ls = visibleLists();
  const rows = ls.map((l) => {
    const has = ids.filter((id) => l.items.includes(id)).length;
    const all = has === n;
    const on = all || pendingLists.has(l.id);
    const tag = all ? (n === 1 ? 'ya está' : 'ya están') : has ? `${has} de ${n} ya están` : String(l.items.length);
    return `<li><button class="pick${on ? ' on' : ''}" data-act="pick-toggle" data-list="${l.id}" aria-pressed="${on}" ${all ? 'disabled' : ''}>${icon(on ? 'checkfill' : 'circle')}<span class="pick-name">${esc(l.name)}</span><span class="pick-tag">${tag}</span></button></li>`;
  }).join('');
  const k = pendingLists.size;
  sheet(`<h2>${n > 1 ? `Añadir ${n} episodios a…` : 'Añadir a…'}</h2>
    ${ls.length ? `<ul class="picks">${rows}</ul>` : '<p>Todavía no tienes listas.</p>'}
    <button class="pick new" data-act="pick-new">${icon('plus')}<span class="pick-name">Nueva lista</span></button>
    <div class="row-stack"><button class="btn primary wide" data-act="pick-apply" ${k ? '' : 'disabled'}>${k ? `Añadir a ${k} lista${k === 1 ? '' : 's'}` : 'Elige una o más listas'}</button></div>`);
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
    if (route.dl) { enterSel(id); return; }       // en Descargas, tocar un episodio lo selecciona
    openEpSheet(id, el.dataset.list, el.dataset.i);
  },
  'panel-play': (el, id) => {
    const l = el.dataset.list && state.playlists[el.dataset.list];
    closeSheet();
    if (l) playEp(id, l.items.slice(+el.dataset.i)); else playEp(id);
  },
  'del-show': (el, id) => { closeSheet(); removeShow(id); render(); toast('Programa borrado'); },
  'panel-dl': (el, id) => { closeSheet(); enqueueDl(id); if (dlProg[id] !== undefined) toast('Descargando…'); },
  'cancel-dl-sheet': (el, id) => { cancelDl(id); closeSheet(); },
  'ep-prev': () => prevEp(),
  'ep-next': () => nextEp(),
  'open-dl': () => go({ tab: 'settings', dl: true }),
  'np-mode': () => {
    cfg.npMode = cfg.npMode === 'episode' ? 'time' : 'episode'; saveCfg();
    const b = $('#p-np'); if (b) b.textContent = npLabel();
    plog('⏮⏭ de la pantalla de bloqueo y de los AirPods: ' + (cfg.npMode === 'episode' ? 'episodio anterior / siguiente' : 'saltos de tiempo'));
    toast(cfg.npMode === 'episode' ? '⏮⏭ cambian de episodio' : '⏮⏭ saltan tiempo (30 s; repetidos, hasta 1, 2 y 5 min)');
  },
  'log-view': () => {
    const t = plogBuf.length ? plogText(120) : 'Todavía no hay nada registrado. Reproduce una lista y vuelve aquí.';
    sheet(`<h2>Registro de reproducción</h2><pre class="plog">${esc(t)}</pre><div class="row-btns"><button class="btn" data-act="log-copy">Copiar</button><button class="btn" data-act="close-sheet">Cerrar</button></div>`);
  },
  'log-copy': async () => {
    const t = plogText();
    try { await navigator.clipboard.writeText(t); toast('Registro copiado'); }
    catch {
      const ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;font-size:16px'; document.body.appendChild(ta);
      ta.focus(); ta.select(); try { ta.setSelectionRange(0, t.length); } catch {}
      try { document.execCommand('copy') ? toast('Registro copiado') : toast('No se pudo copiar: pulsa «Ver» y copia el texto a mano'); } catch { toast('No se pudo copiar: pulsa «Ver» y copia el texto a mano'); }
      ta.remove();
    }
  },
  'log-clear': () => { plogBuf = []; jset(LS.log, plogBuf); toast('Registro borrado'); },
  'update-app': async () => {
    toast('Actualizando la app…');
    try {
      if ('serviceWorker' in navigator) (await navigator.serviceWorker.getRegistrations()).forEach((r) => r.unregister());
      if (window.caches) (await caches.keys()).forEach((k) => caches.delete(k));
    } catch (e) { console.warn(e); }
    setTimeout(() => location.reload(), 500);
  },
  'add-to-list': (el, id) => pickListSheet([id]),
  'pick-toggle': (el) => {
    const id = el.dataset.list;
    if (pendingLists.has(id)) pendingLists.delete(id); else pendingLists.add(id);
    renderPick();
  },
  'pick-new': async () => {
    const name = await askText('Nombre de la lista', '', 'Crear');
    if (name) pendingLists.add(newList(name));
    renderPick();
  },
  'pick-apply': () => {
    const ids = pendingIds.slice(), lists = Array.from(pendingLists), fromSel = pendingSel;
    closeSheet();
    let added = 0;
    lists.forEach((lid) => { added += addManyToList(lid, ids).added; });
    const k = lists.length;
    if (!added) toast(ids.length === 1 ? 'Ya estaba en esas listas' : 'Ya estaban en esas listas');
    else if (k === 1) toast(`Añadido${added === 1 ? '' : 's'} ${added} a ${short(state.playlists[lists[0]].name, 24)}`);
    else toast(`Añadido a ${k} listas`);
    if (fromSel) exitSel(); else render();
  },
  'new-list': async () => {
    const name = await askText('Nombre de la lista', '', 'Crear');
    if (!name) return;
    const lid = newList(name); go({ tab: 'lists', list: lid });
  },
  'sel-cancel': () => exitSel(),
  'sel-all': () => {
    unfocus();
    let ids = [];
    if (route.dl) ids = downloadedIds();
    else { const l = state.playlists[route.list]; ids = l ? l.items.slice() : []; }
    if (ids.length && ids.every((x) => sel.has(x))) { exitSel(); return; }
    ids.forEach((x) => sel.add(x));
    if (sel.size && !selPushed) { history.pushState({ ...route, sel: true }, ''); selPushed = true; }
    applySelUI();
  },
  'sel-add': () => pickListSheet(Array.from(sel), true),
  'more-eps': () => { const q = (ui.epq || '').trim(); ui.epN = (ui.epN || (q ? 100 : 40)) + 60; updateShowList(); },
  'sel-dl': () => { const n = sel.size; Array.from(sel).forEach(enqueueDl); toast(`Descargando ${n} episodio${n === 1 ? '' : 's'}`); exitSel(); },
  'sel-remove': () => {
    const n = sel.size, ids = Array.from(sel);
    if (route.dl) {
      const uno = n === 1;
      sheet(`<h2>Borrar ${n} episodio${uno ? '' : 's'}</h2><p>${uno ? 'Se quitará de todas las listas donde esté y se borrará su descarga. Sigue disponible en su programa.' : 'Se quitarán de todas las listas donde estén y se borrarán sus descargas. Siguen disponibles en su programa.'}</p>
        <div class="row-stack"><button class="btn danger wide" data-act="dl-del-all">Borrar de listas y descargas</button>
        <button class="btn wide" data-act="close-sheet">Cancelar</button></div>`);
      return;
    }
    const one = n === 1;
    const otras = ids.filter((x) => visibleLists().some((l) => l.id !== route.list && l.items.includes(x))).length;
    const conDl = ids.filter((x) => downloaded.has(x)).length;
    const info = [otras ? `${otras} ${otras === 1 ? 'está' : 'están'} también en otras listas` : '', conDl ? `${conDl} ${conDl === 1 ? 'tiene' : 'tienen'} descarga` : ''].filter(Boolean).join('; ');
    sheet(`<h2>Quitar ${n} episodio${one ? '' : 's'}</h2>${info ? `<p>${info}.</p>` : ''}
      <div class="row-stack"><button class="btn wide" data-act="sel-remove-here">Quitar de la lista actual</button>
      <button class="btn danger wide" data-act="sel-remove-ok">Quitar de todas las listas y borrar descargas</button>
      <button class="btn wide" data-act="close-sheet">Cancelar</button></div>
      <p class="small muted">«Lista actual»: se quedan en las demás listas y no se borra ninguna descarga. «Todas las listas»: se quitan de todas y se borra su descarga. En ambos casos siguen disponibles en su programa.</p>`);
  },
  'sel-remove-ok': () => removeSelected(),
  'sel-remove-here': () => removeFromCurrentList(),
  'dl-del-all': () => deleteDownloads(Array.from(sel)),
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
let skipPop = false;
function applySelUI() {
  const v = $('#view');
  v._html = null;
  const page = v.querySelector('.page');
  if (!page) return;
  page.classList.toggle('selecting', sel.size > 0);
  const h = headHtml();
  const hdr = page.querySelector(':scope > header.top');
  if (hdr && h) hdr.outerHTML = h;
  page.querySelectorAll('li.ep[data-epid]').forEach((li) => li.classList.toggle('sel', sel.has(li.dataset.epid)));
}
function enterSel(id) {
  unfocus();
  sel.add(id);
  if (!selPushed) { history.pushState({ ...route, sel: true }, ''); selPushed = true; }
  applySelUI();
}
function exitSel() {
  unfocus();
  sel.clear();
  if (selPushed) { selPushed = false; skipPop = true; history.back(); }
  applySelUI();
}
function toggleSel(id) {
  unfocus();
  if (sel.has(id)) sel.delete(id); else sel.add(id);
  if (!sel.size) exitSel(); else applySelUI();
}
async function removeSelected() {
  const ids = Array.from(sel);
  closeSheet();
  await purgeEpisodes(ids);
  toast(`Quitado${ids.length === 1 ? '' : 's'} ${ids.length} episodio${ids.length === 1 ? '' : 's'} de todas las listas`);
  exitSel(); render();
}
// Quita los episodios seleccionados solo de la lista que se está viendo: siguen en las demás listas y se conservan las descargas
function removeFromCurrentList() {
  const l = state.playlists[route.list];
  const ids = new Set(sel);
  closeSheet();
  if (!l) return;
  l.items = l.items.filter((x) => !ids.has(x));
  l.mod = now(); touch();
  plog(`quitados ${ids.size} episodio(s) solo de la lista «${short(l.name, 30)}»`);
  toast(`Quitado${ids.size === 1 ? '' : 's'} ${ids.size} episodio${ids.size === 1 ? '' : 's'} de «${short(l.name, 24)}»`);
  exitSel(); render();
}
async function deleteDownloads(ids) {
  closeSheet();
  await purgeEpisodes(ids);
  toast(`Borrado${ids.length === 1 ? '' : 's'} ${ids.length} episodio${ids.length === 1 ? '' : 's'} de las listas y de las descargas`);
  exitSel(); render();
}
function openShowMenu(id) {
  const s = state.shows[id];
  if (!s || s.del) return;
  const n = (feeds[id]?.episodes || []).length;
  sheet(`<div class="es-head">${cover(s.image, s.title, 'thumb')}<div class="es-text"><h2>${esc(s.title)}</h2><p>${n} episodio${n === 1 ? '' : 's'} guardado${n === 1 ? '' : 's'}</p></div></div>
    <p class="small muted">Se quitará de Programas y se borrará su historial de episodios guardado. Los episodios que estén en listas o descargados se mantienen.</p>
    <div class="row-stack"><button class="btn danger wide" data-act="del-show" data-id="${id}">Borrar programa</button><button class="btn wide" data-act="close-sheet">Cancelar</button></div>`);
}
function openEpSheet(id, listId, idx) {
  const ep = findEp(id);
  if (!ep) return;
  const s = state.shows[ep.showId];
  const meta = [s && s.title, fmtDate(ep.pub), fmtDur(ep.dur)].filter(Boolean).join(' - ');
  const desc = ep.desc ? esc(ep.desc).replace(/\n/g, '<br>') : '<span class="muted">Este episodio no tiene descripción.</span>';
  const gone = ep.gone && !downloaded.has(id) ? '<p class="muted small">Este episodio ya no está en el RSS del programa: puede que no se pueda reproducir.</p>' : '';
  const ctx = listId ? ` data-list="${listId}" data-i="${idx}"` : '';
  const act = (a, ic, label, extra = '') => `<button class="act${extra}" data-act="${a}" data-id="${id}"${a === 'panel-play' ? ctx : ''}>${icon(ic)}<span>${label}</span></button>`;
  const dlAct = dlProg[id] !== undefined ? act('cancel-dl-sheet', 'close', 'Cancelar descarga')
    : downloaded.has(id) ? act('del-dl', 'check', 'Borrar descarga') : act('panel-dl', 'down', 'Descargar');
  sheet(`<div class="es-head">${epCover(ep, 'thumb')}<div class="es-text"><h2>${esc(ep.title)}</h2><p>${esc(meta)}</p></div></div>
    <div class="acts">${act('add-to-list', 'plus', 'Añadir a lista')}${act('panel-play', 'play', 'Reproducir', ' primary')}${dlAct}</div>
    <div class="desc">${desc}</div>${gone}`);
}

/* Pulsación larga (1 s) sobre un episodio de una lista: empieza la selección */
let lp = null, lpFired = false;
document.addEventListener('pointerdown', (e) => {
  lpFired = false;
  if (sel.size || drag) return;
  const m = e.target.closest('.ep-main[data-lp], .show[data-lp]');
  if (!m || (e.pointerType === 'mouse' && e.button !== 0)) return;
  const isShow = m.classList.contains('show');
  const li = isShow ? m : m.closest('li');
  const id = m.dataset.id;
  const t = setTimeout(() => { li && li.classList.add('pressing'); }, 120);
  const t2 = setTimeout(() => {
    lp = null; lpFired = true;
    if (li) li.classList.remove('pressing');
    if (isShow) openShowMenu(id); else enterSel(id);
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
document.addEventListener('contextmenu', (e) => { if (e.target.closest('.ep-main, .grip, .show')) e.preventDefault(); });

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
  unlockAudio();
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled || el.type === 'checkbox') return;
  const fn = actions[el.dataset.act];
  if (fn) fn(el, el.dataset.id, e);
});
document.addEventListener('change', (e) => {
  if (e.target.dataset?.act === 'toggle-autodel') { cfg.autoDelete = e.target.checked; saveCfg(); }
  if (e.target.dataset?.act === 'toggle-keepalive') { cfg.keepAlive = e.target.checked; cfg.keepAliveUser = true; saveCfg(); unlockAudio(); keepAliveSync(); }
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
  plog('pantalla ' + (document.visibilityState === 'hidden' ? 'bloqueada / en segundo plano' : 'visible') + (cur ? ` · ${wantPlay ? 'debería sonar' : 'en pausa'}, audio ${A.paused ? 'parado' : 'sonando'}` : ''));
  if (document.visibilityState === 'hidden') { saveCurrentPos(); syncSoon(1500); }
  else { catchUpAfterHidden(); kickIfNeeded(); unlockAudio(); checkAudioSession(); if (cfgOK()) sync(); }
});
window.addEventListener('pageshow', (e) => { plog('pageshow' + (e.persisted ? ' (restaurada)' : '')); catchUpAfterHidden(); kickIfNeeded(); });
window.addEventListener('focus', () => { catchUpAfterHidden(); kickIfNeeded(); });
window.addEventListener('pagehide', () => plog('pagehide'));
document.addEventListener('freeze', () => plog('LA APP HA SIDO CONGELADA por el sistema'));
document.addEventListener('resume', () => plog('la app se ha reanudado tras estar congelada'));
document.addEventListener('pointerdown', kickIfNeeded, true);
if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) navigator.mediaDevices.addEventListener('devicechange', () => plog('cambio en los dispositivos de audio (¿Bluetooth, auriculares?)'));
window.addEventListener('online', () => { if (cfgOK()) sync(); });

/* =====================================================================
   Arranque
   ===================================================================== */
async function boot() {
  await loadFeeds();
  await loadImgCache();
  Object.values(feeds).forEach((f) => (f.episodes || []).forEach((e) => epMap.set(e.id, e)));
  await reconcileDownloads();
  history.replaceState(route, '');
  render();
  if (cfg.last) { cfg.last = null; saveCfg(); }   // versiones anteriores guardaban el último episodio
  if (cfgOK()) { await sync(); refreshAll(false); }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch((e) => console.warn(e));
}
boot();
