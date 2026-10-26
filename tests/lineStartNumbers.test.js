import { describe, it, expect } from 'vitest';
import {
  lineStartNumbers,
  numbersAtLineStarts,
  withLineStartNumbers,
} from '../js/lineStartNumbers.js';

// Infinity Drumming, 2026: a line's first bar number takes no room over its first
// note (abc2svg is given none, and it is written in after where abc2svg puts it).

// abc2svg 1.3.2's symbol types
const BAR = 0,
  CLEF = 1,
  KEY = 5,
  REST = 10,
  NOTE = 8;

// abc2svg's symbols in time order (linked as get_abcmodel has them)
function linked(symbols) {
  symbols.forEach((s, i) => (s.ts_next = symbols[i + 1] || null));
  return symbols;
}
const bar = (bar_num, eoln) => ({ type: BAR, st: 0, bar_num, eoln });
const note = (more) => ({ type: NOTE, st: 0, x: 40, wl: 5, ...more });

// two lines of music: bars 1-2, then 3-4 (eoln marks the bar ending a line)
function twoLines() {
  return linked([note(), bar(2), note(), bar(3, true), note(), bar(4), note(), bar(5, true)]);
}

describe('taking the line-start numbers out of abc2svg', () => {
  it('does nothing for music not numbering its bars', () => {
    expect(lineStartNumbers('X:1\nK:C\nabc|\n')).toBeNull();
    expect(lineStartNumbers('%%measurenb 0\nX:1\n')).toBeNull();
  });

  it('numbers the bars ending lines 0.5 (none drawn), keeping their numbers', () => {
    const symbols = twoLines();
    lineStartNumbers('%%measurenb 1\n').take(symbols[0]);
    expect(symbols.map((s) => s.bar_num).filter(Boolean)).toEqual([2, 0.5, 4, 0.5]);
    expect(symbols[3].lineEndNumber).toBe(3);
    expect(symbols[7].lineEndNumber).toBe(5);
  });

  it('leaves bars abc2svg draws no number for: not every N, or bar 1', () => {
    const symbols = linked([note(), bar(3, true), note(), bar(4, true), note(), bar(1, true)]);
    lineStartNumbers('%%measurenb 1\n%%measurenb 2\n').take(symbols[0]); // (the last one counts)
    expect(symbols.map((s) => s.bar_num).filter(Boolean)).toEqual([3, 0.5, 1]);
  });
});

describe('where abc2svg would write them', () => {
  it('starts a line with each one, over the left of its first symbol', () => {
    const symbols = twoLines();
    lineStartNumbers('%%measurenb 1\n').take(symbols[0]);
    // laid out: abc2svg marks the second line's first symbol (nl false)
    const clef = { type: CLEF };
    Object.assign(symbols[4], { nl: false, x: 36.5, wl: 12.5, prev: clef });
    expect(numbersAtLineStarts(symbols, [0])).toEqual([{ line: 1, number: 3, x: 24 }]);
  });

  it('passes over clefs and keys, and takes what comes before a symbol that is no clef', () => {
    const key = { type: KEY, st: 0, x: 30, wl: 4 };
    const symbols = linked([
      note(),
      bar(2, true),
      { type: CLEF, st: 0, nl: false },
      key,
      { type: REST, st: 1, x: 40, wl: 2 }, // (on another stave)
      note({ x: 44, wl: 6, prev: key }),
    ]);
    lineStartNumbers('%%measurenb 1\n').take(symbols[0]);
    expect(numbersAtLineStarts(symbols, [0])).toEqual([{ line: 1, number: 2, x: 26 }]);
  });

  it('has none for a line abc2svg broke itself (it numbers that one)', () => {
    const symbols = twoLines();
    lineStartNumbers('%%measurenb 1\n').take(symbols[0]);
    Object.assign(symbols[2], { nl: false, prev: { type: CLEF } }); // (in the middle of a line)
    Object.assign(symbols[4], { nl: false, prev: { type: CLEF } });
    expect(numbersAtLineStarts(symbols, [0])).toEqual([{ line: 2, number: 3, x: 35 }]);
  });
});

describe('writing them in', () => {
  const style = '<style>.f1_1 {font:italic 14px serif}</style>';
  const line = (stave, inside) =>
    '<svg>' +
    style +
    '<g transform="scale(0.75)">' +
    inside +
    '<path class="stroke" d="m0.00 ' +
    stave +
    '\nh300"/></g></svg>\n';

  it('puts each first in its stave group of texts, as abc2svg does', () => {
    const svg =
      line('113.04', '') +
      line('66.70', '<g transform="translate(0,66.70)">\n<text class="f2_1">1</text>\n</g>\n');
    expect(withLineStartNumbers(svg, [{ line: 1, number: 3, x: 24 }])).toBe(
      line('113.04', '') +
        line(
          '66.70',
          '<g transform="translate(0,66.70)">\n<text class="f1_1" x="24.00" y="-32.00">3</text>\n' +
            '<text class="f2_1">1</text>\n</g>\n'
        )
    );
  });

  it('makes the stave a group of its own when it has no other text', () => {
    const svg = line('113.04', '') + line('66.70', '');
    expect(withLineStartNumbers(svg, [{ line: 1, number: 12, x: 24 }])).toBe(
      line('113.04', '') +
        line(
          '66.70',
          '<g transform="translate(0,66.70)">\n<text class="f1_1" x="24.00" y="-32.00">12</text>\n</g>\n'
        )
    );
    // after the line's heading, as abc2svg writes it
    const heading = '<text class="f2_1" x="26.50" y="18.00">Quads</text>\n';
    expect(
      withLineStartNumbers(line('113.04', '') + line('66.70', heading), [
        { line: 1, number: 12, x: 24 },
      ])
    ).toBe(
      line('113.04', '') +
        line(
          '66.70',
          heading +
            '<g transform="translate(0,66.70)">\n<text class="f1_1" x="24.00" y="-32.00">12</text>\n</g>\n'
        )
    );
  });

  it('counts only lines of music (a text block between them is none)', () => {
    const svg = line('113.04', '') + '<svg><text>Form: A B</text></svg>\n' + line('66.70', '');
    expect(withLineStartNumbers(svg, [{ line: 1, number: 2, x: 24 }])).toContain(
      '<text class="f1_1" x="24.00" y="-32.00">2</text>'
    );
    expect(withLineStartNumbers(svg, [{ line: 2, number: 2, x: 24 }])).toBe(svg);
  });

  it('leaves music with no numbers, or no number font, as it is', () => {
    const svg = line('113.04', '') + line('66.70', '');
    expect(withLineStartNumbers(svg, [])).toBe(svg);
    const plain = svg.replace(style, '').replace(style, '');
    expect(withLineStartNumbers(plain, [{ line: 1, number: 2, x: 24 }])).toBe(plain);
  });

  it('writes in what it took out once abc2svg has laid the music out', () => {
    const numbering = lineStartNumbers('%%measurenb 1\n');
    const symbols = twoLines();
    numbering.take(symbols[0]);
    Object.assign(symbols[4], { nl: false, x: 36.5, wl: 12.5, prev: { type: CLEF } });
    expect(numbering.writtenIn(line('113.04', '') + line('66.70', ''))).toContain(
      '<g transform="translate(0,66.70)">\n<text class="f1_1" x="24.00" y="-32.00">3</text>\n</g>\n'
    );
  });
});
