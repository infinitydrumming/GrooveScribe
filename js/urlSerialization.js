// Modified by Infinity Drumming, 2026: sections (A, B) and bar numbers, 32nds beat by beat, an exercise's practice settings and instructions, mid tom, crash and ride lines in URLs, full-editor links point to groove.infinitydrumming.com, ride accent, Brazilian swing, straight bars, flams / drags / ruffs on any line, a time signature per bar, practice timer, counting and its choices, more metronome clicks, diddle lines, beat-by-beat notes. See CHANGES.md.
// URL <-> grooveData serialization (Step 2 extraction from groove_utils.js).
// Pure module: it depends only on other pure modules (grooveData, musicMath,
// noteArrays) — no GrooveUtils instance. GrooveUtils delegates its
// getGrooveDataFromUrlString / getUrlStringFromGrooveData methods here, passing
// its instance flags through the parse function's `config` argument.

import { createGrooveData } from './grooveData.js';
import {
  constant_ABC_HH_Crash,
  constant_ABC_RD_Accent,
  constant_DEFAULT_TEMPO,
  constant_MAX_MEASURES,
} from './constants.js';
import { parseTimeSigString, calc_notes_per_measure } from './musicMath.js';
import { parsePracticeLimit, practiceLimitToText } from './practiceTimer.js';
import { metronomeIsOn, parseMetronomeFrequency } from './metronome.js';
import { sectionsFromUrl, sectionsToUrl } from './sections.js';
import { practiceSettingsFromUrl, practiceSettingsToUrl } from './practiceSettings.js';
import { countModeFromUrl, countModeToUrl } from './countModes.js';
import {
  beatsFromList,
  beatsToList,
  hasBeatNotes,
  inferBeats,
  normalizeBeats,
} from './beatNotes.js';
import {
  barSig,
  barSigsFromList,
  barSigsToList,
  barStride,
  barNoteCount,
  barSlice,
  isMixedMeter,
} from './barMeters.js';
import {
  DEFAULT_GRACE_SPACING_MS,
  DEFAULT_GRACE_VOLUME,
  clampGraceSpacing,
  clampGraceVolume,
} from './ornaments.js';

// Flams, drags and ruffs ride on ornament lines next to each note line:
// "SO" for the snare, "KO" for the kick, "HO" for the hi-hat line, "T1O" for tom 1, and so on.
function ornamentLines(myGrooveData) {
  return {
    HO: myGrooveData.hh_array,
    SO: myGrooveData.snare_array,
    KO: myGrooveData.kick_array,
    T1O: myGrooveData.toms_array[0],
    T2O: myGrooveData.toms_array[1],
    T3O: myGrooveData.toms_array[2],
    T4O: myGrooveData.toms_array[3],
    CO: myGrooveData.crash_array,
    RO: myGrooveData.ride_array,
  };
}

// Each bar's time signature ("BarSigs=4/4,2/4,..."), when they differ: sets
// barTimeSigs and the bar stride, and returns each bar's note count (null when
// the bars are all the same).
function readBarTimeSigs(myGrooveData, encodedURLData) {
  var sigs = barSigsFromList(
    getQueryVariableFromString('BarSigs', '', encodedURLData),
    myGrooveData.numberOfMeasures,
    myGrooveData.numBeats,
    myGrooveData.noteValue
  );
  if (!isMixedMeter(sigs, myGrooveData.numberOfMeasures)) return null;
  myGrooveData.barTimeSigs = sigs;
  myGrooveData.notesPerMeasure = barStride(
    myGrooveData.timeDivision,
    sigs,
    myGrooveData.numberOfMeasures,
    myGrooveData.numBeats,
    myGrooveData.noteValue
  );
  return sigs.map(function (sig) {
    return barNoteCount(myGrooveData.timeDivision, sig);
  });
}

// A line of notes from a link: bar by bar when the bars have different lengths
function readNoteLine(drumType, noteString, notesPerMeasure, numberOfMeasures, barCounts) {
  if (barCounts) return noteArraysFromBarTabs(drumType, noteString, barCounts, notesPerMeasure);
  return noteArraysFromURLData(drumType, noteString, notesPerMeasure, numberOfMeasures);
}

// "&BarSigs=..." for a link when the bars have different time signatures
function barSigsForUrl(myGrooveData) {
  var list = barSigsToList(myGrooveData.barTimeSigs, myGrooveData.numberOfMeasures);
  return list ? '&BarSigs=' + list : '';
}

// A tab line writer for a link: bars of different lengths are written each with
// only their own notes ("|x-x-x-x-|x-x-|"); otherwise as it always was.
function tabLineWriter(myGrooveData, total_notes) {
  var mixed = isMixedMeter(myGrooveData.barTimeSigs, myGrooveData.numberOfMeasures);
  var stride = myGrooveData.notesPerMeasure;
  return function (writeLine, noteArray) {
    if (!mixed) return writeLine(noteArray, total_notes, stride);
    var line = '';
    for (var bar = 0; bar < myGrooveData.numberOfMeasures; bar++) {
      var count = barNoteCount(myGrooveData.timeDivision, myGrooveData.barTimeSigs[bar]);
      line += writeLine(barSlice(noteArray, bar, stride, count), count, count);
    }
    return line;
  };
}

// read the ornament lines and the grace-note settings from a link
function readOrnaments(myGrooveData, encodedURLData, barCounts) {
  var lines = ornamentLines(myGrooveData);
  for (var name in lines) {
    var ornaments = getQueryVariableFromString(name, false, encodedURLData);
    if (!ornaments || !lines[name]) continue;
    if (barCounts)
      applyOrnamentBarTabs(lines[name], ornaments, barCounts, myGrooveData.notesPerMeasure);
    else applyOrnamentTabLine(lines[name], ornaments);
  }
  myGrooveData.graceSpacingMs = clampGraceSpacing(
    getQueryVariableFromString('GraceMs', DEFAULT_GRACE_SPACING_MS, encodedURLData)
  );
  myGrooveData.graceVolume = clampGraceVolume(
    getQueryVariableFromString('GraceVol', DEFAULT_GRACE_VOLUME, encodedURLData)
  );
}

// The Mixed note setting's beats, bar by bar ("Beats=ssqq,ssss", see
// beatNotes.js).  A bar without them gets them from its notes.  In the 32nds
// note setting only a link with them has them ("Beats=sssd": 32nd notes on beat 4).
function readBeatNotes(myGrooveData, encodedURLData) {
  myGrooveData.beatNotes = [];
  var list = getQueryVariableFromString('Beats', '', encodedURLData);
  var grid = myGrooveData.timeDivision;
  if (grid != 48 && !(grid == 32 && list)) return;
  var listed = beatsFromList(list, myGrooveData.numberOfMeasures);
  var lines = [
    myGrooveData.hh_array,
    myGrooveData.snare_array,
    myGrooveData.kick_array,
    myGrooveData.crash_array,
    myGrooveData.ride_array,
  ].concat(myGrooveData.toms_array);
  for (var bar = 0; bar < myGrooveData.numberOfMeasures; bar++) {
    var sig = barSig(myGrooveData.barTimeSigs, bar, myGrooveData.numBeats, myGrooveData.noteValue);
    if (!hasBeatNotes(sig)) myGrooveData.beatNotes.push('');
    else if (listed[bar])
      myGrooveData.beatNotes.push(normalizeBeats(listed[bar], sig, undefined, grid));
    else
      myGrooveData.beatNotes.push(inferBeats(lines, bar * myGrooveData.notesPerMeasure, sig, grid));
  }
}

// Diddles ride on lines of their own next to each note line: "SD" for the
// snare, "HD" for the hi-hat line, "T1D" for tom 1, and so on ("d" on a note).
/**
 * @param {Object<string, *>} lines  ornament lines by name ("SO", "HO" ...)
 * @returns {Object<string, *>}  the same lines by diddle name ("SD", "HD" ...)
 */
function diddleLines(lines) {
  var diddles = {};
  for (var name in lines) diddles[name.replace(/O$/, 'D')] = lines[name];
  return diddles;
}

// read the diddle lines from a link
function readDiddles(myGrooveData, encodedURLData, barCounts) {
  var lines = diddleLines(ornamentLines(myGrooveData));
  for (var name in lines) {
    var diddles = getQueryVariableFromString(name, false, encodedURLData);
    if (!diddles || !lines[name]) continue;
    if (barCounts)
      applyDiddleBarTabs(lines[name], diddles, barCounts, myGrooveData.notesPerMeasure);
    else applyDiddleTabLine(lines[name], diddles);
  }
}

// the diddle lines that have any diddles (written for the H, C and R lines as
// they go into the link)
function diddlesForUrl(myGrooveData, hhLine, crashLine, rideLine, tabWriter) {
  var lines = ornamentLines(myGrooveData);
  lines.HO = hhLine;
  lines.CO = crashLine;
  lines.RO = rideLine;
  if (!myGrooveData.showToms) lines.T1O = lines.T2O = lines.T4O = null;
  lines.T3O = null; // tom 3 isn't written to links
  var diddles = diddleLines(lines);
  var url = '';
  for (var name in diddles) {
    if (!diddles[name]) continue;
    var tab = tabWriter(diddleTabLine, diddles[name]);
    if (/[^-|]/.test(tab)) url += '&' + name + '=|' + tab;
  }
  return url;
}

// the ornament lines that have any ornaments (written for the H, C and R lines
// as they go into the link), and the grace-note settings when they are changed
function ornamentsForUrl(myGrooveData, hhLine, crashLine, rideLine, tabWriter) {
  var lines = ornamentLines(myGrooveData);
  lines.HO = hhLine;
  lines.CO = crashLine;
  lines.RO = rideLine;
  if (!myGrooveData.showToms) lines.T1O = lines.T2O = lines.T4O = null;
  lines.T3O = null; // tom 3 isn't written to links
  var url = '';
  for (var name in lines) {
    if (!lines[name]) continue;
    var tab = tabWriter(ornamentTabLine, lines[name]);
    if (/[^-|]/.test(tab)) url += '&' + name + '=|' + tab;
  }
  if (myGrooveData.graceSpacingMs && myGrooveData.graceSpacingMs != DEFAULT_GRACE_SPACING_MS)
    url += '&GraceMs=' + myGrooveData.graceSpacingMs;
  if (myGrooveData.graceVolume && myGrooveData.graceVolume != DEFAULT_GRACE_VOLUME)
    url += '&GraceVol=' + myGrooveData.graceVolume;
  return url;
}
import {
  noteArraysFromURLData,
  noteArraysFromBarTabs,
  tabLineFromAbcNoteArray,
  ornamentTabLine,
  applyOrnamentTabLine,
  applyOrnamentBarTabs,
  diddleTabLine,
  applyDiddleTabLine,
  applyDiddleBarTabs,
  GetDefaultStickingsGroove,
  GetDefaultHHGroove,
  GetDefaultSnareGroove,
  GetDefaultKickGroove,
  GetDefaultTomGroove,
  GetEmptyGroove,
} from './noteArrays.js';

// "2,4" -> [false, true, false, true] for 4 bars (numbers outside the groove are ignored)
function straightBarsFromList(list, numberOfMeasures) {
  var straightBars = [];
  for (var bar = 0; bar < numberOfMeasures; bar++) straightBars.push(false);
  list.split(',').forEach(function (value) {
    var barNum = parseInt(value, 10);
    if (barNum >= 1 && barNum <= numberOfMeasures) straightBars[barNum - 1] = true;
  });
  return straightBars;
}

// [false, true, false, true] -> "2,4" ('' when no bar is straight)
function straightBarsToList(straightBars, numberOfMeasures) {
  var numbers = [];
  (straightBars || []).forEach(function (straight, bar) {
    if (straight && bar < numberOfMeasures) numbers.push(bar + 1);
  });
  return numbers.join(',');
}

// Text typed into a link parameter: encodeURIComponent'd ("+" may also stand
// for a space, as in older links); a stray "%" is kept as it is
function decodeText(value) {
  return decodeURIComponent(
    String(value || '')
      .replace(/\+/g, ' ')
      .replace(/%(?![0-9a-fA-F]{2})/g, '%25')
  );
}

export function getQueryVariableFromString(variable, def_value, my_string) {
  // Tolerate query strings with or without a leading '?'. window.location.search
  // and share URLs include it; some callers (e.g. GrooveDisplay embeds) pass a
  // bare 'Name=value&...' string. Only strip the '?' when it is actually there,
  // otherwise the first parameter name loses its first character.
  var query = my_string.charAt(0) === '?' ? my_string.substring(1) : my_string;
  var vars = query.split('&');
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split('=');
    if (pair[0].toLowerCase() == variable.toLowerCase()) {
      return pair[1];
    }
  }
  return def_value;
}

/**
 * Parse an encoded groove URL (query string) into a {@link GrooveData}.
 *
 * @param {string} encodedURLData  The URL / query string to parse.
 * @param {{debugMode?: (boolean|number), grooveDBAuthoring?: boolean, viewMode?: boolean}} [config]
 *   Instance flags to seed the new GrooveData with (passed by GrooveUtils).
 * @returns {import('./grooveData.js').GrooveData}
 */
export function getGrooveDataFromUrlString(encodedURLData, config = {}) {
  var Stickings_string;
  var HH_string;
  var Snare_string;
  var Kick_string;
  var myGrooveData = createGrooveData(config);
  var i;

  myGrooveData.debugMode = parseInt(
    getQueryVariableFromString('Debug', myGrooveData.debugMode, encodedURLData),
    10
  );

  var timeSigArray = parseTimeSigString(
    getQueryVariableFromString('TimeSig', '4/4', encodedURLData)
  );
  myGrooveData.numBeats = timeSigArray[0];
  myGrooveData.noteValue = timeSigArray[1];

  myGrooveData.timeDivision = parseInt(getQueryVariableFromString('Div', 16, encodedURLData), 10);
  myGrooveData.notesPerMeasure = calc_notes_per_measure(
    myGrooveData.timeDivision,
    myGrooveData.numBeats,
    myGrooveData.noteValue
  );

  // 0 (off), 1 (once a bar), 4, 8, 16, 12 (triplets), 24, "8s", "16s", "4d" (see metronome.js)
  myGrooveData.metronomeFrequency = parseMetronomeFrequency(
    getQueryVariableFromString('MetronomeFreq', '0', encodedURLData)
  );

  // "Groove / click bars" practice option (Infinity Drumming): on when GrooveBars
  // is present; each count is 1-32 bars, 4 if missing or not a number.
  var grooveBars = getQueryVariableFromString('GrooveBars', false, encodedURLData);
  if (grooveBars !== false) {
    var practiceBars = function (value) {
      var bars = parseInt(value, 10);
      return isNaN(bars) ? 4 : Math.min(Math.max(bars, 1), 32);
    };
    myGrooveData.grooveClickGrooveBars = practiceBars(grooveBars);
    myGrooveData.grooveClickClickBars = practiceBars(
      getQueryVariableFromString('ClickBars', '4', encodedURLData)
    );
  }

  // counting over the notes (Infinity Drumming)
  var count = countModeFromUrl(getQueryVariableFromString('Count', '0', encodedURLData));
  myGrooveData.showCounts = count.show;
  myGrooveData.countMode = count.mode;

  // practice timer (Infinity Drumming): "10m" or "16b"
  myGrooveData.practiceLimit = practiceLimitToText(
    parsePracticeLimit(getQueryVariableFromString('Practice', '', encodedURLData))
  );

  myGrooveData.numberOfMeasures = parseInt(
    getQueryVariableFromString('measures', 1, encodedURLData),
    10
  );
  if (myGrooveData.numberOfMeasures < 1 || isNaN(myGrooveData.numberOfMeasures))
    myGrooveData.numberOfMeasures = 1;
  else if (myGrooveData.numberOfMeasures > constant_MAX_MEASURES)
    myGrooveData.numberOfMeasures = constant_MAX_MEASURES;

  // StraightBars=2,4: those bars (1-based) play straight when the groove is swung
  myGrooveData.straightBars = straightBarsFromList(
    String(getQueryVariableFromString('StraightBars', '', encodedURLData)),
    myGrooveData.numberOfMeasures
  );

  // Sections=A1-2x4,B3-4x2: the groove's sections and how many times each plays
  var sections = sectionsFromUrl(
    getQueryVariableFromString('Sections', '', encodedURLData),
    myGrooveData.numberOfMeasures
  );
  myGrooveData.barSections = sections.letters;
  myGrooveData.sectionRepeats = sections.repeats;

  // a time signature for each bar, when they differ: every bar keeps the longest
  // bar's number of note slots, and each bar's notes are read into its own
  var barCounts = readBarTimeSigs(myGrooveData, encodedURLData);

  Stickings_string = getQueryVariableFromString('Stickings', false, encodedURLData);
  if (!Stickings_string) {
    Stickings_string = GetDefaultStickingsGroove(
      myGrooveData.notesPerMeasure,
      myGrooveData.numBeats,
      myGrooveData.noteValue,
      myGrooveData.numberOfMeasures
    );
    myGrooveData.showStickings = false;
  } else {
    myGrooveData.showStickings = true;
  }

  HH_string = getQueryVariableFromString('H', false, encodedURLData);
  if (!HH_string) {
    HH_string = GetDefaultHHGroove(
      myGrooveData.notesPerMeasure,
      myGrooveData.numBeats,
      myGrooveData.noteValue,
      myGrooveData.numberOfMeasures
    );
  }

  Snare_string = getQueryVariableFromString('S', false, encodedURLData);
  if (!Snare_string) {
    Snare_string = GetDefaultSnareGroove(
      myGrooveData.notesPerMeasure,
      myGrooveData.numBeats,
      myGrooveData.noteValue,
      myGrooveData.numberOfMeasures
    );
  }

  Kick_string = getQueryVariableFromString('K', false, encodedURLData);
  if (!Kick_string) {
    Kick_string = GetDefaultKickGroove(
      myGrooveData.notesPerMeasure,
      myGrooveData.numBeats,
      myGrooveData.noteValue,
      myGrooveData.numberOfMeasures
    );
  }

  // Get the Toms
  for (i = 0; i < 4; i++) {
    // toms are named T1, T2, T3, T4
    var Tom_string = getQueryVariableFromString('T' + (i + 1), false, encodedURLData);
    if (!Tom_string) {
      Tom_string = GetDefaultTomGroove(
        myGrooveData.notesPerMeasure,
        myGrooveData.numBeats,
        myGrooveData.noteValue,
        myGrooveData.numberOfMeasures
      );
    } else {
      myGrooveData.showToms = true;
    }

    /// the toms array index starts at zero (0) the first one is T1
    myGrooveData.toms_array[i] = readNoteLine(
      'T' + (i + 1),
      Tom_string,
      myGrooveData.notesPerMeasure,
      myGrooveData.numberOfMeasures,
      barCounts
    );
  }

  // Crash line (C) and ride line (R).  Older URLs carry crashes and rides in the
  // hi-hat line instead; those stay in hh_array and render the same way.
  var emptyGroove = GetEmptyGroove(myGrooveData.notesPerMeasure, myGrooveData.numberOfMeasures);
  myGrooveData.crash_array = readNoteLine(
    'C',
    getQueryVariableFromString('C', false, encodedURLData) || emptyGroove,
    myGrooveData.notesPerMeasure,
    myGrooveData.numberOfMeasures,
    barCounts
  );
  myGrooveData.ride_array = readNoteLine(
    'R',
    getQueryVariableFromString('R', false, encodedURLData) || emptyGroove,
    myGrooveData.notesPerMeasure,
    myGrooveData.numberOfMeasures,
    barCounts
  );

  myGrooveData.sticking_array = readNoteLine(
    'Stickings',
    Stickings_string,
    myGrooveData.notesPerMeasure,
    myGrooveData.numberOfMeasures,
    barCounts
  );
  myGrooveData.hh_array = readNoteLine(
    'H',
    HH_string,
    myGrooveData.notesPerMeasure,
    myGrooveData.numberOfMeasures,
    barCounts
  );
  myGrooveData.snare_array = readNoteLine(
    'S',
    Snare_string,
    myGrooveData.notesPerMeasure,
    myGrooveData.numberOfMeasures,
    barCounts
  );
  myGrooveData.kick_array = readNoteLine(
    'K',
    Kick_string,
    myGrooveData.notesPerMeasure,
    myGrooveData.numberOfMeasures,
    barCounts
  );

  myGrooveData.title = getQueryVariableFromString('title', '', encodedURLData);
  myGrooveData.title = decodeURIComponent(myGrooveData.title);
  myGrooveData.title = myGrooveData.title.replace(/\+/g, ' ');

  myGrooveData.author = getQueryVariableFromString('author', '', encodedURLData);
  myGrooveData.author = decodeURIComponent(myGrooveData.author);
  myGrooveData.author = myGrooveData.author.replace(/\+/g, ' ');

  myGrooveData.comments = getQueryVariableFromString('comments', '', encodedURLData);
  myGrooveData.comments = decodeURIComponent(myGrooveData.comments);
  myGrooveData.comments = myGrooveData.comments.replace(/\+/g, ' ');

  // an exercise's instructions and practice settings (Infinity Drumming)
  myGrooveData.instructions = decodeText(
    getQueryVariableFromString('Instructions', '', encodedURLData)
  );
  myGrooveData.practice = practiceSettingsFromUrl(function (name, fallback) {
    return getQueryVariableFromString(name, fallback, encodedURLData);
  });

  myGrooveData.tempo = parseInt(
    getQueryVariableFromString('tempo', constant_DEFAULT_TEMPO, encodedURLData),
    10
  );
  if (isNaN(myGrooveData.tempo) || myGrooveData.tempo < 20 || myGrooveData.tempo > 400)
    myGrooveData.tempo = constant_DEFAULT_TEMPO;

  myGrooveData.swingPercent = parseInt(getQueryVariableFromString('swing', 0, encodedURLData), 10);
  if (
    isNaN(myGrooveData.swingPercent) ||
    myGrooveData.swingPercent < 0 ||
    myGrooveData.swingPercent > 100
  )
    myGrooveData.swingPercent = 0;

  // SwingStyle=brazilian: the e is late and the a early (long-short-short-long)
  var swingStyle = String(getQueryVariableFromString('swingstyle', '', encodedURLData));
  myGrooveData.swingStyle = swingStyle.toLowerCase() == 'brazilian' ? 'brazilian' : 'swing';

  readOrnaments(myGrooveData, encodedURLData, barCounts);
  readDiddles(myGrooveData, encodedURLData, barCounts);
  readBeatNotes(myGrooveData, encodedURLData);

  return myGrooveData;
}

// "Groove / click bars", when it is on (and Save & Share includes the practice
// settings)
function grooveClickForUrl(myGrooveData) {
  if (myGrooveData.includePractice === false || !myGrooveData.grooveClickGrooveBars) return '';
  return (
    '&GrooveBars=' +
    myGrooveData.grooveClickGrooveBars +
    '&ClickBars=' +
    myGrooveData.grooveClickClickBars
  );
}

// The practice timer and the other practice settings that are on
// (practiceSettings.js); none when Save & Share's "Include practice settings"
// box is unticked.
function practiceForUrl(myGrooveData) {
  if (myGrooveData.includePractice === false) return '';
  var url = myGrooveData.practiceLimit ? '&Practice=' + myGrooveData.practiceLimit : '';
  return url + practiceSettingsToUrl(myGrooveData.practice);
}

/**
 * Serialize a {@link GrooveData} back into an encoded groove URL string.
 *
 * @param {import('./grooveData.js').GrooveData} myGrooveData  The groove to serialize.
 * @param {string} [url_destination]  Optional base URL to prepend.
 * @returns {string}
 */
export function getUrlStringFromGrooveData(myGrooveData, url_destination) {
  var fullURL = window.location.protocol + '//' + window.location.host + window.location.pathname;

  if (!url_destination) {
    // then assume it is the groove writer display.  Do nothing
  } else if (url_destination == 'display') {
    // asking for the "groove_display" page
    if (fullURL.includes('index.html')) fullURL = fullURL.replace('index.html', 'GrooveEmbed.html');
    else if (fullURL.includes('/gscribe'))
      fullURL = fullURL.replace('/gscribe', '/groove/GrooveEmbed.html');
    else fullURL += 'GrooveEmbed.html';
  } else if (url_destination == 'fullGrooveScribe') {
    // asking for the full GrooveScribe link
    fullURL = 'https://groove.infinitydrumming.com/';
  }

  fullURL += '?';

  if (myGrooveData.debugMode) fullURL += 'Debug=1&';

  if (myGrooveData.viewMode) fullURL += 'Mode=view&';

  if (myGrooveData.grooveDBAuthoring) fullURL += 'GDB_Author=1&';

  fullURL += 'TimeSig=' + myGrooveData.numBeats + '/' + myGrooveData.noteValue;

  // # of notes
  fullURL += '&Div=' + myGrooveData.timeDivision;

  if (myGrooveData.title !== '') fullURL += '&Title=' + encodeURIComponent(myGrooveData.title);

  if (myGrooveData.author !== '') fullURL += '&Author=' + encodeURIComponent(myGrooveData.author);

  if (myGrooveData.comments !== '')
    fullURL += '&Comments=' + encodeURIComponent(myGrooveData.comments);

  fullURL += '&Tempo=' + myGrooveData.tempo;

  if (myGrooveData.swingPercent > 0) fullURL += '&Swing=' + myGrooveData.swingPercent;
  if (myGrooveData.swingStyle == 'brazilian') fullURL += '&SwingStyle=brazilian';

  // # of measures
  fullURL += '&Measures=' + myGrooveData.numberOfMeasures;

  // # metronome setting
  if (metronomeIsOn(myGrooveData.metronomeFrequency)) {
    fullURL += '&MetronomeFreq=' + myGrooveData.metronomeFrequency;
  }

  // straight bars in a swung groove, only when there are any
  var straightList = straightBarsToList(myGrooveData.straightBars, myGrooveData.numberOfMeasures);
  if (straightList) fullURL += '&StraightBars=' + straightList;

  // the sections, only when there are any
  var sections = sectionsToUrl(
    myGrooveData.barSections || [],
    myGrooveData.sectionRepeats || [],
    myGrooveData.numberOfMeasures
  );
  if (sections) fullURL += '&Sections=' + sections;

  // "Groove / click bars" practice option, only when it is on
  fullURL += grooveClickForUrl(myGrooveData);

  // counting over the notes, only when it is on
  fullURL += countModeToUrl(myGrooveData.showCounts, myGrooveData.countMode);

  // practice timer and the other practice settings (unless Save & Share's box
  // leaves them out)
  fullURL += practiceForUrl(myGrooveData);

  // the teacher's instructions for the exercise
  if (myGrooveData.instructions)
    fullURL += '&Instructions=' + encodeURIComponent(myGrooveData.instructions);

  // a time signature for each bar, when they differ
  fullURL += barSigsForUrl(myGrooveData);

  // the Mixed note setting's beats, bar by bar (and 32nds with beats of their own)
  var beatGrid = myGrooveData.timeDivision == 48 || myGrooveData.timeDivision == 32;
  if (beatGrid && (myGrooveData.beatNotes || []).some(Boolean))
    fullURL += '&Beats=' + beatsToList(myGrooveData.beatNotes);

  // notes
  var total_notes = myGrooveData.notesPerMeasure * myGrooveData.numberOfMeasures;
  var tabWriter = tabLineWriter(myGrooveData, total_notes);
  var writeTab = function (drumType, noteArray) {
    return tabWriter(function (notes, maxLength, separatorDistance) {
      return tabLineFromAbcNoteArray(drumType, notes, true, true, maxLength, separatorDistance);
    }, noteArray);
  };

  // Cymbal lines: wherever the hi-hat is silent, a ride (or else a crash 1)
  // is written into the H line exactly as older versions did, so the link still
  // plays everywhere.  Only what doesn't fit there goes into C= and R=.
  var hhLine = myGrooveData.hh_array.slice(0, total_notes);
  var crashLine = (myGrooveData.crash_array || []).slice(0, total_notes);
  var rideLine = (myGrooveData.ride_array || []).slice(0, total_notes);
  for (var n = 0; n < total_notes; n++) {
    if (hhLine[n]) continue;
    // (an accented ride stays in R=: older versions read "R" in H as a plain ride)
    if (rideLine[n] && rideLine[n] != constant_ABC_RD_Accent) {
      hhLine[n] = rideLine[n];
      rideLine[n] = false;
    } else if (crashLine[n] == constant_ABC_HH_Crash) {
      hhLine[n] = crashLine[n];
      crashLine[n] = false;
    }
  }

  var HH = '&H=|' + writeTab('H', hhLine);
  var Snare = '&S=|' + writeTab('S', myGrooveData.snare_array);
  var Kick = '&K=|' + writeTab('K', myGrooveData.kick_array);

  fullURL += HH + Snare + Kick;

  // only add if we need them.  // they are long and ugly. :)
  if (myGrooveData.showToms) {
    var Tom1 = '&T1=|' + writeTab('T1', myGrooveData.toms_array[0]);
    // Mid tom (T2): only written when it has notes, so grooves that don't use it
    // keep exactly the same URL as before the mid tom existed.
    var Tom2 = '';
    var midTom = myGrooveData.toms_array[1];
    if (midTom && midTom.slice(0, total_notes).some(Boolean))
      Tom2 = '&T2=|' + writeTab('T2', midTom);
    var Tom4 = '&T4=|' + writeTab('T4', myGrooveData.toms_array[3]);
    fullURL += Tom1 + Tom2 + Tom4;
  }

  if (crashLine.some(Boolean)) fullURL += '&C=|' + writeTab('C', crashLine);
  if (rideLine.some(Boolean)) fullURL += '&R=|' + writeTab('R', rideLine);

  fullURL += ornamentsForUrl(myGrooveData, hhLine, crashLine, rideLine, tabWriter);
  fullURL += diddlesForUrl(myGrooveData, hhLine, crashLine, rideLine, tabWriter);

  // only add if we need them.  // they are long and ugly. :)
  if (myGrooveData.showStickings) {
    var Stickings = '&Stickings=|' + writeTab('stickings', myGrooveData.sticking_array);
    fullURL += Stickings;
  }

  return fullURL;
}
