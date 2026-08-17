#!/usr/bin/env node
// Generates the app icon, Android adaptive icon, splash and web favicon.
//
//   npm run icons
//
// Written as a tiny PNG encoder rather than pulling in sharp/canvas: the art is
// pure geometry, so a few dozen lines of zlib beats a native build dependency
// that has to compile on every machine and CI runner.
//
// The mark is the contribution heatmap — the app's signature element — reduced
// to a 4x4 grid on the warm sand ground, cells carrying the same heat ramp
// as src/theme/tokens.ts. It reads as "practice, day after day", which is the
// whole point of the app, and it stays legible at 48px.

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'assets');
mkdirSync(outDir, { recursive: true });


// Single light palette, mirroring `palette` in src/theme/tokens.ts.
const LIGHT = {
  bg: [0xf6, 0xf3, 0xed, 255],
  heat: [
    [0xea, 0xe5, 0xda, 255], // heat0 — empty day
    [0xf7, 0xd9, 0xcd, 255],
    [0xed, 0xaf, 0x97, 255],
    [0xdf, 0x81, 0x63, 255],
    [0xd2, 0x59, 0x3c, 255], // heat4 — best day
  ],
};

// Fixed pattern, hand-picked so the eye reads a rising streak rather than noise.
const GRID = [
  [1, 0, 2, 1],
  [2, 3, 4, 2],
  [1, 4, 3, 3],
  [0, 2, 1, 4],
];

// ---------- minimal PNG encoder (RGBA, non-interlaced) ----------
const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

const crc32 = (buf) => {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};

const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // colour type: RGBA
  // 10..12 = compression / filter / interlace, all 0

  // One filter byte (0 = None) per scanline.
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- drawing ----------
const SS = 4; // supersample factor, for smooth rounded corners

/** Signed-distance test for a rounded square, used at supersampled resolution. */
const inRoundedRect = (x, y, cx, cy, half, r) => {
  const dx = Math.abs(x - cx) - (half - r);
  const dy = Math.abs(y - cy) - (half - r);
  if (dx <= 0 && dy <= 0) return true;
  const ox = Math.max(dx, 0);
  const oy = Math.max(dy, 0);
  return ox * ox + oy * oy <= r * r;
};

/**
 * @param size      output edge length in px
 * @param opaqueBg  false for the Android adaptive foreground, which is masked
 *                  by the system and must be transparent outside the mark
 * @param scale     mark size as a fraction of the canvas
 */
function render(size, { opaqueBg = true, scale = 0.62, palette = LIGHT } = {}) {
  const BG = palette.bg;
  const HEAT = palette.heat;
  const W = size * SS;
  const rgba = Buffer.alloc(size * size * 4);

  const markHalf = (W * scale) / 2;
  const cx = W / 2;
  const cy = W / 2;
  const cellPitch = (markHalf * 2) / 4;
  const cellHalf = cellPitch * 0.38;
  const cellRadius = cellHalf * 0.42;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;

      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = px * SS + sx + 0.5;
          const y = py * SS + sy + 0.5;

          let colour = opaqueBg ? BG : [0, 0, 0, 0];

          // Which grid cell (if any) covers this subpixel.
          const col = Math.floor((x - (cx - markHalf)) / cellPitch);
          const row = Math.floor((y - (cy - markHalf)) / cellPitch);
          if (col >= 0 && col < 4 && row >= 0 && row < 4) {
            const ccx = cx - markHalf + col * cellPitch + cellPitch / 2;
            const ccy = cy - markHalf + row * cellPitch + cellPitch / 2;
            if (inRoundedRect(x, y, ccx, ccy, cellHalf, cellRadius)) {
              colour = HEAT[GRID[row][col]];
            }
          }

          r += colour[0] * (colour[3] / 255);
          g += colour[1] * (colour[3] / 255);
          b += colour[2] * (colour[3] / 255);
          a += colour[3];
        }
      }

      const n = SS * SS;
      const alpha = a / n;
      const i = (py * size + px) * 4;
      // Un-premultiply so edge pixels keep their colour as alpha falls off.
      const k = alpha > 0 ? 255 / alpha : 0;
      rgba[i] = Math.round(Math.min(255, (r / n) * k));
      rgba[i + 1] = Math.round(Math.min(255, (g / n) * k));
      rgba[i + 2] = Math.round(Math.min(255, (b / n) * k));
      rgba[i + 3] = Math.round(alpha);
    }
  }

  return encodePng(size, size, rgba);
}

const outputs = [
  // Full-bleed store/app icon.
  ['icon.png', render(1024)],
  // Android masks this to a circle/squircle and can zoom ~33%, so the mark sits
  // smaller inside the safe zone; the background comes from app.json.
  ['adaptive-icon.png', render(1024, { opaqueBg: false, scale: 0.42 })],
  // Splash renders with resizeMode "contain" on the same warm sand.
  ['splash.png', render(1284, { scale: 0.34 })],
  ['favicon.png', render(48)],
];

for (const [name, buf] of outputs) {
  writeFileSync(join(outDir, name), buf);
  console.log(`  ${name.padEnd(20)} ${(buf.length / 1024).toFixed(1)} kB`);
}
console.log('\nWrote icons to assets/.');
