import { describe, it, expect } from 'vitest';
import { createStretcher, findHits } from '../js/timeStretch.js';

// Infinity Drumming, 2026: slowing a song down without changing its pitch.

const RATE = 8000; // (a low sample rate keeps the tests quick)

function rendered(stretcher, frames) {
  const out = [];
  for (let done = 0; done < frames; done += 2048)
    out.push(...stretcher.render(Math.min(2048, frames - done))[0]);
  return Float32Array.from(out);
}

// clicks every `every` s from `first` s, over a quiet hum: and where each starts
function clicks(seconds, first, every) {
  const samples = new Float32Array(RATE * seconds);
  for (let i = 0; i < samples.length; i++)
    samples[i] = 0.05 * Math.sin((2 * Math.PI * 110 * i) / RATE);
  const at = [];
  for (let t = first; t < seconds - 0.3; t += every) {
    const start = Math.round(t * RATE);
    at.push(start);
    for (let j = 0; j < 400; j++)
      samples[start + j] += 0.8 * Math.exp(-j / 60) * Math.sin((2 * Math.PI * 80 * j) / RATE + 0.5);
  }
  return { samples, at };
}

// how loud a tone of `frequency` gets, 25 ms at a time
function loudest(samples, frequency) {
  let most = 0;
  for (let at = 0; at + 200 < samples.length; at += 100) {
    let re = 0;
    let im = 0;
    for (let i = 0; i < 200; i++) {
      re += samples[at + i] * Math.cos((2 * Math.PI * frequency * i) / RATE);
      im += samples[at + i] * Math.sin((2 * Math.PI * frequency * i) / RATE);
    }
    most = Math.max(most, Math.hypot(re, im) / 200);
  }
  return most;
}

const nearest = (list, value) =>
  list.reduce((best, x) => (Math.abs(x - value) < Math.abs(best - value) ? x : best), -1e9);

describe('stretching a song', () => {
  it('finds the drum hits, to the sample', () => {
    const song = clicks(4, 0.25, 0.5);
    const hits = findHits(song.samples, RATE).filter((hit) => hit > 10); // (not the hum starting)
    expect(hits).toEqual(song.at);
  });

  it('gives the song back untouched at its own speed', () => {
    const song = clicks(3, 0.3, 0.6);
    const out = rendered(
      createStretcher([song.samples], findHits(song.samples, RATE), (n) => n, 0, RATE),
      RATE * 2
    );
    let difference = 0;
    for (let i = 0; i < out.length; i++)
      difference = Math.max(difference, Math.abs(out[i] - song.samples[i]));
    expect(difference).toBeLessThan(1e-6);
  });

  it('keeps the pitch slower, as loud', () => {
    const tone = new Float32Array(RATE * 3);
    for (let i = 0; i < tone.length; i++) tone[i] = 0.5 * Math.sin((2 * Math.PI * 200 * i) / RATE);
    const out = rendered(
      createStretcher([tone], [], (n) => n * 0.7, 0, RATE),
      RATE * 3
    );
    let crossings = 0;
    let peak = 0;
    for (let i = RATE; i < 2 * RATE; i++) {
      if (out[i - 1] < 0 && out[i] >= 0) crossings++;
      peak = Math.max(peak, Math.abs(out[i]));
    }
    expect(crossings).toBe(200); // (200 Hz, a second of it)
    expect(peak).toBeCloseTo(0.5, 2);
  });

  it('puts every hit where the time map says (to a ms), with no flam before it', () => {
    const song = clicks(5, 0.3, 0.6);
    const hits = findHits(song.samples, RATE);
    for (const speed of [0.5, 0.8]) {
      const out = rendered(
        createStretcher([song.samples], hits, (n) => n * speed, 0, RATE),
        Math.floor((RATE * 4.5) / speed)
      );
      const heard = findHits(out, RATE);
      song.at
        .filter((at) => at / speed < out.length - 500)
        .forEach((at) =>
          expect(Math.abs(nearest(heard, at / speed) - at / speed)).toBeLessThanOrEqual(8)
        );
    }
  });

  it('follows a change of speed, and makes the same again from where it was', () => {
    const song = clicks(5, 0.3, 0.6);
    const hits = findHits(song.samples, RATE);
    const map = (n) => (n < RATE ? n * 0.8 : RATE * 0.8 + (n - RATE) * 0.6);
    const stretcher = createStretcher([song.samples], hits, map, 0, RATE);
    rendered(stretcher, 4096);
    const saved = stretcher.snapshot();
    const first = rendered(stretcher, 8192);
    stretcher.restore(saved);
    expect(rendered(stretcher, 8192)).toEqual(first);
    // the hits after the change land on the map
    const out = rendered(createStretcher([song.samples], hits, map, 0, RATE), RATE * 6);
    const heard = findHits(out, RATE);
    const frameOf = (at) => (at < RATE * 0.8 ? at / 0.8 : RATE + (at - RATE * 0.8) / 0.6);
    song.at
      .filter((at) => frameOf(at) < out.length - 500)
      .forEach((at) =>
        expect(Math.abs(nearest(heard, frameOf(at)) - frameOf(at))).toBeLessThanOrEqual(8)
      );
  });

  it('loops part of a song: nothing from outside it at the join, its first hit on time each time round', () => {
    // clicks every 0.6 s from 0.3 s, and a tone just past the loop's end
    const song = clicks(5, 0.3, 0.6);
    const outside = Math.round(2.11 * RATE);
    for (let j = 0; j < 400; j++)
      song.samples[outside + j] += 0.5 * Math.sin((2 * Math.PI * 3000 * j) / RATE);
    const hits = findHits(song.samples, RATE);
    const loop = { start: 0.9 * RATE, end: 2.1 * RATE }; // two beats: hits at 0.9 and 1.5 s
    const length = loop.end - loop.start;
    for (const speed of [1, 0.8]) {
      const from = loop.start - 0.1 * RATE;
      const placeOf = (n) => {
        const place = from + n * speed;
        return place < loop.end ? place : loop.start + ((place - loop.start) % length);
      };
      const out = rendered(createStretcher([song.samples], hits, placeOf, 0, RATE, loop), RATE * 6);
      expect(loudest(out, 3000)).toBeLessThan(0.01); // the tone is never heard (it was 0.25)
      // the loop's hits, each time round, where the map puts them
      const heard = findHits(out, RATE);
      for (let round = 0; round < 3; round++)
        for (const hit of [0.9 * RATE, 1.5 * RATE]) {
          const frame = (hit + round * length - from) / speed;
          if (frame > out.length - 500) continue;
          expect(Math.abs(nearest(heard, frame) - frame)).toBeLessThanOrEqual(8);
        }
    }
  });

  it('stretches two channels at once, each its own', () => {
    const left = new Float32Array(RATE * 2);
    const right = new Float32Array(RATE * 2);
    for (let i = 0; i < left.length; i++) {
      left[i] = 0.4 * Math.sin((2 * Math.PI * 300 * i) / RATE);
      right[i] = 0.2 * Math.sin((2 * Math.PI * 500 * i) / RATE);
    }
    const out = createStretcher([left, right], [], (n) => n, 0, RATE).render(4096);
    let difference = 0;
    for (let i = 0; i < 4096; i++)
      difference = Math.max(
        difference,
        Math.abs(out[0][i] - left[i]),
        Math.abs(out[1][i] - right[i])
      );
    expect(difference).toBeLessThan(1e-6);
  });
});
