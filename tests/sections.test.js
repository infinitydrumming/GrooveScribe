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
  SECTION_LETTERS,
  MAX_SECTION_NUMBER,
  sectionName,
  sectionEndings,
  endingsToUrl,
  endingsFromUrl,
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
    expect(sectionsFromUrl('a2-9x99,Z1,B,!1', 3)).toEqual({
      letters: ['Z', 'A', 'A'],
      repeats: [1, 16, 16],
    });
  });

  // Infinity Drumming, 2026: any letter, and a number for versions of a section
  it('have names from A to Z, numbered for versions (A1, A2...)', () => {
    expect(SECTION_LETTERS).toHaveLength(26);
    expect(sectionName('a2')).toBe('A2');
    expect(sectionName('Z')).toBe('Z');
    expect(sectionName('A' + MAX_SECTION_NUMBER)).toBe('A12');
    expect(sectionName('A13')).toBe('');
    expect(sectionName('A0')).toBe('');
    expect(sectionName('1')).toBe('');
    // a numbered section's name ends with ":" in a link; a letter's links are as before
    const names = ['A1', 'A1', 'M', 'A2'];
    const times = [2, 2, 1, 1];
    expect(sectionsToUrl(names, times, 4)).toBe('A1:1-2x2,M3,A2:4');
    expect(sectionsFromUrl('A1:1-2x2,M3,A2:4', 4)).toEqual({ letters: names, repeats: times });
    expect(formOrderBars('A1, M, A2, A1', names, times, 4).map((bar) => bar + 1)).toEqual([
      1, 2, 1, 2, 3, 4, 1, 2, 1, 2,
    ]);
  });
});

// Infinity Drumming, 2026: a form, the order the sections play ("ABAC")
describe('1st and 2nd time endings', () => {
  // an A section of 9 bars ×2: bars 1-7, then a fill the 1st time (bar 8), another
  // the 2nd (bar 9); then bar 10, no section
  const letters = ['A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', ''];
  const repeats = [2, 2, 2, 2, 2, 2, 2, 2, 2, 1];
  const endings = [0, 0, 0, 0, 0, 0, 0, 1, 2, 0];
  const played = (marks, form) =>
    (form
      ? formOrderBars(form, letters, repeats, 10, marks)
      : formBars(letters, repeats, 10, marks)
    )
      .map((bar) => bar + 1)
      .join(' ');

  it('play each ending only its time through the section', () => {
    expect(played(endings)).toBe('1 2 3 4 5 6 7 8 1 2 3 4 5 6 7 9 10');
    expect(played(endings, 'AA')).toBe(
      '1 2 3 4 5 6 7 8 1 2 3 4 5 6 7 9 1 2 3 4 5 6 7 8 1 2 3 4 5 6 7 9'
    );
    // an ending of two bars
    expect(played([0, 0, 0, 0, 0, 0, 1, 1, 2, 0])).toBe('1 2 3 4 5 6 7 8 1 2 3 4 5 6 9 10');
    // without endings, every bar every time, as before
    expect(played([])).toBe(played(undefined));
    expect(played(undefined)).toBe('1 2 3 4 5 6 7 8 9 1 2 3 4 5 6 7 8 9 10');
  });

  it("are a repeated section's last bars, never its first, no later than its repeats", () => {
    expect(sectionEndings(letters, repeats, endings, 10)).toEqual(endings);
    // a bar played every time after it: no ending
    expect(sectionEndings(letters, repeats, [0, 0, 0, 0, 0, 0, 1, 0, 2, 0], 10)).toEqual([
      0, 0, 0, 0, 0, 0, 0, 0, 2, 0,
    ]);
    expect(sectionEndings(letters, repeats, [1, 0, 0, 0, 0, 0, 0, 0, 0, 0], 10)[0]).toBe(0);
    expect(sectionEndings(letters, repeats, [0, 0, 0, 0, 0, 0, 0, 1, 3, 0], 10)[8]).toBe(0);
    // a section played once has none
    const once = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    expect(sectionEndings(letters, once, endings, 10).some(Boolean)).toBe(false);
  });

  it('travel in links, those in effect', () => {
    expect(endingsToUrl(letters, repeats, endings, 10)).toBe('8:1,9:2');
    expect(endingsToUrl(letters, repeats, [0, 0, 0, 0, 0, 0, 1, 1, 2, 0], 10)).toBe('7-8:1,9:2');
    expect(endingsFromUrl('7-8:1,9:2', 10)).toEqual([0, 0, 0, 0, 0, 0, 1, 1, 2, 0]);
    expect(endingsFromUrl('', 3)).toEqual([0, 0, 0]);
    expect(endingsToUrl(letters, repeats, [], 10)).toBe('');
  });
});

describe('a form', () => {
  const letters = ['A', 'A', 'B', 'C', ''];
  const repeats = [2, 2, 1, 1, 1];

  it('is tidied: its letters in capitals, a space between groups', () => {
    expect(tidyForm(' abca   abca! ')).toBe('ABCA ABCA');
    expect(tidyForm('a-b ! 2')).toBe('AB');
    expect(tidyForm('A'.repeat(40))).toHaveLength(MAX_FORM_LETTERS);
  });

  it('lists numbered sections one by one, a comma between them', () => {
    expect(tidyForm('a1 a2 b a1')).toBe('A1, A2, B, A1');
    expect(tidyForm('A1,A2,B')).toBe('A1, A2, B');
    expect(tidyForm('AB2C')).toBe('A, B2, C');
    expect(formToUrl('A1, A2, B')).toBe('A1-A2-B');
    expect(formFromUrl('A1-A2-B')).toBe('A1, A2, B');
    // letters as before
    expect(formToUrl('ABCA ABCA')).toBe('ABCA-ABCA');
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
