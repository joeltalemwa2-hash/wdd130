const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');

// TMDB credentials are optional. If you set one, the browser never sees it —
// requests go through the /api/tmdb proxy below instead.
// v3 key:  TMDB_API_KEY=abc123...
// v4 token: TMDB_READ_TOKEN=eyJhbGciOi...
const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const TMDB_READ_TOKEN = process.env.TMDB_READ_TOKEN || '';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const REGION = process.env.TMDB_REGION || 'UG';

const VIDEO_EXT = ['.mp4', '.mkv', '.webm', '.mov', '.avi', '.m4v'];
const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp'];

// Serve the front end
app.use(express.static(path.join(__dirname, 'public')));

// Serve raw files (posters + inline video preview). express.static supports
// HTTP Range requests automatically, which is what lets the <video> tag
// seek/scrub instead of downloading the whole file first.
app.use('/data', express.static(DATA_DIR));

function safeTitle(base) {
  const cleaned = base.replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned.replace(/\b\w/g, c => c.toUpperCase());
}

function getMovies() {
  if (!fs.existsSync(DATA_DIR)) return [];
  const files = fs.readdirSync(DATA_DIR);
  const videoFiles = files.filter(f => VIDEO_EXT.includes(path.extname(f).toLowerCase()));

  return videoFiles.map(file => {
    const base = path.basename(file, path.extname(file));
    const posterFile = IMAGE_EXT.map(ext => base + ext).find(name => files.includes(name));
    const stat = fs.statSync(path.join(DATA_DIR, file));

    return {
      id: encodeURIComponent(file),
      title: safeTitle(base),
      poster: posterFile ? `/data/${encodeURIComponent(posterFile)}` : null,
      video: `/data/${encodeURIComponent(file)}`,
      download: `/download/${encodeURIComponent(file)}`,
      sizeMB: +(stat.size / (1024 * 1024)).toFixed(1),
      addedAt: stat.mtime,
    };
  }).sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
}

// What can this deployment actually do? The front end asks first, then decides
// whether to show the booth, the catalogue, or both.
app.get('/api/status', (req, res) => {
  res.json({
    booth: true,
    tmdbProxy: Boolean(TMDB_API_KEY || TMDB_READ_TOKEN),
    region: REGION,
  });
});

app.get('/api/movies', (req, res) => {
  res.json(getMovies());
});

// ---- TMDB proxy -----------------------------------------------------------
// /api/tmdb/movie/popular?page=1  ->  https://api.themoviedb.org/3/movie/popular?page=1
// Only GET, only whitelisted paths, key added server side.
const TMDB_ALLOWED = [
  /^\/trending\/movie\/(day|week)$/,
  /^\/movie\/(popular|top_rated|now_playing|upcoming)$/,
  /^\/movie\/\d+$/,
  /^\/movie\/\d+\/(videos|credits|recommendations|similar|watch\/providers|images)$/,
  /^\/search\/movie$/,
  /^\/discover\/movie$/,
  /^\/genre\/movie\/list$/,
  /^\/configuration$/,
];

app.get('/api/tmdb/*', async (req, res) => {
  if (!TMDB_API_KEY && !TMDB_READ_TOKEN) {
    return res.status(501).json({ error: 'No TMDB credentials set on this server.' });
  }

  const subPath = '/' + req.params[0];
  if (!TMDB_ALLOWED.some(rx => rx.test(subPath))) {
    return res.status(400).json({ error: 'That TMDB path is not allowed.' });
  }

  const url = new URL(TMDB_BASE + subPath);
  for (const [k, v] of Object.entries(req.query)) {
    if (k !== 'api_key') url.searchParams.set(k, v);
  }

  const headers = { accept: 'application/json' };
  if (TMDB_READ_TOKEN) headers.Authorization = `Bearer ${TMDB_READ_TOKEN}`;
  else url.searchParams.set('api_key', TMDB_API_KEY);

  try {
    const upstream = await fetch(url, { headers });
    const body = await upstream.text();
    res.status(upstream.status).type('application/json').send(body);
  } catch (err) {
    res.status(502).json({ error: 'Could not reach TMDB.' });
  }
});

app.get('/download/:file', (req, res) => {
  const file = decodeURIComponent(req.params.file);
  const filePath = path.join(DATA_DIR, file);

  // Guard against path traversal (e.g. ../../etc/passwd)
  if (!filePath.startsWith(DATA_DIR)) {
    return res.status(400).send('Invalid file');
  }
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Not found');
  }
  res.download(filePath, file);
});

app.listen(PORT, () => {
  console.log(`Terry is running -> http://localhost:${PORT}`);
  console.log(`Drop video files into: ${DATA_DIR}`);
  console.log(TMDB_API_KEY || TMDB_READ_TOKEN
    ? 'TMDB proxy: on (key stays on the server)'
    : 'TMDB proxy: off (set TMDB_API_KEY to turn it on)');
});
