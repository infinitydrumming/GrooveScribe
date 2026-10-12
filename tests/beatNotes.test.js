import { describe, it, expect } from 'vitest';
import {
  hasBeatNotes,
  beatSlots,
  beatChoices,
  beatCharForDivision,
  normalizeBeats,
  beatGroups,
  groupAt,
  slotIsUsed,
  inferBeats,
  divisionForBeats,
  beatsToList,
  beatsFromList,
  makeBeatPlan,
} from '../js/beatNotes.js';

// Infinity Drumming, 2026: notes beat by beat in the Mixed note setting
// ("Beats=ssqq": two beats of 16ths, then quarter-note triplets).

const sig = (top, bottom) => ({ top, bottom });
const FOUR = sig(4, 4);

describe('beat choices', () => {
  it('are for x/4 and x/8 bars, a beat being 12 or 6 grid slots', () => {
    expect([hasBeatNotes(FOUR), hasBeatNotes(sig(7, 8)), hasBeatNotes(sig(7, 16))]).toEqual([
      true,
      true,
      false,
    ]);
    expect(beatSlots(FOUR)).toBe(12);
    expect(beatSlots(sig(7, 8))).toBe(6);
    expect(beatChoices(FOUR).map((choice) => choice.char)).toEqual(['e', 's', 't', 'x', 'q', 'a']);
    expect(beatChoices(sig(6, 8)).map((choice) => choice.char)).toEqual(['e', 's', 'x', 't', 'a']);
  });

  it('match the plain note settings', () => {
    expect(beatCharForDivision(16, FOUR)).toBe('s');
    expect(beatCharForDivision(12, FOUR)).toBe('t');
    expect(beatCharForDivision(24, sig(7, 8))).toBe('x');
    expect(beatCharForDivision(48, FOUR)).toBe('a');
    expect(beatCharForDivision(32, FOUR)).toBeNull(); // no 32nd notes beat by beat
    // 8th-note triplets in x/8 cover two beats: 6/8 has whole pairs, 7/8 doesn't
    expect(beatCharForDivision(12, sig(6, 8))).toBe('t');
    expect(beatCharForDivision(12, sig(7, 8))).toBeNull();
  });
});

describe('a bar of beats', () => {
  it('is made whole: a triplet over two beats needs both, anything unknown is 16ths', () => {
    expect(normalizeBeats('ssqq', FOUR)).toBe('ssqq');
    expect(normalizeBeats('qsqq', FOUR)).toBe('ssqq');
    expect(normalizeBeats('sssq', FOUR)).toBe('ssss');
    expect(normalizeBeats('', FOUR)).toBe('ssss');
    expect(normalizeBeats('zeq', FOUR, 'e')).toBe('eeee');
    expect(normalizeBeats('ttexs', sig(5, 8))).toBe('ttexs');
    expect(normalizeBeats('q', sig(2, 8))).toBe('ss'); // no quarter-note triplets in x/8
  });

  it('is laid out in groups across the grid', () => {
    expect(beatGroups('ssqq', FOUR)).toEqual([
      { beat: 0, beats: 1, char: 's', start: 0, span: 12, step: 3 },
      { beat: 1, beats: 1, char: 's', start: 12, span: 12, step: 3 },
      { beat: 2, beats: 2, char: 'q', start: 24, span: 24, step: 8 },
    ]);
    const groups = beatGroups('tteeee', sig(6, 8));
    expect(groups[0]).toEqual({ beat: 0, beats: 2, char: 't', start: 0, span: 12, step: 4 });
    expect(groupAt(groups, 13)).toBe(groups[1]);
  });

  it('uses only its own notes of the grid', () => {
    const groups = beatGroups('etxqq', sig(5, 4));
    const used = [];
    for (let slot = 0; slot < 60; slot++) if (slotIsUsed(groups, slot)) used.push(slot);
    expect(used).toEqual([0, 6, 12, 16, 20, 24, 26, 28, 30, 32, 34, 36, 44, 52]);
  });

  it('is guessed from the notes when a link does not say: the plainest that fits', () => {
    const line = new Array(48).fill(false);
    [0, 3, 6, 9, 12, 16, 20, 36, 42].forEach((slot) => (line[slot] = 'x'));
    // beat 3 is empty, so it is like the beat before
    expect(inferBeats([line], 0, FOUR)).toBe('stte');
  });
});

describe('a groove of beats', () => {
  it('goes back to a plain note setting when every beat is the same plain one', () => {
    expect(divisionForBeats(['ssss', 'ssss'], [FOUR, FOUR])).toBe(16);
    expect(divisionForBeats(['tttt'], [FOUR])).toBe(12);
    expect(divisionForBeats(['eeeeeee'], [sig(7, 8)])).toBe(8);
    expect(divisionForBeats(['ssqq'], [FOUR])).toBe(48);
    expect(divisionForBeats(['aaaa'], [FOUR])).toBe(48);
  });

  it('travels in links as one group a bar', () => {
    expect(beatsToList(['ssqq', 'ssss'])).toBe('ssqq,ssss');
    expect(beatsFromList('ssqq%2Cssss', 3)).toEqual(['ssqq', 'ssss', '']);
    expect(beatsFromList(false, 2)).toEqual(['', '']);
  });

  it("tells the music writers each note's length, the long triplets, counts and straight beats", () => {
    const plan = makeBeatPlan(['ssqq', 'etxs'], [FOUR, FOUR]);
    expect(plan.slotsPerNoteAt(3, 0)).toBe(3);
    expect(plan.slotsPerNoteAt(32, 0)).toBe(8);
    expect(plan.slotsPerNoteAt(16, 1)).toBe(4);
    expect(plan.longTripletAt(24, 0)).toMatchObject({ char: 'q', span: 24 });
    expect(plan.longTripletAt(32, 0)).toBeNull();
    expect(plan.longTripletAt(12, 1)).toBeNull(); // 8th triplets in x/4 are one beat
    expect([0, 3, 6, 9, 24, 32, 40].map((slot) => plan.countAt(slot, 0))).toEqual([
      '1',
      'e',
      '&',
      'a',
      '3',
      'a',
      '&',
    ]);
    expect([24, 26, 28, 30, 32, 34].map((slot) => plan.countAt(slot, 1)).join(' ')).toBe(
      '3 & a 3 & a'
    );
    expect(plan.countAt(1, 0)).toBeNull();
    expect([0, 12, 24, 36].map((slot) => plan.straightStepAt(slot, 1))).toEqual([6, 0, 0, 3]);
  });
});
