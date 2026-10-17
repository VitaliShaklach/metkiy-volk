// Chiptune-ish sound effects synthesized with WebAudio (no audio files).
let ac = null;
let master = null;
let noiseBuf = null;
let enabled = true;

export function setSound(on) {
  enabled = on;
  if (master) master.gain.value = on ? 0.45 : 0;
}

// Browsers only allow audio after a user gesture; call this from input handlers.
export function unlockAudio() {
  try {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = enabled ? 0.45 : 0;
      master.connect(ac.destination);
      const len = ac.sampleRate;
      noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      onUnlock?.(ac, noiseBuf);
    }
    if (ac.state === 'suspended') ac.resume();
  } catch (e) { /* no audio available */ }
}

// The music module hooks in here to share the audio context and the noise buffer.
let onUnlock = null;
export function whenAudioReady(fn) {
  if (ac) fn(ac, noiseBuf);
  else onUnlock = fn;
}

function ready() {
  return ac && enabled && ac.state === 'running';
}

function noise(dur, { vol = 0.5, f0 = 3000, f1 = f0, type = 'lowpass', q = 1, delay = 0 } = {}) {
  if (!ready()) return;
  const t = ac.currentTime + delay;
  const src = ac.createBufferSource();
  src.buffer = noiseBuf;
  const filt = ac.createBiquadFilter();
  filt.type = type;
  filt.Q.value = q;
  filt.frequency.setValueAtTime(f0, t);
  filt.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(filt).connect(g).connect(master);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.05);
}

function tone(freqs, dur, { type = 'square', vol = 0.15, slide = null, delay = 0 } = {}) {
  if (!ready()) return;
  freqs.forEach((f, i) => {
    const t = ac.currentTime + delay + i * dur;
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.setValueAtTime(vol, t + dur * 0.7);
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  });
}

export const sfx = {
  shot() {
    noise(0.07, { vol: 0.45, f0: 6000, f1: 700 });
    tone([160], 0.04, { vol: 0.12, slide: 50 });
  },
  enemyShot() { noise(0.06, { vol: 0.12, f0: 2500, f1: 500 }); },
  boom() {
    noise(0.8, { vol: 0.9, f0: 1400, f1: 50 });
    tone([90], 0.3, { type: 'triangle', vol: 0.4, slide: 30 });
  },
  pop() { noise(0.2, { vol: 0.4, f0: 2500, f1: 200 }); },
  clank() {
    tone([1300], 0.03, { vol: 0.08 });
    noise(0.05, { vol: 0.2, f0: 4000, f1: 2000, type: 'highpass' });
  },
  saved() { tone([784, 988, 1175, 1568], 0.07, { vol: 0.14 }); },
  bad() { tone([196, 147], 0.18, { vol: 0.18 }); },
  hurt() { tone([240], 0.16, { vol: 0.22, slide: 60 }); },
  hit() { tone([620], 0.07, { vol: 0.1, slide: 180 }); },
  pickup() { tone([660, 880, 1320], 0.05, { vol: 0.14 }); },
  reload() {
    tone([1400], 0.02, { vol: 0.08 });
    tone([900], 0.03, { vol: 0.1, delay: 0.3 });
  },
  empty() { tone([1600], 0.015, { vol: 0.06 }); },
  crate() { noise(0.18, { vol: 0.5, f0: 900, f1: 250, type: 'bandpass', q: 2 }); },
  cluck() { tone([900, 650, 900], 0.04, { vol: 0.1 }); },
  menu() { tone([990], 0.04, { vol: 0.1 }); },
  start() { tone([523, 659, 784, 1047], 0.08, { vol: 0.14 }); },
  win() { tone([523, 659, 784, 659, 784, 1047], 0.12, { vol: 0.15 }); },
  die() { tone([392, 330, 262, 196, 131], 0.16, { vol: 0.18, type: 'triangle' }); },
};
