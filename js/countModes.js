// Infinity Drumming, 2026: the ways of counting over the notes.
//
//   all     every note of the note setting ("1 e & a")
//   bold    every note, those of the rhythm in bold and the rest small and grey.
//           The rhythm is the kick, snare and toms (not their ghost notes) and any
//           accent; the hi-hat, crash and ride lines and the hi-hat foot are the
//           ostinato. In a permutation, the permuted line only.
//   rhythm  only where something plays (any line), and always the beat numbers,
//           in brackets when nothing plays on them: "1 e & (2) & a"
//   click   the click's own count: where it clicks, in its subdivision ("1 & a"
//           for triplets, "1 a li & a la" for sextuplets); the beats when it is off
// A link says Count=1 (every note), Count=bold, Count=rhythm or Count=click.

import { isTimedClick, metronomeIsOn, timedMetronomeClicks } from './metronome.js';

/** The count modes, as links say them (Count=1 is "all"). */
export var COUNT_MODES = ['all', 'bold', 'rhythm', 'click'];

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

/** The fonts of the bold count ($1 the rhythm, $2 the rest), for the ABC header. */
export var COUNT_FONTS = '%%setfont-1 calibriBold 16\n%%setfont-2 calibri;fill:#8c8c8c 13\n';

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

// a note of the rhythm: played, not a ghost note
function rhythmNote(line, slot) {
  return noteAt(line, slot) && String(line[slot]).indexOf(GHOST) < 0;
}

function kickNote(lines, slot) {
  // (not the hi-hat foot alone, which is on the kick's line)
  return rhythmNote(lines.kick, slot) && String(lines.kick[slot]).indexOf('F') >= 0;
}

/**
 * Whether the rhythm plays at a slot.
 * @param {CountLines} lines
 * @param {number} slot
 * @param {string[] | null} only  in a permutation, the permuted lines ('kick', 'snare')
 */
function rhythmAt(lines, slot, only) {
  if (only)
    return (
      (only.indexOf('kick') >= 0 && kickNote(lines, slot)) ||
      (only.indexOf('snare') >= 0 && rhythmNote(lines.snare, slot))
    );
  var accented = [lines.hh, lines.snare, lines.kick]
    .concat(lines.toms, lines.cymbals)
    .some(function (line) {
      return noteAt(line, slot) && String(line[slot]).indexOf(ACCENT) >= 0;
    });
  return (
    accented ||
    kickNote(lines, slot) ||
    rhythmNote(lines.snare, slot) ||
    lines.toms.some(function (line) {
      return rhythmNote(line, slot);
    })
  );
}

/**
 * The counts at `slots` ('"e"x', as written in the music) as a count mode says
 * them: bold or small for "bold", only where something plays for "rhythm" (the
 * beat numbers always, in brackets when silent). Changes sticking_array.
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
    if (mode == 'bold')
      sticking_array[slot] = '"' + (rhythmAt(lines, slot, only) ? '$1' : '$2') + text + '"x';
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
  8: ['ah', 'lee', 'bee', '&', 'ah', 'lah', 'bah'],
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

// a note length in the music's 1/32 units ("x2", "x/" for half of one)
function spacer(units) {
  return 'x' + (units == 0.5 ? '/' : String(units));
}

/**
 * One bar of the click's count, as the (hidden) stickings voice writes it: each
 * beat split as finely as the clicks need, a click's syllable over its note.
 * Null when the clicks are finer than 8 to a beat.
 * @param {number[]} ticks  from clickTicks
 * @param {number} top
 * @param {number} bottom
 */
export function clickCountBar(ticks, top, bottom) {
  var beatTicks = 512 / bottom;
  var split = SPLITS.find(function (n) {
    return ticks.every(function (tick) {
      return whole(((tick % beatTicks) * n) / beatTicks);
    });
  });
  if (!split) return null;
  var units = 32 / bottom; // a beat, in 1/32 notes
  var tuplet = { 3: '(3:2:3', 6: '(6:4:6' }[split] || '';
  // (a tuplet of 3 or 6 notes in the time of 2 or 4)
  var noteUnits = tuplet ? units / ((split * 2) / 3) : units / split;
  var abc = '';
  for (var beat = 0; beat < top; beat++) {
    abc += tuplet;
    for (var part = 0; part < split; part++) {
      var tick = beat * beatTicks + (part * beatTicks) / split;
      var clicked = ticks.some(function (at) {
        return Math.abs(at - tick) < 1e-6;
      });
      var name = part === 0 ? String(beat + 1) : SYLLABLES[split][part - 1];
      abc += (clicked ? '"' + name + '"' : '') + spacer(noteUnits);
    }
    abc += ' ';
  }
  return abc;
}
