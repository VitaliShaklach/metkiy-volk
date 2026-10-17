// Bottom panel, laid out like the NES original.
import { W, H, PLAY_H, PAL, rect, frameRect, drawText } from './render.js';
import { drawSprite } from './sprites.js';
import { MAX_ITEMS } from './game.js';
import { t } from './i18n.js';

const pad = (n, len) => String(Math.max(0, Math.floor(n))).padStart(len, '0');

function iconBox(c, x, y, icon, color, iw = 10, ih = 10) {
  frameRect(c, x, y, 14, 14, color);
  drawSprite(c, icon, x + 7 - iw / 2, y + 7 - ih / 2);
}

export function drawHud(c, b) {
  const r = b.run;
  const blink = Math.floor(b.time * 4) % 2 === 0;
  rect(c, 0, PLAY_H, W, H - PLAY_H, PAL.K);

  drawText(c, t('score'), 8, PLAY_H + 6);
  drawText(c, pad(r.score, 7), 8 + t('score').length * 8 + 8, PLAY_H + 6);

  // Weapon status message on the right of the score line
  let msg = '';
  let msgColor = PAL.Y;
  if (b.mgT > 0) msg = `MG ${Math.ceil(b.mgT)}`;
  else if (b.reloadT > 0) msg = blink ? t('reload') : '';
  else if (r.bullets === 0 && r.mags === 0) { msg = blink ? t('noAmmo') : ''; msgColor = PAL.R; }
  if (msg) drawText(c, msg, 228, PLAY_H + 6, msgColor, { align: 'right' });

  const y = PLAY_H + 22;
  iconBox(c, 2, y, 'icon_mag', PAL.W);
  drawText(c, Math.min(MAX_ITEMS, r.mags), 17, y + 6);
  iconBox(c, 28, y, 'icon_bullet', PAL.W);
  drawText(c, b.mgT > 0 ? '**' : pad(r.bullets, 2), 43, y + 6, b.mgT > 0 ? PAL.Y : PAL.W);
  iconBox(c, 62, y, 'icon_grenade', PAL.W);
  drawText(c, Math.min(MAX_ITEMS, r.grenades), 77, y + 6);
  drawSprite(c, 'icon_hostage', 89, y + 3);
  drawText(c, pad(r.hostages, 2), 98, y + 6);

  iconBox(c, 118, y, 'icon_soldier', PAL.Y);
  drawText(c, pad(b.remain.soldier, 2), 133, y + 6);
  iconBox(c, 152, y, 'icon_heli', PAL.Y, 12, 8);
  drawText(c, pad(b.remain.heli, 2), 167, y + 6);
  iconBox(c, 186, y, 'icon_vehicle', PAL.Y, 12, 8);
  drawText(c, pad(b.remain.vehicle, 2), 201, y + 6);

  drawHealth(c, 234, PLAY_H + 4, 100 - r.damage, b.hurtT > 0, blink);
}

// Health bar: 10 segments of 10 points, emptying from the top. The frame flashes red on a hit.
export function drawHealth(c, x, y, health, hit, blink) {
  const w = 18;
  const h = 42;
  rect(c, x, y, w, h, hit ? PAL.R : PAL.W);
  rect(c, x + 1, y + 1, w - 2, h - 2, PAL.K);
  let col = PAL.G;
  if (health <= 25) col = blink ? PAL.R : PAL.o;
  else if (health <= 50) col = PAL.Y;
  for (let i = 0; i < 10; i++) {
    const part = Math.max(0, Math.min(10, health - i * 10)) / 10;
    const sy = y + h - 2 - (i + 1) * 4 + 1;
    rect(c, x + 2, sy, w - 4, 3, '#3C3C3C');
    if (part > 0) rect(c, x + 2, sy, Math.max(1, Math.round((w - 4) * part)), 3, col);
  }
}
