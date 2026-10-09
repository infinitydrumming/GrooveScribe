import { describe, it, expect, beforeEach } from 'vitest';
import { newGrooveUtils } from '../helpers/legacyLoader.js';

// Infinity Drumming, 2026: counting ("1 e & a") over the notes, "Count=1" in links.

describe('counting over the notes', () => {
  let gu;
  beforeEach(async () => {
    gu = await newGrooveUtils();
  });
  // the counts / stickings written over the notes, in order
  const counts = (url) =>
    [...gu.createABCFromGrooveData(gu.getGrooveDataFromUrlString(url), 800).matchAll(/"([^"]+)"x/g)]
      .map((m) => m[1])
      .filter((text) => text != '');
  const groove = '?TimeSig=4/4&Div=16&Measures=1&H=|x-x-x-x-x-x-x-x-|';

  it('is off unless the groove asks for it', () => {
    expect(counts(groove)).toEqual([]);
  });

  it('counts every 16th', () => {
    expect(counts(groove + '&Count=1').join(' ')).toBe('1 e & a 2 e & a 3 e & a 4 e & a');
  });

  it('keeps the stickings, counting only the beats without them', () => {
    expect(counts(groove + '&Count=1&Stickings=|R-L-R-L---------|').join(' ')).toBe(
      'R L R L 3 e & a 4 e & a'
    );
  });

  it('counts 8th notes in 4/4 and in 3/8 and 5/8 bars', () => {
    expect(counts('?TimeSig=4/4&Div=8&Measures=1&Count=1&H=|xxxxxxxx|').join(' ')).toBe(
      '1 & 2 & 3 & 4 &'
    );
    expect(
      counts('?TimeSig=3/8&Div=8&Measures=2&BarSigs=3/8,5/8&Count=1&H=|xxx|xxxxx|').join(' ')
    ).toBe('1 2 3 1 2 3 4 5');
  });

  it('puts "Swing" / "Straight" above the counts, not between them and the music', () => {
    const abc = gu.createABCFromGrooveData(
      gu.getGrooveDataFromUrlString(
        '?TimeSig=4/4&Div=16&Swing=30&Measures=2&StraightBars=2&Count=1' +
          '&H=|x-x-x-x-x-x-x-x-|x-x-x-x-x-x-x-x-|'
      ),
      800
    );
    // on an invisible bar line at the start of the counts, so the counts stay in line
    expect(abc).toContain('"@4,84Swing"[|]"1"x');
    expect(abc).toContain('"@4,84Straight"[|]"1"x');
    expect(abc).not.toContain('"^Straight"');
  });

  it('is saved in the link', () => {
    const gd = gu.getGrooveDataFromUrlString(groove + '&Count=1');
    expect(gd.showCounts).toBe(true);
    expect(gu.getUrlStringFromGrooveData(gd)).toContain('&Count=1');
    expect(gu.getUrlStringFromGrooveData(gu.getGrooveDataFromUrlString(groove))).not.toContain(
      'Count='
    );
  });
});
