# LearnUP — Offline-First Learning PWA

Education Without Limits. A Progressive Web App for Uganda's S1–S6 students, built so subjects and materials keep working with zero internet after the first download.

## File Structure

```
learnup-pwa/
├── README.md              This file
├── index.html              Main page — all sections (hero, subjects, materials,
│                           features, stats, testimonials, pricing, footer)
├── styles.css               All visual styling — colors, type, layout, components
├── app.js                    All behavior — theme toggle, nav, materials rendering,
│                           filters, install prompt, offline banner, animations
├── manifest.json           PWA metadata — app name, colors, icons, install behavior
├── sw.js                       Service worker — caches files so the app works offline
├── offline.html              Fallback page shown if an uncached page is opened offline
│
├── data/
│   └── materials.json      ← Upload point. Add/edit Learning Materials here.
│
└── icons/
    ├── icon-192.png             Standard app icon (192×192)
    ├── icon-512.png             Standard app icon (512×512)
    ├── icon-512-maskable.png    Safe-zone icon for Android adaptive icons
    ├── apple-touch-icon.png     iOS home screen icon
    └── favicon-32.png            Browser tab icon
```

## How the files connect

```
index.html
 ├─ <link rel="stylesheet" href="styles.css">   → visual styling
 ├─ <link rel="manifest" href="manifest.json">  → makes the app installable
 ├─ <script src="app.js">                       → all interactivity
 └─ IDs/classes (e.g. #materialsGrid, .subject-card)
       ↕ must match names used in styles.css and app.js

app.js
 ├─ fetch('data/materials.json')  → reads your uploaded materials
 ├─ document.getElementById(...) → finds elements defined in index.html
 └─ navigator.serviceWorker.register('sw.js') → activates offline support

sw.js
 └─ APP_SHELL[] lists every file that must be cached for offline use
     (index.html, styles.css, app.js, manifest.json, data/materials.json, icons/*)

manifest.json
 └─ icons[] point to files inside /icons
```

**Golden rule:** an ID or class only works if it's spelled identically in every file that uses it. `index.html` defines it, `app.js` selects it, `styles.css` styles it. Rename in one place, rename in all three.

## Editing guide

| I want to... | Edit this file |
|---|---|
| Add/change a learning material (video, notes, past paper, audio) | `data/materials.json` only |
| Change colors, fonts, spacing, card design | `styles.css` |
| Add a new section or change text/copy | `index.html` |
| Change how something behaves (filters, animations, install prompt) | `app.js` |
| Make a new file/page work offline | Add its path to `APP_SHELL` in `sw.js`, then bump `VERSION` |
| Change app name, theme color, or icons | `manifest.json` (and replace files in `/icons` if changing icons) |

## Local preview

Service workers require `https://` or `localhost` — opening `index.html` directly (`file://`) will skip offline features. Serve it locally instead:

```bash
cd learnup-pwa
python3 -m http.server 8080
# then open http://localhost:8080
```

## Deploying

Upload the whole `learnup-pwa/` folder to any static host — GitHub Pages, Netlify, Vercel — with no build step. If deploying to a GitHub Pages *project* site (e.g. `username.github.io/repo-name/`), all paths in this project are already relative (`./`, `data/...`, `icons/...`), so it works as-is inside a subfolder.

After any deploy that changes `sw.js`'s `APP_SHELL` list, bump the `VERSION` constant at the top of `sw.js` — this forces returning visitors to refresh their offline cache instead of seeing stale files.