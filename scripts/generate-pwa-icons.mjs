/** Minimal PNG icons for PWA (solid Barcelona red with yellow bull emoji area). */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../public');

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (c ^ 0xffffffff) >>> 0;
}

function png(size) {
  const row = Buffer.alloc(1 + size * 3);
  const raw = Buffer.alloc(size * row.length);
  for (let y = 0; y < size; y++) {
    const off = y * row.length;
    raw[off] = 0;
    for (let x = 0; x < size; x++) {
      const cx = x - size / 2;
      const cy = y - size / 2;
      const inCircle = cx * cx + cy * cy < (size * 0.35) ** 2;
      const i = off + 1 + x * 3;
      if (inCircle) {
        raw[i] = 0xff;
        raw[i + 1] = 0xcd;
        raw[i + 2] = 0x00;
      } else {
        raw[i] = 0xd5;
        raw[i + 1] = 0x00;
        raw[i + 2] = 0x32;
      }
    }
  }
  const compressed = deflateSync(raw);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const t = Buffer.from(type);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
    return Buffer.concat([len, t, data, crc]);
  };
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

fs.writeFileSync(path.join(outDir, 'pwa-192.png'), png(192));
fs.writeFileSync(path.join(outDir, 'pwa-512.png'), png(512));
console.log('Wrote pwa-192.png and pwa-512.png');
