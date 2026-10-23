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
  gridOfBeats,
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
    expect(beatChoices(FOUR).map((choice) => choice.char)).toEqual([
      'e',
      's',
      'd',
      't',
      'x',
      'q',
      'a',
    ]);
    expect(beatChoices(sig(6, 8)).map((choice) => choice.char)).toEqual([
      'e',
      's',
      'd',
      'x',
      't',
      'a',
    ]);
    // the 32nds grid: 8 slots a quarter note, 4 an 8th note
    expect(beatSlots(FOUR, 32)).toBe(8);
    expect(beatSlots(sig(7, 8), 32)).toBe(4);
  });

  it('match the plain note settings', () => {
    expect(beatCharForDivision(16, FOUR)).toBe('s');
    expect(beatCharForDivision(12, FOUR)).toBe('t');
    expect(beatCharForDivision(24, sig(7, 8))).toBe('x');
    expect(beatCharForDivision(48, FOUR)).toBe('a');
    expect(beatCharForDivision(32, FOUR)).toBe('d'); // 32nd notes, on the 32nds grid
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
      '3 a li & a la'
    );
    expect(plan.countAt(1, 0)).toBeNull();
    expect([0, 12, 24, 36].map((slot) => plan.straightStepAt(slot, 1))).toEqual([6, 0, 0, 3]);
  });
});

describe('32nd notes, on the 32nds grid', () => {
  it('need their own grid: they share it with 8ths and 16ths, never with triplets', () => {
    expect(gridOfBeats('sssd')).toBe(32);
    expect(gridOfBeats('ssst')).toBe(48);
    expect(gridOfBeats('eess')).toBe(0); // either grid
    expect(gridOfBeats('sdst')).toBe(-1);
    expect(normalizeBeats('sssd', FOUR, 's', 32)).toBe('sssd');
    expect(normalizeBeats('sssd', FOUR)).toBe('ssss'); // not on the Mixed grid
    expect(normalizeBeats('ssst', FOUR, 's', 32)).toBe('ssss');
  });

  it('use every slot of their beat; 16ths every other one, 8ths every fourth', () => {
    const groups = beatGroups('esdd', FOUR, 32);
    expect(groups.map((g) => [g.start, g.step])).toEqual([
      [0, 4],
      [8, 2],
      [16, 1],
      [24, 1],
    ]);
    expect([0, 2, 4, 9, 10].map((slot) => slotIsUsed(groups, slot))).toEqual([
      true,
      false,
      true,
      false,
      true,
    ]);
  });

  it('are found from the notes, and go back to the 32nds note setting when every beat has them', () => {
    const notes = Array(32).fill(false);
    [0, 4, 8, 10, 12, 14, 16, 17, 18].forEach((slot) => (notes[slot] = 'x'));
    expect(inferBeats([notes], 0, FOUR, 32)).toBe('esdd');
    expect(divisionForBeats(['dddd'], [FOUR], 32)).toBe(32);
    expect(divisionForBeats(['ssss'], [FOUR], 32)).toBe(16);
    expect(divisionForBeats(['sssd'], [FOUR], 32)).toBe(32);
    expect(beatCharForDivision(32, sig(6, 8))).toBe('d');
  });

  it('are counted "1 a li bi & a la ba" (in x/8 bars "1 e & a"), the 16ths around them "1 e & a"', () => {
    const plan = makeBeatPlan(['sssd'], [FOUR], 32);
    expect([0, 2, 4, 6, 8].map((slot) => plan.countAt(slot, 0)).join(' ')).toBe('1 e & a 2');
    expect(plan.countAt(1, 0)).toBeNull();
    expect([24, 25, 26, 27, 28, 29, 30, 31].map((slot) => plan.countAt(slot, 0)).join(' ')).toBe(
      '4 a li bi & a la ba'
    );
    expect(plan.slotsPerNoteAt(2, 0)).toBe(2);
    expect(plan.slotsPerNoteAt(25, 0)).toBe(1);
    const eight = makeBeatPlan(['ssd'], [sig(3, 8)], 32);
    expect([8, 9, 10, 11].map((slot) => eight.countAt(slot, 0)).join(' ')).toBe('3 e & a');
  });
});
