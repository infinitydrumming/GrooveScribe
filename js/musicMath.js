// Time-signature and note-division math (Step 2 extraction). Pure functions
// with no DOM/GrooveUtils dependency — they only call each other. GrooveUtils
// delegates its matching methods here.
//
// Modified by Infinity Drumming, 2026: classic beam groups for x/8 bars
// (beamGroupEnds). See CHANGES.md.

export function parseTimeSigString(timeSigString) {
  var split_arr = timeSigString.split('/');

  if (split_arr.length != 2) return [4, 4];

  var timeSigTop = parseInt(split_arr[0], 10);
  var timeSigBottom = parseInt(split_arr[1], 10);

  if (timeSigTop < 1 || timeSigTop > 32) timeSigTop = 4;

  // only valid if 2,4,8, or 16
  if (timeSigBottom != 2 && timeSigBottom != 4 && timeSigBottom != 8 && timeSigBottom != 16)
    timeSigBottom = 4;

  return [timeSigTop, timeSigBottom];
}

export function calc_notes_per_measure(division, time_sig_top, time_sig_bottom) {
  var numNotes = (division / time_sig_bottom) * time_sig_top;

  return numNotes;
}

export function isTripletDivision(division) {
  if (division % 12 === 0)
    // we only support 12 & 24 & 48  1/8th, 1/16, & 1/32 note triplets
    return true;

  return false;
}

export function isTripletDivisionFromNotesPerMeasure(notesPerMeasure, timeSigTop, timeSigBottom) {
  var division = (notesPerMeasure / timeSigTop) * timeSigBottom;

  return isTripletDivision(division);
}

export function noteGroupingSize(notes_per_measure, timeSigTop, timeSigBottom) {
  var note_grouping;
  var usingTriplets = isTripletDivisionFromNotesPerMeasure(
    notes_per_measure,
    timeSigTop,
    timeSigBottom
  );

  if (usingTriplets) {
    // triplets  ( we only support 2/4 here )
    if (timeSigTop != 2 && timeSigBottom != 4)
      console.log('Triplets are only supported in 2/4 and 4/4 time');
    note_grouping = notes_per_measure / (timeSigTop * (4 / timeSigBottom));
  } else if (timeSigTop == 3) {
    // 3/4, 3/8, 3/16
    // 3 groups
    // not triplets
    note_grouping = notes_per_measure / 3;
  } else if (timeSigTop % 6 == 0 && timeSigBottom % 8 == 0) {
    // 6/8, 12/8
    // 2 groups in 6/8 rather than 3 groups
    // 4 groups in 12/8
    // not triplets
    note_grouping = notes_per_measure / ((2 * timeSigTop) / 6);
  } else {
    // figure it out from the time signature
    // not triplets
    note_grouping = (notes_per_measure / timeSigTop) * (timeSigBottom / 4);
  }
  return note_grouping;
}

export function notesPerMeasureInFullSizeArray(is_triplet_division, timeSigTop, timeSigBottom) {
  // a full measure will be defined as 8 * timeSigTop.   (4 = 32, 5 = 40, 6 = 48, etc.)
  // that implies 32nd notes in quarter note beats
  // TODO: should we support triplets here?
  if (is_triplet_division) return 48 * (timeSigTop / timeSigBottom);
  else return 32 * (timeSigTop / timeSigBottom);
}

export function getNoteScaler(notes_per_measure, timeSigTop, timeSigBottom) {
  var scaler;

  if (!timeSigTop || timeSigTop < 1 || timeSigTop > 36) {
    console.log('Error in getNoteScaler, out of range: ' + timeSigTop);
    scaler = 1;
  } else {
    if (isTripletDivisionFromNotesPerMeasure(notes_per_measure, timeSigTop, timeSigBottom))
      scaler = Math.ceil(
        notesPerMeasureInFullSizeArray(true, timeSigTop, timeSigBottom) / notes_per_measure
      );
    else
      scaler = Math.ceil(
        notesPerMeasureInFullSizeArray(false, timeSigTop, timeSigBottom) / notes_per_measure
      );
  }

  return scaler;
}

export function scaleNoteArrayToFullSize(
  note_array,
  num_measures,
  notes_per_measure,
  timeSigTop,
  timeSigBottom
) {
  var scaler = getNoteScaler(notes_per_measure, timeSigTop, timeSigBottom); // fill proportionally
  var retArray = [];
  isTripletDivisionFromNotesPerMeasure(notes_per_measure, timeSigTop, timeSigBottom);
  var i;

  if (scaler == 1) return note_array; // no need to expand

  // preset to false (rest) all entries in the expanded array
  for (i = 0; i < num_measures * notes_per_measure * scaler; i++) retArray[i] = false;

  // sparsely fill in the return array with data from passed in array
  for (i = 0; i < num_measures * notes_per_measure; i++) {
    var ret_array_index = i * scaler;

    retArray[ret_array_index] = note_array[i];
  }

  return retArray;
}

// --- Classic beaming for x/8 bars (Infinity Drumming, 2026) ---------------------
// 8th notes are beamed in groups of 2 and 3, the 3s first: 5/8 = 3+2, 8/8 = 3+3+2,
// except 7/8 = 2+2+3, the usual way it is written.  3/8 is one group of 3.  6/8,
// 9/8, 12/8 and 15/8 stay in groups of 3, as they always were.
var EIGHTH_NOTE_GROUPS = {
  2: [2],
  3: [3],
  4: [2, 2],
  5: [3, 2],
  7: [2, 2, 3],
  8: [3, 3, 2],
  10: [3, 3, 2, 2],
  11: [3, 3, 3, 2],
  13: [3, 3, 3, 2, 2],
  14: [3, 3, 3, 3, 2],
};

/**
 * Where the beamed groups of an x/8 bar end, counted in its note slots (e.g. a
 * 5/8 bar of 10 16th notes -> [6, 10]); null for every other time signature,
 * which keeps its even groups.
 */
export function beamGroupEnds(timeSigTop, timeSigBottom, slotsPerBar) {
  var groups = timeSigBottom == 8 ? EIGHTH_NOTE_GROUPS[timeSigTop] : null;
  if (!groups) return null;
  var slotsPerEighth = slotsPerBar / timeSigTop;
  var ends = [];
  var at = 0;
  groups.forEach(function (eighths) {
    at += eighths * slotsPerEighth;
    ends.push(at);
  });
  return ends;
}
