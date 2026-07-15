const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');

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

app.get('/api/movies', (req, res) => {
  res.json(getMovies());
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
  console.log(`Terry is running → http://localhost:${PORT}`);
  console.log(`Drop video files into: ${DATA_DIR}`);
});
