# BeniTia

Twenty-seven photographs printed on one long, bending roll of film. Built with Three.js (WebGL), GSAP and Vite.

## Run it on your computer

```bash
npm install
npm run dev      # opens a local server with live reload
npm run build    # makes the production site in /dist
```

## Change the content

- **Rolls, titles, captions:** `src/content.js` (the first take of each roll is the cover on the film strip)
- **Name on the logo and film edge:** `SITE` at the top of `src/content.js`
- **Photos:** `public/photos/full/` (1600px) and `public/photos/thumb/` (640px), same file name in both

## How it works

| File | What it does |
| --- | --- |
| `src/main.js` | The whole app: scroll physics, the bending film-strip shader, the index grid, the photo view, routing (`#work`, `#index`, `#info`, `#<roll>`) |
| `src/filmtex.js` | Draws each film frame (sprocket holes, edge printing) with Canvas 2D, then it becomes a WebGL texture |
| `src/style.css` | HUD, menu, project text, Info page, rolling-digit counters |

## Deploy on Netlify

Add new site → Import from GitHub → pick this repo. `netlify.toml` already sets the build command (`npm run build`) and publish folder (`dist`).
