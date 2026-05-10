# Neon Nightmare: A Horror Metal Fever Dream

An interactive one-page horror metal website built with plain HTML, CSS, and JavaScript.

It mixes gothic neon visuals, corrupted VHS effects, 80s slasher-inspired original graphics, a haunted arcade mini-game, clickable nightmare cards, screaming gallery tiles, and procedural audio tracks for the setlist.

## Features

- Main page: `neonNightmare.html`
- Styles: `style.css`
- Interactions and audio: `script.js`
- No external libraries or assets
- Responsive desktop and mobile layout
- VHS static, scanlines, glitch text, flicker, and corruption effects
- Playable corrupted arcade section with keyboard and mobile controls
- Haunted setlist with longer procedural audio tracks
- Graveyard Gallery tiles that scream on hover
- Neon Mode / Nightmare Mode toggle
- Random horror warning generator
- Clickable nightmare cards with hidden messages

## Run Locally

You can open `neonNightmare.html` directly in a browser, or use the included Windows launcher:

```powershell
.\CLICK-ME-TO-OPEN.cmd
```

That starts a tiny local server and opens:

```text
http://127.0.0.1:8787/neonNightmare.html
```

## Controls

- Arcade game: `WASD` or arrow keys
- Mobile: use the on-screen D-pad
- Setlist: click a track to play it
- Gallery: hover or focus the slasher tiles to trigger screams
- Stop music: click `Stop Audio`

## Deploy With GitHub Pages

For GitHub Pages, either rename `neonNightmare.html` back to `index.html` before publishing, or publish it directly and visit `/neonNightmare.html`.

```powershell
git init
git add neonNightmare.html style.css script.js README.md
git commit -m "Create Neon Nightmare site"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
git push -u origin main
```

Then in GitHub:

1. Go to your repository settings.
2. Open `Pages`.
3. Set source to `Deploy from a branch`.
4. Choose branch `main`.
5. Choose folder `/root`.
6. Save.

Your site will publish at:

```text
https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/neonNightmare.html
```

## Notes

All graphics and sounds are generated in the browser using HTML, CSS, SVG, JavaScript, and the Web Audio API. The slasher visuals are original homage-style graphics, not copied movie artwork.
