import { describe, it, expect } from 'vitest';
import {
  sectionRuns,
  formBars,
  barsOfSection,
  sectionsToUrl,
  sectionsFromUrl,
  tidyForm,
  formOrderBars,
  formToUrl,
  formFromUrl,
  MAX_FORM_LETTERS,
} from '../js/sections.js';

// Infinity Drumming, 2026: a groove's sections (A for 2 bars, B for 2 bars), each
// played a number of times.

describe('sections', () => {
  const letters = ['A', 'A', 'B', 'B', ''];
  const repeats = [4, 4, 2, 2, 1];

  it('are the runs of bars with the same letter', () => {
    expect(sectionRuns(letters, repeats, 5)).toEqual([
      { letter: 'A', from: 0, to: 1, repeats: 4 },
      { letter: 'B', from: 2, to: 3, repeats: 2 },
    ]);
    // the same letter again later is a section of its own
    expect(sectionRuns(['A', 'B', 'A'], [2, 1, 3], 3).map((r) => r.repeats)).toEqual([2, 1, 3]);
  });

  it('play each as many times as it says, the other bars once, in order', () => {
    expect(formBars(letters, repeats, 5)).toEqual([0, 1, 0, 1, 0, 1, 0, 1, 2, 3, 2, 3, 4]);
    expect(formBars([], [], 3)).toEqual([0, 1, 2]); // no sections: every bar once
  });

  it('can be practised by letter', () => {
    expect(barsOfSection(['A', 'B', 'A'], 'A', 3)).toEqual([0, 2]);
  });

  it('travel in links', () => {
    expect(sectionsToUrl(letters, repeats, 5)).toBe('A1-2x4,B3-4x2');
    expect(sectionsToUrl(['', 'C'], [1, 1], 2)).toBe('C2'); // (played once: no "x1")
    expect(sectionsToUrl([], [], 4)).toBe('');
    expect(sectionsFromUrl('A1-2x4,B3-4x2', 5)).toEqual({ letters: letters, repeats: repeats });
    // out of range, unknown or too many repeats: kept inside what there is
    expect(sectionsFromUrl('a2-9x99,Z1,B', 3)).toEqual({
      letters: ['', 'A', 'A'],
      repeats: [1, 16, 16],
    });
  });
});

// Infinity Drumming, 2026: a form, the order the sections play ("ABAC")
describe('a form', () => {
  const letters = ['A', 'A', 'B', 'C', ''];
  const repeats = [2, 2, 1, 1, 1];

  it('is tidied: its letters in capitals, a space between groups', () => {
    expect(tidyForm(' abca   abca! ')).toBe('ABCA ABCA');
    expect(tidyForm('a-b x 2')).toBe('AB');
    expect(tidyForm('A'.repeat(40))).toHaveLength(MAX_FORM_LETTERS);
  });

  it('plays each letter its section, as many times as it says', () => {
    // A (bars 1-2, twice), B, A again, C
    expect(formOrderBars('ABAC', letters, repeats, 5)).toEqual([0, 1, 0, 1, 2, 0, 1, 0, 1, 3]);
    expect(formOrderBars('CA CA', letters, [1, 1, 1, 1, 1], 5)).toEqual([3, 0, 1, 3, 0, 1]);
  });

  it('leaves out letters with no section, and bars with no letter', () => {
    expect(formOrderBars('AD', letters, [1, 1, 1, 1, 1], 5)).toEqual([0, 1]);
    expect(formOrderBars('', letters, repeats, 5)).toEqual([]);
  });

  it('goes in a link as letters, its groups joined by "-"', () => {
    expect(formToUrl('abca abca')).toBe('ABCA-ABCA');
    expect(formFromUrl('ABCA-ABCA')).toBe('ABCA ABCA');
    expect(formFromUrl('ABCA%20ABCA')).toBe('ABCA ABCA');
    expect(formToUrl('')).toBe('');
  });
});
