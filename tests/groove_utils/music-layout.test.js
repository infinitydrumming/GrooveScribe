import { describe, it, expect } from 'vitest';
import { musicLayout, musicLineBroken, defineGlyphsOnce } from '../../js/abcNotation.js';
import { clickCountNotes } from '../../js/countModes.js';

// Infinity Drumming, 2026: how many bars go on a line of music, and how wide it is
// drawn, so dense bars aren't crushed or broken in the middle on a phone.
describe('the music layout', () => {
  const phone = 206; // the editor's render width on a 390px phone (its page: 300px)
  const desktop = 885; // ... on a 1280px window (its page: 664px)
  const lineOf = (notes, width, how = {}) => musicLayout(notes, width, how).barsPerLine;

  it('puts two bars on a line when they fit, one when they would be crushed', () => {
    expect(lineOf(16, phone)).toBe(2); // 16ths
    expect(lineOf(12, phone, { triplets: true })).toBe(2); // 8th-note triplets
    expect(lineOf(24, phone, { triplets: true })).toBe(1); // 16th triplets
    expect(lineOf(16, phone, { counted: true })).toBe(1); // 16ths with the count over them
    expect(lineOf(24, desktop, { triplets: true })).toBe(2);
    expect(lineOf(24, desktop, { triplets: true, counted: true })).toBe(2);
    expect(lineOf(8, phone, { oneBar: true })).toBe(1);
  });

  it('draws a bar too wide even alone on a wider page, instead of letting it break', () => {
    expect(musicLayout(24, phone, { triplets: true, counted: true }).renderWidth).toBe(phone);
    // 6/4 in 16th triplets, counted: 36 notes don't fit 300px
    expect(musicLayout(36, phone, { triplets: true, counted: true }).renderWidth).toBe(528);
    expect(
      musicLayout(36, phone, { triplets: true, counted: true, keepWidth: true }).renderWidth
    ).toBe(phone);
    expect(musicLayout(24, desktop, { triplets: true }).renderWidth).toBe(desktop);
  });

  it('makes room for the clicks between the notes in the click count', () => {
    const sextuplets = Array.from({ length: 24 }, (_, n) => (n * 128) / 6);
    expect(clickCountNotes(16, sextuplets, 4, 4)).toBe(32); // 16 notes + the 16 clicks between them
    expect(clickCountNotes(16, [0, 128, 256, 384], 4, 4)).toBe(16);
  });

  it('notices a line abc2svg broke in the middle of a bar', () => {
    const bar = (post) =>
      'V:Stickings\nx8 x8 x8 x8 |' + post + 'V:Hands stem=up\nB8 B8 B8 B8 |' + post;
    const abc = bar('\\\n') + bar('\n'); // two bars on one line
    const line = '<svg><use xlink:href="#hd"/></svg>';
    expect(musicLineBroken(abc, line)).toBe(false);
    expect(musicLineBroken(abc, line + line)).toBe(true);
    expect(musicLineBroken(bar('\n') + bar('|\n'), line + line)).toBe(false); // one bar a line
    expect(musicLineBroken(abc, '<svg><text>title</text></svg>' + line)).toBe(false);
  });
});

// Infinity Drumming, 2026: abc2svg ("fullsvg") writes every earlier line's glyph
// definitions again in each line; the page gets each glyph once.
describe('glyphs defined once on the page', () => {
  const HD = '<ellipse id="hd" rx="4.1" ry="2.9" class="fill"/>';
  const ACCENT = '<g id="accent" class="stroke">\n<path d="m-4 0l8 -2l-8 -2"/>\n</g>';
  const line = (defs, notes) => `<svg><defs>\n${defs.join('\n')}\n</defs>${notes}</svg>`;
  const NOTES = '<use x="1" y="2" xlink:href="#hd"/><use x="3" y="4" xlink:href="#accent"/>';

  it('leaves out the copies, keeping the first definition of each glyph', () => {
    const svg =
      line([HD, ACCENT], NOTES) +
      line([HD, ACCENT, HD, ACCENT], NOTES) +
      line([HD, ACCENT, HD], NOTES);
    const once = defineGlyphsOnce(svg);
    expect(once.split('id="hd"')).toHaveLength(2);
    expect(once.split('id="accent"')).toHaveLength(2);
    expect(once.startsWith(line([HD, ACCENT], NOTES))).toBe(true); // the first line as it was
    expect(once.split('xlink:href=')).toHaveLength(svg.split('xlink:href=').length); // every note kept
    expect(once.split('<svg')).toHaveLength(4);
  });

  it('keeps a definition that differs from the first with its id, and anything it cannot read', () => {
    const otherHd = '<ellipse id="hd" rx="5" ry="3" class="fill"/>';
    expect(defineGlyphsOnce(line([HD], '') + line([otherHd], ''))).toContain(otherHd);
    const broken = line([HD], '') + '<svg><defs><g id="hd">' + HD + '</defs></svg>';
    expect(defineGlyphsOnce(broken)).toContain('<defs><g id="hd">' + HD + '</defs>');
    expect(defineGlyphsOnce('<svg><use xlink:href="#hd"/></svg>')).toBe(
      '<svg><use xlink:href="#hd"/></svg>'
    );
  });

  it("works the same on the page's own form of the music (closing tags written out)", () => {
    const page = (defs) => `<svg><defs>\n${defs.join('\n')}\n</defs></svg>`;
    const hd = '<ellipse id="hd" rx="4.1" ry="2.9" class="fill"></ellipse>';
    expect(defineGlyphsOnce(page([hd]) + page([hd, hd]))).toBe(page([hd]) + page(['', '']));
  });
});
