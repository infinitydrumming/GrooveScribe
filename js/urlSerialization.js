// Modified by Infinity Drumming, 2026: mid tom, crash and ride lines in URLs, full-editor links point to groove.infinitydrumming.com, ride accent. See CHANGES.md.
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
import {
  noteArraysFromURLData,
  tabLineFromAbcNoteArray,
  GetDefaultStickingsGroove,
  GetDefaultHHGroove,
  GetDefaultSnareGroove,
  GetDefaultKickGroove,
  GetDefaultTomGroove,
  GetEmptyGroove,
} from './noteArrays.js';

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

  myGrooveData.metronomeFrequency = parseInt(
    getQueryVariableFromString('MetronomeFreq', '0', encodedURLData),
    10
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

  myGrooveData.numberOfMeasures = parseInt(
    getQueryVariableFromString('measures', 1, encodedURLData),
    10
  );
  if (myGrooveData.numberOfMeasures < 1 || isNaN(myGrooveData.numberOfMeasures))
    myGrooveData.numberOfMeasures = 1;
  else if (myGrooveData.numberOfMeasures > constant_MAX_MEASURES)
    myGrooveData.numberOfMeasures = constant_MAX_MEASURES;

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
    myGrooveData.toms_array[i] = noteArraysFromURLData(
      'T' + (i + 1),
      Tom_string,
      myGrooveData.notesPerMeasure,
      myGrooveData.numberOfMeasures
    );
  }

  // Crash line (C) and ride line (R).  Older URLs carry crashes and rides in the
  // hi-hat line instead; those stay in hh_array and render the same way.
  var emptyGroove = GetEmptyGroove(myGrooveData.notesPerMeasure, myGrooveData.numberOfMeasures);
  myGrooveData.crash_array = noteArraysFromURLData(
    'C',
    getQueryVariableFromString('C', false, encodedURLData) || emptyGroove,
    myGrooveData.notesPerMeasure,
    myGrooveData.numberOfMeasures
  );
  myGrooveData.ride_array = noteArraysFromURLData(
    'R',
    getQueryVariableFromString('R', false, encodedURLData) || emptyGroove,
    myGrooveData.notesPerMeasure,
    myGrooveData.numberOfMeasures
  );

  myGrooveData.sticking_array = noteArraysFromURLData(
    'Stickings',
    Stickings_string,
    myGrooveData.notesPerMeasure,
    myGrooveData.numberOfMeasures
  );
  myGrooveData.hh_array = noteArraysFromURLData(
    'H',
    HH_string,
    myGrooveData.notesPerMeasure,
    myGrooveData.numberOfMeasures
  );
  myGrooveData.snare_array = noteArraysFromURLData(
    'S',
    Snare_string,
    myGrooveData.notesPerMeasure,
    myGrooveData.numberOfMeasures
  );
  myGrooveData.kick_array = noteArraysFromURLData(
    'K',
    Kick_string,
    myGrooveData.notesPerMeasure,
    myGrooveData.numberOfMeasures
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

  return myGrooveData;
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

  // # of measures
  fullURL += '&Measures=' + myGrooveData.numberOfMeasures;

  // # metronome setting
  if (myGrooveData.metronomeFrequency !== 0) {
    fullURL += '&MetronomeFreq=' + myGrooveData.metronomeFrequency;
  }

  // "Groove / click bars" practice option, only when it is on
  if (myGrooveData.grooveClickGrooveBars > 0) {
    fullURL +=
      '&GrooveBars=' +
      myGrooveData.grooveClickGrooveBars +
      '&ClickBars=' +
      myGrooveData.grooveClickClickBars;
  }

  // notes
  var total_notes = myGrooveData.notesPerMeasure * myGrooveData.numberOfMeasures;

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

  var HH =
    '&H=|' +
    tabLineFromAbcNoteArray('H', hhLine, true, true, total_notes, myGrooveData.notesPerMeasure);
  var Snare =
    '&S=|' +
    tabLineFromAbcNoteArray(
      'S',
      myGrooveData.snare_array,
      true,
      true,
      total_notes,
      myGrooveData.notesPerMeasure
    );
  var Kick =
    '&K=|' +
    tabLineFromAbcNoteArray(
      'K',
      myGrooveData.kick_array,
      true,
      true,
      total_notes,
      myGrooveData.notesPerMeasure
    );

  fullURL += HH + Snare + Kick;

  // only add if we need them.  // they are long and ugly. :)
  if (myGrooveData.showToms) {
    var Tom1 =
      '&T1=|' +
      tabLineFromAbcNoteArray(
        'T1',
        myGrooveData.toms_array[0],
        true,
        true,
        total_notes,
        myGrooveData.notesPerMeasure
      );
    // Mid tom (T2): only written when it has notes, so grooves that don't use it
    // keep exactly the same URL as before the mid tom existed.
    var Tom2 = '';
    var midTom = myGrooveData.toms_array[1];
    if (midTom && midTom.slice(0, total_notes).some(Boolean))
      Tom2 =
        '&T2=|' +
        tabLineFromAbcNoteArray(
          'T2',
          midTom,
          true,
          true,
          total_notes,
          myGrooveData.notesPerMeasure
        );
    var Tom4 =
      '&T4=|' +
      tabLineFromAbcNoteArray(
        'T4',
        myGrooveData.toms_array[3],
        true,
        true,
        total_notes,
        myGrooveData.notesPerMeasure
      );
    fullURL += Tom1 + Tom2 + Tom4;
  }

  if (crashLine.some(Boolean))
    fullURL +=
      '&C=|' +
      tabLineFromAbcNoteArray(
        'C',
        crashLine,
        true,
        true,
        total_notes,
        myGrooveData.notesPerMeasure
      );
  if (rideLine.some(Boolean))
    fullURL +=
      '&R=|' +
      tabLineFromAbcNoteArray('R', rideLine, true, true, total_notes, myGrooveData.notesPerMeasure);

  // only add if we need them.  // they are long and ugly. :)
  if (myGrooveData.showStickings) {
    var Stickings =
      '&Stickings=|' +
      tabLineFromAbcNoteArray(
        'stickings',
        myGrooveData.sticking_array,
        true,
        true,
        total_notes,
        myGrooveData.notesPerMeasure
      );
    fullURL += Stickings;
  }

  return fullURL;
}
