// Generates the app icons (crosshair on jungle green) as PNG files.
// Run: node tools/make-icons.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const N = 16; // icon drawn on a 16x16 pixel grid
const COLORS = {
  K: [0, 0, 0],
  D: [0, 88, 0],
  G: [0, 168, 0],
  R: [248, 56, 0],
  W: [252, 252, 252],
  Y: [248, 184, 0],
};

function pixel(x, y) {
  if (x === 0 || y === 0 || x === N - 1 || y === N - 1) return 'Y';
  const cx = x - 7.5;
  const cy = y - 7.5;
  const d = Math.hypot(cx, cy);
  if (Math.abs(cx) < 1 && Math.abs(cy) < 1) return 'R';
  if ((Math.abs(cx) < 1 && Math.abs(cy) > 2 && Math.abs(cy) < 7) || (Math.abs(cy) < 1 && Math.abs(cx) > 2 && Math.abs(cx) < 7)) return 'W';
  if (d > 4.6 && d < 5.9) return 'R';
  return 'D';
}

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(size) {
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b] = COLORS[pixel(Math.floor((x * N) / size), Math.floor((y * N) / size))];
      const i = y * (size * 3 + 1) + 1 + x * 3;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('icons', { recursive: true });
for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180], ['favicon.png', 32]]) {
  writeFileSync(`icons/${name}`, png(size));
}
console.log('icons written');
