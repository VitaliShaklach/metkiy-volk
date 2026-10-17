// Pixel-art sprites as text maps. Each char is a palette letter from PAL, '.' is transparent.
// Rows may be ragged: missing pixels on the right are transparent.
import { PAL } from './render.js';

// ---- Soldier parts (12 px wide) ----
const HEAD = [
  '....DDDD....',
  '...DGGGGD...',
  '...GGGGGG...',
  '..DDDDDDDD..',
  '...ssssss...',
  '...sKssKs...',
  '...ssssss...',
  '....ssss....',
];
const HEAD_BARE = [
  '............',
  '....dddd....',
  '...dddddd...',
  '...dssssd...',
  '...ssssss...',
  '...sKssKs...',
  '...ssssss...',
  '....ssss....',
];
const TORSO_CARRY = [
  '..GGGGGGGG..',
  '.GGGGGGGGGG.',
  '.GGDGGGGDGG.',
  '.GGGGGGGGGG.',
  '.sKKKKKKKKsK',
  '...DDYDDD...',
];
const TORSO_AIM = [
  '..GGGGGGGG..',
  '.GGGsKKsGGG.',
  '.GGGsKKsGGG.',
  '.GGGGKKGGGG.',
  '.GG.GGGG.GG.',
  '...DDYDDD...',
];
const TORSO_THROW = [
  '..GGGGGGGGs.',
  '.GGGGGGGGGs.',
  '.GGDGGGGDG..',
  '.GGGGGGGGG..',
  '.sGGGGGGGG..',
  '...DDYDDD...',
];
const TORSO_FREE = [
  's.WWWWWWWW.s',
  'W.gggggggg.W',
  'WWWWWWWWWWWW',
  '..gggggggg..',
  '..WWWWWWWW..',
  '...gggggg...',
];
const LEGS_STAND = [
  '...GGGGGG...',
  '...GGGGGG...',
  '...GGG.GGG..',
  '...GG...GG..',
  '...GG...GG..',
  '...GG...GG..',
  '..KKK...KKK.',
  '..KKK...KKK.',
];
const LEGS_WALK1 = [
  '...GGGGGG...',
  '..GGGGGGGG..',
  '..GGG..GGG..',
  '.GGG....GGG.',
  '.GG......GG.',
  '.GG......GG.',
  'KKK......KKK',
  '............',
];
const LEGS_WALK2 = [
  '...GGGGGG...',
  '....GGGG....',
  '....GGGG....',
  '....GGGG....',
  '....GG.GG...',
  '....GG.GG...',
  '...KKK.KKK..',
  '............',
];

// ---- Machines (nose to the left) ----
const HELI_BODY = [
  '..............KK',
  '...........KKKKKKKK',
  '........KKKggggggggKK',
  '......KKCCCgggggggggggKKKKKKKKKKKK',
  '.....KCCCCCggggggggggggggggggggggK.KK',
  '.....KCCCCgggggggggggggKKKKKKKKKKKKgK',
  '......KggggggggggggggggK..........KgK',
  '.......KKgggggggggggKKK............K',
  '.........KKKKKKKKKKKK',
  '..........K.......K',
  '.......KKKKKKKKKKKKKKK',
];
const APC_BODY = [
  '...............KKKKK',
  '..............KkkkkkK',
  'KKKKKKKKKKKKKKKkkkkkkK',
  '..............KkkkkkkK',
  '.......KKKKKKKKKKKKKKKKKKKKKK',
  '.....KKkkkkkkkkkkkkkkkkkkkkkkKK',
  '....KkkkkkkkkkkkkkkkkkkkkkkkkkkK',
  '...KkKKKkkkkkkkkkkkkkkkkkKKKkkkkK',
  '..KkkKCKkkkkkkkkkkkkkkkkkKCKkkkkkK',
  '..KkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK',
  '..KddddddddddddddddddddddddddddddK',
  '...KKKKKKKKKKKKKKKKKKKKKKKKKKKKKK',
];
const MEDIC_TOP = [
  '...WWWW...',
  '...WRWW...',
  '...ssss...',
  '...sKsK...',
  '...ssss...',
  '..WWWWWW..',
  '.WWWWRWWW.',
  '.WWWRRRWW.',
  '.WWWWRWWW.',
  '.sWWWWWWs.',
  '..WWWWWW..',
  '..WWWWWW..',
];

const DEFS = {
  soldier_stand: [...HEAD, ...TORSO_CARRY, ...LEGS_STAND],
  soldier_walk1: [...HEAD, ...TORSO_CARRY, ...LEGS_WALK1],
  soldier_walk2: [...HEAD, ...TORSO_CARRY, ...LEGS_WALK2],
  soldier_aim: [...HEAD, ...TORSO_AIM, ...LEGS_STAND],
  soldier_throw: [...HEAD, ...TORSO_THROW, ...LEGS_STAND],
  soldier_dead: [
    '......................',
    '..DDD.................',
    '.DGGGsss.GGGGGGGGG....',
    '.DGGGsKs.GGGGGGGGGGKK.',
    '.DGGGsss.GGGGGGGGGGKK.',
    '..DDD..KKKKKKKK.......',
  ],
  hostage_walk1: [...HEAD_BARE, ...TORSO_FREE, ...LEGS_WALK1],
  hostage_walk2: [...HEAD_BARE, ...TORSO_FREE, ...LEGS_WALK2],
  hostage_dead: [
    '......................',
    '..ddd.................',
    '.dddssss.WWWWWWWWwwww.',
    '.dddssKs.WWWWWWWWwwwKK',
    '.dddssss.WWWWWWWWwwwKK',
    '..ddd.................',
  ],

  medic1: [...MEDIC_TOP, '..WW..WW..', '..WW..WW..', '..ss..ss..', '.KKK..KKK.'],
  medic2: [...MEDIC_TOP, '..WW.WW...', '.WW...WW..', '.ss...ss..', 'KKK...KKK.'],
  boy1: [
    '..dddd..',
    '.dddddd.',
    '..ssss..',
    '..sKKs..',
    '..ssss..',
    '.RRRRRR.',
    's.RRRR.s',
    '..RRRR..',
    '..BBBB..',
    '..B..B..',
    '..s..s..',
    '.KK..KK.',
  ],
  boy2: [
    '..dddd..',
    '.dddddd.',
    '..ssss..',
    '..sKKs..',
    '..ssss..',
    '.RRRRRR.',
    's.RRRR.s',
    '..RRRR..',
    '..BBBB..',
    '.B....B.',
    '.s....s.',
    'KK....KK',
  ],

  heli1: ['.WWWWWWWWWWWWWWWWWWWWWWWWWWW', ...HELI_BODY],
  heli2: ['.......WWWWWWWWWWWWWWW', ...HELI_BODY],
  apc1: [
    ...APC_BODY,
    '....KggK..KggK..KggK..KggK..KggK',
    '...KgwggKKgwggKKgwggKKgwggKKgwggK',
    '....KggK..KggK..KggK..KggK..KggK',
    '.....KK....KK....KK....KK....KK',
  ],
  apc2: [
    ...APC_BODY,
    '....KggK..KggK..KggK..KggK..KggK',
    '...KggwgKKggwgKKggwgKKggwgKKggwgK',
    '....KggK..KggK..KggK..KggK..KggK',
    '.....KK....KK....KK....KK....KK',
  ],
  boat: [
    '.............KK',
    '............KwwK',
    '.........KKKwwwwK',
    'KKKKKKKKKKwwwwwwwK',
    '.........KwCwwCwwK',
    '...KKKKKKKKKKKKKKKKKKKKKKKKKKKK',
    '..KwwwwwwwwwwwwwwwwwwwwwwwwwwwK',
    '.KggggggggggggggggggggggggggggK',
    '..KggggggggggggggggggggggggggK',
    '...KKKKKKKKKKKKKKKKKKKKKKKKKK',
  ],

  chicken1: [
    '.....RR...',
    '....WWWW..',
    '....WWKWYY',
    '....WWWW..',
    '.WWWWWWW..',
    'WWWWWWWW..',
    '.WWWWWW...',
    '...Y..Y...',
    '..YY.YY...',
  ],
  chicken2: [
    '.....RR...',
    '....WWWW..',
    '....WWKWYY',
    '....WWWW..',
    '.WWWWWWW..',
    'WWWWWWWW..',
    '.WWWWWW...',
    '....YY....',
    '...YY.YY..',
  ],

  // ---- Icons (pickups and HUD), 10x10 ----
  icon_mag: [
    '...YYYY...',
    '...YkkY...',
    '...YYYY...',
    '...YYYY...',
    '..YYYYY...',
    '..YYYYY...',
    '..YYYY....',
    '.YYYYY....',
    '.YYYY.....',
    '.YYYY.....',
  ],
  icon_bullet: [
    '....yy....',
    '...yYYy...',
    '...YYYY...',
    '...YYYY...',
    '...kkkk...',
    '...YYYY...',
    '...YYYY...',
    '...YYYY...',
    '...YYYY...',
    '...kkkk...',
  ],
  icon_grenade: [
    '....rr....',
    '...rRRr...',
    '..rRWRRr..',
    '..RRRRRR..',
    '..RRRRRR..',
    '..rRRRRr..',
    '...rRRr...',
    '....gg....',
    '...gggg...',
    '...g..g...',
  ],
  icon_drink: [
    '....ww....',
    '....ww....',
    '...wCCw...',
    '..wCCCCw..',
    '..wCWCCw..',
    '..wCWCCw..',
    '..wCCCCw..',
    '..wCCCCw..',
    '..wCCCCw..',
    '..wwwwww..',
  ],
  icon_mg: [
    '..........',
    '..........',
    'KKKKKKKKK.',
    'wwwwwKKKKK',
    '.....KKwg.',
    '.....K..g.',
    '........gg',
  ],
  icon_soldier: [
    '....oo....',
    '....oo....',
    '..oooooo..',
    '.o.oooo.o.',
    'o..oooo..o',
    '...oooo...',
    '...o..o...',
    '..oo..oo..',
  ],
  icon_heli: [
    'oooooooooooo',
    '......o.....',
    '...ooooo....',
    '..oooooooooo',
    '..oooooo..o.',
    '...oooo.....',
    '..o....o....',
    '.oooooooo...',
  ],
  icon_vehicle: [
    '............',
    '....ooo.....',
    '...ooooooooo',
    '.oooooooooo.',
    'oooooooooooo',
    'oKooKooKooKo',
    '.oo.oo.oo.o.',
  ],
  icon_hostage: [
    '...yy...',
    '...yy...',
    '.yyyyyy.',
    'y..yy..y',
    '...yy...',
    '..y..y..',
    '.y....y.',
  ],
};

// Wooden crate with an X brace, built procedurally (14x11).
DEFS.crate = (() => {
  const w = 14, h = 11, rows = [];
  for (let y = 0; y < h; y++) {
    let row = '';
    for (let x = 0; x < w; x++) {
      const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1;
      const t = (x - 1) / (w - 3);
      const diag = Math.round(1 + t * (h - 3));
      const onX = x > 0 && x < w - 1 && (y === diag || y === h - 1 - diag);
      row += edge || onX ? 'd' : 'O';
    }
    rows.push(row);
  }
  return rows;
})();

const VARIANTS = {
  khaki: { G: PAL.k, D: PAL.d },
  blue: { G: PAL.B, D: '#0000BC' },
  hostage: { G: PAL.w, D: PAL.g },
  boss: { g: PAL.D, C: PAL.R, W: PAL.w },
  burnt: { k: '#3C3C3C', d: PAL.K, g: PAL.K, w: PAL.g, C: PAL.R },
};

const cache = new Map();

export function getSprite(name, variant = '', flip = false) {
  const key = `${name}|${variant}|${flip ? 1 : 0}`;
  let c = cache.get(key);
  if (c) return c;
  const rows = DEFS[name];
  if (!rows) throw new Error(`unknown sprite ${name}`);
  const over = VARIANTS[variant] || {};
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d');
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const ch = rows[j][flip ? w - 1 - i : i];
      if (!ch || ch === '.') continue;
      x.fillStyle = variant === 'white' ? PAL.W : over[ch] || PAL[ch];
      x.fillRect(i, j, 1, 1);
    }
  }
  cache.set(key, c);
  return c;
}

export function drawSprite(c, name, x, y, variant = '', flip = false, scale = 1) {
  const s = getSprite(name, variant, flip);
  c.drawImage(s, Math.round(x), Math.round(y), s.width * scale, s.height * scale);
}

export function spriteSize(name) {
  const s = getSprite(name);
  return { w: s.width, h: s.height };
}
