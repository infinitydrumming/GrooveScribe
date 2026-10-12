// Infinity Drumming, 2026: the metronome's click choices.
//
// The first ones are the original Groove Scribe clicks, made on the groove's own
// note grid (MetronomeFreq=1, 4, 8, 16).  The newer ones are timed exactly, so
// they work over any groove, straight or triplet:
//   12   triplets: 3 clicks a beat
//   24   sextuplets: 6 clicks a beat
//   8s   swung 8ths: the beat and the last triplet ("1 . let")
//   16s  swung 16ths: the same at double speed
//   4d   dotted quarter notes, for 6/8 and 12/8
// A "beat" is the bottom of the time signature (a quarter note in 4/4, an 8th
// note in 7/8); the swung clicks are always in quarter notes, like the 8th and
// 16th clicks.  Every bar starts with the "1" sound.

import {
  constant_OUR_MIDI_METRONOME_1,
  constant_OUR_MIDI_METRONOME_NORMAL,
  constant_OUR_MIDI_VELOCITY_ACCENT,
} from './constants.js';

// the choices' link values, in the order of the Click menu (index.html)
var CHOICES = [0, 1, 4, 8, 16, 12, 24, '8s', '16s', '4d'];

var TIMED = [12, 24, '8s', '16s', '4d'];

/**
 * A metronome setting from a link or a menu ("8", "8s", 16 ...): one of the
 * choices' values, else 0 (off).  Other numbers keep their old meaning (a click
 * on every beat), as they always had.
 * @param {string | number | null | undefined} value
 * @returns {number | string}
 */
export function parseMetronomeFrequency(value) {
  var text = String(value === undefined || value === null ? '' : value).trim();
  for (var i = 0; i < CHOICES.length; i++) if (String(CHOICES[i]) == text) return CHOICES[i];
  var number = parseInt(text, 10);
  return isNaN(number) || number < 0 ? 0 : number;
}

/** Whether a metronome setting clicks at all. */
export function metronomeIsOn(frequency) {
  return !!frequency && frequency !== '0';
}

/** Whether a setting is one of the exactly timed clicks (not on the groove's grid). */
export function isTimedClick(frequency) {
  return TIMED.indexOf(frequency) >= 0;
}

var SOFT = 25; // in-between clicks, like the 16th-note click's
var MEDIUM = 60;

/**
 * The clicks of one bar for a timed setting, in MIDI ticks (128 to a quarter
 * note) from the start of the bar, earliest first.
 * @param {number | string} frequency
 * @param {number} timeSigTop
 * @param {number} timeSigBottom
 * @returns {{at: number, note: number, velocity: number}[]}
 */
export function timedMetronomeClicks(frequency, timeSigTop, timeSigBottom) {
  if (!isTimedClick(frequency)) return [];
  var barTicks = (timeSigTop * 512) / timeSigBottom;
  var beatTicks = 512 / timeSigBottom;
  var clicks = [];
  // positions (in parts of `unit` ticks) and the loudness of each
  var add = function (unit, pattern) {
    for (var start = 0; start < barTicks - 1e-6; start += unit)
      pattern.forEach(function (part) {
        var at = start + part.at * unit;
        if (at < barTicks - 1e-6) clicks.push({ at: at, velocity: part.velocity });
      });
  };
  var full = constant_OUR_MIDI_VELOCITY_ACCENT;
  switch (frequency) {
    case 12:
      add(beatTicks, [
        { at: 0, velocity: full },
        { at: 1 / 3, velocity: MEDIUM },
        { at: 2 / 3, velocity: MEDIUM },
      ]);
      break;
    case 24:
      add(beatTicks, [
        { at: 0, velocity: full },
        { at: 1 / 6, velocity: SOFT },
        { at: 2 / 6, velocity: MEDIUM },
        { at: 3 / 6, velocity: SOFT },
        { at: 4 / 6, velocity: MEDIUM },
        { at: 5 / 6, velocity: SOFT },
      ]);
      break;
    case '8s':
      add(128, [
        { at: 0, velocity: full },
        { at: 2 / 3, velocity: full },
      ]);
      break;
    case '16s':
      add(128, [
        { at: 0, velocity: full },
        { at: 1 / 3, velocity: SOFT },
        { at: 1 / 2, velocity: SOFT },
        { at: 5 / 6, velocity: SOFT },
      ]);
      break;
    case '4d':
      add(192, [{ at: 0, velocity: full }]);
      break;
  }
  return clicks.map(function (click, index) {
    return {
      at: click.at,
      note: index === 0 ? constant_OUR_MIDI_METRONOME_1 : constant_OUR_MIDI_METRONOME_NORMAL,
      velocity: click.velocity,
    };
  });
}
