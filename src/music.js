// Original chiptune tunes in the NES style: two pulse channels, a triangle bass and noise drums.
// Each track is a list of 8th-note steps: a note ("A4"), "-" holds the previous note, "." is silence.
// Drums: k = kick, s = snare, h = hi-hat.
import { whenAudioReady } from './audio.js';

const MUSIC_VOL = 0.32;
const LOOKAHEAD = 0.15;

const SONGS = {
  // Military march for the title and the operation map (D minor)
  title: {
    bpm: 112,
    lead: `D5 - D5 D5 F5 - D5 - C5 - A4 - C5 - - - Bb4 - Bb4 Bb4 D5 - Bb4 - A4 - - - - - - .
           D5 - D5 D5 F5 - A5 - G5 - F5 - E5 - D5 - C5 - Bb4 - A4 - G4 - D5 - - - - - - .`,
    harm: `A4 - A4 A4 D5 - A4 - A4 - F4 - A4 - - - F4 - F4 F4 Bb4 - F4 - E4 - - - - - - .
           A4 - A4 A4 D5 - F5 - D5 - D5 - C#5 - A4 - A4 - G4 - F4 - E4 - A4 - - - - - - .`,
    bass: `D3 . A2 . D3 . A2 . F2 . C3 . F2 . C3 . Bb2 . F2 . Bb2 . F2 . A2 . E2 . A2 . C#3 .
           D3 . A2 . D3 . A2 . G2 . D3 . A2 . E3 . C3 . G2 . C3 . G2 . D3 . A2 . D3 . . .`,
    drums: 'k . s s k . s . k . s s k . s s k . s s k . s . k . s s k s s s',
  },
  // Driving battle theme (A minor)
  battle: {
    bpm: 144,
    lead: `A4 - C5 - E5 - D5 C5 A4 - - - F4 - - - G4 - B4 - D5 - C5 B4 E5 - - - G#4 - B4 -
           A4 A4 C5 A4 E5 - D5 - C5 - B4 - A4 - F4 - G4 G4 B4 G4 D5 - C5 - B4 - G#4 - E4 - - -`,
    harm: `. . A4 . . . A4 . . . C5 . . . A4 . . . B4 . . . G4 . . . B4 . . . E4 .
           . . A4 . . . A4 . . . E4 . . . C4 . . . D4 . . . G4 . . . E4 . . . B3 .`,
    bass: `A2 A2 A3 A2 A2 A2 G2 A2 F2 F2 F3 F2 F2 F2 E2 F2 G2 G2 G3 G2 G2 G2 D2 G2 E2 E2 E3 E2 E2 E2 G#2 B2
           A2 A2 A3 A2 A2 A2 G2 A2 F2 F2 F3 F2 F2 F2 E2 F2 G2 G2 G3 G2 G2 G2 D2 G2 E2 E2 E3 E2 E2 E2 G#2 B2`,
    drums: 'k h s h k k s h k h s h k k s h k h s h k k s h k h s h k s s s',
  },
  // Tense theme for the gunship (E minor)
  boss: {
    bpm: 160,
    lead: `E5 - - B4 - - E5 - F5 - E5 - D#5 - B4 - E5 - - B4 - - G5 - F#5 - - - D#5 - - -
           G5 - - E5 - - G5 - A5 - G5 - F#5 - E5 - B5 - A5 - G5 - F#5 - D#5 - - - B4 - - -`,
    harm: `B4 . . . . . B4 . C5 . . . B4 . . . B4 . . . . . E5 . D#5 . . . B4 . . .
           E5 . . . . . E5 . F#5 . . . D#5 . . . G5 . . . . . D#5 . B4 . . . F#4 . . .`,
    bass: `E2 E3 E2 E3 E2 E3 F2 F3 E2 E3 E2 E3 G2 G3 F#2 F#3 E2 E3 E2 E3 E2 E3 F2 F3 B1 B2 B1 B2 D#2 D#3 F#2 F#3`,
    drums: 'k h k s k h k s k h k s k s s s',
  },
  // Victory theme for the ending (C major)
  ending: {
    bpm: 100,
    lead: `C5 - E5 - G5 - - - A5 - G5 - E5 - - - F5 - A5 - G5 - E5 - D5 - - - - - - -
           C5 - E5 - G5 - C6 - B5 - A5 - G5 - - - F5 - E5 - D5 - G5 - C5 - - - - - - .`,
    harm: `G4 - C5 - E5 - - - F5 - E5 - C5 - - - C5 - F5 - E5 - C5 - B4 - - - - - - -
           E4 - G4 - E5 - G5 - G5 - F5 - E5 - - - C5 - C5 - B4 - D5 - E4 - - - - - - .`,
    bass: `C3 . G2 . C3 . G2 . F2 . C3 . F2 . C3 . F2 . C3 . C3 . G2 . G2 . D3 . G2 . B2 .
           C3 . G2 . C3 . E3 . F2 . C3 . C3 . G2 . F2 . A2 . G2 . G2 . C3 . G2 . C3 . . .`,
    drums: 'k . h . s . h . k . h . s . h h',
  },
};

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function noteFreq(tok) {
  const m = /^([A-G])(#|b)?(\d)$/.exec(tok);
  if (!m) return 0;
  const n = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) + 1) * 12;
  return 440 * 2 ** ((n - 69) / 12);
}

const steps = (str) => str.trim().split(/\s+/);

let ac = null;
let noiseBuf = null;
let bus = null;
let on = true;
let wanted = null; // song requested before audio was unlocked
let current = null;
let song = null;
let step = 0;
let nextT = 0;
let timer = null;
let paused = false;

whenAudioReady((ctx, noise) => {
  ac = ctx;
  noiseBuf = noise;
  bus = ac.createGain();
  bus.gain.value = 0;
  bus.connect(ac.destination);
  if (wanted) startSong(wanted);
});

const level = () => (on && !paused ? MUSIC_VOL : 0);

function setLevel(v) {
  const now = ac.currentTime;
  bus.gain.cancelScheduledValues(now);
  bus.gain.setValueAtTime(v, now);
}

// NES-like pulse waves with a narrow duty cycle.
const pulseCache = {};
function pulse(duty) {
  if (!pulseCache[duty]) {
    const n = 32;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    for (let i = 1; i < n; i++) real[i] = (2 * Math.sin(i * Math.PI * duty)) / (i * Math.PI);
    pulseCache[duty] = ac.createPeriodicWave(real, imag);
  }
  return pulseCache[duty];
}

function playNote(t, freq, dur, kind) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  let vol;
  if (kind === 'bass') {
    o.type = 'triangle';
    vol = 0.5;
  } else {
    o.setPeriodicWave(pulse(kind === 'lead' ? 0.25 : 0.125));
    vol = kind === 'lead' ? 0.2 : 0.11;
  }
  const sustain = kind === 'bass' ? vol : vol * 0.7;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(vol, t);
  g.gain.linearRampToValueAtTime(sustain, t + Math.min(0.15, dur * 0.5));
  g.gain.setValueAtTime(sustain, t + dur - 0.02);
  g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(g).connect(bus);
  o.start(t);
  o.stop(t + dur + 0.01);
}

function playDrum(t, d) {
  if (d === 'k') {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(0.7, t);
    g.gain.linearRampToValueAtTime(0, t + 0.13);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + 0.15);
    return;
  }
  const src = ac.createBufferSource();
  src.buffer = noiseBuf;
  const f = ac.createBiquadFilter();
  const g = ac.createGain();
  const dur = d === 's' ? 0.12 : 0.03;
  f.type = d === 's' ? 'bandpass' : 'highpass';
  f.frequency.value = d === 's' ? 1800 : 7000;
  g.gain.setValueAtTime(d === 's' ? 0.35 : 0.12, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(bus);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.02);
}

// Length of a note: its own step plus the "-" steps that follow.
function holdSteps(track, i) {
  let n = 1;
  while (n < track.length && track[(i + n) % track.length] === '-') n++;
  return n;
}

function scheduleStep(i, t) {
  const dur = 60 / song.bpm / 2;
  for (const kind of ['lead', 'harm', 'bass']) {
    const tr = song[kind];
    if (!tr) continue;
    const j = i % tr.length;
    const f = noteFreq(tr[j]);
    if (f) playNote(t, f, holdSteps(tr, j) * dur * 0.95, kind);
  }
  const d = song.drums[i % song.drums.length];
  if (d !== '.') playDrum(t, d);
}

function tick() {
  if (!song || paused || ac.state !== 'running') return;
  // After the tab was in the background, restart from "now" instead of a burst of late notes.
  if (nextT < ac.currentTime - 0.2) nextT = ac.currentTime + 0.05;
  const dur = 60 / song.bpm / 2;
  while (nextT < ac.currentTime + LOOKAHEAD) {
    scheduleStep(step, nextT);
    nextT += dur;
    step = (step + 1) % song.length;
  }
}

function startSong(name) {
  const def = SONGS[name];
  song = {
    bpm: def.bpm,
    lead: steps(def.lead),
    harm: def.harm ? steps(def.harm) : null,
    bass: steps(def.bass),
    drums: steps(def.drums),
  };
  song.length = Math.max(song.lead.length, song.bass.length, song.drums.length);
  current = name;
  step = 0;
  paused = false;
  nextT = ac.currentTime + 0.05;
  setLevel(level());
  if (!timer) timer = setInterval(tick, 25);
  tick();
}

export function playMusic(name) {
  if (current === name) {
    setMusicPaused(false);
    return;
  }
  wanted = name;
  if (!ac) return; // starts once audio is unlocked
  stopMusic();
  wanted = name;
  startSong(name);
}

export function stopMusic() {
  wanted = null;
  current = null;
  song = null;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (bus) {
    // fade out the notes that are already scheduled
    const now = ac.currentTime;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setValueAtTime(bus.gain.value, now);
    bus.gain.linearRampToValueAtTime(0, now + 0.1);
  }
}

export function setMusicPaused(p) {
  if (p === paused) return;
  paused = p;
  if (!bus || !song) return;
  setLevel(level());
  if (!p) nextT = ac.currentTime + 0.05;
}

export function setMusic(enabled) {
  on = enabled;
  if (bus && song) setLevel(level());
}
