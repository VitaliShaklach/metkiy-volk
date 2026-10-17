import { W, H, PLAY_H, PAL, rect, frameRect, drawText } from '../render.js';
import { makeBackground } from '../backgrounds.js';
import { sfx, setSound } from '../audio.js';
import { playMusic, setMusic } from '../music.js';
import { t, setLang, getLang } from '../i18n.js';
import { settings, saveSettings, newRun, DIFF_ORDER } from '../game.js';
import { MapScene } from './map.js';

const MENU_Y = 104;
const ROW_H = 14;

export class TitleScene {
  constructor(game) {
    this.name = 'title';
    this.game = game;
    this.bg = makeBackground('camp');
    this.camX = 0;
    this.time = 0;
    this.sel = 0;
  }

  items() {
    return [
      { label: t('start'), act: () => this.start() },
      {
        label: `${t('difficulty')}: ${t(settings.diff)}`,
        act: () => {
          const i = DIFF_ORDER.indexOf(settings.diff);
          settings.diff = DIFF_ORDER[(i + 1) % DIFF_ORDER.length];
          saveSettings();
        },
      },
      {
        label: t('language'),
        act: () => {
          settings.lang = getLang() === 'ru' ? 'en' : 'ru';
          setLang(settings.lang);
          saveSettings();
          this.game.applyLang();
        },
      },
      {
        label: `${t('sound')}: ${settings.sound ? t('on') : t('off')}`,
        act: () => {
          settings.sound = !settings.sound;
          setSound(settings.sound);
          saveSettings();
        },
      },
      {
        label: `${t('music')}: ${settings.music ? t('on') : t('off')}`,
        act: () => {
          settings.music = !settings.music;
          setMusic(settings.music);
          saveSettings();
        },
      },
    ];
  }

  enter() {
    playMusic('title');
  }

  itemAt(p) {
    if (!p || p.x < 24 || p.x > W - 24) return -1;
    const i = Math.floor((p.y - MENU_Y + 3) / ROW_H);
    return i >= 0 && i < this.items().length ? i : -1;
  }

  start() {
    this.game.run = newRun();
    this.game.setScene(new MapScene(this.game));
  }

  update(dt) {
    const inp = this.game.input;
    this.time += dt;
    this.camX += 10 * dt;
    const items = this.items();
    if (!inp.isTouch) {
      const hover = this.itemAt(inp.aim);
      if (hover >= 0) this.sel = hover;
    }
    if (inp.navUp) this.sel = (this.sel + items.length - 1) % items.length;
    if (inp.navDown) this.sel = (this.sel + 1) % items.length;
    let act = -1;
    if (inp.tap) act = this.itemAt(inp.tap);
    if (inp.confirm) act = this.sel;
    if (act >= 0) {
      this.sel = act;
      sfx.menu();
      items[act].act();
    }
  }

  draw(c) {
    const inp = this.game.input;
    this.bg.draw(c, this.camX);
    rect(c, 0, PLAY_H, W, H - PLAY_H, PAL.K);

    // Title plate
    rect(c, 0, 10, W, 76, PAL.K);
    const l1 = t('title1');
    const l2 = t('title2');
    const s1 = Math.min(3, Math.floor(240 / (l1.length * 8)));
    const s2 = Math.min(4, Math.floor(240 / (l2.length * 8)));
    drawText(c, l1, W / 2, 16, PAL.Y, { scale: s1, align: 'center', shadow: PAL.r });
    drawText(c, l2, W / 2, 20 + 8 * s1, PAL.R, { scale: s2, align: 'center', shadow: PAL.b });
    drawText(c, t('tribute'), W / 2, 76, PAL.w, { align: 'center' });

    // Menu
    const items = this.items();
    rect(c, 20, MENU_Y - 8, W - 40, items.length * ROW_H + 10, PAL.K);
    frameRect(c, 20, MENU_Y - 8, W - 40, items.length * ROW_H + 10, PAL.W);
    items.forEach((it, i) => {
      const y = MENU_Y + i * ROW_H;
      const on = i === this.sel;
      if (on && Math.floor(this.time * 3) % 2 === 0) drawText(c, '>', 28, y, PAL.Y);
      drawText(c, it.label, 40, y, on ? PAL.Y : PAL.W);
    });

    drawText(c, `${t('hiscore')} ${String(settings.hiscore).padStart(7, '0')}`, W / 2, PLAY_H + 10, PAL.W, { align: 'center' });
    drawText(c, inp.isTouch ? t('hintTouch') : t('hintMouse'), W / 2, PLAY_H + 28, PAL.g, { align: 'center' });
  }
}
