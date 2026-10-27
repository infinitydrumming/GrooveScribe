// Infinity Drumming, 2026: the ways of counting over the notes.
//
//   all     every note of the note setting ("1 e & a")
//   bold    every note, those of the rhythm in bold and the rest small and grey.
//           The rhythm is the kick, snare and toms (not their ghost notes) and any
//           accent; the hi-hat, crash and ride lines and the hi-hat foot are the
//           ostinato. In a permutation, the permuted line only.
//   ghosts  as bold, with ghost notes bold too
//   rhythm  only where something plays (any line), and always the beat numbers,
//           in brackets when nothing plays on them: "1 e & (2) & a"
//   click   the click's own count: where it clicks, in its subdivision ("1 & a"
//           for triplets, "1 a li & a la" for sextuplets); the beats when it is off
// A link says Count=1 (every note), Count=bold, Count=ghosts, Count=rhythm or
// Count=click.

import { isTimedClick, metronomeIsOn, timedMetronomeClicks } from './metronome.js';

/** The count modes, as links say them (Count=1 is "all"). */
export var COUNT_MODES = ['all', 'bold', 'ghosts', 'rhythm', 'click'];

/**
 * A link's Count value: whether to count, and how.
 * @param {string} value
 * @returns {{show: boolean, mode: string}}
 */
export function countModeFromUrl(value) {
  var text = String(value || '').toLowerCase();
  if (text == '1') return { show: true, mode: 'all' };
  if (COUNT_MODES.indexOf(text) > 0) return { show: true, mode: text };
  return { show: false, mode: 'all' };
}

/** The Count value for a link ('' when not counting). */
export function countModeToUrl(show, mode) {
  if (!show) return '';
  return '&Count=' + (COUNT_MODES.indexOf(mode) > 0 ? mode : '1');
}

/**
 * The count's fonts, for the ABC header: smaller for 32nd notes (so a bar of
 * them fits on a phone), and for the bold counts $1 (the rhythm) and $2 (the rest).
 * Over 32nd notes the bold ones are as small as the rest (bigger, a bar of them
 * ran together and past its end), told apart by their weight and colour.
 * @param {string} mode
 * @param {boolean} small
 */
export function countFonts(mode, small) {
  var fonts = small ? '%%gchordfont calibri 11\n' : '';
  if (mode == 'bold' || mode == 'ghosts')
    fonts +=
      '%%setfont-1 calibriBold ' +
      (small ? 11 : 16) +
      '\n%%setfont-2 calibri;fill:#8c8c8c ' +
      (small ? 11 : 13) +
      '\n';
  return fonts;
}

var GHOST = '!(.!!).!';
var ACCENT = '!accent!';

/**
 * @typedef {{hh: Array, snare: Array, kick: Array, toms: Array[], cymbals: Array[]}} CountLines
 *   a bar's lines (full-size arrays): the toms are the 4 toms, the cymbals the
 *   crash and ride lines
 */

function noteAt(line, slot) {
  return !!(line && line[slot]);
}

/** Whether anything plays at a slot. */
function playedAt(lines, slot) {
  return [lines.hh, lines.snare, lines.kick]
    .concat(lines.toms, lines.cymbals)
    .some(function (line) {
      return noteAt(line, slot);
    });
}

/**
 * Whether the rhythm plays at a slot.
 * @param {CountLines} lines
 * @param {number} slot
 * @param {string[] | null} only  in a permutation, the permuted lines ('kick', 'snare')
 * @param {boolean} ghosts  ghost notes are of the rhythm too
 */
function rhythmAt(lines, slot, only, ghosts) {
  // a note of the rhythm: played, and not a ghost note unless they count
  var rhythmNote = function (line) {
    return noteAt(line, slot) && (ghosts || String(line[slot]).indexOf(GHOST) < 0);
  };
  // (not the hi-hat foot alone, which is on the kick's line)
  var kickNote = rhythmNote(lines.kick) && String(lines.kick[slot]).indexOf('F') >= 0;
  if (only)
    return (
      (only.indexOf('kick') >= 0 && kickNote) ||
      (only.indexOf('snare') >= 0 && rhythmNote(lines.snare))
    );
  var accented = [lines.hh, lines.snare, lines.kick]
    .concat(lines.toms, lines.cymbals)
    .some(function (line) {
      return noteAt(line, slot) && String(line[slot]).indexOf(ACCENT) >= 0;
    });
  return accented || kickNote || rhythmNote(lines.snare) || lines.toms.some(rhythmNote);
}

/**
 * The counts at `slots` ('"e"x', as written in the music) as a count mode says
 * them: bold or small for "bold" and "ghosts", only where something plays for
 * "rhythm" (the beat numbers always, in brackets when silent). Changes
 * sticking_array.
 * @param {Array} sticking_array
 * @param {number[]} slots
 * @param {string} mode
 * @param {CountLines} lines
 * @param {string[] | null} only
 */
export function styleCounts(sticking_array, slots, mode, lines, only) {
  slots.forEach(function (slot) {
    var said = /^"(.*)"x$/.exec(String(sticking_array[slot]));
    if (!said) return;
    var text = said[1];
    if (mode == 'bold' || mode == 'ghosts')
      sticking_array[slot] =
        '"' + (rhythmAt(lines, slot, only, mode == 'ghosts') ? '$1' : '$2') + text + '"x';
    else if (mode == 'rhythm' && !playedAt(lines, slot))
      sticking_array[slot] = /^\d+$/.test(text) ? '"(' + text + ')"x' : false;
  });
}

// --- the click's count ------------------------------------------------------------

// each note of a beat split into so many, after the beat's number
var SYLLABLES = {
  1: [],
  2: ['&'],
  3: ['&', 'a'],
  4: ['e', '&', 'a'],
  6: ['a', 'li', '&', 'a', 'la'],
  8: ['a', 'li', 'bi', '&', 'a', 'la', 'ba'],
};
var SPLITS = [1, 2, 3, 4, 6, 8];
// the offset click starts, in grid slots (as midiFile.js shifts them)
var START_SHIFT = { E: 2, AND: 4, A: 6, TI: 4, TA: 8 };

/**
 * Where the click sounds in a bar, in MIDI ticks (128 to a quarter note); every
 * beat when it is off.
 * @param {number | string} frequency  metronome setting (see metronome.js)
 * @param {string} start  the offset click start ('1', 'E', 'AND' ...)
 * @param {number} top
 * @param {number} bottom
 * @param {boolean} triplets  the groove is on a triplet grid (the original clicks go on it)
 * @returns {number[]}
 */
export function clickTicks(frequency, start, top, bottom, triplets) {
  var beatTicks = 512 / bottom;
  var at = [];
  if (!metronomeIsOn(frequency)) {
    for (var beat = 0; beat < top; beat++) at.push(beat * beatTicks);
    return at;
  }
  if (isTimedClick(frequency))
    return timedMetronomeClicks(frequency, top, bottom).map(function (click) {
      return click.at;
    });
  var quarter = triplets ? 12 : 8;
  var eighth = triplets ? 6 : 4;
  var barSlots = (quarter * top * 4) / bottom;
  var shift = START_SHIFT[start] || 0;
  for (var slot = 0; slot < barSlots; slot++) {
    var k = slot - shift;
    if (k < 0) continue;
    var one = k % barSlots === 0;
    var click =
      one ||
      k % quarter === 0 ||
      (frequency == 8 && k % eighth === 0) ||
      (frequency == 16 && k % 2 === 0);
    if (frequency == 1) click = one;
    if (click) at.push((slot * 128) / quarter);
  }
  return at;
}

function whole(number) {
  return Math.abs(number - Math.round(number)) < 1e-6;
}

// a note length in the music's 1/32 units ("x2", "x3/2", "x/" for half of one)
function spacer(units) {
  if (whole(units)) return 'x' + Math.round(units);
  if (whole(units * 2)) return 'x' + (units == 0.5 ? '/' : Math.round(units * 2) + '/2');
  return 'x' + Math.round(units * 4) + '/4';
}

function gcd(a, b) {
  return b ? gcd(b, a % b) : a;
}

/**
 * How finely the clicks split a beat (1, 2, 3, 4, 6 or 8), or 0 when finer.
 * @param {number[]} ticks  from clickTicks
 * @param {number} bottom
 */
export function clickSplit(ticks, bottom) {
  var beatTicks = 512 / bottom;
  return (
    SPLITS.find(function (n) {
      return ticks.every(function (tick) {
        return whole(((tick % beatTicks) * n) / beatTicks);
      });
    }) || 0
  );
}

// a click's syllable: the beat's number, or the split's syllable after it
function clickName(tick, split, beatTicks) {
  var beat = Math.floor(tick / beatTicks + 1e-6);
  var part = Math.round(((tick - beat * beatTicks) * split) / beatTicks);
  return part === 0 ? String(beat + 1) : SYLLABLES[split][part - 1];
}

/**
 * One straight bar of the click's count, as the (hidden) stickings voice writes
 * it, a click's syllable over its note. It has a note wherever the groove's grid
 * has one, as the other counts do: abc2svg may break a long line at any of the
 * notes, and its bar numbers need this first voice to have one there. Null when
 * the clicks are finer than 8 to a beat.
 * @param {number[]} ticks  from clickTicks
 * @param {number} top
 * @param {number} bottom
 * @param {number} grid  the groove's notes to a beat
 */
export function clickCountBar(ticks, top, bottom, grid) {
  var beatTicks = 512 / bottom;
  var split = clickSplit(ticks, bottom);
  if (!split) return null;
  var units = 32 / bottom; // a beat, in the music's 1/32 units
  var gridNotes = whole(grid) && grid >= 1 ? Math.round(grid) : units;
  var parts = (split * gridNotes) / gcd(split, gridNotes); // a beat split for both
  // clicks in 3s or 6s: a tuplet over the beat, its parts written 1 unit long
  var ternary = parts % 3 === 0;
  var partUnits = ternary ? 1 : units / parts;
  var abc = '';
  for (var beat = 0; beat < top; beat++) {
    var at = [];
    for (var part = 0; part < parts; part++) {
      var tick = beat * beatTicks + (part * beatTicks) / parts;
      var clicked = ticks.some(function (click) {
        return Math.abs(click - tick) < 1e-6;
      });
      if (clicked || part % (parts / gridNotes) === 0)
        at.push({ part: part, tick: tick, clicked: clicked });
    }
    if (ternary) abc += '(' + parts + ':' + units + ':' + at.length;
    at.forEach(function (note, n) {
      var length = ((n + 1 < at.length ? at[n + 1].part : parts) - note.part) * partUnits;
      abc +=
        (note.clicked ? '"' + clickName(note.tick, split, beatTicks) + '"' : '') + spacer(length);
    });
    abc += ' ';
  }
  return abc;
}

/**
 * How many notes a bar of the click's count has: one on each of the groove's
 * grid notes and one on each click between them (the line needs room for all).
 * @param {number} gridNotes  the bar's notes at the note setting
 * @param {number[]} ticks  from clickTicks
 * @param {number} top
 * @param {number} bottom
 */
export function clickCountNotes(gridNotes, ticks, top, bottom) {
  var step = (top * 512) / bottom / gridNotes;
  return (
    gridNotes +
    ticks.filter(function (tick) {
      return !whole(tick / step);
    }).length
  );
}

/**
 * The click's marks for countOver: each click's tick in the bar and syllable.
 * @param {number[]} ticks  from clickTicks
 * @param {number} split  clickSplit
 * @param {number} bottom
 * @returns {{tick: number, name: string}[]}
 */
export function clickMarks(ticks, split, bottom) {
  return ticks.map(function (tick) {
    return { tick: tick, name: clickName(tick, split, 512 / bottom) };
  });
}

/**
 * A count over a stretch of a triplet-grid bar (a beat, or the two of a
 * quarter-note triplet) as the music writer laid the stretch out: `spacers` are
 * the (hidden) notes it wrote there, one wherever the music has a note. The
 * writer writes a triplet beat 12 units to a quarter note (its tuplet only a
 * label) and a plain beat (a quarter, 8ths, 16ths) 8, and leaves out the counts
 * of a plain beat that fall between its notes; so the marks are placed in the
 * stretch's own units, with a tuplet where they fall between them.
 * @param {number[]} spacers  their lengths, in the music's 1/32 units
 * @param {number} slots  the stretch, in triplet-grid slots (12 to a quarter note)
 * @param {number} startTick  where it starts in the bar (128 ticks to a quarter note)
 * @param {{tick: number, name: string}[]} marks  the bar's counts (ticks from its start)
 * @param {boolean} [keep]  null when every mark is on one of the writer's notes
 *   (its own writing has them all)
 * @returns {string | null}
 */
export function countOver(spacers, slots, startTick, marks, keep) {
  var written = spacers.reduce(function (sum, length) {
    return sum + length;
  }, 0);
  var realTicks = (slots * 128) / 12;
  var at = []; // in written units, with the count there
  var position = 0;
  spacers.forEach(function (length) {
    at.push({ at: position, name: '' });
    position += length;
  });
  var between = false;
  marks.forEach(function (mark) {
    if (mark.tick < startTick - 1e-6 || mark.tick > startTick + realTicks - 1e-6) return;
    var where = ((mark.tick - startTick) * written) / realTicks;
    var same = at.find(function (note) {
      return Math.abs(note.at - where) < 1e-6;
    });
    if (same) same.name = mark.name;
    else {
      at.push({ at: where, name: mark.name });
      between = true;
    }
  });
  if (keep && !between) return null;
  at.sort(function (a, b) {
    return a.at - b.at;
  });
  var lead = '';
  var scale = 1;
  if (
    !at.every(function (note) {
      return whole(note.at * 4);
    })
  ) {
    // between the written units: a tuplet of `parts` 1-unit notes in their time
    var parts = 1;
    while (
      parts < 96 &&
      !at.every(function (note) {
        return whole((note.at * parts) / written);
      })
    )
      parts++;
    lead = '(' + parts + ':' + written + ':' + at.length;
    scale = parts / written;
  } else if (written == slots) lead = '(' + at.length + ':' + at.length + ':' + at.length; // a labelled triplet beat
  return (
    lead +
    at
      .map(function (note, n) {
        var length = ((n + 1 < at.length ? at[n + 1].at : written) - note.at) * scale;
        return (note.name ? '"' + note.name + '"' : '') + spacer(length);
      })
      .join('')
  );
}
