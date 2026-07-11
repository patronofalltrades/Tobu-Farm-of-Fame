/** Writes minimal WAV placeholders for farm audio. Run: node scripts/generate-audio.mjs */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../public/audio');
fs.mkdirSync(outDir, { recursive: true });

function writeWav(file, samples, sampleRate = 22050) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.floor(v * 32767), 44 + i * 2);
  }
  fs.writeFileSync(file, buffer);
}

function tone(freq, duration, sampleRate, envelope) {
  const n = Math.floor(duration * sampleRate);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const env = envelope(t, duration);
    out[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.35;
  }
  return out;
}

const sr = 22050;
const ambient = new Float32Array(sr * 4);
for (let i = 0; i < ambient.length; i++) {
  const t = i / sr;
  ambient[i] = (Math.sin(2 * Math.PI * 220 * t) * 0.03 + (Math.random() - 0.5) * 0.02) * 0.5;
}
writeWav(path.join(outDir, 'ambient.wav'), ambient, sr);

const moo = tone(180, 0.15, sr, (t) => 1);
const moo2 = tone(120, 0.35, sr, (t, d) => (t < 0.05 ? t / 0.05 : 1 - (t - 0.05) / (d - 0.05)));
const mooCombined = new Float32Array(moo.length + moo2.length);
mooCombined.set(moo, 0);
mooCombined.set(moo2, moo.length);
writeWav(path.join(outDir, 'moo.wav'), mooCombined, sr);
console.log('Wrote public/audio/ambient.wav and moo.wav');
