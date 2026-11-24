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

## Auto-update from Google Drive

Drop a photo into the Google Drive folder **My Space** and it appears on the site
by itself, usually within 15–20 minutes:

1. Every 15 minutes, GitHub runs `.github/workflows/sync-drive.yml`.
2. It runs `scripts/sync_drive.py`, which looks in the folder for images it hasn't
   seen before, converts them to WebP (`public/photos/full` and `/thumb`) and reads
   their camera data.
3. Each new photo is added to `src/auto-photos.json` and becomes a new frame at the
   end of the film strip (and a new photo on the Index).
4. The workflow commits and pushes, and Netlify redeploys the site.

Rules: only images count (videos are skipped); a file with the same name as a photo
already on the site is treated as a duplicate; photos are **never removed**, even if
you delete them from Drive. To rename a new frame or add a caption, edit its `title`
or `caption` in `src/auto-photos.json`.

To check right now instead of waiting: GitHub → **Actions** → *Sync photos from
Google Drive* → **Run workflow**.

### One-time setup

The workflow reads Drive as a Google "service account" (a robot Google user):

1. In Google Cloud Console create a project, enable the **Google Drive API**, then
   under **IAM & Admin → Service accounts** create an account and add a **JSON key**.
2. In Google Drive, **share** the *My Space* folder with the service account's email
   (it ends in `iam.gserviceaccount.com`) as **Viewer**.
3. In this GitHub repo: **Settings → Secrets and variables → Actions → New
   repository secret**, name `GDRIVE_SA_KEY`, value = the entire contents of the JSON key file.

Test locally without Google: `python scripts/sync_drive.py --local some/folder`.
