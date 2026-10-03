// Rebuilds the Crash 2 and Splash sounds in both soundfonts (Infinity Drumming, 2026).
//
//   Crash 2 (MIDI 57, "A3"): soundfont/NewDrumSamples/WAV (Orig)/22 Vintage Crash.wav
//   Splash  (MIDI 55, "G3"): the Crash 1 recording (Crash.wav) played 1.6x faster
//                            (higher and shorter), with a fade-out.
//
// Both are mono 44.1 kHz 16-bit WAV (PCM), peak-matched to the existing crash.
// Not MP3: MP3 encoding adds ~25 ms of silence at the start (encoder priming),
// which browsers play, so the cymbal sounded late. PCM starts exactly on time
// and every browser decodes it. The MIDI.js WebAudio loader decodes whatever is
// in the data URL, so the same WAV goes in the OGG and MP3 soundfonts.
// To use a real splash recording instead, point SPLASH_SOURCE at it and set
// SPLASH_SPEED to 1.
//
//   node scripts/make-cymbal-samples.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const wavDir = path.join(repo, 'soundfont/NewDrumSamples/WAV (Orig)');
const CRASH2_SOURCE = path.join(wavDir, '22 Vintage Crash.wav');
const SPLASH_SOURCE = path.join(wavDir, 'Crash.wav');
const SPLASH_SPEED = 1.6;
const CRASH2_SECONDS = 1.8; // longer = bigger page download
const RATE = 44100;

function readWavMono(file) {
  const b = fs.readFileSync(file);
  let off = 12;
  let fmt;
  let data;
  while (off + 8 <= b.length) {
    const id = b.toString('ascii', off, off + 4);
    const size = b.readUInt32LE(off + 4);
    if (id === 'fmt ')
      fmt = {
        format: b.readUInt16LE(off + 8),
        channels: b.readUInt16LE(off + 10),
        rate: b.readUInt32LE(off + 12),
        bits: b.readUInt16LE(off + 22),
      };
    if (id === 'data') data = b.subarray(off + 8, off + 8 + size);
    off += 8 + size + (size % 2);
  }
  const bytes = fmt.bits / 8;
  const frames = Math.floor(data.length / (bytes * fmt.channels));
  const out = new Float64Array(frames);
  for (let i = 0; i < frames; i++) {
    let sum = 0;
    for (let c = 0; c < fmt.channels; c++) {
      const p = (i * fmt.channels + c) * bytes;
      let v;
      if (fmt.format === 3) v = data.readFloatLE(p);
      else if (fmt.bits === 16) v = data.readInt16LE(p) / 32768;
      else if (fmt.bits === 24) v = data.readIntLE(p, 3) / 8388608;
      else v = data.readInt32LE(p) / 2147483648;
      sum += v;
    }
    out[i] = sum / fmt.channels;
  }
  return { rate: fmt.rate, samples: out };
}

const peak = (s) => s.reduce((m, v) => Math.max(m, Math.abs(v)), 0);

// linear-interpolation resample: speed > 1 = higher and shorter
function resample(samples, fromRate, toRate, speed = 1) {
  const step = (fromRate / toRate) * speed;
  const n = Math.floor(samples.length / step);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const x = i * step;
    const i0 = Math.floor(x);
    const i1 = Math.min(i0 + 1, samples.length - 1);
    out[i] = samples[i0] + (samples[i1] - samples[i0]) * (x - i0);
  }
  return out;
}

// keep at most maxSeconds, fading out over the last fadeSeconds
function trimAndFade(samples, rate, maxSeconds, fadeSeconds) {
  const out = samples.slice(0, Math.min(samples.length, Math.round(maxSeconds * rate)));
  const fade = Math.min(out.length, Math.round(fadeSeconds * rate));
  for (let i = 0; i < fade; i++) {
    out[out.length - fade + i] *= Math.cos(((i / fade) * Math.PI) / 2) ** 2;
  }
  return out;
}

// mono 16-bit PCM WAV file
function toWav(samples, rate) {
  const dataBytes = samples.length * 2;
  const b = Buffer.alloc(44 + dataBytes);
  b.write('RIFF', 0, 'ascii');
  b.writeUInt32LE(36 + dataBytes, 4);
  b.write('WAVE', 8, 'ascii');
  b.write('fmt ', 12, 'ascii');
  b.writeUInt32LE(16, 16); // fmt chunk size
  b.writeUInt16LE(1, 20); // PCM
  b.writeUInt16LE(1, 22); // mono
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28); // bytes per second
  b.writeUInt16LE(2, 32); // block align
  b.writeUInt16LE(16, 34); // bits per sample
  b.write('data', 36, 'ascii');
  b.writeUInt32LE(dataBytes, 40);
  for (let i = 0; i < samples.length; i++)
    b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))), 44 + i * 2);
  return b;
}

const target = peak(readWavMono(path.join(wavDir, 'Crash.wav')).samples);

const crash2Wav = readWavMono(CRASH2_SOURCE);
let crash2 = trimAndFade(
  resample(crash2Wav.samples, crash2Wav.rate, RATE),
  RATE,
  CRASH2_SECONDS,
  0.8
);
const crash2Gain = target / peak(crash2);
crash2 = crash2.map((v) => v * crash2Gain);

const splashWav = readWavMono(SPLASH_SOURCE);
let splash = trimAndFade(
  resample(splashWav.samples, splashWav.rate, RATE, SPLASH_SPEED),
  RATE,
  1.2,
  0.5
);
const splashGain = target / peak(splash);
splash = splash.map((v) => v * splashGain);

const samples = { A3: toWav(crash2, RATE), G3: toWav(splash, RATE) };

for (const file of ['gunshot-ogg.js', 'gunshot-mp3.js']) {
  const fontPath = path.join(repo, 'soundfont', file);
  let src = fs.readFileSync(fontPath, 'utf8');
  for (const [key, wav] of Object.entries(samples)) {
    const re = new RegExp(`("${key}"\\s*:\\s*)"[^"]*"`);
    if (!re.test(src)) throw new Error(`${key} not found in ${file}`);
    src = src.replace(re, `$1"data:audio/wav;base64,${wav.toString('base64')}"`);
  }
  fs.writeFileSync(fontPath, src);
  console.log(
    `updated ${file}: crash 2 ${samples.A3.length} bytes, splash ${samples.G3.length} bytes`
  );
}
