// Settings, difficulty and the state of one play-through.
export const MAG_SIZE = 30;
export const MAX_ITEMS = 9;
const params = new URLSearchParams(location.search);
export const DEBUG = params.has('debug');

export const DIFF = {
  easy: {
    mags: 9, grenades: 7, fire: 0.4, dmg: 0.8, spawn: 0.75, maxActive: -1,
    pad: 4, civPenalty: false, missileTime: 1.7, quota: 0.7,
  },
  normal: {
    mags: 7, grenades: 5, fire: 0.85, dmg: 1, spawn: 1, maxActive: 0,
    pad: 2, civPenalty: true, missileTime: 1.3, quota: 1,
  },
  hard: {
    mags: 5, grenades: 3, fire: 1.3, dmg: 1.3, spawn: 1.25, maxActive: 1,
    pad: 1, civPenalty: true, missileTime: 1.05, quota: 1.2,
  },
};
export const DIFF_ORDER = ['easy', 'normal', 'hard'];

const KEY = 'metkiy-volk-v1';

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch (e) {
    return {};
  }
}

export const settings = Object.assign(
  {
    lang: (navigator.language || 'en').toLowerCase().startsWith('ru') ? 'ru' : 'en',
    diff: 'normal',
    sound: true,
    music: true,
    hiscore: 0,
  },
  load(),
);
if (!DIFF[settings.diff]) settings.diff = 'normal';

export function saveSettings() {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch (e) { /* private mode: settings live for this session only */ }
}

export function newRun() {
  const d = DIFF[settings.diff];
  return {
    score: 0,
    mags: d.mags,
    bullets: MAG_SIZE,
    grenades: d.grenades,
    damage: 0,
    hostages: 0, // rescued in total
    lost: 0, // hostages killed in total
    continues: 2,
    done: {}, // cleared mission ids
  };
}
