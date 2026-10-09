// Modified by Infinity Drumming, 2026: crash and ride lines, Brazilian swing, straight bars, grace-note settings, a time signature per bar, practice timer, counting. See CHANGES.md.
// grooveData — the central data contract for Groove Scribe.
//
// A GrooveData describes a single groove: its time signature, subdivision and
// tempo, the per-instrument note lanes (hi-hat / snare / kick / toms / sticking)
// and the display flags. It is *produced* by URL parsing (urlSerialization) and
// *consumed* by the notation and audio generators (abcNotation / midiFile), so
// this module is the single place its shape is defined and constructed.

import { constant_DEFAULT_TEMPO } from './constants.js';
import { DEFAULT_GRACE_SPACING_MS, DEFAULT_GRACE_VOLUME } from './ornaments.js';

// A fresh 32-slot note lane, every slot a rest. Each note array in a GrooveData
// is a copy of this (never a shared reference), so mutating one lane or measure
// never bleeds into another. A populated slot holds an ABC-notation token
// string (e.g. '^g'); an empty slot is `false`.
/** @type {Array<string | false>} */
const EMPTY_NOTE_ARRAY = [
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
];

/**
 * One groove: notation-independent state that fully describes what to render
 * and play.
 *
 * @typedef {Object} GrooveData
 * @property {number} notesPerMeasure  Slots per measure at the current subdivision.
 * @property {number} timeDivision     Subdivision (4, 8, 16, 32, or triplet forms 6/12/24/48).
 * @property {number} numberOfMeasures  Measure count.
 * @property {number} numBeats         Time-signature numerator (top).
 * @property {number} noteValue        Time-signature denominator (bottom).
 * @property {Array<string|boolean>} sticking_array  Sticking lane (R/L annotations); each slot is an ABC token or false.
 * @property {Array<string|boolean>} hh_array      Hi-hat / cymbal lane; each slot is an ABC token or false.
 * @property {Array<string|boolean>} snare_array   Snare lane; each slot is an ABC token or false.
 * @property {Array<string|boolean>} kick_array    Kick lane; each slot is an ABC token or false.
 * @property {Array<Array<string|boolean>>} toms_array  Four tom lanes (T1–T4), index 0-based.
 * @property {Array<string|boolean>} crash_array   Crash line (crash 1, crash 2, splash); URL "C".
 * @property {Array<string|boolean>} ride_array    Ride line (ride, ride bell, cow bell); URL "R".
 *   Older URLs keep crashes and rides in hh_array; both forms render the same.
 * @property {boolean} showToms        Whether the tom lanes are displayed.
 * @property {boolean} showStickings   Whether the sticking lane is displayed.
 * @property {string} title            Groove title.
 * @property {string} author           Groove author.
 * @property {string} comments         Free-text comments.
 * @property {boolean} showLegend      Whether the notation legend is displayed.
 * @property {number} swingPercent     Swing amount, 0–100.
 * @property {'swing' | 'brazilian'} swingStyle  How swing spaces each group of four notes: 'swing'
 *                                     (long-short-long-short) or 'brazilian' (long-short-short-long).
 * @property {number} tempo            Tempo in BPM.
 * @property {boolean} kickStemsUp     Kick note stem direction.
 * @property {number} metronomeFrequency  Metronome click subdivision (0, 1 = once per bar, 4, 8, 16).
 * @property {number} grooveClickGrooveBars  "Groove / click bars" practice option: bars of groove
 *   before the click-only bars; 0 = option off. URL "GrooveBars".
 * @property {number} grooveClickClickBars   Click-only bars for that option. URL "ClickBars".
 * @property {boolean} showCounts  Counting ("1 e & a") over the notes in the sheet music.
 *   URL "Count=1" (only when on).
 * @property {string} practiceLimit  Practice timer: stop after this many minutes ("10m") or
 *   bars ("16b"); '' = off. URL "Practice".
 * @property {boolean[]} straightBars  Per bar (index 0 = bar 1): true plays that bar straight
 *                                     even when the groove is swung. URL "StraightBars" (1-based list).
 * @property {Array<{top: number, bottom: number}>} barTimeSigs  Each bar's time signature when
 *   they differ (bar 1's is numBeats / noteValue); empty when every bar is the same. URL
 *   "BarSigs" (only when they differ). notesPerMeasure is then the bar stride: the most
 *   note slots any bar has (see barMeters.js).
 * @property {number} graceSpacingMs  Flams, drags and ruffs: gap between the grace notes (and to
 *                                     the note), in ms. URL "GraceMs" (only when not the default).
 * @property {number} graceVolume     Grace-note volume, % of a normal hit. URL "GraceVol".
 * @property {(boolean|number)} debugMode  Debug flag inherited from the owning GrooveUtils.
 * @property {boolean} grooveDBAuthoring   GrooveDB authoring mode flag.
 * @property {boolean} viewMode        View (vs. edit) mode flag.
 */

/**
 * Create a fresh {@link GrooveData} populated with default values.
 *
 * @param {{debugMode?: (boolean|number), grooveDBAuthoring?: boolean, viewMode?: boolean}} [config]
 *   Instance-level flags inherited from the owning GrooveUtils. Each defaults to
 *   the same value the legacy `grooveDataNew` used for a freshly-constructed
 *   GrooveUtils (debugMode/grooveDBAuthoring off, viewMode on).
 * @returns {GrooveData}
 */
export function createGrooveData(config = {}) {
  return {
    notesPerMeasure: 16,
    timeDivision: 16,
    numberOfMeasures: 1,
    numBeats: 4, // TimeSigTop: Top part of Time Signture 3/4, 4/4, 5/4, 6/8, etc...
    noteValue: 4, // TimeSigBottom: Bottom part of Time Sig   4 = quarter notes, 8 = 8th notes, 16ths, etc..
    sticking_array: EMPTY_NOTE_ARRAY.slice(0), // copy by value
    hh_array: EMPTY_NOTE_ARRAY.slice(0), // copy by value
    snare_array: EMPTY_NOTE_ARRAY.slice(0), // copy by value
    kick_array: EMPTY_NOTE_ARRAY.slice(0), // copy by value
    // toms_array contains 4 toms  T1, T2, T3, T4 index starting at zero
    toms_array: [
      EMPTY_NOTE_ARRAY.slice(0),
      EMPTY_NOTE_ARRAY.slice(0),
      EMPTY_NOTE_ARRAY.slice(0),
      EMPTY_NOTE_ARRAY.slice(0),
    ],
    crash_array: EMPTY_NOTE_ARRAY.slice(0), // copy by value
    ride_array: EMPTY_NOTE_ARRAY.slice(0), // copy by value
    showToms: false,
    showStickings: false,
    title: '',
    author: '',
    comments: '',
    showLegend: false,
    swingPercent: 0,
    swingStyle: 'swing',
    tempo: constant_DEFAULT_TEMPO,
    kickStemsUp: true,
    metronomeFrequency: 0, // 0, 1, 4, 8, 16
    grooveClickGrooveBars: 0, // 0 = "Groove / click bars" off
    grooveClickClickBars: 0,
    practiceLimit: '', // '' = practice timer off
    showCounts: false,
    straightBars: [],
    barTimeSigs: [],
    graceSpacingMs: DEFAULT_GRACE_SPACING_MS,
    graceVolume: DEFAULT_GRACE_VOLUME,
    debugMode: config.debugMode ?? false,
    grooveDBAuthoring: config.grooveDBAuthoring ?? false,
    viewMode: config.viewMode ?? true,
  };
}
