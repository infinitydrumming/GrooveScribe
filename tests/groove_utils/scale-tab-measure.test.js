import { describe, it, expect } from 'vitest';
import { scaleTabMeasure, GetDefaultTom2Groove } from '../../js/noteArrays.js';

// scaleTabMeasure fits one copied measure into a measure of another size
// (used by copy / paste measure).
describe('noteArrays.scaleTabMeasure', () => {
  it('copies a measure of the same size unchanged', () => {
    expect(scaleTabMeasure('o-x-O---o-x-X---', 16)).toBe('o-x-O---o-x-X---');
  });

  it('thins 16ths down to 8ths (every 2nd note)', () => {
    expect(scaleTabMeasure('o-x-o-X-o-x-o-X-', 8)).toBe('oxoXoxoX');
  });

  it('spreads 8ths out to 16ths', () => {
    expect(scaleTabMeasure('oxoXoxoX', 16)).toBe('o-x-o-X-o-x-o-X-');
  });

  it('pads a shorter measure with rests (3/4 into 4/4)', () => {
    expect(scaleTabMeasure('o---o---o---', 16)).toBe('o---o---o-------');
  });

  it('cuts a longer measure (4/4 into 3/4)', () => {
    expect(scaleTabMeasure('o---o---o---o---', 12)).toBe('o---o---o---');
  });
});

describe('noteArrays.GetDefaultTom2Groove', () => {
  it('is all rests, like the other toms', () => {
    expect(GetDefaultTom2Groove(16, 4, 4, 2)).toBe('|----------------|----------------|');
  });
});
