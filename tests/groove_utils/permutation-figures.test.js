import { describe, it, expect } from 'vitest';
import {
  getPermutationLayout,
  getPermutationSections,
  getPermutationSectionABC,
  getPermutationKickArray,
  getPermutationSnareArray,
  getPermutationAlternatingBar,
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
    expect(byName['Singles 1']).toBe('o--o--o--o--o--o--o--o--');
    expect(byName['Doubles &']).toBe('-oo-oo-oo-oo-oo-oo-oo-oo');
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
});

describe('1/16 triplets: per-beat figures on all 6 notes of the beat', () => {
  const layout = getPermutationLayout(24);
  const groups = layout.groups.map((g) => g.name);

  it('adds Singles / Doubles / Triples (per beat), unticked, before the cross-rhythms', () => {
    expect(groups).toEqual([
      'Ostinato',
      'Singles',
      'Doubles',
      'Singles (per beat)',
      'Doubles (per beat)',
      'Triples (per beat)',
      'Cross-rhythm: every 2nd note',
      'Cross-rhythm: every 4th note',
    ]);
    const perBeat = layout.groups.filter((g) => g.name.includes('per beat'));
    expect(perBeat.every((g) => g.defaultOn === false && g.subLabels.length === 6)).toBe(true);
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
