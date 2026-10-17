// Low-res NES-style screen: 256x240 canvas scaled up with hard pixels.
export const W = 256;
export const H = 240;
export const PLAY_H = 192; // playfield height, HUD below

// NES (2C02) palette subset. Letters are used in sprite maps.
export const PAL = {
  K: '#000000', // black
  W: '#FCFCFC', // white
  w: '#BCBCBC', // light gray
  g: '#7C7C7C', // gray
  G: '#00A800', // green
  D: '#005800', // dark green
  L: '#58D854', // light green
  R: '#F83800', // red
  r: '#A81000', // dark red
  o: '#E45C10', // orange
  O: '#FCA044', // light orange
  s: '#FCA044', // skin
  t: '#F0D0B0', // pale skin
  Y: '#F8B800', // yellow
  y: '#F8D878', // pale yellow
  k: '#AC7C00', // khaki
  d: '#503000', // dark brown
  b: '#881400', // brown
  B: '#0058F8', // blue
  C: '#3CBCFC', // cyan
  P: '#6888FC', // sky
  p: '#F878F8', // pink
};

export let canvas = null;
export let ctx = null;
let reservedRight = 0;
let fit = () => {};
let onFit = null;

// Debug hook: receives the window/screen numbers used to size the game.
export function setFitListener(fn) {
  onFit = fn;
  fit();
}

// Space on the right taken by the rules panel; the game shrinks into what is left.
export function setReservedRight(px) {
  reservedRight = px;
  fit();
}

export function initScreen(el) {
  canvas = el;
  canvas.width = W;
  canvas.height = H;
  ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = false;
  const desktop = window.matchMedia?.('(pointer: fine)').matches;
  let last = '';
  fit = () => {
    const vw = window.innerWidth - reservedRight;
    // On desktop the browser window can extend under the Windows taskbar (or off the screen):
    // keep the game inside the part of the window that is actually visible.
    let hidden = 0;
    if (desktop && screen.availHeight) {
      const usableBottom = (screen.availTop || 0) + screen.availHeight;
      hidden = Math.max(0, Math.min(80, window.screenY + window.outerHeight - usableBottom)); // 80: taller than any taskbar
      if (hidden < 12) hidden = 0; // a maximized window's invisible border sticks out a few pixels
    }
    const vh = window.innerHeight - hidden;
    let s = Math.min(vw / W, vh / H);
    // Prefer whole-pixel scaling when it costs little screen space.
    const si = Math.floor(s);
    if (si >= 1 && si / s > 0.85) s = si;
    onFit?.({
      inner: `${window.innerWidth}x${window.innerHeight}`,
      outer: `${window.outerWidth}x${window.outerHeight}`,
      screenY: window.screenY,
      screen: `${screen.width}x${screen.height}`,
      avail: `${screen.availTop || 0}+${screen.availHeight}`,
      dpr: window.devicePixelRatio,
      hidden,
      canvas: `${Math.floor(W * s)}x${Math.floor(H * s)}`,
    });
    const key = `${s}|${hidden}|${reservedRight}`;
    if (key === last) return;
    last = key;
    canvas.style.width = `${Math.floor(W * s)}px`;
    canvas.style.height = `${Math.floor(H * s)}px`;
    canvas.style.marginRight = `${reservedRight}px`;
    canvas.style.marginBottom = `${hidden}px`;
  };
  window.addEventListener('resize', fit);
  window.visualViewport?.addEventListener('resize', fit);
  // Moving a window fires no event, so re-check now and then.
  if (desktop) setInterval(fit, 1000);
  fit();
  return ctx;
}

export function toGame(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((clientX - r.left) / r.width) * W,
    y: ((clientY - r.top) / r.height) * H,
  };
}

export function rect(c, x, y, w, h, color) {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function frameRect(c, x, y, w, h, color) {
  rect(c, x, y, w, 1, color);
  rect(c, x, y + h - 1, w, 1, color);
  rect(c, x, y, 1, h, color);
  rect(c, x + w - 1, y, 1, h, color);
}

// Filled circle made of whole-pixel rows (no antialiasing).
export function disc(c, cx, cy, r, color) {
  if (r <= 0) return;
  c.fillStyle = color;
  const ri = Math.ceil(r);
  const x0 = Math.round(cx);
  const y0 = Math.round(cy);
  for (let dy = -ri; dy <= ri; dy++) {
    const hw = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy)));
    if (r * r - dy * dy < 0) continue;
    c.fillRect(x0 - hw, y0 + dy, hw * 2 + 1, 1);
  }
}

// ---- Bitmap text: Press Start 2P rendered once, thresholded to hard pixels ----
const textCache = new Map();

export async function loadFont() {
  try {
    await Promise.race([
      document.fonts.load('8px "Press Start 2P"', 'AZaz09АЯая'),
      new Promise((r) => setTimeout(r, 4000)),
    ]);
  } catch (e) { /* offline: fall back to monospace */ }
  textCache.clear();
}

function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function textSprite(str, color) {
  const key = color + '\u0000' + str;
  let c = textCache.get(key);
  if (c) return c;
  // The font is drawn on an 8x8 grid: render it 8x larger and sample each cell's centre,
  // which gives exact pixels without antialiasing smudges.
  const S = 8;
  const w = Math.max(1, str.length * 8);
  const big = document.createElement('canvas');
  big.width = w * S;
  big.height = 8 * S;
  const bx = big.getContext('2d', { willReadFrequently: true });
  bx.font = `${8 * S}px "Press Start 2P", monospace`;
  bx.textBaseline = 'alphabetic';
  bx.fillStyle = '#fff';
  bx.fillText(str, 0, 8 * S);
  const src = bx.getImageData(0, 0, big.width, big.height).data;
  c = document.createElement('canvas');
  c.width = w;
  c.height = 8;
  const x = c.getContext('2d');
  const img = x.createImageData(w, 8);
  const d = img.data;
  const [r, g, b] = hexRgb(color);
  for (let py = 0; py < 8; py++) {
    for (let px = 0; px < w; px++) {
      const a = src[((py * S + S / 2) * big.width + px * S + S / 2) * 4 + 3];
      if (a < 128) continue;
      const i = (py * w + px) * 4;
      d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);
  textCache.set(key, c);
  return c;
}

export function textWidth(str, scale = 1) {
  return String(str).length * 8 * scale;
}

export function drawText(c, str, x, y, color = PAL.W, opts = {}) {
  const { scale = 1, align = 'left', shadow = null } = opts;
  str = String(str);
  if (!str) return;
  const spr = textSprite(str, color);
  const w = spr.width * scale;
  let dx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  dx = Math.round(dx);
  const dy = Math.round(y);
  if (shadow) c.drawImage(textSprite(str, shadow), dx + scale, dy + scale, w, 8 * scale);
  c.drawImage(spr, dx, dy, w, 8 * scale);
}

export function drawCrosshair(c, x, y, color = PAL.W) {
  x = Math.round(x);
  y = Math.round(y);
  rect(c, x - 8, y, 5, 2, color);
  rect(c, x + 4, y, 5, 2, color);
  rect(c, x, y - 8, 2, 5, color);
  rect(c, x, y + 4, 2, 5, color);
  rect(c, x, y, 2, 2, PAL.R);
}
