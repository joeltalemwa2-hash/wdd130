const grid = document.getElementById('grid');
const emptyState = document.getElementById('empty');
const template = document.getElementById('ticket-template');
const searchInput = document.getElementById('searchInput');

const player = document.getElementById('player');
const playerVideo = document.getElementById('playerVideo');
const playerTitle = document.getElementById('playerTitle');
const playerDownload = document.getElementById('playerDownload');
const playerClose = document.getElementById('playerClose');

let allMovies = [];

function formatSize(mb) {
  if (mb > 1024) return (mb / 1024).toFixed(1) + ' GB';
  return mb.toFixed(0) + ' MB';
}

function render(movies) {
  grid.innerHTML = '';

  if (movies.length === 0) {
    emptyState.classList.toggle('hidden', allMovies.length !== 0);
    return;
  }
  emptyState.classList.add('hidden');

  movies.forEach(movie => {
    const node = template.content.cloneNode(true);
    const img = node.querySelector('.ticket__img');
    const fallback = node.querySelector('.ticket__fallback span');
    const title = node.querySelector('.ticket__title');
    const meta = node.querySelector('.ticket__meta');
    const download = node.querySelector('.ticket__download');
    const playBtn = node.querySelector('.ticket__play');
    const article = node.querySelector('.ticket');

    title.textContent = movie.title;
    meta.textContent = formatSize(movie.sizeMB);
    download.href = movie.download;
    fallback.textContent = movie.title;

    if (movie.poster) {
      img.src = movie.poster;
      img.alt = movie.title;
    } else {
      img.hidden = true;
    }

    const open = () => openPlayer(movie);
    playBtn.addEventListener('click', open);
    article.querySelector('.ticket__poster').addEventListener('click', open);

    grid.appendChild(node);
  });
}

function openPlayer(movie) {
  playerTitle.textContent = movie.title;
  playerVideo.src = movie.video;
  playerDownload.href = movie.download;
  player.classList.remove('hidden');
  playerVideo.play().catch(() => {});
}

function closePlayer() {
  player.classList.add('hidden');
  playerVideo.pause();
  playerVideo.removeAttribute('src');
  playerVideo.load();
}

playerClose.addEventListener('click', closePlayer);
player.querySelector('.player__backdrop').addEventListener('click', closePlayer);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closePlayer();
});

searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim().toLowerCase();
  const filtered = q
    ? allMovies.filter(m => m.title.toLowerCase().includes(q))
    : allMovies;
  render(filtered);
});

async function load() {
  try {
    const res = await fetch('/api/movies');
    allMovies = await res.json();
    render(allMovies);
  } catch (err) {
    grid.innerHTML = `<p style="color:#8d8a97">Couldn't reach the projection booth. Is the server running?</p>`;
  }
}

load();
