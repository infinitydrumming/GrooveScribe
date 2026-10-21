import { describe, it, expect } from 'vitest';
import {
  countModeFromUrl,
  countModeToUrl,
  clickTicks,
  clickCountBar,
  styleCounts,
} from '../js/countModes.js';

// Infinity Drumming, 2026: the ways of counting over the notes.

describe('count modes in a link', () => {
  it('reads Count=1 as every note, and the other choices by name', () => {
    expect(countModeFromUrl('1')).toEqual({ show: true, mode: 'all' });
    expect(countModeFromUrl('Bold')).toEqual({ show: true, mode: 'bold' });
    expect(countModeFromUrl('rhythm')).toEqual({ show: true, mode: 'rhythm' });
    expect(countModeFromUrl('click')).toEqual({ show: true, mode: 'click' });
    expect(countModeFromUrl('0')).toEqual({ show: false, mode: 'all' });
    expect(countModeFromUrl('nonsense')).toEqual({ show: false, mode: 'all' });
  });

  it('writes Count=1 for every note, the name for the others, nothing when off', () => {
    expect(countModeToUrl(true, 'all')).toBe('&Count=1');
    expect(countModeToUrl(true, 'click')).toBe('&Count=click');
    expect(countModeToUrl(false, 'bold')).toBe('');
  });
});

describe('styling the counts', () => {
  const lines = (parts) => ({
    hh: parts.hh || [],
    snare: parts.snare || [],
    kick: parts.kick || [],
    toms: parts.toms || [[], [], [], []],
    cymbals: parts.cymbals || [[], []],
  });
  const counted = () => ['"1"x', '"e"x', '"&"x', '"a"x'];

  it('bold: the kick (not the hi-hat foot alone), snare and toms, and accents', () => {
    const sticking = counted();
    styleCounts(
      sticking,
      [0, 1, 2, 3],
      'bold',
      lines({
        hh: ['^g', '^g', '!accent!^g', '^g'],
        kick: ['F', '^d,', false, false],
        toms: [[false, false, false, 'e'], [], [], []],
      }),
      null
    );
    expect(sticking).toEqual(['"$11"x', '"$2e"x', '"$1&"x', '"$1a"x']);
  });

  it('bold in a permutation: only the permuted line', () => {
    const sticking = counted();
    styleCounts(
      sticking,
      [0, 1, 2, 3],
      'bold',
      lines({
        snare: ['c', false, '!accent!c', false],
        kick: [false, 'F', false, false],
      }),
      ['kick']
    );
    expect(sticking).toEqual(['"$21"x', '"$1e"x', '"$2&"x', '"$2a"x']);
  });

  it('rhythm: drops the silent syllables, brackets a silent beat', () => {
    const sticking = counted();
    styleCounts(
      sticking,
      [0, 1, 2, 3],
      'rhythm',
      lines({ snare: [false, false, '!(.!!).!c', false] }),
      null
    );
    expect(sticking).toEqual(['"(1)"x', false, '"&"x', false]);
  });
});

describe("the click's count", () => {
  it('finds the click in ticks (128 a quarter note), on the groove grid or timed', () => {
    expect(clickTicks(8, '1', 4, 4, false)).toEqual([0, 64, 128, 192, 256, 320, 384, 448]);
    expect(clickTicks(16, '1', 2, 4, true)).toEqual([
      0,
      128 / 6,
      256 / 6,
      64,
      512 / 6,
      640 / 6,
      128,
      896 / 6,
      1024 / 6,
      192,
      1280 / 6,
      1408 / 6,
    ]);
    expect(clickTicks(4, 'TI', 2, 4, true)).toEqual([128 / 3, 128 + 128 / 3]);
    expect(clickTicks(1, '1', 4, 4, false)).toEqual([0]);
    expect(clickTicks(0, '1', 3, 4, false)).toEqual([0, 128, 256]);
    expect(clickTicks('4d', '1', 6, 8, false)).toEqual([0, 192]);
  });

  it('writes a bar of it, each beat split as finely as the clicks need', () => {
    expect(clickCountBar([0, 128], 2, 4)).toBe('"1"x8 "2"x8 ');
    expect(clickCountBar([0, 64, 128], 2, 4)).toBe('"1"x4"&"x4 "2"x4x4 ');
    expect(clickCountBar([0, 128 / 3, 256 / 3], 1, 4)).toBe('(3:2:3"1"x4"&"x4"a"x4 ');
    expect(clickCountBar([0, 128 / 6], 1, 4)).toBe('(6:4:6"1"x2"a"x2x2x2x2x2 ');
    expect(clickCountBar([0, 32], 1, 8)).toBe('"1"x2"&"x2 '); // an 8th-note beat
    expect(clickCountBar([0, 8], 1, 8)).toBe('"1"x/"ah"x/x/x/x/x/x/x/ ');
    expect(clickCountBar([0, 16], 1, 8)).toBe('"1"x1"e"x1x1x1 ');
    expect(clickCountBar([5], 1, 4)).toBeNull(); // finer than 8 to a beat
  });
});
