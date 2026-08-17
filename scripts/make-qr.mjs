#!/usr/bin/env node
// Generates the install QR shown in the README.
//
//   npm run qr -- <build-url>
//   npm run qr                  # re-reads the URL already recorded below
//
// Generated rather than screenshotted so it is correct by construction: a QR in
// a README is a link people scan without being able to read it first, so it
// should never be an image nobody can verify. Re-run this whenever a new build
// replaces the old one and the README picture stays honest.

import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = join(root, 'docs', 'install-qr.png');
const metaPath = join(root, 'docs', 'install-qr.json');

// URL from the CLI, else whatever was encoded last time.
let url = process.argv[2];
if (!url) {
  try {
    url = JSON.parse(readFileSync(metaPath, 'utf8')).url;
  } catch {
    console.error('No URL given and no previous one recorded.\n  usage: npm run qr -- <build-url>');
    process.exit(1);
  }
}

if (!/^https:\/\/expo\.dev\/.+/.test(url)) {
  console.error(`Refusing to encode a non-Expo URL: ${url}`);
  process.exit(1);
}

mkdirSync(dirname(outPath), { recursive: true });

await QRCode.toFile(outPath, url, {
  type: 'png',
  width: 640,
  margin: 2,
  errorCorrectionLevel: 'M',
  color: {
    // Match the app: warm sand ground, deep warm brown modules.
    dark: '#2A2420FF',
    light: '#F6F3EDFF',
  },
});

writeFileSync(metaPath, JSON.stringify({ url, generated: new Date().toISOString() }, null, 2) + '\n');

// Decode the PNG we just wrote and confirm it scans back to the same URL.
// Trusting the encoder is not enough: the whole point is that nobody can read
// a QR by eye, so the only honest check is to actually scan it.
const png = PNG.sync.read(readFileSync(outPath));
const scan = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);

if (!scan) {
  console.error('Generated QR could not be decoded — refusing to leave it in place.');
  process.exit(1);
}
if (scan.data !== url) {
  console.error(`Generated QR decodes to the wrong URL:\n  got      ${scan.data}\n  expected ${url}`);
  process.exit(1);
}

writeFileSync(metaPath, JSON.stringify({ url, generated: new Date().toISOString() }, null, 2) + '\n');

console.log('wrote docs/install-qr.png');
console.log(`  scans to: ${scan.data}`);
