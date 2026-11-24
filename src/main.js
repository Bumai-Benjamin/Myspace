// ─────────────────────────────────────────────────────────────
// BeniTia: one WebGL canvas, three scenes (strip, index, photos)
// and an HTML layer on top. Read top to bottom:
//   1. setup        2. shaders       3. the film strip (WORK)
//   4. the contact sheet (INDEX)     5. the photo view (a roll)
//   6. input        7. routing       8. HTML bits    9. boot + loop
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';
import gsap from 'gsap';
import './style.css';
import { SITE, ROLLS } from './content.js';
import { loadImage, drawFilmFrame, makeGrain } from './filmtex.js';
import { initMusic } from './music.js';
import { initIntro, maybeIntro, openIntro } from './intro.js';

// ── 1. setup ─────────────────────────────────────────────────
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s) => document.querySelector(s);
const pad = (n) => String(n).padStart(2, '0');
const mod = (a, n) => ((a % n) + n) % n;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const N = ROLLS.length;
const PHOTOS = [];
ROLLS.forEach((r, ri) => r.takes.forEach((t, ti) => PHOTOS.push({ ...t, ri, ti })));
const exif = (t) => (t.iso ? `ISO ${t.iso} · F/${t.f} · ${t.shutter}` : 'ISO — · F/— · —');
const fullSrc = (id) => `photos/full/${id}.webp`;
const thumbSrc = (id) => `photos/thumb/${id}.webp`;

const state = { view: 'work', base: 'work', ready: false, token: 0, pendingTake: null };
const body = document.body;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: $('#gl'), antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (e) {
  $('#ld-err').hidden = false;
  $('.ld-count').hidden = true;
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // pass colours straight through
renderer.setClearColor(0x000000, 0);                     // transparent: the page colour shows

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
camera.position.z = 14;
let VW = 1, VH = 1, mobile = false; // size of the visible area at z = 0, in world units
const T = { value: 0 };             // shared clock uniform
const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

function texFrom(source, isCanvas) {
  const t = isCanvas ? new THREE.CanvasTexture(source) : new THREE.Texture(source);
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = aniso;
  t.needsUpdate = true;
  return t;
}

// ── 2. shaders ───────────────────────────────────────────────
// The strip: every frame is a flat plane, bent in the vertex shader.
// The wave depends on the frame's position along the strip (wx), so
// neighbouring frames line up into one continuous ribbon.
const STRIP_VERT = /* glsl */ `
  uniform float uX, uTime, uVel, uAmp, uHover;
  uniform vec2 uSize;
  varying vec2 vUv;
  varying float vShade;
  void main() {
    vUv = uv;
    vec3 p = position;
    p.xy *= uSize;
    float H = uSize.y;
    float wx = p.x + uX;                 // position along the strip
    float u = wx / uSize.x;              // ...measured in frames
    float fl = 1.0 - uHover * 0.92;    // hovered frame straightens out
    float a = uAmp * (1.0 + min(abs(uVel) * 4.0, 1.8)); // faster scroll = bigger wave
    float tw = sin(u * 0.9 - 0.6 + uTime * 0.18) * 0.42 * a * fl; // twist
    float y = p.y * cos(tw);
    float z = p.y * sin(tw);
    y += sin(u * 1.15 + uTime * 0.22) * 0.22 * H * a * fl;        // wave
    z += cos(u * 0.8 + 0.4) * 0.4 * H * a * fl + uHover * 0.9;    // depth
    vShade = 0.74 + 0.26 * cos(tw * 1.6);                            // fake light
    gl_Position = projectionMatrix * modelViewMatrix * vec4(wx, y, z, 1.0);
  }`;
const FILM_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uAlpha, uGroup;
  varying vec2 vUv;
  varying float vShade;
  void main() {
    vec4 c = texture2D(uMap, vUv);
    float a = c.a * uAlpha * uGroup;
    if (a < 0.01) discard;               // sprocket holes
    gl_FragColor = vec4(c.rgb * vShade, a);
  }`;

// The index: flat film cells that bow a little while you drag.
const CELL_VERT = /* glsl */ `
  uniform vec2 uSize, uPos;
  uniform float uHover, uVel;
  varying vec2 vUv;
  varying float vShade;
  void main() {
    vUv = uv;
    vec3 p = position;
    p.xy *= uSize * (1.0 + uHover * 0.1);
    float ax = uv.x * 2.0 - 1.0;
    p.z += uHover * 0.8 - abs(uVel) * 0.7 * (1.0 - ax * ax);
    p.xy += uPos;
    vShade = 1.0;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }`;

// The photo view: pincushion + bulge while moving between takes.
const PHOTO_VERT = /* glsl */ `
  uniform vec2 uSize;
  uniform float uY, uVel, uScale;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    p.xy *= uSize * uScale;
    float d = uv.y * 2.0 - 1.0;
    float ax = uv.x * 2.0 - 1.0;
    p.x *= 1.0 + abs(uVel) * 0.35 * d * d;
    p.z -= abs(uVel) * 1.4 * (1.0 - ax * ax);
    p.y += uY;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }`;
const PHOTO_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uAlpha, uGroup;
  varying vec2 vUv;
  void main() {
    gl_FragColor = vec4(texture2D(uMap, vUv).rgb, uAlpha * uGroup);
  }`;

function shaderMesh(geo, uniforms, vert, frag) {
  const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms, vertexShader: vert, fragmentShader: frag, transparent: true }));
  m.frustumCulled = false; // we move vertices in the shader, so skip Three's culling
  return m;
}

// ── 3. the film strip (WORK) ─────────────────────────────────
const strip = {
  group: new THREE.Group(), frames: [], scroll: 0, target: 0, S: 1, W: 1, H: 1,
  alpha: { value: 1 }, vel: { value: 0 }, amp: { value: reduce ? 0.3 : 1 },
  hovered: -1, active: -1,
};
scene.add(strip.group);
const geoStrip = new THREE.PlaneGeometry(1, 1, 48, 12);

function buildStrip(coverTex) {
  const count = N * Math.ceil(24 / N); // repeat the rolls so the loop is long enough
  for (let i = 0; i < count; i++) {
    const ri = i % N;
    const u = {
      uMap: { value: coverTex[ri] }, uX: { value: 0 }, uSize: { value: new THREE.Vector2(1, 1) },
      uHover: { value: 0 }, uAlpha: { value: 0 },
      uGroup: strip.alpha, uVel: strip.vel, uAmp: strip.amp, uTime: T,
    };
    const mesh = shaderMesh(geoStrip, u, STRIP_VERT, FILM_FRAG);
    strip.group.add(mesh);
    strip.frames.push({ mesh, u, ri, x: 0 });
  }
}

function layoutStrip() {
  const aspect = 1024 / 1000; // film cell width / height
  strip.H = mobile ? (VW * 0.78) / aspect : Math.min(VH * 0.5, (VW * 0.34) / aspect);
  strip.W = strip.H * aspect;
  strip.S = strip.W; // frames touch, like a real strip
}

const ampNow = () => strip.amp.value * (1 + Math.min(Math.abs(strip.vel.value) * 4, 1.8));

function updateStrip(dt) {
  const k = 1 - Math.exp(-dt * (P.down ? 14 : 5));
  strip.scroll += (strip.target - strip.scroll) * k;
  const v = (strip.target - strip.scroll) / strip.S; // speed, in frames
  strip.vel.value += ((reduce ? 0 : v) - strip.vel.value) * Math.min(1, dt * 8);
  const total = strip.frames.length * strip.S;
  let best = Infinity, bi = 0;
  const keepHover = state.view === 'work' || state.view === 'project';
  strip.frames.forEach((f, i) => {
    const x = mod(i * strip.S - strip.scroll + total / 2, total) - total / 2; // infinite loop
    f.x = x;
    f.u.uX.value = x;
    f.u.uSize.value.set(strip.W, strip.H);
    const h = i === strip.hovered && keepHover ? 1 : 0;
    f.u.uHover.value += (h - f.u.uHover.value) * Math.min(1, dt * 7);
    if (Math.abs(x) < best) { best = Math.abs(x); bi = i; }
  });
  const ri = strip.frames[bi].ri;
  if (ri !== strip.active) {
    strip.active = ri;
    if (state.view === 'work' && state.ready) { updateReadout(); live(ROLLS[ri].title); }
  }
}

// which frame is under the pointer? (same maths as the shader's centre line)
function pickStrip(mx, my) {
  let hit = -1;
  const a = ampNow();
  strip.frames.forEach((f, i) => {
    if (Math.abs(f.x - mx) > strip.W / 2) return;
    const cy = f.u.uHover.value > 0.5 ? 0 : Math.sin((mx / strip.W) * 1.15 + T.value * 0.22) * 0.22 * strip.H * a;
    if (Math.abs(my - cy) < strip.H * 0.46) hit = i;
  });
  return hit;
}

// slide the strip so a roll sits in the middle
function centerStripOn(ri) {
  let best = null;
  strip.frames.forEach((f) => { if (f.ri === ri && (!best || Math.abs(f.x) < Math.abs(best.x))) best = f; });
  if (best) { strip.target = strip.scroll + best.x; }
}

// ── 4. the contact sheet (INDEX) ─────────────────────────────
const grid = {
  group: new THREE.Group(), pool: [], tex: [], sx: 0, sy: 0, tx: 0, ty: 0,
  vel: { value: 0 }, alpha: { value: 0 }, cw: 1, ch: 1, stepY: 1, hovered: null,
};
scene.add(grid.group);
const geoCell = new THREE.PlaneGeometry(1, 1, 16, 6);

function ensurePool(n) {
  while (grid.pool.length < n) {
    const u = {
      uMap: { value: null }, uSize: { value: new THREE.Vector2() }, uPos: { value: new THREE.Vector2() },
      uHover: { value: 0 }, uAlpha: { value: 1 }, uVel: grid.vel, uGroup: grid.alpha,
    };
    const mesh = shaderMesh(geoCell, u, CELL_VERT, FILM_FRAG);
    grid.group.add(mesh);
    grid.pool.push({ mesh, u, gc: 0, gr: 0, idx: 0, x: 0, y: 0 });
  }
}

function layoutGrid() {
  grid.cw = mobile ? VW / 2.3 : VW / 6.2;
  grid.ch = grid.cw / 1.024;
  grid.stepY = grid.ch * 1.24;
}

function updateGrid(dt) {
  const k = 1 - Math.exp(-dt * (P.down ? 14 : 5));
  const dx = grid.tx - grid.sx, dy = grid.ty - grid.sy;
  grid.sx += dx * k;
  grid.sy += dy * k;
  grid.vel.value += ((reduce ? 0 : Math.min(Math.hypot(dx, dy) / grid.stepY, 1.5)) - grid.vel.value) * Math.min(1, dt * 8);
  const spread = 1 + grid.vel.value * 0.3; // rows pull apart when moving fast
  const cols = Math.ceil(VW / grid.cw) + 3, rows = Math.ceil(VH / grid.stepY) + 3;
  ensurePool(cols * rows);
  const c0 = Math.floor(grid.sx / grid.cw) - Math.floor(cols / 2);
  const r0 = Math.floor(grid.sy / grid.stepY) - Math.floor(rows / 2);
  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid.pool[i++];
      const gc = c0 + c, gr = r0 + r;
      if (cell.gc !== gc || cell.gr !== gr) cell.u.uHover.value = 0;
      cell.gc = gc; cell.gr = gr;
      cell.idx = mod(gc + gr * 10, PHOTOS.length); // endless sheet, shuffled per row
      cell.x = gc * grid.cw - grid.sx;
      cell.y = -(gr * grid.stepY - grid.sy) * spread;
      cell.u.uMap.value = grid.tex[cell.idx];
      cell.u.uPos.value.set(cell.x, cell.y);
      cell.u.uSize.value.set(grid.cw, grid.ch);
      const h = grid.hovered && grid.hovered.gc === gc && grid.hovered.gr === gr ? 1 : 0;
      cell.u.uHover.value += (h - cell.u.uHover.value) * Math.min(1, dt * 8);
      cell.mesh.renderOrder = h;
      cell.mesh.visible = true;
    }
  }
  for (; i < grid.pool.length; i++) grid.pool[i].mesh.visible = false;
}

function pickGrid(mx, my) {
  for (const cell of grid.pool) {
    if (!cell.mesh.visible) continue;
    if (Math.abs(cell.x - mx) < grid.cw / 2 && Math.abs(cell.y - my) < grid.ch * 0.42) return cell;
  }
  return null;
}

// ── 5. the photo view (one roll) ─────────────────────────────
const proj = {
  group: new THREE.Group(), planes: [], ri: -1, index: 0, y: 0, ty: 0, step: 1,
  vel: { value: 0 }, alpha: { value: 0 }, acc: 0, cool: 0,
};
scene.add(proj.group);
const geoPhoto = new THREE.PlaneGeometry(1, 1, 24, 24);
const fullImg = new Map(), fullTex = new Map();

function getFullTex(id) {
  if (!fullTex.has(id)) {
    const p = (fullImg.has(id) ? Promise.resolve(fullImg.get(id)) : loadImage(fullSrc(id)))
      .then((img) => { fullImg.set(id, img); return texFrom(img, false); });
    fullTex.set(id, p);
  }
  return fullTex.get(id);
}

async function buildProj(ri) {
  const r = ROLLS[ri];
  const texs = await Promise.all(r.takes.map((t) => getFullTex(t.id)));
  proj.planes.forEach((p) => { proj.group.remove(p.mesh); p.mesh.material.dispose(); });
  proj.planes = r.takes.map((t, i) => {
    const u = {
      uMap: { value: texs[i] }, uSize: { value: new THREE.Vector2() }, uY: { value: 0 },
      uScale: { value: 1 }, uAlpha: { value: 1 }, uVel: proj.vel, uGroup: proj.alpha,
    };
    const mesh = shaderMesh(geoPhoto, u, PHOTO_VERT, PHOTO_FRAG);
    proj.group.add(mesh);
    return { mesh, u, aspect: t.w / t.h };
  });
  layoutProj();
}

// Size the photos to the real free space between the text blocks,
// so nothing overlaps on any screen (phone, landscape phone, tablet, wide).
function layoutProj(reset = true) {
  const h = innerHeight, w = innerWidth, px = VH / h;
  let topPx, botPx, maxWpx;
  if (mobile) {
    topPx = $('.p-left').getBoundingClientRect().bottom + 14;   // under ROLL / FRAMES / caption
    botPx = h - $('.p-right').getBoundingClientRect().top + 14; // above date row + buttons
    maxWpx = w * 0.86;
  } else {
    const short = h < 560;
    topPx = short ? 64 : 100;
    botPx = short ? 92 : 140;
    const side = 28 + Math.min(w * 0.27, 310) + 20; // left/right text columns
    maxWpx = Math.min(w * 0.44, w - side * 2);
  }
  const maxH = Math.max(90, h - topPx - botPx) * px, maxW = Math.max(120, maxWpx) * px;
  proj.step = maxH * 1.1;
  proj.planes.forEach((p) => {
    let ph = maxH, pw = ph * p.aspect;
    if (pw > maxW) { pw = maxW; ph = pw / p.aspect; }
    p.u.uSize.value.set(pw, ph);
  });
  proj.group.position.y = ((botPx - topPx) / 2) * px; // centre of the free space
  proj.ty = proj.index * proj.step;
  if (reset) proj.y = proj.ty;
}

function updateProj(dt) {
  proj.y += (proj.ty - proj.y) * (1 - Math.exp(-dt * 6));
  const v = (proj.ty - proj.y) / proj.step;
  proj.vel.value += ((reduce ? 0 : v) - proj.vel.value) * Math.min(1, dt * 10);
  proj.planes.forEach((p, i) => {
    p.u.uY.value = -(i * proj.step) + proj.y;
    const a = i === proj.index ? 1 : 0.18;
    p.u.uAlpha.value += (a - p.u.uAlpha.value) * Math.min(1, dt * 6);
  });
}

function stepTake(d) {
  const n = proj.planes.length;
  const ni = Math.max(0, Math.min(n - 1, proj.index + d));
  if (ni === proj.index) return;
  proj.index = ni;
  proj.ty = ni * proj.step;
  fillTake();
}

async function openRoll(ri, ti = 0) {
  const token = ++state.token;
  const from = state.view;
  state.view = 'project';
  setBodyView('project');
  body.classList.add('dark');
  centerStripOn(ri);
  if (from === 'project') {
    gsap.to(proj.alpha, { value: 0, duration: 0.3 });
    await wait(300);
  } else {
    // the clicked frame lifts and lingers; the rest of the strip fades first
    strip.frames.forEach((f, i) => {
      const keep = i === strip.hovered;
      gsap.to(f.u.uAlpha, { value: 0, duration: keep ? 0.5 : 0.45, delay: keep ? 0.35 : 0, ease: 'power2.out', overwrite: true });
    });
    gsap.to(grid.alpha, { value: 0, duration: 0.5, overwrite: true });
  }
  await buildProj(ri);
  if (token !== state.token) return; // user moved on while loading
  proj.ri = ri;
  proj.index = Math.min(ti, proj.planes.length - 1);
  fillProject(); // fill the text first so the photo can fit around it
  layoutProj();
  const cur = proj.planes[proj.index];
  gsap.fromTo(cur.u.uScale, { value: 0.8 }, { value: 1, duration: reduce ? 0.01 : 1.2, ease: 'expo.out', delay: from === 'project' ? 0 : 0.25 });
  gsap.to(proj.alpha, { value: 1, duration: 0.8, delay: from === 'project' ? 0 : 0.25, overwrite: true });
}

function closeRoll(v) {
  state.token++;
  gsap.to(proj.alpha, { value: 0, duration: 0.45, overwrite: true });
  if (v === 'info') { showView('info'); return; }
  body.classList.remove('dark');
  state.view = v;
  state.base = v;
  setBodyView(v);
  strip.hovered = -1;
  if (v === 'work') {
    strip.alpha.value = 1;
    strip.frames.forEach((f) => {
      const d = 0.2 + Math.min(Math.abs(f.x) / strip.S, 6) * 0.06;
      gsap.to(f.u.uAlpha, { value: 1, duration: 0.7, delay: d, overwrite: true });
    });
  } else {
    strip.alpha.value = 0;
    strip.frames.forEach((f) => { f.u.uAlpha.value = 1; });
    gsap.to(grid.alpha, { value: 1, duration: 0.7, delay: 0.2, overwrite: true });
  }
  updateReadout();
}

// ── 6. input ─────────────────────────────────────────────────
const P = { x: innerWidth / 2, y: innerHeight / 2, down: false, sx: 0, sy: 0, lx: 0, ly: 0, moved: 0, inside: false, last: 0 };
const isUI = (t) => !!(t.closest && t.closest('button, a, #menu, #info, #veil, #sheet, #sh-scrim, #intro'));
const overlayOpen = () => body.classList.contains('menu-open') || body.classList.contains('sheet-open');
const touched = () => { P.last = performance.now(); body.classList.add('touched'); };

addEventListener('pointerdown', (e) => {
  if (!state.ready || isUI(e.target) || overlayOpen()) return;
  Object.assign(P, { down: true, sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY, x: e.clientX, y: e.clientY, moved: 0, inside: true });
  touched();
});
addEventListener('pointermove', (e) => {
  P.x = e.clientX; P.y = e.clientY; P.inside = true;
  if (!P.down) return;
  const dx = e.clientX - P.lx, dy = e.clientY - P.ly;
  P.lx = e.clientX; P.ly = e.clientY;
  P.moved += Math.abs(dx) + Math.abs(dy);
  const wpp = VW / innerWidth; // world units per screen pixel
  if (state.view === 'work') strip.target -= (dx + dy * 0.8) * wpp * 1.2;
  else if (state.view === 'index') { grid.tx -= dx * wpp; grid.ty -= dy * wpp; }
  touched();
});
addEventListener('pointerup', (e) => {
  if (!P.down) return;
  P.down = false;
  P.x = e.clientX; P.y = e.clientY;
  if (P.moved < 8) handleClick();
  else if (state.view === 'project') { const dy = e.clientY - P.sy; if (Math.abs(dy) > 40) stepTake(dy < 0 ? 1 : -1); }
  if (e.pointerType !== 'mouse') P.inside = false;
});
document.addEventListener('pointerleave', () => { P.inside = false; });

addEventListener('wheel', (e) => {
  if (!state.ready || state.view === 'info' || overlayOpen() || (e.target.closest && e.target.closest('#sheet, #intro'))) return;
  e.preventDefault();
  const m = e.deltaMode === 1 ? 16 : 1;
  const dx = e.deltaX * m, dy = e.deltaY * m;
  if (state.view === 'work') strip.target += (dx + dy) * strip.S * 0.0025;
  else if (state.view === 'index') { grid.tx += dx * grid.cw * 0.004; grid.ty += dy * grid.stepY * 0.004; }
  else if (state.view === 'project') {
    const now = performance.now();
    proj.acc += dy + dx;
    if (Math.abs(proj.acc) > 45 && now > proj.cool) { stepTake(Math.sign(proj.acc)); proj.cool = now + 650; proj.acc = 0; }
    if (now > proj.cool + 300) proj.acc *= 0.5;
  }
  touched();
}, { passive: false });

function worldPointer() {
  return { mx: (P.x / innerWidth * 2 - 1) * VW / 2, my: -(P.y / innerHeight * 2 - 1) * VH / 2 };
}

function handleClick() {
  const { mx, my } = worldPointer();
  if (state.view === 'work') {
    const i = pickStrip(mx, my);
    if (i >= 0) { strip.hovered = i; location.hash = '#' + ROLLS[strip.frames[i].ri].slug; }
  } else if (state.view === 'index') {
    const c = pickGrid(mx, my);
    if (c) { const p = PHOTOS[c.idx]; state.pendingTake = p.ti; location.hash = '#' + ROLLS[p.ri].slug; }
  }
}

addEventListener('keydown', (e) => {
  if (!state.ready) return;
  if (body.classList.contains('sheet-open') || body.classList.contains('intro-on')) return; // they handle their own keys
  if (e.key === 'Escape') {
    if (body.classList.contains('menu-open')) toggleMenu(false);
    else if (state.view === 'project') goBack();
    return;
  }
  if (e.target.closest && e.target.closest('button, a')) return;
  if (state.view === 'work') {
    if (e.key === 'ArrowRight') { strip.target += strip.S; touched(); }
    else if (e.key === 'ArrowLeft') { strip.target -= strip.S; touched(); }
    else if (e.key === 'Enter') location.hash = '#' + ROLLS[strip.active].slug;
  } else if (state.view === 'project') {
    if (e.key === 'ArrowDown') stepTake(1);
    else if (e.key === 'ArrowUp') stepTake(-1);
    else if (e.key === 'ArrowRight') $('#next').click();
    else if (e.key === 'ArrowLeft') $('#prev').click();
  } else if (state.view === 'index') {
    const k = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[e.key];
    if (k) { grid.tx += k[0] * grid.cw; grid.ty += k[1] * grid.stepY; }
  }
});

// ── 7. routing (plain #names: #work, #index, #info, #<roll>) ─
function route() {
  const h = decodeURIComponent(location.hash.slice(1));
  const ri = ROLLS.findIndex((r) => r.slug === h);
  if (ri >= 0) {
    if (state.view === 'project' && proj.ri === ri) return;
    if (state.view === 'work' || state.view === 'index') state.base = state.view;
    const ti = state.pendingTake ?? 0;
    state.pendingTake = null;
    openRoll(ri, ti);
    return;
  }
  showView(h === 'index' || h === 'info' ? h : 'work');
}
addEventListener('hashchange', route);
const goBack = () => { location.hash = state.base === 'index' ? '#index' : '#work'; };

function showView(v) {
  if (state.view === 'project' && v !== 'info') { closeRoll(v); return; }
  if (state.view === 'project') gsap.to(proj.alpha, { value: 0, duration: 0.4, overwrite: true });
  state.view = v;
  if (v !== 'info') state.base = v;
  setBodyView(v);
  body.classList.toggle('dark', v === 'info');
  strip.hovered = -1;
  gsap.to(strip.alpha, { value: v === 'work' ? 1 : 0, duration: 0.6, delay: v === 'work' ? 0.15 : 0, overwrite: true });
  if (v === 'work') strip.frames.forEach((f) => { if (f.u.uAlpha.value < 1) gsap.to(f.u.uAlpha, { value: 1, duration: 0.6, overwrite: true }); });
  gsap.to(grid.alpha, { value: v === 'index' ? 1 : 0, duration: 0.6, delay: v === 'index' ? 0.15 : 0, overwrite: true });
  if (v === 'info') { $('#info').scrollTop = 0; updateDrum(); }
  updateReadout();
}

function setBodyView(v) {
  body.dataset.view = v;
  $('#project').setAttribute('aria-hidden', v !== 'project');
  $('#info').setAttribute('aria-hidden', v !== 'info');
  document.querySelectorAll('#menu a').forEach((a) => {
    const on = a.dataset.v === (v === 'project' ? state.base : v);
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}

// ── 8. HTML bits: readout, rolling digits, menu, info drum ───
// Rolling characters: each letter is a little window with the old
// letter above the new one; sliding it up makes the odometer effect.
function rollText(el, text) {
  if (el.dataset.v === text) return;
  const old = el.dataset.v || '';
  el.dataset.v = text;
  el.setAttribute('aria-label', text);
  const len = Math.max(old.length, text.length);
  const frag = document.createDocumentFragment();
  const moving = [];
  const span = (ch) => { const s = document.createElement('span'); s.textContent = ch === ' ' ? ' ' : ch; return s; };
  for (let i = 0; i < len; i++) {
    const a = old[i] ?? ' ', b = text[i] ?? ' ';
    const cell = document.createElement('span'); cell.className = 'rc'; cell.setAttribute('aria-hidden', 'true');
    const inner = document.createElement('span'); inner.className = 'ri';
    if (a === b || reduce) inner.append(span(b)); else { inner.append(span(a), span(b)); moving.push([inner, i]); }
    cell.append(inner);
    frag.append(cell);
  }
  el.replaceChildren(frag);
  requestAnimationFrame(() => requestAnimationFrame(() => moving.forEach(([n, i]) => {
    n.style.transitionDelay = `${Math.min(i * 12, 360)}ms`;
    n.classList.add('go');
  })));
}

function updateReadout() {
  const L = $('#r-left'), R = $('#r-right');
  if (state.view === 'work' && strip.active >= 0) {
    const r = ROLLS[strip.active];
    rollText(L, `${pad(strip.active + 1)} / ${pad(N)} · ${r.title}`);
    rollText(R, exif(r.takes[0]));
  } else if (state.view === 'index') {
    const p = grid.hovered ? PHOTOS[grid.hovered.idx] : null;
    if (p) { rollText(L, `${pad(p.ri + 1)} / ${pad(N)} · ${ROLLS[p.ri].title}`); rollText(R, exif(p)); }
    else { rollText(L, `${PHOTOS.length} frames · ${N} rolls`); rollText(R, 'Drag in any direction'); }
  }
}

let typing = 0;
function typeText(el, text) {
  clearInterval(typing);
  if (reduce) { el.textContent = text; return; }
  let i = 0;
  el.textContent = '';
  typing = setInterval(() => { el.textContent = text.slice(0, ++i); if (i >= text.length) clearInterval(typing); }, 16);
}

function fillProject() {
  const r = ROLLS[proj.ri];
  $('#p-title').textContent = r.title;
  $('#p-frames').textContent = `${r.takes.length} ${r.takes.length > 1 ? 'frames' : 'frame'}`;
  typeText($('#p-note'), r.note);
  const pv = mod(proj.ri - 1, N), nx = mod(proj.ri + 1, N);
  $('#prev').textContent = `Prev · ${pad(pv + 1)}`;
  $('#next').textContent = `Next · ${pad(nx + 1)}`;
  $('#prev').onclick = () => { location.hash = '#' + ROLLS[pv].slug; };
  $('#next').onclick = () => { location.hash = '#' + ROLLS[nx].slug; };
  body.classList.toggle('single', r.takes.length < 2);
  fillTake();
}
function fillTake() {
  const r = ROLLS[proj.ri], t = r.takes[proj.index];
  $('#p-cam').textContent = t.camera || 'Unknown';
  rollText($('#p-date'), t.date || 'Undated');
  rollText($('#p-exp'), exif(t));
  rollText($('#p-take'), `${pad(proj.index + 1)} / ${pad(r.takes.length)}`);
  // per-photo caption: fade out, swap text, fade back in
  const cap = (t.caption || '').trim(), wrap = $('#p-capwrap'), el = $('#p-cap');
  wrap.hidden = !cap;
  if (cap && el.textContent !== cap) {
    el.classList.add('swap');
    setTimeout(() => { el.textContent = cap; el.classList.remove('swap'); if (mobile) layoutProj(false); }, reduce ? 0 : 250);
  }
  if (mobile) layoutProj(false);
  live(`${r.title}, frame ${proj.index + 1} of ${r.takes.length}`);
}

let liveT = 0;
function live(msg) { clearTimeout(liveT); liveT = setTimeout(() => { $('#live').textContent = msg; }, 400); }

function toggleMenu(open = !body.classList.contains('menu-open')) {
  body.classList.toggle('menu-open', open);
  $('#menu-btn').setAttribute('aria-expanded', open);
  $('#menu-btn').setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}
$('#menu-btn').addEventListener('click', () => toggleMenu());
$('#veil').addEventListener('click', () => toggleMenu(false));
document.querySelectorAll('#menu a').forEach((a) => a.addEventListener('click', () => toggleMenu(false)));
$('#back').addEventListener('click', goBack);
$('#menu-intro').addEventListener('click', () => { toggleMenu(false); if (state.view !== 'work') location.hash = '#work'; setTimeout(openIntro, 450); });

// Info: build the lists, then turn blocks on a drum as you scroll
function buildInfo() {
  $('#i-rolls').innerHTML = '';
  ROLLS.forEach((r, i) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#' + r.slug;
    a.textContent = `${pad(i + 1)} ${r.title}`;
    const s = document.createElement('small');
    s.textContent = ` · ${r.takes.length}`;
    li.append(a, s);
    $('#i-rolls').append(li);
  });
  const cams = {};
  PHOTOS.forEach((p) => { const k = p.camera || 'Unknown (no data)'; cams[k] = (cams[k] || 0) + 1; });
  $('#i-cams').innerHTML = '';
  Object.entries(cams).sort((a, b) => b[1] - a[1]).forEach(([k, n]) => {
    const li = document.createElement('li');
    li.textContent = `${k} · ${n} ${n > 1 ? 'frames' : 'frame'}`;
    $('#i-cams').append(li);
  });
  $('#menu-count').textContent = `${PHOTOS.length} frames · ${N} rolls`;
  $('#ld-total').textContent = pad(PHOTOS.length);
  $('#vf-exp').textContent = `${PHOTOS.length} exp`;
}
const drumEls = [...document.querySelectorAll('.d')];
function updateDrum() {
  const vh = innerHeight;
  drumEls.forEach((el) => {
    const r = el.getBoundingClientRect();
    const t = Math.max(-1.4, Math.min(1.4, (r.top + r.height / 2 - vh / 2) / vh));
    el.style.transform = reduce ? '' : `rotateX(${(-t * 38).toFixed(2)}deg)`;
    el.style.opacity = (1 - Math.max(0, Math.abs(t) - 0.25) * 1.1).toFixed(3);
  });
}
$('#info').addEventListener('scroll', updateDrum, { passive: true });

// ── 9. boot + render loop ────────────────────────────────────
function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  VH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
  VW = VH * camera.aspect;
  // phones, and tablets held upright, use the stacked layout
  mobile = innerWidth < 700 || (innerWidth < 1000 && innerHeight > innerWidth);
  const oldS = strip.S;
  layoutStrip();
  strip.target *= strip.S / oldS; strip.scroll *= strip.S / oldS;
  layoutGrid();
  layoutProj();
  if (state.view === 'info') updateDrum();
}
addEventListener('resize', resize);

// the aperture on the loader: a hexagon that opens and turns
const iris = $('#iris'), ig = iris.getContext('2d');
const irisV = { value: 0 };
function drawIris() {
  const dpr = Math.min(devicePixelRatio, 2);
  const w = (iris.width = innerWidth * dpr), h = (iris.height = innerHeight * dpr);
  ig.fillStyle = '#0b0b0b';
  ig.fillRect(0, 0, w, h);
  const R = (Math.hypot(w, h) / 2) * irisV.value, rot = irisV.value * 1.6;
  const pts = [];
  for (let k = 0; k < 6; k++) { const a = rot + (k * Math.PI) / 3; pts.push([w / 2 + Math.cos(a) * R, h / 2 + Math.sin(a) * R]); }
  ig.globalCompositeOperation = 'destination-out';
  ig.beginPath(); pts.forEach(([x, y]) => ig.lineTo(x, y)); ig.closePath(); ig.fill();
  ig.globalCompositeOperation = 'source-over';
  ig.strokeStyle = 'rgba(255,255,255,.09)'; ig.lineWidth = 1.5 * dpr;
  pts.forEach(([x, y], k) => { // blade seams continue past each corner
    const [px, py] = pts[(k + 5) % 6];
    const dx = x - px, dy = y - py, l = Math.hypot(dx, dy) || 1;
    ig.beginPath(); ig.moveTo(x, y); ig.lineTo(x + (dx / l) * w, y + (dy / l) * w); ig.stroke();
  });
}

function blank() { const c = document.createElement('canvas'); c.width = c.height = 4; return c; }

async function boot() {
  body.style.setProperty('--grain', `url(${makeGrain()})`);
  buildInfo();
  drawIris();
  const irisTick = () => drawIris();
  gsap.ticker.add(irisTick);
  try {
    await Promise.race([
      Promise.all([document.fonts.load('800 20px Mulish'), document.fonts.load('700 20px "IBM Plex Mono"')]),
      wait(2500),
    ]);
  } catch (e) { /* fonts are optional */ }

  const covers = ROLLS.map((r) => r.takes[0].id);
  const total = covers.length + PHOTOS.length;
  let done = 0;
  const tick = () => {
    done++;
    $('#ld-n').textContent = pad(Math.round((done / total) * PHOTOS.length));
    gsap.to(irisV, { value: 0.06 + 0.3 * (done / total), duration: 0.5, overwrite: true });
  };
  const safe = (p) => p.catch(() => blank());
  const coverImgs = await Promise.all(covers.map((id) => safe(loadImage(fullSrc(id))).then((im) => { tick(); if (im.naturalWidth) fullImg.set(id, im); return im; })));
  const thumbImgs = await Promise.all(PHOTOS.map((p) => safe(loadImage(thumbSrc(p.id))).then((im) => { tick(); return im; })));

  const opts = { name: SITE.name, stock: SITE.stock, code: SITE.code };
  const coverTex = coverImgs.map((im, ri) => texFrom(drawFilmFrame(im, { ...opts, w: 1024, h: 1000, num: ri + 1 }), true));
  grid.tex = thumbImgs.map((im, i) => texFrom(drawFilmFrame(im, { ...opts, w: 512, h: 500, num: i + 1 }), true));
  buildStrip(coverTex);
  resize();
  coverTex.concat(grid.tex).forEach((t) => renderer.initTexture(t)); // upload now, not on first view

  await gsap.to(irisV, { value: 1.15, duration: reduce ? 0.2 : 1.2, ease: 'expo.inOut', overwrite: true });
  gsap.ticker.remove(irisTick);
  gsap.to('#loader', { autoAlpha: 0, duration: 0.5 });
  body.classList.remove('loading');
  state.ready = true;

  route();
  if (state.view === 'work') {
    strip.scroll = -strip.S * 5; // sweep in from the left
    strip.frames.forEach((f, i) => gsap.to(f.u.uAlpha, { value: 1, duration: 1, delay: 0.1 + (i % 8) * 0.04 }));
    updateReadout();
  }
  if (state.view === 'work') setTimeout(maybeIntro, 1400); // first visit: explain the site
  PHOTOS.forEach((p) => getFullTex(p.id)); // fetch the rest quietly
}

const cursor = $('#cursor');
let cx = innerWidth / 2, cy = innerHeight / 2, last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!reduce) T.value += dt;
  if (state.ready) {
    const { mx, my } = worldPointer();
    let hovering = false;
    if (state.view === 'work') {
      if (!P.down && P.inside && !overlayOpen()) strip.hovered = pickStrip(mx, my);
      else if (P.down && P.moved > 8) strip.hovered = -1;
      hovering = strip.hovered >= 0;
      // settle on the nearest frame once the user lets go
      if (!P.down && now - P.last > 220) strip.target = Math.round(strip.target / strip.S) * strip.S;
    } else if (state.view === 'index') {
      const h = !P.down && P.inside && !overlayOpen() ? pickGrid(mx, my) : null;
      const changed = (h && h.gc + ',' + h.gr) !== (grid.hovered && grid.hovered.gc + ',' + grid.hovered.gr);
      grid.hovered = h ? { gc: h.gc, gr: h.gr, idx: h.idx } : null;
      if (changed) updateReadout();
      hovering = !!h;
    }
    body.classList.toggle('hovering', hovering);
    cursor.classList.toggle('hov', hovering);
    updateStrip(dt);
    if (grid.alpha.value > 0.001) updateGrid(dt);
    updateProj(dt);
    strip.group.visible = strip.alpha.value > 0.001;
    grid.group.visible = grid.alpha.value > 0.001;
    proj.group.visible = proj.alpha.value > 0.001;
    renderer.render(scene, camera);
  }
  cx += (P.x - cx) * 0.22;
  cy += (P.y - cy) * 0.22;
  cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
  requestAnimationFrame(frame);
}

setBodyView('work');
initMusic();
initIntro();
boot();
requestAnimationFrame(frame);
