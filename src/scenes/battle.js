import { W, PLAY_H, PAL, rect, drawText, drawCrosshair } from '../render.js';
import { makeBackground } from '../backgrounds.js';
import { drawHud } from '../hud.js';
import {
  Soldier, Heli, Vehicle, Civilian, Hostage, Crate, Chicken, Pickup, Missile,
  Explosion, Spark, Debris, Popup, PlayerGrenade, rand, clamp,
} from '../entities.js';
import { sfx } from '../audio.js';
import { playMusic, stopMusic, setMusicPaused } from '../music.js';
import { t } from '../i18n.js';
import { DIFF, settings, MAG_SIZE, MAX_ITEMS, DEBUG } from '../game.js';
import { MISSIONS } from '../missions.js';
import { ResultScene, updateHiscore } from './result.js';
import { MapScene } from './map.js';
import { TitleScene } from './title.js';

const FIRE_RATE = 1 / 8;
const MG_RATE = 1 / 16;
const EMPTY_RATE = 0.6;
const PAUSE_Y = 52; // top of the pause menu box
const BULLET_DAMAGE = 3; // health lost per enemy bullet that hits (x difficulty)

export class BattleScene {
  constructor(game, mission) {
    this.name = 'battle';
    this.game = game;
    this.m = mission;
    this.index = MISSIONS.indexOf(mission);
    this.run = game.run;
    this.d = DIFF[settings.diff];
    this.gTop = mission.gTop;
    this.bg = makeBackground(mission.theme);
    this.camX = 0;
    this.time = 0;
    this.actors = [];
    this.missiles = [];
    this.fx = [];

    // Without the radio station taken, every other mission has more soldiers.
    const extra = this.run.done.comm || mission.id === 'comm' ? 1 : 1.2;
    const q = mission.quotas;
    this.remain = {
      soldier: Math.max(5, Math.round(q.soldier * this.d.quota * extra)),
      heli: q.heli,
      vehicle: q.vehicle,
    };
    this.soldierQuota = this.remain.soldier;

    this.spawnT = 1;
    this.heliT = rand(6, 12);
    this.vehT = rand(5, 10);
    this.civT = mission.civilians ? rand(...mission.civilians) : Infinity;
    this.crateT = rand(2, 5);
    this.chickenT = rand(...mission.chickenEvery);
    this.hostagesLeft = mission.hostages;
    this.hostageT = rand(5, 8);
    this.savedHere = 0;
    this.lostHere = 0;

    this.fireCD = 0;
    this.reloadT = 0;
    this.mgT = 0;
    this.hurtT = 0;
    this.shake = 0;
    this.state = 'intro';
    this.stateT = 2.4;
    this.paused = false;
  }

  enter() {
    stopMusic();
    sfx.start();
  }

  onHide() {
    if (this.state === 'play' || this.state === 'intro') this.paused = true;
  }

  // ------------------------------------------------------------ update
  update(dt) {
    const inp = this.game.input;
    const wasPaused = this.paused;
    if (inp.pausePressed && (this.state === 'play' || this.state === 'intro')) {
      this.paused = !this.paused;
      this.pauseSel = 0;
    } else if (this.paused && !this.game.rulesOpen && this.pauseMenu(inp)) {
      return; // left the battle
    }
    setMusicPaused(this.paused);
    if (this.paused || wasPaused !== this.paused) return; // the tap that resumes must not fire

    this.time += dt;
    this.camX += this.m.scroll * dt;
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.shake = Math.max(0, this.shake - dt);
    this.mgT = Math.max(0, this.mgT - dt);
    this.game.setMG?.(this.mgT > 0);

    switch (this.state) {
      case 'intro':
        this.stateT -= dt;
        if (this.stateT <= 0) {
          this.state = 'play';
          playMusic('battle');
        }
        break;
      case 'play':
        this.spawn(dt);
        this.handleWeapons(dt, inp);
        if (DEBUG && inp.debugKill) {
          this.remain = { soldier: 0, heli: 0, vehicle: 0 };
          if (this.m.needHostage && this.savedHere === 0) this.savedHere = 1;
          this.hostagesLeft = 0;
        }
        if (this.isCleared()) this.clear();
        break;
      case 'clear':
      case 'dead':
        this.stateT -= dt;
        if (this.stateT <= 0) {
          this.game.setScene(new ResultScene(this.game, {
            win: this.state === 'clear',
            failed: this.failed,
            mission: this.m,
            saved: this.savedHere,
            lost: this.lostHere,
          }));
          return;
        }
        break;
      default:
    }

    for (const a of this.actors) a.update(dt, this);
    for (const m of this.missiles) m.update(dt, this);
    for (const f of this.fx) f.update(dt, this);
    this.actors = this.actors.filter((a) => !a.remove);
    this.missiles = this.missiles.filter((m) => !m.remove);
    this.fx = this.fx.filter((f) => !f.remove);
  }

  pauseItems() {
    return [t('resume'), t('toMap'), t('toTitle')];
  }

  pauseItemAt(p) {
    const i = Math.floor((p.y - (PAUSE_Y + 30)) / 16);
    return p.x >= 24 && p.x <= W - 24 && i >= 0 && i < 3 ? i : -1;
  }

  // Pause menu: continue, back to the operation map, or main menu. Returns true if the battle was left.
  pauseMenu(inp) {
    if (inp.navUp) this.pauseSel = (this.pauseSel + 2) % 3;
    if (inp.navDown) this.pauseSel = (this.pauseSel + 1) % 3;
    if (!inp.isTouch) {
      const hover = this.pauseItemAt(inp.aim);
      if (hover >= 0) this.pauseSel = hover;
    }
    let act = -1;
    if (inp.tap) {
      act = this.pauseItemAt(inp.tap);
      // a tap outside the menu box simply continues
      if (act < 0 && (inp.tap.y < PAUSE_Y || inp.tap.y > PAUSE_Y + 86)) act = 0;
    }
    if (inp.confirm) act = this.pauseSel;
    if (act < 0) return false;
    sfx.menu();
    if (act === 0) {
      this.paused = false;
      return false;
    }
    stopMusic();
    updateHiscore(this.run.score);
    this.game.setScene(act === 1 ? new MapScene(this.game) : new TitleScene(this.game));
    return true;
  }

  count(Type, pred = () => true) {
    return this.actors.filter((a) => a instanceof Type && a.alive() && pred(a)).length;
  }

  spawn(dt) {
    const m = this.m;
    const d = this.d;

    // Soldiers
    this.spawnT -= dt;
    const soldiers = this.count(Soldier, (s) => s.kind !== 'chaser');
    const maxActive = Math.max(1, m.maxActive + d.maxActive);
    if (this.spawnT <= 0 && soldiers < Math.min(maxActive, this.remain.soldier)) {
      this.spawnT = rand(m.spawn[0], m.spawn[1]) / d.spawn;
      const k = m.kinds;
      const r = Math.random();
      let kind = 'rifle';
      if (r < k.grenadier) kind = 'grenadier';
      else if (r < k.grenadier + k.runner) kind = 'runner';
      else if (r < k.grenadier + k.runner + k.knife) kind = 'knife';
      this.actors.push(new Soldier(this, kind));
    }

    // Helicopters (one at a time). The airport's gunship comes when most soldiers are down.
    if (this.remain.heli > 0 && this.count(Heli) === 0) {
      if (m.boss) {
        if (this.remain.soldier <= Math.ceil(this.soldierQuota * 0.25)) {
          this.actors.push(new Heli(this, true));
          this.banner2 = { text: t('gunship'), t: 2 };
          playMusic('boss');
        }
      } else {
        this.heliT -= dt;
        if (this.heliT <= 0) {
          this.heliT = rand(6, 12);
          this.actors.push(new Heli(this));
        }
      }
    }

    // Armoured cars / boats (one at a time)
    if (this.remain.vehicle > 0 && this.count(Vehicle) === 0) {
      this.vehT -= dt;
      if (this.vehT <= 0) {
        this.vehT = rand(5, 10);
        this.actors.push(new Vehicle(this, m.vehicle));
      }
    }

    // Civilians
    this.civT -= dt;
    if (this.civT <= 0) {
      this.civT = rand(...m.civilians);
      this.actors.push(new Civilian(this, Math.random() < 0.6 ? 'medics' : 'boy'));
    }

    // Hostages, sometimes with a guard chasing them
    if (this.hostagesLeft > 0) {
      this.hostageT -= dt;
      const enemiesDone = this.remain.soldier <= 0 && this.remain.heli <= 0 && this.remain.vehicle <= 0;
      if (this.hostageT <= 0 && this.count(Hostage) < 2) {
        this.hostageT = enemiesDone ? 2.5 : rand(9, 15);
        this.hostagesLeft--;
        const h = new Hostage(this);
        this.actors.push(h);
        if (!enemiesDone && Math.random() < 0.6) {
          this.actors.push(new Soldier(this, 'chaser', { victim: h, fromLeft: false, y: clamp(h.y + rand(-4, 4), this.gTop + 8, 188) }));
        }
      }
    }

    this.crateT -= dt;
    if (this.crateT <= 0) {
      this.crateT = rand(...m.crateEvery);
      this.actors.push(new Crate(this));
    }
    this.chickenT -= dt;
    if (this.chickenT <= 0) {
      this.chickenT = rand(...m.chickenEvery);
      this.actors.push(new Chicken(this));
    }
  }

  isCleared() {
    const r = this.remain;
    return r.soldier <= 0 && r.heli <= 0 && r.vehicle <= 0 && this.hostagesLeft <= 0 && this.count(Hostage) === 0;
  }

  handleWeapons(dt, inp) {
    const run = this.run;
    this.fireCD -= dt;
    if (this.reloadT > 0) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) {
        run.mags--;
        run.bullets = MAG_SIZE;
      }
    }
    if ((inp.firing || inp.firePressed) && this.fireCD <= 0 && this.reloadT <= 0) this.shoot(inp.aim);
    if (inp.grenadePressed) this.throwGrenade(inp.grenadeAt || inp.aim);
  }

  shoot(p) {
    const run = this.run;
    if (this.mgT > 0) {
      this.fireCD = MG_RATE;
    } else if (run.bullets > 0) {
      run.bullets--;
      this.fireCD = FIRE_RATE;
      if (run.bullets === 0 && run.mags > 0) {
        this.reloadT = 0.45;
        sfx.reload();
      }
    } else {
      this.fireCD = EMPTY_RATE; // out of ammo: slow single shots
    }
    sfx.shot();
    this.resolveShot(p.x, p.y);
  }

  resolveShot(x, y) {
    if (y >= PLAY_H) return;
    const pad = this.d.pad;
    // Incoming missiles first (nearest = biggest z)
    const ms = this.missiles.filter((m) => !m.remove && m.hits(x, y, pad)).sort((a, b) => b.z - a.z);
    if (ms.length) {
      ms[0].shot(this);
      return;
    }
    const hits = this.actors
      .filter((a) => !a.remove && a.canHit() && a.hits(this, x, y, pad))
      .sort((a, b) => b.prio - a.prio || b.layer - a.layer || b.y - a.y);
    if (hits.length) {
      hits[0].shot(this, x, y);
      this.fx.push(new Spark(x, y, PAL.W));
      return;
    }
    this.fx.push(new Spark(x, y, y > 84 ? PAL.O : PAL.W));
  }

  throwGrenade(p) {
    if (this.run.grenades <= 0) {
      sfx.empty();
      return;
    }
    this.run.grenades--;
    this.fx.push(new PlayerGrenade(p.x, Math.min(p.y, PLAY_H - 4)));
  }

  blast(x, y, r) {
    this.fx.push(new Explosion(x, y, r * 0.8, 0.55));
    for (let i = 0; i < 10; i++) this.fx.push(new Debris(x, y, i % 2 ? PAL.d : PAL.o));
    this.shake = 0.3;
    sfx.boom();
    for (const m of this.missiles) {
      const p = m.pos();
      if ((p.x - x) ** 2 + (p.y - y) ** 2 <= (r + p.r) ** 2) m.shot(this);
    }
    for (const a of this.actors) {
      if (!a.remove && a.blasted && a.canHit() && a.inBlast(this, x, y, r)) a.blasted(this);
    }
  }

  // ------------------------------------------------------------ events from actors
  addScore(n) {
    this.run.score = Math.max(0, this.run.score + n);
  }

  killed(type, points) {
    this.remain[type] = Math.max(0, this.remain[type] - 1);
    this.addScore(points);
  }

  enemyFire(s) {
    sfx.enemyShot();
    const near = clamp((s.y - 96) / 92, 0, 1);
    const chance = (0.15 + 0.2 * near) * this.d.fire;
    if (Math.random() < chance) this.hurt(BULLET_DAMAGE * this.d.dmg);
  }

  enemyMissile(x, y, kind) {
    this.missiles.push(new Missile(x, y, rand(40, W - 40), rand(60, PLAY_H - 30), this.d.missileTime, kind));
  }

  missileImpact(m) {
    const p = m.pos();
    this.fx.push(new Explosion(p.x, p.y, m.kind === 'knife' ? 10 : 22, 0.6));
    this.shake = m.kind === 'knife' ? 0.15 : 0.45;
    if (m.kind === 'knife') sfx.hurt();
    else sfx.boom();
    this.hurt(m.def.dmg * this.d.dmg);
  }

  hurt(amount) {
    if (this.state !== 'play') return;
    this.hurtT = 0.18;
    sfx.hurt();
    if (this.game.god) return;
    this.run.damage = Math.min(100, this.run.damage + amount);
    this.hitPopup = { text: `-${Math.round(amount)}`, t: 0.9 };
    if (this.run.damage >= 100) {
      this.state = 'dead';
      stopMusic();
      this.stateT = 2.5;
      this.missiles = [];
      sfx.die();
    }
  }

  // Returns true when the civilian is really hurt (normal/hard), false on easy.
  civilianHit(c) {
    sfx.bad();
    const x = c.sx(this);
    if (!this.d.civPenalty) {
      this.fx.push(new Popup(x, c.y - 24, '!', PAL.R));
      return false;
    }
    this.fx.push(new Popup(x, c.y - 24, '-1000', PAL.R));
    this.addScore(-1000);
    this.hurt(8);
    return true;
  }

  hostageSaved() {
    this.run.hostages++;
    this.savedHere++;
    this.addScore(2000);
    this.fx.push(new Popup(40, 120, t('saved'), PAL.Y));
    sfx.saved();
  }

  hostageKilled(h, by) {
    this.run.lost++;
    this.lostHere++;
    sfx.bad();
    this.fx.push(new Popup(h.sx(this), h.y - 28, t('lost'), PAL.R));
    if (by === 'player') {
      this.addScore(-2000);
      this.hurt(8);
    }
  }

  dropItem(x, y) {
    const drops = this.m.drops;
    const total = Object.values(drops).reduce((s, v) => s + v, 0);
    let r = Math.random() * total;
    for (const [type, w] of Object.entries(drops)) {
      r -= w;
      if (r <= 0) {
        this.actors.push(new Pickup(x, y, type));
        return;
      }
    }
  }

  collect(type, x, y) {
    const run = this.run;
    sfx.pickup();
    let label = '+1';
    if (type === 'mag') run.mags = Math.min(MAX_ITEMS, run.mags + 1);
    else if (type === 'grenade') run.grenades = Math.min(MAX_ITEMS, run.grenades + 1);
    else if (type === 'drink') {
      run.damage = Math.max(0, run.damage - 5);
      label = '+5';
    } else if (type === 'mg') {
      this.mgT = 10;
      label = 'MG!';
    }
    this.fx.push(new Popup(x, y - 12, label));
  }

  clear() {
    this.state = 'clear';
    stopMusic();
    this.stateT = 3;
    this.failed = Boolean(this.m.needHostage && this.savedHere === 0);
    this.missiles = [];
    for (const a of this.actors) if (a.enemy && a.alive() && a.leave) a.leave(this);
    if (this.failed) sfx.bad();
    else sfx.win();
  }

  // ------------------------------------------------------------ draw
  draw(c) {
    const inp = this.game.input;
    c.save();
    c.beginPath();
    c.rect(0, 0, W, PLAY_H);
    c.clip();
    if (this.shake > 0) c.translate(Math.round(rand(-2, 2)), Math.round(rand(-2, 2)));
    this.bg.draw(c, this.camX);
    const list = [...this.actors].sort((a, b) => a.layer - b.layer || a.y - b.y);
    for (const a of list) a.draw(c, this);
    for (const f of this.fx) f.draw(c, this);
    const ms = [...this.missiles].sort((a, b) => a.z - b.z);
    for (const m of ms) m.draw(c, this);
    c.restore();

    if (this.hurtT > 0) {
      rect(c, 0, 0, W, 3, PAL.R);
      rect(c, 0, PLAY_H - 3, W, 3, PAL.R);
      rect(c, 0, 0, 3, PLAY_H, PAL.R);
      rect(c, W - 3, 0, 3, PLAY_H, PAL.R);
    }

    drawHud(c, this);
    if (this.game.god && Math.floor(this.time * 2) % 2 === 0) drawText(c, t('godMode'), 4, 4, PAL.Y, { shadow: PAL.K });

    // "-3" rising above the health bar after a hit
    if (this.hitPopup && this.hitPopup.t > 0) {
      this.hitPopup.t -= 1 / 60;
      const rise = (0.9 - this.hitPopup.t) * 14;
      drawText(c, this.hitPopup.text, 243, PLAY_H - 12 - rise, PAL.R, { align: 'center', shadow: PAL.K });
    }

    if (this.state === 'intro') {
      const goal = this.m.hostages ? t('goalHostages') : t('goalKill');
      this.banner(c, `${t('mission')} ${this.index + 1}`, t(this.m.name), goal);
    }
    if (this.state === 'clear') this.banner(c, this.failed ? t('missionFailed') : t('missionComplete'), '', '');
    if (this.state === 'dead') this.banner(c, t('gameOver'), '', '');
    if (this.banner2 && this.banner2.t > 0 && this.state === 'play') {
      this.banner2.t -= 1 / 60;
      if (Math.floor(this.time * 4) % 2 === 0) drawText(c, this.banner2.text, W / 2, 8, PAL.R, { align: 'center', shadow: PAL.K });
    }

    if (this.paused) {
      rect(c, 24, PAUSE_Y, W - 48, 86, PAL.K);
      rect(c, 24, PAUSE_Y, W - 48, 1, PAL.W);
      rect(c, 24, PAUSE_Y + 85, W - 48, 1, PAL.W);
      drawText(c, t('pause'), W / 2, PAUSE_Y + 8, PAL.Y, { align: 'center', scale: 2 });
      this.pauseItems().forEach((label, i) => {
        const y = PAUSE_Y + 34 + i * 16;
        const on = i === this.pauseSel;
        drawText(c, on ? `> ${label} <` : label, W / 2, y, on ? PAL.Y : PAL.W, { align: 'center' });
      });
      return;
    }

    // Mouse players get a sharp system cursor; touch players see the crosshair where they tap.
    if (inp.isTouch && inp.showCrosshair() && this.state !== 'dead') {
      drawCrosshair(c, inp.aim.x, Math.min(inp.aim.y, PLAY_H - 2), this.mgT > 0 ? PAL.Y : PAL.W);
    }
  }

  banner(c, line1, line2, line3) {
    rect(c, 0, 64, W, line2 ? 52 : 30, PAL.K);
    drawText(c, line1, W / 2, 72, PAL.Y, { align: 'center' });
    if (line2) drawText(c, line2, W / 2, 86, PAL.W, { align: 'center' });
    if (line3 && Math.floor(this.time * 3) % 2 === 0) drawText(c, line3, W / 2, 100, PAL.R, { align: 'center' });
  }
}
