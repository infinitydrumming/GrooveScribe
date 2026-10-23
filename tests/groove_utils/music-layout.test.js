import { describe, it, expect } from 'vitest';
import {
  musicLayout,
  practisedBarsLayout,
  musicLineBroken,
  defineGlyphsOnce,
  engravedMusic,
} from '../../js/abcNotation.js';
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

  // Infinity Drumming, 2026: practised bars of the alphabet, as wide as each other,
  // no wider than a moderate bar, times the device's "Music spacing"
  describe('practised bars', () => {
    const wide = 1398; // a 1920px window (its page: 1048px)
    const laptop = 955; // a 1366px window (its page: 716px)
    const eighths = (width) => musicLayout(8, width, { counted: true }); // 8ths, counted
    const fit = (count, width, spacing = 1) =>
      practisedBarsLayout(count, eighths(width), 4, spacing);

    it('two moderate bars a line on a wide screen, centred; one alone as wide', () => {
      expect(fit(3, wide)).toEqual({ barsPerLine: 2, margin: 44, oneLine: false });
      expect(fit(1, wide)).toEqual({ barsPerLine: 2, margin: 284, oneLine: true }); // 480 of 1048
    });

    it('a laptop keeps its two bars a line, filling the page', () => {
      expect(fit(4, laptop)).toEqual({ barsPerLine: 2, margin: 0, oneLine: false });
      expect(fit(1, laptop).margin).toBe(179); // half the page, centred
    });

    it('wider spacing, fewer bars a line; narrower, more; or bars as wide as the page', () => {
      expect(fit(3, wide, 1.6).barsPerLine).toBe(1); // 768 of 1048
      expect(fit(3, wide, 1.6).margin).toBe(140);
      expect(fit(6, wide, 0.6).barsPerLine).toBe(3); // 288 each
      expect(fit(3, wide, 0)).toEqual({ barsPerLine: 1, margin: 0, oneLine: false });
    });

    it('never narrower than a bar needs', () => {
      const dense = musicLayout(32, laptop, { counted: true }); // 32nds: 320px at least
      expect(practisedBarsLayout(2, dense, 4, 0.5).barsPerLine).toBe(2);
      expect(practisedBarsLayout(2, dense, 4, 0.5).margin).toBe(38);
    });
  });

  // Infinity Drumming, 2026: section letters in round-cornered boxes, and a bar
  // number starting a line by the clef just over the stave
  it('engraves the section boxes and the bar numbers at the start of lines', () => {
    const line = (inside) =>
      '<svg><style>.f2_1 {font:italic 14px serif}</style><g transform="scale(0.75)">' +
      inside +
      '<path class="stroke" d="m0.00 91.70\nh1013.33m-1013.33 -6h1013.33"/></g></svg>';
    const music =
      line(
        '<rect class="stroke" stroke-width="0.6"\n\tx="24.50" y="2.00" width="17.21" height="22.00"/>\n' +
          '<g transform="translate(0,91.70)">\n<text class="f2_1" x="24.00" y="-50.70">3</text>\n</g>\n'
      ) +
      line(
        '<g transform="translate(0,75.70)">\n<text class="f2_1" x="536.62" y="15.01">4</text>\n</g>\n'
      );
    const engraved = engravedMusic(music);
    expect(engraved).toContain(
      '<rect class="stroke" stroke-width="1.2" rx="4" x="22.50" y="2.00" width="21.21" height="22.00"/>'
    );
    // 3 above the top line (91.70 - 24), right next to where it was
    expect(engraved).toContain(
      '<text class="f2_1" x="22.00" y="-27.00" text-anchor="end">3</text>'
    );
    // a number by a bar line within its line stays where it is
    expect(engraved).toContain('<text class="f2_1" x="536.62" y="15.01">4</text>');
    expect(engravedMusic('<p>no music</p>')).toBe('<p>no music</p>');
  });
});
