# What's in here

One folder: `terry2`. It is already in the exact shape your repo expects.

## Where it goes

Drag `terry2` into `wwr/` in your `wdd130` repo, replacing the folder that's
there now. The end result on GitHub should read:

```
wdd130/wwr/terry2/...
```

Nothing above `wwr/` changes, and no file inside `terry2` was renamed — you are
overwriting six files and adding eleven.

## Uploading through the GitHub website

1. Open `github.com/joeltalemwa2-hash/wdd130`, click into `wwr`.
2. **Add file → Upload files.**
3. Drag the whole `terry2` folder onto the page. GitHub keeps the subfolders.
4. Commit message: `Update Terry: TMDB catalogue + PWA`. Commit to `main`.
5. Give Pages about a minute, then open your site and hard-refresh once
   (Ctrl+Shift+R on Windows, Cmd+Shift+R on Mac).

That hard-refresh matters — `sw.js` caches the old files, so a normal reload can
show you the previous version and make you think nothing happened.

## Your live URL (unchanged)

https://joeltalemwa2-hash.github.io/wdd130/wwr/terry2/public/index.html

## First thing you'll see

A card asking for a TMDB key. That's expected — get a free one at
<https://www.themoviedb.org/settings/api>, paste it in, and it's saved in your
browser. To skip that prompt for every visitor, put the key in
`terry2/public/config.js` before you upload, knowing a public repo makes it
public.

Full details are in `terry2/README.md`.
