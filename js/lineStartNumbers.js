// Infinity Drumming, 2026: a line's first bar number, out of its notes' way.
//
// abc2svg writes the number of the bar starting a line over the line's first
// note, and keeps that room above the note for it: the note's accent, its count,
// the line's whole row of counts and so the line itself go up to clear it. The
// editor then moves the number by the clef (engravedMusic), which left all that
// high for nothing: from bar 10 on, an accent on the "1" over its line's others.
// So abc2svg is given no number at a line's start (the bar ending the line before
// is numbered 0.5 just before the music is laid out: abc2svg draws no number for
// it, nor at the next line's start), and each is written in afterwards where
// abc2svg would have put it, for engravedMusic to move as before.
//
// abc2svg also can't number a line whose first symbol is in a voice the line's
// clef isn't in (a flam's grace notes, which come before the Stickings voice's
// first note): it reads the symbol before it, and there is none. The music then
// is drawn again with those numbers written in the same way (leadIns, below).

// abc2svg 1.3.2's symbol types
var BAR = 0,
  CLEF = 1,
  FORMAT = 3,
  KEY = 5,
  METER = 6,
  STBRK = 13;
// what abc2svg passes over at a line's start to find what its number goes over
var LINE_HEAD = [METER, CLEF, KEY, FORMAT, STBRK];
// (not a whole number: no number is drawn for it, nor at the next line's start)
var NOT_DRAWN = 0.5;
// the number's height before engravedMusic moves it (abc2svg's lowest: the
// stave's top line and 8)
var NUMBER_Y = '-32.00';

/**
 * For music numbering its bars (%%measurenb with a number of bars), what takes
 * its lines' first bar numbers out of abc2svg's layout and writes them in after.
 * Null for other music (it draws no numbers).
 * @param {string} abc
 * @param {{lineEnds: boolean, leadIns: 'all' | number[]}} [how]  which bars: those
 *   ending written lines (the editor's, the default), and bars before a lead-in
 *   (a voice the line's clef isn't in first after them): all of them, or those at
 *   these places among the music's symbols (barsEndingLines of a first drawing)
 * @returns {{take: function(Object): void, writtenIn: function(string): string,
 *   barsEndingLines: function(): number[]} | null}
 */
export function lineStartNumbers(abc, how) {
  var lineEnds = how ? how.lineEnds : true;
  var leadIns = how ? how.leadIns : [];
  var every = 0;
  String(abc).replace(/^%%measurenb\s+(\d+)/gm, function (all, n) {
    every = Number(n);
    return all;
  });
  if (!every) return null;
  /** @type {Object[]} */
  var symbols = [];
  /** @type {number[]} where each tune's symbols start */
  var tunes = [];
  return {
    // (abc2svg's get_abcmodel: a tune's symbols, numbered, not yet laid out)
    take: function (tsfirst) {
      tunes.push(symbols.length);
      for (var s = tsfirst; s; s = s.ts_next) {
        var at = symbols.length;
        symbols.push(s);
        // a bar whose number abc2svg would write at the next line's start: one
        // ending a line (the line's top voice ends on it), or before a lead-in
        if (s.type != BAR || !s.bar_num || s.bar_num <= 1 || s.bar_num % every) continue;
        var leadIn = leadIns == 'all' || leadIns.indexOf(at) >= 0;
        if ((lineEnds && s.eoln) || (leadIn && leadsIn(s))) {
          s.lineEndNumber = s.bar_num;
          s.bar_num = NOT_DRAWN;
        }
      }
    },
    writtenIn: function (svg) {
      return withLineStartNumbers(svg, numbersAtLineStarts(symbols, tunes));
    },
    // (once laid out) where the bars it took a number from that end a line are
    barsEndingLines: function () {
      return barsEndingLines(symbols, tunes);
    },
  };
}

// Whether the music after a bar starts, on its stave, in another voice than the
// bar's (the one a line's clef goes in): a flam's grace notes before the first note
function leadsIn(bar) {
  var s = bar.ts_next;
  while (s && (s.type == BAR || LINE_HEAD.indexOf(s.type) >= 0 || s.st != bar.st)) s = s.ts_next;
  return !!s && s.v != bar.v;
}

// where the bars numbered NOT_DRAWN that end a line are among the symbols
function barsEndingLines(symbols, tunes) {
  var ends = [];
  var lineEnd = -1;
  symbols.forEach(function (s, i) {
    if (tunes.indexOf(i) >= 0) lineEnd = -1;
    else if (s.nl === false && lineEnd >= 0) ends.push(lineEnd);
    if (s.nl === false) lineEnd = -1;
    if (s.lineEndNumber) lineEnd = i;
  });
  return ends;
}

/**
 * The numbers abc2svg was kept from writing, once it has laid the music out:
 * each with its line of music (0 the first) and its place across.
 * @param {Object[]} symbols  abc2svg's symbols, in time order, tune after tune
 * @param {number[]} tunes  where each tune's symbols start
 * @returns {{line: number, number: number, x: number}[]}
 */
export function numbersAtLineStarts(symbols, tunes) {
  var numbers = [];
  var line = -1;
  var lineEnd = null;
  symbols.forEach(function (s, i) {
    var tuneStart = tunes.indexOf(i) >= 0;
    // (abc2svg marks a line's first symbol so as it cuts the music into lines)
    if (tuneStart || s.nl === false) {
      line++;
      if (lineEnd && !tuneStart)
        numbers.push({ line: line, number: lineEnd.lineEndNumber, x: numberAt(symbols, i) });
      lineEnd = null;
    }
    if (s.lineEndNumber) lineEnd = s;
  });
  return numbers;
}

// where abc2svg writes the number starting a line (its draw_measnb): over the
// left of the first symbol that is no clef, key or time signature (on the top
// stave: the music is one), or over what comes before it if that isn't the clef
function numberAt(symbols, i) {
  var j = i;
  while (j < symbols.length && LINE_HEAD.indexOf(symbols[j].type) >= 0) j++;
  while (j < symbols.length && symbols[j].st != 0) j++;
  var s = symbols[j];
  if (!s) return 0;
  if (s.prev && s.prev.type != CLEF) s = s.prev;
  return s.x - s.wl;
}

/**
 * abc2svg's SVG (one <svg> a line of music) with the line-start numbers written
 * in as abc2svg writes them: first in their stave's group of texts.
 * @param {string} svg
 * @param {{line: number, number: number, x: number}[]} numbers
 * @returns {string}
 */
export function withLineStartNumbers(svg, numbers) {
  var font = /\.(f\d+_\d+) \{font:italic 14px serif\}/.exec(svg);
  if (!numbers.length || !font) return svg;
  var line = -1;
  return String(svg)
    .split(/(?=<svg[\s>])/)
    .map(function (part) {
      var stave = /<path class="stroke" d="m0\.00 ([\d.]+)\nh/.exec(part);
      if (!stave) return part;
      line++;
      var here = numbers.filter(function (number) {
        return number.line == line;
      })[0];
      if (!here) return part;
      var text =
        '<text class="' +
        font[1] +
        '" x="' +
        here.x.toFixed(2) +
        '" y="' +
        NUMBER_Y +
        '">' +
        here.number +
        '</text>\n';
      var group = '<g transform="translate(0,' + stave[1] + ')">\n';
      var at = part.indexOf(group);
      if (at >= 0) return part.slice(0, at + group.length) + text + part.slice(at + group.length);
      // (the stave has no other text: its group, where abc2svg puts it, after
      // the line's heading and before the first of its lines)
      var scaled = /<g transform="scale\([\d.]+\)">/.exec(part);
      if (!scaled) return part;
      at = scaled.index + scaled[0].length;
      var drawn = part.indexOf('<path', at);
      if (drawn >= 0) at = drawn;
      return part.slice(0, at) + group + text + '</g>\n' + part.slice(at);
    })
    .join('');
}
