import { W, H, PAL, rect, frameRect, drawText } from '../render.js';
import { t } from '../i18n.js';
import { settings, saveSettings, DIFF, MAG_SIZE } from '../game.js';
import { sfx } from '../audio.js';
import { TitleScene } from './title.js';
import { MapScene } from './map.js';
import { BattleScene } from './battle.js';
import { EndingScene } from './ending.js';

export function updateHiscore(score) {
  if (score <= settings.hiscore) return false;
  settings.hiscore = score;
  saveSettings();
  return true;
}

export class ResultScene {
  constructor(game, { win, failed, mission, saved, lost }) {
    this.name = 'result';
    this.game = game;
    this.mission = mission;
    this.saved = saved;
    this.lost = lost;
    this.time = 0;
    this.sel = 0;
    const run = game.run;
    this.mode = !win ? 'dead' : failed ? 'failed' : 'win';
    this.bonus = 0;
    if (this.mode === 'win') {
      this.bonus = Math.round((100 - run.damage) * 20);
      run.score += this.bonus;
      run.done[mission.id] = true;
      this.applyReward(mission.reward);
    }
    this.newHi = updateHiscore(run.score);
  }

  applyReward(reward) {
    const run = this.game.run;
    const d = DIFF[settings.diff];
    if (reward === 'village') run.damage = Math.max(0, run.damage - 20);
    if (reward === 'powder') {
      run.mags = Math.max(run.mags, d.mags);
      run.grenades = Math.max(run.grenades, d.grenades);
      run.bullets = MAG_SIZE;
    }
  }

  options() {
    if (this.mode !== 'dead' || this.game.run.continues <= 0) return [];
    return [
      { label: t('continueYes'), act: () => this.continueRun() },
      { label: t('continueNo'), act: () => this.game.setScene(new TitleScene(this.game)) },
    ];
  }

  continueRun() {
    const run = this.game.run;
    const d = DIFF[settings.diff];
    run.continues--;
    run.damage = 0;
    run.mags = Math.max(run.mags, Math.ceil(d.mags / 2));
    run.bullets = MAG_SIZE;
    run.grenades = Math.max(run.grenades, Math.ceil(d.grenades / 2));
    this.game.setScene(new BattleScene(this.game, this.mission));
  }

  next() {
    if (this.mode === 'win' && this.mission.id === 'airport') {
      this.game.setScene(new EndingScene(this.game));
    } else if (this.mode === 'dead') {
      this.game.setScene(new TitleScene(this.game));
    } else {
      this.game.setScene(new MapScene(this.game));
    }
  }

  update(dt) {
    const inp = this.game.input;
    this.time += dt;
    if (this.time < 1) return;
    const opts = this.options();
    if (opts.length) {
      if (inp.navUp || inp.navDown) this.sel = 1 - this.sel;
      let act = -1;
      if (inp.tap) {
        const i = Math.floor((inp.tap.y - 176) / 16);
        if (i >= 0 && i < opts.length) act = i;
      }
      if (inp.confirm) act = this.sel;
      if (act >= 0) {
        sfx.menu();
        opts[act].act();
      }
      return;
    }
    if (inp.tap || inp.confirm) this.next();
  }

  draw(c) {
    const run = this.game.run;
    rect(c, 0, 0, W, H, PAL.K);
    const title = this.mode === 'win' ? t('missionComplete') : this.mode === 'failed' ? t('missionFailed') : t('gameOver');
    const scale = title.length * 16 <= 240 ? 2 : 1;
    drawText(c, title, W / 2, 28, this.mode === 'win' ? PAL.Y : PAL.R, { align: 'center', scale });
    drawText(c, t(this.mission.name), W / 2, 56, PAL.W, { align: 'center' });

    let y = 80;
    if (this.mission.hostages) {
      drawText(c, `${t('hostagesHere')}: ${this.saved}`, W / 2, y, PAL.y, { align: 'center' });
      y += 14;
    }
    if (this.mode === 'win') {
      drawText(c, `${t('damageBonus')} ${this.bonus}`, W / 2, y, PAL.w, { align: 'center' });
      y += 18;
      if (this.mission.id !== 'airport') {
        drawText(c, t('reward'), W / 2, y, PAL.w, { align: 'center' });
        drawText(c, t(`r_${this.mission.reward}`), W / 2, y + 12, PAL.Y, { align: 'center' });
      }
    } else if (this.mode === 'failed') {
      drawText(c, t('failedWhy'), W / 2, y, PAL.w, { align: 'center' });
      drawText(c, t('tryAgain'), W / 2, y + 14, PAL.Y, { align: 'center' });
    }

    drawText(c, `${t('score')} ${String(run.score).padStart(7, '0')}`, W / 2, 140, PAL.W, { align: 'center' });
    if (this.newHi && Math.floor(this.time * 3) % 2 === 0) drawText(c, t('newHi'), W / 2, 154, PAL.R, { align: 'center' });

    const opts = this.options();
    if (opts.length) {
      drawText(c, `${t('continueQ')} ${t('continuesLeft')}: ${run.continues}`, W / 2, 164, PAL.W, { align: 'center' });
      if (this.time >= 1) {
        opts.forEach((o, i) => {
          const oy = 180 + i * 16;
          const on = i === this.sel;
          if (on) frameRect(c, 56, oy - 4, W - 112, 15, PAL.Y);
          drawText(c, o.label, W / 2, oy, on ? PAL.Y : PAL.W, { align: 'center' });
        });
      }
      return;
    }
    if (this.time > 1 && Math.floor(this.time * 2) % 2 === 0) {
      drawText(c, t('tapContinue'), W / 2, 210, PAL.g, { align: 'center' });
    }
  }
}
