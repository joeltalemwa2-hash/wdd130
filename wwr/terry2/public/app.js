/* Terry — front end
 *
 * Two sources of films, one screen:
 *   1. "My booth"  — video files served by server.js from the data/ folder.
 *   2. "Now showing" — the TMDB catalogue: posters, cast, ratings, trailers,
 *      and legal "where to watch" links for your region.
 *
 * Everything degrades: no server -> catalogue only (GitHub Pages).
 *                      no key    -> booth only, with a prompt to connect.
 */

const CFG = Object.assign(
  { tmdbKey: '', tmdbToken: '', region: 'UG', language: 'en-US' },
  window.TERRY_CONFIG || {}
);

const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p';
const STORE_KEY = 'terry.tmdb';
const STORE_LIST = 'terry.list';

/* ---------- elements ---------- */
const grid = document.getElementById('grid');
const gridWrap = document.getElementById('gridWrap');
const gridLabel = document.getElementById('gridLabel');
const rowsEl = document.getElementById('rows');
const emptyState = document.getElementById('empty');
const template = document.getElementById('ticket-template');
const reelTemplate = document.getElementById('reel-template');
const searchInput = document.getElementById('searchInput');
const nav = document.getElementById('nav');

const hero = document.getElementById('hero');
const heroImg = document.getElementById('heroImg');
const heroTitle = document.getElementById('heroTitle');
const heroMeta = document.getElementById('heroMeta');
const heroBlurb = document.getElementById('heroBlurb');
const heroOpen = document.getElementById('heroOpen');
const heroSave = document.getElementById('heroSave');

const setup = document.getElementById('setup');
const keyInput = document.getElementById('keyInput');
const keySave = document.getElementById('keySave');
const keyError = document.getElementById('keyError');

const player = document.getElementById('player');
const playerVideo = document.getElementById('playerVideo');
const playerTitle = document.getElementById('playerTitle');
const playerDownload = document.getElementById('playerDownload');
const playerClose = document.getElementById('playerClose');

const sheet = document.getElementById('sheet');
const sheetClose = document.getElementById('sheetClose');
const sheetImg = document.getElementById('sheetImg');
const sheetTitle = document.getElementById('sheetTitle');
const sheetMeta = document.getElementById('sheetMeta');
const sheetBlurb = document.getElementById('sheetBlurb');
const sheetCast = document.getElementById('sheetCast');
const sheetWhere = document.getElementById('sheetWhere');
const sheetTrailer = document.getElementById('sheetTrailer');
const sheetBooth = document.getElementById('sheetBooth');
const sheetSave = document.getElementById('sheetSave');
const sheetVideo = document.getElementById('sheetVideo');

/* ---------- state ---------- */
const state = {
  view: 'showing',
  booth: [],            // local files from /api/movies
  hasServer: false,
  access: null,         // 'proxy' | 'key' | 'token' | null
  key: '',
  region: CFG.region,
  featured: null,
  current: null,        // movie open in the sheet
  cache: new Map(),
};

/* ---------- small helpers ---------- */
function formatSize(mb) {
  if (mb > 1024) return (mb / 1024).toFixed(1) + ' GB';
  return mb.toFixed(0) + ' MB';
}

function year(dateStr) {
  return dateStr ? String(dateStr).slice(0, 4) : '';
}

function runtime(mins) {
  if (!mins) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

function normalise(title) {
  return String(title).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function myList() {
  try { return JSON.parse(localStorage.getItem(STORE_LIST) || '[]'); }
  catch { return []; }
}

function saveList(list) {
  localStorage.setItem(STORE_LIST, JSON.stringify(list.slice(0, 200)));
}

function inList(id) {
  return myList().some(m => m.id === id);
}

function toggleList(movie) {
  const list = myList();
  const at = list.findIndex(m => m.id === movie.id);
  if (at >= 0) list.splice(at, 1);
  else list.unshift({ id: movie.id, title: movie.title, poster_path: movie.poster_path, vote_average: movie.vote_average, release_date: movie.release_date });
  saveList(list);
  return at < 0;
}

/* ---------- TMDB access ---------- */
function readStoredKey() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); }
  catch { return null; }
}

function looksLikeToken(value) {
  return value.length > 60 || value.startsWith('eyJ');
}

async function tmdb(path, params = {}) {
  const cacheId = path + JSON.stringify(params);
  if (state.cache.has(cacheId)) return state.cache.get(cacheId);

  let url;
  const headers = { accept: 'application/json' };
  const query = new URLSearchParams({ language: CFG.language, ...params });

  if (state.access === 'proxy') {
    url = `api/tmdb${path}?${query}`;
  } else if (state.access === 'token') {
    headers.Authorization = `Bearer ${state.key}`;
    url = `${TMDB_BASE}${path}?${query}`;
  } else if (state.access === 'key') {
    query.set('api_key', state.key);
    url = `${TMDB_BASE}${path}?${query}`;
  } else {
    throw new Error('No catalogue connection');
  }

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  const data = await res.json();
  state.cache.set(cacheId, data);
  return data;
}

async function verifyKey(value) {
  const isToken = looksLikeToken(value);
  const headers = { accept: 'application/json' };
  let url = `${TMDB_BASE}/configuration`;
  if (isToken) headers.Authorization = `Bearer ${value}`;
  else url += `?api_key=${encodeURIComponent(value)}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(res.status === 401 ? 'That key was rejected by TMDB.' : `TMDB said ${res.status}.`);
  return isToken ? 'token' : 'key';
}

/* ---------- rendering: tickets ---------- */
function ticketFor(movie, opts = {}) {
  const node = template.content.cloneNode(true);
  const img = node.querySelector('.ticket__img');
  const fallback = node.querySelector('.ticket__fallback span');
  const title = node.querySelector('.ticket__title');
  const meta = node.querySelector('.ticket__meta');
  const download = node.querySelector('.ticket__download');
  const playBtn = node.querySelector('.ticket__play');
  const article = node.querySelector('.ticket');

  const isLocal = Boolean(movie.video);
  const label = movie.title || movie.name || 'Untitled';

  title.textContent = label;
  title.title = label;
  fallback.textContent = label;

  if (isLocal) {
    meta.textContent = formatSize(movie.sizeMB);
    download.href = movie.download;
    if (movie.poster) { img.src = movie.poster; img.alt = label; }
    else { img.hidden = true; }
    playBtn.textContent = '▶';
    playBtn.setAttribute('aria-label', `Play ${label}`);
  } else {
    const score = movie.vote_average ? movie.vote_average.toFixed(1) : '—';
    meta.textContent = [year(movie.release_date), `★ ${score}`].filter(Boolean).join('  ·  ');
    download.remove();
    if (movie.poster_path) { img.src = `${IMG}/w342${movie.poster_path}`; img.alt = label; }
    else { img.hidden = true; }
    playBtn.textContent = 'ⓘ';
    playBtn.setAttribute('aria-label', `Details for ${label}`);
    article.classList.add('ticket--catalogue');
  }

  const open = () => (isLocal ? openPlayer(movie) : openSheet(movie));
  playBtn.addEventListener('click', open);
  article.querySelector('.ticket__poster').addEventListener('click', open);
  if (opts.compact) article.classList.add('ticket--compact');

  return node;
}

function render(movies) {
  grid.innerHTML = '';
  if (!movies.length) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');
  const frag = document.createDocumentFragment();
  movies.forEach(m => frag.appendChild(ticketFor(m)));
  grid.appendChild(frag);
}

function renderReel(label, movies) {
  if (!movies || !movies.length) return;
  const node = reelTemplate.content.cloneNode(true);
  node.querySelector('.reel__eyebrow').textContent = label;
  const track = node.querySelector('.reel__track');
  movies.forEach(m => track.appendChild(ticketFor(m, { compact: true })));
  rowsEl.appendChild(node);
}

/* ---------- hero ---------- */
function setHero(movie) {
  state.featured = movie;
  const backdrop = movie.backdrop_path ? `${IMG}/w1280${movie.backdrop_path}` : (movie.poster_path ? `${IMG}/w780${movie.poster_path}` : '');
  if (!backdrop) return;
  heroImg.src = backdrop;
  heroImg.alt = movie.title || '';
  heroTitle.textContent = movie.title || movie.name;
  heroMeta.textContent = [year(movie.release_date), movie.vote_average ? `★ ${movie.vote_average.toFixed(1)}` : ''].filter(Boolean).join('  ·  ');
  heroBlurb.textContent = movie.overview || '';
  heroSave.textContent = inList(movie.id) ? 'In my list ✓' : 'Add to my list';
  hero.classList.remove('hidden');
}

heroOpen.addEventListener('click', () => state.featured && openSheet(state.featured));
heroSave.addEventListener('click', () => {
  if (!state.featured) return;
  const added = toggleList(state.featured);
  heroSave.textContent = added ? 'In my list ✓' : 'Add to my list';
});

/* ---------- the booth player (local files) ---------- */
function openPlayer(movie) {
  playerTitle.textContent = movie.title;
  playerVideo.src = movie.video;
  playerDownload.href = movie.download;
  player.classList.remove('hidden');
  document.body.classList.add('is-locked');
  playerVideo.play().catch(() => {});
}

function closePlayer() {
  player.classList.add('hidden');
  document.body.classList.remove('is-locked');
  playerVideo.pause();
  playerVideo.removeAttribute('src');
  playerVideo.load();
}

playerClose.addEventListener('click', closePlayer);
player.querySelector('.player__backdrop').addEventListener('click', closePlayer);

/* ---------- the detail sheet (catalogue titles) ---------- */
async function openSheet(movie) {
  state.current = movie;
  sheet.classList.remove('hidden');
  document.body.classList.add('is-locked');

  sheetTitle.textContent = movie.title || movie.name || '';
  sheetMeta.textContent = year(movie.release_date);
  sheetBlurb.textContent = movie.overview || '';
  sheetCast.innerHTML = '';
  sheetWhere.innerHTML = '';
  sheetVideo.innerHTML = '';
  sheetVideo.classList.add('hidden');
  sheetTrailer.disabled = true;
  sheetTrailer.textContent = 'Play trailer';
  sheetSave.textContent = inList(movie.id) ? 'In my list ✓' : 'Add to my list';
  sheetImg.src = movie.backdrop_path ? `${IMG}/w780${movie.backdrop_path}` : (movie.poster_path ? `${IMG}/w500${movie.poster_path}` : '');
  sheetImg.alt = movie.title || '';

  // Is this same title already sitting in the booth?
  const match = state.booth.find(f => normalise(f.title) === normalise(movie.title || ''));
  sheetBooth.classList.toggle('hidden', !match);
  sheetBooth.onclick = () => { closeSheet(); openPlayer(match); };

  try {
    const full = await tmdb(`/movie/${movie.id}`, { append_to_response: 'videos,credits,watch/providers' });
    state.current = Object.assign({}, movie, full);

    sheetMeta.textContent = [
      year(full.release_date),
      runtime(full.runtime),
      (full.genres || []).slice(0, 3).map(g => g.name).join(', '),
      full.vote_average ? `★ ${full.vote_average.toFixed(1)}` : '',
    ].filter(Boolean).join('  ·  ');

    if (full.overview) sheetBlurb.textContent = full.overview;

    const cast = (full.credits && full.credits.cast || []).slice(0, 6);
    if (cast.length) {
      sheetCast.innerHTML = '<p class="sheet__label">on screen</p>' +
        `<p class="sheet__names">${cast.map(c => escapeHtml(c.name)).join(' · ')}</p>`;
    }

    const trailer = pickTrailer(full.videos && full.videos.results);
    if (trailer) {
      sheetTrailer.disabled = false;
      sheetTrailer.onclick = () => {
        sheetVideo.innerHTML =
          `<iframe src="https://www.youtube-nocookie.com/embed/${trailer.key}?autoplay=1&rel=0" ` +
          `title="Trailer" allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture" ` +
          `allowfullscreen loading="lazy"></iframe>`;
        sheetVideo.classList.remove('hidden');
        sheetVideo.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      };
    } else {
      sheetTrailer.textContent = 'No trailer listed';
    }

    renderProviders(full['watch/providers']);
  } catch (err) {
    sheetWhere.innerHTML = '<p class="sheet__label">details unavailable</p><p class="sheet__names">Couldn\u2019t reach TMDB just now.</p>';
  }
}

function pickTrailer(videos) {
  if (!videos || !videos.length) return null;
  const yt = videos.filter(v => v.site === 'YouTube');
  return yt.find(v => v.type === 'Trailer' && v.official)
    || yt.find(v => v.type === 'Trailer')
    || yt.find(v => v.type === 'Teaser')
    || yt[0] || null;
}

function renderProviders(block) {
  const results = block && block.results;
  if (!results) return;
  const region = results[state.region] ? state.region : (results.US ? 'US' : Object.keys(results)[0]);
  const data = results[region];
  if (!data) return;

  const groups = [
    ['stream', data.flatrate],
    ['rent', data.rent],
    ['buy', data.buy],
  ].filter(([, arr]) => arr && arr.length);

  if (!groups.length) return;

  const html = groups.map(([label, arr]) =>
    `<div class="where__group"><span class="where__kind">${label}</span>` +
    arr.slice(0, 6).map(p =>
      `<img class="where__logo" src="${IMG}/w45${p.logo_path}" alt="${escapeHtml(p.provider_name)}" title="${escapeHtml(p.provider_name)}" loading="lazy" />`
    ).join('') + '</div>'
  ).join('');

  sheetWhere.innerHTML =
    `<p class="sheet__label">where to watch · ${region}</p>${html}` +
    (data.link ? `<a class="where__link" href="${data.link}" target="_blank" rel="noopener">Open on TMDB ↗</a>` : '');
}

function closeSheet() {
  sheet.classList.add('hidden');
  document.body.classList.remove('is-locked');
  sheetVideo.innerHTML = '';
  state.current = null;
}

sheetClose.addEventListener('click', closeSheet);
sheet.querySelector('.sheet__backdrop').addEventListener('click', closeSheet);
sheetSave.addEventListener('click', () => {
  if (!state.current) return;
  const added = toggleList(state.current);
  sheetSave.textContent = added ? 'In my list ✓' : 'Add to my list';
});

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!player.classList.contains('hidden')) closePlayer();
  if (!sheet.classList.contains('hidden')) closeSheet();
});

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/* ---------- views ---------- */
function showView(view) {
  state.view = view;
  [...nav.querySelectorAll('.tab')].forEach(t => t.classList.toggle('is-active', t.dataset.view === view));

  const home = view === 'showing';
  hero.classList.toggle('hidden', !home || !state.featured);
  rowsEl.classList.toggle('hidden', !home);
  gridWrap.classList.toggle('hidden', home);
  emptyState.classList.add('hidden');

  if (view === 'booth') {
    gridLabel.textContent = 'in your booth';
    render(state.booth);
    if (!state.booth.length) {
      emptyState.classList.remove('hidden');
      emptyState.querySelector('h2').textContent = state.hasServer
        ? 'No films in the booth yet'
        : 'The booth needs server.js running';
    }
  }

  if (view === 'list') {
    gridLabel.textContent = 'my list';
    const list = myList();
    render(list);
    if (!list.length) {
      emptyState.classList.remove('hidden');
      emptyState.querySelector('h2').textContent = 'Your list is empty';
      emptyState.querySelector('p:last-of-type').textContent = 'Tap a poster, then “Add to my list”, and it will wait for you here.';
    }
  }
}

nav.addEventListener('click', e => {
  const tab = e.target.closest('.tab');
  if (tab) { searchInput.value = ''; showView(tab.dataset.view); }
});

/* ---------- search ---------- */
let searchTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  const q = searchInput.value.trim();

  if (!q) { showView(state.view === 'search' ? 'showing' : state.view); return; }

  searchTimer = setTimeout(async () => {
    state.view = 'search';
    hero.classList.add('hidden');
    rowsEl.classList.add('hidden');
    gridWrap.classList.remove('hidden');
    gridLabel.textContent = `results for “${q}”`;

    const local = state.booth.filter(m => m.title.toLowerCase().includes(q.toLowerCase()));
    let remote = [];
    if (state.access) {
      try {
        const data = await tmdb('/search/movie', { query: q, include_adult: 'false' });
        remote = (data.results || []).filter(m => m.poster_path || m.overview);
      } catch { /* keep local results */ }
    }
    render([...local, ...remote]);
    if (!local.length && !remote.length) {
      emptyState.classList.remove('hidden');
      emptyState.querySelector('h2').textContent = 'Nothing under that name';
      emptyState.querySelector('p:last-of-type').textContent = 'Try fewer words, or check the spelling.';
    }
  }, 350);
});

/* ---------- key setup ---------- */
keySave.addEventListener('click', async () => {
  const value = keyInput.value.trim();
  if (!value) return;
  keySave.disabled = true;
  keySave.textContent = 'Checking…';
  keyError.classList.add('hidden');
  try {
    const kind = await verifyKey(value);
    localStorage.setItem(STORE_KEY, JSON.stringify({ value, kind }));
    state.key = value;
    state.access = kind;
    setup.classList.add('hidden');
    await loadCatalogue();
    showView('showing');
  } catch (err) {
    keyError.textContent = err.message || 'That did not work. Check the key and try again.';
    keyError.classList.remove('hidden');
  } finally {
    keySave.disabled = false;
    keySave.textContent = 'Connect';
  }
});

keyInput.addEventListener('keydown', e => { if (e.key === 'Enter') keySave.click(); });

/* ---------- boot ---------- */
async function probeServer() {
  try {
    const res = await fetch('api/status', { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error('no status route');
    const status = await res.json();
    state.hasServer = true;
    state.region = status.region || state.region;
    if (status.tmdbProxy) state.access = 'proxy';
  } catch {
    state.hasServer = false;
  }
}

async function loadBooth() {
  if (!state.hasServer) return;
  try {
    const res = await fetch('api/movies');
    state.booth = await res.json();
  } catch {
    state.booth = [];
  }
}

async function loadCatalogue() {
  rowsEl.innerHTML = '';
  if (!state.access) return;

  const reels = [
    ['trending this week', tmdb('/trending/movie/week')],
    ['in cinemas now', tmdb('/movie/now_playing', { region: state.region })],
    ['what everyone is watching', tmdb('/movie/popular')],
    ['the vault — highest rated', tmdb('/movie/top_rated')],
    ['coming soon', tmdb('/movie/upcoming', { region: state.region })],
  ];

  const settled = await Promise.allSettled(reels.map(r => r[1]));

  const first = settled[0];
  if (first.status === 'fulfilled' && first.value.results && first.value.results.length) {
    const pool = first.value.results.filter(m => m.backdrop_path).slice(0, 8);
    if (pool.length) setHero(pool[Math.floor(Math.random() * pool.length)]);
  }

  if (state.booth.length) renderReel('in your booth', state.booth);

  settled.forEach((result, i) => {
    if (result.status !== 'fulfilled') return;
    const movies = (result.value.results || []).filter(m => m.poster_path).slice(0, 20);
    renderReel(reels[i][0], movies);
  });

  if (!rowsEl.children.length) {
    rowsEl.innerHTML = '<p class="rows__error">The catalogue did not answer. Check your connection, then reload.</p>';
  }
}

async function boot() {
  await probeServer();
  await loadBooth();

  if (!state.access) {
    const stored = readStoredKey();
    if (CFG.tmdbToken) { state.access = 'token'; state.key = CFG.tmdbToken; }
    else if (CFG.tmdbKey) { state.access = 'key'; state.key = CFG.tmdbKey; }
    else if (stored && stored.value) { state.access = stored.kind || 'key'; state.key = stored.value; }
  }

  if (!state.access) {
    setup.classList.remove('hidden');
    rowsEl.innerHTML = '';
    if (state.booth.length) renderReel('in your booth', state.booth);
    return;
  }

  await loadCatalogue();
  showView('showing');
}

boot();

/* ---------- installable app ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
