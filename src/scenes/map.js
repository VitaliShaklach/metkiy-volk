// Operation map: pick the next mission. The prison camp and the airport have prerequisites.
import { W, H, PAL, rect, frameRect, disc, drawText } from '../render.js';
import { drawSprite } from '../sprites.js';
import { t } from '../i18n.js';
import { sfx } from '../audio.js';
import { playMusic } from '../music.js';
import { MISSIONS, missionById } from '../missions.js';
import { BattleScene } from './battle.js';

const PANEL_Y = 150;
const BTN = { x: 88, y: 206, w: 80, h: 15 };

// Island outline made of overlapping blobs: [x, y, r]
const ISLAND = [
  [40, 118, 26], [70, 100, 30], [92, 68, 28], [120, 48, 26], [130, 34, 20], [160, 70, 34],
  [150, 110, 26], [190, 90, 30], [208, 58, 22], [214, 128, 22], [190, 124, 20], [60, 130, 18],
];

export class MapScene {
  constructor(game) {
    this.name = 'map';
    this.game = game;
    this.time = 0;
    const firstOpen = MISSIONS.findIndex((m) => this.available(m));
    this.sel = Math.max(0, firstOpen);
  }

  enter() {
    playMusic('title');
  }

  locked(m) {
    return Boolean(m.requires && !this.game.run.done[m.requires]);
  }

  available(m) {
    return !this.game.run.done[m.id] && !this.locked(m);
  }

  markerAt(p) {
    return MISSIONS.findIndex((m) => Math.abs(p.x - m.map[0]) <= 10 && Math.abs(p.y - m.map[1]) <= 10);
  }

  start() {
    const m = MISSIONS[this.sel];
    if (!this.available(m)) {
      sfx.empty();
      return;
    }
    this.game.setScene(new BattleScene(this.game, m));
  }

  update(dt) {
    const inp = this.game.input;
    this.time += dt;
    if (inp.navUp) this.sel = (this.sel + MISSIONS.length - 1) % MISSIONS.length;
    if (inp.navDown) this.sel = (this.sel + 1) % MISSIONS.length;
    if (inp.confirm) this.start();
    if (inp.tap) {
      const p = inp.tap;
      const i = this.markerAt(p);
      if (i >= 0) {
        if (i === this.sel && this.available(MISSIONS[i])) this.start();
        else {
          this.sel = i;
          sfx.menu();
        }
      } else if (p.x >= BTN.x && p.x <= BTN.x + BTN.w && p.y >= BTN.y - 4 && p.y <= BTN.y + BTN.h) {
        this.start();
      }
    }
  }

  draw(c) {
    const run = this.game.run;
    // sea with ripples
    rect(c, 0, 0, W, PANEL_Y, PAL.B);
    for (let y = 6; y < PANEL_Y; y += 8) {
      for (let x = (y / 8) % 2 ? 0 : 8; x < W; x += 16) rect(c, x, y, 4, 1, PAL.C);
    }
    // island
    for (const [x, y, r] of ISLAND) disc(c, x, y, r + 2, PAL.y);
    for (const [x, y, r] of ISLAND) disc(c, x, y, r, PAL.G);
    for (const [x, y, r] of ISLAND) disc(c, x - r / 3, y - r / 3, r / 3, PAL.L);

    // routes between missions
    const route = ['comm', 'jungle', 'camp', 'powder', 'village', 'airport'];
    for (let i = 0; i < route.length - 1; i++) {
      const [x0, y0] = missionById(route[i]).map;
      const [x1, y1] = missionById(route[i + 1]).map;
      const n = Math.hypot(x1 - x0, y1 - y0) / 4;
      for (let k = 0; k < n; k += 2) rect(c, x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n, 2, 2, PAL.d);
    }

    // markers
    const blink = Math.floor(this.time * 3) % 2 === 0;
    MISSIONS.forEach((m, i) => {
      const [x, y] = m.map;
      const done = run.done[m.id];
      const locked = this.locked(m);
      const fill = done ? PAL.D : locked ? PAL.g : PAL.R;
      rect(c, x - 7, y - 7, 15, 15, PAL.K);
      rect(c, x - 6, y - 6, 13, 13, fill);
      if (done) {
        rect(c, x - 4, y, 2, 2, PAL.W);
        rect(c, x - 2, y + 2, 2, 2, PAL.W);
        rect(c, x, y - 2, 2, 4, PAL.W);
        rect(c, x + 2, y - 4, 2, 2, PAL.W);
      } else {
        drawText(c, i + 1, x - 3, y - 3, locked ? PAL.w : PAL.W);
      }
      if (i === this.sel && blink) frameRect(c, x - 10, y - 10, 21, 21, PAL.Y);
    });

    drawText(c, t('mapTitle'), W / 2, 4, PAL.W, { align: 'center', shadow: PAL.K });

    // info panel
    rect(c, 0, PANEL_Y, W, H - PANEL_Y, PAL.K);
    rect(c, 0, PANEL_Y, W, 1, PAL.W);
    const m = MISSIONS[this.sel];
    drawText(c, `${this.sel + 1}. ${t(m.name)}`, 8, PANEL_Y + 6, PAL.Y);
    drawText(c, t(`b_${m.id}`), 8, PANEL_Y + 20, PAL.W);
    if (run.done[m.id]) {
      drawText(c, t('done'), 8, PANEL_Y + 34, PAL.L);
    } else if (this.locked(m)) {
      drawText(c, `${t('lockedBy')} ${t(missionById(m.requires).name)} ${t('first')}`.trim(), 8, PANEL_Y + 34, PAL.R);
    } else {
      drawText(c, `${t('reward')} ${t(`r_${m.reward}`)}`, 8, PANEL_Y + 34, PAL.w);
      frameRect(c, BTN.x, BTN.y - 4, BTN.w, BTN.h, blink ? PAL.Y : PAL.W);
      drawText(c, t('start'), W / 2, BTN.y, PAL.Y, { align: 'center' });
    }

    // run status
    const sy = H - 14;
    drawText(c, String(run.score).padStart(7, '0'), 8, sy, PAL.W);
    drawSprite(c, 'icon_hostage', 72, sy - 1);
    drawText(c, run.hostages, 82, sy, PAL.y);
    const hp = Math.round(100 - run.damage);
    drawText(c, `${t('health')} ${hp}%`, W - 8, sy, hp <= 35 ? PAL.R : PAL.L, { align: 'right' });
  }
}
