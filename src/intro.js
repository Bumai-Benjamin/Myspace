// ─────────────────────────────────────────────────────────────
// First-visit intro: three short cards explaining the site,
// the last one pointing at the music record. Shown once per
// browser (remembered in localStorage) and reopenable from the
// menu ("How it works"). Edit the words in STEPS.
// ─────────────────────────────────────────────────────────────
const STEPS = [
  {
    title: 'A roll of film',
    text: 'Every frame is a photo. Scroll, drag or use the arrow keys to move along the strip. The faster you go, the more it bends.',
  },
  {
    title: 'Open a roll',
    text: 'Click any frame to open its roll. Scroll through the takes and read the notes; Back brings you here. Index in the menu shows every photo at once.',
  },
  {
    title: 'Music while you look',
    text: 'Tap the spinning record in the corner to open the soundtrack. Pick a playlist, then any song. It keeps playing while you browse.',
    disc: true,
  },
];
const KEY = 'benitia-intro-seen';
const $ = (s) => document.querySelector(s);
const body = document.body;
let step = 0;

function seen() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
function remember() { try { localStorage.setItem(KEY, '1'); } catch (e) { /* private mode */ } }

export function initIntro() {
  $('#in-next').addEventListener('click', () => (step < STEPS.length - 1 ? show(step + 1) : close()));
  $('#in-skip').addEventListener('click', close);
  addEventListener('keydown', (e) => {
    if (!body.classList.contains('intro-on')) return;
    if (e.key === 'Escape') close();
  });
}

export function maybeIntro() { if (!seen()) openIntro(); }

export function openIntro() {
  $('#intro').hidden = false;
  requestAnimationFrame(() => body.classList.add('intro-on'));
  show(0);
  setTimeout(() => $('#in-next').focus({ preventScroll: true }), 400);
}

function show(i) {
  step = i;
  const s = STEPS[i];
  const card = $('.in-card');
  card.classList.add('swap');
  setTimeout(() => {
    $('#in-n').textContent = String(i + 1).padStart(2, '0');
    $('#in-title').textContent = s.title;
    $('#in-text').textContent = s.text;
    $('#in-next').textContent = i === STEPS.length - 1 ? 'Start' : 'Next';
    document.querySelectorAll('.in-dots i').forEach((d, k) => d.classList.toggle('on', k === i));
    body.classList.toggle('intro-disc', !!s.disc);
    card.classList.remove('swap');
  }, step === 0 && !card.dataset.ready ? 0 : 180);
  card.dataset.ready = '1';
}

function close() {
  remember();
  body.classList.remove('intro-on', 'intro-disc');
  setTimeout(() => { $('#intro').hidden = true; }, 400);
}
