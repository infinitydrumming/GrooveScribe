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

  it('counts 32nd notes "1 a li bi & a la ba"', () => {
    const line = '|' + 'x-'.repeat(16) + '|';
    expect(counts(`?TimeSig=4/4&Div=32&Measures=1&Count=1&H=${line}`).slice(0, 18).join(' ')).toBe(
      '1 a li bi & a la ba 2 a li bi & a la ba 3 a'
    );
  });

  it('counts 8th-note triplets in 6/8 over two 8th notes each, and 16th triplets in 7/8', () => {
    expect(counts('?TimeSig=6/8&Div=12&Measures=1&Count=1&H=|xxxxxxxxx|').join(' ')).toBe(
      '1 a & 3 a & 5 a &'
    );
    expect(
      counts('?TimeSig=7/8&Div=24&Measures=1&Count=1&H=|xxxxxxxxxxxxxxxxxxxxx|').join(' ')
    ).toBe('1 & a 2 & a 3 & a 4 & a 5 & a 6 & a 7 & a');
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

  // Infinity Drumming, 2026: the counting choices
  describe('rhythm in bold', () => {
    // a 16ths groove: hi-hat 8ths, snare on 2 and 4 with a ghost note on the "a" of 2,
    // kick on 1, the & of 2, the & of 3 and the e of 4
    const bold =
      '?TimeSig=4/4&Div=16&Measures=1&Count=bold&H=|x-x-x-x-x-x-x-x-|&S=|----O--g----O---|&K=|o-----o---o--o--|';

    it('writes the kick, snare and toms in bold, the hi-hat and ghost notes small', () => {
      expect(counts(bold).join(' ')).toBe(
        '$11 $2e $2& $2a $12 $2e $1& $2a $23 $2e $1& $2a $14 $1e $2& $2a'
      );
      expect(gu.createABCFromGrooveData(gu.getGrooveDataFromUrlString(bold), 800)).toContain(
        '%%setfont-1 calibriBold 16'
      );
    });

    it('over 32nd notes, as small as the rest (a bar of bold counts fits a phone)', () => {
      const abc = gu.createABCFromGrooveData(
        gu.getGrooveDataFromUrlString(
          '?TimeSig=4/4&Div=32&Measures=1&Count=bold&S=|' + 'O'.repeat(32) + '|'
        ),
        300
      );
      expect(abc).toContain('%%gchordfont calibri 11\n%%setfont-1 calibriBold 11\n');
      expect(abc).toContain('%%setfont-2 calibri;fill:#8c8c8c 11\n');
    });

    it('with ghosts: the ghost note on the "a" of 2 is bold too', () => {
      expect(counts(bold.replace('Count=bold', 'Count=ghosts')).join(' ')).toBe(
        '$11 $2e $2& $2a $12 $2e $1& $1a $23 $2e $1& $2a $14 $1e $2& $2a'
      );
    });

    it('writes an accent in bold on any line', () => {
      const accents =
        '?TimeSig=4/4&Div=8&Measures=1&Count=bold&H=|X-x-X-x-|&S=|--------|&K=|--------|';
      expect(counts(accents).join(' ')).toBe('$11 $2& $22 $2& $13 $2& $24 $2&');
    });
  });

  it('rhythm only: counts where something plays, the beats always, in brackets when silent', () => {
    expect(
      counts(
        '?TimeSig=4/4&Div=16&Measures=1&Count=rhythm&H=|x---x-------x---|&S=|----O-------O---|&K=|o------o--o-----|'
      ).join(' ')
    ).toBe('1 2 a (3) & 4');
  });

  describe("the click's count", () => {
    const straight = '?TimeSig=4/4&Div=16&Measures=1&Count=click&H=|x-x-x-x-x-x-x-x-|';

    it('counts what the click plays, in its own subdivision', () => {
      expect(counts(straight + '&MetronomeFreq=8').join(' ')).toBe('1 & 2 & 3 & 4 &');
      expect(counts(straight + '&MetronomeFreq=12').join(' ')).toBe('1 & a 2 & a 3 & a 4 & a');
      expect(counts(straight + '&MetronomeFreq=8s').join(' ')).toBe('1 a 2 a 3 a 4 a');
      expect(
        counts(straight + '&MetronomeFreq=16s')
          .slice(0, 4)
          .join(' ')
      ).toBe('1 li & la');
      expect(counts(straight + '&MetronomeFreq=4&ClickStart=AND').join(' ')).toBe('& & & &');
      expect(counts(straight).join(' ')).toBe('1 2 3 4'); // the click off: the beats
      expect(
        counts('?TimeSig=6/8&Div=8&Measures=1&Count=click&MetronomeFreq=4d&H=|xxxxxx|').join(' ')
      ).toBe('1 4');
    });

    it('lines up with a triplet groove beat by beat, its plain beats and its sextuplets', () => {
      // 16th triplets: the hi-hat's 8ths are written as plain 8ths (8 units a beat)
      const abc = (freq) =>
        gu.createABCFromGrooveData(
          gu.getGrooveDataFromUrlString(
            '?TimeSig=4/4&Div=24&Measures=1&Count=click&MetronomeFreq=' +
              freq +
              '&H=|x--x--x--x--x--x--x--x--|&S=|------------------------|&K=|------------------------|'
          ),
          800
        );
      expect(abc(4)).toContain('%%tuplets 1 0 0\n"1"x4x4 "2"x4x4 "3"x4x4 "4"x4x4 |');
      expect(abc(16)).toContain('%%tuplets 1 0 0\n(6:8:6"1"x1"a"x1"li"x1"&"x1"a"x1"la"x1 ');
    });

    it("writes it as the click's own triplets, with no tuplet number over them", () => {
      const abc = gu.createABCFromGrooveData(
        gu.getGrooveDataFromUrlString(straight + '&MetronomeFreq=12'),
        800
      );
      // (a note on each 16th too, and the clicks between them: one tuplet over the beat)
      expect(abc).toContain('V:Stickings\n%%tuplets 1 0 0\n(12:8:6"1"x3x1"&"x2x2"a"x1x3 ');
      expect(abc).toContain('%%tuplets 0 0 0\nV:Hands');
    });
  });

  it('is saved in the link', () => {
    for (const mode of ['bold', 'ghosts', 'rhythm', 'click']) {
      const gd = gu.getGrooveDataFromUrlString(groove + '&Count=' + mode);
      expect([gd.showCounts, gd.countMode]).toEqual([true, mode]);
      expect(gu.getUrlStringFromGrooveData(gd)).toContain('&Count=' + mode);
    }
  });

  it('is saved in the link (every note)', () => {
    const gd = gu.getGrooveDataFromUrlString(groove + '&Count=1');
    expect(gd.showCounts).toBe(true);
    expect(gu.getUrlStringFromGrooveData(gd)).toContain('&Count=1');
    expect(gu.getUrlStringFromGrooveData(gu.getGrooveDataFromUrlString(groove))).not.toContain(
      'Count='
    );
  });
});
