import { describe, it, expect } from 'vitest';
import { createRestNotes, restAt } from '../js/restCursor.js';

// Infinity Drumming, 2026: the playback cursor through rests.

// abc2svg's model: symbols in time order, linked by ts_next
const model = (symbols) => {
  symbols.forEach((s, i) => (s.ts_next = symbols[i + 1] || null));
  return symbols[0];
};
const NOTE = 8;
const REST = 10;

describe('the rests drawn', () => {
  it('notes each drawn rest with the note before it and its time from the model', () => {
    const notes = createRestNotes();
    // a quarter note, a quarter rest (and a stickings spacer), a quarter note, a quarter rest
    notes.take(
      model([
        { type: NOTE, istart: 10, time: 0, dur: 384 },
        { type: REST, istart: 99, time: 0, dur: 1536, invisible: true },
        { type: REST, istart: 20, time: 384, dur: 384 },
        { type: NOTE, istart: 30, time: 768, dur: 384 },
        { type: REST, istart: 40, time: 1152, dur: 384 },
      ])
    );
    notes.rest(-1, 99, 13); // (drawn first: the stickings voice)
    notes.note(0, 10);
    notes.rest(0, 20, 13);
    notes.note(1, 30);
    notes.rest(1, 40, 11);
    expect(notes.written.notes).toEqual([0, 768]);
    expect(notes.written.rests).toEqual([
      { after: 0, time: 384, dur: 384, w: 13, glyph: 0 },
      { after: 1, time: 1152, dur: 384, w: 11, glyph: 1 },
    ]);
    expect(notes.written.glyphs).toBe(2);
  });

  it("counts the legend's rests among the glyphs, but not as the music's", () => {
    const notes = createRestNotes();
    notes.take(model([{ type: REST, istart: 5, time: 0, dur: 384 }]));
    notes.rest(-3, 5, 13);
    expect(notes.written.rests).toEqual([]);
    expect(notes.written.glyphs).toBe(1);
  });

  it("carries a new block's times on from where the music so far ends", () => {
    const notes = createRestNotes();
    notes.take(model([{ type: NOTE, istart: 1, time: 0, dur: 1536 }]));
    notes.take(model([{ type: REST, istart: 2, time: 0, dur: 384 }]));
    notes.note(0, 1);
    notes.rest(0, 2, 13);
    expect(notes.written.rests[0].time).toBe(1536);
  });
});

describe('the rest the cursor is on', () => {
  // a bar of 16 grid notes: notes on 1 (slot 0) and 3 (slot 8), quarter rests on 2 and 4
  const mapping = Array.from({ length: 16 }, (_, slot) => slot == 0 || slot == 8);
  const written = {
    notes: [0, 768],
    rests: [
      { after: 0, time: 384, dur: 384, glyph: 0 },
      { after: 1, time: 1152, dur: 384, glyph: 1 },
    ],
  };

  it('is the rest written where a grid note in the gap falls', () => {
    expect(restAt(written, mapping, 4.01)?.glyph).toBe(0); // beat 2
    expect(restAt(written, mapping, 7.5)?.glyph).toBe(0);
    expect(restAt(written, mapping, 12.01)?.glyph).toBe(1); // beat 4
    expect(restAt(written, mapping, 15.9)?.glyph).toBe(1);
  });

  it('is none on a note, or while a note lasts', () => {
    expect(restAt(written, mapping, 0.01)).toBeNull();
    expect(restAt(written, mapping, 2.01)).toBeNull(); // beat 1's "e": its quarter note
    expect(restAt(written, mapping, 8.01)).toBeNull();
    expect(restAt(written, mapping, 0)).toBeNull(); // (before the music)
  });

  it('steps through the rests of a gap by their written lengths', () => {
    // a 16th note, a 16th rest, an 8th rest, then beat 2
    const gap = {
      notes: [0, 384],
      rests: [
        { after: 0, time: 96, dur: 96, glyph: 0 },
        { after: 0, time: 192, dur: 192, glyph: 1 },
      ],
    };
    const beat = [true, false, false, false, true];
    expect(restAt(gap, beat, 1.01)?.glyph).toBe(0);
    expect(restAt(gap, beat, 2.01)?.glyph).toBe(1);
    expect(restAt(gap, beat, 3.01)?.glyph).toBe(1);
  });

  it('is the rests before the first note from the music start', () => {
    const late = {
      notes: [768],
      rests: [{ after: -1, time: 0, dur: 768, glyph: 0 }],
    };
    const bar = Array.from({ length: 16 }, (_, slot) => slot == 8);
    expect(restAt(late, bar, 0.01)?.glyph).toBe(0);
    expect(restAt(late, bar, 6.01)?.glyph).toBe(0);
    expect(restAt(late, bar, 8.01)).toBeNull();
  });

  it('is none where no rest is written in the gap', () => {
    expect(restAt({ notes: [0, 768], rests: [] }, mapping, 4.01)).toBeNull();
  });
});
