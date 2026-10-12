// Modified by Infinity Drumming, 2026: mid tom, crash 2 and splash; crash and ride lines; full note length for the kick & hi-hat foot in a chord; straight / swing markings, grace notes (flams, drags, ruffs) on any drum, a time signature per bar, classic beaming in x/8 bars, counting over the notes, swing / straight markings above the counts, diddles, triplets in x/8 bars, quarter-note triplets and beat-by-beat notes. See CHANGES.md.
// ABC-notation generation (Step 2 extraction from groove_utils.js).
// The public functions take a GrooveUtils instance (gu) for the note-scaling /
// triplet / sticking-count helpers that remain in GrooveUtils; the internal
// helpers below are pure. GrooveUtils delegates its ABC methods here.

import { hasDiddle, takeGraceGroups } from './ornaments.js';
import {
  constant_NUMBER_OF_TOMS,
  constant_ABC_STICK_COUNT,
  constant_ABC_STICK_OFF,
} from './constants.js';
import {
  beamGroupEnds,
  isTripletDivision,
  isTripletDivisionFromNotesPerMeasure,
  notesPerMeasureInFullSizeArray,
  scaleNoteArrayToFullSize,
} from './musicMath.js';
import { barSig, fullSizeBar, isMixedMeter } from './barMeters.js';
import { hasBeatNotes, makeBeatPlan } from './beatNotes.js';

/**
 * The beat plan (see beatNotes.js) of bars fromBar..toBar-1 of a groove in the
 * Mixed note setting, or null (other note settings, or a bar without one).
 */
function beatPlanOf(gd, fromBar, toBar) {
  if (gd.timeDivision != 48 || !gd.beatNotes || !gd.beatNotes.length) return null;
  var bars = [];
  var sigs = [];
  for (var bar = fromBar; bar < toBar; bar++) {
    var sig = barSig(gd.barTimeSigs, bar, gd.numBeats, gd.noteValue);
    if (!hasBeatNotes(sig) || !gd.beatNotes[bar]) return null;
    bars.push(gd.beatNotes[bar]);
    sigs.push(sig);
  }
  return makeBeatPlan(bars, sigs);
}
import {
  create_note_mapping_array_for_highlighting,
  convert_sticking_counts_to_actual_counts,
} from './noteArrays.js';

function moveAccentsOrOtherModifiersOutsideOfGroup(abcNoteStrings, modifier_to_look_for) {
  var found_modifier = false;
  var rindex = abcNoteStrings.notes1.lastIndexOf(modifier_to_look_for);
  if (rindex > -1) {
    found_modifier = true;
    abcNoteStrings.notes1 = abcNoteStrings.notes1.replace(modifier_to_look_for, '');
  }
  rindex = abcNoteStrings.notes2.lastIndexOf(modifier_to_look_for);
  if (rindex > -1) {
    found_modifier = true;
    abcNoteStrings.notes2 = abcNoteStrings.notes2.replace(modifier_to_look_for, '');
  }
  rindex = abcNoteStrings.notes3.lastIndexOf(modifier_to_look_for);
  if (rindex > -1) {
    found_modifier = true;
    abcNoteStrings.notes3 = abcNoteStrings.notes3.replace(modifier_to_look_for, '');
  }
  if (found_modifier) return modifier_to_look_for;

  return ''; // didn't find it so return nothing
}

function testArrayOfArraysForEquality(array_of_arrays, test_index, test_value) {
  for (var i = 0; i < array_of_arrays.length; i++) {
    if (
      array_of_arrays[i][test_index] !== undefined &&
      array_of_arrays[i][test_index] !== test_value
    )
      return false;
  }

  return true;
}

// A diddle's slash goes on a chord's stem, once however many of its notes have
// one (Infinity Drumming, 2026): "!/!" or ''.
function moveDiddlesOutsideOfGroup(abcNoteStrings) {
  if (!moveAccentsOrOtherModifiersOutsideOfGroup(abcNoteStrings, '!/!')) return '';
  while (moveAccentsOrOtherModifiersOutsideOfGroup(abcNoteStrings, '!/!'));
  return '!/!';
}

function getABCforNote(note_array_of_arrays, start_index, end_of_group, scaler) {
  var ABC_String = '';
  var abcNoteStrings = {
    notes1: '',
    notes2: '',
    notes3: '',
  };
  var num_notes_on = 0;
  var nextCount;

  for (var which_array = 0; which_array < note_array_of_arrays.length; which_array++) {
    if (
      note_array_of_arrays[which_array][start_index] !== undefined &&
      note_array_of_arrays[which_array][start_index] !== false
    ) {
      // look ahead and see when the next note is
      // the length of this note is dependant on when the next note lands
      // for every empty space we increment nextCount, and then make the note that long
      nextCount = 1;
      for (var indexA = start_index + 1; indexA < start_index + end_of_group; indexA++) {
        if (!testArrayOfArraysForEquality(note_array_of_arrays, indexA, false)) {
          break;
        } else {
          nextCount++;
        }
      }

      abcNoteStrings.notes1 += note_array_of_arrays[which_array][start_index] + scaler * nextCount;
      num_notes_on++;
    }
  }

  if (num_notes_on > 1) {
    // if multiple are on, we need to combine them with []
    // horrible hack.  Turns out ABC will render the accents wrong unless the are outside the brackets []
    // look for any accents that are delimited by "!"  (eg !accent!  or !plus!)
    // move the accents to the front
    ABC_String += moveAccentsOrOtherModifiersOutsideOfGroup(abcNoteStrings, '!accent!');
    // in case there are two accents (on both snare and hi-hat) we remove the second one
    moveAccentsOrOtherModifiersOutsideOfGroup(abcNoteStrings, '!accent!');
    ABC_String += moveAccentsOrOtherModifiersOutsideOfGroup(abcNoteStrings, '!plus!');
    ABC_String += moveAccentsOrOtherModifiersOutsideOfGroup(abcNoteStrings, '!open!');
    ABC_String += moveAccentsOrOtherModifiersOutsideOfGroup(abcNoteStrings, '!///!');
    ABC_String += moveDiddlesOutsideOfGroup(abcNoteStrings);

    // A sub-chord such as the kick & hi-hat foot "[F^d,]4" carries its length after the ']'. Give every
    // note inside it that length before the brackets are dropped below, or all but the last note would
    // fall back to the default length (a 32nd).
    abcNoteStrings.notes1 = abcNoteStrings.notes1.replace(
      /\[([^\]]*)\]([\d./]+)/g,
      function (match, chordNotes, length) {
        return chordNotes.replace(/[_=^]*[A-Ga-g][,']*/g, '$&' + length);
      }
    );

    // Look for '[' and ']'.   They are added on to the the kick and splash and could be added to other notes
    // in the future.   They imply that the notes are on the same beat.   Since we are already putting multiple
    // notes on the same beat (see code below this line that adds '[' & ']'), we need to remove them or the
    // resulting ABC will be invalid
    moveAccentsOrOtherModifiersOutsideOfGroup(abcNoteStrings, '[');
    moveAccentsOrOtherModifiersOutsideOfGroup(abcNoteStrings, ']');

    // grace notes (flams, drags, ruffs on any drum) can't be inside a chord: they
    // go in front of it.  ABC allows one grace group per chord, so when two drums
    // have one on the same beat the first is written (both still play).
    var graceGroups = takeGraceGroups(abcNoteStrings.notes1);
    abcNoteStrings.notes1 = graceGroups.rest;
    ABC_String += graceGroups.graces.slice(0, 1).join('');

    ABC_String += '[' + abcNoteStrings.notes1 + abcNoteStrings.notes2 + abcNoteStrings.notes3 + ']'; // [^gc]
  } else {
    ABC_String += abcNoteStrings.notes1 + abcNoteStrings.notes2 + abcNoteStrings.notes3; // note this could be a noOp if all strings are blank
  }

  return ABC_String;
}

function getABCforRest(note_array_of_arrays, start_index, end_of_group, scaler, use_hidden_rest) {
  var ABC_String = '';

  // count the # of rest
  if (testArrayOfArraysForEquality(note_array_of_arrays, start_index, false)) {
    var restCount = 1;
    for (var indexB = start_index + 1; indexB < start_index + end_of_group; indexB++) {
      if (!testArrayOfArraysForEquality(note_array_of_arrays, indexB, false)) break;
      else restCount++;
    }

    // now output a rest for the duration of the rest count
    if (use_hidden_rest) ABC_String += 'x' + scaler * restCount;
    else ABC_String += 'z' + scaler * restCount;
  }

  return ABC_String;
}

// How many slots (of 12 to a quarter note) a triplet bar's beats have: 12, or 6
// (an 8th note) in x/8 bars of 16th triplets or finer (Infinity Drumming, 2026).
function tripletBeatSlots(sub_division, timeSigBottom) {
  return timeSigBottom == 8 && sub_division != 12 ? 6 : 12;
}

function abc_gen_note_grouping_size(usingTriplets, timeSigTop, timeSigBottom) {
  var note_grouping;

  if (usingTriplets) {
    note_grouping = 12;
  } else if (timeSigTop == 3) {
    // 3/4, 3/8, 3/16
    note_grouping = 8 * (4 / timeSigBottom);
  } else if (timeSigTop % 6 == 0 && timeSigBottom % 8 == 0) {
    // 3/4, 6/8, 9/8, 12/8
    note_grouping = 12 * (8 / timeSigBottom);
  } else {
    //note_grouping = 8 * (4/timeSigBottom);
    note_grouping = 8;
  }

  return note_grouping;
}

function count_active_notes_in_arrays(array_of_arrays, start_index, how_far_to_measure) {
  var num_active_notes = 0;

  for (var i = start_index; i < start_index + how_far_to_measure; i++) {
    for (var which_array = 0; which_array < array_of_arrays.length; which_array++) {
      if (array_of_arrays[which_array][i] !== false) {
        num_active_notes++;
        which_array = array_of_arrays.length; // exit this inner for loop immediately
      }
    }
  }

  return num_active_notes;
}

/**
 * Infinity Drumming, 2026: beat by beat, a beat of 8ths or 16ths written as the
 * 8ths and 16ths note settings write it (each note, count or sticking lasting
 * until the next), counted on each of its notes however few notes the beat has.
 * In x/8 bars the straight beats beamed together are written together, as a
 * note may last past its 8th note there (`endsBeam` says where groups end).
 * Null for other beats, or one with notes between its own.
 * @returns {{stickings: string, hands: string, feet: string, span: number} | null}
 *   span: how many slots were written (the beats beamed together)
 */
function straightBeatABC(
  sticking_array,
  drums,
  kick_array,
  beatPlan,
  start,
  beat,
  endsBeam,
  notes_per_measure
) {
  var bar = Math.floor(start / notes_per_measure);
  var all = drums.concat([kick_array]);
  // the slots between the notes of the beat at `from`, if it is one of 8ths or
  // 16ths with all its notes on them (0 otherwise)
  var stepOfBeat = function (from) {
    var step = beatPlan.straightStepAt(from % notes_per_measure, bar);
    for (var slot = from; step && slot < from + beat; slot++)
      if ((slot - from) % step && count_active_notes_in_arrays(all, slot, 1)) return 0;
    return step;
  };
  var step = stepOfBeat(start);
  if (!step) return null;
  var end = start + beat;
  while (!endsBeam(end - 1) && end % notes_per_measure !== 0 && stepOfBeat(end) === step)
    end += beat;
  var units = (step * 2) / 3; // a 16th note is 2 (of 1/32), an 8th note 4
  var count = (end - start) / step;
  // the beats' own notes, side by side
  var compact = function (array) {
    var notes = [];
    for (var k = 0; k < count; k++) notes.push(array[start + k * step]);
    return notes;
  };
  var write = function (arrays, hiddenRest) {
    var abc = getABCforRest(arrays, 0, count, units, hiddenRest);
    for (var k = 0; k < count; k++) abc += getABCforNote(arrays, k, count - k, units);
    return abc;
  };
  return {
    stickings: write([compact(sticking_array)], true),
    hands: write(drums.map(compact), false),
    feet: write([compact(kick_array)], true),
    span: end - start,
  };
}

function snare_HH_kick_ABC_for_triplets(
  sticking_array,
  HH_array,
  snare_array,
  kick_array,
  toms_array,
  post_voice_abc,
  num_notes,
  sub_division,
  notes_per_measure,
  kick_stems_up,
  timeSigTop,
  timeSigBottom,
  numberOfMeasuresPerLine,
  beatPlan
) {
  var scaler = 1; // we are always in 48 notes here, and the ABC needs to think we are in 48 since the specified division is 1/32
  // Each beat is 12 slots (a quarter note), or in x/8 bars of 16th triplets and
  // finer, 6 (an 8th note), beamed in the bar's classic groups (Infinity Drumming, 2026)
  var beat = tripletBeatSlots(sub_division, timeSigBottom);
  var x8BeamEnds =
    beat == 6 ? beamGroupEnds(timeSigTop, timeSigBottom, notes_per_measure) || null : null;
  var endsBeam = function (index) {
    if (beat == 12) return index % 12 == 11;
    var position = (index % notes_per_measure) + 1;
    if (x8BeamEnds) return x8BeamEnds.indexOf(position) >= 0;
    return position % 18 === 0; // 6/8, 9/8, 12/8: in dotted quarter notes
  };
  var ABC_String = '';
  var stickings_voice_string = 'V:Stickings\n';
  var hh_snare_voice_string = 'V:Hands stem=up\n%%voicemap drum\n';
  var kick_voice_string = 'V:Feet stem=down\n%%voicemap drum\n';
  var all_drum_array_of_array;

  // console.log(HH_array);
  // console.log(kick_array);
  // console.log(notes_per_measure);
  // console.log(sub_division);

  if (kick_stems_up) {
    all_drum_array_of_array = [snare_array, HH_array, kick_array];
  } else {
    all_drum_array_of_array = [snare_array, HH_array]; // exclude the kick
  }
  if (toms_array) all_drum_array_of_array = all_drum_array_of_array.concat(toms_array);

  // occationally we will change the sub_division output to 1/8th or 1/16th notes when we detect a beat that is better displayed that way
  // By default we use the base sub_division but this can be set different below
  var faker_sub_division = sub_division;

  for (var i = 0; i < num_notes; i++) {
    // triplets are special.  We want to output a note or a rest for every space of time
    // 8th note triplets should always use rests
    // end_of_group should be
    //  "4" for 1/8th note triplets
    //  "2" for 1/16th note triplets
    //  "1" for 1/32nd note triplets.
    var end_of_group = 48 / faker_sub_division;
    var grouping_size_for_rests = end_of_group;
    var skip_adding_more_notes = false;

    if ((i % notes_per_measure) + end_of_group > notes_per_measure) {
      // if we are in an odd time signature then the last few notes will have a different grouping to reach the end of the measure
      end_of_group = notes_per_measure - (i % num_notes);
    }

    if (i % beat === 0) {
      // Look for some special cases that will format beats as non triplet groups.   Quarter notes, 1/8th and 1/16th notes only.

      // beat by beat (Infinity Drumming, 2026): a beat of 8ths or 16ths, written
      // as in the 8ths and 16ths note settings, with all its counts
      var straightBeat = beatPlan
        ? straightBeatABC(
            sticking_array,
            all_drum_array_of_array,
            kick_array,
            beatPlan,
            i,
            beat,
            endsBeam,
            notes_per_measure
          )
        : null;
      // a triplet over two beats (Infinity Drumming, 2026): quarter-note triplets,
      // or 8th-note triplets in an x/8 bar, from the bar's beat plan
      var longTriplet = beatPlan
        ? beatPlan.longTripletAt(i % notes_per_measure, Math.floor(i / notes_per_measure))
        : null;
      if (straightBeat) {
        stickings_voice_string += straightBeat.stickings;
        hh_snare_voice_string += straightBeat.hands;
        if (kick_stems_up) kick_voice_string = '';
        else kick_voice_string += straightBeat.feet;
        skip_adding_more_notes = true;
        i += straightBeat.span - 1;
      } else if (longTriplet) {
        var units = longTriplet.step; // each note written a quarter (8) or an 8th (4) long
        hh_snare_voice_string += '(3:3:3';
        for (var third = 0; third < 3; third++) {
          var at = i + third * longTriplet.step;
          for (si = at + 1; si < at + longTriplet.step; si++) sticking_array[si] = false;
          stickings_voice_string +=
            getABCforNote([sticking_array], at, units, scaler) || 'x' + units;
          hh_snare_voice_string +=
            getABCforNote(all_drum_array_of_array, at, units, scaler) || 'z' + units;
          if (!kick_stems_up)
            kick_voice_string += getABCforNote([kick_array], at, units, scaler) || 'x' + units;
        }
        if (kick_stems_up) kick_voice_string = '';
        skip_adding_more_notes = true;
        i += longTriplet.span - 1;
      } else if (beat == 6) {
        // an x/8 bar's 8th note (Infinity Drumming, 2026): a rest, one 8th note,
        // two 16ths, or a 16th-note triplet (or 32nd-note sextuplet)
        if (0 == count_active_notes_in_arrays(all_drum_array_of_array, i, 6)) {
          skip_adding_more_notes = true;
          stickings_voice_string += 'x4';
          hh_snare_voice_string += 'z4'; // 8th note rest
          if (!kick_stems_up) kick_voice_string += 'x4';
          i += 5;
        } else if (0 == count_active_notes_in_arrays(all_drum_array_of_array, i + 1, 5)) {
          for (si = i + 1; si < i + 6; si++) sticking_array[si] = false;
          stickings_voice_string += getABCforRest([sticking_array], i, 4, scaler, true);
          stickings_voice_string += getABCforNote([sticking_array], i, 4, scaler);
          hh_snare_voice_string += getABCforNote(all_drum_array_of_array, i, 4, scaler);
          if (kick_stems_up) kick_voice_string = '';
          else kick_voice_string += getABCforNote([kick_array], i, 4, scaler);
          skip_adding_more_notes = true;
          i += 5;
        } else if (
          sub_division == 48 &&
          0 == count_active_notes_in_arrays(all_drum_array_of_array, i + 1, 2) &&
          0 == count_active_notes_in_arrays(all_drum_array_of_array, i + 4, 2)
        ) {
          for (var sixteenth = i; sixteenth <= i + 3; sixteenth += 3) {
            for (si = sixteenth + 1; si < sixteenth + 3; si++) sticking_array[si] = false;
            stickings_voice_string += getABCforRest([sticking_array], sixteenth, 2, scaler, true);
            stickings_voice_string += getABCforNote([sticking_array], sixteenth, 2, scaler);
            hh_snare_voice_string += getABCforRest(
              all_drum_array_of_array,
              sixteenth,
              2,
              scaler,
              false
            );
            hh_snare_voice_string += getABCforNote(all_drum_array_of_array, sixteenth, 2, scaler);
            if (kick_stems_up) kick_voice_string = '';
            else kick_voice_string += getABCforNote([kick_array], sixteenth, 2, scaler);
          }
          skip_adding_more_notes = true;
          i += 5;
        } else {
          faker_sub_division = sub_division;
          if (
            sub_division == 48 &&
            0 == count_active_notes_in_arrays(all_drum_array_of_array, i + 1, 1) &&
            0 == count_active_notes_in_arrays(all_drum_array_of_array, i + 3, 1) &&
            0 == count_active_notes_in_arrays(all_drum_array_of_array, i + 5, 1)
          )
            faker_sub_division = 24; // a 16th-note triplet
          end_of_group = 48 / faker_sub_division;
          grouping_size_for_rests = end_of_group;
          var notes_in_eighth = faker_sub_division / 8;
          hh_snare_voice_string +=
            '(' + notes_in_eighth + ':' + notes_in_eighth + ':' + notes_in_eighth;
        }

        // look for a whole beat of rests
      } else if (0 == count_active_notes_in_arrays(all_drum_array_of_array, i, 12)) {
        // there are no notes in the next beat.   Let's output a special string for a quarter note rest
        skip_adding_more_notes = true;
        stickings_voice_string += 'x8';
        hh_snare_voice_string += 'z8'; // quarter note rest
        i += 11; // skip past all the rests

        // look for 1/4 note with no triplets  "x--"
      } else if (0 == count_active_notes_in_arrays(all_drum_array_of_array, i + 1, 11)) {
        // code duplicated from below
        // clear any invalid stickings since they will mess up the formatting greatly
        for (var si = i + 1; si < i + 12; si++) sticking_array[si] = false;
        stickings_voice_string += getABCforRest([sticking_array], i, 8, scaler, true);
        stickings_voice_string += getABCforNote([sticking_array], i, 8, scaler);

        if (kick_stems_up) {
          hh_snare_voice_string += getABCforNote(all_drum_array_of_array, i, 8, scaler);
          kick_voice_string = '';
        } else {
          hh_snare_voice_string += getABCforNote(all_drum_array_of_array, i, 8, scaler);
          kick_voice_string += getABCforNote([kick_array], i, 8, scaler);
        }

        skip_adding_more_notes = true;
        i += 11; // skip past to the next beat

        // look for two 1/8 notes with no triplets in 1/16th & 1/32nd note triplets.   "x--x--", "x-----x-----"
      } else if (
        sub_division > 12 &&
        0 == count_active_notes_in_arrays(all_drum_array_of_array, i + 1, 5) &&
        0 == count_active_notes_in_arrays(all_drum_array_of_array, i + 7, 5)
      ) {
        // think of the 1/8 notes as two groups of 3 notes
        for (var eighth_index = i; eighth_index <= i + 6; eighth_index += 6) {
          // code duplicated from below
          // clear any invalid stickings since they will mess up the formatting greatly
          for (si = eighth_index + 1; si < eighth_index + 6; si++) sticking_array[si] = false;
          stickings_voice_string += getABCforRest([sticking_array], eighth_index, 4, scaler, true);
          stickings_voice_string += getABCforNote([sticking_array], eighth_index, 4, scaler);

          if (kick_stems_up) {
            hh_snare_voice_string += getABCforRest(
              all_drum_array_of_array,
              eighth_index,
              4,
              scaler,
              false
            );
            hh_snare_voice_string += getABCforNote(
              all_drum_array_of_array,
              eighth_index,
              4,
              scaler
            );
            kick_voice_string = '';
          } else {
            hh_snare_voice_string += getABCforRest(
              all_drum_array_of_array,
              eighth_index,
              4,
              scaler,
              false
            );
            hh_snare_voice_string += getABCforNote(
              all_drum_array_of_array,
              eighth_index,
              4,
              scaler
            );
            kick_voice_string += getABCforNote([kick_array], eighth_index, 4, scaler);
          }
        }

        skip_adding_more_notes = true;
        i += 11; // skip past to the next beat

        // look for 1/16th notes with no triplets in 1/32nd note triplets.   "x--x--"
      } else if (
        sub_division == 48 &&
        0 == count_active_notes_in_arrays(all_drum_array_of_array, i + 1, 2) &&
        0 == count_active_notes_in_arrays(all_drum_array_of_array, i + 4, 2) &&
        0 == count_active_notes_in_arrays(all_drum_array_of_array, i + 7, 2) &&
        0 == count_active_notes_in_arrays(all_drum_array_of_array, i + 10, 2)
      ) {
        // think of the 1/8 notes as two groups of 3 notes
        for (eighth_index = i; eighth_index <= i + 9; eighth_index += 3) {
          // code duplicated from below
          // clear any invalid stickings since they will mess up the formatting greatly
          for (si = eighth_index + 1; si < eighth_index + 3; si++) sticking_array[si] = false;
          stickings_voice_string += getABCforRest([sticking_array], eighth_index, 2, scaler, true);
          stickings_voice_string += getABCforNote([sticking_array], eighth_index, 2, scaler);

          if (kick_stems_up) {
            hh_snare_voice_string += getABCforRest(
              all_drum_array_of_array,
              eighth_index,
              2,
              scaler,
              false
            );
            hh_snare_voice_string += getABCforNote(
              all_drum_array_of_array,
              eighth_index,
              2,
              scaler
            );
            kick_voice_string = '';
          } else {
            hh_snare_voice_string += getABCforRest(
              all_drum_array_of_array,
              eighth_index,
              2,
              scaler,
              false
            );
            hh_snare_voice_string += getABCforNote(
              all_drum_array_of_array,
              eighth_index,
              2,
              scaler
            );
            kick_voice_string += getABCforNote([kick_array], eighth_index, 2, scaler);
          }
        }

        skip_adding_more_notes = true;
        i += 11; // skip past to the next beat
      } else {
        // the normal case.   We tell ABC that we are using a triplet
        var notes_in_triplet_group = sub_division / 4; // 4 beats

        // look through the notes and see if we should "fake" 1/8 or 1/6th note triplets
        // If the groove can be expressed in "3" or "6" groups it is way easier to read than in a higher "12" group with rests
        // "3" looks like "x---x---x---"   one note and three rests
        // "6" looks like "x-x-x-x-x-x-"   one note and one rest
        if (sub_division == 48) {
          var can_fake_threes = true;
          var can_fake_sixes = true;
          for (var j = i; j < i + 12; j += 4) {
            if (0 < count_active_notes_in_arrays(all_drum_array_of_array, j + 1, 3)) {
              can_fake_threes = false;
            }
            if (
              0 < count_active_notes_in_arrays(all_drum_array_of_array, j + 1, 1) ||
              0 < count_active_notes_in_arrays(all_drum_array_of_array, j + 3, 1)
            ) {
              can_fake_sixes = false;
            }
            if (can_fake_threes == false && can_fake_sixes == false) break; // skip the rest, since we have an answer already
          }

          // reset

          if (can_fake_threes) faker_sub_division = 12;
          else if (can_fake_sixes) faker_sub_division = 24;
          else faker_sub_division = sub_division; // reset

          end_of_group = 48 / faker_sub_division;
          grouping_size_for_rests = end_of_group;
          notes_in_triplet_group = faker_sub_division / 4; // 4 beats
        }

        // creates the 3, 6 or 12 over the note grouping
        // looks like (3:3:3 or (6:6:6 or (12:12:12
        hh_snare_voice_string +=
          '(' +
          notes_in_triplet_group +
          ':' +
          notes_in_triplet_group +
          ':' +
          notes_in_triplet_group;
      }
    }

    // skip the code to add notes
    // Happens for special_rest when there are no notes for the next whole beat.
    // Happens when we found only a 1/4 or 1/8 note instead of triplets
    if (!skip_adding_more_notes) {
      if (i % grouping_size_for_rests === 0) {
        // we will output a rest for each place there could be a note
        stickings_voice_string += getABCforRest(
          [sticking_array],
          i,
          grouping_size_for_rests,
          scaler,
          true
        );

        if (kick_stems_up) {
          hh_snare_voice_string += getABCforRest(
            all_drum_array_of_array,
            i,
            grouping_size_for_rests,
            scaler,
            false
          );
          kick_voice_string = '';
        } else {
          hh_snare_voice_string += getABCforRest(
            all_drum_array_of_array,
            i,
            grouping_size_for_rests,
            scaler,
            false
          );
          kick_voice_string += getABCforRest(
            [kick_array],
            i,
            grouping_size_for_rests,
            scaler,
            true
          );
        }
      }

      stickings_voice_string += getABCforNote([sticking_array], i, end_of_group, scaler);

      if (kick_stems_up) {
        hh_snare_voice_string += getABCforNote(all_drum_array_of_array, i, end_of_group, scaler);
        kick_voice_string = '';
      } else {
        hh_snare_voice_string += getABCforNote(all_drum_array_of_array, i, end_of_group, scaler);
        kick_voice_string += getABCforNote([kick_array], i, end_of_group, scaler);
      }
    }

    if (endsBeam(i)) {
      stickings_voice_string += ' ';
      hh_snare_voice_string += ' '; // Add a space to break the bar line every group notes
      kick_voice_string += ' ';
    }

    // add a bar line every measure
    if ((i + 1) % (12 * timeSigTop * (4 / timeSigBottom)) === 0) {
      stickings_voice_string += '|';
      hh_snare_voice_string += '|';
      kick_voice_string += '|';

      // add a line break every numberOfMeasuresPerLine measures
      if (
        i < num_notes - 1 &&
        (i + 1) % (12 * timeSigTop * (4 / timeSigBottom) * numberOfMeasuresPerLine) === 0
      ) {
        stickings_voice_string += '\n';
        hh_snare_voice_string += '\n';
        kick_voice_string += '\n';
      }
    }
  }

  if (kick_stems_up)
    ABC_String += stickings_voice_string + post_voice_abc + hh_snare_voice_string + post_voice_abc;
  else
    ABC_String +=
      stickings_voice_string +
      post_voice_abc +
      hh_snare_voice_string +
      post_voice_abc +
      kick_voice_string +
      post_voice_abc;

  return ABC_String;
}

// The beamed group note i of a bar (in 32nd notes) is in: whether it starts or
// ends the group, how far it is to the group's end, and how long a rest at its
// start can be.  Even groups (abc_gen_note_grouping_size, the last one cut short
// in odd time signatures), or the classic x/8 groups of beamGroupEnds.
function quadsBeamGroupAt(i, notes_per_measure, timeSigTop, timeSigBottom, beamEnds) {
  var position = i % notes_per_measure;
  if (beamEnds) {
    var start = 0;
    for (var g = 0; g < beamEnds.length; g++) {
      if (position < beamEnds[g]) {
        return {
          isStart: position === start,
          isLast: position === beamEnds[g] - 1,
          toEnd: beamEnds[g] - position,
          restLength: beamEnds[g] - position,
        };
      }
      start = beamEnds[g];
    }
  }
  var size = abc_gen_note_grouping_size(false, timeSigTop, timeSigBottom);
  var restLength = size;
  // make sure the group end doesn't go beyond the measure.   Happens in odd time sigs
  if (position + restLength > notes_per_measure) restLength = notes_per_measure - position;
  var toEnd = i % size === 0 ? size : size - (i % size);
  if (position + toEnd > notes_per_measure) toEnd = notes_per_measure - position;
  return {
    isStart: i % size === 0,
    isLast: i % size == size - 1,
    toEnd: toEnd,
    restLength: restLength,
  };
}

function snare_HH_kick_ABC_for_quads(
  sticking_array,
  HH_array,
  snare_array,
  kick_array,
  toms_array,
  post_voice_abc,
  num_notes,
  sub_division,
  notes_per_measure,
  kick_stems_up,
  timeSigTop,
  timeSigBottom,
  numberOfMeasuresPerLine
) {
  var scaler = 1; // we are always in 32ths notes here
  var ABC_String = '';
  var stickings_voice_string = 'V:Stickings\n'; // for stickings.  they are all rests with text comments added
  var hh_snare_voice_string = 'V:Hands stem=up\n%%voicemap drum\n'; // for hh and snare
  var kick_voice_string = 'V:Feet stem=down\n%%voicemap drum\n'; // for kick drum
  var all_drum_array_of_array;

  all_drum_array_of_array = [snare_array, HH_array]; // exclude the kick
  if (toms_array) all_drum_array_of_array = all_drum_array_of_array.concat(toms_array);
  // Add the kick array last to solve a subtle bug with the kick foot splash combo note
  // If the combo note comes last in a multi note event it will space correctly.  If it
  // comes first it will create a wrong sized note
  if (kick_stems_up) all_drum_array_of_array = all_drum_array_of_array.concat([kick_array]);

  var beamEnds = beamGroupEnds(timeSigTop, timeSigBottom, notes_per_measure);
  for (var i = 0; i < num_notes; i++) {
    var group = quadsBeamGroupAt(i, notes_per_measure, timeSigTop, timeSigBottom, beamEnds);
    var grouping_size_for_rests = group.restLength;
    var end_of_group = group.toEnd;

    if (group.isStart) {
      // we will only output a rest at the beginning of a beat phrase
      stickings_voice_string += getABCforRest(
        [sticking_array],
        i,
        grouping_size_for_rests,
        scaler,
        true
      );

      if (kick_stems_up) {
        hh_snare_voice_string += getABCforRest(
          all_drum_array_of_array,
          i,
          grouping_size_for_rests,
          scaler,
          false
        );
        kick_voice_string = '';
      } else {
        hh_snare_voice_string += getABCforRest(
          all_drum_array_of_array,
          i,
          grouping_size_for_rests,
          scaler,
          false
        );
        kick_voice_string += getABCforRest([kick_array], i, grouping_size_for_rests, scaler, false);
      }
    }

    stickings_voice_string += getABCforNote([sticking_array], i, end_of_group, scaler);

    if (kick_stems_up) {
      hh_snare_voice_string += getABCforNote(all_drum_array_of_array, i, end_of_group, scaler);
      kick_voice_string = '';
    } else {
      hh_snare_voice_string += getABCforNote(all_drum_array_of_array, i, end_of_group, scaler);
      kick_voice_string += getABCforNote([kick_array], i, end_of_group, scaler);
    }

    if (group.isLast) {
      stickings_voice_string += ' ';
      hh_snare_voice_string += ' '; // Add a space to break the bar line every group notes
      kick_voice_string += ' ';
    }

    // add a bar line every measure.   32 notes in 4/4 time.   (32/timeSigBottom * timeSigTop)
    if ((i + 1) % ((32 / timeSigBottom) * timeSigTop) === 0) {
      stickings_voice_string += '|';
      hh_snare_voice_string += '|';
      kick_voice_string += '|';
    }
    // add a line break every numberOfMeasuresPerLine measures, except the last
    if (
      i < num_notes - 1 &&
      (i + 1) % ((32 / timeSigBottom) * timeSigTop * numberOfMeasuresPerLine) === 0
    ) {
      stickings_voice_string += '\n';
      hh_snare_voice_string += '\n';
      kick_voice_string += '\n';
    }
  }

  if (kick_stems_up)
    ABC_String += stickings_voice_string + post_voice_abc + hh_snare_voice_string + post_voice_abc;
  else
    ABC_String +=
      stickings_voice_string +
      post_voice_abc +
      hh_snare_voice_string +
      post_voice_abc +
      kick_voice_string +
      post_voice_abc;

  return ABC_String;
}

export function get_top_ABC_BoilerPlate(
  gu,
  isPermutation,
  tuneTitle,
  tuneAuthor,
  tuneComments,
  showLegend,
  isTriplets,
  kick_stems_up,
  timeSigTop,
  timeSigBottom,
  renderWidth
) {
  // boiler plate
  var fullABC = '%abc\n%%fullsvg _' + gu.grooveUtilsUniqueIndex + '\nX:6\n';

  fullABC += 'M:' + timeSigTop + '/' + timeSigBottom + '\n';

  // always add a Title even if it's blank
  fullABC += 'T: ' + tuneTitle + '\n';

  if (tuneAuthor !== '') {
    fullABC += 'C: ' + tuneAuthor + '\n';
    fullABC += '%%musicspace 20px\n'; // add some more space
  }

  if (renderWidth < 400) renderWidth = 400; // min-width
  if (renderWidth > 3000) renderWidth = 3000; // max-width
  // the width of the music is always 25% bigger than what we pass in.   Go figure.
  renderWidth = Math.floor(renderWidth * 0.75);

  fullABC += 'L:1/' + 32 + '\n'; // 4/4 = 32,  6/8 = 64

  if (isPermutation) fullABC += '%%stretchlast 0\n';
  else fullABC += '%%stretchlast 1\n';

  fullABC +=
    '%%flatbeams 1\n' +
    '%%ornament up\n' +
    '%%pagewidth ' +
    renderWidth +
    'px\n' +
    '%%leftmargin 0cm\n' +
    '%%rightmargin 0cm\n' +
    '%%topspace 10px\n' +
    '%%titlefont calibri 20\n' +
    '%%partsfont calibri 16\n' +
    '%%gchordfont calibri 16\n' +
    '%%annotationfont calibri 16\n' +
    '%%infofont calibri 16\n' +
    '%%textfont calibri 16\n' +
    '%%deco (. 0 a 5 1 1 "@-8,-3("\n' +
    '%%deco ). 0 a 5 1 1 "@4,-3)"\n' +
    '%%beginsvg\n' +
    ' <defs>\n' +
    ' <path id="Xhead" d="m-3,-3 l6,6 m0,-6 l-6,6" class="stroke" style="stroke-width:1.2"/>\n' +
    ' <path id="Trihead" d="m-3,2 l 6,0 l-3,-6 l-3,6 l6,0" class="stroke" style="stroke-width:1.2"/>\n' +
    ' </defs>\n' +
    '%%endsvg\n' +
    '%%map drum ^g heads=Xhead print=g       % Hi-Hat\n' +
    "%%map drum ^c' heads=Xhead print=c'   % Crash\n" +
    "%%map drum ^d' heads=Xhead print=d'   % Stacker\n" +
    "%%map drum ^e' heads=Xhead print=e'   % Metronome click\n" +
    "%%map drum ^f' heads=Xhead print=f'   % Metronome beep\n" +
    "%%map drum ^A' heads=Xhead print=A'   % Ride\n" +
    "%%map drum ^a' heads=Xhead print=b    % Crash 2\n" +
    "%%map drum ^g' heads=Xhead print=e'   % Splash\n" +
    "%%map drum ^B' heads=Trihead print=A' % Ride Bell\n" +
    "%%map drum ^D' heads=Trihead print=g   % Cow Bell\n" +
    '%%map drum ^c heads=Xhead print=c  % Cross Stick\n' +
    '%%map drum ^d, heads=Xhead print=d,  % Foot Splash\n';

  //if(kick_stems_up)
  //fullABC += "%%staves (Stickings Hands)\n";
  //else
  fullABC += '%%staves (Stickings Hands Feet)\n';

  // print comments below the legend if there is one, otherwise in the header section
  if (tuneComments !== '') {
    fullABC += 'P: ' + tuneComments + '\n';
    fullABC += '%%musicspace 20px\n'; // add some more space
  }

  // the K ends the header;
  fullABC += 'K:C clef=perc\n';

  if (showLegend) {
    fullABC +=
      'V:Stickings\n' +
      'x8 x8 x8 x8 x8 x8 x8 x8 ||\n' +
      'V:Hands stem=up \n' +
      '%%voicemap drum\n' +
      '"^Hi-Hat"^g4 "^Open"!open!^g4 ' +
      '"^Crash"^c\'4 "^Crash 2"^a\'4 "^Splash"^g\'4 "^Stacker"^d\'4 "^Ride"^A\'4 "^Ride Bell"^B\'4 "^Tom 1"e4 "^Tom 2"d4 "^Floor"A4 "^Snare"c4 "^Buzz"!///!c4 "^Cross"^c4 "^Ghost  "!(.!!).!c4 "^Flam"{/c}c4 ||\n' +
      'V:Feet stem=down \n' +
      '%%voicemap drum\n' +
      'x50 "^Kick"F4 "^HH foot"^d,4 x6 ||\n' +
      'T:\n';
  }

  // tempo setting
  //fullABC += "Q: 1/4=" + getTempo() + "\n";

  return fullABC;
}

/**
 * Infinity Drumming, 2026: counting ("1 e & a") over every note of the note
 * setting.  A beat with stickings keeps just its stickings ("R L", not "R e L a").
 */
function addCounting(sticking_array, time_division, timeSigTop, timeSigBottom) {
  var fullSlots = notesPerMeasureInFullSizeArray(
    isTripletDivision(time_division),
    timeSigTop,
    timeSigBottom
  );
  var step = fullSlots / ((time_division / 4) * timeSigTop * (4 / timeSigBottom));
  var beat = fullSlots / timeSigTop;
  // 8th-note triplets in x/8 time: three over every two beats
  if (beat % step !== 0 && (beat * 2) % step === 0) beat *= 2;
  if (step < 1 || step % 1 !== 0 || beat % step !== 0) return;
  var isEmpty = function (sticking) {
    return !sticking || sticking == constant_ABC_STICK_OFF;
  };
  for (var start = 0; start < sticking_array.length; start += beat) {
    var slots = sticking_array.slice(start, start + beat);
    if (slots.every(isEmpty))
      for (var i = start; i < start + beat; i += step) sticking_array[i] = constant_ABC_STICK_COUNT;
  }
}

/**
 * Infinity Drumming, 2026: a diddle's note is written exactly as long as its grid
 * note, so its one slash means two strokes at double speed.  Where nothing else
 * would end it there, a rest ("z") at the end of the grid note does (an extra
 * line of "notes" for the writers below).  Returns null when there are no diddles.
 * @param {Array<Array<string|false>>} lines  every drum line of the arrays
 * @param {number} num_notes
 * @param {number} notes_per_measure  slots per bar
 * @param {function(number): number} gridSlotsAt  how many slots slot i's grid note lasts
 */
function diddleStops(lines, num_notes, notes_per_measure, gridSlotsAt) {
  var stops = null;
  for (var i = 0; i < num_notes; i++) {
    var diddled = lines.some(function (line) {
      return line && hasDiddle(line[i]);
    });
    if (!diddled) continue;
    var stop = i + gridSlotsAt(i);
    if (stop >= num_notes || stop % notes_per_measure === 0) continue; // the bar ends there
    var free = lines.every(function (line) {
      return !line || !line[stop];
    });
    if (!free) continue;
    if (!stops) stops = new Array(num_notes).fill(false);
    stops[stop] = 'z';
  }
  return stops;
}

/**
 * Infinity Drumming, 2026: counting beat by beat (the Mixed note setting): over
 * every note of each beat's choice, in beats without stickings.
 */
function addPlanCounting(sticking_array, beatPlan, notes_per_measure) {
  var isEmpty = function (sticking) {
    return !sticking || sticking == constant_ABC_STICK_OFF;
  };
  for (var start = 0; start < sticking_array.length; start += notes_per_measure) {
    var groups = beatPlan.groups[start / notes_per_measure] || [];
    groups.forEach(function (group) {
      var from = start + group.start;
      if (!sticking_array.slice(from, from + group.span).every(isEmpty)) return;
      for (var at = from; at < from + group.span; at += group.step)
        sticking_array[at] = constant_ABC_STICK_COUNT;
    });
  }
}

// the counts ("C" stickings and the counting above) as each beat says them
function convertPlanCounts(sticking_array, beatPlan, notes_per_measure) {
  for (var i = 0; i < sticking_array.length; i++) {
    if (sticking_array[i] != constant_ABC_STICK_COUNT) continue;
    var said = beatPlan.countAt(i % notes_per_measure, Math.floor(i / notes_per_measure));
    sticking_array[i] = said ? '"' + said + '"x' : false;
  }
}

export function create_ABC_from_snare_HH_kick_arrays(
  gu,
  sticking_array,
  HH_array,
  snare_array,
  kick_array,
  toms_array,
  post_voice_abc,
  num_notes,
  time_division,
  notes_per_measure,
  kick_stems_up,
  timeSigTop,
  timeSigBottom,
  beatPlan
) {
  if (gu.showCounts) {
    if (beatPlan) addPlanCounting(sticking_array, beatPlan, notes_per_measure);
    else addCounting(sticking_array, time_division, timeSigTop, timeSigBottom);
  }

  // diddled notes end at their grid note (the rests go in with the toms' lines)
  var tripletBar = isTripletDivisionFromNotesPerMeasure(
    notes_per_measure,
    timeSigTop,
    timeSigBottom
  );
  var stops = diddleStops(
    [HH_array, snare_array, kick_array].concat(toms_array || []),
    num_notes,
    notes_per_measure,
    function (i) {
      if (beatPlan)
        return beatPlan.slotsPerNoteAt(i % notes_per_measure, Math.floor(i / notes_per_measure));
      return (tripletBar ? 48 : 32) / time_division;
    }
  );
  if (stops) toms_array = (toms_array || []).concat([stops]);

  // convert sticking count symbol to the actual count
  // do this right before ABC output so it can't every get encoded into something that gets saved.
  if (beatPlan) convertPlanCounts(sticking_array, beatPlan, notes_per_measure);
  else
    convert_sticking_counts_to_actual_counts(
      sticking_array,
      time_division,
      timeSigTop,
      timeSigBottom
    );

  var numberOfMeasuresPerLine = 2; // Default

  if (notes_per_measure >= 32) {
    // Only put one measure per line for 32nd notes and above because of width issues
    numberOfMeasuresPerLine = 1;
  }

  if (isTripletDivisionFromNotesPerMeasure(notes_per_measure, timeSigTop, timeSigBottom)) {
    return snare_HH_kick_ABC_for_triplets(
      sticking_array,
      HH_array,
      snare_array,
      kick_array,
      toms_array,
      post_voice_abc,
      num_notes,
      time_division,
      notes_per_measure,
      kick_stems_up,
      timeSigTop,
      timeSigBottom,
      numberOfMeasuresPerLine,
      beatPlan
    );
  } else {
    return snare_HH_kick_ABC_for_quads(
      sticking_array,
      HH_array,
      snare_array,
      kick_array,
      toms_array,
      post_voice_abc,
      num_notes,
      time_division,
      notes_per_measure,
      kick_stems_up,
      timeSigTop,
      timeSigBottom,
      numberOfMeasuresPerLine
    );
  }
}

/**
 * The "Straight" / "Swing" text to print over each bar of a swung groove that has
 * straight bars: over bar 1 and wherever the feel changes ('' for the others).
 * All '' when the groove is not swung, has no straight bars, or is in triplets.
 *
 * @param {boolean[]} straightBars  Per bar, true = straight.
 * @param {number} numberOfMeasures
 * @param {number} swingPercent
 * @param {string} swingStyle  'swing' or 'brazilian'.
 * @param {boolean} isTriplets
 * @returns {string[]}
 */
export function getFeelMarkings(
  straightBars,
  numberOfMeasures,
  swingPercent,
  swingStyle,
  isTriplets
) {
  var straight = [];
  for (var bar = 0; bar < numberOfMeasures; bar++)
    straight.push(!!(straightBars && straightBars[bar]));
  var marked = !isTriplets && swingPercent > 0 && straight.indexOf(true) >= 0;
  var swungText = swingStyle == 'brazilian' ? 'Brazilian swing' : 'Swing';
  return straight.map(function (isStraight, index) {
    if (!marked || (index > 0 && isStraight === straight[index - 1])) return '';
    return isStraight ? 'Straight' : swungText;
  });
}

// Print `text` over the first note of one bar's ABC (the start of its hands voice).
// When counts or stickings are written over the bar (Infinity Drumming, 2026), the
// text goes above them instead, on an invisible bar line at the start of the
// stickings voice: there it neither pushes the counts out of line nor spaces the
// first note out.
var FIRST_STICKING = /(V:Stickings[^\n]*\n(?:\[M:[^\]]*\])?)("[^"]+"x)/;
export function addFeelMarking(measureABC, text) {
  if (!text) return measureABC;
  if (FIRST_STICKING.test(measureABC))
    return measureABC.replace(FIRST_STICKING, '$1"@4,84' + text + '"[|]$2');
  return measureABC.replace('%%voicemap drum\n', '%%voicemap drum\n"^' + text + '"');
}

/**
 * Build the complete ABC-notation source for a groove.
 *
 * @param {Object} gu  The owning GrooveUtils instance (for note/tab helpers).
 * @param {import('./grooveData.js').GrooveData} myGrooveData  The groove to render.
 * @param {number} renderWidth  Target render width in pixels.
 * @returns {string}
 */
export function createABCFromGrooveData(gu, myGrooveData, renderWidth) {
  // counting over the notes, when this groove asks for it
  var showCounts = gu.showCounts;
  gu.showCounts = !!myGrooveData.showCounts;
  try {
    return grooveDataABC(gu, myGrooveData, renderWidth);
  } finally {
    gu.showCounts = showCounts;
  }
}

function grooveDataABC(gu, myGrooveData, renderWidth) {
  if (isMixedMeter(myGrooveData.barTimeSigs, myGrooveData.numberOfMeasures))
    return createMixedMeterABC(gu, myGrooveData, renderWidth);

  var FullNoteStickingArray = scaleNoteArrayToFullSize(
    myGrooveData.sticking_array,
    myGrooveData.numberOfMeasures,
    myGrooveData.notesPerMeasure,
    myGrooveData.numBeats,
    myGrooveData.noteValue
  );
  var FullNoteHHArray = scaleNoteArrayToFullSize(
    myGrooveData.hh_array,
    myGrooveData.numberOfMeasures,
    myGrooveData.notesPerMeasure,
    myGrooveData.numBeats,
    myGrooveData.noteValue
  );
  var FullNoteSnareArray = scaleNoteArrayToFullSize(
    myGrooveData.snare_array,
    myGrooveData.numberOfMeasures,
    myGrooveData.notesPerMeasure,
    myGrooveData.numBeats,
    myGrooveData.noteValue
  );
  var FullNoteKickArray = scaleNoteArrayToFullSize(
    myGrooveData.kick_array,
    myGrooveData.numberOfMeasures,
    myGrooveData.notesPerMeasure,
    myGrooveData.numBeats,
    myGrooveData.noteValue
  );
  var FullNoteTomsArray = [];

  for (var i = 0; i < constant_NUMBER_OF_TOMS; i++) {
    FullNoteTomsArray[i] = scaleNoteArrayToFullSize(
      myGrooveData.toms_array[i],
      myGrooveData.numberOfMeasures,
      myGrooveData.notesPerMeasure,
      myGrooveData.numBeats,
      myGrooveData.noteValue
    );
  }

  // the crash and ride lines are drawn in the hands voice, after the toms
  [myGrooveData.crash_array, myGrooveData.ride_array].forEach(function (cymbal_array) {
    if (cymbal_array)
      FullNoteTomsArray.push(
        scaleNoteArrayToFullSize(
          cymbal_array,
          myGrooveData.numberOfMeasures,
          myGrooveData.notesPerMeasure,
          myGrooveData.numBeats,
          myGrooveData.noteValue
        )
      );
  });

  var is_triplet_division = isTripletDivisionFromNotesPerMeasure(
    myGrooveData.notesPerMeasure,
    myGrooveData.numBeats,
    myGrooveData.noteValue
  );

  var fullABC = gu.get_top_ABC_BoilerPlate(
    false,
    myGrooveData.title,
    myGrooveData.author,
    myGrooveData.comments,
    myGrooveData.showLegend,
    is_triplet_division,
    myGrooveData.kickStemsUp,
    myGrooveData.numBeats,
    myGrooveData.noteValue,
    renderWidth
  );

  var feelMarkings = getFeelMarkings(
    myGrooveData.straightBars,
    myGrooveData.numberOfMeasures,
    myGrooveData.swingPercent,
    myGrooveData.swingStyle,
    is_triplet_division
  );
  if (feelMarkings.some(Boolean)) {
    // bar by bar (like the editor), so each bar can carry its "Straight" / "Swing"
    fullABC += createMeasureByMeasureABC(
      gu,
      myGrooveData,
      feelMarkings,
      is_triplet_division,
      FullNoteStickingArray,
      FullNoteHHArray,
      FullNoteSnareArray,
      FullNoteKickArray,
      FullNoteTomsArray
    );
    return fullABC;
  }

  fullABC += gu.create_ABC_from_snare_HH_kick_arrays(
    FullNoteStickingArray,
    FullNoteHHArray,
    FullNoteSnareArray,
    FullNoteKickArray,
    FullNoteTomsArray,
    '|\n',
    FullNoteHHArray.length,
    myGrooveData.timeDivision,
    notesPerMeasureInFullSizeArray(
      is_triplet_division,
      myGrooveData.numBeats,
      myGrooveData.noteValue
    ), // notes_per_measure, We scaled up to 48/32 above
    myGrooveData.kickStemsUp,
    myGrooveData.numBeats,
    myGrooveData.noteValue,
    beatPlanOf(myGrooveData, 0, myGrooveData.numberOfMeasures)
  );

  gu.note_mapping_array = create_note_mapping_array_for_highlighting(
    FullNoteHHArray,
    FullNoteSnareArray,
    FullNoteKickArray,
    FullNoteTomsArray,
    FullNoteHHArray.length
  );

  // console.log(fullABC);
  return fullABC;
}

// The ABC for every bar of a groove, one bar at a time (two bars per line, or one
// for 1/32 notes, as in the editor), with each bar's "Straight" / "Swing" marking.
function createMeasureByMeasureABC(
  gu,
  myGrooveData,
  feelMarkings,
  is_triplet_division,
  stickingArray,
  hhArray,
  snareArray,
  kickArray,
  tomsArrays
) {
  var notesPerMeasure = notesPerMeasureInFullSizeArray(
    is_triplet_division,
    myGrooveData.numBeats,
    myGrooveData.noteValue
  );
  var measuresPerLine = myGrooveData.notesPerMeasure >= 32 ? 1 : 2;
  var abc = '';
  gu.note_mapping_array = [];
  for (var measure = 0; measure < myGrooveData.numberOfMeasures; measure++) {
    var start = measure * notesPerMeasure;
    var end = start + notesPerMeasure;
    var toms = tomsArrays.map(function (tomArray) {
      return tomArray.slice(start, end);
    });
    var addon_abc;
    if (measure + 1 == myGrooveData.numberOfMeasures) addon_abc = '|\n';
    else if ((measure + 1) % measuresPerLine === 0) addon_abc = '\n';
    else addon_abc = '\\\n';
    abc += addFeelMarking(
      gu.create_ABC_from_snare_HH_kick_arrays(
        stickingArray.slice(start, end),
        hhArray.slice(start, end),
        snareArray.slice(start, end),
        kickArray.slice(start, end),
        toms,
        addon_abc,
        notesPerMeasure,
        myGrooveData.timeDivision,
        notesPerMeasure,
        myGrooveData.kickStemsUp,
        myGrooveData.numBeats,
        myGrooveData.noteValue,
        beatPlanOf(myGrooveData, measure, measure + 1)
      ),
      feelMarkings[measure]
    );
    gu.note_mapping_array = gu.note_mapping_array.concat(
      create_note_mapping_array_for_highlighting(
        hhArray.slice(start, end),
        snareArray.slice(start, end),
        kickArray.slice(start, end),
        toms,
        notesPerMeasure
      )
    );
  }
  return abc;
}

// --- A time signature for each bar (Infinity Drumming, 2026) ---------------------

/**
 * Write a time signature change at the start of one bar's ABC: an inline
 * "[M:7/8]" at the start of every voice's notes.
 * @param {string} measureABC
 * @param {{top: number, bottom: number}} sig
 */
export function addMeterChange(measureABC, sig) {
  var lines = measureABC.split('\n');
  var inVoice = false;
  for (var i = 0; i < lines.length; i++) {
    if (lines[i].indexOf('V:') === 0) inVoice = true;
    else if (inVoice && lines[i].indexOf('%%') !== 0) {
      lines[i] = '[M:' + sig.top + '/' + sig.bottom + ']' + lines[i];
      inVoice = false;
    }
  }
  return lines.join('\n');
}

// The ABC for a groove whose bars have different time signatures: bar by bar,
// each with its own number of notes and beats, and the new time signature
// written wherever it changes.
function createMixedMeterABC(gu, myGrooveData, renderWidth) {
  var gd = myGrooveData;
  var triplets = isTripletDivision(gd.timeDivision);
  var abc = gu.get_top_ABC_BoilerPlate(
    false,
    gd.title,
    gd.author,
    gd.comments,
    gd.showLegend,
    triplets,
    gd.kickStemsUp,
    gd.numBeats,
    gd.noteValue,
    renderWidth
  );
  var feelMarkings = getFeelMarkings(
    gd.straightBars,
    gd.numberOfMeasures,
    gd.swingPercent,
    gd.swingStyle,
    triplets
  );
  var measuresPerLine = gd.timeDivision >= 32 ? 1 : 2;
  gu.note_mapping_array = [];
  for (var bar = 0; bar < gd.numberOfMeasures; bar++) {
    var notes = fullSizeBar(gd, bar);
    var sig = notes.sig;
    var fullCount = notes.fullCount;
    var hh = notes.hh;
    var snare = notes.snare;
    var kick = notes.kick;
    var toms = notes.toms;
    var addon_abc;
    if (bar + 1 == gd.numberOfMeasures) addon_abc = '|\n';
    else if ((bar + 1) % measuresPerLine === 0) addon_abc = '\n';
    else addon_abc = '\\\n';
    var measureABC = gu.create_ABC_from_snare_HH_kick_arrays(
      notes.sticking,
      hh,
      snare,
      kick,
      toms,
      addon_abc,
      fullCount,
      gd.timeDivision,
      fullCount,
      gd.kickStemsUp,
      sig.top,
      sig.bottom,
      beatPlanOf(gd, bar, bar + 1)
    );
    var previous = bar > 0 ? gd.barTimeSigs[bar - 1] : null;
    if (previous && (previous.top != sig.top || previous.bottom != sig.bottom))
      measureABC = addMeterChange(measureABC, sig);
    abc += addFeelMarking(measureABC, feelMarkings[bar]);
    gu.note_mapping_array = gu.note_mapping_array.concat(
      create_note_mapping_array_for_highlighting(hh, snare, kick, toms, fullCount)
    );
  }
  return abc;
}
