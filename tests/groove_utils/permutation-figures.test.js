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
