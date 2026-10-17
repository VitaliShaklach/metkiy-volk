// Procedural, horizontally tiling backgrounds with parallax layers.
import { W, PLAY_H } from './render.js';

const TILE = 512;
const TAU = Math.PI * 2;
const GY = 84; // where the ground starts on most themes
const cache = new Map();

function layer() {
  const c = document.createElement('canvas');
  c.width = TILE;
  c.height = PLAY_H;
  return [c, c.getContext('2d')];
}

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function px(x, X, Y, color, w = 1, h = 1) {
  x.fillStyle = color;
  x.fillRect(Math.round(X), Math.round(Y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
}

// Smooth bumpy edge that wraps seamlessly over the tile width.
function wave(X, parts) {
  let v = 0;
  for (const [amp, k, ph] of parts) v += amp * Math.sin((TAU * X * k) / TILE + ph);
  return Math.round(v);
}

// ------------------------------------------------------------ shared pieces
function palm(x, cx, base, h) {
  let tx = cx;
  for (let i = 0; i < h; i++) {
    tx = cx + Math.round(Math.sin((i / h) * 1.4) * 3);
    px(x, tx, base - i, i % 3 === 0 ? '#503000' : '#881400', 2, 1);
  }
  const topY = base - h;
  const fronds = [
    [-1, 11, -0.6, 0.09], [1, 11, -0.6, 0.09],
    [-1, 9, 0, 0.08], [1, 9, 0, 0.08],
    [-1, 6, 0.5, 0.06], [1, 6, 0.5, 0.06],
  ];
  for (const [dir, len, a, b] of fronds) {
    for (let i = 0; i <= len; i++) {
      const fx = tx + 1 + dir * i;
      const fy = topY + Math.round(a * i + b * i * i);
      px(x, fx, fy, '#005800', 1, 2);
      px(x, fx, fy, '#00A800');
    }
  }
  px(x, tx, topY - 1, '#00A800', 2, 2);
}

const JUNGLE_EDGE = [[3, 8, 0], [2, 21, 1.3], [1.5, 45, 0.4]];

function jungleLine(x, top, bottom, seed) {
  const R = rng(seed);
  for (let X = 0; X < TILE; X++) {
    const y0 = top + wave(X, JUNGLE_EDGE);
    px(x, X, y0, '#005800', 1, bottom - y0);
    px(x, X, y0, '#00A800');
  }
  for (let i = 0; i < 1400; i++) {
    const X = Math.floor(R() * TILE);
    const y0 = top + wave(X, JUNGLE_EDGE);
    const Y = y0 + 2 + Math.floor(R() * (bottom - y0 - 2));
    px(x, X, Y, R() < 0.6 ? '#000000' : '#00A800', R() < 0.5 ? 2 : 1, 1);
  }
}

function hills(x, top, bottom, color, edge, parts) {
  for (let X = 0; X < TILE; X++) {
    const y0 = top + wave(X, parts);
    px(x, X, y0, color, 1, bottom - y0);
    px(x, X, y0, edge);
  }
}

function dottedGround(x, top, color, dot, stepX = 6, stepY = 4) {
  px(x, 0, top, color, TILE, PLAY_H - top);
  for (let Y = top + 2; Y < PLAY_H; Y += stepY) {
    const shift = ((Y - top) / stepY) % 2 ? stepX / 2 : 0;
    for (let X = shift; X < TILE; X += stepX) px(x, X, Y, dot);
  }
}

function sandbags(x, top, bottom) {
  for (let Y = top, row = 0; Y < bottom; Y += 4, row++) {
    for (let X = row % 2 ? -4 : 0; X < TILE; X += 8) {
      px(x, X, Y, '#503000', 8, 4);
      px(x, X + 1, Y, '#AC7C00', 6, 3);
      px(x, X + 2, Y, '#F8D878', 3, 1);
    }
  }
}

// ------------------------------------------------------------ themes
function buildComm() {
  const [far, f] = layer();
  hills(f, 52, GY, '#007800', '#00A800', [[5, 2, 0], [3, 5, 1], [1, 13, 2]]);
  // radio masts
  for (const [cx, h] of [[70, 50], [300, 58], [430, 44]]) {
    const base = 62;
    for (let i = 0; i < h; i++) {
      const half = Math.round(5 * (1 - i / h)) + 1;
      const col = Math.floor(i / 6) % 2 ? '#F83800' : '#FCFCFC';
      px(f, cx - half, base - i, col);
      px(f, cx + half, base - i, col);
      if (i % 6 === 0) px(f, cx - half, base - i, col, half * 2 + 1, 1);
    }
    px(f, cx - 1, base - h - 3, '#F83800', 2, 3);
  }
  // satellite dish
  for (let i = 0; i < 10; i++) px(f, 180 - i, 44 + i * 0.5, '#FCFCFC', 2, 6 - Math.abs(5 - i) * 0.5);
  px(f, 178, 52, '#7C7C7C', 2, 12);
  px(f, 174, 63, '#7C7C7C', 10, 2);

  const [near, n] = layer();
  sandbags(n, 66, GY);
  // bunker
  px(n, 220, 48, '#7C7C7C', 70, GY - 48);
  px(n, 220, 48, '#BCBCBC', 70, 3);
  px(n, 230, 60, '#000000', 50, 5);
  px(n, 246, 70, '#3C3C3C', 18, GY - 70);
  dottedGround(n, GY, '#FCA044', '#F8D878');
  return { sky: '#3CBCFC', layers: [{ c: far, speed: 0.4 }, { c: near, speed: 1 }] };
}

function buildJungle() {
  const [far, f] = layer();
  const R = rng(3);
  for (let cx = 10; cx < TILE; cx += 40 + Math.floor(R() * 40)) palm(f, cx, 34, 22 + Math.floor(R() * 12));
  jungleLine(f, 22, 92, 5);

  const [near, n] = layer();
  // river with ripples
  px(n, 0, 88, '#0058F8', TILE, 22);
  const Rw = rng(9);
  for (let i = 0; i < 260; i++) {
    const X = Math.floor(Rw() * TILE);
    const Y = 90 + Math.floor(Rw() * 18);
    px(n, X, Y, Rw() < 0.7 ? '#3CBCFC' : '#FCFCFC', 3 + Math.floor(Rw() * 4), 1);
  }
  // far bank bushes
  for (let X = 0; X < TILE; X++) {
    const y0 = 86 + wave(X, [[2, 17, 0], [1, 41, 1]]);
    px(n, X, y0, '#005800', 1, 90 - y0);
  }
  // near muddy bank and jungle floor
  px(n, 0, 108, '#503000', TILE, 4);
  dottedGround(n, 112, '#881400', '#C84C0C', 5, 4);
  return { sky: '#6888FC', layers: [{ c: far, speed: 0.5 }, { c: near, speed: 1 }] };
}

function hut(x, X) {
  const top = 50;
  // walls of bamboo
  px(x, X, top + 14, '#AC7C00', 40, GY - top - 14);
  for (let i = 0; i < 40; i += 4) px(x, X + i, top + 14, '#503000', 1, GY - top - 14);
  px(x, X + 15, top + 20, '#000000', 10, GY - top - 20);
  // straw roof
  for (let i = 0; i < 16; i++) {
    px(x, X - 4 + i * 1.5, top + 14 - i, '#F8B800', 48 - i * 3, 1);
    if (i % 3 === 0) px(x, X - 4 + i * 1.5, top + 14 - i, '#AC7C00', 48 - i * 3, 1);
  }
}

function buildVillage() {
  const [far, f] = layer();
  hills(f, 46, GY, '#007800', '#00A800', [[4, 3, 0.5], [3, 7, 2]]);
  const R = rng(21);
  for (let cx = 30; cx < TILE; cx += 90 + Math.floor(R() * 50)) palm(f, cx, 50, 28 + Math.floor(R() * 8));

  const [near, n] = layer();
  for (const X of [20, 150, 300, 410]) hut(n, X);
  // stick fence
  for (let X = 0; X < TILE; X += 6) px(n, X, 74, '#503000', 2, GY - 74);
  px(n, 0, 77, '#881400', TILE, 1);
  dottedGround(n, GY, '#E45C10', '#FCA044');
  return { sky: '#6888FC', layers: [{ c: far, speed: 0.5 }, { c: near, speed: 1 }] };
}

function barrel(x, X, Y) {
  px(x, X, Y, '#A81000', 8, 11);
  px(x, X + 1, Y, '#F83800', 2, 11);
  px(x, X, Y + 2, '#000000', 8, 1);
  px(x, X, Y + 8, '#000000', 8, 1);
  px(x, X, Y, '#F8B800', 8, 1);
}

function buildPowder() {
  const [far, f] = layer();
  // warehouses
  for (const [X, w, h] of [[0, 120, 46], [150, 90, 38], [270, 140, 50], [440, 72, 40]]) {
    const top = GY - h;
    px(f, X, top, '#7C7C7C', w, h);
    px(f, X - 2, top - 4, '#BCBCBC', w + 4, 4);
    for (let i = 8; i < w - 8; i += 16) px(f, X + i, top + 8, '#3CBCFC', 8, 6);
    px(f, X + w / 2 - 12, GY - 24, '#3C3C3C', 24, 24);
    for (let i = 0; i < 24; i += 3) px(f, X + w / 2 - 12, GY - 24 + i, '#000000', 24, 1);
  }

  const [near, n] = layer();
  const R = rng(33);
  for (let X = 4; X < TILE; X += 10 + Math.floor(R() * 6)) {
    if (R() < 0.35) {
      // crate
      px(n, X, 70, '#503000', 12, 14);
      px(n, X + 1, 71, '#FCA044', 10, 12);
      px(n, X + 1, 76, '#503000', 10, 1);
    } else {
      barrel(n, X, 73);
      if (R() < 0.4) barrel(n, X + 2, 62);
    }
  }
  // concrete slabs
  px(n, 0, GY, '#7C7C7C', TILE, PLAY_H - GY);
  for (let Y = GY + 12; Y < PLAY_H; Y += 18) px(n, 0, Y, '#BCBCBC', TILE, 1);
  for (let Y = GY; Y < PLAY_H; Y += 18) {
    for (let X = (Y / 18) % 2 ? 0 : 20; X < TILE; X += 40) px(n, X, Y, '#BCBCBC', 1, 12);
  }
  const Rc = rng(4);
  for (let i = 0; i < 300; i++) px(n, Rc() * TILE, GY + Rc() * (PLAY_H - GY), '#3C3C3C');
  return { sky: '#6888FC', layers: [{ c: far, speed: 0.5 }, { c: near, speed: 1 }] };
}

// A passenger plane, nose to the left. Also used by the ending.
export function drawPlane(x, X, Y) {
  px(x, X + 4, Y, '#FCFCFC', 52, 8); // fuselage
  px(x, X + 1, Y + 2, '#FCFCFC', 3, 5);
  px(x, X, Y + 4, '#BCBCBC', 1, 2);
  px(x, X + 2, Y + 2, '#0058F8', 4, 2); // cockpit
  px(x, X + 4, Y + 4, '#0058F8', 52, 1); // stripe
  for (let i = 10; i < 50; i += 4) px(x, X + i, Y + 2, '#3CBCFC', 2, 1);
  px(x, X + 46, Y - 10, '#FCFCFC', 8, 10); // tail fin
  px(x, X + 50, Y - 10, '#F83800', 4, 4);
  px(x, X + 20, Y + 8, '#7C7C7C', 18, 2); // wing
  px(x, X + 24, Y + 10, '#3C3C3C', 6, 2); // engine
  px(x, X + 14, Y + 10, '#000000', 2, 2); // wheels
  px(x, X + 40, Y + 10, '#000000', 2, 2);
}

function buildAirport() {
  const [far, f] = layer();
  hills(f, 64, GY, '#00A800', '#58D854', [[3, 3, 0], [2, 9, 1]]);
  // control tower
  px(f, 60, 30, '#BCBCBC', 10, GY - 30);
  px(f, 54, 22, '#7C7C7C', 22, 10);
  px(f, 56, 24, '#3CBCFC', 18, 5);
  px(f, 64, 16, '#F83800', 2, 6);
  // hangar
  for (let i = 0; i < 30; i++) {
    const hw = Math.round(Math.sqrt(900 - (30 - i) ** 2) * 1.8);
    px(f, 240 - hw, GY - i, '#BCBCBC', hw * 2, 1);
  }
  px(f, 210, GY - 22, '#3C3C3C', 60, 22);
  for (let i = 0; i < 22; i += 4) px(f, 210, GY - 22 + i, '#000000', 60, 1);
  drawPlane(f, 380, 66);

  const [near, n] = layer();
  px(n, 0, GY, '#00A800', TILE, 10);
  for (let X = 0; X < TILE; X += 3) px(n, X, GY, '#58D854');
  px(n, 0, GY + 10, '#7C7C7C', TILE, PLAY_H - GY - 10);
  px(n, 0, GY + 12, '#F8B800', TILE, 1);
  for (let X = 0; X < TILE; X += 32) px(n, X, 146, '#FCFCFC', 16, 2);
  const Rc = rng(8);
  for (let i = 0; i < 400; i++) px(n, Rc() * TILE, GY + 13 + Rc() * (PLAY_H - GY - 13), '#BCBCBC');
  return { sky: '#3CBCFC', layers: [{ c: far, speed: 0.4 }, { c: near, speed: 1 }] };
}

function buildCamp() {
  const [far, f] = layer();
  const R = rng(7);
  for (let cx = 20; cx < TILE; cx += 70 + Math.floor(R() * 60)) palm(f, cx, 40, 26 + Math.floor(R() * 10));
  jungleLine(f, 30, GY, 11);

  const [near, n] = layer();
  const FT = 57; // fence top
  for (let Y = FT + 4; Y < GY; Y++) {
    for (let X = 0; X < TILE; X++) {
      if ((X + Y) % 4 === 0 || (X - Y + 1024) % 4 === 0) px(n, X, Y, (X + Y) % 8 === 0 ? '#FCFCFC' : '#BCBCBC');
    }
  }
  px(n, 0, FT, '#FCFCFC', TILE, 2);
  px(n, 0, FT + 2, '#7C7C7C', TILE, 1);
  px(n, 0, GY - 2, '#BCBCBC', TILE, 1);
  for (let X = 8; X < TILE; X += 32) {
    px(n, X, FT - 3, '#FCFCFC', 2, GY - FT + 3);
    px(n, X + 2, FT - 3, '#7C7C7C', 1, GY - FT + 3);
    px(n, X - 2, FT - 5, '#BCBCBC', 3, 2);
  }
  const gx = 200;
  px(n, gx, FT - 8, '#7C7C7C', 52, GY - FT + 8);
  px(n, gx, FT - 8, '#FCFCFC', 52, 2);
  px(n, gx, FT - 4, '#BCBCBC', 52, 1);
  px(n, gx, FT - 1, '#BCBCBC', 52, 1);
  px(n, gx, FT - 8, '#BCBCBC', 2, GY - FT + 8);
  px(n, gx + 50, FT - 8, '#3C3C3C', 2, GY - FT + 8);
  px(n, gx + 25, FT + 2, '#3C3C3C', 2, GY - FT - 2);
  px(n, gx + 28, FT + 10, '#FCFCFC', 1, 3);
  dottedGround(n, GY, '#C84C0C', '#F0A080');
  return { sky: '#6888FC', layers: [{ c: far, speed: 0.5 }, { c: near, speed: 1 }] };
}

const THEMES = {
  comm: buildComm,
  jungle: buildJungle,
  village: buildVillage,
  powder: buildPowder,
  camp: buildCamp,
  airport: buildAirport,
};

export function makeBackground(theme) {
  const key = THEMES[theme] ? theme : 'camp';
  if (!cache.has(key)) cache.set(key, THEMES[key]());
  const L = cache.get(key);
  return {
    draw(c, camX) {
      c.fillStyle = L.sky;
      c.fillRect(0, 0, W, PLAY_H);
      for (const ly of L.layers) {
        const off = -Math.floor((camX * ly.speed) % TILE);
        c.drawImage(ly.c, off, 0);
        c.drawImage(ly.c, off + TILE, 0);
      }
    },
  };
}
