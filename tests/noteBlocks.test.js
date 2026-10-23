import { describe, it, expect } from 'vitest';
import { copyBlock, pasteBlock, blockInDivision } from '../js/noteBlocks.js';

// Infinity Drumming, 2026: copy and paste a block of notes chosen with a box.

// two bars of 8 slots each
const groove = () => ({
  HH: 'x-x-x-x-' + '--------',
  Snare: '--O---O-' + '--------',
  Kick: 'o---X--x' + '--------',
  OrnH: '--------' + '--------',
  OrnS: '--f-----' + '--------', // a flam on the first snare
  OrnSd: '------d-' + '--------', // a diddle on the second
});
const cells = (row, from, to) =>
  Array.from({ length: to - from + 1 }, (_, i) => ({ row, index: from + i }));

describe('a block of notes', () => {
  it('copies the rows chosen, their flams and diddles, from its first note', () => {
    const block = copyBlock(groove(), cells('snare', 2, 6));
    expect(block.span).toBe(5); // slots
    expect(block.cells[0]).toEqual({
      row: 'snare',
      offset: 0,
      chars: { Snare: 'O', OrnS: 'f', OrnSd: '-' },
    });
    expect(block.cells[4].chars).toEqual({ Snare: 'O', OrnS: '-', OrnSd: 'd' });
  });

  it('pastes it where it starts, replacing those rows only (rests too)', () => {
    const lines = groove();
    const block = copyBlock(lines, [...cells('hh', 0, 3), ...cells('snare', 0, 3)]);
    const written = pasteBlock(lines, block, 10);
    expect(written).toHaveLength(8);
    expect(lines.HH).toBe('x-x-x-x-' + '--x-x---');
    expect(lines.Snare).toBe('--O---O-' + '----O---');
    expect(lines.OrnS).toBe('--f-----' + '----f---'); // its flam came too
    expect(lines.Kick).toBe('o---X--x' + '--------'); // not in the block
  });

  it('keeps the kick and the hi-hat foot apart, though they share a line', () => {
    const lines = groove();
    // just the foot of slots 4-7 ("X" at 4 is kick and foot, "x" at 7 the foot)
    const foot = copyBlock(lines, cells('hhfoot', 4, 7));
    pasteBlock(lines, foot, 0);
    expect(lines.Kick.slice(0, 8)).toBe('X--x' + 'X--x'); // the kick on 1 kept, the foot added
    // just the kick of slots 1-4 (none, none, none, a kick) over slots 4-7
    const kicks = copyBlock(groove(), cells('kick', 1, 4));
    const other = groove();
    pasteBlock(other, kicks, 4);
    expect(other.Kick.slice(0, 8)).toBe('o---' + 'x--X'); // the feet stay, the kicks move
  });

  it('keeps the shape of a block across bars, and leaves out what has no room', () => {
    const lines = groove();
    const block = copyBlock(lines, [
      { row: 'hh', index: 6 },
      { row: 'hh', index: 9 },
    ]);
    expect(block.cells.map((c) => c.offset)).toEqual([0, 3]);
    pasteBlock(lines, block, 13); // the second note would be past the end
    expect(lines.HH).toBe('x-x-x-x-' + '-----x--');
    const shut = groove();
    expect(pasteBlock(shut, block, 0, (slot) => slot != 3)).toEqual([{ row: 'hh', index: 0 }]);
  });
});

describe('a block in another note setting', () => {
  const block = {
    cells: [
      { row: 'snare', offset: 0, chars: { Snare: 'O' } },
      { row: 'snare', offset: 1, chars: { Snare: 'o' } },
      { row: 'snare', offset: 2, chars: { Snare: 'o' } },
    ],
    span: 3,
  };
  it('keeps its notes in time where the grids line up', () => {
    expect(blockInDivision(block, 16, 16)).toBe(block);
    expect(blockInDivision(block, 16, 32).cells.map((c) => c.offset)).toEqual([0, 2, 4]);
    expect(blockInDivision(block, 16, 48).cells.map((c) => c.offset)).toEqual([0, 3, 6]);
    // 16ths into 8ths: the "e" has no place, the "&" does
    expect(blockInDivision(block, 16, 8).cells.map((c) => c.offset)).toEqual([0, 1]);
  });
  it("can't go between triplets and straight notes", () => {
    expect(blockInDivision(block, 16, 12)).toBeNull();
  });
});
