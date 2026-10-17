// Everything that lives on the battlefield.
// Ground actors use world x (scroll with the camera) and y = feet line on screen.
import { W, PLAY_H, PAL, rect, disc, drawText } from './render.js';
import { drawSprite } from './sprites.js';
import { sfx } from './audio.js';

export const rand = (a, b) => a + Math.random() * (b - a);
export const irand = (a, b) => Math.floor(rand(a, b + 1));
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;

export const GROUND_BOT = 188;
export const BLAST_DAMAGE = 10; // grenade damage to machines

class Actor {
  constructor() {
    this.remove = false;
    this.layer = 1;
    this.prio = 0;
    this.enemy = false;
  }

  alive() { return true; }
  canHit() { return this.alive(); }

  sx(b) { return this.x - b.camX; }

  hits(b, x, y, pad) {
    const [x0, y0, x1, y1] = this.box(b);
    return x >= x0 - pad && x <= x1 + pad && y >= y0 - pad && y <= y1 + pad;
  }

  inBlast(b, cx, cy, r) {
    const [x0, y0, x1, y1] = this.box(b);
    const nx = clamp(cx, x0, x1);
    const ny = clamp(cy, y0, y1);
    return (nx - cx) ** 2 + (ny - cy) ** 2 <= r * r;
  }
}

// ---------------------------------------------------------------- Soldier
const SOLDIER = {
  rifle: { hp: 1, points: 100, variant: '' },
  runner: { hp: 1, points: 100, variant: '' },
  grenadier: { hp: 1, points: 200, variant: 'khaki' },
  knife: { hp: 2, points: 300, variant: 'blue' },
  chaser: { hp: 1, points: 200, variant: '' },
};

export class Soldier extends Actor {
  constructor(b, kind, opts = {}) {
    super();
    const def = SOLDIER[kind];
    this.kind = kind;
    this.enemy = true;
    this.hp = def.hp;
    this.points = def.points;
    this.variant = def.variant;
    this.y = Math.round(opts.y ?? rand(b.gTop + 8, GROUND_BOT));
    const fromLeft = opts.fromLeft ?? Math.random() < 0.5;
    this.x = b.camX + (fromLeft ? -10 : W + 10);
    this.face = fromLeft ? 1 : -1;
    this.speed = kind === 'runner' ? rand(55, 75) : kind === 'knife' ? rand(40, 55) : rand(22, 36);
    this.state = 'walk';
    this.t = 0;
    this.anim = Math.random();
    this.flash = 0;
    this.hitT = 0;
    this.throwT = 0;
    this.shots = irand(1, 3);
    this.targetX = kind === 'runner'
      ? b.camX + (fromLeft ? W + 30 : -30)
      : b.camX + rand(20, W - 20);
    if (kind === 'chaser') {
      this.victim = opts.victim;
      this.state = 'chase';
      this.speed = 34;
      this.t = rand(3.5, 5) * (b.d.civPenalty ? 1 : 1.6);
    }
  }

  alive() { return this.state !== 'dying' && this.state !== 'dead'; }

  box(b) {
    const s = this.sx(b);
    return [s - 6, this.y - 22, s + 5, this.y - 1];
  }

  leave(b) {
    this.state = 'leave';
    this.targetX = b.camX + (this.sx(b) < W / 2 ? -30 : W + 30);
  }

  walkTo(dt, tx) {
    const dx = tx - this.x;
    this.face = Math.sign(dx) || this.face;
    const step = this.speed * dt;
    if (Math.abs(dx) <= step) {
      this.x = tx;
      return true;
    }
    this.x += Math.sign(dx) * step;
    return false;
  }

  attack(b) {
    const s = this.sx(b);
    if (this.kind === 'grenadier') {
      b.enemyMissile(s + 5, this.y - 20, 'grenade');
      this.throwT = 0.35;
    } else if (this.kind === 'knife') {
      b.enemyMissile(s + 5, this.y - 18, 'knife');
      this.throwT = 0.3;
    } else {
      b.enemyFire(this);
      this.flash = 0.08;
    }
  }

  update(dt, b) {
    this.anim += dt;
    this.flash = Math.max(0, this.flash - dt);
    this.hitT = Math.max(0, this.hitT - dt);
    this.throwT = Math.max(0, this.throwT - dt);
    switch (this.state) {
      case 'walk':
      case 'leave':
        if (this.walkTo(dt, this.targetX)) {
          if (this.state === 'leave' || this.kind === 'runner') {
            this.remove = true;
            return;
          }
          this.state = 'aim';
          this.t = rand(0.5, 1.1) / Math.sqrt(b.d.fire);
        }
        break;
      case 'chase': {
        const v = this.victim;
        if (!v || !v.alive()) {
          this.state = 'walk';
          this.targetX = b.camX + rand(20, W - 20);
          break;
        }
        this.walkTo(dt, v.x + 26);
        this.t -= dt;
        if (this.t <= 0 && b.state === 'play') {
          if (v.sx(b) > -4) {
            this.flash = 0.12;
            this.face = -1;
            sfx.enemyShot();
            v.kill(b, 'enemy');
          }
          this.state = 'aim';
          this.t = 0.8;
          this.shots = 2;
        }
        break;
      }
      case 'aim':
        this.t -= dt;
        if (this.t > 0) break;
        if (b.state !== 'play') {
          this.leave(b);
          break;
        }
        this.attack(b);
        this.shots--;
        if (this.shots > 0) {
          this.t = rand(0.8, 1.5) / Math.sqrt(b.d.fire);
        } else if (Math.random() < 0.55) {
          this.state = 'walk';
          this.targetX = b.camX + rand(20, W - 20);
          this.shots = irand(1, 3);
        } else {
          this.leave(b);
        }
        break;
      case 'dying':
        this.t -= dt;
        if (this.t <= 0) {
          this.state = 'dead';
          this.t = 0.9;
        }
        break;
      case 'dead':
        this.t -= dt;
        if (this.t <= 0) this.remove = true;
        break;
      default:
    }
    const s = this.sx(b);
    if (this.state === 'aim' && (s < -24 || s > W + 24)) this.remove = true; // scrolled away
  }

  damage(b, n) {
    if (!this.alive()) return;
    this.hp -= n;
    if (this.hp > 0) {
      this.hitT = 0.08;
      sfx.hit();
      return;
    }
    this.state = 'dying';
    this.t = 0.18;
    b.killed('soldier', this.points);
    sfx.hit();
  }

  shot(b) { this.damage(b, 1); }
  blasted(b) { this.damage(b, 99); }

  draw(c, b) {
    const s = Math.round(this.sx(b));
    const top = this.y - 22;
    if (this.state === 'dead') {
      if (this.t < 0.5 && Math.floor(this.t * 14) % 2) return;
      drawSprite(c, 'soldier_dead', s - 11, this.y - 6, this.variant);
      return;
    }
    let name = 'soldier_stand';
    let variant = this.variant;
    let flip = false;
    if (this.state === 'walk' || this.state === 'leave' || this.state === 'chase') {
      name = Math.floor(this.anim * 8) % 2 ? 'soldier_walk1' : 'soldier_walk2';
      flip = this.face < 0;
    } else if (this.state === 'aim') {
      if (this.kind === 'grenadier' || this.kind === 'knife') name = this.throwT > 0 ? 'soldier_throw' : 'soldier_stand';
      else name = 'soldier_aim';
    }
    if (this.state === 'dying' || this.hitT > 0) variant = 'white';
    drawSprite(c, name, s - 6, top, variant, flip);
    if (this.flash > 0) {
      disc(c, s, top + 10, 3, PAL.Y);
      disc(c, s, top + 10, 1, PAL.W);
    }
    if (this.throwT > 0.15) {
      if (this.kind === 'knife') rect(c, s + 4, top + 3, 1, 5, PAL.W);
      else disc(c, s + 5, top + 6, 1.5, PAL.K);
    }
  }
}

// ---------------------------------------------------------------- Helicopter (and the final gunship)
export class Heli extends Actor {
  constructor(b, boss = false) {
    super();
    this.enemy = true;
    this.boss = boss;
    this.layer = 0;
    this.scale = boss ? 2 : 1;
    this.hp = boss ? 60 : 12;
    this.maxHp = this.hp;
    this.dir = Math.random() < 0.5 ? 1 : -1;
    this.x = b.camX + (this.dir > 0 ? -50 * this.scale : W + 50 * this.scale);
    this.baseY = boss ? 52 : rand(30, 62);
    this.y = this.baseY;
    this.speed = boss ? 28 : 40;
    this.state = 'fly';
    this.passes = boss ? Infinity : irand(3, 5);
    this.targetX = b.camX + rand(50, W - 50);
    this.fireT = rand(1.5, 2.5);
    this.anim = 0;
    this.hitT = 0;
    this.t = 0;
  }

  alive() { return this.state === 'fly' || this.state === 'leave'; }

  box(b) {
    const s = this.sx(b);
    const hw = 18 * this.scale;
    return [s - hw, this.y - 6 * this.scale, s + hw, this.y + 6 * this.scale];
  }

  update(dt, b) {
    this.anim += dt;
    this.hitT = Math.max(0, this.hitT - dt);
    if (this.state === 'falling') {
      this.t -= dt;
      this.y += 45 * dt;
      this.x += this.dir * 20 * dt;
      if (Math.random() < 0.5) b.fx.push(new Debris(this.sx(b), this.y, Math.random() < 0.5 ? PAL.g : PAL.K));
      if (this.t <= 0) {
        this.remove = true;
        b.fx.push(new Explosion(this.sx(b), this.y, 20 * this.scale, 0.7));
        b.shake = 0.4;
        sfx.boom();
      }
      return;
    }
    // fly between random points, bobbing
    const dx = this.targetX - this.x;
    if (Math.abs(dx) < this.speed * dt + 1) {
      this.passes--;
      if (this.state === 'leave') {
        this.remove = true;
        return;
      }
      if (this.passes <= 0 || b.state !== 'play') {
        this.state = 'leave';
        this.targetX = b.camX + (this.sx(b) < W / 2 ? -80 : W + 80);
      } else {
        this.targetX = b.camX + rand(40, W - 40);
      }
    } else {
      this.dir = Math.sign(dx);
      this.x += this.dir * this.speed * dt;
    }
    this.y = this.baseY + Math.sin(this.anim * 2) * 3;
    const s = this.sx(b);
    this.fireT -= dt;
    if (this.fireT <= 0 && this.state === 'fly' && b.state === 'play' && s > 10 && s < W - 10) {
      b.enemyMissile(s - 10 * this.dir * this.scale, this.y + 4 * this.scale, 'rocket');
      if (this.boss && Math.random() < 0.6) b.enemyMissile(s + 6, this.y + 8, 'rocket');
      this.fireT = (this.boss ? rand(1.2, 2) : rand(2.2, 3.6)) / b.d.fire ** 0.5;
    }
  }

  damage(b, n) {
    if (!this.alive()) return;
    this.hp -= n;
    this.hitT = 0.06;
    sfx.clank();
    if (this.hp > 0) return;
    this.state = 'falling';
    this.t = this.boss ? 1.6 : 1.1;
    b.killed('heli', this.boss ? 5000 : 1000);
    b.fx.push(new Explosion(this.sx(b), this.y, 12 * this.scale, 0.5));
    sfx.boom();
  }

  shot(b) { this.damage(b, 1); }
  blasted(b) { this.damage(b, BLAST_DAMAGE); }

  draw(c, b) {
    const s = this.sx(b);
    const name = Math.floor(this.anim * 14) % 2 ? 'heli1' : 'heli2';
    const variant = this.hitT > 0 ? 'white' : this.boss ? 'boss' : '';
    const k = this.scale;
    drawSprite(c, name, s - 18 * k, this.y - 6 * k, variant, this.dir > 0, k);
    if (this.boss && this.alive()) {
      // health bar under the gunship
      const w = 40;
      rect(c, s - w / 2, this.y + 16, w, 3, PAL.K);
      rect(c, s - w / 2, this.y + 16, (w * this.hp) / this.maxHp, 3, PAL.R);
    }
  }
}

// ---------------------------------------------------------------- Armoured car / gunboat
export class Vehicle extends Actor {
  constructor(b, kind) {
    super();
    this.kind = kind; // 'apc' | 'boat'
    this.enemy = true;
    this.hp = kind === 'apc' ? 20 : 14;
    this.dir = Math.random() < 0.5 ? 1 : -1;
    this.x = b.camX + (this.dir > 0 ? -40 : W + 40);
    this.y = kind === 'boat' ? b.m.riverY : Math.round(rand(b.gTop + 24, GROUND_BOT - 6));
    this.speed = kind === 'apc' ? 20 : 26;
    this.state = 'drive';
    this.stops = irand(2, 3);
    this.targetX = b.camX + rand(50, W - 50);
    this.t = 0;
    this.anim = 0;
    this.hitT = 0;
  }

  alive() { return this.state === 'drive' || this.state === 'stop' || this.state === 'leave'; }

  box(b) {
    const s = this.sx(b);
    return this.kind === 'apc' ? [s - 17, this.y - 15, s + 17, this.y - 1] : [s - 15, this.y - 10, s + 15, this.y - 1];
  }

  update(dt, b) {
    this.anim += dt;
    this.hitT = Math.max(0, this.hitT - dt);
    const s = this.sx(b);
    switch (this.state) {
      case 'drive':
      case 'leave': {
        const dx = this.targetX - this.x;
        if (Math.abs(dx) < this.speed * dt + 1) {
          if (this.state === 'leave') {
            this.remove = true;
            return;
          }
          this.state = 'stop';
          this.t = rand(1.6, 2.6);
          this.fired = false;
        } else {
          this.dir = Math.sign(dx);
          this.x += this.dir * this.speed * dt;
        }
        break;
      }
      case 'stop':
        this.t -= dt;
        if (!this.fired && this.t < 1 && b.state === 'play') {
          this.fired = true;
          const mx = this.kind === 'apc' ? s - 18 * this.dir : s - 16 * this.dir;
          b.enemyMissile(mx, this.y - (this.kind === 'apc' ? 13 : 7), 'shell');
        }
        if (this.t <= 0) {
          this.stops--;
          if (this.stops <= 0 || b.state !== 'play') {
            this.state = 'leave';
            this.targetX = b.camX + (s < W / 2 ? -60 : W + 60);
          } else {
            this.state = 'drive';
            this.targetX = b.camX + rand(40, W - 40);
          }
        }
        break;
      case 'wreck':
        this.t -= dt;
        if (this.t <= 0) this.remove = true;
        break;
      default:
    }
  }

  damage(b, n) {
    if (!this.alive()) return;
    this.hp -= n;
    this.hitT = 0.06;
    sfx.clank();
    if (this.hp > 0) return;
    this.state = 'wreck';
    this.t = 1.6;
    b.killed('vehicle', this.kind === 'apc' ? 1500 : 1200);
    const s = this.sx(b);
    b.fx.push(new Explosion(s, this.y - 8, 22, 0.7));
    for (let i = 0; i < 12; i++) b.fx.push(new Debris(s, this.y - 8, i % 2 ? PAL.K : PAL.k));
    b.shake = 0.4;
    sfx.boom();
  }

  shot(b) { this.damage(b, 1); }
  blasted(b) { this.damage(b, BLAST_DAMAGE); }

  draw(c, b) {
    const s = Math.round(this.sx(b));
    const flip = this.dir > 0;
    if (this.state === 'wreck') {
      if (this.kind === 'boat') {
        if (Math.floor(this.t * 10) % 2) drawSprite(c, 'boat', s - 15, this.y - 10 + (1.6 - this.t) * 6, 'burnt', flip);
      } else {
        drawSprite(c, 'apc1', s - 17, this.y - 16, 'burnt', flip);
      }
      const f = Math.floor(this.t * 12) % 2;
      disc(c, s - 4, this.y - 14 - f, 3, f ? PAL.R : PAL.Y);
      disc(c, s + 6, this.y - 12 + f, 2, f ? PAL.Y : PAL.R);
      return;
    }
    const variant = this.hitT > 0 ? 'white' : '';
    if (this.kind === 'apc') {
      const moving = this.state !== 'stop';
      const name = moving && Math.floor(this.anim * 8) % 2 ? 'apc2' : 'apc1';
      drawSprite(c, name, s - 17, this.y - 16, variant, flip);
    } else {
      drawSprite(c, 'boat', s - 15, this.y - 10 + Math.round(Math.sin(this.anim * 3)), variant, flip);
      if (this.state !== 'stop') {
        const wx = flip ? s - 18 : s + 15;
        rect(c, wx, this.y - 2, 4, 1, PAL.W);
        rect(c, wx + (flip ? -3 : 3), this.y - 1, 4, 1, PAL.C);
      }
    }
  }
}

// ---------------------------------------------------------------- Civilians: medics with a stretcher, a boy
export class Civilian extends Actor {
  constructor(b, kind) {
    super();
    this.kind = kind;
    this.dir = Math.random() < 0.5 ? 1 : -1;
    this.x = b.camX + (this.dir > 0 ? -30 : W + 30);
    this.y = Math.round(rand(b.gTop + 20, GROUND_BOT - 2));
    this.speed = kind === 'boy' ? rand(38, 48) : 16;
    this.state = 'walk';
    this.anim = 0;
    this.stun = 0;
    this.t = 0;
  }

  alive() { return this.state === 'walk'; }

  box(b) {
    const s = this.sx(b);
    return this.kind === 'boy' ? [s - 4, this.y - 12, s + 3, this.y - 1] : [s - 20, this.y - 16, s + 19, this.y - 1];
  }

  update(dt, b) {
    this.anim += dt;
    if (this.state === 'dead') {
      this.t -= dt;
      if (this.t <= 0) this.remove = true;
      return;
    }
    if (this.stun > 0) this.stun -= dt;
    else this.x += this.dir * this.speed * dt;
    const s = this.sx(b);
    if ((this.dir > 0 && s > W + 40) || (this.dir < 0 && s < -40)) this.remove = true;
  }

  hurt(b) {
    if (!this.alive()) return;
    if (b.civilianHit(this)) {
      this.state = 'dead';
      this.t = 1;
    } else {
      this.stun = 0.5;
    }
  }

  shot(b) { this.hurt(b); }
  blasted(b) { this.hurt(b); }

  draw(c, b) {
    const s = Math.round(this.sx(b));
    if (this.state === 'dead' && Math.floor(this.t * 12) % 2) return;
    const step = Math.floor(this.anim * 6) % 2;
    const variant = this.state === 'dead' || this.stun > 0.3 ? 'white' : '';
    if (this.kind === 'boy') {
      drawSprite(c, step ? 'boy1' : 'boy2', s - 4, this.y - 12, variant, this.dir < 0);
      return;
    }
    const top = this.y - 16;
    drawSprite(c, step ? 'medic1' : 'medic2', s - 20, top, variant);
    drawSprite(c, step ? 'medic2' : 'medic1', s + 10, top, variant);
    // stretcher with a patient
    rect(c, s - 12, top + 9, 24, 1, PAL.d);
    rect(c, s - 10, top + 7, 20, 2, PAL.w);
    rect(c, s - 9, top + 6, 13, 1, PAL.G);
    disc(c, s + 7, top + 6, 1.5, PAL.s);
  }
}

// ---------------------------------------------------------------- Hostage: runs to the left edge to be rescued
export class Hostage extends Actor {
  constructor(b) {
    super();
    this.x = b.camX + rand(W * 0.55, W - 16);
    this.y = Math.round(rand(b.gTop + 24, GROUND_BOT - 4));
    this.speed = 26;
    this.state = 'run';
    this.anim = 0;
    this.stun = 0;
    this.t = 0;
  }

  alive() { return this.state === 'run'; }

  box(b) {
    const s = this.sx(b);
    return [s - 6, this.y - 22, s + 5, this.y - 1];
  }

  update(dt, b) {
    this.anim += dt;
    if (this.state === 'dead') {
      this.t -= dt;
      if (this.t <= 0) this.remove = true;
      return;
    }
    if (this.stun > 0) this.stun -= dt;
    else this.x -= this.speed * dt;
    if (this.sx(b) < -8) {
      this.remove = true;
      this.state = 'saved';
      b.hostageSaved(this);
    }
  }

  kill(b, by) {
    if (!this.alive()) return;
    if (by === 'player' && !b.d.civPenalty) {
      this.stun = 0.5;
      b.fx.push(new Popup(this.sx(b), this.y - 28, '!', PAL.R));
      return;
    }
    this.state = 'dead';
    this.t = 1.2;
    b.hostageKilled(this, by);
  }

  shot(b) { this.kill(b, 'player'); }
  blasted(b) { this.kill(b, 'player'); }

  draw(c, b) {
    const s = Math.round(this.sx(b));
    if (this.state === 'dead') {
      if (this.t < 0.6 && Math.floor(this.t * 14) % 2) return;
      drawSprite(c, 'hostage_dead', s - 11, this.y - 6);
      return;
    }
    const name = Math.floor(this.anim * 8) % 2 ? 'hostage_walk1' : 'hostage_walk2';
    drawSprite(c, name, s - 6, this.y - 22, this.stun > 0.3 ? 'white' : 'hostage');
  }
}

// ---------------------------------------------------------------- Crate
export class Crate extends Actor {
  constructor(b) {
    super();
    this.x = b.camX + W + 12;
    this.y = Math.round(rand(b.gTop + 10, GROUND_BOT - 4));
  }

  box(b) {
    const s = this.sx(b);
    return [s - 7, this.y - 11, s + 6, this.y - 1];
  }

  update(dt, b) {
    if (this.sx(b) < -30) this.remove = true;
  }

  smash(b) {
    if (this.remove) return;
    this.remove = true;
    sfx.crate();
    const s = this.sx(b);
    for (let i = 0; i < 8; i++) b.fx.push(new Debris(s, this.y - 6, i % 2 ? PAL.O : PAL.d));
    b.dropItem(this.x, this.y - 16);
  }

  shot(b) { this.smash(b); }
  blasted(b) { this.smash(b); }

  draw(c, b) {
    drawSprite(c, 'crate', this.sx(b) - 7, this.y - 11);
  }
}

// ---------------------------------------------------------------- Chicken
export class Chicken extends Actor {
  constructor(b) {
    super();
    this.dir = Math.random() < 0.5 ? 1 : -1;
    this.x = b.camX + (this.dir > 0 ? -12 : W + 12);
    this.y = Math.round(rand(b.gTop + 20, GROUND_BOT));
    this.speed = rand(45, 70);
    this.anim = 0;
  }

  box(b) {
    const s = this.sx(b);
    return [s - 5, this.y - 9, s + 4, this.y - 1];
  }

  update(dt, b) {
    this.anim += dt;
    this.x += this.dir * this.speed * dt;
    const s = this.sx(b);
    if (s < -30 || s > W + 30) this.remove = true;
  }

  shot(b) {
    if (this.remove) return;
    this.remove = true;
    sfx.cluck();
    const s = this.sx(b);
    for (let i = 0; i < 8; i++) b.fx.push(new Debris(s, this.y - 5, PAL.W));
    b.dropItem(this.x, this.y - 14);
  }

  blasted(b) { this.shot(b); }

  draw(c, b) {
    const name = Math.floor(this.anim * 10) % 2 ? 'chicken1' : 'chicken2';
    drawSprite(c, name, this.sx(b) - 5, this.y - 9, '', this.dir < 0);
  }
}

// ---------------------------------------------------------------- Pickup
export const ITEM_ICON = {
  mag: 'icon_mag',
  grenade: 'icon_grenade',
  drink: 'icon_drink',
  mg: 'icon_mg',
};

export class Pickup extends Actor {
  constructor(x, y, type) {
    super();
    this.x = x;
    this.y = Math.max(12, y); // centre of the box
    this.type = type;
    this.t = 0;
    this.layer = 2;
    this.prio = 10; // shots hit items before anything behind them
  }

  box(b) {
    const s = this.sx(b);
    return [s - 8, this.y - 8, s + 7, this.y + 7];
  }

  update(dt, b) {
    this.t += dt;
    if (this.t < 0.4) this.y -= 25 * dt;
    if (this.t > 7 || this.sx(b) < -20) this.remove = true;
  }

  shot(b) {
    if (this.remove) return;
    this.remove = true;
    b.collect(this.type, this.sx(b), this.y);
  }

  draw(c, b) {
    if (this.t > 5 && Math.floor(this.t * 10) % 2) return;
    const s = Math.round(this.sx(b));
    const y = Math.round(this.y);
    rect(c, s - 7, y - 7, 15, 15, PAL.K);
    rect(c, s - 8, y - 8, 17, 1, PAL.W);
    rect(c, s - 8, y + 8, 17, 1, PAL.W);
    rect(c, s - 8, y - 8, 1, 17, PAL.W);
    rect(c, s + 8, y - 8, 1, 17, PAL.W);
    drawSprite(c, ITEM_ICON[this.type], s - 5, y - 5);
  }
}

// ---------------------------------------------------------------- Incoming missiles (fly at the player)
export const MISSILE = {
  grenade: { dmg: 6, arc: 34, r0: 1.5, r1: 7, speed: 1 },
  knife: { dmg: 4, arc: 8, r0: 1, r1: 6, speed: 0.7 },
  rocket: { dmg: 7, arc: 0, r0: 1.5, r1: 8, speed: 0.9 },
  shell: { dmg: 7, arc: 18, r0: 1.5, r1: 8, speed: 1 },
};

export class Missile {
  constructor(sx, sy, tx, ty, dur, kind = 'grenade') {
    Object.assign(this, { sx, sy, tx, ty, kind });
    this.def = MISSILE[kind];
    this.dur = dur * this.def.speed;
    this.z = 0;
    this.remove = false;
    this.spin = 0;
  }

  pos() {
    const z = this.z;
    return {
      x: lerp(this.sx, this.tx, z),
      y: lerp(this.sy, this.ty, z) - Math.sin(Math.PI * z) * this.def.arc,
      r: lerp(this.def.r0, this.def.r1, z),
    };
  }

  hits(x, y, pad) {
    const p = this.pos();
    return (x - p.x) ** 2 + (y - p.y) ** 2 <= (p.r + pad + 2) ** 2;
  }

  update(dt, b) {
    this.z += dt / this.dur;
    this.spin += dt;
    if (this.z >= 1) {
      this.remove = true;
      b.missileImpact(this);
    }
  }

  shot(b) {
    if (this.remove) return;
    this.remove = true;
    const p = this.pos();
    b.fx.push(new Explosion(p.x, p.y, 8 + p.r, 0.35));
    b.addScore(50);
    sfx.pop();
  }

  draw(c) {
    const p = this.pos();
    const blink = Math.floor(this.spin * 16) % 2;
    switch (this.kind) {
      case 'knife': {
        const len = Math.round(p.r * 1.6);
        if (blink) rect(c, p.x - len, p.y, len * 2, Math.max(1, p.r / 3), PAL.W);
        else rect(c, p.x, p.y - len, Math.max(1, p.r / 3), len * 2, PAL.w);
        break;
      }
      case 'rocket':
        disc(c, p.x, p.y, p.r + 1, blink ? PAL.Y : PAL.R);
        disc(c, p.x, p.y, p.r * 0.7, PAL.w);
        disc(c, p.x, p.y, p.r * 0.3, PAL.R);
        break;
      case 'shell':
        disc(c, p.x, p.y, p.r, PAL.K);
        disc(c, p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.35, PAL.g);
        if (blink) disc(c, p.x, p.y, p.r * 0.2, PAL.R);
        break;
      default:
        disc(c, p.x, p.y, p.r, PAL.D);
        disc(c, p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.35, PAL.G);
        if (blink) disc(c, p.x + p.r * 0.6, p.y - p.r, Math.max(1, p.r * 0.25), PAL.Y);
    }
  }
}

// ---------------------------------------------------------------- Effects (screen space)
export class Explosion {
  constructor(x, y, r, dur = 0.5) {
    Object.assign(this, { x, y, r, dur });
    this.t = 0;
    this.remove = false;
  }

  update(dt) {
    this.t += dt;
    if (this.t >= this.dur) this.remove = true;
  }

  draw(c) {
    const p = this.t / this.dur;
    const j = () => Math.round(rand(-1, 1));
    if (p < 0.15) {
      disc(c, this.x, this.y, 2 + this.r * (p / 0.15) * 0.6, PAL.W);
    } else if (p < 0.65) {
      const r = this.r * (0.6 + (0.4 * (p - 0.15)) / 0.5);
      disc(c, this.x + j(), this.y + j(), r, PAL.R);
      disc(c, this.x + j(), this.y + j(), r * 0.75, PAL.o);
      disc(c, this.x + j(), this.y + j(), r * 0.5, PAL.Y);
      disc(c, this.x, this.y, r * 0.25, PAL.W);
    } else {
      const q = (p - 0.65) / 0.35;
      const r = this.r * (1 - q * 0.6);
      const y = this.y - q * 14;
      disc(c, this.x, y, r * 0.8, PAL.g);
      disc(c, this.x - r * 0.2, y - r * 0.2, r * 0.45, PAL.w);
    }
  }
}

export class Spark {
  constructor(x, y, color) {
    Object.assign(this, { x, y, color });
    this.t = 0;
    this.remove = false;
  }

  update(dt) {
    this.t += dt;
    if (this.t > 0.16) this.remove = true;
  }

  draw(c) {
    const f = Math.floor(this.t / 0.055);
    const x = Math.round(this.x);
    const y = Math.round(this.y);
    if (f === 0) {
      rect(c, x - 1, y - 1, 3, 3, this.color);
    } else if (f === 1) {
      rect(c, x - 3, y - 1, 1, 1, this.color);
      rect(c, x + 3, y - 1, 1, 1, this.color);
      rect(c, x - 1, y - 3, 1, 1, this.color);
      rect(c, x + 1, y - 2, 1, 1, this.color);
    } else {
      rect(c, x - 4, y - 3, 1, 1, this.color);
      rect(c, x + 4, y - 2, 1, 1, this.color);
    }
  }
}

export class Debris {
  constructor(x, y, color) {
    Object.assign(this, { x, y, color });
    this.vx = rand(-60, 60);
    this.vy = rand(-110, -40);
    this.size = Math.random() < 0.5 ? 1 : 2;
    this.life = rand(0.4, 0.8);
    this.remove = false;
  }

  update(dt) {
    this.vy += 260 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0) this.remove = true;
  }

  draw(c) {
    rect(c, this.x, this.y, this.size, this.size, this.color);
  }
}

export class Popup {
  constructor(x, y, text, color = PAL.Y) {
    Object.assign(this, { x, y, text, color });
    this.t = 0;
    this.remove = false;
  }

  update(dt) {
    this.t += dt;
    this.y -= 18 * dt;
    if (this.t > 0.9) this.remove = true;
  }

  draw(c) {
    const x = clamp(this.x, this.text.length * 4, W - this.text.length * 4);
    drawText(c, this.text, x, this.y, this.color, { align: 'center', shadow: PAL.K });
  }
}

// The player's grenade: lobbed from the bottom of the screen into the aim point.
export class PlayerGrenade {
  constructor(tx, ty) {
    this.sx = W / 2 + 30;
    this.sy = PLAY_H + 6;
    this.tx = tx;
    this.ty = ty;
    this.t = 0;
    this.dur = 0.38;
    this.remove = false;
  }

  update(dt, b) {
    this.t += dt;
    if (this.t >= this.dur) {
      this.remove = true;
      b.blast(this.tx, this.ty, 24);
    }
  }

  draw(c) {
    const z = this.t / this.dur;
    const x = lerp(this.sx, this.tx, z);
    const y = lerp(this.sy, this.ty, z) - Math.sin(Math.PI * z) * 30;
    const r = lerp(5, 2, z);
    disc(c, x, y, r, PAL.D);
    disc(c, x - 1, y - 1, r * 0.4, PAL.L);
  }
}
