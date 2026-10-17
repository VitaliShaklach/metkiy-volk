// Mouse, touch and keyboard -> aim point, fire, grenade and menu actions.
import { W, H, PLAY_H, toGame } from './render.js';

export class Input {
  constructor(canvas, hooks = {}) {
    this.hooks = hooks;
    this.aim = { x: W / 2, y: PLAY_H / 2 };
    this.fireIds = new Set();
    this.firing = false;
    this.isTouch = false;
    this.lastTouch = 0;
    this.grenadeArmed = false;
    this.onArmChange = null;
    this.clearEdges();

    canvas.addEventListener('pointerdown', (e) => this.onDown(e));
    window.addEventListener('pointermove', (e) => this.onMove(e));
    window.addEventListener('pointerup', (e) => this.onUp(e));
    window.addEventListener('pointercancel', (e) => this.onUp(e));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => this.onKey(e));
    // No page scrolling, pinch zoom or double-tap zoom while playing.
    document.addEventListener('touchmove', (e) => {
      if (!e.target.closest?.('#rules')) e.preventDefault(); // the rules panel may scroll
    }, { passive: false });
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('dblclick', (e) => e.preventDefault());

    if (window.matchMedia?.('(pointer: coarse)').matches) this.setTouch();
  }

  clearEdges() {
    this.firePressed = false;
    this.grenadePressed = false;
    this.grenadeAt = null;
    this.tap = null;
    this.pausePressed = false;
    this.confirm = false;
    this.navUp = false;
    this.navDown = false;
    this.mutePressed = false;
    this.debugKill = false;
    this.cheatToggle = false;
  }

  // Called after each fixed update step so one-shot events are seen exactly once.
  endFrame() {
    this.clearEdges();
  }

  setTouch() {
    if (this.isTouch) return;
    this.isTouch = true;
    document.body.classList.add('touch');
  }

  setArmed(v) {
    this.grenadeArmed = v;
    this.onArmChange?.(v);
  }

  // On-screen grenade button: throw now if a finger is firing, otherwise arm the next tap.
  grenadeButton() {
    if (this.fireIds.size > 0) {
      this.grenadePressed = true;
      this.grenadeAt = { ...this.aim };
    } else {
      this.setArmed(!this.grenadeArmed);
    }
  }

  point(e) {
    const p = toGame(e.clientX, e.clientY);
    return {
      x: Math.max(0, Math.min(W - 1, p.x)),
      y: Math.max(0, Math.min(H - 1, p.y)),
    };
  }

  onDown(e) {
    e.preventDefault();
    this.hooks.onInput?.();
    const touch = e.pointerType !== 'mouse';
    const p = this.point(e);
    if (touch) {
      this.setTouch();
      this.lastTouch = performance.now();
    }
    this.tap = p;
    if (!touch && e.button === 2) {
      this.grenadePressed = true;
      this.grenadeAt = p;
      return;
    }
    if (!touch && e.button !== 0) return;
    if (this.grenadeArmed) {
      this.grenadePressed = true;
      this.grenadeAt = p;
      this.setArmed(false);
      return;
    }
    this.aim = p;
    this.fireIds.add(e.pointerId);
    this.firing = true;
    this.firePressed = true;
    try {
      e.target.setPointerCapture(e.pointerId);
    } catch (err) { /* not capturable */ }
  }

  onMove(e) {
    const touch = e.pointerType !== 'mouse';
    if (touch && !this.fireIds.has(e.pointerId)) return;
    this.aim = this.point(e);
    if (touch) this.lastTouch = performance.now();
  }

  onUp(e) {
    if (!this.fireIds.delete(e.pointerId)) return;
    this.firing = this.fireIds.size > 0;
    if (e.pointerType !== 'mouse') this.lastTouch = performance.now();
  }

  onKey(e) {
    this.hooks.onInput?.();
    // Typing W-O-L-F toggles immortality (off by default, never saved).
    this.typed = `${this.typed || ''}${e.code}`.slice(-16);
    if (this.typed === 'KeyWKeyOKeyLKeyF') {
      this.cheatToggle = true;
      this.typed = '';
    }
    switch (e.code) {
      case 'Space':
      case 'KeyG':
        this.grenadePressed = true;
        this.grenadeAt = { ...this.aim };
        e.preventDefault();
        break;
      case 'Enter':
      case 'NumpadEnter':
        this.confirm = true;
        break;
      case 'KeyP':
      case 'Escape':
        this.pausePressed = true;
        break;
      case 'ArrowUp':
        this.navUp = true;
        e.preventDefault();
        break;
      case 'ArrowDown':
        this.navDown = true;
        e.preventDefault();
        break;
      case 'KeyM':
        this.mutePressed = true;
        break;
      case 'KeyK':
        this.debugKill = true;
        break;
      default:
    }
  }

  // Touch players see the crosshair only while a finger is down or just lifted.
  showCrosshair() {
    if (!this.isTouch) return true;
    return this.firing || performance.now() - this.lastTouch < 500;
  }
}
