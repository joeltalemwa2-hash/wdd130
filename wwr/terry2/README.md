# Terry

Your own private movie site — YouTube/MovieBox-style browsing, but every file is
one you put there yourself. Runs on your machine (or any server you deploy it to).

## What it does

- Drop video files into the `data` folder → they instantly show up on the site.
- Visitors get a Netflix-style grid, a big video player (streams with seeking,
  no waiting for the whole file to load), and a one-click **Download** button
  on every title.
- No database, no account system — the `data` folder *is* the catalog.

## 1. Install

You need [Node.js](https://nodejs.org) installed (v18 or newer).

```bash
cd terry
npm install
```

## 2. Add your videos

Put video files directly inside the `data` folder:

```
terry/data/Inception.mp4
terry/data/The Office S01E01.mp4
```

Supported formats: `.mp4`, `.mkv`, `.webm`, `.mov`, `.avi`, `.m4v`
(`.mp4` plays most reliably in every browser — convert others if playback looks off).

**Optional poster image:** add an image with the exact same name as the video:

```
terry/data/Inception.mp4
terry/data/Inception.jpg
```

If there's no matching image, Terry shows a plain title card instead — nothing breaks.

The title shown on the site is generated from the filename (underscores/dashes
become spaces, each word capitalized), so name your files the way you want the
title to read.

## 3. Run it

```bash
npm start
```

Then open **http://localhost:3000** in your browser.

## 4. Put it online (optional)

Right now this only runs on your own computer. To let other people reach it
over the internet, you'd deploy it to a host that lets you run a Node.js
server (e.g. Render, Railway, a VPS) and put your video files on that host's
disk. Two things worth knowing before you do:

- **Storage & bandwidth:** video files are large. Check your host's storage
  and bandwidth limits/pricing before uploading a big library.
- **Rights:** only upload/host video you own or have the rights to distribute —
  this is on you as the operator of the site.

## How it's built

- `server.js` — a small Express server. It scans `data/` on every request,
  serves videos with HTTP Range support (so the player can seek), and has a
  `/download/:file` route that forces a save-to-device download.
- `public/` — the front end (plain HTML/CSS/JS, no build step).

## Project structure

```
terry/
├── data/           ← put your videos (and optional posters) here
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── server.js
├── package.json
└── README.md
```
