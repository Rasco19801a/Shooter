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

If you deploy under a subfolder (e.g. `https://example.com/games/doom-lite/`), Vite default works. If you see broken paths, set `base: './'` in `vite.config.js` (already configured) or use a custom base like `base: '/games/doom-lite/'` and rebuild.

## Controls

- Keyboard: WASD to move, Arrow Left/Right to turn, Arrow Up/Down to tilt, Space to fire, R to reload, click the pause button to pause.
- Touch: Left half for movement, right half for look. Hold FIRE to auto-fire. RELOAD to reload.

## Gameplay Notes

- Subtle recoil and camera shake on firing and when taking damage
- Aim assist within a small cone for smoother mobile play
- Low-health vignette and brief red hit flash for feedback
- Minimap shows walls (white), exit (green), enemies and projectiles

## License

MIT