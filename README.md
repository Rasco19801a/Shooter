# Doom Lite Webgame

A minimal React + Vite webgame ready for FTP upload.

## Develop

- Node 18+
- Install deps: `npm install`
- Run dev server: `npm run dev`

## Build

- `npm run build`
- Output is in `dist/`

## Deploy via FTP

- Upload the contents of `dist/` to your webserver (target folder where you want the game)
- Open the uploaded URL in your browser

If you deploy under a subfolder (e.g. `https://example.com/games/doom-lite/`), Vite default works. If you see broken paths, set `base: '/games/doom-lite/'` in `vite.config.js` and rebuild.