import { describe, it, expect } from 'vitest';
import {
  parseMetronomeFrequency,
  metronomeIsOn,
  isTimedClick,
  timedMetronomeClicks,
} from '../js/metronome.js';

// Infinity Drumming, 2026: the Click menu's newer clicks (triplets, sextuplets,
// swung 8ths and 16ths, dotted quarters), timed exactly over any groove.

describe('metronome settings', () => {
  it('reads every Click menu value, from a link or the menu', () => {
    expect(parseMetronomeFrequency('8')).toBe(8);
    expect(parseMetronomeFrequency(12)).toBe(12);
    expect(parseMetronomeFrequency('24')).toBe(24);
    expect(parseMetronomeFrequency('8s')).toBe('8s');
    expect(parseMetronomeFrequency(' 16s ')).toBe('16s');
    expect(parseMetronomeFrequency('4d')).toBe('4d');
  });

  it('turns anything unreadable off, and keeps other numbers as they always were', () => {
    expect(parseMetronomeFrequency(undefined)).toBe(0);
    expect(parseMetronomeFrequency(null)).toBe(0);
    expect(parseMetronomeFrequency('swing')).toBe(0);
    expect(parseMetronomeFrequency('-4')).toBe(0);
    expect(parseMetronomeFrequency('32')).toBe(32);
  });

  it('knows which settings click, and which are timed exactly', () => {
    expect([0, '0', '', 4, '8s'].map(metronomeIsOn)).toEqual([false, false, false, true, true]);
    expect([1, 4, 8, 16].some(isTimedClick)).toBe(false);
    expect([12, 24, '8s', '16s', '4d'].every(isTimedClick)).toBe(true);
  });
});

describe('timed clicks (128 ticks to a quarter note)', () => {
  const at = (frequency, top, bottom) =>
    timedMetronomeClicks(frequency, top, bottom).map((click) => Math.round(click.at * 100) / 100);

  it('clicks triplets, 3 to a beat', () => {
    expect(at(12, 2, 4)).toEqual([0, 42.67, 85.33, 128, 170.67, 213.33]);
  });

  it('clicks sextuplets, 6 to a beat, the triplet clicks louder than the ones between', () => {
    expect(at(24, 1, 4)).toEqual([0, 21.33, 42.67, 64, 85.33, 106.67]);
    expect(timedMetronomeClicks(24, 1, 4).map((click) => click.velocity)).toEqual([
      120, 25, 60, 25, 60, 25,
    ]);
  });

  it('swings 8ths: the beat and the last triplet', () => {
    expect(at('8s', 2, 4)).toEqual([0, 85.33, 128, 213.33]);
  });

  it('swings 16ths: each 8th note swung in triplets', () => {
    expect(at('16s', 1, 4)).toEqual([0, 42.67, 64, 106.67]);
  });

  it('clicks dotted quarter notes in 6/8 and 12/8', () => {
    expect(at('4d', 6, 8)).toEqual([0, 192]);
    expect(at('4d', 12, 8)).toEqual([0, 192, 384, 576]);
  });

  it('takes a beat to be the bottom of the time signature (an 8th note in 7/8)', () => {
    const clicks = at(12, 7, 8);
    expect(clicks).toHaveLength(21);
    expect(clicks[3]).toBe(64);
  });

  it('starts each bar with the "1" sound', () => {
    const clicks = timedMetronomeClicks(12, 4, 4);
    expect(clicks[0].note).toBe(76);
    expect(clicks.slice(1).every((click) => click.note === 77)).toBe(true);
  });

  it('leaves the clicks on the groove grid (bar, 4ths, 8ths, 16ths) to the grid', () => {
    expect(timedMetronomeClicks(4, 4, 4)).toEqual([]);
    expect(timedMetronomeClicks(0, 4, 4)).toEqual([]);
  });
});
