# Terry

Your own private movie marquee. Two things share one screen:

- **My booth** — video files you put in the `data` folder, streamed and downloadable.
- **Now showing** — the worldwide catalogue (posters, cast, ratings, trailers,
  and where each title is legally streaming in your region), pulled from
  [TMDB](https://www.themoviedb.org/).

Terry works with either half missing. On GitHub Pages there is no server, so you
get the catalogue. Running `server.js` on your own machine, you get both.

---

## Quick start (local, both halves)

You need [Node.js](https://nodejs.org) v18 or newer.

```bash
cd terry2
npm install
npm start
```

Open **http://localhost:3000**.

To hide your TMDB key from the browser, set it before starting:

```bash
TMDB_API_KEY=your_key_here npm start
```

See `.env.example` for every setting.

## Add your videos

Put video files directly inside the `data` folder:

```
terry2/data/Inception.mp4
terry2/data/The Office S01E01.mp4
```

Supported: `.mp4`, `.mkv`, `.webm`, `.mov`, `.avi`, `.m4v`
(`.mp4` plays most reliably everywhere — convert others if playback looks off).

**Optional poster:** add an image with the exact same name:

```
terry2/data/Inception.mp4
terry2/data/Inception.jpg
```

No matching image just means a plain title card. The title comes from the
filename — underscores and dashes become spaces, each word capitalised.

If a file in your booth has the same title as a catalogue entry, the detail
sheet grows a **Play from my booth** button.

---

## Get a TMDB key (free)

1. Sign up at <https://www.themoviedb.org/signup>.
2. Go to **Settings → API** and request a key. Personal / educational use is
   approved automatically.
3. You now have two credentials. Either works:
   - **API Key (v3)** — the short one.
   - **API Read Access Token (v4)** — the long one starting with `eyJ`.

Where to put it:

| How you're hosting | Where the key goes | Who can see it |
|---|---|---|
| GitHub Pages, key in the code | `public/config.js` | anyone — it's a public repo |
| GitHub Pages, key left blank | visitor pastes it, stored in their browser | only them |
| `server.js` you run | `TMDB_API_KEY` env var | nobody |

The default is the middle row: `config.js` ships empty, so the site asks each
visitor for their own key once. Nothing to leak. If you'd rather the site just
work for everyone, paste your key into `config.js` and accept that it's public —
TMDB keys are read-only and free to rotate.

---

## Deploy to GitHub Pages (manual)

Everything under `public/` is a plain static site — no build step.

1. Copy these files into `wwr/terry2/` in your `wdd130` repo, keeping the
   structure exactly as it is here.
2. Commit and push to `main`.
3. Wait about a minute for Pages to rebuild.
4. Open
   `https://joeltalemwa2-hash.github.io/wdd130/wwr/terry2/public/index.html`

The booth tab will say the server isn't running — that's expected on Pages, and
the catalogue works regardless.

**After every update, hard-refresh once** (Ctrl+Shift+R). The service worker
caches the shell, so a normal refresh may show you the old files. Bump `VERSION`
in `public/sw.js` when you change CSS or JS and returning visitors get the new
version automatically.

## Deploy somewhere the booth also works

Any host that runs Node — Render, Railway, Fly, a VPS:

- Start command: `npm start`
- Set `TMDB_API_KEY` (or `TMDB_READ_TOKEN`) in the host's environment settings
- Upload your videos to the host's `data` folder

Two things to check first: video files are large, so look at your host's storage
and bandwidth limits; and only host video you own or have the right to
distribute — that part is on you as the operator.

---

## Make it an installable app (and an APK)

The site is already a PWA: `manifest.webmanifest`, `sw.js`, and the icon set.

**On a phone, right now:** open the Pages URL in Chrome → menu → *Add to home
screen*. It launches full-screen with no browser chrome, and the shell works
offline.

**As a real APK:**

1. Go to <https://www.pwabuilder.com> and paste your Pages URL.
2. Pick **Android** → **Generate package**.
3. Download the zip. It contains the `.apk` (for sideloading) and `.aab` (for
   Play Store), plus a `signing key` — keep that file safe, you need the same
   key for every future update.

One catch worth knowing: a packaged Android app shows a thin URL bar unless the
domain proves it trusts your app, which needs an `assetlinks.json` file at
`joeltalemwa2-hash.github.io/.well-known/assetlinks.json`. That's the root of
your GitHub user site, so you'd add it to a repo named
`joeltalemwa2-hash.github.io`. PWABuilder gives you the file contents. Skip it
and the app still installs and runs — just with the bar visible.

---

## How it's built

- `server.js` — small Express server. Scans `data/` on request, serves video
  with HTTP Range support (so the player can seek), forces downloads at
  `/download/:file`, reports what it can do at `/api/status`, and proxies a
  whitelist of TMDB endpoints at `/api/tmdb/*` so the key never reaches the
  browser.
- `public/` — the front end. Plain HTML/CSS/JS, no build step, no framework.
  It asks `/api/status` first and quietly adapts to whatever answers.
- `public/config.js` — the only file you edit to change key, region, language.
- `public/sw.js` — caches the shell and posters. Never caches video or API calls.

## Project structure

```
terry2/
├── data/                    ← your videos (and optional posters)
├── public/
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   ├── config.js            ← key, region, language
│   ├── manifest.webmanifest
│   ├── sw.js
│   ├── favicon.png
│   ├── apple-touch-icon.png
│   ├── icon-192.png
│   ├── icon-512.png
│   └── icon-maskable-512.png
├── server.js
├── package.json
├── .env.example
└── README.md
```

## Credits

Catalogue data, posters and trailer links come from
[TMDB](https://www.themoviedb.org/). Terry is not endorsed or certified by TMDB.
Films in the booth are whatever you put there.
