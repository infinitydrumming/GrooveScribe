// Modified by Infinity Drumming, 2026: crash and ride lines, crash 2 and splash sounds, one metronome click per bar, tom ghosts and accents, ride accent, Brazilian swing, swing in any time signature, straight bars, silent cursor markers, flams / drags / ruffs played as grace notes on any drum, a time signature per bar, exact tempo for swung and triplet notes. See CHANGES.md.
// MIDI-file generation (Step 2 extraction from groove_utils.js). Builds a
// data:audio/midi URL from grooveData. Takes a GrooveUtils instance (gu) for
// the note-scaling / triplet / metronome helpers; GrooveUtils delegates here.
// Uses the jsmidgen `Midi` window global (provided by the vendored classic script).

import {
  constant_ABC_HH_Accent,
  constant_ABC_HH_Close,
  constant_ABC_HH_Cow_Bell,
  constant_ABC_HH_Crash,
  constant_ABC_HH_Metronome_Accent,
  constant_ABC_HH_Metronome_Normal,
  constant_ABC_HH_Normal,
  constant_ABC_HH_Open,
  constant_ABC_HH_Ride,
  constant_ABC_HH_Ride_Bell,
  constant_ABC_HH_Stacker,
  constant_ABC_CR_Crash2,
  constant_ABC_CR_Splash,
  constant_ABC_RD_Accent,
  constant_ABC_KI_Normal,
  constant_ABC_KI_SandK,
  constant_ABC_KI_Splash,
  constant_ABC_SN_Accent,
  constant_ABC_SN_Buzz,
  constant_ABC_SN_Drag,
  constant_ABC_SN_Flam,
  constant_ABC_SN_Ghost,
  constant_ABC_SN_Normal,
  constant_ABC_SN_XStick,
  constant_ABC_T1_Normal,
  constant_ABC_T2_Normal,
  constant_ABC_T3_Normal,
  constant_ABC_T4_Normal,
  constant_ABC_T1_Ghost,
  constant_ABC_T2_Ghost,
  constant_ABC_T3_Ghost,
  constant_ABC_T4_Ghost,
  constant_ABC_T1_Accent,
  constant_ABC_T2_Accent,
  constant_ABC_T3_Accent,
  constant_ABC_T4_Accent,
  constant_NUMBER_OF_TOMS,
  constant_OUR_MIDI_HIHAT_ACCENT,
  constant_OUR_MIDI_HIHAT_COW_BELL,
  constant_OUR_MIDI_HIHAT_CRASH,
  constant_OUR_MIDI_CRASH_2,
  constant_OUR_MIDI_SPLASH,
  constant_OUR_MIDI_HIHAT_FOOT,
  constant_OUR_MIDI_HIHAT_METRONOME_ACCENT,
  constant_OUR_MIDI_HIHAT_METRONOME_NORMAL,
  constant_OUR_MIDI_HIHAT_NORMAL,
  constant_OUR_MIDI_HIHAT_OPEN,
  constant_OUR_MIDI_HIHAT_RIDE,
  constant_OUR_MIDI_HIHAT_RIDE_BELL,
  constant_OUR_MIDI_HIHAT_STACKER,
  constant_OUR_MIDI_KICK_NORMAL,
  constant_OUR_MIDI_METRONOME_1,
  constant_OUR_MIDI_CURSOR_MARKER,
  constant_OUR_MIDI_METRONOME_NORMAL,
  constant_OUR_MIDI_SNARE_ACCENT,
  constant_OUR_MIDI_SNARE_BUZZ,
  constant_OUR_MIDI_SNARE_DRAG,
  constant_OUR_MIDI_SNARE_FLAM,
  constant_OUR_MIDI_SNARE_GHOST,
  constant_OUR_MIDI_SNARE_NORMAL,
  constant_OUR_MIDI_SNARE_XSTICK,
  constant_OUR_MIDI_TOM1_NORMAL,
  constant_OUR_MIDI_TOM2_NORMAL,
  constant_OUR_MIDI_TOM3_NORMAL,
  constant_OUR_MIDI_TOM4_NORMAL,
  constant_OUR_MIDI_VELOCITY_ACCENT,
  constant_OUR_MIDI_VELOCITY_GHOST,
  constant_OUR_MIDI_VELOCITY_TOM_GHOST,
  constant_OUR_MIDI_VELOCITY_NORMAL,
} from './constants.js';
import { isTripletDivisionFromNotesPerMeasure, scaleNoteArrayToFullSize } from './musicMath.js';
import { fullSizeBar, isMixedMeter } from './barMeters.js';
import {
  DEFAULT_GRACE_SPACING_MS,
  DEFAULT_GRACE_VOLUME,
  DRAG_SPACING_FACTOR,
  graceNotesForToken,
  withoutGrace,
} from './ornaments.js';

// --- grace notes (flams, drags, ruffs) -------------------------------------------
// Grace notes play a fixed number of milliseconds before their note, whatever the
// tempo, and never move the notes around them: they are slotted into the gap
// before the note.  A note on the first slot of a bar takes its grace notes from
// the end of the previous bar; for the groove's very first note they go at the
// end of the MIDI file, so they lead back into the 1 every time it loops.

// The grace notes of one bar, by slot, with the note tokens stripped of them.
function takeGraceNotes(HH_Array, Snare_Array, Kick_Array, Toms_Array, num_notes) {
  var bySlot = [];
  var found = false;
  var strip = function (array) {
    if (!array) return array;
    var copy = null;
    for (var i = 0; i < num_notes; i++) {
      var graces = graceNotesForToken(array[i]);
      if (!graces) continue;
      if (!bySlot[i]) bySlot[i] = [];
      bySlot[i].push(graces);
      found = true;
      if (!copy) copy = array.slice();
      copy[i] = withoutGrace(array[i]);
    }
    return copy || array;
  };
  var hh = strip(HH_Array);
  var snare = strip(Snare_Array);
  var kick = strip(Kick_Array);
  var toms = Toms_Array
    ? Toms_Array.map(function (tom) {
        return strip(tom);
      })
    : Toms_Array;
  return { found: found, bySlot: bySlot, hh: hh, snare: snare, kick: kick, toms: toms };
}

// The grace-note hits before one slot, as { before: ticks before the note,
// note, velocity }, earliest first.
function graceHitsForSlot(gu, midiTrack, slotGraces) {
  var spacingMs = gu.graceSpacingMs || DEFAULT_GRACE_SPACING_MS;
  var volume = gu.graceVolume || DEFAULT_GRACE_VOLUME;
  // the tempo this track was written at, else the player's
  var tempo = midiTrack.graceTempo || (gu.getTempo ? gu.getTempo() : 80);
  // 128 ticks per quarter note; drags and ruffs are spaced wider than flams
  var ticks = function (ms) {
    return Math.max(1, Math.round((ms * tempo * 128) / 60000));
  };
  var velocity = Math.max(1, Math.round((constant_OUR_MIDI_VELOCITY_NORMAL * volume) / 100));
  var hits = [];
  slotGraces.forEach(function (graces) {
    var spacing = ticks(graces.count > 1 ? spacingMs * DRAG_SPACING_FACTOR : spacingMs);
    for (var k = graces.count; k >= 1; k--)
      hits.push({ before: k * spacing, note: graces.midiNote, velocity: velocity });
  });
  return hits.sort(function (a, b) {
    return b.before - a.before;
  });
}

// ticks of an event's delta time, as written (jsmidgen keeps it as MIDI bytes)
function eventTicks(event) {
  var ticks = 0;
  (event.time || []).forEach(function (b) {
    ticks = (ticks << 7) | (b & 0x7f);
  });
  return ticks;
}

/**
 * Infinity Drumming, 2026: exact timing.  The MIDI library drops the fraction of
 * every delta time (a triplet note is 10.67 ticks, written as 10), so swung and
 * triplet grooves used to play about 1.5% fast.  A track made here carries each
 * fraction over to its next event instead.  Whole-tick timing is unchanged.
 */
export function newExactTimeTrack() {
  var track = new Midi.Track();
  var carried = 0;
  ['addNoteOn', 'addNoteOff'].forEach(function (name) {
    var add = track[name];
    track[name] = function (channel, pitch, time, velocity) {
      var exact = carried + (time || 0);
      var ticks = Math.max(0, Math.round(exact));
      carried = exact - ticks;
      return add.call(track, channel, pitch, ticks, velocity);
    };
  });
  return track;
}

// Slip a grace hit in among the events already on the track, `back` ticks before
// the end of the last one.  Only delta times are split, so no other note moves.
// It goes no earlier than the start of the track's notes (midiTrack.graceFloor).
function insertGraceHitBack(midiTrack, hit, back) {
  var events = midiTrack.events;
  var floor = midiTrack.graceFloor || 0;
  var k = events.length - 1;
  while (k > floor && back > eventTicks(events[k])) {
    back -= eventTicks(events[k]);
    k--;
  }
  if (k <= floor) {
    // not that much track before it: as early as it can go
    k = floor + 1;
    back = k < events.length ? eventTicks(events[k]) : 0;
  }
  if (k >= events.length) {
    midiTrack.addNoteOn(9, hit.note, 0, hit.velocity);
    return;
  }
  var delta = eventTicks(events[k]);
  midiTrack.addNoteOn(9, hit.note, delta - back, hit.velocity);
  var graceEvent = events.pop();
  events[k].setTime(back);
  events.splice(k, 0, graceEvent);
}

// Add grace hits before a note that will play `gap` ticks after the track's last
// event.  Hits that fall in that gap are added in order; earlier ones are slipped
// in among the notes already written (other drums keep playing around them).
// Returns the ticks left between the last added hit and the note.
function addGraceHits(midiTrack, hits, gap) {
  var at = 0; // ticks into the gap
  hits.forEach(function (hit) {
    if (hit.before > gap) {
      insertGraceHitBack(midiTrack, hit, Math.round(hit.before - gap));
      return;
    }
    var when = Math.max(at, gap - hit.before);
    midiTrack.addNoteOn(9, hit.note, when - at, hit.velocity);
    at = when;
  });
  return gap - at;
}

// Grace notes for a bar's first slot, before the bar starts.  Returns the delay
// before the bar's first note.
function startBarGraceNotes(gu, midiTrack, graces) {
  var firstOnTrack = !midiTrack.graceStarted;
  midiTrack.graceStarted = true;
  if (firstOnTrack) gu.graceLeadIn = null;
  if (!graces.bySlot[0] || gu.metronomeSolo) return 0;
  var leadIn = graceHitsForSlot(gu, midiTrack, graces.bySlot[0]);
  // the grace notes before the track's very first note, for a lead-in when playing starts
  if (firstOnTrack) gu.graceLeadIn = leadIn;
  if (!firstOnTrack) return addGraceHits(midiTrack, leadIn, 0);
  graceHitsAtEndOfFile(midiTrack, leadIn);
  return 0;
}

// Grace notes before slot i (i > 0), in the gap before it.  Returns the gap left.
function slotGraceNotes(gu, midiTrack, graces, i, gap) {
  if (i === 0 || !graces.bySlot[i] || gu.metronomeSolo) return gap;
  return addGraceHits(midiTrack, graceHitsForSlot(gu, midiTrack, graces.bySlot[i]), gap);
}

/**
 * Use these grace hits (from gu.graceLeadIn) at the end of a track instead of its
 * own first note's, e.g. when the next file starts on a different bar.
 */
export function setTrackLoopLeadIn(midiTrack, hits) {
  if (hits && hits.length) graceHitsAtEndOfFile(midiTrack, hits);
  else midiTrack.graceLoopHits = null;
}

/**
 * A short MIDI file holding just the grace notes before a groove's first note,
 * played once when the groove starts so that note's flam / drag / ruff is heard.
 */
export function MIDI_build_lead_in_track(gu, hits) {
  var midiFile = new Midi.File();
  var midiTrack = newExactTimeTrack();
  midiFile.addTrack(midiTrack);
  midiTrack.setTempo(gu.getTempo());
  midiTrack.setInstrument(0, 0x13);
  midiTrack.addNoteOff(9, 60, 1); // (the player skips a first note without a blank)
  var left = addGraceHits(midiTrack, hits, hits[0].before + 1);
  midiTrack.addNoteOff(0, 60, left);
  return 'data:audio/midi;base64,' + btoa(midiFile.toBytes());
}

// The groove's first note: its grace notes go at the end of the file.
function graceHitsAtEndOfFile(midiTrack, hits) {
  midiTrack.graceLoopHits = hits;
  if (midiTrack.graceToBytesWrapped) return;
  midiTrack.graceToBytesWrapped = true;
  var toBytes = midiTrack.toBytes;
  midiTrack.toBytes = function () {
    if (midiTrack.graceLoopHits) {
      // they lead into the first note of the next time round, at the end of the file
      addGraceHits(midiTrack, midiTrack.graceLoopHits, 0);
      midiTrack.graceLoopHits = null;
    }
    return toBytes.apply(midiTrack, arguments);
  };
}

export function MIDI_build_midi_url_count_in_track(gu, timeSigTop, timeSigBottom, leadInHits) {
  var midiFile = new Midi.File();
  var midiTrack = newExactTimeTrack();
  midiFile.addTrack(midiTrack);

  midiTrack.setTempo(gu.getTempo());
  midiTrack.setInstrument(0, 0x13);

  // start of midi track
  // Some sort of bug in the midi player makes it skip the first note without a blank
  // TODO: Find and fix midi bug
  midiTrack.addNoteOff(9, 60, 1); // add a blank note for spacing

  var noteDelay = 128; // quarter notes over x/4 time
  if (timeSigBottom == 8)
    noteDelay = 64; // 8th notes over x/8 time
  else if (timeSigBottom == 16) noteDelay = 32; // 16th notes over x/16 time

  // add count in
  midiTrack.addNoteOn(9, constant_OUR_MIDI_METRONOME_1, 0, constant_OUR_MIDI_VELOCITY_NORMAL);
  midiTrack.addNoteOff(9, constant_OUR_MIDI_METRONOME_1, noteDelay);
  for (var i = 1; i < timeSigTop; i++) {
    midiTrack.addNoteOn(
      9,
      constant_OUR_MIDI_METRONOME_NORMAL,
      0,
      constant_OUR_MIDI_VELOCITY_NORMAL
    );
    midiTrack.addNoteOff(9, constant_OUR_MIDI_METRONOME_NORMAL, noteDelay);
  }

  // the grace notes of the groove's first note go at the end of the count-in
  if (leadInHits && leadInHits.length) {
    var lastClick = midiTrack.events.pop(); // the last click's note-off, a beat later
    var left = addGraceHits(midiTrack, leadInHits, noteDelay);
    midiTrack.addNoteOff(9, lastClick.param1, left);
  }

  var midi_url = 'data:audio/midi;base64,' + btoa(midiFile.toBytes());

  return midi_url;
}

export function MIDI_from_HH_Snare_Kick_Arrays(
  gu,
  midiTrack,
  HH_Array,
  Snare_Array,
  Kick_Array,
  Toms_Array,
  midi_output_type,
  metronome_frequency,
  num_notes,
  num_notes_for_swing,
  swing_percentage,
  timeSigTop,
  timeSigBottom,
  swing_style,
  cursor_markers
) {
  // cursor_markers (optional): per slot, true adds a silent note that only moves
  // the playback cursor
  // 'swing' (default) or 'brazilian'; callers that don't say use the player's setting
  if (swing_style === undefined) swing_style = gu.swingStyle;
  var prev_hh_note = 46; // default to open hi-hat so that the first hi-hat note also mutes any previous hh open.
  var midi_channel = 9; // percussion

  if (swing_percentage < 0 || swing_percentage > 0.99) {
    console.log('Swing percentage out of range in GrooveUtils.MIDI_from_HH_Snare_Kick_Arrays');
    swing_percentage = 0;
  }

  // start of midi track
  // Some sort of bug in the midi player makes it skip the first note without a blank
  // TODO: Find and fix midi bug
  // (Infinity Drumming, 2026: its tick is taken off this bar's end, and only this bar's)
  var leadBlankTicks = 0;
  if (midiTrack.events.length < 4) {
    midiTrack.addNoteOff(midi_channel, 60, 1); // add a blank note for spacing
    leadBlankTicks = 1;
  }
  // grace notes are never slipped in before here
  if (midiTrack.graceFloor === undefined) midiTrack.graceFloor = midiTrack.events.length - 1;

  var isTriplets = isTripletDivisionFromNotesPerMeasure(num_notes, timeSigTop, timeSigBottom);
  var offsetClickStartBeat = gu.getMetronomeOptionsOffsetClickStartRotation(isTriplets);
  var delay_for_next_note = 0;

  // flams, drags and ruffs: the drums play the notes, the grace notes are added
  var graces = takeGraceNotes(HH_Array, Snare_Array, Kick_Array, Toms_Array, num_notes);
  HH_Array = graces.hh;
  Snare_Array = graces.snare;
  Kick_Array = graces.kick;
  Toms_Array = graces.toms;
  delay_for_next_note = startBarGraceNotes(gu, midiTrack, graces);

  for (var i = 0; i < num_notes; i++) {
    var duration = 0;

    if (isTriplets) {
      duration = 128 / 12; // "ticks"   16 for 32nd notes.  10.67 for 48th triplets
    } else {
      duration = 16;
    }

    if (swing_percentage !== 0) {
      // swing effects the note placement of the e and the a.  (1e&a)
      // swing increases the distance between the 1 and the e ad shortens the distance between the e and the &
      // likewise the distance between the & and the a is increased and the a and the 1 is shortened
      //  So it sounds like this:   1-e&-a2-e&-a3-e&-a4-e&-a
      var scaler = num_notes / num_notes_for_swing;
      var val = i % (4 * scaler);

      if (val < scaler) {
        // this is the 1, increase the distance between this note and the e
        duration += duration * swing_percentage;
      } else if (val < scaler * 2) {
        // this is the e, shorten the distance between this note and the &
        duration -= duration * swing_percentage;
      } else if (val < scaler * 3) {
        // this is the &, increase the distance between this note and the a
        // (Brazilian swing: shorten it, so the a comes early)
        if (swing_style == 'brazilian') duration -= duration * swing_percentage;
        else duration += duration * swing_percentage;
      } else if (val < scaler * 4) {
        // this is the a, shorten the distance between this note and the 2
        // (Brazilian swing: lengthen it, so the beat lands on time: 1-e&-a2-e&-a)
        if (swing_style == 'brazilian') duration += duration * swing_percentage;
        else duration -= duration * swing_percentage;
      }
    }

    // grace notes before this slot's notes (the first slot's went in above)
    delay_for_next_note = slotGraceNotes(gu, midiTrack, graces, i, delay_for_next_note);

    // Metronome sounds.
    /** @type {number | false} */
    var metronome_note = false;
    var metronome_velocity = constant_OUR_MIDI_VELOCITY_ACCENT;
    if (metronome_frequency > 0) {
      var quarterNoteFrequency = isTriplets ? 12 : 8;
      var eighthNoteFrequency = isTriplets ? 6 : 4;
      var sixteenthNoteFrequency = isTriplets ? 2 : 2;

      var metronome_specific_index = i;
      switch (offsetClickStartBeat) {
        case '1':
          // default do nothing
          break;
        case 'E':
          if (isTriplets) console.log('OffsetClickStart error in MIDI_from_HH_Snare_Kick_Arrays');
          // shift by one sixteenth note
          metronome_specific_index -= sixteenthNoteFrequency;
          break;
        case 'AND':
          if (isTriplets) console.log('OffsetClickStart error in MIDI_from_HH_Snare_Kick_Arrays');
          // shift by two sixteenth notes
          metronome_specific_index -= 2 * sixteenthNoteFrequency;
          break;
        case 'A':
          if (isTriplets) console.log('OffsetClickStart error in MIDI_from_HH_Snare_Kick_Arrays');
          // shift by three sixteenth notes
          metronome_specific_index -= 3 * sixteenthNoteFrequency;
          break;
        case 'TI':
          if (!isTriplets) console.log('OffsetClickStart error in MIDI_from_HH_Snare_Kick_Arrays');
          // shift by one sixteenth note
          metronome_specific_index -= sixteenthNoteFrequency * 2;
          break;
        case 'TA':
          if (!isTriplets) console.log('OffsetClickStart error in MIDI_from_HH_Snare_Kick_Arrays');
          // shift by two sixteenth notes
          metronome_specific_index -= 2 * (sixteenthNoteFrequency * 2);
          break;
        default:
          console.log('bad case in MIDI_from_HH_Snare_Kick_Arrays');
          break;
      }

      if (metronome_specific_index >= 0) {
        // can go negative due to MetronomeOffsetClickStart shift above
        // Special sound on the one
        if (
          metronome_specific_index === 0 ||
          metronome_specific_index % (quarterNoteFrequency * timeSigTop * (4 / timeSigBottom)) === 0
        ) {
          metronome_note = constant_OUR_MIDI_METRONOME_1; // 1 count
        } else if (metronome_specific_index % quarterNoteFrequency === 0) {
          metronome_note = constant_OUR_MIDI_METRONOME_NORMAL; // standard metronome click
        }

        if (!metronome_note && metronome_frequency == 8) {
          // 8th notes requested
          if (metronome_specific_index % eighthNoteFrequency === 0) {
            // click every 8th note
            metronome_note = constant_OUR_MIDI_METRONOME_NORMAL; // standard metronome click
          }
        } else if (!metronome_note && metronome_frequency == 16) {
          // 16th notes requested
          if (metronome_specific_index % sixteenthNoteFrequency === 0) {
            // click every 16th note
            metronome_note = constant_OUR_MIDI_METRONOME_NORMAL; // standard metronome click
            metronome_velocity = 25; // not as loud as the normal click
          }
        }

        // one click per bar: keep only the "1"
        if (metronome_frequency == 1 && metronome_note !== constant_OUR_MIDI_METRONOME_1)
          metronome_note = false;
      }

      if (metronome_note !== false) {
        //if(prev_metronome_note != false)
        //	midiTrack.addNoteOff(midi_channel, prev_metronome_note, 0);
        midiTrack.addNoteOn(midi_channel, metronome_note, delay_for_next_note, metronome_velocity);
        delay_for_next_note = 0; // zero the delay
        //prev_metronome_note = metronome_note;
      }
    }

    if (cursor_markers && cursor_markers[i]) {
      midiTrack.addNoteOn(midi_channel, constant_OUR_MIDI_CURSOR_MARKER, delay_for_next_note, 1);
      delay_for_next_note = 0; // zero the delay
    }

    if (!gu.metronomeSolo) {
      // midiSolo means to play just the metronome
      var hh_velocity = constant_OUR_MIDI_VELOCITY_NORMAL;
      var hh_note = false;
      switch (HH_Array[i]) {
        case constant_ABC_HH_Normal: // normal
        case constant_ABC_HH_Close: // normal
          hh_note = constant_OUR_MIDI_HIHAT_NORMAL;
          break;
        case constant_ABC_HH_Accent: // accent
          if (midi_output_type == 'general_MIDI') {
            hh_note = constant_OUR_MIDI_HIHAT_NORMAL;
            hh_velocity = constant_OUR_MIDI_VELOCITY_ACCENT;
          } else {
            hh_note = constant_OUR_MIDI_HIHAT_ACCENT;
          }
          break;
        case constant_ABC_HH_Open: // open
          hh_note = constant_OUR_MIDI_HIHAT_OPEN;
          break;
        case constant_ABC_HH_Ride: // ride
          hh_note = constant_OUR_MIDI_HIHAT_RIDE;
          break;
        case constant_ABC_HH_Ride_Bell: // ride bell
          hh_note = constant_OUR_MIDI_HIHAT_RIDE_BELL;
          break;
        case constant_ABC_HH_Cow_Bell: // cow bell
          hh_note = constant_OUR_MIDI_HIHAT_COW_BELL;
          break;
        case constant_ABC_HH_Crash: // crash
          hh_note = constant_OUR_MIDI_HIHAT_CRASH;
          break;
        case constant_ABC_HH_Stacker: // stacker
          hh_note = constant_OUR_MIDI_HIHAT_STACKER;
          break;
        case constant_ABC_HH_Metronome_Normal: // Metronome beep
          hh_note = constant_OUR_MIDI_HIHAT_METRONOME_NORMAL;
          break;
        case constant_ABC_HH_Metronome_Accent: // Metronome beep
          hh_note = constant_OUR_MIDI_HIHAT_METRONOME_ACCENT;
          break;
        case false:
          break;
        default:
          console.log('Bad case in GrooveUtils.MIDI_from_HH_Snare_Kick_Arrays');
          break;
      }

      if (hh_note !== false) {
        // need to end hi-hat open notes else the hh open sounds horrible
        if (prev_hh_note !== false) {
          midiTrack.addNoteOff(midi_channel, prev_hh_note, delay_for_next_note);
          prev_hh_note = false;
          delay_for_next_note = 0; // zero the delay
        }
        midiTrack.addNoteOn(midi_channel, hh_note, delay_for_next_note, hh_velocity);
        delay_for_next_note = 0; // zero the delay

        // this if means that only the open hi-hat will get stopped on the next note
        if (HH_Array[i] == constant_ABC_HH_Open) prev_hh_note = hh_note;
      }

      var snare_velocity = constant_OUR_MIDI_VELOCITY_NORMAL;
      var snare_note = false;
      switch (Snare_Array[i]) {
        case constant_ABC_SN_Normal: // normal
          snare_note = constant_OUR_MIDI_SNARE_NORMAL;
          break;
        case constant_ABC_SN_Flam: // flam
          if (midi_output_type == 'general_MIDI') {
            snare_note = constant_OUR_MIDI_SNARE_NORMAL;
            snare_velocity = constant_OUR_MIDI_VELOCITY_ACCENT;
          } else {
            snare_note = constant_OUR_MIDI_SNARE_FLAM;
            snare_velocity = constant_OUR_MIDI_VELOCITY_NORMAL;
          }
          break;
        case constant_ABC_SN_Drag: // drag
          if (midi_output_type == 'general_MIDI') {
            snare_note = constant_OUR_MIDI_SNARE_NORMAL;
            snare_velocity = constant_OUR_MIDI_VELOCITY_ACCENT;
          } else {
            snare_note = constant_OUR_MIDI_SNARE_DRAG;
            snare_velocity = constant_OUR_MIDI_VELOCITY_NORMAL;
          }
          break;
        case constant_ABC_SN_Accent: // accent
          if (midi_output_type == 'general_MIDI') {
            snare_note = constant_OUR_MIDI_SNARE_NORMAL;
            snare_velocity = constant_OUR_MIDI_VELOCITY_ACCENT;
          } else {
            snare_note = constant_OUR_MIDI_SNARE_ACCENT; // custom note
          }
          break;
        case constant_ABC_SN_Ghost: // ghost
          if (midi_output_type == 'general_MIDI') {
            snare_note = constant_OUR_MIDI_SNARE_NORMAL;
            snare_velocity = constant_OUR_MIDI_VELOCITY_GHOST;
          } else {
            snare_note = constant_OUR_MIDI_SNARE_GHOST;
            snare_velocity = constant_OUR_MIDI_VELOCITY_GHOST;
          }
          break;
        case constant_ABC_SN_XStick: // xstick
          snare_note = constant_OUR_MIDI_SNARE_XSTICK;
          break;
        case constant_ABC_SN_Buzz: // xstick
          snare_note = constant_OUR_MIDI_SNARE_BUZZ;
          break;
        case false:
          break;
        default:
          console.log('Bad case in GrooveUtils.MIDI_from_HH_Snare_Kick_Arrays');
          break;
      }

      if (snare_note !== false) {
        //if(prev_snare_note != false)
        //	midiTrack.addNoteOff(midi_channel, prev_snare_note, 0);
        midiTrack.addNoteOn(midi_channel, snare_note, delay_for_next_note, snare_velocity);
        delay_for_next_note = 0; // zero the delay
        //prev_snare_note = snare_note;
      }

      var kick_note = false;
      var kick_splash_note = false;
      switch (Kick_Array[i]) {
        case constant_ABC_KI_Splash: // just HH Foot
          kick_splash_note = constant_OUR_MIDI_HIHAT_FOOT;
          break;
        case constant_ABC_KI_SandK: // Kick & HH Foot
          kick_splash_note = constant_OUR_MIDI_HIHAT_FOOT;
          kick_note = constant_OUR_MIDI_KICK_NORMAL;
          break;
        case constant_ABC_KI_Normal: // just Kick
          kick_note = constant_OUR_MIDI_KICK_NORMAL;
          break;
        case false:
          break;
        default:
          console.log('Bad case in GrooveUtils.MIDI_from_HH_Snare_Kick_Arrays');
          break;
      }
      if (kick_note !== false) {
        //if(prev_kick_note != false)
        //	midiTrack.addNoteOff(midi_channel, prev_kick_note, 0);
        midiTrack.addNoteOn(
          midi_channel,
          kick_note,
          delay_for_next_note,
          constant_OUR_MIDI_VELOCITY_NORMAL
        );
        delay_for_next_note = 0; // zero the delay
        //prev_kick_note = kick_note;
      }
      if (kick_splash_note !== false) {
        if (prev_hh_note !== false) {
          midiTrack.addNoteOff(midi_channel, prev_hh_note, delay_for_next_note);
          prev_hh_note = false;
          delay_for_next_note = 0; // zero the delay
        }
        //if(prev_kick_splash_note != false)
        //	midiTrack.addNoteOff(midi_channel, prev_kick_splash_note, 0);
        midiTrack.addNoteOn(
          midi_channel,
          kick_splash_note,
          delay_for_next_note,
          constant_OUR_MIDI_VELOCITY_NORMAL
        );
        delay_for_next_note = 0; // zero the delay
        //prev_kick_splash_note = kick_splash_note;
      }

      // Toms, plus any extra voices passed after the four toms (the crash and
      // ride lines).  Cymbals here don't cut off an open hi-hat.
      if (Toms_Array) {
        for (var which_array = 0; which_array < Toms_Array.length; which_array++) {
          /** @type {number | false} */
          var tom_note = false;
          var tom_velocity = constant_OUR_MIDI_VELOCITY_NORMAL;
          if (Toms_Array[which_array] && Toms_Array[which_array][i] !== undefined) {
            switch (Toms_Array[which_array][i]) {
              case constant_ABC_HH_Crash:
                tom_note = constant_OUR_MIDI_HIHAT_CRASH;
                break;
              case constant_ABC_CR_Crash2:
                tom_note = constant_OUR_MIDI_CRASH_2;
                break;
              case constant_ABC_CR_Splash:
                tom_note = constant_OUR_MIDI_SPLASH;
                break;
              case constant_ABC_HH_Ride:
                tom_note = constant_OUR_MIDI_HIHAT_RIDE;
                break;
              case constant_ABC_RD_Accent:
                tom_note = constant_OUR_MIDI_HIHAT_RIDE;
                tom_velocity = constant_OUR_MIDI_VELOCITY_ACCENT;
                break;
              case constant_ABC_HH_Ride_Bell:
                tom_note = constant_OUR_MIDI_HIHAT_RIDE_BELL;
                break;
              case constant_ABC_HH_Cow_Bell:
                tom_note = constant_OUR_MIDI_HIHAT_COW_BELL;
                break;
              case constant_ABC_HH_Stacker:
                tom_note = constant_OUR_MIDI_HIHAT_STACKER;
                break;
              case constant_ABC_T1_Normal: // Tom 1
                tom_note = constant_OUR_MIDI_TOM1_NORMAL; // midi code High tom 2
                break;
              case constant_ABC_T2_Normal: // Midi code Mid tom 1
                tom_note = constant_OUR_MIDI_TOM2_NORMAL;
                break;
              case constant_ABC_T3_Normal: // Midi code Mid tom 2
                tom_note = constant_OUR_MIDI_TOM3_NORMAL;
                break;
              case constant_ABC_T4_Normal: // Midi code Low Tom 1
                tom_note = constant_OUR_MIDI_TOM4_NORMAL;
                break;
              // tom ghost notes and accents: same tom, quieter / louder
              case constant_ABC_T1_Ghost:
                tom_note = constant_OUR_MIDI_TOM1_NORMAL;
                tom_velocity = constant_OUR_MIDI_VELOCITY_TOM_GHOST;
                break;
              case constant_ABC_T1_Accent:
                tom_note = constant_OUR_MIDI_TOM1_NORMAL;
                tom_velocity = constant_OUR_MIDI_VELOCITY_ACCENT;
                break;
              case constant_ABC_T2_Ghost:
                tom_note = constant_OUR_MIDI_TOM2_NORMAL;
                tom_velocity = constant_OUR_MIDI_VELOCITY_TOM_GHOST;
                break;
              case constant_ABC_T2_Accent:
                tom_note = constant_OUR_MIDI_TOM2_NORMAL;
                tom_velocity = constant_OUR_MIDI_VELOCITY_ACCENT;
                break;
              case constant_ABC_T3_Ghost:
                tom_note = constant_OUR_MIDI_TOM3_NORMAL;
                tom_velocity = constant_OUR_MIDI_VELOCITY_TOM_GHOST;
                break;
              case constant_ABC_T3_Accent:
                tom_note = constant_OUR_MIDI_TOM3_NORMAL;
                tom_velocity = constant_OUR_MIDI_VELOCITY_ACCENT;
                break;
              case constant_ABC_T4_Ghost:
                tom_note = constant_OUR_MIDI_TOM4_NORMAL;
                tom_velocity = constant_OUR_MIDI_VELOCITY_TOM_GHOST;
                break;
              case constant_ABC_T4_Accent:
                tom_note = constant_OUR_MIDI_TOM4_NORMAL;
                tom_velocity = constant_OUR_MIDI_VELOCITY_ACCENT;
                break;
              case false:
                break;
              default:
                console.log('Bad case in GrooveUtils.MIDI_from_HH_Snare_Kick_Arrays');
                break;
            }
          }
          if (tom_note !== false) {
            midiTrack.addNoteOn(midi_channel, tom_note, delay_for_next_note, tom_velocity);
            delay_for_next_note = 0; // zero the delay
          }
        }
      }
    } // end metronomeSolo

    delay_for_next_note += duration;
  }

  if (delay_for_next_note) midiTrack.addNoteOff(0, 60, delay_for_next_note - leadBlankTicks); // add a blank note for spacing
} // end of function

/**
 * Build a base64 data: URL for the MIDI rendering of a groove.
 *
 * @param {Object} gu  The owning GrooveUtils instance (for note/tab helpers).
 * @param {import('./grooveData.js').GrooveData} myGrooveData  The groove to render.
 * @param {string} [MIDI_type]  Optional MIDI rendering variant.
 * @returns {string}
 */
export function create_MIDIURLFromGrooveData(gu, myGrooveData, MIDI_type) {
  var midiFile = new Midi.File();
  var midiTrack = newExactTimeTrack();
  midiFile.addTrack(midiTrack);

  midiTrack.setTempo(myGrooveData.tempo);
  midiTrack.graceTempo = myGrooveData.tempo; // grace notes are timed in ms at this tempo
  midiTrack.setInstrument(0, 0x13);

  var swing_percentage = myGrooveData.swingPercent / 100;

  // bars with different time signatures: each bar with its own length and beats
  if (isMixedMeter(myGrooveData.barTimeSigs, myGrooveData.numberOfMeasures)) {
    addMixedMeterBars(gu, midiTrack, myGrooveData, MIDI_type, swing_percentage);
    return 'data:audio/midi;base64,' + btoa(midiFile.toBytes());
  }

  // the midi converter expects all the arrays to be 32 or 48 notes long.
  // Expand them
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

  // the midi functions expect just one measure at a time to work correctly
  // call once for each measure
  var measure_notes = FullNoteHHArray.length / myGrooveData.numberOfMeasures;
  for (var measureIndex = 0; measureIndex < myGrooveData.numberOfMeasures; measureIndex++) {
    var FullNoteTomsArray = [];
    for (var i = 0; i < constant_NUMBER_OF_TOMS; i++) {
      var orig_measure_notes = myGrooveData.notesPerMeasure;
      FullNoteTomsArray[i] = scaleNoteArrayToFullSize(
        myGrooveData.toms_array[i].slice(
          orig_measure_notes * measureIndex,
          orig_measure_notes * (measureIndex + 1)
        ),
        1,
        myGrooveData.notesPerMeasure,
        myGrooveData.numBeats,
        myGrooveData.noteValue
      );
    }
    // crash and ride lines play after the toms
    [myGrooveData.crash_array, myGrooveData.ride_array].forEach(function (cymbal_array) {
      if (!cymbal_array) return;
      FullNoteTomsArray.push(
        scaleNoteArrayToFullSize(
          cymbal_array.slice(
            myGrooveData.notesPerMeasure * measureIndex,
            myGrooveData.notesPerMeasure * (measureIndex + 1)
          ),
          1,
          myGrooveData.notesPerMeasure,
          myGrooveData.numBeats,
          myGrooveData.noteValue
        )
      );
    });

    gu.MIDI_from_HH_Snare_Kick_Arrays(
      midiTrack,
      FullNoteHHArray.slice(measure_notes * measureIndex, measure_notes * (measureIndex + 1)),
      FullNoteSnareArray.slice(measure_notes * measureIndex, measure_notes * (measureIndex + 1)),
      FullNoteKickArray.slice(measure_notes * measureIndex, measure_notes * (measureIndex + 1)),
      FullNoteTomsArray,
      MIDI_type,
      myGrooveData.metronomeFrequency,
      measure_notes,
      // notes per measure at the note setting (the editor does the same), so
      // swing groups each beat in any time signature, not only 4/4
      (myGrooveData.timeDivision * myGrooveData.numBeats) / myGrooveData.noteValue,
      // a straight bar plays without swing
      myGrooveData.straightBars && myGrooveData.straightBars[measureIndex] ? 0 : swing_percentage,
      myGrooveData.numBeats,
      myGrooveData.noteValue,
      myGrooveData.swingStyle || 'swing'
    );
  }

  var midi_url = 'data:audio/midi;base64,' + btoa(midiFile.toBytes());

  return midi_url;
}

// The bars of a groove whose bars have different time signatures, one at a time,
// each scaled to its own number of notes and played in its own time signature.
function addMixedMeterBars(gu, midiTrack, gd, MIDI_type, swing_percentage) {
  for (var bar = 0; bar < gd.numberOfMeasures; bar++) {
    var notes = fullSizeBar(gd, bar);
    gu.MIDI_from_HH_Snare_Kick_Arrays(
      midiTrack,
      notes.hh,
      notes.snare,
      notes.kick,
      notes.toms,
      MIDI_type,
      gd.metronomeFrequency,
      notes.hh.length,
      (gd.timeDivision * notes.sig.top) / notes.sig.bottom, // swing groups each beat of this bar
      gd.straightBars && gd.straightBars[bar] ? 0 : swing_percentage,
      notes.sig.top,
      notes.sig.bottom,
      gd.swingStyle || 'swing'
    );
  }
}
