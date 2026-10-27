import { describe, it, expect } from 'vitest';
import {
  getPermutationLayout,
  getPermutationSections,
  getPermutationSectionABC,
  getPermutationKickArray,
  getPermutationSnareArray,
  getPermutationAlternatingBar,
  fatBackKickArray,
  parseBarList,
  barListToText,
  practisedBarsABC,
  parseBarOrder,
  isPlainOrder,
  barOrderToText,
  thirtySecondChapters,
  thirtySecondCount,
  getChapterSections,
  notesInBarOfSize,
} from '../../js/permutations.js';

// Permutation figures per note setting (Infinity Drumming). Each figure is one
// bar; `tab` shows it on the grid of that note setting ("o" hit, "-" rest).
const tab = (layout, section) =>
  section.figure.hits
    .filter((_, slot) => slot % layout.unit === 0)
    .map((hit) => (hit ? 'o' : '-'))
    .join('');

const figures = (division) => {
  const layout = getPermutationLayout(division);
  return getPermutationSections(layout).map((s) => ({
    name: `${s.group.name}${s.label ? ' ' + s.label : ''}`,
    tab: tab(layout, s),
  }));
};

describe('permutation figures', () => {
  it('1/16 notes: Singles, then 8th notes / off-beat 16ths, then Doubles, Triples, Quads', () => {
    const f = figures(16);
    expect(f.map((x) => x.name).slice(0, 7)).toEqual([
      'Ostinato',
      'Singles 1',
      'Singles e',
      'Singles &',
      'Singles a',
      '8th notes / Off-beat 16ths 8ths',
      '8th notes / Off-beat 16ths off 16ths',
    ]);
    expect(f[5].tab).toBe('o-o-o-o-o-o-o-o-'); // 1 & 2 & 3 & 4 &
    expect(f[6].tab).toBe('-o-o-o-o-o-o-o-o'); // the e's and a's
    expect(f.at(-1)).toEqual({ name: 'Quads', tab: 'oooooooooooooooo' });
  });

  it('1/8 notes: the 1/16 structure stretched over 2 beats', () => {
    const f = figures(8);
    const byName = Object.fromEntries(f.map((x) => [x.name, x.tab]));
    expect(byName['Singles 1']).toBe('o---o---'); // 1 and 3
    expect(byName['Singles 2']).toBe('--o---o-');
    expect(byName['Quarter notes / Off-beat 8ths 4ths']).toBe('o-o-o-o-');
    expect(byName['Quarter notes / Off-beat 8ths off 8ths']).toBe('-o-o-o-o');
    expect(byName['Doubles 1']).toBe('oo--oo--');
    expect(byName['Triples 1']).toBe('ooo-ooo-');
    expect(byName.Quads).toBe('oooooooo');
  });

  it('1/8 triplets: no Triples; cross-rhythms every 2nd and every 4th note at the end', () => {
    const f = figures(12);
    expect(f.map((x) => x.name)).not.toContain('Triples');
    expect(f.slice(-6)).toEqual([
      { name: 'Cross-rhythm: every 2nd note 1', tab: 'o-o-o-o-o-o-' }, // 1 (&) a (2) & (a)
      { name: 'Cross-rhythm: every 2nd note &', tab: '-o-o-o-o-o-o' },
      { name: 'Cross-rhythm: every 4th note 1', tab: 'o---o---o---' }, // 1 (& a 2) & (a 3 &) a
      { name: 'Cross-rhythm: every 4th note &', tab: '-o---o---o--' },
      { name: 'Cross-rhythm: every 4th note a', tab: '--o---o---o-' },
      { name: 'Cross-rhythm: every 4th note 2', tab: '---o---o---o' },
    ]);
  });

  it('1/16 triplets: the triplet figures last an 8th note; cross-rhythms count 16th triplets', () => {
    const byName = Object.fromEntries(figures(24).map((x) => [x.name, x.tab]));
    expect(byName['Singles (twice a beat) 1']).toBe('o--o--o--o--o--o--o--o--');
    expect(byName['Doubles (twice a beat) &']).toBe('-oo-oo-oo-oo-oo-oo-oo-oo');
    expect(byName['Cross-rhythm: every 4th note 2nd']).toBe('-o---o---o---o---o---o--');
  });
});

describe('permutation bars', () => {
  const sixteenths = getPermutationSections(getPermutationLayout(16));
  const singles1 = sixteenths.find((s) => s.group.name == 'Singles' && s.sub == 1);

  it('kick bars are kicks on the hits', () => {
    const kick = getPermutationKickArray(singles1, false);
    expect(kick.filter(Boolean)).toEqual(['F', 'F', 'F', 'F']);
  });

  it('snare accent grid: accents on the hits, ghost notes on the other grid notes', () => {
    const snare = getPermutationSnareArray(singles1, 'accent', 2);
    expect(snare.slice(0, 8)).toEqual([
      '!accent!c',
      false,
      '!(.!!).!c',
      false,
      '!(.!!).!c',
      false,
      '!(.!!).!c',
      false,
    ]);
  });

  it('prints the group name over its first bar, with "play each ×N" when repeating', () => {
    const first = getPermutationSectionABC(singles1, 0, false, 2);
    expect(first.pre).toContain('P: Singles   (play each ×2)');
    expect(first.post).toBe('\\\n'); // first of two bars on the line
    const second = getPermutationSectionABC(singles1, 1, false, 1);
    expect(second.pre).not.toContain('P:');
    expect(second.post).toBe('\n');
    expect(getPermutationSectionABC(singles1, 2, true, 1).post).toBe('|\n');
  });

  // Infinity Drumming, 2026: practised bars in one run of lines, each group's
  // heading over its first bar
  it('writes practised bars in one run of lines, the headings as part labels', () => {
    const bars = practisedBarsABC(
      [
        { pre: '%%setbarnb 4\nT: \nP: Singles   (bar 3)\n%\n% Singles on "a"\n%\n', post: '|\n' },
        { pre: '%%setbarnb 5\nT: \nP: Doubles\n%\n% Doubles on "1"\n%\n', post: '\\\n' },
        { pre: '%\n% Doubles on "e"\n%\n', post: '\n' },
      ],
      2
    );
    expect(bars.map((bar) => bar.label)).toEqual(['Singles   (bar 3)', 'Doubles', '']);
    expect(bars.map((bar) => bar.post)).toEqual(['\\\n', '\n', '|\n']);
    expect(bars[1].pre).toBe('%%setbarnb 5\n%\n% Doubles on "1"\n%\n');
    expect(practisedBarsABC([{ pre: 'P:Ostinato\n', post: '\n' }], 2)[0]).toEqual({
      pre: '',
      post: '|\n',
      label: 'Ostinato',
    });
  });

  // Infinity Drumming, 2026: a permutation over a multi-bar ostinato
  it('writes a figure over each bar of the ostinato, with the heading over its first', () => {
    const bar1 = getPermutationSectionABC(singles1, 0, false, 2, 1, 2, false, { bar: 0, bars: 2 });
    const bar2 = getPermutationSectionABC(singles1, 0, false, 2, 2, 2, false, { bar: 1, bars: 2 });
    expect(bar1.pre).toContain('P: Singles   (play each ×2)');
    expect(bar1.pre).toContain('% Singles on "1", ostinato bar 1\n');
    expect(bar2.pre).not.toContain('P:');
    expect(bar2.pre).toContain('% Singles on "1", ostinato bar 2\n');
    expect(bar1.pre).toContain('%%setbarnb 1\n'); // the figure's own number over its bar 2
    // two bars a line: here a figure a line
    expect(bar1.post).toBe('\\\n');
    expect(bar2.post).toBe('\n');
    // the last figure of its group ends the group on its last bar
    const lastBar1 = getPermutationSectionABC(singles1, 3, true, 1, 4, 2, false, {
      bar: 0,
      bars: 2,
    });
    const lastBar2 = getPermutationSectionABC(singles1, 3, true, 1, 0, 2, false, {
      bar: 1,
      bars: 2,
    });
    expect(lastBar1.post).toBe('\\\n');
    expect(lastBar2.post).toBe('|\n');
    // a one-bar ostinato is written as before
    expect(
      getPermutationSectionABC(singles1, 0, false, 2, 2, 2, false, { bar: 0, bars: 1 })
    ).toEqual(getPermutationSectionABC(singles1, 0, false, 2, 2, 2, false));
  });

  it('puts one bar on a line when the music says so (dense bars on a phone)', () => {
    expect(getPermutationSectionABC(singles1, 0, false, 1, 0, 1).post).toBe('\n');
    expect(getPermutationSectionABC(singles1, 1, false, 1, 0, 1).post).toBe('\n');
    expect(getPermutationSectionABC(singles1, 2, true, 1, 0, 1).post).toBe('|\n');
    expect(getPermutationSectionABC(singles1, 0, false, 1, 0, 2).post).toBe('\\\n');
  });
});

// Infinity Drumming, 2026: "fat back" kick figures leave the backbeat to the snare
describe('fat back: no kicks with the snare on the backbeat', () => {
  const sixteenths = getPermutationSections(getPermutationLayout(16));
  const figure = (name, sub) => sixteenths.find((s) => s.group.name == name && s.sub == sub);
  const kickSlots = (kick) => kick.flatMap((k, slot) => (k ? [slot] : []));
  // the rock groove's snare (32 slots a bar): an accent on 2, a hit on 4, and a
  // ghost note on the "a" of 2
  const snare = new Array(32).fill(false);
  snare[8] = '!accent!c';
  snare[24] = 'c';
  snare[14] = '!(.!!).!c';

  it('leaves out the kicks on 2 and 4, where the snare plays', () => {
    const singles1 = getPermutationKickArray(figure('Singles', 1), false);
    expect(kickSlots(fatBackKickArray(singles1, snare))).toEqual([0, 16]); // 1 and 3
  });

  it('keeps every other kick, under the ghost notes too', () => {
    const quads = getPermutationKickArray(figure('Quads', 0), false);
    expect(kickSlots(fatBackKickArray(quads, snare))).toEqual([
      0, 2, 4, 6, 10, 12, 14, 16, 18, 20, 22, 26, 28, 30,
    ]);
    const singlesE = getPermutationKickArray(figure('Singles', 2), false);
    expect(fatBackKickArray(singlesE, snare)).toEqual(singlesE); // no kick on a backbeat
  });

  it('takes cross sticks, flams, buzzes and diddled hits for the backbeat; diddled ghosts not', () => {
    const quads = getPermutationKickArray(figure('Quads', 0), false);
    const strokes = new Array(32).fill(false);
    strokes[0] = '^c'; // cross stick
    strokes[8] = '!accent!{/c}c'; // flam
    strokes[16] = '!///!c'; // buzz
    strokes[24] = '!/!c'; // diddle
    strokes[28] = '!/!!(.!!).!c'; // diddled ghost note
    const kept = kickSlots(fatBackKickArray(quads, strokes));
    [0, 8, 16, 24].forEach((slot) => expect(kept).not.toContain(slot));
    expect(kept).toContain(28);
  });

  it('says so over each group of figures', () => {
    const singles1 = figure('Singles', 1);
    expect(getPermutationSectionABC(singles1, 0, false, 4, 0, 2, true).pre).toContain(
      'P: Singles   (fat back, play each ×4)'
    );
    expect(getPermutationSectionABC(singles1, 0, false, 1, 0, 2, true).pre).toContain(
      'P: Singles   (fat back)\n'
    );
    expect(getPermutationSectionABC(singles1, 0, false, 1, 0, 2, false).pre).toContain(
      'P: Singles\n'
    );
  });
});

// Infinity Drumming, 2026: figures in other time signatures
describe('permutation figures in other time signatures', () => {
  const groupIds = (layout) => layout.groups.map((g) => g.id.replace('PermuationOptions', ''));
  const tabsOf = (layout, name) =>
    getPermutationSections(layout)
      .filter((s) => s.group.name == name)
      .map((s) => tab(layout, s));

  it('x/4 in 1/16 notes: the 4/4 figures beat by beat, without Simplify', () => {
    const threeFour = getPermutationLayout(16, 3, 4);
    expect(threeFour.slots).toBe(24);
    expect(threeFour.simplifyAllowed).toBe(false);
    expect(groupIds(threeFour)).toEqual(groupIds(getPermutationLayout(16)));
    expect(tabsOf(threeFour, 'Singles')[0]).toBe('o---o---o---'); // 1, 2 and 3
    expect(getPermutationLayout(32, 7, 4).slots).toBe(56);
  });

  it('x/4 in 1/8 notes only with an even number of beats (the figures last two beats)', () => {
    expect(getPermutationLayout(8, 3, 4)).toBeNull();
    expect(getPermutationLayout(8, 6, 4).slots).toBe(48);
    expect(tabsOf(getPermutationLayout(8, 2, 4), 'Singles')).toEqual([
      'o---',
      '-o--',
      '--o-',
      '---o',
    ]);
  });

  it('x/4 triplets: cross-rhythms only where they repeat evenly in the bar', () => {
    expect(groupIds(getPermutationLayout(12, 3, 4))).toEqual(['Ostinato', 'Singles', 'Doubles']); // 9 notes
    const sixteenths = groupIds(getPermutationLayout(24, 5, 4)); // 30 notes
    expect(sixteenths).toContain('Every2nd');
    expect(sixteenths).not.toContain('Every4th');
    expect(groupIds(getPermutationLayout(12, 2, 4))).toContain('Every2nd'); // 6 notes
    expect(getPermutationLayout(24, 3, 4).groupsInOlderLinks).toBeUndefined();
  });

  it('compound x/8: the triplet figures over dotted-quarter beats', () => {
    const sixEight = getPermutationLayout(8, 6, 8); // 3 eighths a beat
    expect(sixEight.slots).toBe(24);
    expect(tabsOf(sixEight, 'Singles')).toEqual(['o--o--', '-o--o-', '--o--o']);
    expect(sixEight.groups[1].subLabels).toEqual(['1', '2', '3']); // as x/8 eighths are counted
    expect(groupIds(sixEight)).toEqual(['Ostinato', 'Singles', 'Doubles', 'Every2nd']);
    expect(groupIds(getPermutationLayout(8, 9, 8))).toEqual(['Ostinato', 'Singles', 'Doubles']);

    const twelveEight = getPermutationLayout(16, 12, 8); // 6 sixteenths a beat
    expect(twelveEight.slots).toBe(48);
    expect(groupIds(twelveEight)).toEqual(groupIds(getPermutationLayout(24))); // as 1/16 triplets in 4/4
    expect(tabsOf(twelveEight, 'Singles (per beat)')[1]).toBe('-o----'.repeat(4)); // on the 2nd 16th of each beat
    expect(
      getPermutationSections(twelveEight).find((s) => s.group.name == 'Singles (twice a beat)')
        .label
    ).toBe('1st');
    expect(getPermutationLayout(16, 3, 8).slots).toBe(12);
  });

  it('has no figures for uneven x/8 beats, x/16, triplets in x/8, or Mixed outside 4/4', () => {
    expect(getPermutationLayout(16, 7, 8)).toBeNull();
    expect(getPermutationLayout(8, 5, 8)).toBeNull();
    expect(getPermutationLayout(12, 6, 8)).toBeNull();
    expect(getPermutationLayout(32, 6, 8)).toBeNull();
    expect(getPermutationLayout(16, 4, 16)).toBeNull();
    expect(getPermutationLayout(48, 3, 4)).toBeNull();
    expect(getPermutationLayout(48, 4, 4).slots).toBe(48); // 4/4: every note setting
  });
});

describe('1/16 triplets: per-beat figures on all 6 notes of the beat', () => {
  const layout = getPermutationLayout(24);
  const groups = layout.groups.map((g) => g.name);

  it('has the figures over a whole beat (unticked, a hit more at a time), then those inside it', () => {
    expect(groups).toEqual([
      'Ostinato',
      'Singles (per beat)',
      'Single, gap, single (per beat)',
      'Doubles (per beat)',
      'Double, gap, single (per beat)',
      'Double, 2 gaps, single (per beat)',
      'Triples (per beat)',
      'Triple, gap, single (per beat)',
      'Quads (per beat)',
      'Fives (per beat)',
      'All six (per beat)',
      'Singles (twice a beat)',
      'Doubles (twice a beat)',
      'Cross-rhythm: every 2nd note',
      'Cross-rhythm: every 4th note',
    ]);
    const perBeat = layout.groups.filter((g) => g.name.includes('per beat'));
    expect(perBeat.every((g) => g.defaultOn === false)).toBe(true);
    // so the run with the menu's own ticks plays as before
    expect(layout.groups.filter((g) => g.defaultOn).map((g) => g.id)).toEqual([
      'PermuationOptionsSingles',
      'PermuationOptionsDoubles',
      'PermuationOptionsEvery2nd',
      'PermuationOptionsEvery4th',
    ]);
    expect(perBeat.filter((g) => g.subLabels.length != 6).map((g) => g.name)).toEqual([
      'All six (per beat)',
    ]);
  });

  it('has every rhythm of a beat of 6 notes once, in some figure', () => {
    // the figures that repeat each beat, as one beat ("o-oo--")
    const beats = figures(24)
      .map((x) => x.tab.slice(0, 6))
      .filter((beat, i) => figures(24)[i].tab == beat.repeat(4));
    expect(beats.length).toBe(64); // 2^6
    expect(new Set(beats).size).toBe(64);
  });

  it('spells out the new figures', () => {
    const byName = Object.fromEntries(figures(24).map((x) => [x.name, x.tab]));
    expect(byName['Single, gap, single (per beat) 1']).toBe('o-o---'.repeat(4));
    expect(byName['Double, gap, single (per beat) 1']).toBe('oo-o--'.repeat(4));
    expect(byName['Double, 2 gaps, single (per beat) 1']).toBe('oo--o-'.repeat(4));
    expect(byName['Double, 2 gaps, single (per beat) 5']).toBe('--o-oo'.repeat(4)); // single, gap, double
    expect(byName['Triple, gap, single (per beat) 1']).toBe('ooo-o-'.repeat(4));
    expect(byName['Quads (per beat) 3']).toBe('--oooo'.repeat(4));
    expect(byName['Fives (per beat) 2']).toBe('-ooooo'.repeat(4));
    expect(byName['All six (per beat)']).toBe('oooooo'.repeat(4));
  });

  it('covers the off-beats between the 8th-triplet notes', () => {
    const byName = Object.fromEntries(figures(24).map((x) => [x.name, x.tab]));
    expect(byName['Singles (per beat) 1']).toBe('o-----o-----o-----o-----');
    expect(byName['Singles (per beat) 2']).toBe('-o-----o-----o-----o----'); // an off-beat
    expect(byName['Doubles (per beat) 6']).toBe('o----oo----oo----oo----o'); // wraps into the next beat
    expect(byName['Triples (per beat) 4']).toBe('---ooo---ooo---ooo---ooo');
  });
});

describe('1/32 notes: the 1/16 figures over an 8th note, plus per-beat figures', () => {
  const layout = getPermutationLayout(32);

  it('has the 1/16 groups (each lasting an 8th note) then per-beat groups on 8 notes', () => {
    expect(layout.groups.map((g) => g.name)).toEqual([
      'Ostinato',
      'Singles',
      '16ths / Off-beat 32nds',
      'Doubles',
      'Triples',
      'Quads',
      'Singles (per beat)',
      'Doubles (per beat)',
      'Triples (per beat)',
    ]);
    const perBeat = layout.groups.filter((g) => g.name.includes('per beat'));
    expect(perBeat.every((g) => !g.defaultOn && g.subLabels.length === 8)).toBe(true);
  });

  it('covers the 32nd notes between the 16ths', () => {
    const byName = Object.fromEntries(figures(32).map((x) => [x.name, x.tab]));
    expect(byName['Singles 1st']).toBe('o---o---o---o---o---o---o---o---'); // every 8th note
    expect(byName['Singles 2nd']).toBe('-o---o---o---o---o---o---o---o--'); // a 32nd later
    expect(byName['16ths / Off-beat 32nds off 32nds']).toBe('-o-o-o-o-o-o-o-o-o-o-o-o-o-o-o-o');
    expect(byName['Singles (per beat) 8']).toBe('-------o-------o-------o-------o');
    expect(byName['Triples (per beat) 7']).toBe('o-----ooo-----ooo-----ooo-----oo');
  });
});

describe('1/32 notes: every rhythm of a beat in chapters, built on the 16th alphabet', () => {
  const chapters = thirtySecondChapters();
  const counts = (chapter) => chapter.rhythms.map((r) => r.count);
  // a beat's 16ths, each played as a 16th (S), a pair (P), the off-beat 32nd (O) or not (-)
  const ways = (beat) =>
    [0, 2, 4, 6]
      .map((i) => ({ 'x-': 'S', xx: 'P', '-x': 'O', '--': '-' })[beat.slice(i, i + 2)])
      .join('');

  it('has every rhythm of a beat of 32nds, the silent beat aside, a few in two chapters', () => {
    const beats = chapters.flatMap((c) => c.rhythms.map((r) => r.beat));
    expect(new Set(beats).size).toBe(255);
    expect(beats).not.toContain('--------');
    expect(beats).toHaveLength(255 + 16); // chapter 1's 15 again later, all 32nds twice
    expect(chapters.map((c) => c.rhythms.length)).toEqual([
      15, 15, 15, 12, 24, 15, 15, 12, 24, 14, 12, 24, 14, 24, 36,
    ]);
  });

  it('starts with the alphabet over half a beat: the 1/32 groups, in their order', () => {
    const layout = getPermutationLayout(32);
    const groups = getPermutationSections(layout).filter(
      (s) => s.groupIndex > 0 && !s.group.name.includes('per beat')
    );
    expect(chapters[0].name).toBe('Chapter 1: the alphabet over half a beat');
    expect(chapters[0].rhythms.map((r) => r.beat)).toEqual(
      groups.map((s) => tab(layout, s).slice(0, 8).replace(/o/g, 'x'))
    );
    expect(counts(chapters[0]).slice(0, 6)).toEqual([
      '1 &',
      '(1) a (&) a',
      '(1) li (&) la',
      '(1) bi (&) ba',
      '1 li & la',
      '(1) a bi (&) a ba',
    ]);
    expect(chapters[0].parts.map((p) => p.name)).toEqual([
      'Singles',
      '16ths / off-beat 32nds',
      'Doubles',
      'Triples',
      'Quads',
    ]);
  });

  it('then the 16th alphabet over the beat, every 16th played as two 32nds', () => {
    expect(chapters[1].name).toBe('Chapter 2: the alphabet as pairs');
    expect(counts(chapters[1])).toEqual([
      '1 a',
      '(1) li bi',
      '(1) & a',
      '(1) (&) la ba',
      '1 a & a',
      '(1) li bi (&) la ba',
      '1 a li bi',
      '(1) li bi & a',
      '(1) & a la ba',
      '1 a (&) la ba',
      '1 a li bi & a',
      '(1) li bi & a la ba',
      '1 a & a la ba',
      '1 a li bi (&) la ba',
      '1 a li bi & a la ba',
    ]);
    expect(chapters[1].rhythms.every((r) => /^[P-]+$/.test(ways(r.beat)))).toBe(true);
  });

  it('then fill-ins: all four 16ths, the alphabet picking which are pairs', () => {
    expect(chapters[2].name).toBe('Chapter 3: the alphabet as pairs, the 16ths filled in');
    expect(counts(chapters[2]).slice(0, 5)).toEqual([
      '1 a li & la',
      '1 li bi & la',
      '1 li & a la',
      '1 li & la ba',
      '1 a li & a la',
    ]);
    expect(chapters[2].rhythms.every((r) => /^[SP]{4}$/.test(ways(r.beat)))).toBe(true);
  });

  it('plays each 16th of a figure as a 16th, a pair or the off-beat 32nd, a mix a chapter', () => {
    const mixOf = (chapter) => [
      ...new Set(chapter.rhythms.map((r) => ways(r.beat).replace(/-/g, ''))),
    ];
    const uses = (chapter) =>
      [
        ...new Set(
          chapter.rhythms.flatMap((r) =>
            [...new Set(ways(r.beat).replace(/-/g, ''))].sort().join('')
          )
        ),
      ].sort();
    expect(chapters.slice(3).map((c) => c.name.replace(/^Chapter \d+: /, ''))).toEqual([
      'fill-ins on 8ths and Doubles',
      'fill-ins on Triples',
      'the alphabet as 16ths',
      'the alphabet on the off-beat 32nds',
      '16ths and off-beat 32nds: 8ths and Doubles',
      '16ths and off-beat 32nds: Triples',
      '16ths and off-beat 32nds: Quads',
      'pairs and off-beat 32nds: 8ths and Doubles',
      'pairs and off-beat 32nds: Triples',
      'pairs and off-beat 32nds: Quads',
      '16ths, pairs and off-beat 32nds: Triples',
      '16ths, pairs and off-beat 32nds: Quads',
    ]);
    expect(uses(chapters[3])).toEqual(['PS']);
    expect(uses(chapters[5])).toEqual(['S']);
    expect(uses(chapters[6])).toEqual(['O']);
    expect(uses(chapters[8])).toEqual(['OS']);
    expect(uses(chapters[11])).toEqual(['OP']);
    expect(uses(chapters[14])).toEqual(['OPS']);
    expect(mixOf(chapters[13]).every((m) => m.length == 3)).toBe(true);
    expect(counts(chapters[4]).slice(0, 4)).toEqual([
      '1 a li &',
      '1 li bi &',
      '1 li & a',
      '1 a li bi &',
    ]);
  });

  it('plays a chapter rhythm every beat of the bar, in any x/4, and only for 1/32 notes', () => {
    const layout = getPermutationLayout(32, 3, 4);
    const sections = getChapterSections(layout, 3, [1, 5]);
    expect(sections.map((s) => s.label)).toEqual(['1 a li & la', '1 a li & a la']);
    expect(tab(layout, sections[0])).toBe('ooo-o-o-'.repeat(3));
    expect(sections[0].group.name).toBe('Chapter 3: the alphabet as pairs, the 16ths filled in');
    expect(getChapterSections(layout, 3)).toHaveLength(15);
    expect(getChapterSections(layout, 3, [])).toHaveLength(0);
    expect(getChapterSections(layout, 'all')).toHaveLength(271);
    expect(getPermutationLayout(16).chapters).toBeUndefined();
    expect(getPermutationLayout(24).chapters).toBeUndefined();
  });

  it('says a beat as its count does, a silent 1 and & in brackets', () => {
    expect(thirtySecondCount('xxxxxxxx')).toBe('1 a li bi & a la ba');
    expect(thirtySecondCount('----x-xx')).toBe('(1) & la ba');
    expect(thirtySecondCount('x-----xx')).toBe('1 (&) la ba');
    expect(thirtySecondCount('-x------')).toBe('(1) a');
    expect(thirtySecondCount('-----x--')).toBe('(1) (&) a');
  });
});

describe('alternating kick and snare', () => {
  const sections = getPermutationSections(getPermutationLayout(16));
  const pattern = (group, sub, kickLead) => {
    const section = sections.find((s) => s.group.name == group && s.sub == sub);
    const bar = getPermutationAlternatingBar(section, kickLead);
    return section.figure.hits
      .map((_, i) => (bar.kick[i] ? 'K' : bar.snare[i] ? 'S' : '-'))
      .filter((_, i) => i % 2 === 0)
      .join('');
  };

  it('kick lead: singles go kick, snare, kick, snare across the beats', () => {
    expect(pattern('Singles', 1, true)).toBe('K---S---K---S---');
    expect(pattern('Singles', 2, true)).toBe('-K---S---K---S--'); // on the e
  });

  it('kick lead: 8th notes and off-beat 16ths alternate kick and snare', () => {
    expect(pattern('8th notes / Off-beat 16ths', 1, true)).toBe('K-S-K-S-K-S-K-S-');
    expect(pattern('8th notes / Off-beat 16ths', 2, true)).toBe('-K-S-K-S-K-S-K-S');
  });

  it('kick lead: each double is kick then snare', () => {
    expect(pattern('Doubles', 1, true)).toBe('KS--KS--KS--KS--');
  });

  it('snare lead is the opposite throughout', () => {
    expect(pattern('Singles', 1, false)).toBe('S---K---S---K---');
    expect(pattern('Doubles', 1, false)).toBe('SK--SK--SK--SK--');
  });
});

// Infinity Drumming, 2026: practising some bars of a run
describe('bar lists ("Practise bars")', () => {
  it('reads single bars, ranges and lists, within the run', () => {
    expect(parseBarList('5', 16)).toEqual([5]);
    expect(parseBarList('3-6', 16)).toEqual([3, 4, 5, 6]);
    expect(parseBarList(' 2, 5 , 9-10 ', 16)).toEqual([2, 5, 9, 10]);
    expect(parseBarList('6-3', 16)).toEqual([3, 4, 5, 6]); // backwards is fine
    expect(parseBarList('14-20, 2, 2', 16)).toEqual([2, 14, 15, 16]); // past the end: up to it
    expect(parseBarList('', 16)).toEqual([]); // all bars
    expect(parseBarList('abc, 0, 99', 16)).toEqual([]);
    expect(parseBarList('1 2 5', 16)).toEqual([1, 2, 5]); // spaces part them too
    expect(parseBarList('1 to 3; 7\u20138', 16)).toEqual([1, 2, 3, 7, 8]);
    expect(parseBarList('3 - 4', 16)).toEqual([3, 4]);
  });

  it('writes them back tidily', () => {
    expect(barListToText([3, 4, 5, 6, 9])).toBe('3-6, 9');
    expect(barListToText([2, 5, 9, 10], ',')).toBe('2,5,9-10');
    expect(barListToText([])).toBe('');
  });
});

// Infinity Drumming, 2026: the bars to practise in an order of their own
describe('an order of bars', () => {
  const order = (text, count = 12) =>
    parseBarOrder(text, count).map((e) => e.bar + (e.times ? 'x' + e.times : ''));

  it('reads bars in the order typed, with how many times each', () => {
    expect(order('1 2 1 3')).toEqual(['1', '2', '1', '3']);
    expect(order('1x4 2x2 1x4 3')).toEqual(['1x4', '2x2', '1x4', '3']);
    expect(order('1-4x2')).toEqual(['1x2', '2x2', '3x2', '4x2']); // each of them twice
    expect(order('1-4 1-4 7')).toEqual(['1', '2', '3', '4', '1', '2', '3', '4', '7']);
    expect(order('6-3')).toEqual(['6', '5', '4', '3']);
    expect(order('3 - 5 x 2, 1×4, 2*2')).toEqual(['3x2', '4x2', '5x2', '1x4', '2x2']);
    expect(order('1x40 13 2', 12)).toEqual(['1x16', '2']); // (16 times at most; bars past the run left out)
  });

  it('knows a plain list of bars, which plays as practised bars always have', () => {
    expect(isPlainOrder(parseBarOrder('3-6, 9', 12))).toBe(true);
    expect(isPlainOrder(parseBarOrder('', 12))).toBe(true);
    expect(isPlainOrder(parseBarOrder('2 1', 12))).toBe(false);
    expect(isPlainOrder(parseBarOrder('1 1', 12))).toBe(false);
    expect(isPlainOrder(parseBarOrder('1x2', 12))).toBe(false);
  });

  it('writes an order back tidily, three or more bars in a row as a range', () => {
    const text = (t) => barOrderToText(parseBarOrder(t, 12));
    expect(text('1 2 1 3')).toBe('1 2 1 3');
    expect(text('1x4,2x2 , 1x4 3')).toBe('1x4 2x2 1x4 3');
    expect(text('1-3x2 4x2')).toBe('1-4x2');
    expect(text('1-4 1-4 7')).toBe('1-4 1-4 7');
  });
});

// Infinity Drumming, 2026: figures in 8ths or 16ths over a groove on the Mixed grid
// (its trade bars with notes of their own beat by beat)
describe('a figure on a grid of another size', () => {
  it('keeps each note at its time in the bar', () => {
    const sixteenths = new Array(32).fill(false); // (a 4/4 bar, 32 slots)
    sixteenths[0] = 'K';
    sixteenths[2] = 'K'; // the "e"
    sixteenths[30] = 'K'; // the last "a"
    const mixed = notesInBarOfSize(sixteenths, 48);
    expect(mixed).toHaveLength(48);
    expect(mixed.map((note, i) => (note ? i : -1)).filter((i) => i >= 0)).toEqual([0, 3, 45]);
    expect(notesInBarOfSize(mixed, 32)).toEqual(sixteenths);
  });

  it('leaves a bar of the same size as it is, and notes off the grid out', () => {
    const bar = ['K', false, false, false];
    expect(notesInBarOfSize(bar, 4)).toBe(bar);
    expect(notesInBarOfSize(['K', 'K', false], 2)).toEqual(['K', false]); // (the second: no slot)
  });
});
