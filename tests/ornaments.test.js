import { describe, it, expect } from 'vitest';
import {
  splitGrace,
  withoutGrace,
  basePitch,
  ornamentFromToken,
  tokenWithOrnament,
  ornamentChar,
  ornamentFromChar,
  graceNotesForToken,
  clampGraceSpacing,
  clampGraceVolume,
} from '../js/ornaments.js';
import { constant_ABC_SN_Flam, constant_ABC_SN_Drag } from '../js/constants.js';

// Infinity Drumming, 2026: flams, drags and ruffs on any drum.

describe('ornaments in note tokens', () => {
  it('splits the grace notes off a note, wherever they are written', () => {
    expect(splitGrace('{/c}c')).toEqual({ grace: '{/c}', main: 'c' });
    // the old snare flam writes the accent first
    expect(splitGrace(constant_ABC_SN_Flam)).toEqual({ grace: '{/c}', main: '!accent!c' });
    expect(splitGrace('!accent!e')).toEqual({ grace: '', main: '!accent!e' });
    expect(splitGrace(false)).toEqual({ grace: '', main: false });
    expect(withoutGrace(constant_ABC_SN_Drag)).toBe('c');
  });

  it('finds the pitch a note is written on', () => {
    expect(basePitch('!accent!c')).toBe('c');
    expect(basePitch('!(.!!).!e')).toBe('e');
    expect(basePitch('!open!^g')).toBe('^g');
    expect(basePitch("^A'")).toBe("^A'");
    expect(basePitch('{/cc}!accent!A')).toBe('A');
  });

  it('reads flams, drags and ruffs, on the same drum or another', () => {
    expect(ornamentFromToken('{/c}c')).toEqual({ type: 'f', on: null });
    expect(ornamentFromToken(constant_ABC_SN_Flam)).toEqual({ type: 'f', on: null });
    expect(ornamentFromToken(constant_ABC_SN_Drag)).toEqual({ type: 'd', on: null });
    expect(ornamentFromToken('{/eee}!accent!e')).toEqual({ type: 'r', on: null });
    expect(ornamentFromToken('{/c}e')).toEqual({ type: 'f', on: 'S' });
    expect(ornamentFromToken('{/ee}c')).toEqual({ type: 'd', on: 'T1' });
    expect(ornamentFromToken("{/^A'}^A'")).toEqual({ type: 'f', on: null });
    expect(ornamentFromToken('c')).toBeNull();
  });

  it('writes ornaments onto notes, replacing any already there', () => {
    expect(tokenWithOrnament('c', { type: 'f' })).toBe('{/c}c');
    expect(tokenWithOrnament('!accent!A', { type: 'r' })).toBe('{/AAA}!accent!A');
    expect(tokenWithOrnament('!open!^g', { type: 'd' })).toBe('{/^g^g}!open!^g');
    expect(tokenWithOrnament('e', { type: 'd', on: 'S' })).toBe('{/cc}e');
    expect(tokenWithOrnament(constant_ABC_SN_Flam, null)).toBe('!accent!c');
    expect(tokenWithOrnament(constant_ABC_SN_Flam, { type: 'r' })).toBe('{/ccc}!accent!c');
    expect(tokenWithOrnament(false, { type: 'f' })).toBe(false);
  });

  it('round-trips every ornament through its link character', () => {
    for (const on of [null, 'S', 'T1', 'T2', 'T4', 'H'])
      for (const type of ['f', 'd', 'r']) {
        const ch = ornamentChar({ type, on });
        expect(ch).toHaveLength(1);
        expect(ornamentFromChar(ch)).toEqual({ type, on });
      }
    expect(ornamentChar(null)).toBe('-');
    expect(ornamentFromChar('-')).toBeNull();
  });

  it('tells the player how many grace notes, on which sound', () => {
    expect(graceNotesForToken('{/c}c')).toEqual({ count: 1, midiNote: 38 });
    expect(graceNotesForToken('{/AAA}A')).toEqual({ count: 3, midiNote: 43 });
    expect(graceNotesForToken('{/cc}e')).toEqual({ count: 2, midiNote: 38 });
    expect(graceNotesForToken("{/^A'}^A'")).toEqual({ count: 1, midiNote: 51 });
    expect(graceNotesForToken('c')).toBeNull();
  });

  it('keeps the practice settings in range', () => {
    expect(clampGraceSpacing('abc')).toBe(30);
    expect(clampGraceSpacing(5)).toBe(15);
    expect(clampGraceSpacing(500)).toBe(150);
    expect(clampGraceSpacing('60')).toBe(60);
    expect(clampGraceVolume(undefined)).toBe(40);
    expect(clampGraceVolume(0)).toBe(5);
    expect(clampGraceVolume(150)).toBe(100);
  });
});
