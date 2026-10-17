import { initScreen, loadFont, setReservedRight, setFitListener, drawText } from './render.js';
import { Input } from './input.js';
import { settings, saveSettings, DEBUG } from './game.js';
import { setLang, t } from './i18n.js';
import { unlockAudio, setSound } from './audio.js';
import { setMusic } from './music.js';
import { TitleScene } from './scenes/title.js';
import { rulesHtml } from './rules.js';

const canvas = document.getElementById('screen');
const ctx = initScreen(canvas);

const game = {
  scene: null,
  run: null,
  input: null,
  rulesOpen: false,
  god: false, // immortality, toggled by typing W-O-L-F; always off after a reload
  toast: null,
  mg: false,
  setScene(s) {
    this.scene = s;
    document.body.dataset.scene = s.name || '';
    this.input.setArmed(false);
    this.setMG(false);
    s.enter?.();
  },
  applyLang() {
    document.title = t('docTitle');
    document.documentElement.lang = settings.lang;
    document.getElementById('rotate').textContent = t('rotate');
    document.getElementById('btnRulesLabel').textContent = t('rules');
    document.getElementById('rulesTitle').textContent = t('rules');
    document.getElementById('rulesBody').innerHTML = rulesHtml();
    this.setGod(this.god, false);
  },
  // Immortality: from the button in the rules panel or by typing W-O-L-F.
  setGod(on, announce = true) {
    this.god = on;
    for (const b of document.querySelectorAll('[data-act="god"]')) {
      b.textContent = t(on ? 'godOn' : 'godOff');
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    }
    if (announce) this.toast = { text: t(on ? 'godOn' : 'godOff'), t: 2.5 };
  },
  // Yellow cursor while the machine gun is active.
  setMG(on) {
    if (on === this.mg) return;
    this.mg = on;
    document.body.classList.toggle('mg', on);
  },
};

game.input = new Input(canvas, { onInput: unlockAudio });
if (DEBUG) {
  window.game = game;
  // Size diagnostics in the top-left corner (for screenshots of layout problems).
  const info = document.createElement('div');
  info.style.cssText = 'position:fixed;left:64px;top:4px;font:12px monospace;color:#0f0;background:#000;padding:2px 4px;z-index:20;pointer-events:none';
  document.body.append(info);
  setFitListener((m) => {
    info.textContent = Object.entries(m).map(([k, v]) => `${k}=${v}`).join('  ');
  });
}
setLang(settings.lang);
setSound(settings.sound);
setMusic(settings.music);
game.applyLang();

// iOS needs a "real" gesture (touchend / click) to start audio.
for (const ev of ['pointerup', 'touchend', 'click', 'keydown']) {
  window.addEventListener(ev, unlockAudio, { passive: true });
}

// ---- On-screen buttons ----
const btnGrenade = document.getElementById('btnGrenade');
const btnPause = document.getElementById('btnPause');
const btnFull = document.getElementById('btnFull');

function onPress(el, fn) {
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    unlockAudio();
    fn();
  });
}

onPress(btnGrenade, () => game.input.grenadeButton());
onPress(btnPause, () => { game.input.pausePressed = true; });
game.input.onArmChange = (armed) => btnGrenade.classList.toggle('armed', armed);

const root = document.documentElement;
const requestFs = root.requestFullscreen || root.webkitRequestFullscreen;
const standalone = window.matchMedia?.('(display-mode: standalone)').matches
  || window.matchMedia?.('(display-mode: fullscreen)').matches
  || navigator.standalone;
if (requestFs && !standalone) {
  document.body.classList.add('can-fs');
  // Fullscreen needs a click (touch pointerdown does not count as a user gesture).
  btnFull.addEventListener('click', () => {
    const doc = document;
    if (doc.fullscreenElement || doc.webkitFullscreenElement) {
      (doc.exitFullscreen || doc.webkitExitFullscreen).call(doc);
      return;
    }
    Promise.resolve(requestFs.call(root))
      .then(() => screen.orientation?.lock?.('landscape'))
      .catch(() => {});
  });
}

// ---- Rules panel: opens on the right; the game moves left and pauses ----
const rules = document.getElementById('rules');
document.getElementById('rulesBody').addEventListener('click', (e) => {
  if (e.target.closest('[data-act="god"]')) game.setGod(!game.god);
});
const PANEL_W = 380;
function setRules(open) {
  game.rulesOpen = open;
  rules.hidden = !open;
  document.body.classList.toggle('rules-open', open);
  // Keep the game visible next to the panel when there is room, otherwise the panel covers it.
  setReservedRight(open && window.innerWidth - PANEL_W >= 420 ? PANEL_W : 0);
  if (open) game.scene?.onHide?.();
}
onPress(document.getElementById('btnRules'), () => setRules(true));
document.getElementById('rulesClose').addEventListener('click', () => setRules(false));
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && game.rulesOpen) setRules(false);
});
window.addEventListener('resize', () => {
  if (game.rulesOpen) setRules(true);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) game.scene?.onHide?.();
});

// ---- Main loop: fixed 60 Hz updates, render every animation frame ----
await loadFont();
game.setScene(new TitleScene(game));

const STEP = 1 / 60;
let last = performance.now();
let acc = 0;
function frame(now) {
  acc += Math.min(0.25, (now - last) / 1000);
  last = now;
  while (acc >= STEP) {
    if (game.input.cheatToggle) game.setGod(!game.god);
    if (game.input.mutePressed) {
      settings.sound = !settings.sound;
      setSound(settings.sound);
      saveSettings();
    }
    game.scene.update(STEP);
    game.input.endFrame();
    acc -= STEP;
  }
  game.scene.draw(ctx);
  if (game.toast && game.toast.t > 0) {
    game.toast.t -= 1 / 60;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 16, 256, 14);
    drawText(ctx, game.toast.text, 128, 19, '#F8B800', { align: 'center' });
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
