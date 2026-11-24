#!/usr/bin/env python3
"""
Sync new photos from the Google Drive "My Space" folder into the BeniTia site.

What it does, every time it runs (GitHub Actions runs it every 15 minutes):
  1. Lists the image files in the Drive folder (videos and other files are ignored).
  2. Any image it has not seen before is downloaded, turned into two WebP files
     (public/photos/full = 1600px, public/photos/thumb = 640px), and its camera
     data (ISO, aperture, shutter, date, camera) is read.
  3. It is added to src/auto-photos.json, which the site turns into a new frame
     at the end of the film strip (and a new photo on the Index).
  4. Photos are NEVER removed, even if you delete them from Drive.

If nothing is new it changes nothing, so the workflow makes no commit.

Environment:
  GDRIVE_SA_KEY     the Google service account key (the whole JSON file contents)
  GDRIVE_FOLDER_ID  the Drive folder to watch
Local test (no Google account needed):
  python scripts/sync_drive.py --local path/to/a/folder/of/images
"""
import argparse
import datetime as dt
import io
import json
import os
import re
import sys
from pathlib import Path

from PIL import Image, ImageOps
import pillow_heif

pillow_heif.register_heif_opener()

ROOT = Path(__file__).resolve().parent.parent
FULL = ROOT / "public" / "photos" / "full"
THUMB = ROOT / "public" / "photos" / "thumb"
AUTO = ROOT / "src" / "auto-photos.json"   # photos this script added
SEEN = ROOT / "data" / "drive-seen.json"   # Drive file ids already handled
CONTENT = ROOT / "src" / "content.js"      # the hand-made rolls
MAX_PER_RUN = 40                           # keep each run short
MONTHS = "JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC".split()


def load(path, default):
    return json.loads(path.read_text()) if path.exists() else default


def save(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def curated_ids():
    """ids of photos already used by the hand-made rolls in content.js"""
    return set(re.findall(r'"id":\s*"([^"]+)"', CONTENT.read_text()))


def photo_id(name):
    """IMG_5875.HEIC -> 5875 (same scheme as the existing photos); other names -> a slug"""
    stem = Path(name).stem
    m = re.fullmatch(r"IMG_(\d+)", stem, re.I)
    if m:
        return m.group(1)
    return re.sub(r"[^a-z0-9]+", "-", stem.lower()).strip("-") or "photo"


def read_exif(im):
    out = {"iso": None, "f": None, "shutter": None, "date": None, "camera": None}
    try:
        ex = im.getexif()
        ifd = ex.get_ifd(0x8769)
        iso, fn, et = ifd.get(0x8827), ifd.get(0x829D), ifd.get(0x829A)
        when = ifd.get(0x9003) or ex.get(0x0132)
        model = ex.get(0x0110)
        if iso and fn and et:  # only trust exposure data when all three are there
            iso = iso[0] if isinstance(iso, (tuple, list)) else iso
            e = float(et)
            out.update(iso=int(iso), f=f"{float(fn):.1f}",
                       shutter=f"1/{round(1 / e)}" if 0 < e < 1 else f"{e:g}s")
        if isinstance(model, str) and model.strip() and model.isprintable():
            out["camera"] = model.strip()
        if isinstance(when, str) and re.match(r"\d{4}:\d\d:\d\d", when):
            y, m, d = when[:10].split(":")
            out["date"] = f"{d}.{m}.{y}"
    except Exception:
        pass
    return out


def convert(data, pid):
    """save full + thumb WebP, return size and camera data"""
    im = Image.open(io.BytesIO(data))
    meta = read_exif(im)
    im = ImageOps.exif_transpose(im).convert("RGB")
    FULL.mkdir(parents=True, exist_ok=True)
    THUMB.mkdir(parents=True, exist_ok=True)
    big = im.copy()
    big.thumbnail((1600, 1600), Image.LANCZOS)
    big.save(FULL / f"{pid}.webp", quality=80, method=6)
    small = im.copy()
    small.thumbnail((640, 640), Image.LANCZOS)
    small.save(THUMB / f"{pid}.webp", quality=78, method=6)
    return {"w": big.width, "h": big.height, **meta}


def title_for(meta, created):
    """'25 NOV 2026' from the photo's own date, else the upload date"""
    if meta.get("date"):
        d, m, y = meta["date"].split(".")
    else:
        y, m, d = created[:10].split("-")
    return f"{int(d)} {MONTHS[int(m) - 1]} {y}"


# ── where the files come from ───────────────────────────────
class DriveSource:
    def __init__(self, key_json, folder_id):
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
        creds = service_account.Credentials.from_service_account_info(
            json.loads(key_json), scopes=["https://www.googleapis.com/auth/drive.readonly"])
        self.svc = build("drive", "v3", credentials=creds, cache_discovery=False)
        self.folder = folder_id

    def list(self):
        q = f"'{self.folder}' in parents and mimeType contains 'image/' and trashed = false"
        files, token = [], None
        while True:
            r = self.svc.files().list(
                q=q, pageSize=200, pageToken=token, orderBy="createdTime",
                fields="nextPageToken, files(id, name, mimeType, createdTime)",
                supportsAllDrives=True, includeItemsFromAllDrives=True).execute()
            files += r.get("files", [])
            token = r.get("nextPageToken")
            if not token:
                return files

    def download(self, f):
        from googleapiclient.http import MediaIoBaseDownload
        buf = io.BytesIO()
        dl = MediaIoBaseDownload(buf, self.svc.files().get_media(fileId=f["id"]))
        done = False
        while not done:
            _, done = dl.next_chunk()
        return buf.getvalue()


class LocalSource:
    """a plain folder, for testing without Google"""
    EXT = {".jpg", ".jpeg", ".png", ".heic", ".heif", ".webp"}

    def __init__(self, folder):
        self.folder = Path(folder)

    def list(self):
        out = []
        for p in sorted(self.folder.iterdir(), key=lambda p: p.stat().st_mtime):
            if p.suffix.lower() in self.EXT:
                t = dt.datetime.fromtimestamp(p.stat().st_mtime, dt.timezone.utc)
                out.append({"id": "local:" + p.name, "name": p.name, "createdTime": t.isoformat()})
        return out

    def download(self, f):
        return (self.folder / f["name"]).read_bytes()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--local", help="use a local folder instead of Google Drive (for testing)")
    args = ap.parse_args()

    if args.local:
        src = LocalSource(args.local)
    else:
        key, folder = os.environ.get("GDRIVE_SA_KEY"), os.environ.get("GDRIVE_FOLDER_ID")
        if not key or not folder:
            sys.exit("Missing GDRIVE_SA_KEY secret or GDRIVE_FOLDER_ID. See README: 'Auto-update from Google Drive'.")
        src = DriveSource(key, folder)

    seen = set(load(SEEN, []))
    auto = load(AUTO, [])
    known = curated_ids() | {a["id"] for a in auto}
    added, skipped = [], 0

    for f in src.list():
        if f["id"] in seen:
            continue
        if len(added) >= MAX_PER_RUN:
            print(f"Reached {MAX_PER_RUN} photos this run; the rest come next run.")
            break
        pid = photo_id(f["name"])
        if pid in known:  # same photo uploaded twice (e.g. IMG_5675 twice)
            seen.add(f["id"])
            skipped += 1
            print(f"skip   {f['name']} (already on the site as {pid})")
            continue
        try:
            meta = convert(src.download(f), pid)
        except Exception as e:  # not marked as seen, so it is retried next run
            print(f"ERROR  {f['name']}: {e}")
            continue
        auto.append({
            "id": pid, **meta,
            "title": title_for(meta, f.get("createdTime") or dt.datetime.utcnow().isoformat()),
            "caption": "",
            "driveId": f["id"],
            "added": dt.date.today().isoformat(),
        })
        known.add(pid)
        seen.add(f["id"])
        added.append(pid)
        print(f"added  {f['name']} -> {pid}")

    if added or skipped:
        save(AUTO, auto)
        save(SEEN, sorted(seen))
    print(f"Done: {len(added)} new photo(s), {skipped} duplicate(s) skipped.")
    if os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a") as fh:
            fh.write(f"added={len(added)}\n")


if __name__ == "__main__":
    main()
