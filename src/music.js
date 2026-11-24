// ─────────────────────────────────────────────────────────────
// Music: a spinning record (bottom right) that opens a bottom
// sheet with your Spotify playlists. Uses Spotify's iFrame API:
// https://developer.spotify.com/documentation/embeds/references/iframe-api
// The sheet only slides away when closed (never removed), so the
// song keeps playing while people browse the site.
// ─────────────────────────────────────────────────────────────
import { MUSIC } from './content.js';

const $ = (s) => document.querySelector(s);
const body = document.body;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let controller = null;
let api = 'idle';      // idle → loading → ready | failed
let isOpen = false;
let current = 0;
let playing = false;

// accepts https://open.spotify.com/playlist/ID?si=… or spotify:playlist:ID
function toUri(url) {
  const m = String(url).match(/(playlist|album|track|artist)[/:]([A-Za-z0-9]+)/);
  return m ? `spotify:${m[1]}:${m[2]}` : null;
}

// Spotify only plays full songs inside website players on a computer,
// for people logged in to Spotify in that browser. Phones get previews,
// so phones get a big "open in the Spotify app" button instead.
const phone = matchMedia('(pointer: coarse)').matches;

export function initMusic() {
  const disc = $('#disc');
  $('#sh-note').textContent = phone
    ? 'The player here plays 30-second previews on phones (Spotify’s rule). For full songs, use the button above: the Spotify app plays the whole playlist in the background while you keep browsing.'
    : 'Full songs play here if you are logged in to Spotify in this browser (log in at open.spotify.com, then reopen this drawer). Otherwise Spotify plays 30-second previews, or use the button to open the playlist in Spotify.';
  body.classList.toggle('is-phone', phone);
  const lists = $('#sh-lists');
  MUSIC.playlists.forEach((p, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    const cover = document.createElement('i');
    const name = document.createElement('span');
    name.textContent = p.name;
    b.append(cover, name);
    b.addEventListener('click', () => choose(i));
    lists.append(b);
    p.el = b;
    if (p.cover) cover.style.backgroundImage = `url("${p.cover}")`;
    else fetchCover(p, i);
  });
  if (!MUSIC.playlists.length) status('No playlists yet: add links in src/content.js');
  else mark(0); // show the first cover on the record straight away

  // a normal mouse wheel scrolls the playlist row sideways
  lists.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { lists.scrollLeft += e.deltaY; e.preventDefault(); }
  }, { passive: false });

  disc.addEventListener('click', () => toggleSheet());
  $('#sh-close').addEventListener('click', () => toggleSheet(false));
  $('#sh-scrim').addEventListener('click', () => toggleSheet(false));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen) toggleSheet(false); });

  // Drag down to close, like a native bottom sheet. Works from the grab bar,
  // the title and the playlist row (Spotify's player is its own page, so
  // touches inside it stay with Spotify). Only starts when the sheet is
  // scrolled to the top and the pull is mostly downward.
  const sheet = $('#sheet'), scrim = $('#sh-scrim');
  let drag = null;
  const begin = (x, y, target) => {
    if (!isOpen || target.closest('#sh-embed, #sh-close')) return;
    const t = performance.now();
    drag = { x, y, dy: 0, on: false, pts: [{ y, t }] };
  };
  const move = (x, y, e) => {
    if (!drag) return;
    const dx = x - drag.x, dy = y - drag.y;
    if (!drag.on) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      if (dy > 0 && Math.abs(dy) > Math.abs(dx) && sheet.scrollTop <= 0) {
        drag.on = true;
        sheet.style.transition = 'none';
        scrim.style.transition = 'none';
      } else { drag = null; return; } // sideways (playlist row) or scrolling up: let it scroll
    }
    if (e && e.cancelable) e.preventDefault(); // stops the iPhone scroll bounce
    const now = performance.now();
    drag.pts.push({ y, t: now });
    while (drag.pts.length > 2 && now - drag.pts[0].t > 120) drag.pts.shift(); // keep the last ~0.1s
    drag.dy = Math.max(0, dy);
    sheet.style.transform = `translate(-50%, ${drag.dy}px)`;
    scrim.style.opacity = String(Math.max(0, 1 - drag.dy / sheet.offsetHeight));
  };
  const end = () => {
    if (!drag) return;
    const d = drag;
    drag = null;
    if (!d.on) return;
    const a = d.pts[0], b = d.pts[d.pts.length - 1];
    const v = b.t > a.t ? (b.y - a.y) / (b.t - a.t) : 0; // speed over the last ~0.1s, px per ms
    sheet.style.transition = '';
    scrim.style.transition = '';
    void sheet.offsetHeight; // re-enable the animation before moving
    sheet.style.transform = '';
    scrim.style.opacity = '';
    if (d.dy > Math.min(120, sheet.offsetHeight * 0.22) || (v > 0.45 && d.dy > 24)) toggleSheet(false); // far enough, or a flick
  };
  // touch (phones): non-passive so we can stop the bounce
  sheet.addEventListener('touchstart', (e) => { const t = e.touches[0]; begin(t.clientX, t.clientY, e.target); }, { passive: true });
  sheet.addEventListener('touchmove', (e) => { const t = e.touches[0]; move(t.clientX, t.clientY, e); }, { passive: false });
  sheet.addEventListener('touchend', end);
  sheet.addEventListener('touchcancel', end);
  // mouse (computers)
  sheet.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse' && e.button === 0) begin(e.clientX, e.clientY, e.target); });
  addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' && drag) move(e.clientX, e.clientY, e); });
  addEventListener('pointerup', (e) => { if (e.pointerType === 'mouse') end(); });

  // the record turns slowly when idle and properly when a song plays
  const vinyl = disc.querySelector('.vinyl');
  let angle = 0, speed = 0, last = performance.now();
  const spin = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const target = reduce ? 0 : playing ? 220 : 24; // degrees per second
    speed += (target - speed) * Math.min(1, dt * 2.5);
    angle = (angle + speed * dt) % 360;
    vinyl.style.transform = `rotate(${angle.toFixed(2)}deg)`;
    requestAnimationFrame(spin);
  };
  requestAnimationFrame(spin);
}

export function toggleSheet(force) {
  isOpen = force ?? !isOpen;
  body.classList.toggle('sheet-open', isOpen);
  $('#disc').setAttribute('aria-expanded', isOpen);
  $('#sheet').setAttribute('aria-hidden', !isOpen);
  $('#sheet').inert = !isOpen;
  if (isOpen) { loadApi(); setTimeout(() => $('#sh-close').focus({ preventScroll: true }), 350); }
  else $('#disc').focus({ preventScroll: true });
}

function loadApi() {
  if (api !== 'idle' || !MUSIC.playlists.length) return;
  api = 'loading';
  status('Loading Spotify…');
  window.onSpotifyIframeApiReady = (IFrameAPI) => {
    const el = document.createElement('div');
    $('#sh-embed').replaceChildren(el);
    const uri = toUri(MUSIC.playlists[current].url);
    IFrameAPI.createController(el, { uri, width: '100%', height: 380 }, (c) => {
      controller = c;
      api = 'ready';
      status('');
      mark(current);
      c.addListener('playback_update', (e) => {
        const d = e.data || {};
        playing = !d.isPaused && !d.isBuffering;
        body.classList.toggle('music-on', playing);
        $('#disc').setAttribute('aria-label', playing ? 'Music playing: open the soundtrack' : 'Music: open the soundtrack');
        if (d.duration) $('#disc').style.setProperty('--p', Math.min(1, d.position / d.duration).toFixed(4));
      });
    });
  };
  const s = document.createElement('script');
  s.src = 'https://open.spotify.com/embed/iframe-api/v1';
  s.async = true;
  s.onerror = fail;
  document.body.append(s);
  setTimeout(() => { if (api !== 'ready') fail(); }, 10000);
}

// if Spotify can't load (blocked, offline), offer plain links instead
function fail() {
  if (api === 'ready' || api === 'failed') return;
  api = 'failed';
  status('Spotify could not load here. Open a playlist in Spotify instead:');
  const box = document.createElement('div');
  box.className = 'sh-fallback';
  MUSIC.playlists.forEach((p) => {
    const a = document.createElement('a');
    a.href = p.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = `${p.name} ↗`;
    box.append(a);
  });
  $('#sh-embed').replaceChildren(box);
  $('#sh-embed').classList.add('failed');
}

function choose(i) {
  const uri = toUri(MUSIC.playlists[i].url);
  if (!uri) return;
  current = i;
  mark(i);
  if (controller) controller.loadUri(uri);
  else if (api === 'idle') loadApi();
}

function mark(i) {
  MUSIC.playlists.forEach((p, k) => {
    p.el.classList.toggle('on', k === i);
    p.el.setAttribute('aria-pressed', k === i);
  });
  const p = MUSIC.playlists[i];
  if (p) {
    $('#sh-full').href = p.url;
    $('#sh-full').setAttribute('aria-label', `Play ${p.name} in the Spotify app (opens Spotify)`);
  }
  const c = MUSIC.playlists[i]?.cover;
  $('#disc .label').style.backgroundImage = c ? `url("${c}")` : '';
}

// cover art from Spotify's public oEmbed endpoint (optional: falls back to plain chips)
function fetchCover(p, i) {
  fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(p.url)}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (!d || !d.thumbnail_url) return;
      p.cover = d.thumbnail_url;
      p.el.querySelector('i').style.backgroundImage = `url("${d.thumbnail_url}")`;
      if (i === current) mark(current);
    })
    .catch(() => {});
}

function status(msg) {
  const el = $('#sh-status');
  el.textContent = msg;
  el.hidden = !msg;
}
