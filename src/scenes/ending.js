// Final screen: the plane with the hostages takes off; the ending depends on how many were saved.
import { W, H, PLAY_H, PAL, rect, drawText } from '../render.js';
import { makeBackground, drawPlane } from '../backgrounds.js';
import { t } from '../i18n.js';
import { playMusic } from '../music.js';
import { TitleScene } from './title.js';
import { updateHiscore } from './result.js';

const TOTAL_HOSTAGES = 10;

export class EndingScene {
  constructor(game) {
    this.name = 'ending';
    this.game = game;
    this.bg = makeBackground('airport');
    this.time = 0;
    const run = game.run;
    this.bonus = run.hostages * 5000 - run.lost * 2000;
    run.score = Math.max(0, run.score + this.bonus);
    this.newHi = updateHiscore(run.score);
    if (run.hostages >= 8) this.verdict = 'endGood';
    else if (run.hostages >= 3) this.verdict = 'endOk';
    else this.verdict = 'endBad';
  }

  enter() {
    playMusic('ending');
  }

  update(dt) {
    this.time += dt;
    const inp = this.game.input;
    if (this.time > 3 && (inp.tap || inp.confirm)) this.game.setScene(new TitleScene(this.game));
  }

  draw(c) {
    const run = this.game.run;
    this.bg.draw(c, 0);
    // plane takes off from the right to the upper left
    const p = Math.min(1, this.time / 6);
    const px = 190 - p * 170;
    const py = 112 - p * p * 84;
    drawPlane(c, px, py);
    rect(c, 0, PLAY_H - 70, W, H - PLAY_H + 70, PAL.K);

    const y = PLAY_H - 64;
    drawText(c, t('endTitle'), W / 2, y, PAL.Y, { align: 'center' });
    drawText(c, t(this.verdict), W / 2, y + 14, this.verdict === 'endBad' ? PAL.R : PAL.W, { align: 'center' });
    drawText(c, `${t('endSaved')}: ${run.hostages}/${TOTAL_HOSTAGES}`, W / 2, y + 32, PAL.y, { align: 'center' });
    if (run.lost) drawText(c, `${t('endLost')}: ${run.lost}`, W / 2, y + 44, PAL.R, { align: 'center' });
    drawText(c, `${t('endBonus')} ${this.bonus}`, W / 2, y + 58, PAL.w, { align: 'center' });
    drawText(c, `${t('finalScore')} ${String(run.score).padStart(7, '0')}`, W / 2, y + 72, PAL.W, { align: 'center' });
    if (this.newHi && Math.floor(this.time * 3) % 2 === 0) drawText(c, t('newHi'), W / 2, y + 86, PAL.R, { align: 'center' });
    if (this.time > 3) drawText(c, t('thanks'), W / 2, y + 100, PAL.Y, { align: 'center' });
  }
}
