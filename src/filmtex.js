// ─────────────────────────────────────────────────────────────
// Drawing a 35mm film frame with Canvas 2D.
// Each frame = dark film base + the photo in a window + punched
// sprocket holes (transparent) + edge printing (name, code, numbers).
// The canvas then becomes a WebGL texture (THREE.CanvasTexture).
// ─────────────────────────────────────────────────────────────

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load ' + src));
    img.src = src;
  });
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// draw an image like CSS object-fit: cover. focusY 0..1 picks which part of a tall photo stays.
function cover(g, img, x, y, w, h, focusY = 0.38) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const s = Math.max(w / iw, h / ih);
  const sw = w / s, sh = h / s;
  const sx = (iw - sw) / 2;
  const sy = (ih - sh) * focusY;
  g.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

export function drawFilmFrame(img, { w = 1024, h = 1000, num = 1, name = 'BENITIA', stock = '400', code = 'BT-36' } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const band = Math.round(h * 0.17);   // height of the sprocket band (top and bottom)

  // film base: near-black with a soft sheen
  const base = g.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, '#2c2c2c');
  base.addColorStop(0.5, '#171717');
  base.addColorStop(1, '#282828');
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);

  // photo window
  const mx = Math.round(w * 0.03);
  const wx = mx, wy = band, ww = w - mx * 2, wh = h - band * 2;
  g.save();
  roundRect(g, wx, wy, ww, wh, w * 0.012);
  g.clip();
  if (img) cover(g, img, wx, wy, ww, wh);
  else { g.fillStyle = '#333'; g.fillRect(wx, wy, ww, wh); }
  // a faint vignette so the photo sits "in" the film
  const v = g.createRadialGradient(w / 2, h / 2, wh * 0.35, w / 2, h / 2, ww * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,.28)');
  g.fillStyle = v;
  g.fillRect(wx, wy, ww, wh);
  g.restore();

  // a hairline where one frame meets the next
  g.fillStyle = 'rgba(255,255,255,.05)';
  g.fillRect(w - 2, 0, 2, h);

  // sprocket holes: cut them out so the page shows through
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = '#000'; // fully opaque brush = fully cut out
  const holes = 8, pitch = w / holes, hw = pitch * 0.5, hh = band * 0.34, r = hh * 0.24;
  for (let i = 0; i < holes; i++) {
    const x = i * pitch + (pitch - hw) / 2;
    roundRect(g, x, band * 0.42, hw, hh, r); g.fill();
    roundRect(g, x, h - band * 0.42 - hh, hw, hh, r); g.fill();
  }
  g.globalCompositeOperation = 'source-over';

  // edge printing
  g.fillStyle = 'rgba(236,233,226,.88)';
  g.textBaseline = 'middle';
  if ('letterSpacing' in g) g.letterSpacing = `${Math.round(band * 0.025)}px`;
  g.font = `800 ${Math.round(band * 0.19)}px Mulish, sans-serif`;
  g.fillText(`${name} ${stock}`, w * 0.06, band * 0.22);
  g.font = `700 ${Math.round(band * 0.16)}px "IBM Plex Mono", monospace`;
  g.fillText(code, w * 0.74, band * 0.22);
  g.font = `700 ${Math.round(band * 0.21)}px "IBM Plex Mono", monospace`;
  const by = h - band * 0.2;
  g.fillText(String(num), w * 0.08, by);
  g.fillText('▸', w * 0.2, by);
  g.fillText(`${num}A`, w * 0.56, by);
  g.fillText('▸', w * 0.7, by);
  return c;
}

// small tile of random noise for the film-grain overlay (CSS background)
export function makeGrain(size = 160) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const d = g.createImageData(size, size);
  for (let i = 0; i < d.data.length; i += 4) {
    const n = Math.random() * 255;
    d.data[i] = d.data[i + 1] = d.data[i + 2] = n;
    d.data[i + 3] = 255;
  }
  g.putImageData(d, 0, 0);
  return c.toDataURL('image/png');
}
