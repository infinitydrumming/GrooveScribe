// Infinity Drumming, 2026: flams, drags and ruffs on any drum or cymbal line.
//
// An ornament travels inside a note's ABC token as a grace-note group in front
// of the note, the way the snare flam always has ("{/c}c"):
//   flam = 1 grace note, drag = 2, ruff = 3, e.g. "{/ee}e" is a drag on tom 1.
// The grace notes are normally on the same drum; written on another drum's
// pitch they play that drum ("{/c}e": a flam from the snare into tom 1).
// Because the ornament is part of the token, it rides along wherever notes go
// (bars, copy / paste, permutations, undo).  Links carry it on separate
// ornament lines (see ornamentChar / ornamentFromChar).

// grace notes per ornament type
var GRACE_COUNT = { f: 1, d: 2, r: 3 };
var TYPE_FOR_COUNT = { 1: 'f', 2: 'd', 3: 'r' };

// drums the grace notes can be moved to
var TARGET_PITCH = { S: 'c', T1: 'e', T2: 'd', T3: 'B', T4: 'A', H: '^g', K: 'F' };

// one link character per (type, grace drum): f / d / r on the same drum
var CHARS = {
  same: 'fdr',
  S: 'FDR',
  T1: 'hij',
  T2: 'klm',
  T4: 'nop',
  H: 'stu',
  T3: 'vwx',
  K: 'abc',
};
var TYPES = 'fdr';

// MIDI sound for a grace note written on this pitch
var GRACE_MIDI = {
  c: 38, // snare
  '^c': 37, // cross stick
  e: 48, // tom 1
  d: 47, // tom 2
  B: 45, // tom 3
  A: 43, // floor tom
  F: 35, // kick
  '^g': 42, // closed hi-hat
  "^A'": 51, // ride
  "^B'": 53, // ride bell
  "^D'": 105, // cow bell
  "^c'": 49, // crash
  "^a'": 57, // crash 2
  "^g'": 55, // splash
  "^d'": 52, // stacker
};

// The ABC pitches in a string of notes: accidentals, a letter, octave marks
// ("^g", "c", "^A'").
function pitchesIn(text) {
  var pitches = [];
  var pitch = '';
  for (var i = 0; i < text.length; i++) {
    var ch = text[i];
    if ('_=^'.indexOf(ch) >= 0) pitch += ch;
    else if (/[A-Ga-g]/.test(ch)) {
      pitch += ch;
      while (i + 1 < text.length && ",'".indexOf(text[i + 1]) >= 0) pitch += text[++i];
      pitches.push(pitch);
      pitch = '';
    } else pitch = '';
  }
  return pitches;
}

/**
 * Separate a note token into its grace group and the note itself.
 * @param {string | false} token
 * @returns {{grace: string, main: string | false}}
 */
export function splitGrace(token) {
  if (typeof token !== 'string') return { grace: '', main: token };
  var start = token.indexOf('{');
  var end = start < 0 ? -1 : token.indexOf('}', start);
  if (end < 0) return { grace: '', main: token };
  return { grace: token.slice(start, end + 1), main: token.slice(0, start) + token.slice(end + 1) };
}

/**
 * Take every grace group ("{...}") out of a string of ABC notes.
 * @returns {{graces: string[], rest: string}}
 */
export function takeGraceGroups(text) {
  var graces = [];
  var parts = splitGrace(text);
  while (parts.grace) {
    graces.push(parts.grace);
    text = parts.main;
    parts = splitGrace(text);
  }
  return { graces: graces, rest: text };
}

// remove every "<ch>...<ch>" stretch (decorations !...!, annotations "...")
function removeDelimited(text, ch) {
  var out = '';
  var inside = false;
  for (var i = 0; i < text.length; i++) {
    if (text[i] === ch) inside = !inside;
    else if (!inside) out += text[i];
  }
  return out;
}

/** The note token without any grace notes (what the drum itself plays). */
export function withoutGrace(token) {
  return splitGrace(token).main;
}

/** The pitch a note token is written on, without decorations, e.g. "!accent!c" -> "c". */
export function basePitch(token) {
  if (typeof token !== 'string') return '';
  var bare = removeDelimited(removeDelimited(withoutGrace(token), '!'), '"');
  return pitchesIn(bare)[0] || '';
}

/**
 * The ornament on a note token, or null.
 * @param {string | false} token
 * @returns {{type: string, on: string | null} | null}  type f / d / r; on: the
 *   line the grace notes are played on, null for the note's own drum
 */
export function ornamentFromToken(token) {
  var parts = splitGrace(token);
  if (!parts.grace) return null;
  var graces = pitchesIn(parts.grace);
  var type = TYPE_FOR_COUNT[Math.min(graces.length, 3)];
  if (!type) return null;
  var gracePitch = graces[0];
  var on = null;
  if (gracePitch != basePitch(parts.main)) {
    for (var line in TARGET_PITCH) if (TARGET_PITCH[line] == gracePitch) on = line;
  }
  return { type: type, on: on };
}

/**
 * A note token with an ornament in front (or without one, for null).
 * @param {string | false} token  the note (any grace notes on it are replaced)
 * @param {{type: string, on?: string | null} | null} ornament
 */
export function tokenWithOrnament(token, ornament) {
  var main = withoutGrace(token);
  if (typeof main !== 'string' || !ornament || !GRACE_COUNT[ornament.type]) return main;
  var pitch = (ornament.on && TARGET_PITCH[ornament.on]) || basePitch(main);
  if (!pitch) return main;
  var graces = '';
  for (var n = 0; n < GRACE_COUNT[ornament.type]; n++) graces += pitch;
  return '{/' + graces + '}' + main;
}

/** The link character for an ornament ('-' for none). */
export function ornamentChar(ornament) {
  if (!ornament) return '-';
  var chars = CHARS[ornament.on || 'same'];
  var index = TYPES.indexOf(ornament.type);
  if (!chars || index < 0) return '-';
  return chars[index];
}

/** The ornament for a link character, or null. */
export function ornamentFromChar(ch) {
  for (var target in CHARS) {
    var index = CHARS[target].indexOf(ch);
    if (index >= 0) return { type: TYPES[index], on: target == 'same' ? null : target };
  }
  return null;
}

/**
 * The grace notes to play before a note: how many, and which sound.
 * @returns {{count: number, midiNote: number} | null}
 */
export function graceNotesForToken(token) {
  var parts = splitGrace(token);
  if (!parts.grace) return null;
  var graces = pitchesIn(parts.grace);
  if (!graces.length) return null;
  var midiNote = GRACE_MIDI[graces[0]];
  if (midiNote === undefined) return null;
  return { count: Math.min(graces.length, 3), midiNote: midiNote };
}

// --- grace-note timing ----------------------------------------------------------

/** Default gap between a flam's grace note and its note, in milliseconds. */
export var DEFAULT_GRACE_SPACING_MS = 30;
/**
 * Drags and ruffs are spaced wider than flams (by this much), so each grace note
 * is heard, like an open, even double stroke: 45 ms at the default 30.
 */
export var DRAG_SPACING_FACTOR = 1.5;
/** Default grace-note volume, as a percentage of a normal hit. */
export var DEFAULT_GRACE_VOLUME = 40;
var MIN_GRACE_SPACING_MS = 15;
var MAX_GRACE_SPACING_MS = 150;

/** Clamp a grace spacing (ms) to the allowed range, falling back to the default. */
export function clampGraceSpacing(ms) {
  ms = parseInt(String(ms), 10);
  if (isNaN(ms)) return DEFAULT_GRACE_SPACING_MS;
  return Math.min(Math.max(ms, MIN_GRACE_SPACING_MS), MAX_GRACE_SPACING_MS);
}

/** Clamp a grace volume (%) to 5..100, falling back to the default. */
export function clampGraceVolume(percent) {
  percent = parseInt(String(percent), 10);
  if (isNaN(percent)) return DEFAULT_GRACE_VOLUME;
  return Math.min(Math.max(percent, 5), 100);
}
