// Javascript for the Groove Scribe HTML application
// Groove Scribe is for drummers and helps create sheet music with an easy to use WYSIWYG groove editor.
//
// Author: Lou Montulli
// Original Creation date: Feb 2015.
//
//  Copyright 2015-2020 Lou Montulli, Mike Johnston
//  Modified by Infinity Drumming, 2026: sections (A, B) and bar numbers, 32nds beat by beat, tom rim clicks, practise some bars of a permutation, an exercise's practice settings and instructions in its link, mid tom, hi-hat foot, crash and ride lines, collapsing tom lines, copy / paste a bar, metronome bar click and groove / click bars, tom ghosts and accents, page title, ride accent, snare click adds a normal hit, permutations from the figure layout with repeats, alternating kick / snare permutations, auto-scroll switch, Brazilian swing, swung click in click-only bars, straight bars in a swung groove, speed-up target tempo, groove / click bars counted bar by bar, cursor timing and Brazilian-swing cursor snapping, groove / click bars in permutations, no cursor during the count-in, cursor through the click-only bars, exact tempo for swung and triplet notes, practice timer and speed-up every so many bars, counting over the notes, Save & Share with My Grooves and our own short links, title and author in the header, flams / drags / ruffs on every drum, a time signature for each bar with classic x/8 grouping, more metronome clicks, diddles, triplets in x/8 bars, notes beat by beat (quarter-note triplets), the counting choices, dense bars one a line on phones, a copy of a bar right after it, copy / paste through the device clipboard, muted lines kept as bars come and go, fat back kick permutations, permutations over a multi-bar ostinato, long music put on the page quickly, permutations in more time signatures, tempo changes heard from the next bar line, the rep counter, the permutations called the Alphabet, copying some notes, practising some bars of a groove. See CHANGES.md.
//
//  This file is part of Project Groove Scribe.
//
//  Groove Scribe is free software: you can redistribute it and/or modify
//  it under the terms of the GNU General Public License as published by
//  the Free Software Foundation, either version 2 of the License, or
//  (at your option) any later version.
//
//  Groove Scribe is distributed in the hope that it will be useful,
//  but WITHOUT ANY WARRANTY; without even the implied warranty of
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//  GNU General Public License for more details.
//
//  You should have received a copy of the GNU General Public License
//  along with Groove Scribe.  If not, see <http://www.gnu.org/licenses/>.

// GrooveUtils and the drum-notation / MIDI constants come from groove_utils.js.
// Vendored libraries (Midi, MIDI, Pablo, ShareButton) remain window globals
// provided by the classic <script> tags loaded before this module.
import { GrooveUtils } from './groove_utils.js';
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
  constant_ABC_STICK_BOTH,
  constant_ABC_STICK_COUNT,
  constant_ABC_STICK_L,
  constant_ABC_STICK_OFF,
  constant_ABC_STICK_R,
  constant_ABC_T1_Normal,
  constant_ABC_T2_Normal,
  constant_ABC_T4_Normal,
  constant_ABC_T1_Ghost,
  constant_ABC_T2_Ghost,
  constant_ABC_T4_Ghost,
  constant_ABC_T1_Accent,
  constant_ABC_T1_Rim,
  constant_ABC_T2_Rim,
  constant_ABC_T4_Rim,
  constant_ABC_T2_Accent,
  constant_ABC_T4_Accent,
  constant_RIDE_VOICE_INDEX,
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
  constant_OUR_MIDI_SNARE_ACCENT,
  constant_OUR_MIDI_SNARE_BUZZ,
  constant_OUR_MIDI_SNARE_GHOST,
  constant_OUR_MIDI_SNARE_NORMAL,
  constant_OUR_MIDI_SNARE_XSTICK,
  constant_OUR_MIDI_TOM1_NORMAL,
  constant_OUR_MIDI_TOM2_NORMAL,
  constant_OUR_MIDI_TOM4_NORMAL,
  constant_OUR_MIDI_VELOCITY_NORMAL,
  constant_OUR_MIDI_VELOCITY_ACCENT,
  constant_OUR_MIDI_VELOCITY_TOM_GHOST,
  constant_sticking_right_on_color_rgb,
  constant_sticking_left_on_color_rgb,
  constant_sticking_both_on_color_rgb,
  constant_sticking_count_on_color_rgb,
  constant_MAX_MEASURES,
} from './constants.js';
import { beamGroupEnds } from './musicMath.js';
import { newExactTimeTrack } from './midiFile.js';
import { loadMyGrooves, saveMyGroove, removeMyGroove, myGroovesMenuHTML } from './myGrooves.js';
import {
  parsePracticeLimit,
  practiceLimitToText,
  barsBeforePracticeEnds,
  practiceLeftText,
  speedUpStepsDue,
} from './practiceTimer.js';
import * as _perm from './permutations.js';
import { sectionRuns, formBars, barsOfSection } from './sections.js';
import * as _blocks from './noteBlocks.js';
import * as _view from './viewHtml.js';
import * as _grid from './gridState.js';
import {
  getFeelMarkings,
  addFeelMarking,
  addMeterChange,
  musicLayout,
  musicLineBroken,
  notesOnALine,
  defineGlyphsOnce,
} from './abcNotation.js';
import { barSig, barNoteCount, barStride, isMixedMeter, divisionFitsBar } from './barMeters.js';
import { scaleTabMeasure } from './noteArrays.js';
import { isTimedClick, parseMetronomeFrequency } from './metronome.js';
import { MUTE_LINES, MAX_SPEED_UP_BARS } from './practiceSettings.js';
import { COUNT_MODES } from './countModes.js';
import {
  beatCharForDivision,
  beatChoices,
  beatGroups,
  beatSlots,
  divisionForBeats,
  gridOfBeats,
  gridOfChoice,
  hasBeatNotes,
  inferBeats,
  makeBeatPlan,
  normalizeBeats,
  slotIsUsed,
} from './beatNotes.js';
import {
  hasDiddle,
  ornamentChar,
  ornamentFromChar,
  ornamentFromToken,
  withoutDiddle,
  withoutGrace,
  clampGraceSpacing,
  clampGraceVolume,
  DEFAULT_GRACE_SPACING_MS,
  DEFAULT_GRACE_VOLUME,
  DRAG_SPACING_FACTOR,
} from './ornaments.js';

// GrooveWriter class.   The only one in this file.

function GrooveWriter() {
  'use strict';

  var root = this;

  root.myGrooveUtils = new GrooveUtils();
  root.myGrooveUtils.percentForSheetMusic = function (percent) {
    percent = playingPercentToGroovePercent(percent);
    if (percent < 0) return percent; // count-in or click-only bar: nothing to follow
    if (practisedBars().length) return practisedMusicPercent(percent);
    if (class_permutation_type == 'none' || get_permutation_repeats() < 2) return percent;
    // the run plays each figure "Play each" times through the ostinato's bars;
    // the music writes it once over them
    var shown = get_numberOfActivePermutationSections();
    var ostinato = get_ostinato_bars();
    var bars = get_numberOfPermutationBars();
    var position = Math.min(percent * bars, bars - 1e-9);
    var bar = Math.floor(position);
    var figure = Math.floor(bar / (get_permutation_repeats() * ostinato));
    return (figure * ostinato + (bar % ostinato) + (position - bar)) / (shown * ostinato);
  };

  var class_undo_stack = [];
  var class_redo_stack = [];
  var constant_undo_stack_max_size = 40;

  // public class vars
  var class_number_of_measures = 1;
  var class_time_division = parseInt(root.myGrooveUtils.getQueryVariableFromURL('Div', '16'), 10); // default to 16ths
  var class_num_beats_per_measure = 4; // TimeSigTop
  var class_note_value_per_measure = 4; // TimeSigBottom
  var class_notes_per_measure = root.myGrooveUtils.calc_notes_per_measure(
    class_time_division,
    class_num_beats_per_measure,
    class_note_value_per_measure
  );
  var class_metronome_auto_speed_up_active = false;
  var class_metronome_count_in_active = false;
  var class_metronome_count_in_is_playing = false;
  // "Groove / click bars" metronome option: play the groove for some bars, then
  // only the click for some bars, and repeat
  var class_groove_click_active = false;
  var class_groove_click_groove_bars = 4;
  var class_groove_click_click_bars = 4;
  // The groove / click option plays one cycle at a time: N groove bars (bars of the
  // groove, or of the permutation) then M click-only bars. The groove's bars keep
  // counting through the click bars, so it comes back in where it would have been.
  var class_groove_click_cycle_start_bar = 0; // groove bar the next cycle starts on
  var class_groove_click_playing_start_bar = 0; // ... and the cycle now playing
  // for each bar of the MIDI now playing: true when it plays straight (for the cursor)
  var class_loaded_midi_straight_bars = [];
  // per bar (index 0 = bar 1): true plays that bar straight when the groove is swung
  var class_straight_bars = [];
  // per bar (index 0 = bar 1): its section's letter ('' for none), and how many
  // times its section plays (a section has its first bar's), see sections.js
  var class_bar_sections = [];
  var class_section_repeats = [];
  // each bar's time signature ({ top, bottom }) when the bars differ, else empty
  // (all bars are class_num_beats_per_measure / class_note_value_per_measure).
  // Every bar keeps class_notes_per_measure note slots (the longest bar's); a
  // shorter bar hides the rest (see barMeters.js).
  var class_bar_time_sigs = [];
  // the Mixed note setting (Div 48): each bar's beats, one character a beat ("ssqq",
  // see beatNotes.js); the grid shows only their slots (Infinity Drumming, 2026).
  // The 32nds note setting has them too when a beat has 32nd notes and others don't
  // ("sssd"), on its own grid of 8 slots a beat.
  var class_beat_notes = [];
  // the beats the next note setting gets (changing grids, see setGrooveBeats)
  var class_beats_for_next_division = null;
  // the beat whose menu is open: { bar (0-based), beat (0-based) }
  var class_beat_menu_target = null;
  // the bar the time signature popup is for (0-based), or null for the whole groove
  var class_time_sig_popup_bar = null;

  // set debugMode immediately so we can use it in index.html
  root.myGrooveUtils.debugMode = parseInt(
    root.myGrooveUtils.getQueryVariableFromURL('Debug', '0'),
    10
  );
  root.myGrooveUtils.grooveDBAuthoring = parseInt(
    root.myGrooveUtils.getQueryVariableFromURL('GDB_Author', '0'),
    10
  );

  // private vars in the scope of the class
  var class_app_title = 'Infinity Scribe | Infinity Drumming';
  var class_permutation_type = 'none';
  var class_advancedEditIsOn = false;
  var class_measure_for_note_label_click = 0;
  var class_which_index_last_clicked = 0; // which note was last clicked for the context menu

  // local constants (UI colors used only by the note setters; the shared "on"
  // colors the gridState readers also compare against now live in constants.js)
  var constant_note_on_color_hex = '#000000'; // black
  var constant_note_off_color_hex = '#FFF';
  var constant_note_border_color_hex = '#999';
  var constant_hihat_note_off_color_hex = '#CCC';
  var constant_note_hidden_color_rgb = 'transparent';
  var constant_sticking_right_off_color_rgb = 'rgb(204, 204, 204)';
  var constant_sticking_left_off_color_rgb = 'rgb(204, 204, 204)';
  var constant_snare_accent_on_color_hex = '#FFF';

  // functions below

  root.numberOfMeasures = function () {
    return class_number_of_measures;
  };

  root.notesPerMeasure = function () {
    return class_notes_per_measure;
  };

  // is the division a triplet groove?   12, 24, or 48 notes
  function usingTriplets() {
    if (root.myGrooveUtils.isTripletDivision(class_time_division)) return true;

    return false;
  }

  // --- A time signature for each bar (Infinity Drumming, 2026) -------------------
  function barSigOf(bar) {
    return barSig(
      class_bar_time_sigs,
      bar || 0,
      class_num_beats_per_measure,
      class_note_value_per_measure
    );
  }
  // each bar's time signature for grooveData (empty when they are all the same)
  function currentBarTimeSigs() {
    if (!isMixedMeterGroove()) return [];
    return class_bar_time_sigs.slice(0, class_number_of_measures);
  }
  // a bar's ABC with the new time signature written in, where it changes
  // Bar `shown` of the bars written (every bar, or some practised): its time
  // signature when it isn't the one before it (the first: bar 1's), and when some
  // are practised the next bar's number as in the whole groove (set before this
  // one, as the music engine numbers the bar after; the first is in the heading)
  // (with every bar, its section's marks: `addon` ends the bar's lines)
  function writtenBarABC(barABC, shownBars, shown, numbered, addon) {
    var bar = shownBars[shown];
    var before = shown > 0 ? shownBars[shown - 1] : 0;
    if (barSigLabel(bar) != barSigLabel(before)) barABC = addMeterChange(barABC, barSigOf(bar));
    if (!numbered) return withSectionMarks(barABC, bar, addon);
    var next = shownBars[shown + 1];
    if (next === undefined) return barABC;
    return '%%setbarnb ' + (next + 1) + '\n' + barABC;
  }
  // what ends a bar's lines in the music: the end (a closing repeat sign is end
  // enough), a new line, or the line going on
  function barLineEnd(shownBars, shown, barsPerLine, numbered) {
    if (shown + 1 == shownBars.length)
      return !numbered && endsRepeatedSection(shownBars[shown]) ? '\n' : '|\n';
    return (shown + 1) % barsPerLine === 0 ? '\n' : '\\\n';
  }
  function endsRepeatedSection(bar) {
    return currentSectionRuns().some(function (run) {
      return run.to == bar && run.repeats > 1;
    });
  }
  // the music's bar numbers: on every bar after the first (Infinity Drumming,
  // 2026), and over bars being practised which they are
  function musicBarsHeading() {
    return practisedBarsHeading() || (class_number_of_measures > 1 ? '%%measurenb 1\n' : '');
  }
  // the bars the music writes: every bar, or those practised (Infinity Drumming, 2026)
  function barsWritten() {
    var practised = practisedBars();
    return practised.length ? practised : allBars();
  }
  // over the bars practised: which they are ("Bars 1-2"), and their numbers on
  // ('' with every bar)
  function practisedBarsHeading() {
    var bars = practisedBars().map(function (bar) {
      return bar + 1;
    });
    if (!bars.length) return '';
    // a section, or sections, by name ("Section B")
    var text = practiseBarsText();
    var which = (bars.length > 1 ? 'Bars ' : 'Bar ') + _perm.barListToText(bars);
    if (/^[A-F](, [A-F])*$/.test(text)) which = (text.length > 1 ? 'Sections ' : 'Section ') + text;
    return '%%measurenb 1\nP:' + which + '\n';
  }
  function barSigLabel(bar) {
    var sig = barSigOf(bar);
    return sig.top + '/' + sig.bottom;
  }
  function barCountOf(bar) {
    return barNoteCount(class_time_division, barSigOf(bar));
  }
  function isMixedMeterGroove() {
    return isMixedMeter(class_bar_time_sigs, class_number_of_measures);
  }
  function barStrideFor(division) {
    return barStride(
      division,
      class_bar_time_sigs,
      class_number_of_measures,
      class_num_beats_per_measure,
      class_note_value_per_measure
    );
  }
  // How long each bar is, in quarter notes
  function barLengthInBeats(bar) {
    var sig = barSigOf(bar);
    return (sig.top * 4) / sig.bottom;
  }
  // Where a time position (0..1 through bars `bars`, e.g. the whole groove)
  // falls, given each bar's length: { index (into bars), fraction through it }
  function positionInBars(percent, bars) {
    var lengths = bars.map(barLengthInBeats);
    var total = lengths.reduce(function (a, b) {
      return a + b;
    }, 0);
    var at = percent * total;
    for (var k = 0; k < bars.length; k++) {
      if (at < lengths[k] || k == bars.length - 1)
        return { index: k, fraction: Math.min(Math.max(at / lengths[k], 0), 0.999999) };
      at -= lengths[k];
    }
    return { index: 0, fraction: 0 };
  }
  // The time position (0..1) of a point in a bar of the groove
  function groovePercentAt(bar, fraction) {
    var before = 0;
    var total = 0;
    for (var b = 0; b < class_number_of_measures; b++) {
      if (b < bar) before += barLengthInBeats(b);
      total += barLengthInBeats(b);
    }
    return (before + fraction * barLengthInBeats(bar)) / total;
  }
  function allBars() {
    var bars = [];
    for (var b = 0; b < class_number_of_measures; b++) bars.push(b);
    return bars;
  }

  // a note slot past the end of a shorter bar (hidden on the grid, always a rest)
  function isHiddenSlot(id) {
    if (!isMixedMeterGroove()) return false;
    return id % class_notes_per_measure >= barCountOf(Math.floor(id / class_notes_per_measure));
  }

  var GRID_CELL_PREFIXES = [
    'beatSlot',
    'sticking',
    'bg-highlight',
    'crash',
    'ride',
    'hi-hat',
    'tom1-',
    'tom2-',
    'snare',
    'tom4-',
    'kick',
    'hhfoot',
  ];

  // Hide each shorter bar's extra note slots on the grid (and the gaps between
  // them): every bar has the longest bar's number of slots.
  function hideUnusedBarSlots() {
    if (!isMixedMeterGroove()) return;
    for (var id = 0; id < class_notes_per_measure * class_number_of_measures; id++) {
      if (!isHiddenSlot(id)) continue;
      GRID_CELL_PREFIXES.forEach(function (prefix) {
        var cell = document.getElementById(prefix + id);
        if (!cell) return;
        cell.classList.add('hiddenBarSlot');
        // the gap before it, if it ends the bar's last group, and the gap after it
        var before = cell.previousElementSibling;
        if (before && before.className == 'space_between_note_groups' && !isHiddenSlot(id - 1))
          before.classList.add('hiddenBarSlot');
        var after = cell.nextElementSibling;
        if (after && after.className == 'space_between_note_groups')
          after.classList.add('hiddenBarSlot');
      });
    }
  }

  // Hidden slots are always rests (e.g. after "all on", or a pasted longer bar).
  /** @type {Array<[function(number): boolean, function(number, string, boolean): void]>} */
  var HIDDEN_SLOT_LINES = [
    [is_hh_on, set_hh_state],
    [is_snare_on, set_snare_state],
    [is_kick_part_on, set_kick_state],
    [is_hhfoot_on, set_kick_state],
    [
      function (id) {
        return !!get_crash_state(id, 'ABC');
      },
      set_crash_state,
    ],
    [
      function (id) {
        return !!get_ride_state(id, 'ABC');
      },
      set_ride_state,
    ],
    [
      function (id) {
        return is_tom_on(id, 1);
      },
      set_tom1_state,
    ],
    [
      function (id) {
        return is_tom_on(id, 2);
      },
      set_tom2_state,
    ],
    [
      function (id) {
        return is_tom_on(id, 4);
      },
      set_tom4_state,
    ],
  ];
  function clearHiddenBarSlots() {
    if (!isMixedMeterGroove() && !beatGrid()) return;
    for (var id = 0; id < class_notes_per_measure * class_number_of_measures; id++) {
      if (!isHiddenSlot(id) && !isBeatHiddenSlot(id)) continue;
      HIDDEN_SLOT_LINES.forEach(function (line) {
        if (line[0](id)) line[1](id, 'off', false);
      });
      set_sticking_state(id, 'off', false);
    }
  }

  // --- Notes beat by beat (Infinity Drumming, 2026) ------------------------------
  // In the Mixed note setting each beat has its own notes: 8ths, 16ths, triplets,
  // sextuplets or quarter-note triplets over two beats (see beatNotes.js).  The
  // grid shows only the slots they use, and the row of beats over each bar
  // chooses them.  In other note settings that row turns the groove into Mixed.
  // A beat of 32nd notes puts the groove on the 32nds grid instead (8ths, 16ths
  // and 32nds there; triplets and 32nds can't share a groove).
  var BEAT_SHORT_NAMES = {
    4: {
      e: '8ths',
      s: '16ths',
      d: '32nds',
      t: 'triplets',
      x: '16th trip.',
      q: 'quarter trip.',
      a: '32nd trip.',
    },
    8: { e: '8th', s: '16ths', d: '32nds', x: '16th trip.', t: '8th trip.', a: '32nd trip.' },
  };

  // the grid the beats are on: 48 (Mixed), 32 (32nds with beats of their own), or
  // 0 (a plain note setting)
  function beatGrid() {
    if (class_time_division == 48) return 48;
    return class_time_division == 32 && class_beat_notes.some(Boolean) ? 32 : 0;
  }

  // a bar's beats beat by beat ('' in other note settings, and in x/2 and x/16
  // bars, which keep the plain grid)
  function beatsOfBar(bar) {
    var grid = beatGrid();
    if (!grid) return '';
    var sig = barSigOf(bar);
    if (!hasBeatNotes(sig)) return '';
    return normalizeBeats(class_beat_notes[bar] || '', sig, undefined, grid);
  }

  // every bar's beats, for the groove data ([] in a plain note setting)
  function currentBeatNotes() {
    if (!beatGrid()) return [];
    var bars = [];
    for (var bar = 0; bar < class_number_of_measures; bar++) bars.push(beatsOfBar(bar));
    return bars;
  }

  // a grid slot (note id) its beat doesn't use, beat by beat
  function isBeatHiddenSlot(id) {
    if (!beatGrid()) return false;
    var bar = Math.floor(id / class_notes_per_measure);
    var slot = id % class_notes_per_measure;
    var beats = beatsOfBar(bar);
    if (!beats || slot >= barCountOf(bar)) return false;
    return !slotIsUsed(beatGroups(beats, barSigOf(bar), beatGrid()), slot);
  }

  // hide the slots each beat doesn't use (the row of beats hides its own)
  function applyBeatHiding() {
    for (var id = 0; id < class_notes_per_measure * class_number_of_measures; id++) {
      var hidden = isBeatHiddenSlot(id);
      GRID_CELL_PREFIXES.forEach(function (prefix) {
        var cell = document.getElementById(prefix + id);
        if (cell) cell.classList.toggle('beatHiddenSlot', hidden);
      });
    }
  }

  // The row of beats over bar `bar`: [{beat, start, span, step, label, title}]
  // in the bar's grid slots, or null where beats can't be chosen (32nd notes,
  // x/2 and x/16 bars).
  function beatHeaderOfBar(bar) {
    var sig = barSigOf(bar);
    if (!hasBeatNotes(sig)) return null;
    var names = BEAT_SHORT_NAMES[sig.bottom];
    var numbersOf = function (group) {
      return group.beats > 1
        ? group.beat + 1 + '\u2013' + (group.beat + group.beats)
        : String(group.beat + 1);
    };
    if (beatGrid()) {
      return beatGroups(beatsOfBar(bar), sig, beatGrid()).map(function (group) {
        var numbers = numbersOf(group);
        return {
          beat: group.beat,
          start: group.start,
          span: group.span,
          step: group.step,
          label: numbers + ' <small>' + names[group.char] + '</small>',
          title: 'Beat ' + numbers + ': ' + names[group.char] + '. Tap to change',
        };
      });
    }
    var char = beatCharForDivision(class_time_division, sig);
    if (!char) return null;
    var grid = gridOfChoice(char) || 48;
    var ratio = barCountOf(bar) / (beatSlots(sig, grid) * sig.top); // grid slots to the beats'
    var plain = '';
    for (var b = 0; b < sig.top; b++) plain += char;
    return beatGroups(plain, sig, grid).map(function (group) {
      var numbers = numbersOf(group);
      return {
        beat: group.beat,
        start: group.start * ratio,
        span: group.span * ratio,
        step: 1,
        label: numbers,
        title: 'Beat ' + numbers + '. Tap to give this beat its own notes',
      };
    });
  }

  // where the grid's note groups end in a Mixed bar: at the end of each beat (or
  // triplet over two beats)
  function beatGroupEndsOfBar(bar) {
    var beats = beatsOfBar(bar);
    if (!beats) return null;
    return beatGroups(beats, barSigOf(bar), beatGrid()).map(function (group) {
      return group.start + group.span;
    });
  }

  // the beat plan of one bar for the music writers (null outside Mixed)
  function beatPlanOfBar(bar) {
    var beats = beatsOfBar(bar);
    return beats ? makeBeatPlan([beats], [barSigOf(bar)], beatGrid()) : null;
  }

  // how many slots each slot's note lasts in a Mixed bar, for diddles (undefined otherwise)
  function slotSpansOfBar(bar, slots) {
    var plan = beatPlanOfBar(bar);
    if (!plan) return undefined;
    var spans = [];
    for (var i = 0; i < slots; i++) spans.push(plan.slotsPerNoteAt(i, 0));
    return spans;
  }

  // A Mixed bar's beats from its notes as tab lines ({HH: 'x--x...', ...}, the
  // bar starting at `start`): the plainest that shows them all (on the grid the
  // beats are on)
  function beatsFromTabLines(tabLines, start, sig) {
    var lines = [];
    for (var name in tabLines) {
      if (name.indexOf('Orn') === 0 || name == 'Stickings') continue;
      lines.push(
        String(tabLines[name] || '')
          .split('')
          .map(function (ch) {
            return ch != '-' && ch;
          })
      );
    }
    return inferBeats(lines, start, sig, beatGrid() || 48);
  }

  // A beat's number in the row of beats: its menu of choices
  root.beatHeaderClick = function (event, measureNum, beat) {
    var bar = measureNum - 1;
    var sig = barSigOf(bar);
    var menu = document.getElementById('beatContextMenu');
    if (!menu || !hasBeatNotes(sig)) return;
    class_beat_menu_target = { bar: bar, beat: beat };
    var current = beatGrid() ? beatsOfBar(bar).charAt(beat) : '';
    var html = '<li class="beatMenuTitle">Notes for beat ' + (beat + 1) + '</li>';
    beatChoices(sig).forEach(function (choice) {
      html += beatMenuItemHTML(choice, beat, sig, current);
    });
    menu.innerHTML = html;
    if (!event) event = window.event;
    if (event && (event.clientX || event.clientY)) {
      menu.style.top = event.clientY + 12 + 'px';
      menu.style.left = event.clientX - 40 + 'px';
    }
    root.myGrooveUtils.toggleContextMenu(menu, event && event.currentTarget);
  };

  // One choice in a beat's menu: greyed out when it doesn't fit (a triplet over two
  // beats needs the next one; 32nd notes and triplets can't share a groove)
  function beatMenuItemHTML(choice, beat, sig, current) {
    var room = beat + choice.beats <= sig.top;
    var shares = room && gridOfBeats(beatsWithChoice(class_beat_menu_target, choice).join('')) >= 0;
    var fits = room && shares;
    var note = '';
    if (room && !shares)
      note =
        choice.char == 'd' ? '(not with triplets in the groove)' : '(not with 32nds in the groove)';
    else if (choice.beats > 1 && fits)
      note = '(beats ' + (beat + 1) + '–' + (beat + choice.beats) + ')';
    else if (choice.beats > 1) note = '(needs the next beat)';
    return (
      '<li data-beat-choice="' +
      choice.char +
      '" class="' +
      (choice.char == current ? 'menuChecked' : '') +
      (fits ? '' : ' disabled') +
      '"' +
      (fits ? ' onclick="myGrooveWriter.beatChoiceClick(\'' + choice.char + '\')"' : '') +
      '>' +
      choice.label +
      (note ? ' <span class="beatMenuNote">' + note + '</span>' : '') +
      '</li>'
    );
  }

  // A choice in a beat's menu: the beat (or this beat and the next) gets those notes
  root.beatChoiceClick = function (char) {
    root.myGrooveUtils.hideContextMenu(document.getElementById('beatContextMenu'));
    var target = class_beat_menu_target;
    if (!target) return;
    var sig = barSigOf(target.bar);
    var choice = beatChoices(sig).find(function (c) {
      return c.char == char;
    });
    if (!choice || target.beat + choice.beats > sig.top) return;
    var bars = beatsWithChoice(target, choice);
    if (gridOfBeats(bars.join('')) < 0) return; // 32nd notes and triplets
    if (!beatGrid() && !plainDivisionFitsBeatByBeat()) return;
    setGrooveBeats(bars);
  };

  // every bar's beats: a plain note setting's on every beat (16ths: 's')
  function grooveBeats() {
    return allBars().map(function (bar) {
      if (beatGrid()) return beatsOfBar(bar);
      var sig = barSigOf(bar);
      var char = hasBeatNotes(sig) ? beatCharForDivision(class_time_division, sig) : null;
      var beats = '';
      for (var b = 0; char && b < sig.top; b++) beats += char;
      return beats;
    });
  }

  // every bar's beats with `choice` on the beat of the menu (or this beat and the
  // next); a beat that was part of a triplet over two beats gives the other beat
  // back to the bar's usual notes
  function beatsWithChoice(target, choice) {
    var bars = grooveBeats();
    var sig = barSigOf(target.bar);
    var beats = bars[target.bar].split('');
    var usual = mostCommonPlainBeat(beats);
    beatGroups(beats.join(''), sig, gridOfBeats(beats.join('')) == 32 ? 32 : 48).forEach(
      function (group) {
        var overlaps =
          group.beat < target.beat + choice.beats && target.beat < group.beat + group.beats;
        if (overlaps && group.beats > 1)
          for (var k = group.beat; k < group.beat + group.beats; k++) beats[k] = usual;
      }
    );
    for (var k = target.beat; k < target.beat + choice.beats; k++) beats[k] = choice.char;
    var needs = gridOfBeats(beats.join(''));
    var grid = needs == 32 ? 32 : 48;
    // (32nd notes with triplets stay as they are, for the caller to see)
    bars[target.bar] =
      needs < 0 ? beats.join('') : normalizeBeats(beats.join(''), sig, usual, grid);
    return bars;
  }

  // the bar's commonest choice that covers one beat (16ths if none)
  function mostCommonPlainBeat(beats) {
    var counts = {};
    var best = 's';
    beats.forEach(function (char) {
      if (char == 'q' || char == 't' || char == 'a') return;
      counts[char] = (counts[char] || 0) + 1;
      if (counts[char] > (counts[best] || 0)) best = char;
    });
    return best;
  }

  // Can a groove in a plain note setting have notes beat by beat? Every bar needs
  // its beats (not quarter notes).
  function plainDivisionFitsBeatByBeat() {
    var fits = allBars().every(function (bar) {
      return beatCharForDivision(class_time_division, barSigOf(bar));
    });
    if (!fits)
      window.alert(
        'Beat by beat notes work with 8ths, 16ths, 32nds and triplets. Change the Notes setting first.'
      );
    return fits;
  }

  // Lay the groove out for these beats (every bar's): on the Mixed grid, the
  // 32nds grid (with a beat of 32nd notes, or already on it without triplets), or
  // a plain note setting when every beat has the same plain notes (all 16ths: Notes
  // 16ths).  Grids that don't divide each other go by way of 16ths, so the notes
  // stay where they are.
  function setGrooveBeats(bars) {
    var sigs = allBars().map(barSigOf);
    var needs = gridOfBeats(bars.join(''));
    var grid = needs || (class_time_division == 32 ? 32 : 48);
    var division = divisionForBeats(bars, sigs, grid);
    var plain = division != grid || /^d*$/.test(bars.join(''));
    keepingMutes(
      function (bar) {
        return [bar];
      },
      function () {
        try {
          var route = divisionRoute(class_time_division, division);
          route.forEach(function (step, i) {
            class_beats_for_next_division = i == route.length - 1 && !plain ? bars : null;
            root.changeDivision(step); // (keeps the notes; hides the slots no beat uses)
          });
        } finally {
          class_beats_for_next_division = null;
        }
      }
    );
  }

  // the note settings to go through from one to another, keeping the notes
  function divisionRoute(from, to) {
    var exact = function (a, b) {
      return a % b === 0 || b % a === 0;
    };
    if (exact(from, to)) return [to];
    if (exact(from, 16) && exact(16, to)) return [16, to];
    return [48, 16, to]; // from triplets to 32nds
  }

  function addOrRemoveKeywordFromClass(tag_class, keyword, addElseRemove) {
    var return_val = true;

    if (tag_class) {
      if (tag_class.className != undefined) {
        if (addElseRemove) {
          if (tag_class.className.indexOf(keyword) < 0) {
            tag_class.className += ' ' + keyword;
          }
        } else {
          tag_class.className = tag_class.className.replace(' ' + keyword, '');
        }
      } else {
        console.log(
          'Warning in addOrRemoveKeywordFromClassName: null className for tag id: ' + tag_class.id
        );
        console.trace();
        return_val = false;
      }
    } else {
      console.log('Warning in addOrRemoveKeywordFromClassName: null tag_class passed in');
      return_val = false;
    }

    return return_val;
  }

  function addOrRemoveKeywordFromClassById(tagId, keyword, addElseRemove) {
    var tag_class = document.getElementById(tagId);

    if (!addOrRemoveKeywordFromClass(tag_class, keyword, addElseRemove))
      console.log('Warning in addOrRemoveKeywordFromClassById bad ID: ' + tagId);
  }

  function selectButton(element) {
    // highlight the new div by adding selected css class
    addOrRemoveKeywordFromClass(element, 'buttonSelected', true);
  }

  function unselectButton(element) {
    // remove selected class if it exists
    addOrRemoveKeywordFromClass(element, 'buttonSelected', false);
  }

  // --- Clickable-grid note state (extracted to gridState.js) -----------------
  // Thin wrappers preserving the in-file API; delegate to the pure DOM readers.
  function is_snare_on(id) {
    return _grid.is_snare_on(id);
  }
  function get_snare_state(id, returnType) {
    return _grid.get_snare_state(id, returnType);
  }
  function is_tom_on(id, tom_num) {
    return _grid.is_tom_on(id, tom_num);
  }
  function get_tom_state(id, tom_num, returnType) {
    return _grid.get_tom_state(id, tom_num, returnType);
  }
  function is_kick_part_on(id) {
    return _grid.is_kick_part_on(id);
  }
  function is_hhfoot_on(id) {
    return _grid.is_hhfoot_on(id);
  }
  function get_kick_state(id, returnType) {
    return _grid.get_kick_state(id, returnType);
  }
  function is_hh_on(id) {
    return _grid.is_hh_on(id);
  }
  function get_hh_state(id, returnType) {
    return _grid.get_hh_state(id, returnType);
  }
  function get_sticking_state(id, returnType) {
    return _grid.get_sticking_state(id, returnType);
  }
  function get_crash_state(id, returnType) {
    return _grid.get_crash_state(id, returnType);
  }
  function get_ride_state(id, returnType) {
    return _grid.get_ride_state(id, returnType);
  }

  function play_single_note_for_note_setting(note_val, velocity) {
    if (velocity === undefined) velocity = constant_OUR_MIDI_VELOCITY_NORMAL;
    if (MIDI.WebAudio) {
      MIDI.WebAudio.noteOn(9, note_val, velocity, 0);
    } else if (MIDI.AudioTag) {
      MIDI.AudioTag.noteOn(9, note_val, velocity, 0);
    }
  }

  // returns the ABC notation for the snare state
  // false = off
  //
  //  c == Snare Normal</li>
  //  !accent!c == Snare Accent</li>
  //  _c == Ghost Note    shows an x with a circle around it.   Needs improvement
  //  ^c == xstick   shows an x

  // returns the ABC notation for the Tom state
  // false = off
  // "x" = normal tom

  // set the tom note on with type
  // set the tom note on with type: 'off', 'normal', 'accent' or 'ghost'
  // (accent and ghost are drawn like the snare's: a white ">" on the black
  // circle, or the circle replaced by a bracketed dot)
  function set_tom_state(id, tom_num, mode, make_sound) {
    var part = function (name) {
      return document.getElementById(name + tom_num + '-' + id);
    };
    var circle = part('tom_circle');
    var ghost = part('tom_ghost');
    var accent = part('tom_accent');
    var rim = part('tom_rim');
    if (ghost) ghost.style.color = constant_note_hidden_color_rgb;
    if (accent) accent.style.color = constant_note_hidden_color_rgb;
    if (rim) rim.style.color = constant_note_hidden_color_rgb;
    circle.style.borderColor = constant_note_border_color_hex;

    var velocity = constant_OUR_MIDI_VELOCITY_NORMAL;
    switch (mode) {
      case 'off':
        circle.style.backgroundColor = constant_note_off_color_hex;
        clear_ornament('T' + tom_num, id);
        return;
      case 'normal':
        circle.style.backgroundColor = constant_note_on_color_hex;
        break;
      case 'accent':
        circle.style.backgroundColor = constant_note_on_color_hex;
        if (accent) accent.style.color = constant_snare_accent_on_color_hex;
        velocity = constant_OUR_MIDI_VELOCITY_ACCENT;
        break;
      case 'ghost':
        circle.style.backgroundColor = constant_note_hidden_color_rgb;
        circle.style.borderColor = constant_note_hidden_color_rgb;
        if (ghost) ghost.style.color = constant_note_on_color_hex;
        velocity = constant_OUR_MIDI_VELOCITY_TOM_GHOST;
        break;
      case 'rim':
        // a rim click: an x, the circle left empty, like the snare's cross-stick
        circle.style.backgroundColor = constant_note_off_color_hex;
        if (rim) rim.style.color = constant_note_on_color_hex;
        if (make_sound) play_single_note_for_note_setting(constant_OUR_MIDI_SNARE_XSTICK);
        return;
      default:
        console.log('bad switch in set_tom_state');
        return;
    }

    if (make_sound) play_tom_sound(tom_num, velocity);
  }

  function play_tom_sound(tom_num, velocity) {
    var tomSounds = {
      1: constant_OUR_MIDI_TOM1_NORMAL,
      2: constant_OUR_MIDI_TOM2_NORMAL,
      4: constant_OUR_MIDI_TOM4_NORMAL,
    };
    if (tomSounds[tom_num]) play_single_note_for_note_setting(tomSounds[tom_num], velocity);
    else console.log('bad switch in set_tom_state. bad tom num:' + tom_num);
  }

  // silly helpers, but needed for argument compatibility with the other set states
  function set_tom1_state(id, mode, make_sound) {
    set_tom_state(id, 1, mode, make_sound);
  }

  function set_tom2_state(id, mode, make_sound) {
    set_tom_state(id, 2, mode, make_sound);
  }

  function set_tom4_state(id, mode, make_sound) {
    set_tom_state(id, 4, mode, make_sound);
  }

  // is the any kick note on for this note in the measure?

  // returns the ABC notation for the kick state
  // false = off
  // "F" = normal kick
  // "^d," = splash
  // "F^d,"  = kick & splash

  // set the kick note on with type
  function set_kick_state(id, mode, make_sound) {
    // the kick's flam / drag / ruff goes when the kick does
    if (mode == 'off' || mode == 'splash') clear_ornament('K', id);
    // hide everything optional
    document.getElementById('kick_circle' + id).style.backgroundColor =
      constant_note_hidden_color_rgb;
    // the hi-hat foot row shows a grey "x" when off, like the hi-hat row
    document.getElementById('kick_splash' + id).style.color = constant_hihat_note_off_color_hex;

    // turn stuff on conditionally
    switch (mode) {
      case 'off':
        document.getElementById('kick_circle' + id).style.backgroundColor =
          constant_note_off_color_hex;
        document.getElementById('kick_circle' + id).style.borderColor =
          constant_note_border_color_hex;
        break;
      case 'normal':
        document.getElementById('kick_circle' + id).style.backgroundColor =
          constant_note_on_color_hex;
        document.getElementById('kick_circle' + id).style.borderColor =
          constant_note_border_color_hex;
        if (make_sound) play_single_note_for_note_setting(constant_OUR_MIDI_KICK_NORMAL);
        break;
      case 'splash':
        // the hi-hat foot has its own row now, so the kick row shows an empty kick
        document.getElementById('kick_splash' + id).style.color = constant_note_on_color_hex;
        document.getElementById('kick_circle' + id).style.backgroundColor =
          constant_note_off_color_hex;
        document.getElementById('kick_circle' + id).style.borderColor =
          constant_note_border_color_hex;
        if (make_sound) play_single_note_for_note_setting(constant_OUR_MIDI_HIHAT_FOOT);
        break;
      case 'kick_and_splash':
        document.getElementById('kick_circle' + id).style.backgroundColor =
          constant_note_on_color_hex;
        document.getElementById('kick_circle' + id).style.borderColor =
          constant_note_border_color_hex;
        document.getElementById('kick_splash' + id).style.color = constant_note_on_color_hex;
        if (make_sound) play_single_note_for_note_setting(constant_OUR_MIDI_HIHAT_FOOT);
        if (make_sound) play_single_note_for_note_setting(constant_OUR_MIDI_KICK_NORMAL);
        break;
      default:
        console.log('bad switch in set_kick_state');
        break;
    }
  }

  // The kick and the hi-hat foot share one voice (kick_array / the URL "K" line)
  // but have separate rows in the grid.  These change one foot and keep the other.
  // mode is 'off' or 'normal'
  function set_kick_part_state(id, mode, make_sound) {
    var footOn = is_hhfoot_on(id);
    if (mode == 'off') {
      set_kick_state(id, footOn ? 'splash' : 'off', false);
    } else {
      set_kick_state(id, footOn ? 'kick_and_splash' : 'normal', false);
      if (make_sound) play_single_note_for_note_setting(constant_OUR_MIDI_KICK_NORMAL);
    }
  }

  // mode is 'off' or 'normal'
  function set_hhfoot_state(id, mode, make_sound) {
    var kickOn = is_kick_part_on(id);
    if (mode == 'off') {
      set_kick_state(id, kickOn ? 'normal' : 'off', false);
    } else {
      set_kick_state(id, kickOn ? 'kick_and_splash' : 'splash', false);
      if (make_sound) play_single_note_for_note_setting(constant_OUR_MIDI_HIHAT_FOOT);
    }
  }

  // --- Flams, drags and ruffs on the grid (Infinity Drumming, 2026) ------------
  // A note's ornament is kept on its grid cell (data-orn, one link character, see
  // ornaments.js) and shown as a small label on the note.  gridState adds it to
  // the note's ABC token when bars are read.
  var ORNAMENT_NAMES = { f: 'Flam', d: 'Drag', r: 'Ruff' };
  var ORNAMENT_SHORT = { f: 'fl', d: 'dr', r: 'ru' };
  var GRACE_DRUM_NAMES = {
    S: 'snare',
    K: 'kick',
    T1: 'high tom',
    T2: 'mid tom',
    T4: 'floor tom',
    H: 'hi-hat',
  };
  var GRACE_DRUM_SHORT = { S: 'sn', K: 'bd', T1: 'ht', T2: 'mt', T4: 'ft', H: 'hh' };
  // the grid's note types and the lines they are on
  var ORNAMENT_LINE_FOR_TYPE = {
    hh: 'H',
    snare: 'S',
    kick: 'K',
    tom1: 'T1',
    tom2: 'T2',
    tom4: 'T4',
    crash: 'C',
    ride: 'R',
  };

  function set_ornament(line, id, ornament_char) {
    // (a diddle line: the note's diddle, "d" or "-")
    if (_grid.DIDDLE_LINE[line]) {
      set_diddle(_grid.DIDDLE_LINE[line], id, ornament_char == 'd');
      return;
    }
    var cell = document.getElementById(_grid.ORNAMENT_CELL_PREFIX[line] + id);
    if (!cell) return;
    var ornament = ornamentFromChar(ornament_char);
    if (!ornament) {
      cell.removeAttribute('data-orn');
      cell.removeAttribute('data-orn-label');
      cell.removeAttribute('title');
      return;
    }
    var label = ORNAMENT_SHORT[ornament.type];
    var title = ORNAMENT_NAMES[ornament.type];
    if (ornament.on) {
      label += ' ' + GRACE_DRUM_SHORT[ornament.on];
      title += ', grace notes on the ' + GRACE_DRUM_NAMES[ornament.on];
    }
    cell.setAttribute('data-orn', ornament_char);
    cell.setAttribute('data-orn-label', label);
    cell.setAttribute('title', title);
  }

  // a note's flam / drag / ruff and its diddle go when the note is turned off
  function clear_ornament(line, id) {
    set_ornament(line, id, '-');
    set_diddle(line, id, false);
  }

  // --- Diddles (Infinity Drumming, 2026) -----------------------------------------
  // A diddle (double stroke) is kept on the note's grid cell as data-did and shown
  // as a slash through the note.  gridState adds it to the note's ABC token.
  function set_diddle(line, id, on) {
    var cell = document.getElementById(_grid.ORNAMENT_CELL_PREFIX[line] + id);
    if (!cell) return;
    if (on) cell.setAttribute('data-did', 'd');
    else cell.removeAttribute('data-did');
  }

  function is_line_note_on(line, id) {
    if (_grid.DIDDLE_LINE[line]) line = _grid.DIDDLE_LINE[line];
    switch (line) {
      case 'H':
        return is_hh_on(id);
      case 'S':
        return is_snare_on(id);
      case 'K':
        return is_kick_part_on(id);
      case 'T1':
        return is_tom_on(id, 1);
      case 'T2':
        return is_tom_on(id, 2);
      case 'T4':
        return is_tom_on(id, 4);
      case 'C':
        return !!get_crash_state(id, 'ABC');
      case 'R':
        return !!get_ride_state(id, 'ABC');
    }
    return false;
  }

  // The ornaments of the grid as tab lines, one character per note, collected
  // alongside the notes' tab lines when bars are added, removed, pasted or the
  // note setting changes.
  // (with a diddle line for each: Hd, Sd, ...)
  function emptyOrnamentLines() {
    var lines = { H: '', S: '', K: '', T1: '', T2: '', T4: '', C: '', R: '' };
    for (var diddleLine in _grid.DIDDLE_LINE) lines[diddleLine] = '';
    return lines;
  }
  function addOrnamentChars(lines, id) {
    for (var line in lines) lines[line] += _grid.get_ornament_char(line, id);
  }
  // put them back (scaled like setNotesFromURLData scales notes), on notes that are on
  function setOrnamentsFromTabLines(lines, numberOfMeasures) {
    var notesOnScreen = class_notes_per_measure * numberOfMeasures;
    for (var line in lines) {
      var chars = (lines[line] || '').replace(/[:|]/g, '');
      if (!chars.length) continue;
      var stringScaler = 1;
      var displayScaler = 1;
      if (chars.length > notesOnScreen && chars.length / notesOnScreen >= 2)
        stringScaler = Math.ceil(chars.length / notesOnScreen);
      else if (chars.length < notesOnScreen && notesOnScreen / chars.length >= 2)
        displayScaler = Math.ceil(notesOnScreen / chars.length);
      for (
        var j = 0, id = 0;
        j < chars.length && id < notesOnScreen;
        j += stringScaler, id += displayScaler
      )
        set_ornament(line, id, is_line_note_on(line, id) ? chars[j] : '-');
    }
  }

  function set_snare_state(id, mode, make_sound) {
    // hide everything optional
    document.getElementById('snare_circle' + id).style.backgroundColor =
      constant_note_hidden_color_rgb;
    document.getElementById('snare_circle' + id).style.borderColor = constant_note_hidden_color_rgb;
    document.getElementById('snare_ghost' + id).style.color = constant_note_hidden_color_rgb;
    document.getElementById('snare_accent' + id).style.color = constant_note_hidden_color_rgb;
    document.getElementById('snare_xstick' + id).style.color = constant_note_hidden_color_rgb;
    document.getElementById('snare_buzz' + id).style.color = constant_note_hidden_color_rgb;
    document.getElementById('snare_flam' + id).style.color = constant_note_hidden_color_rgb;
    document.getElementById('snare_drag' + id).style.color = constant_note_hidden_color_rgb;

    // turn stuff on conditionally
    switch (mode) {
      case 'off':
        document.getElementById('snare_circle' + id).style.backgroundColor =
          constant_note_off_color_hex;
        document.getElementById('snare_circle' + id).style.borderColor =
          constant_note_border_color_hex;
        clear_ornament('S', id);
        break;
      case 'normal':
        document.getElementById('snare_circle' + id).style.backgroundColor =
          constant_note_on_color_hex;
        document.getElementById('snare_circle' + id).style.borderColor =
          constant_note_border_color_hex;
        if (make_sound) play_single_note_for_note_setting(constant_OUR_MIDI_SNARE_NORMAL);
        break;
      // the old snare flam (accented) and drag: now an ornament on the note
      case 'flam':
        set_snare_state(id, 'accent', make_sound);
        set_ornament('S', id, 'f');
        break;
      case 'drag':
        set_snare_state(id, 'normal', make_sound);
        set_ornament('S', id, 'd');
        break;
      case 'ghost':
        document.getElementById('snare_ghost' + id).style.color = constant_note_on_color_hex;
        if (make_sound) play_single_note_for_note_setting(constant_OUR_MIDI_SNARE_GHOST);
        break;
      case 'accent':
        document.getElementById('snare_circle' + id).style.backgroundColor =
          constant_note_on_color_hex;
        document.getElementById('snare_circle' + id).style.borderColor =
          constant_note_border_color_hex;
        document.getElementById('snare_accent' + id).style.color =
          constant_snare_accent_on_color_hex;
        if (make_sound) play_single_note_for_note_setting(constant_OUR_MIDI_SNARE_ACCENT);
        break;
      case 'xstick':
        document.getElementById('snare_xstick' + id).style.color = constant_note_on_color_hex;
        if (make_sound) play_single_note_for_note_setting(constant_OUR_MIDI_SNARE_XSTICK);
        break;
      case 'buzz':
        document.getElementById('snare_buzz' + id).style.color = constant_note_on_color_hex;
        if (make_sound) play_single_note_for_note_setting(constant_OUR_MIDI_SNARE_BUZZ);
        break;
      default:
        console.log('bad switch in set_snare_state');
        break;
    }
  }

  // returns the ABC notation for the HH state
  // false = off
  // see the top constants for mappings

  // TODO: refactor this using a lookup table of constants
  function set_hh_state(id, mode, make_sound) {
    // hide everything optional
    document.getElementById('hh_cross' + id).style.color = constant_note_hidden_color_rgb;
    document.getElementById('hh_ride' + id).style.color = constant_note_hidden_color_rgb;
    document.getElementById('hh_ride_bell' + id).style.color = constant_note_hidden_color_rgb;
    document.getElementById('hh_cow_bell' + id).style.color = constant_note_hidden_color_rgb;
    document.getElementById('hh_crash' + id).style.color = constant_note_hidden_color_rgb;
    document.getElementById('hh_stacker' + id).style.color = constant_note_hidden_color_rgb;
    document.getElementById('hh_metronome_normal' + id).style.color =
      constant_note_hidden_color_rgb;
    document.getElementById('hh_metronome_accent' + id).style.color =
      constant_note_hidden_color_rgb;
    document.getElementById('hh_open' + id).style.color = constant_note_hidden_color_rgb;
    document.getElementById('hh_close' + id).style.color = constant_note_hidden_color_rgb;
    document.getElementById('hh_accent' + id).style.color = constant_note_hidden_color_rgb;

    // turn stuff on conditionally
    switch (mode) {
      case 'off':
        document.getElementById('hh_cross' + id).style.color = constant_hihat_note_off_color_hex;
        break;
      case 'normal':
        document.getElementById('hh_cross' + id).style.color = constant_note_on_color_hex;
        if (make_sound) play_single_note_for_note_setting(constant_OUR_MIDI_HIHAT_NORMAL);
        break;
      // Crashes and rides have their own lines now.  Older grooves carry them
      // in the hi-hat line, so move them across and leave the hi-hat empty.
      case 'ride':
      case 'ride_bell':
      case 'cow_bell':
      case 'stacker':
        document.getElementById('hh_cross' + id).style.color = constant_hihat_note_off_color_hex;
        set_ride_state(id, mode, make_sound);
        break;
      case 'crash':
        document.getElementById('hh_cross' + id).style.color = constant_hihat_note_off_color_hex;
        set_crash_state(id, 'crash', make_sound);
        break;
      case 'metronome_normal':
        document.getElementById('hh_metronome_normal' + id).style.color =
          constant_note_on_color_hex;
        if (make_sound) play_single_note_for_note_setting(constant_OUR_MIDI_HIHAT_METRONOME_NORMAL);
        break;
      case 'metronome_accent':
        document.getElementById('hh_metronome_accent' + id).style.color =
          constant_note_on_color_hex;
        if (make_sound) play_single_note_for_note_setting(constant_OUR_MIDI_HIHAT_METRONOME_ACCENT);
        break;
      case 'open':
        document.getElementById('hh_cross' + id).style.color = constant_note_on_color_hex;
        document.getElementById('hh_open' + id).style.color = constant_note_on_color_hex;
        if (make_sound) play_single_note_for_note_setting(constant_OUR_MIDI_HIHAT_OPEN);
        break;
      case 'close':
        document.getElementById('hh_cross' + id).style.color = constant_note_on_color_hex;
        document.getElementById('hh_close' + id).style.color = constant_note_on_color_hex;
        if (make_sound) play_single_note_for_note_setting(constant_OUR_MIDI_HIHAT_NORMAL);
        break;
      case 'accent':
        document.getElementById('hh_cross' + id).style.color = constant_note_on_color_hex;
        document.getElementById('hh_accent' + id).style.color = constant_note_on_color_hex;
        if (make_sound) play_single_note_for_note_setting(constant_OUR_MIDI_HIHAT_ACCENT);
        break;
      default:
        console.log('bad switch in set_hh_state');
        break;
    }
  }

  // Crash line.  mode: 'off', 'normal' / 'crash' (crash 1), 'crash2', 'splash'
  function set_crash_state(id, mode, make_sound) {
    var parts = { crash: 'crash_c1', crash2: 'crash_c2', splash: 'crash_splash' };
    var sounds = {
      crash: constant_OUR_MIDI_HIHAT_CRASH,
      crash2: constant_OUR_MIDI_CRASH_2,
      splash: constant_OUR_MIDI_SPLASH,
    };
    if (mode == 'normal') mode = 'crash';
    if (mode == 'off') clear_ornament('C', id);
    set_cymbal_line_state(id, mode, make_sound, parts, sounds, 'crash_c1');
  }

  // Ride line.  mode: 'off', 'normal' / 'ride', 'ride_accent', 'ride_bell', 'cow_bell', 'stacker'
  function set_ride_state(id, mode, make_sound) {
    var parts = {
      ride: 'ride_ride',
      ride_accent: ['ride_ride', 'ride_accent'], // the ride mark plus a ">"
      ride_bell: 'ride_bell',
      cow_bell: 'ride_cowbell',
      stacker: 'ride_stacker',
    };
    var sounds = {
      ride: constant_OUR_MIDI_HIHAT_RIDE,
      ride_accent: [constant_OUR_MIDI_HIHAT_RIDE, constant_OUR_MIDI_VELOCITY_ACCENT],
      ride_bell: constant_OUR_MIDI_HIHAT_RIDE_BELL,
      cow_bell: constant_OUR_MIDI_HIHAT_COW_BELL,
      stacker: constant_OUR_MIDI_HIHAT_STACKER,
    };
    if (mode == 'normal') mode = 'ride';
    if (mode == 'off') clear_ornament('R', id);
    set_cymbal_line_state(id, mode, make_sound, parts, sounds, 'ride_ride');
  }

  // Shared by the crash and ride lines: hide every note part, then show the
  // one(s) for `mode` (or the grey off-mark for 'off').  A sound is a MIDI note,
  // or [note, velocity].
  function set_cymbal_line_state(id, mode, make_sound, parts, sounds, offPart) {
    var partList = function (p) {
      return Array.isArray(p) ? p : [p];
    };
    for (var name in parts)
      partList(parts[name]).forEach(function (p) {
        document.getElementById(p + id).style.color = constant_note_hidden_color_rgb;
      });

    if (mode == 'off') {
      document.getElementById(offPart + id).style.color = constant_hihat_note_off_color_hex;
    } else if (parts[mode]) {
      partList(parts[mode]).forEach(function (p) {
        document.getElementById(p + id).style.color = constant_note_on_color_hex;
      });
      if (make_sound) {
        var sound = partList(sounds[mode]);
        play_single_note_for_note_setting(sound[0], sound[1]);
      }
    } else {
      console.log('bad mode in set_cymbal_line_state: ' + mode);
    }
  }

  function set_sticking_state(id, new_state, make_sound) {
    // turn both off
    document.getElementById('sticking_right' + id).style.color = constant_note_hidden_color_rgb;
    document.getElementById('sticking_left' + id).style.color = constant_note_hidden_color_rgb;
    document.getElementById('sticking_both' + id).style.color = constant_note_hidden_color_rgb;
    document.getElementById('sticking_count' + id).style.color = constant_note_hidden_color_rgb;

    switch (new_state) {
      case 'off':
        // show them all greyed out.
        document.getElementById('sticking_right' + id).style.color =
          constant_sticking_right_off_color_rgb;
        document.getElementById('sticking_left' + id).style.color =
          constant_sticking_left_off_color_rgb;
        break;
      case 'right':
        document.getElementById('sticking_right' + id).style.color =
          constant_sticking_right_on_color_rgb;
        break;
      case 'left':
        document.getElementById('sticking_left' + id).style.color =
          constant_sticking_left_on_color_rgb;
        break;
      case 'both':
        document.getElementById('sticking_both' + id).style.color =
          constant_sticking_both_on_color_rgb;
        break;
      case 'count':
        var count_state = root.myGrooveUtils.figure_out_sticking_count_for_index(
          id,
          class_notes_per_measure,
          class_time_division,
          class_note_value_per_measure
        );

        document.getElementById('sticking_count' + id).style.color =
          constant_sticking_count_on_color_rgb;
        document.getElementById('sticking_count' + id).innerHTML = '' + count_state;
        break;

      default:
        console.log('Bad state in set_sticking_state: ' + new_state);
        break;
    }
  }

  function sticking_rotate_state(id) {
    var new_state = false;
    var sticking_state = get_sticking_state(id, 'ABC');

    // figure out the next state
    // we could get fancy here and default down strokes to R and upstrokes to L
    // for now we will rotate through (Off, R, L, BOTH) in order
    if (sticking_state == constant_ABC_STICK_OFF) {
      new_state = 'right';
    } else if (sticking_state == constant_ABC_STICK_R) {
      new_state = 'left';
    } else if (sticking_state == constant_ABC_STICK_L) {
      new_state = 'both';
    } else if (sticking_state == constant_ABC_STICK_BOTH) {
      new_state = 'count';
    } else {
      new_state = 'off';
    }

    set_sticking_state(id, new_state, true);
  }

  // highlight the note, this is used to play along with the midi track
  // only one note for each instrument can be highlighted at a time
  // Also unhighlight other instruments if their index is not equal to the passed in index
  // this means that only notes falling on the current beat will be highlighted.
  var class_cur_hh_highlight_id = false;
  var class_cur_tom1_highlight_id = false;
  var class_cur_tom4_highlight_id = false;
  var class_cur_snare_highlight_id = false;
  var class_cur_kick_highlight_id = false;

  var class_cur_all_notes_highlight_id = false;

  function hilight_all_notes_on_same_beat(instrument, id) {
    id = Math.floor(id);
    if (id < 0 || id >= class_notes_per_measure * class_number_of_measures) return;

    if (class_cur_all_notes_highlight_id === id) return; // already highligted

    if (class_cur_all_notes_highlight_id !== false) {
      // turn off old highlighting
      var bg_ele = document.getElementById('bg-highlight' + class_cur_all_notes_highlight_id);
      if (bg_ele) {
        bg_ele.style.background = 'transparent';
      }
    }

    // turn this one on;
    class_cur_all_notes_highlight_id = id;
    document.getElementById('bg-highlight' + class_cur_all_notes_highlight_id).style.background =
      'rgba(50, 126, 173, 0.2)';
  }

  function hilight_note(instrument, percent_complete) {
    if (percent_complete < 0) {
      clear_all_highlights('clear');
      return;
    }

    // if we are in a permutation, hightlight each measure as it goes (each bar
    // of its ostinato)
    if (class_permutation_type != 'none') {
      var playing = percent_complete * get_numberOfPermutationBars();
      percent_complete =
        ((Math.floor(playing) % get_ostinato_bars()) + (playing % 1.0)) / class_number_of_measures;
    }

    if (isMixedMeterGroove()) {
      // bars of different lengths: find the bar, then the note in it
      var position = positionInBars(percent_complete, allBars());
      hilight_all_notes_on_same_beat(
        instrument,
        position.index * class_notes_per_measure +
          Math.floor(position.fraction * barCountOf(position.index))
      );
      return;
    }

    var note_id_in_32 = Math.floor(
      percent_complete *
        root.myGrooveUtils.calc_notes_per_measure(
          usingTriplets() ? 48 : 32,
          class_num_beats_per_measure,
          class_note_value_per_measure
        ) *
        class_number_of_measures
    );
    var real_note_id =
      note_id_in_32 /
      root.myGrooveUtils.getNoteScaler(
        class_notes_per_measure,
        class_num_beats_per_measure,
        class_note_value_per_measure
      );

    //hilight_individual_note(instrument, id);
    hilight_all_notes_on_same_beat(instrument, real_note_id);
  }

  function clear_all_highlights(instrument) {
    // now turn off  notes if necessary;
    if (class_cur_hh_highlight_id !== false) {
      document.getElementById('hi-hat' + class_cur_hh_highlight_id).style.borderColor =
        'transparent';
      class_cur_hh_highlight_id = false;
    }
    if (class_cur_tom1_highlight_id !== false) {
      document.getElementById('tom1-' + class_cur_tom1_highlight_id).style.borderColor =
        'transparent';
      class_cur_tom1_highlight_id = false;
    }
    if (class_cur_tom4_highlight_id !== false) {
      document.getElementById('tom4-' + class_cur_tom4_highlight_id).style.borderColor =
        'transparent';
      class_cur_tom4_highlight_id = false;
    }
    if (class_cur_snare_highlight_id !== false) {
      document.getElementById('snare' + class_cur_snare_highlight_id).style.borderColor =
        'transparent';
      class_cur_snare_highlight_id = false;
    }
    if (class_cur_kick_highlight_id !== false) {
      document.getElementById('kick' + class_cur_kick_highlight_id).style.borderColor =
        'transparent';
      class_cur_kick_highlight_id = false;
    }

    if (class_cur_all_notes_highlight_id !== false) {
      // turn off old highlighting
      var bg_ele = document.getElementById('bg-highlight' + class_cur_all_notes_highlight_id);
      if (bg_ele) {
        bg_ele.style.background = 'transparent';
      }
      class_cur_all_notes_highlight_id = false;
    }
  }

  function getTagPosition(tag) {
    var xVal = 0,
      yVal = 0;
    while (tag) {
      xVal += tag.offsetLeft - tag.scrollLeft + tag.clientLeft;
      yVal += tag.offsetTop - tag.scrollTop + tag.clientTop;
      tag = tag.offsetParent;
    }
    return {
      x: xVal,
      y: yVal,
    };
  }

  // called every time the tempo changes, which can be a lot of times due to the range slider
  // update the main URL with the tempo, but only do it every third of a second at the most
  var global_tempoChangeCallbackTimeout = null;
  root.tempoChangeCallback = function (newTempo) {
    // if there is a timeout running clear it
    if (global_tempoChangeCallbackTimeout != null)
      window.clearTimeout(global_tempoChangeCallbackTimeout);

    // set a new timeout
    global_tempoChangeCallbackTimeout = window.setTimeout(function () {
      global_tempoChangeCallbackTimeout = null;
      // update the Main URL to show the new tempo
      root.updateCurrentURL();
    }, 300);
    scheduleTempoAtNextBar();
  };

  // Infinity Drumming, 2026: a tempo change while playing is heard from the next
  // bar line, not when the time round ends (a whole permutation run can take
  // minutes). Once the slider or the box settles, the round is built again at
  // the new tempo and the player moves into it (groove_utils.switchTempoAtNextBar).
  var class_tempo_at_next_bar_timeout = null;
  function scheduleTempoAtNextBar() {
    if (class_tempo_at_next_bar_timeout != null)
      window.clearTimeout(class_tempo_at_next_bar_timeout);
    class_tempo_at_next_bar_timeout = window.setTimeout(function () {
      class_tempo_at_next_bar_timeout = null;
      tempoAtNextBar();
    }, 250);
  }

  function tempoAtNextBar() {
    var gu = root.myGrooveUtils;
    // (the count-in and the practice timer's last round take it when they end)
    if (!gu.isPlaying() || class_metronome_count_in_is_playing || class_practice_ending) return;
    if (gu.loadedTempo() == gu.getTempo()) return; // (a speed-up: the round was just built)
    var oldBarMs = class_round_bar_ms.slice();
    var newBarMs = playingRoundBars().map(roundBarMs);
    if (newBarMs.length < 2 || newBarMs.length != oldBarMs.length) return; // (bars came or went)
    gu.switchTempoAtNextBar(buildGrooveMidiUrl(), oldBarMs, newBarMs, function (bar) {
      // the practice timer counts the bars before the line at the old tempo
      if (class_practice_limit)
        class_practice_played.ms += sumOf(oldBarMs.slice(0, bar)) - sumOf(newBarMs.slice(0, bar));
      class_round_bar_ms = newBarMs;
      class_round_full_ms = sumOf(newBarMs);
    });
  }

  // the note setting the toolbar shows: Mixed for 32nds beat by beat
  function shownDivision() {
    return beatGrid() ? 48 : class_time_division;
  }

  // The phone toolbar shows "Notes" and "Click" as selectors instead of rows of
  // buttons (Infinity Drumming, 2026): keep them showing the current settings.
  function syncToolbarSelects() {
    var notes = document.getElementById('notesSelect');
    if (notes) {
      notes.value = String(shownDivision());
      for (var i = 0; i < notes.options.length; i++) {
        var button = document.getElementById('subdivision_' + notes.options[i].value + 'ths');
        notes.options[i].disabled = !!button && /\bdisabled\b/.test(button.className);
      }
    }
    var click = document.getElementById('clickSelect');
    if (click) click.value = String(root.class_metronome_frequency);
  }

  root.setMetronomeButton = function (metronomeInterval) {
    var id = '';
    switch (metronomeInterval) {
      case 1:
        id = 'metronome1Bar'; // one click per bar
        break;
      case 4:
        id = 'metronome4ths';
        break;
      case 8:
        id = 'metronome8ths';
        break;
      case 16:
        id = 'metronome16ths';
        break;
      case 0:
      /* falls through */
      default:
        // the newer clicks (triplets, swung, dotted) are only in the Click menu
        if (isTimedClick(metronomeInterval)) break;
        id = 'metronomeOff';
        if (root.myGrooveUtils.getMetronomeSolo()) {
          // turn off solo if we are turning off the metronome
          root.metronomeOptionsMenuPopupClick('Solo');
        }
        break;
    }

    // clear other buttons
    var myElements = document.querySelectorAll('.metronomeButton');
    for (var i = 0; i < myElements.length; i++) {
      var thisButton = myElements[i];
      // remove active status
      unselectButton(thisButton);
    }

    if (id) selectButton(document.getElementById(id));
    syncToolbarSelects();

    root.myGrooveUtils.midiNoteHasChanged(); // pretty likely the case
  };

  root.class_metronome_frequency = 0;
  root.getMetronomeFrequency = function () {
    return root.class_metronome_frequency;
  };

  root.setMetronomeFrequency = function (newFrequency) {
    // (a number, or a setting from the Click menu or a link: "8", "8s", ...)
    newFrequency = parseMetronomeFrequency(newFrequency);
    root.class_metronome_frequency = newFrequency;
    root.setMetronomeButton(newFrequency);
    clickChangedForCount();

    // update the current URL so that reloads and history traversal and link shares and bookmarks work correctly
    root.updateCurrentURL();
  };

  // the user has clicked on the metronome options button
  root.metronomeOptionsAnchorClick = function (event) {
    var contextMenu = document.getElementById('metronomeOptionsContextMenu');
    if (contextMenu) {
      var anchorPoint = document.getElementById('metronomeOptionsAnchor');

      if (anchorPoint) {
        var anchorPos = getTagPosition(anchorPoint);
        contextMenu.style.top = anchorPos.y + anchorPoint.offsetHeight + 'px';
        contextMenu.style.left = anchorPos.x + anchorPoint.offsetWidth - 150 + 'px';
      }

      root.myGrooveUtils.toggleContextMenu(contextMenu, anchorPoint);
    }
  };

  // the user has clicked on the permutation menu
  root.permutationAnchorClick = function (event) {
    if (!permutationsAllowed()) return; // no figures for this time signature and note setting

    var contextMenu = document.getElementById('permutationContextMenu');
    if (contextMenu) {
      var anchorPoint = document.getElementById('permutationAnchor');

      if (anchorPoint) {
        var anchorPos = getTagPosition(anchorPoint);
        contextMenu.style.top = anchorPos.y + anchorPoint.offsetHeight + 'px';
        contextMenu.style.left = anchorPos.x + anchorPoint.offsetWidth - 150 + 'px';
      }
      root.myGrooveUtils.toggleContextMenu(contextMenu, anchorPoint);
    }
  };

  // the user has clicked on the grooves menu
  root.groovesAnchorClick = function (event) {
    var contextMenu = document.getElementById('grooveListWrapper');
    if (contextMenu) {
      var myGroovesMenu = document.getElementById('myGroovesMenu');
      if (myGroovesMenu)
        myGroovesMenu.innerHTML = myGroovesMenuHTML(loadMyGrooves(deviceStorage()));
      var anchorPoint = document.getElementById('groovesAnchor');

      if (anchorPoint) {
        var anchorPos = getTagPosition(anchorPoint);
        contextMenu.style.top = anchorPos.y + anchorPoint.offsetHeight + 'px';
        contextMenu.style.left = anchorPos.x + anchorPoint.offsetWidth - 283 + 'px';
      }
      root.myGrooveUtils.toggleContextMenu(contextMenu, anchorPoint);
    }
  };

  // the user has clicked on the help menu
  root.helpAnchorClick = function (event) {
    var contextMenu = document.getElementById('helpContextMenu');
    if (contextMenu) {
      var anchorPoint = document.getElementById('helpAnchor');

      if (anchorPoint) {
        var anchorPos = getTagPosition(anchorPoint);
        contextMenu.style.top = anchorPos.y + anchorPoint.offsetHeight + 'px';
        contextMenu.style.left = anchorPos.x + anchorPoint.offsetWidth - 150 + 'px';
      }
      root.myGrooveUtils.toggleContextMenu(contextMenu, anchorPoint);
    }
  };

  // the user has clicked on the stickings menu (at bottom)
  root.stickingsAnchorClick = function (event) {
    var contextMenu = document.getElementById('stickingsContextMenu');
    if (contextMenu) {
      var anchorPoint = document.getElementById('stickingsButton');

      if (anchorPoint) {
        if (!event) event = window.event;
        if (event.clientX || event.clientY) {
          contextMenu.style.top = event.clientY - 100 + 'px';
          contextMenu.style.left = event.clientX - 150 + 'px';
        }
      }
      root.myGrooveUtils.toggleContextMenu(contextMenu, anchorPoint);
    }
  };

  // the user has clicked on the download menu (at bottom)
  root.DownloadAnchorClick = function (event) {
    var contextMenu = document.getElementById('downloadContextMenu');
    if (contextMenu) {
      var anchorPoint = document.getElementById('downloadButton');

      if (anchorPoint) {
        if (!event) event = window.event;
        if (event.clientX || event.clientY) {
          contextMenu.style.top = event.clientY - 150 + 'px';
          contextMenu.style.left = event.clientX - 150 + 'px';
        }
      }
      root.myGrooveUtils.toggleContextMenu(contextMenu, anchorPoint);
    }
  };

  // figure out if the metronome options menu should be selected and change the UI
  root.metronomeOptionsMenuSetSelectedState = function () {
    if (
      root.myGrooveUtils.getMetronomeSolo() ||
      class_metronome_auto_speed_up_active ||
      class_groove_click_active ||
      class_practice_limit ||
      root.myGrooveUtils.getMetronomeOffsetClickStart() != '1'
    ) {
      // make menu look active
      addOrRemoveKeywordFromClassById('metronomeOptionsAnchor', 'selected', true);
    } else {
      // inactive
      addOrRemoveKeywordFromClassById('metronomeOptionsAnchor', 'selected', false);
    }
  };

  root.metronomeOptionsMenuPopupClick = function (option_type) {
    switch (option_type) {
      case 'Solo':
        var current = root.myGrooveUtils.getMetronomeSolo();
        if (!current) {
          root.myGrooveUtils.setMetronomeSolo(true);
          addOrRemoveKeywordFromClassById('metronomeOptionsContextMenuSolo', 'menuChecked', true);
          if (root.getMetronomeFrequency() === 0) root.setMetronomeFrequency(4);
        } else {
          root.myGrooveUtils.setMetronomeSolo(false);
          addOrRemoveKeywordFromClassById('metronomeOptionsContextMenuSolo', 'menuChecked', false);
        }
        root.myGrooveUtils.midiNoteHasChanged(); // if playing need to refresh
        break;

      case 'SpeedUp':
        if (class_metronome_auto_speed_up_active) {
          // just turn it off if it is on, don't show the configurator
          class_metronome_auto_speed_up_active = false;
          addOrRemoveKeywordFromClassById(
            'metronomeOptionsContextMenuSpeedUp',
            'menuChecked',
            false
          );
        } else {
          class_metronome_auto_speed_up_active = true;
          addOrRemoveKeywordFromClassById(
            'metronomeOptionsContextMenuSpeedUp',
            'menuChecked',
            true
          );
          root.show_MetronomeAutoSpeedupConfiguration();
        }
        break;

      case 'PracticeTimer':
        // turn it off if it is on, otherwise choose the time or bars
        if (class_practice_limit) setPracticeLimit(null, false);
        else root.show_PracticeTimerConfiguration();
        break;

      case 'GrooveClick':
        if (class_groove_click_active) {
          // just turn it off if it is on, don't show the configurator
          class_groove_click_active = false;
          resetGrooveClickPhase();
          addOrRemoveKeywordFromClassById(
            'metronomeOptionsContextMenuGrooveClick',
            'menuChecked',
            false
          );
          root.myGrooveUtils.midiNoteHasChanged(); // back to the plain groove
          root.updateCurrentURL(); // the option is part of the link
        } else {
          class_groove_click_active = true;
          addOrRemoveKeywordFromClassById(
            'metronomeOptionsContextMenuGrooveClick',
            'menuChecked',
            true
          );
          root.show_GrooveClickConfiguration();
        }
        break;

      case 'AutoScroll':
        setAutoScroll(!root.myGrooveUtils.autoScrollEnabled);
        break;

      case 'CursorTiming':
        root.show_CursorTimingConfiguration();
        break;

      case 'GraceNotes':
        root.show_GraceNoteConfiguration();
        break;

      case 'CountIn':
        if (class_metronome_count_in_active) {
          // just turn it off if it is on, don't show the configurator
          class_metronome_count_in_active = false;
          addOrRemoveKeywordFromClassById(
            'metronomeOptionsContextMenuCountIn',
            'menuChecked',
            false
          );
        } else {
          class_metronome_count_in_active = true;
          addOrRemoveKeywordFromClassById(
            'metronomeOptionsContextMenuCountIn',
            'menuChecked',
            true
          );
        }
        break;

      case 'OffTheOne':
        // bring up the next menu to be clicked
        var contextMenu;

        if (usingTriplets())
          contextMenu = document.getElementById(
            'metronomeOptionsOffsetClickForTripletsContextMenu'
          );
        else contextMenu = document.getElementById('metronomeOptionsOffsetClickContextMenu');
        if (contextMenu) {
          var anchorPoint = document.getElementById('metronomeOptionsContextMenuOffTheOne');

          if (anchorPoint) {
            var anchorPos = getTagPosition(anchorPoint);
            contextMenu.style.top = anchorPos.y + anchorPoint.offsetHeight + 'px';
            contextMenu.style.left = anchorPos.x + anchorPoint.offsetWidth - 150 + 'px';
          }
          root.myGrooveUtils.showContextMenu(contextMenu);
        }
        break;

      case 'Dropper':
        break;

      default:
        console.log('bad case in metronomeOptionsMenuPopupClick()');
        break;
    }

    root.metronomeOptionsMenuSetSelectedState();
    // these options are part of the link (the others say so themselves; a speed-up
    // being switched on does when its settings are done)
    if (
      option_type == 'Solo' ||
      option_type == 'CountIn' ||
      (option_type == 'SpeedUp' && !class_metronome_auto_speed_up_active)
    )
      root.updateCurrentURL();
  };

  root.metronomeOptionsMenuOffsetClickPopupClick = function (option_type) {
    root.myGrooveUtils.setMetronomeOffsetClickStart(option_type);

    // clear other and select
    var myElements = document.querySelectorAll('.metronomeOptionsOffsetClickContextMenuItem');
    for (var i = 0; i < myElements.length; i++) {
      var thisItem = myElements[i];
      // remove active status
      addOrRemoveKeywordFromClass(thisItem, 'menuChecked', false);
    }

    // turn on the new one selected
    addOrRemoveKeywordFromClassById(
      'metronomeOptionsOffsetClickContextMenuOnThe' + option_type,
      'menuChecked',
      true
    );

    if (option_type != '1') {
      // 1 is the default state
      // add a check to the menu
      addOrRemoveKeywordFromClassById('metronomeOptionsContextMenuOffTheOne', 'menuChecked', true);
    } else {
      addOrRemoveKeywordFromClassById('metronomeOptionsContextMenuOffTheOne', 'menuChecked', false);
    }

    root.myGrooveUtils.midiNoteHasChanged();
    root.metronomeOptionsMenuSetSelectedState();
    clickChangedForCount();
    root.updateCurrentURL(); // part of the link
  };

  root.resetMetronomeOptionsMenuOffsetClick = function () {
    // call with the default option
    root.metronomeOptionsMenuOffsetClickPopupClick('1');
  };

  // permutations are for grooves whose bars all have the same time signature,
  // in a note setting with figures for it (4/4 in any; Infinity Drumming, 2026:
  // x/4 and compound x/8 too, see permutations.getPermutationLayout)
  function permutationsAllowed() {
    return !isMixedMeterGroove() && beatGrid() != 32 && !!get_permutation_layout();
  }

  function setupPermutationMenu() {
    if (permutationsAllowed()) {
      addOrRemoveKeywordFromClassById('permutationAnchor', 'enabled', true);
    } else {
      // no figures for this time signature and note setting
      addOrRemoveKeywordFromClassById('permutationAnchor', 'enabled', false);
      root.permutationPopupClick('none'); // make sure permutation is off
    }
  }

  root.permutationPopupClick = function (perm_type) {
    if (class_permutation_type == perm_type) return;

    class_permutation_type = perm_type;
    class_permutation_bars = ''; // another run: all its bars

    switch (perm_type) {
      case 'kick_16ths':
        showHideCSS_ClassVisibility('.kick-container', true, false); // hide it
        showHideCSS_ClassVisibility('.snare-container', true, true); // show it
        closeBarsPastOstinato();
        selectButton(document.getElementById('permutationAnchor'));
        document.getElementById('PermutationOptions').innerHTML = root.HTMLforPermutationOptions();
        document.getElementById('PermutationOptions').className += ' displayed';
        break;

      case 'snare_16ths':
        showHideCSS_ClassVisibility('.kick-container', true, true); // show it
        showHideCSS_ClassVisibility('.snare-container', true, false); // hide it
        closeBarsPastOstinato();
        selectButton(document.getElementById('permutationAnchor'));
        document.getElementById('PermutationOptions').innerHTML = root.HTMLforPermutationOptions();
        document.getElementById('PermutationOptions').className += ' displayed';
        break;

      case 'kick_snare_kick_lead':
      case 'kick_snare_snare_lead':
        // alternating kick and snare: the permutation replaces both lines
        showHideCSS_ClassVisibility('.kick-container', true, false); // hide it
        showHideCSS_ClassVisibility('.snare-container', true, false); // hide it
        closeBarsPastOstinato();
        selectButton(document.getElementById('permutationAnchor'));
        document.getElementById('PermutationOptions').innerHTML = root.HTMLforPermutationOptions();
        document.getElementById('PermutationOptions').className += ' displayed';
        break;

      case 'none':
      /* falls through */
      default:
        showHideCSS_ClassVisibility('.kick-container', true, true); // show it
        showHideCSS_ClassVisibility('.snare-container', true, true); // show it
        class_permutation_type = 'none';

        unselectButton(document.getElementById('permutationAnchor'));
        document.getElementById('PermutationOptions').innerHTML = root.HTMLforPermutationOptions();
        addOrRemoveKeywordFromClassById('PermutationOptions', 'displayed', false);
        break;
    }

    updateSheetMusic();
  };

  root.muteInstrument = function (instrument, measure, muteElseUnmute) {
    // find unmuteHHButton1  or unmuteSnareButton2
    var buttonName = 'unmute' + instrument + 'Button' + measure;
    var button = document.getElementById(buttonName);
    if (muteElseUnmute) button.style.display = 'inline-block';
    else button.style.display = 'none';

    root.myGrooveUtils.midiNoteHasChanged();
    root.updateCurrentURL(); // muted lines are part of the link
  };

  function isInstrumentMuted(instrument, measure) {
    // find unmuteHHButton1  or unmuteSnareButton2
    var buttonName = 'unmute' + instrument + 'Button' + measure;
    var button = document.getElementById(buttonName);
    if (button && button.style.display == 'inline-block') return true;
    else return false;
  }

  root.helpMenuPopupClick = function (help_type) {
    var win;

    switch (help_type) {
      case 'help':
        win = window.open('./gscribe_help.html', '_blank');
        win.focus();
        break;

      case 'about':
        win = window.open('./gscribe_about.html', '_blank');
        win.focus();
        break;

      case 'undo':
        root.undoCommand();
        break;

      case 'redo':
        root.redoCommand();
        break;

      default:
        console.log('bad case in helpMenuPopupClick()');
        break;
    }
  };

  // user has clicked on the advanced edit button
  this.toggleAdvancedEdit = function () {
    if (class_advancedEditIsOn) {
      // turn it off
      class_advancedEditIsOn = false;
      unselectButton(document.getElementById('advancedEditAnchor'));
    } else {
      class_advancedEditIsOn = true;
      selectButton(document.getElementById('advancedEditAnchor'));
    }
  };

  // context menu for labels
  root.noteLabelClick = function (event, instrument, measure) {
    /** @type {HTMLElement | false} */
    var contextMenu = false;

    // store this in a global, there can only ever be one context menu open at a time.
    // Yes, I agree this sucks
    class_measure_for_note_label_click = measure;

    switch (instrument) {
      case 'stickings':
        contextMenu = document.getElementById('stickingsLabelContextMenu');
        break;
      case 'hh':
        contextMenu = document.getElementById('hhLabelContextMenu');
        break;
      case 'crash':
        contextMenu = document.getElementById('crashLabelContextMenu');
        break;
      case 'ride':
        contextMenu = document.getElementById('rideLabelContextMenu');
        break;
      case 'tom1':
        contextMenu = document.getElementById('tom1LabelContextMenu');
        break;
      case 'tom2':
        contextMenu = document.getElementById('tom2LabelContextMenu');
        break;
      case 'tom4':
        contextMenu = document.getElementById('tom4LabelContextMenu');
        break;
      case 'snare':
        contextMenu = document.getElementById('snareLabelContextMenu');
        break;
      case 'kick':
        contextMenu = document.getElementById('kickLabelContextMenu');
        break;
      case 'hhfoot':
        contextMenu = document.getElementById('hhfootLabelContextMenu');
        break;
      default:
        console.log('bad case in noteLabelClick: ' + instrument);
        break;
    }

    if (contextMenu) {
      if (!event) event = window.event;
      if (event.clientX || event.clientY) {
        contextMenu.style.top = event.clientY - 30 + 'px';
        contextMenu.style.left = event.clientX - 35 + 'px';
      }
      root.myGrooveUtils.toggleContextMenu(contextMenu, event.currentTarget);
    }

    return false;
  };

  root.noteLabelPopupClick = function (instrument, action) {
    /** @type {Function | false} */
    var setFunction = false;

    switch (instrument) {
      case 'stickings':
        setFunction = set_sticking_state;
        break;
      case 'hh':
        setFunction = set_hh_state;
        break;
      case 'crash':
        setFunction = set_crash_state;
        break;
      case 'ride':
        setFunction = set_ride_state;
        break;
      case 'tom1':
        setFunction = set_tom1_state;
        break;
      case 'tom2':
        setFunction = set_tom2_state;
        break;
      case 'tom4':
        setFunction = set_tom4_state;
        break;
      case 'snare':
        setFunction = set_snare_state;
        break;
      case 'kick':
        setFunction = set_kick_part_state;
        break;
      case 'hhfoot':
        setFunction = set_hhfoot_state;
        break;
      default:
        console.log('bad case in noteLabelPopupClick');
        return false;
    }

    if (action == 'mute') {
      root.muteInstrument(instrument, class_measure_for_note_label_click, true);
      return false;
    }

    // start at the first note of the measure we want to effect.   Only fill in the
    // notes for that measure
    // the last boolean in the setFunction should only be true on the first call (plays a sound)
    var startIndex = class_notes_per_measure * (class_measure_for_note_label_click - 1);
    for (var i = startIndex; i - startIndex < class_notes_per_measure; i++) {
      if (action == 'all_off') {
        setFunction(i, 'off', i == startIndex);
      } else if (instrument == 'stickings') {
        switch (action) {
          case 'all_right':
            set_sticking_state(i, 'right', i == startIndex);
            break;
          case 'all_left':
            set_sticking_state(i, 'left', i == startIndex);
            break;
          case 'alternate':
            set_sticking_state(i, i % 2 === 0 ? 'right' : 'left', i == startIndex);
            break;
          case 'all_count':
            set_sticking_state(i, 'count', i == startIndex);
            break;
          default:
            console.log('Bad sticking case in noteLabelPopupClick');
            break;
        }
      } else if ((instrument == 'hh' || instrument == 'ride') && action == 'downbeats') {
        setFunction(i, i % 2 === 0 ? 'normal' : 'off', i == startIndex);
      } else if ((instrument == 'hh' || instrument == 'ride') && action == 'upbeats') {
        setFunction(i, i % 2 === 0 ? 'off' : 'normal', i == startIndex + 1);
      } else if (instrument == 'snare' && action == 'all_on') {
        set_snare_state(i, 'accent', i == startIndex);
      } else if (instrument == 'snare' && action == 'all_on_normal') {
        set_snare_state(i, 'normal', i == startIndex);
      } else if (instrument == 'snare' && action == 'all_on_ghost') {
        set_snare_state(i, 'ghost', i == startIndex);
      } else if ((instrument == 'hhfoot' || instrument == 'kick') && action == 'hh_foot_nums_on') {
        // set_hhfoot_state leaves the kicks alone
        var num_notes_per_count = class_time_division / class_note_value_per_measure;
        set_hhfoot_state(i, i % num_notes_per_count === 0 ? 'normal' : 'off', i == startIndex);
      } else if ((instrument == 'hhfoot' || instrument == 'kick') && action == 'hh_foot_ands_on') {
        num_notes_per_count = class_time_division / class_note_value_per_measure;
        set_hhfoot_state(
          i,
          i % num_notes_per_count === num_notes_per_count / 2 ? 'normal' : 'off',
          i == startIndex + num_notes_per_count / 2
        );
      } else if (action == 'all_on') {
        setFunction(i, 'normal', i == startIndex);
      } else if (action == 'cancel') {
        continue; // do nothing.
      } else {
        console.log('Bad IF case in noteLabelPopupClick');
      }
    }

    class_measure_for_note_label_click = 0; // reset

    updateSheetMusic();

    return false;
  };

  // returns true on error!
  // returns false if working.  (this is because of the onContextMenu handler
  root.noteRightClick = function (event, type, id) {
    class_which_index_last_clicked = id;
    var contextMenu;

    switch (type) {
      case 'sticking':
        contextMenu = document.getElementById('stickingContextMenu');
        break;
      case 'hh':
        contextMenu = document.getElementById('hhContextMenu');
        break;
      case 'crash':
        contextMenu = document.getElementById('crashContextMenu');
        break;
      case 'ride':
        contextMenu = document.getElementById('rideContextMenu');
        break;
      case 'tom1':
        contextMenu = document.getElementById('tom1ContextMenu');
        break;
      case 'tom2':
        contextMenu = document.getElementById('tom2ContextMenu');
        break;
      case 'tom4':
        contextMenu = document.getElementById('tom4ContextMenu');
        break;
      case 'snare':
        contextMenu = document.getElementById('snareContextMenu');
        break;
      case 'kick':
        contextMenu = document.getElementById('kickContextMenu');
        break;
      case 'hhfoot':
        contextMenu = document.getElementById('hhfootContextMenu');
        break;
      default:
        console.log('Bad case in handleNotePopup');
        break;
    }

    if (contextMenu) {
      markOrnamentMenu(contextMenu, type, id);
      if (!event) event = window.event;
      if (event.clientX || event.clientY) {
        contextMenu.style.top = event.clientY - 30 + 'px';
        contextMenu.style.left = event.clientX - 75 + 'px';
      }
      root.myGrooveUtils.toggleContextMenu(contextMenu, event.currentTarget);
    } else {
      return true; //error
    }

    return false;
  };

  root.noteLeftClick = function (event, type, id) {
    // use a popup if advanced edit is on
    if (class_advancedEditIsOn === true) {
      root.noteRightClick(event, type, id);
    } else {
      // this is a non advanced edit left click
      switch (type) {
        case 'hh':
          set_hh_state(id, is_hh_on(id) ? 'off' : 'normal', true);
          break;
        case 'crash':
          set_crash_state(id, get_crash_state(id, 'ABC') ? 'off' : 'crash', true);
          break;
        case 'ride':
          set_ride_state(id, get_ride_state(id, 'ABC') ? 'off' : 'ride', true);
          break;
        case 'snare':
          set_snare_state(id, is_snare_on(id) ? 'off' : 'normal', true); // normal hit (accents via right-click)
          break;
        case 'tom1':
          set_tom_state(id, 1, is_tom_on(id, 1) ? 'off' : 'normal', true);
          break;
        case 'tom2':
          set_tom_state(id, 2, is_tom_on(id, 2) ? 'off' : 'normal', true);
          break;
        case 'tom4':
          set_tom_state(id, 4, is_tom_on(id, 4) ? 'off' : 'normal', true);
          break;
        case 'kick':
          set_kick_part_state(id, is_kick_part_on(id) ? 'off' : 'normal', true);
          break;
        case 'hhfoot':
          set_hhfoot_state(id, is_hhfoot_on(id) ? 'off' : 'normal', true);
          break;
        case 'sticking':
          sticking_rotate_state(id);
          break;
        default:
          console.log('Bad case in noteLeftClick: ' + type);
          break;
      }

      updateSheetMusic();
    }
  };

  root.notePopupClick = function (type, new_setting) {
    var id = class_which_index_last_clicked;

    switch (type) {
      case 'sticking':
        set_sticking_state(id, new_setting, true);
        break;
      case 'hh':
        set_hh_state(id, new_setting, true);
        break;
      case 'crash':
        set_crash_state(id, new_setting, true);
        break;
      case 'ride':
        set_ride_state(id, new_setting, true);
        break;
      case 'tom1':
        set_tom1_state(id, new_setting, true);
        break;
      case 'tom2':
        set_tom2_state(id, new_setting, true);
        break;
      case 'tom4':
        set_tom4_state(id, new_setting, true);
        break;
      case 'snare':
        set_snare_state(id, new_setting, true);
        break;
      case 'kick':
        // 'off' / 'normal' only touch the kick; the combined 'splash' and
        // 'kick_and_splash' settings still set both feet at once.
        if (new_setting == 'off' || new_setting == 'normal')
          set_kick_part_state(id, new_setting, true);
        else set_kick_state(id, new_setting, true);
        break;
      case 'hhfoot':
        set_hhfoot_state(id, new_setting, true);
        break;
      default:
        console.log('Bad case in contextMenuClick');
        break;
    }

    updateSheetMusic();
  };

  // --- Flam / drag / ruff menu items (Infinity Drumming, 2026) -------------------
  var NOTE_SETTERS = {
    hh: set_hh_state,
    snare: set_snare_state,
    kick: set_kick_part_state,
    tom1: set_tom1_state,
    tom2: set_tom2_state,
    tom4: set_tom4_state,
    crash: set_crash_state,
    ride: set_ride_state,
  };
  var class_grace_drum_note = null; // { type, id } the "Grace notes on" menu is for

  // choice: 'f' flam, 'd' drag, 'r' ruff, 'none', or 'on' to pick the grace notes' drum
  root.ornamentPopupClick = function (type, choice) {
    var id = class_which_index_last_clicked;
    var line = ORNAMENT_LINE_FOR_TYPE[type];
    if (!line) return;

    if (choice == 'on') {
      class_grace_drum_note = { type: type, id: id };
      var noteMenu = document.getElementById(type + 'ContextMenu');
      var drumMenu = document.getElementById('graceDrumContextMenu');
      if (noteMenu && drumMenu) {
        drumMenu.style.top = noteMenu.style.top;
        drumMenu.style.left = noteMenu.style.left;
      }
      // after this click has closed the note menu
      window.setTimeout(function () {
        if (drumMenu) root.myGrooveUtils.showContextMenu(drumMenu);
      }, 10);
      return;
    }

    if (choice == 'none') set_ornament(line, id, '-');
    else setNoteOrnament(type, id, choice, null, true);
    updateSheetMusic();
  };

  // "Diddle" in a note's menu: turns its double stroke on or off (and the note on)
  root.diddlePopupClick = function (type) {
    var id = class_which_index_last_clicked;
    var line = ORNAMENT_LINE_FOR_TYPE[type];
    if (!line) return;
    var on = !_grid.has_diddle(line, id);
    if (on && !is_line_note_on(line, id)) NOTE_SETTERS[type](id, 'normal', true);
    set_diddle(line, id, on);
    updateSheetMusic();
  };

  // target: 'same', or the line the grace notes are played on (S, T1, T2, T4, H)
  root.graceDrumPopupClick = function (target) {
    if (!class_grace_drum_note) return;
    var type = class_grace_drum_note.type;
    var id = class_grace_drum_note.id;
    var line = ORNAMENT_LINE_FOR_TYPE[type];
    var current = ornamentFromChar(_grid.get_ornament_char(line, id));
    var on = target == 'same' || target == line ? null : target;
    setNoteOrnament(type, id, current ? current.type : 'f', on, false);
    updateSheetMusic();
  };

  // tick the note's flam / drag / ruff (or "No flam") in its menu, and its grace drum
  function markOrnamentMenu(contextMenu, type, id) {
    var line = ORNAMENT_LINE_FOR_TYPE[type];
    if (!line) return;
    var current = ornamentFromChar(_grid.get_ornament_char(line, id));
    var chosen = current ? current.type : 'none';
    contextMenu.querySelectorAll('[data-orn-choice]').forEach(function (item) {
      addOrRemoveKeywordFromClass(
        item,
        'menuChecked',
        item.getAttribute('data-orn-choice') == chosen
      );
    });
    contextMenu.querySelectorAll('[data-diddle-choice]').forEach(function (item) {
      addOrRemoveKeywordFromClass(item, 'menuChecked', _grid.has_diddle(line, id));
    });
    var drum = (current && current.on) || 'same';
    document.querySelectorAll('#graceDrumContextMenu [data-grace-drum]').forEach(function (item) {
      addOrRemoveKeywordFromClass(
        item,
        'menuChecked',
        item.getAttribute('data-grace-drum') == drum
      );
    });
  }

  // Put an ornament on a note, turning the note on first if it is off.  keepDrum:
  // a note that already has its grace notes on another drum keeps that drum.
  function setNoteOrnament(type, id, ornamentType, on, keepDrum) {
    var line = ORNAMENT_LINE_FOR_TYPE[type];
    if (keepDrum) {
      var current = ornamentFromChar(_grid.get_ornament_char(line, id));
      if (current) on = current.on;
    }
    if (!is_line_note_on(line, id)) NOTE_SETTERS[type](id, 'normal', true);
    set_ornament(line, id, ornamentChar({ type: ornamentType, on: on }));
  }

  // called when we initially mouseOver a note.
  // We can use it to sense left or right mouse or ctrl events
  root.noteOnMouseEnter = function (event, instrument, id) {
    /** @type {string | false} */
    var action = false;

    if (event.ctrlKey) action = 'on';
    if (event.altKey) action = 'off';

    if (action) {
      switch (instrument) {
        case 'hh':
          set_hh_state(id, action == 'off' ? 'off' : 'normal', true);
          break;
        case 'crash':
          set_crash_state(id, action == 'off' ? 'off' : 'crash', true);
          break;
        case 'ride':
          set_ride_state(id, action == 'off' ? 'off' : 'ride', true);
          break;
        case 'snare':
          set_snare_state(id, action == 'off' ? 'off' : 'normal', true);
          break;
        case 'kick':
          set_kick_part_state(id, action == 'off' ? 'off' : 'normal', true);
          break;
        case 'hhfoot':
          set_hhfoot_state(id, action == 'off' ? 'off' : 'normal', true);
          break;
        case 'tom1':
          set_tom_state(id, 1, action == 'off' ? 'off' : 'normal', true);
          break;
        case 'tom2':
          set_tom_state(id, 2, action == 'off' ? 'off' : 'normal', true);
          break;
        case 'tom4':
          set_tom_state(id, 4, action == 'off' ? 'off' : 'normal', true);
          break;
        case 'sticking':
          set_sticking_state(id, action == 'off' ? 'off' : 'right', true);
          break;
        default:
          console.log('Bad case in noteOnMouseEnter');
          break;
      }
      updateSheetMusic(); // update music
    }

    return false;
  };

  // --- Permutations (figures from permutations.js) ----------------------------
  // The figures depend on the note setting (1/8, 1/16, 1/8 or 1/16 triplets);
  // each is one bar. A figure is shown when its group checkbox and (if it has
  // one) its own sub-checkbox are ticked; "Play each ×" repeats every bar.
  // (null when there are none for the time signature and note setting)
  function get_permutation_layout() {
    return _perm.getPermutationLayout(
      class_time_division,
      class_num_beats_per_measure,
      class_note_value_per_measure
    );
  }

  function isPermutationSectionShown(section) {
    var main = document.getElementById(section.group.id);
    if (!main || !main.checked) return false;
    if (!section.sub) return true;
    var sub = document.getElementById(section.group.id + '_sub' + section.sub);
    return !!(sub && sub.checked);
  }

  // the shown figures in playing order, each with its ABC before / after: the
  // ticked figures, numbered 1, 2, ... as the music numbers its bars, and of
  // those only the bars to practise when some are chosen ("Practise bars");
  // barsPerLine: 2 (the default) or 1, for the music
  function get_shown_permutation_sections(barsPerLine) {
    var layout = get_permutation_layout();
    if (!layout) return [];
    var ticked = _perm.getPermutationSections(layout).filter(isPermutationSectionShown);
    var chosen = _perm.parseBarList(class_permutation_bars, ticked.length);
    var shown = [];
    ticked.forEach(function (section, i) {
      if (!chosen.length || chosen.indexOf(i + 1) >= 0)
        shown.push({ section: section, number: i + 1 });
    });
    var repeats = get_permutation_repeats();
    var ostinato = get_ostinato_bars();
    return shown.map(function (figure, i) {
      var section = figure.section;
      var shownIndex = 0;
      for (var j = i - 1; j >= 0 && shown[j].section.group === section.group; j--) shownIndex++;
      var lastInGroup = i + 1 >= shown.length || shown[i + 1].section.group !== section.group;
      var next = shown[i + 1] ? shown[i + 1].number : 0; // printed over the next figure
      // the ABC before / after each bar of the figure (one for each bar of the
      // ostinato); every bar of a figure has the figure's number
      var abc = [];
      for (var bar = 0; bar < ostinato; bar++)
        abc.push(
          _perm.getPermutationSectionABC(
            section,
            shownIndex,
            lastInGroup,
            repeats,
            bar + 1 < ostinato ? figure.number : next,
            barsPerLine || 2,
            fatBackOn(),
            { bar: bar, bars: ostinato }
          )
        );
      // the music's first bar has no bar number: with some bars chosen, its
      // heading says which bar it is
      if (i === 0 && chosen.length)
        abc[0].pre = abc[0].pre.replace(/^(P:.*)$/m, '$1   (bar ' + figure.number + ')');
      return { section: section, abc: abc };
    });
  }

  // the bars of the run to practise, as typed ("3-6, 9"); '' for all of them
  var class_permutation_bars = '';

  // the play bar's "Practise bars" box, for the run (see setBoxBars)
  function setPermutationBars(text) {
    var layout = get_permutation_layout();
    var ticked = layout
      ? _perm.getPermutationSections(layout).filter(isPermutationSectionShown).length
      : 0;
    var bars = _perm.barListToText(_perm.parseBarList(text, ticked));
    var changed = bars != class_permutation_bars;
    class_permutation_bars = bars;
    if (changed) root.refresh_ABC();
    return bars;
  }

  var class_permutation_repeats = 1;
  function get_permutation_repeats() {
    return class_permutation_repeats;
  }

  root.permutationRepeatChange = function (event) {
    var times = parseInt(event.target.value, 10);
    class_permutation_repeats = isNaN(times) || times < 1 ? 1 : times;
    root.refresh_ABC();
  };

  // "Fat back" (Infinity Drumming, 2026): kick permutations leave the backbeat to
  // the snare, with no kick wherever the groove's snare plays (ghost notes aside)
  var class_permutation_fat_back = false;
  function fatBackOn() {
    return class_permutation_type == 'kick_16ths' && class_permutation_fat_back;
  }

  root.permutationFatBackClick = function (event) {
    class_permutation_fat_back = !!event.target.checked;
    root.refresh_ABC();
  };

  // One bar's kick and snare for a figure: a kick permutation replaces the kicks
  // (keeping the hi-hat foot notes), a snare permutation replaces the snare.
  function get_permutation_bar(section, Kick_Array, Snare_Array) {
    var checked = function (id) {
      var el = document.getElementById(id);
      return !!(el && el.checked);
    };
    if (
      class_permutation_type == 'kick_snare_kick_lead' ||
      class_permutation_type == 'kick_snare_snare_lead'
    ) {
      var alternating = _perm.getPermutationAlternatingBar(
        section,
        class_permutation_type == 'kick_snare_kick_lead'
      );
      return {
        kick: _perm.merge_kick_arrays(
          alternating.kick,
          _perm.filter_kick_array_for_permutation(Kick_Array)
        ),
        snare: alternating.snare,
      };
    }
    if (class_permutation_type == 'kick_16ths') {
      var kick = _perm.getPermutationKickArray(
        section,
        checked('PermuationOptionsSkipSomeFirstNotes')
      );
      if (fatBackOn()) kick = _perm.fatBackKickArray(kick, Snare_Array);
      var hhFoot = _perm.filter_kick_array_for_permutation(Kick_Array);
      return { kick: _perm.merge_kick_arrays(kick, hhFoot), snare: Snare_Array };
    }
    /** @type {'normal' | 'accent' | 'diddle'} */
    var style = 'normal';
    if (checked('PermuationOptionsAccentGridDiddled')) style = 'diddle';
    else if (checked('PermuationOptionsAccentGrid')) style = 'accent';
    return {
      kick: Kick_Array,
      snare: _perm.getPermutationSnareArray(section, style, get_permutation_layout().unit),
    };
  }

  // create a new instance of an array with all the values prefilled with false
  // the array size is 32nd notes for the current time signature
  // 4/4 would be 32 notes
  // 5/4 would be 40 notes
  // 2/4 would be 16 notes
  // 4/2 would be 32 notes
  // (bar: whose time signature, for grooves whose bars differ; bar 1 otherwise)
  function get_empty_note_array_in_32nds(bar) {
    var notes_per_4_beats = 32;
    if (usingTriplets()) notes_per_4_beats = 48;
    var sig = barSigOf(bar);
    var num_notes = (sig.top * notes_per_4_beats) / sig.bottom;

    return _grid.get_empty_note_array(num_notes);
  }

  // The four tom voices plus the crash and ride lines (constant_CRASH_VOICE_INDEX /
  // constant_RIDE_VOICE_INDEX), which the ABC and MIDI builders treat as extra voices.
  function get_empty_voice_arrays_in_32nds(bar) {
    var arrays = [];
    for (var v = 0; v <= constant_RIDE_VOICE_INDEX; v++)
      arrays.push(get_empty_note_array_in_32nds(bar));
    return arrays;
  }

  function get_numberOfActivePermutationSections() {
    return get_shown_permutation_sections().length;
  }

  // bars in one full pass of the permutation, counting repeats and the
  // ostinato's bars
  function get_numberOfPermutationBars() {
    return (
      get_numberOfActivePermutationSections() * get_permutation_repeats() * get_ostinato_bars()
    );
  }

  // --- The rep counter (Infinity Drumming, 2026) ------------------------------
  // While a permutation plays, which bar of the music it's on (its number there)
  // and which time through it ("Bar 7 · Rep 2 of 4"), and with a multi-bar
  // ostinato which bar of that ("· ostinato 2/3"). A switch in the Permutation Options that this
  // device remembers (off to start with).
  var constant_rep_counter_key = 'grooveScribeRepCounter';
  var class_rep_counter = storedRepCounter();
  var class_rep_counter_numbers = []; // the playing round's figures' numbers, in order

  function storedRepCounter() {
    try {
      return window.localStorage.getItem(constant_rep_counter_key) == 'on';
    } catch {
      return false; // storage unavailable: off
    }
  }

  root.repCounterChange = function (event) {
    class_rep_counter = !!event.target.checked;
    try {
      window.localStorage.setItem(constant_rep_counter_key, class_rep_counter ? 'on' : 'off');
    } catch {
      /* storage unavailable: the switch just lasts for this visit */
    }
    if (!class_rep_counter) showRepCounter('');
  };

  // the shown figures' numbers in the music, in playing order (as
  // get_shown_permutation_sections numbers them, without building their music)
  function shownPermutationNumbers() {
    if (class_permutation_type == 'none') return [];
    var layout = get_permutation_layout();
    if (!layout) return [];
    var ticked = _perm.getPermutationSections(layout).filter(isPermutationSectionShown).length;
    var chosen = _perm.parseBarList(class_permutation_bars, ticked);
    var numbers = [];
    for (var n = 1; n <= ticked; n++) if (!chosen.length || chosen.indexOf(n) >= 0) numbers.push(n);
    return numbers;
  }

  // over the play bar ('' hides it)
  function showRepCounter(text) {
    var element = document.getElementById('repCounter');
    if (!element && text) {
      var player = document.getElementById('midiPlayer');
      if (!player) return;
      element = document.createElement('div');
      element.id = 'repCounter';
      element.setAttribute('aria-live', 'off');
      player.appendChild(element);
    }
    if (!element) return;
    if (element.textContent != text) element.textContent = text;
    element.style.display = text ? '' : 'none';
  }

  // `groovePercent`: how far through the run playing is (as the cursor has it)
  function updateRepCounter(note_type, groovePercent) {
    if (!class_rep_counter || class_permutation_type == 'none') {
      showRepCounter('');
      return;
    }
    if (class_metronome_count_in_is_playing) {
      showRepCounter('Count-in');
      return;
    }
    if (note_type == 'complete' || note_type == 'clear' || groovePercent < 0) return; // as it was
    var bars = get_ostinato_bars();
    var repeats = get_permutation_repeats();
    var total = class_rep_counter_numbers.length * repeats * bars;
    if (!total) return;
    var bar = Math.min(Math.floor(groovePercent * total), total - 1);
    var text =
      'Bar ' +
      class_rep_counter_numbers[Math.floor(bar / (repeats * bars))] +
      ' \u00b7 Rep ' +
      ((Math.floor(bar / bars) % repeats) + 1) +
      ' of ' +
      repeats;
    if (bars > 1) text += ' \u00b7 ostinato ' + ((bar % bars) + 1) + '/' + bars;
    showRepCounter(text);
  }

  // --- Multi-bar ostinatos (Infinity Drumming, 2026) ----------------------------
  // A permutation plays over the groove's first bars, its ostinato (up to
  // _perm.MAX_OSTINATO_BARS): each figure over every bar of it, "Play each" times
  // through. Bar `n` of the run is figure floor(n / (repeats × bars)), over bar
  // n % bars of the ostinato.
  function get_ostinato_bars() {
    return Math.min(class_number_of_measures, _perm.MAX_OSTINATO_BARS);
  }

  // a permutation's swing goes by 16ths, however the bar is written (16 in 4/4)
  function permutationSwingNotes() {
    return (16 * class_num_beats_per_measure) / class_note_value_per_measure;
  }

  // choosing a permutation closes the bars after the ostinato's
  function closeBarsPastOstinato(bars) {
    bars = Math.min(bars || _perm.MAX_OSTINATO_BARS, _perm.MAX_OSTINATO_BARS);
    while (class_number_of_measures > bars) root.closeMeasureButtonClick(bars + 1);
  }

  // with a permutation on, no more bars than an ostinato has (and says so)
  function ostinatoIsFull() {
    if (class_permutation_type == 'none') return false;
    if (class_number_of_measures < _perm.MAX_OSTINATO_BARS) return false;
    window.alert(
      'The alphabet plays over ' +
        _perm.MAX_OSTINATO_BARS +
        ' bars at most. Turn the alphabet off to add more bars.'
    );
    return true;
  }

  // bar `bar` of the grid, as a permutation's ostinato plays it (`muted`: its
  // muted lines silent, for the sound)
  function readOstinatoBar(bar, muted) {
    var o = {
      Sticking: get_empty_note_array_in_32nds(),
      HH: get_empty_note_array_in_32nds(),
      Snare: get_empty_note_array_in_32nds(),
      Kick: get_empty_note_array_in_32nds(),
      Toms: get_empty_voice_arrays_in_32nds(),
      num_notes: 0,
    };
    o.num_notes = get32NoteArrayFromClickableUI(
      o.Sticking,
      o.HH,
      o.Snare,
      o.Kick,
      o.Toms,
      bar * class_notes_per_measure
    );
    if (muted) muteArrayFromClickableUI(o.Sticking, o.HH, o.Snare, o.Kick, o.Toms, bar);
    return o;
  }

  // query the clickable UI and generate a 32 element array representing the notes of one measure
  // note: the ui may have fewer notes, but we scale them to fit into the 32 elements proportionally
  // If using triplets returns 48 notes.   Otherwise always 32.
  //
  // (note: Only one measure, not all the notes on the page if multiple measures are present)
  // Return value is the number of notes.
  // Read one measure of the clickable grid into the passed-in arrays. Thin
  // wrapper: threads GrooveWriter's layout + row-visibility state into the
  // extracted gridState reader.
  function get32NoteArrayFromClickableUI(
    Sticking_Array,
    HH_Array,
    Snare_Array,
    Kick_Array,
    Toms_Array,
    startIndexForClickableUI
  ) {
    return _grid.get32NoteArrayFromClickableUI(
      Sticking_Array,
      HH_Array,
      Snare_Array,
      Kick_Array,
      Toms_Array,
      startIndexForClickableUI,
      {
        // (the bar's own length and time signature)
        notesPerMeasure: barCountOf(Math.floor(startIndexForClickableUI / class_notes_per_measure)),
        numBeatsPerMeasure: barSigOf(Math.floor(startIndexForClickableUI / class_notes_per_measure))
          .top,
        noteValuePerMeasure: barSigOf(
          Math.floor(startIndexForClickableUI / class_notes_per_measure)
        ).bottom,
        stickingsVisible: isStickingsVisible(),
        tomsVisible: isTomsVisible(),
        cymbalsVisible: isCymbalsVisible(),
      }
    );
  }

  // each of the instruments can be muted.   Check the UI and zero out the array if the instrument is marked as muted
  // for a particular measure
  function muteArrayFromClickableUI(
    Sticking_Array,
    HH_Array,
    Snare_Array,
    Kick_Array,
    Toms_Array,
    measureIndex
  ) {
    return _grid.muteArrayFromClickableUI(
      Sticking_Array,
      HH_Array,
      Snare_Array,
      Kick_Array,
      Toms_Array,
      measureIndex,
      isInstrumentMuted
    );
  }

  // the swing grouping for the groove's note setting: pairs of 8ths, or 16ths
  function get_num_notes_for_swing(bar) {
    var sig = barSigOf(bar);
    if (class_time_division < 16) return (8 * sig.top) / sig.bottom;
    return (16 * sig.top) / sig.bottom;
  }

  function createMidiUrlFromClickableUI(MIDI_type) {
    var Sticking_Array = get_empty_note_array_in_32nds();
    var HH_Array = get_empty_note_array_in_32nds();
    var Snare_Array = get_empty_note_array_in_32nds();
    var Kick_Array = get_empty_note_array_in_32nds();
    var Toms_Array = get_empty_voice_arrays_in_32nds();

    var i,
      num_notes_for_swing = 16;

    var metronomeFrequency = root.getMetronomeFrequency();

    // just the first measure
    var num_notes = get32NoteArrayFromClickableUI(
      Sticking_Array,
      HH_Array,
      Snare_Array,
      Kick_Array,
      Toms_Array,
      0
    );
    muteArrayFromClickableUI(Sticking_Array, HH_Array, Snare_Array, Kick_Array, Toms_Array, 0);

    var midiFile = new Midi.File();
    var midiTrack = newExactTimeTrack();
    midiFile.addTrack(midiTrack);

    midiTrack.setTempo(root.myGrooveUtils.getTempo());
    midiTrack.setInstrument(0, 0x13);

    var swing_percentage = root.myGrooveUtils.getSwing() / 100;
    // a straight bar plays without swing
    var swingForBar = function (bar) {
      return class_straight_bars[bar] ? 0 : swing_percentage;
    };

    // all of the permutations use just the first measure
    switch (class_permutation_type) {
      case 'kick_16ths':
      case 'snare_16ths':
      case 'kick_snare_kick_lead':
      case 'kick_snare_snare_lead':
        num_notes_for_swing = permutationSwingNotes();
        // every shown figure over the ostinato's bars, "Play each" times through
        var ostinato = [
          {
            HH: HH_Array,
            Snare: Snare_Array,
            Kick: Kick_Array,
            Toms: Toms_Array,
            num_notes: num_notes,
          },
        ];
        for (i = 1; i < get_ostinato_bars(); i++) ostinato.push(readOstinatoBar(i, true));
        get_shown_permutation_sections().forEach(function (shownSection) {
          var bars = ostinato.map(function (o) {
            return get_permutation_bar(shownSection.section, o.Kick, o.Snare);
          });
          for (var repeat = 0; repeat < get_permutation_repeats(); repeat++)
            ostinato.forEach(function (o, k) {
              root.myGrooveUtils.MIDI_from_HH_Snare_Kick_Arrays(
                midiTrack,
                o.HH,
                bars[k].snare,
                bars[k].kick,
                o.Toms,
                MIDI_type,
                metronomeFrequency,
                o.num_notes,
                num_notes_for_swing,
                swingForBar(k),
                class_num_beats_per_measure,
                class_note_value_per_measure
              );
            });
        });
        break;

      case 'none':
      /* falls through */
      default:
        num_notes_for_swing = get_num_notes_for_swing();

        root.myGrooveUtils.MIDI_from_HH_Snare_Kick_Arrays(
          midiTrack,
          HH_Array,
          Snare_Array,
          Kick_Array,
          Toms_Array,
          MIDI_type,
          metronomeFrequency,
          num_notes,
          num_notes_for_swing,
          swingForBar(0),
          class_num_beats_per_measure,
          class_note_value_per_measure,
          undefined, // the player's swing style
          undefined, // no cursor markers
          slotSpansOfBar(0, num_notes) // diddles beat by beat
        );

        for (i = 1; i < class_number_of_measures; i++) {
          // reset arrays (in this bar's time signature)
          Sticking_Array = get_empty_note_array_in_32nds(i);
          HH_Array = get_empty_note_array_in_32nds(i);
          Snare_Array = get_empty_note_array_in_32nds(i);
          Kick_Array = get_empty_note_array_in_32nds(i);
          Toms_Array = get_empty_voice_arrays_in_32nds(i);

          // get another measure
          num_notes = get32NoteArrayFromClickableUI(
            Sticking_Array,
            HH_Array,
            Snare_Array,
            Kick_Array,
            Toms_Array,
            class_notes_per_measure * i
          );
          muteArrayFromClickableUI(
            Sticking_Array,
            HH_Array,
            Snare_Array,
            Kick_Array,
            Toms_Array,
            i
          );

          root.myGrooveUtils.MIDI_from_HH_Snare_Kick_Arrays(
            midiTrack,
            HH_Array,
            Snare_Array,
            Kick_Array,
            Toms_Array,
            MIDI_type,
            metronomeFrequency,
            num_notes,
            get_num_notes_for_swing(i),
            swingForBar(i),
            barSigOf(i).top,
            barSigOf(i).bottom,
            undefined, // the player's swing style
            undefined, // no cursor markers
            slotSpansOfBar(i, num_notes) // diddles beat by beat
          );
        }
        break;
    }

    var midi_url = 'data:audio/midi;base64,' + btoa(midiFile.toBytes());

    return midi_url;
  }

  root.MIDISaveAs = function () {
    var midi_url = createMidiUrlFromClickableUI('general_MIDI');

    // save as
    document.location = midi_url;
  };

  // creates a grooveData class from the clickable UI elements of the page
  //
  root.grooveDataFromClickableUI = function () {
    var myGrooveData = new root.myGrooveUtils.grooveDataNew();

    myGrooveData.notesPerMeasure = class_notes_per_measure;
    myGrooveData.timeDivision = class_time_division;
    myGrooveData.numberOfMeasures = class_number_of_measures;
    myGrooveData.numBeats = class_num_beats_per_measure;
    myGrooveData.noteValue = class_note_value_per_measure;
    myGrooveData.showStickings = isStickingsVisible();
    myGrooveData.showToms = isTomsVisible();
    myGrooveData.title = document.getElementById('tuneTitle').value;
    myGrooveData.author = document.getElementById('tuneAuthor').value;
    myGrooveData.comments = document.getElementById('tuneComments').value;
    myGrooveData.showLegend = document.getElementById('showLegend').checked;
    myGrooveData.swingPercent = root.myGrooveUtils.getSwing();
    myGrooveData.swingStyle = root.myGrooveUtils.getSwingStyle();
    myGrooveData.straightBars = [];
    for (var bar = 0; bar < class_number_of_measures; bar++)
      myGrooveData.straightBars.push(!!class_straight_bars[bar]);
    myGrooveData.barTimeSigs = currentBarTimeSigs();
    myGrooveData.beatNotes = currentBeatNotes();
    myGrooveData.barSections = [];
    myGrooveData.sectionRepeats = [];
    for (var b = 0; b < class_number_of_measures; b++) {
      myGrooveData.barSections.push(class_bar_sections[b] || '');
      myGrooveData.sectionRepeats.push(class_section_repeats[b] || 1);
    }
    myGrooveData.tempo = root.myGrooveUtils.getTempo();
    myGrooveData.graceSpacingMs = root.myGrooveUtils.graceSpacingMs;
    myGrooveData.graceVolume = root.myGrooveUtils.graceVolume;
    myGrooveData.metronomeFrequency = root.getMetronomeFrequency();
    myGrooveData.grooveClickGrooveBars = class_groove_click_active
      ? class_groove_click_groove_bars
      : 0;
    myGrooveData.grooveClickClickBars = class_groove_click_active
      ? class_groove_click_click_bars
      : 0;
    myGrooveData.practiceLimit = practiceLimitToText(class_practice_limit);
    myGrooveData.showCounts = root.myGrooveUtils.showCounts;
    myGrooveData.countMode = root.myGrooveUtils.countMode;
    myGrooveData.kickStemsUp = true;
    // an exercise: its practice settings and instructions
    myGrooveData.practice = currentPracticeSettings();
    myGrooveData.instructions = currentInstructions();

    for (var i = 0; i < class_number_of_measures; i++) {
      var total_notes = class_notes_per_measure * class_number_of_measures;
      myGrooveData.sticking_array = [];
      myGrooveData.hh_array = [];
      myGrooveData.snare_array = [];
      myGrooveData.kick_array = [];
      myGrooveData.toms_array = [[], [], [], []];
      myGrooveData.crash_array = [];
      myGrooveData.ride_array = [];

      // which lines are shown (Infinity Drumming, 2026: asked once, not for every
      // note: each asks the whole page, which made long grooves slow to open)
      var stickingsShown = isStickingsVisible();
      var cymbalsShown = isCymbalsVisible();
      var tomsShown = isTomsVisible();

      // query the clickable UI and generate a arrays representing the notes of all measures
      for (i = 0; i < total_notes; i++) {
        // only grab the stickings if they are visible
        if (stickingsShown) myGrooveData.sticking_array.push(get_sticking_state(i, 'ABC'));

        myGrooveData.hh_array.push(_grid.ornamentToken(get_hh_state(i, 'ABC'), 'H', i));
        myGrooveData.snare_array.push(_grid.ornamentToken(get_snare_state(i, 'ABC'), 'S', i));
        myGrooveData.kick_array.push(_grid.ornamentToken(get_kick_state(i, 'ABC'), 'K', i));

        // like the toms, the cymbal lines only count while they are shown
        myGrooveData.crash_array.push(
          cymbalsShown ? _grid.ornamentToken(get_crash_state(i, 'ABC'), 'C', i) : false
        );
        myGrooveData.ride_array.push(
          cymbalsShown ? _grid.ornamentToken(get_ride_state(i, 'ABC'), 'R', i) : false
        );

        if (tomsShown) {
          myGrooveData.toms_array[0].push(_grid.ornamentToken(get_tom_state(i, 1, 'ABC'), 'T1', i));
          myGrooveData.toms_array[1].push(_grid.ornamentToken(get_tom_state(i, 2, 'ABC'), 'T2', i));
          myGrooveData.toms_array[3].push(_grid.ornamentToken(get_tom_state(i, 4, 'ABC'), 'T4', i));
        } else {
          myGrooveData.toms_array[0].push(false);
          myGrooveData.toms_array[1].push(false);
          myGrooveData.toms_array[3].push(false);
        }
      }
    }

    return myGrooveData;
  };

  // called by the HTML when changes happen to forms that require the ABC to update
  root.refresh_ABC = function () {
    updateSheetMusic();
  };

  // Want to create something like this:
  //
  // {{GrooveTab
  // |HasTempo=90
  // |HasSwingPercent=0
  // |HasDivision=16
  // |HasMeasures=2
  // |HasNotesPerMeasure=32
  // |HasTimeSignature=4/4
  // |HasHiHatTab=x---o---+---x---x---o---+---x---x---o---+---x---x---o---+---x---
  // |HasSnareAccentTab=--------O-------------------O-----------O---------------O-------
  // |HasSnareOtherTab=--------------g-------------------g-----------g-----------------
  // |HasKickTab=o---------------o---o---------------o-----------o---o---------o-
  // |HasFootOtherTab=----------------------------------------------------------------
  // |HasTom1Tab=--------------------------------------------------------o-------
  // |HasTom4Tab=----------------o---------------------------------------o-------
  // |HasEditData=?GDB_Author=1&TimeSig=4/4&Div=32&Tempo=80&Measures=2&H=|--x-----x---x-------------------|--x-----x---x-------------------|&S=|----g-----g-------------ooo-o-o-|----g-----g-----------------gggg|&K=|o-----x-------o-o---------------|o-----x-------o-o---------------|&T1=|--------------------------------|------------------------x-------|&T4=|----------------x---------------|------------------------x-------|
  // }}
  //
  root.updateGrooveDBSource = function () {
    if (
      !document.getElementById('GrooveDB_source') ||
      document.getElementById('GrooveDB_source').style.display == 'none'
    )
      return; // nothing to update

    var myGrooveData = root.grooveDataFromClickableUI();

    var notesPerMeasureInTab = root.myGrooveUtils.calc_notes_per_measure(
      usingTriplets() ? 48 : 32,
      class_num_beats_per_measure,
      class_note_value_per_measure
    );
    var maxNotesInTab = myGrooveData.numberOfMeasures * notesPerMeasureInTab;

    // scale up all the arrays to 48 or 32 notes so that they look normalized

    myGrooveData.hh_array = root.myGrooveUtils.scaleNoteArrayToFullSize(
      myGrooveData.hh_array,
      myGrooveData.numberOfMeasures,
      myGrooveData.notesPerMeasure,
      myGrooveData.numBeats,
      myGrooveData.noteValue
    );
    myGrooveData.snare_array = root.myGrooveUtils.scaleNoteArrayToFullSize(
      myGrooveData.snare_array,
      myGrooveData.numberOfMeasures,
      myGrooveData.notesPerMeasure,
      myGrooveData.numBeats,
      myGrooveData.noteValue
    );
    myGrooveData.kick_array = root.myGrooveUtils.scaleNoteArrayToFullSize(
      myGrooveData.kick_array,
      myGrooveData.numberOfMeasures,
      myGrooveData.notesPerMeasure,
      myGrooveData.numBeats,
      myGrooveData.noteValue
    );
    myGrooveData.toms_array[0] = root.myGrooveUtils.scaleNoteArrayToFullSize(
      myGrooveData.toms_array[0],
      myGrooveData.numberOfMeasures,
      myGrooveData.notesPerMeasure,
      myGrooveData.numBeats,
      myGrooveData.noteValue
    );
    myGrooveData.toms_array[3] = root.myGrooveUtils.scaleNoteArrayToFullSize(
      myGrooveData.toms_array[3],
      myGrooveData.numberOfMeasures,
      myGrooveData.notesPerMeasure,
      myGrooveData.numBeats,
      myGrooveData.noteValue
    );

    var DBString = '{{GrooveTab';

    DBString += '\n|HasTempo=' + myGrooveData.tempo;
    DBString += '\n|HasSwingPercent=' + myGrooveData.swingPercent;
    DBString += '\n|HasDivision=' + myGrooveData.notesPerMeasure;
    DBString += '\n|HasMeasures=' + myGrooveData.numberOfMeasures;
    DBString += '\n|HasNotesPerMeasure=' + notesPerMeasureInTab;
    DBString += '\n|HasTimeSignature=' + myGrooveData.numBeats + '/' + myGrooveData.noteValue;
    DBString +=
      '\n|HasHiHatTab=' +
      root.myGrooveUtils.tabLineFromAbcNoteArray(
        'H',
        myGrooveData.hh_array,
        true,
        true,
        maxNotesInTab,
        0
      );
    DBString +=
      '\n|HasSnareAccentTab=' +
      root.myGrooveUtils.tabLineFromAbcNoteArray(
        'S',
        myGrooveData.snare_array,
        true,
        false,
        maxNotesInTab,
        0
      );
    DBString +=
      '\n|HasSnareOtherTab=' +
      root.myGrooveUtils.tabLineFromAbcNoteArray(
        'S',
        myGrooveData.snare_array,
        false,
        true,
        maxNotesInTab,
        0
      );
    DBString +=
      '\n|HasKickTab=' +
      root.myGrooveUtils.tabLineFromAbcNoteArray(
        'K',
        myGrooveData.kick_array,
        true,
        false,
        maxNotesInTab,
        0
      );
    DBString +=
      '\n|HasFootOtherTab=' +
      root.myGrooveUtils.tabLineFromAbcNoteArray(
        'K',
        myGrooveData.kick_array,
        false,
        true,
        maxNotesInTab,
        0
      );
    DBString +=
      '\n|HasTom1Tab=' +
      root.myGrooveUtils.tabLineFromAbcNoteArray(
        'T1',
        myGrooveData.toms_array[0],
        false,
        true,
        maxNotesInTab,
        0
      );
    DBString +=
      '\n|HasTom4Tab=' +
      root.myGrooveUtils.tabLineFromAbcNoteArray(
        'T4',
        myGrooveData.toms_array[3],
        false,
        true,
        maxNotesInTab,
        0
      );
    DBString += '\n|HasEditData=' + class_undo_stack[class_undo_stack.length - 1];

    DBString += '\n}}';

    document.getElementById('GrooveDB_source').value = DBString;
  };

  root.undoCommand = function () {
    if (class_undo_stack.length > 1) {
      var undoURL = class_undo_stack.pop();
      root.AddItemToUndoOrRedoStack(undoURL, class_redo_stack); // add to redo stack
      // the one we want to load is behind the head, since all changes go on the undo stack immediately
      // no need to pop, since it would just get added right back on anyways
      undoURL = class_undo_stack[class_undo_stack.length - 1];
      set_Default_notes(undoURL);
    }
  };

  root.redoCommand = function () {
    if (class_redo_stack.length > 0) {
      var redoURL = class_redo_stack.pop();
      root.AddItemToUndoOrRedoStack(redoURL, class_undo_stack); // add to undo stack
      set_Default_notes(redoURL);
    }
  };

  // push the new URL on the undo or redo stack
  // keep the stacks at a managable size
  root.AddItemToUndoOrRedoStack = function (newURL, ourStack, noClear) {
    if (!ourStack) return false;

    if (newURL == class_undo_stack[class_undo_stack.length - 1]) {
      //debugPrintUndoRedoStack();
      return false; // no change, so don't push
    }

    ourStack.push(newURL);
    while (ourStack.length > constant_undo_stack_max_size) ourStack.shift();

    //debugPrintUndoRedoStack();

    return true;
  };

  root.AddFullURLToUndoStack = function (fullURL) {
    var urlFragment;

    var searchData = fullURL.indexOf('?');

    urlFragment = fullURL.slice(searchData);

    // clear redo array whenever we add a new valid element to the stack
    // when we undo, we end up with a null push that returns false here
    if (root.AddItemToUndoOrRedoStack(urlFragment, class_undo_stack)) {
      class_redo_stack = [];
    }
  };

  // update the current URL so that reloads and history traversal and link shares and bookmarks work correctly
  // (while bars are laid out again, the link waits for the whole change)
  var class_holding_url = false;

  root.updateCurrentURL = function () {
    if (class_applying_link_settings) return; // the link's settings aren't all in place yet
    if (class_holding_url) return;
    var newURL = get_FullURLForPage();
    var newTitle = false;

    root.AddFullURLToUndoStack(newURL);

    var title = document.getElementById('tuneTitle').value.trim();
    if (title !== '') newTitle = title;

    var author = document.getElementById('tuneAuthor').value.trim();
    if (author !== '') {
      if (title) newTitle += ' by ' + author;
      else newTitle = 'Groove by ' + author;
    }

    if (!newTitle) newTitle = class_app_title;

    document.title = newTitle;
    try {
      window.history.replaceState(null, newTitle, newURL);
    } catch (err) {
      /* empty */
    }

    if (root.myGrooveUtils.debugMode) {
      // put the search data on the bottom of the page to make it easy to cut & paste
      var searchDataEle = document.getElementById('URLSearchData');
      if (searchDataEle) {
        var searchIndex = newURL.indexOf('?');
        var searchURL = newURL.substring(searchIndex).replace('Debug=1&', '');
        searchDataEle.innerHTML = '<p style="margin-left: 10px;"><b>' + searchURL + '</b><p>';
      }
    }
  };

  // the width the music was last drawn at (see updateSheetMusic)
  var class_music_render_width = 0;

  // atLeast: draw the music at least this wide (smaller on the screen)
  function generate_ABC(renderWidth, atLeast) {
    var Sticking_Array = get_empty_note_array_in_32nds();
    var HH_Array = get_empty_note_array_in_32nds();
    var Snare_Array = get_empty_note_array_in_32nds();
    var Kick_Array = get_empty_note_array_in_32nds();
    var Toms_Array = get_empty_voice_arrays_in_32nds();
    var i;
    var num_notes = get32NoteArrayFromClickableUI(
      Sticking_Array,
      HH_Array,
      Snare_Array,
      Kick_Array,
      Toms_Array,
      0
    );

    // abc header boilerplate
    var tuneTitle = document.getElementById('tuneTitle').value;
    var tuneAuthor = document.getElementById('tuneAuthor').value;
    var tuneComments = document.getElementById('tuneComments').value;
    var showLegend = document.getElementById('showLegend').checked;
    root.myGrooveUtils.isLegendVisable = showLegend;

    var fullABC = '';

    // what the counting follows: the click, and in a permutation the permuted
    // lines; 32nd notes are counted in smaller letters
    root.myGrooveUtils.countSmall = class_time_division == 32;

    root.myGrooveUtils.countClick = {
      frequency: root.class_metronome_frequency,
      start: root.myGrooveUtils.getMetronomeOffsetClickStart() || '1',
    };
    root.myGrooveUtils.countRhythmLines =
      {
        kick_16ths: ['kick'],
        snare_16ths: ['snare'],
        kick_snare_kick_lead: ['kick', 'snare'],
        kick_snare_snare_lead: ['kick', 'snare'],
      }[class_permutation_type] || null;

    // two bars a line, or one where they'd be too tight (a phone); a bar too wide
    // even alone is drawn smaller rather than broken (see abcNotation.musicLayout)
    var layout = musicLayout(
      notesOnALine(
        root.myGrooveUtils,
        barStrideFor(class_time_division),
        class_num_beats_per_measure,
        class_note_value_per_measure,
        usingTriplets()
      ),
      renderWidth,
      {
        counted: root.myGrooveUtils.showCounts && class_time_division != 32,
        triplets: usingTriplets(),
        oneBar: class_permutation_type == 'none' && class_notes_per_measure >= 32,
        keepWidth: beatGrid() !== 0,
      }
    );
    renderWidth = Math.max(layout.renderWidth, atLeast || 0);
    class_music_render_width = Math.max(renderWidth, 400); // (the boilerplate's least)

    switch (class_permutation_type) {
      case 'kick_16ths': // use the hh & snare from the user
      case 'snare_16ths': // use the hh & kick from the user
      case 'kick_snare_kick_lead': // use the hh from the user
      case 'kick_snare_snare_lead':
        fullABC = root.myGrooveUtils.get_top_ABC_BoilerPlate(
          true, // a permutation
          tuneTitle,
          tuneAuthor,
          tuneComments,
          showLegend,
          usingTriplets(),
          false,
          class_num_beats_per_measure,
          class_note_value_per_measure,
          renderWidth
        );
        root.myGrooveUtils.note_mapping_array = [];

        // every shown figure, written once over the ostinato's bars (marked
        // "play each ×N" when repeated)
        var ostinato = [
          {
            Sticking: Sticking_Array,
            HH: HH_Array,
            Snare: Snare_Array,
            Kick: Kick_Array,
            Toms: Toms_Array,
            num_notes: num_notes,
          },
        ];
        for (i = 1; i < get_ostinato_bars(); i++) ostinato.push(readOstinatoBar(i, false));
        get_shown_permutation_sections(layout.barsPerLine).forEach(function (shownSection) {
          ostinato.forEach(function (o, k) {
            var bar = get_permutation_bar(shownSection.section, o.Kick, o.Snare);
            fullABC += shownSection.abc[k].pre;
            fullABC += root.myGrooveUtils.create_ABC_from_snare_HH_kick_arrays(
              o.Sticking,
              o.HH,
              bar.snare,
              bar.kick,
              o.Toms,
              shownSection.abc[k].post,
              o.num_notes,
              class_time_division,
              o.num_notes,
              true,
              class_num_beats_per_measure,
              class_note_value_per_measure
            );
            root.myGrooveUtils.note_mapping_array = root.myGrooveUtils.note_mapping_array.concat(
              root.myGrooveUtils.create_note_mapping_array_for_highlighting(
                o.HH,
                bar.snare,
                bar.kick,
                o.Toms,
                o.num_notes
              )
            );
          });
        });
        break;

      case 'none':
      /* falls through */
      default:
        fullABC = root.myGrooveUtils.get_top_ABC_BoilerPlate(
          class_permutation_type != 'none',
          tuneTitle,
          tuneAuthor,
          tuneComments,
          showLegend,
          usingTriplets(),
          true,
          class_num_beats_per_measure,
          class_note_value_per_measure,
          renderWidth
        );
        root.myGrooveUtils.note_mapping_array = [];

        // (one for 32nd notes and above, and for dense bars on a phone)
        var numberOfMeasuresPerLine = layout.barsPerLine;
        var addon_abc;

        // the bars written: every bar, or the bars being practised, numbered as in
        // the whole groove (Infinity Drumming, 2026)
        var shownBars = barsWritten();
        var numbered = shownBars.length < class_number_of_measures;
        fullABC += musicBarsHeading();

        // "Straight" / "Swing" over the bars where the feel changes
        var feelMarkings = getFeelMarkings(
          shownBars.map(function (bar) {
            return class_straight_bars[bar];
          }),
          shownBars.length,
          root.myGrooveUtils.getSwing(),
          root.myGrooveUtils.getSwingStyle(),
          usingTriplets()
        );

        for (var shown = 0; shown < shownBars.length; shown++) {
          i = shownBars[shown];
          // we already go the array states above, don't get it again.
          if (i > 0) {
            // reset arrays (in this bar's time signature)
            Sticking_Array = get_empty_note_array_in_32nds(i);
            HH_Array = get_empty_note_array_in_32nds(i);
            Snare_Array = get_empty_note_array_in_32nds(i);
            Kick_Array = get_empty_note_array_in_32nds(i);
            Toms_Array = get_empty_voice_arrays_in_32nds(i);

            num_notes = get32NoteArrayFromClickableUI(
              Sticking_Array,
              HH_Array,
              Snare_Array,
              Kick_Array,
              Toms_Array,
              class_notes_per_measure * i
            );
          }

          addon_abc = barLineEnd(shownBars, shown, numberOfMeasuresPerLine, numbered);
          var barABC = root.myGrooveUtils.create_ABC_from_snare_HH_kick_arrays(
            Sticking_Array,
            HH_Array,
            Snare_Array,
            Kick_Array,
            Toms_Array,
            addon_abc,
            num_notes,
            class_time_division,
            num_notes,
            true,
            barSigOf(i).top,
            barSigOf(i).bottom,
            beatPlanOfBar(i)
          );
          barABC = writtenBarABC(barABC, shownBars, shown, numbered, addon_abc);
          fullABC += addFeelMarking(barABC, feelMarkings[shown]);
          root.myGrooveUtils.note_mapping_array = root.myGrooveUtils.note_mapping_array.concat(
            root.myGrooveUtils.create_note_mapping_array_for_highlighting(
              HH_Array,
              Snare_Array,
              Kick_Array,
              Toms_Array,
              num_notes
            )
          );
        }

        break;
    }

    return fullABC;
  }

  // this is called by a bunch of places anytime we modify the musical notes on the page
  // this will recreate the ABC code and will then use the ABC to rerender the sheet music
  // on the page.
  function updateSheetMusic() {
    var renderWidth = 600;
    var svgTarget = document.getElementById('svgTarget');
    if (svgTarget) {
      renderWidth = svgTarget.offsetWidth - 100;
      renderWidth = Math.floor(renderWidth * 0.8); // reduce width by 20% (This actually makes the notes bigger, because we scale up everything to max width)
    }

    clearHiddenBarSlots();
    refreshHeaderTitle();
    var fullABC = generate_ABC(renderWidth);
    var abcSource = /** @type {HTMLTextAreaElement} */ (document.getElementById('ABCsource'));

    abcSource.value = fullABC;
    root.updateGrooveDBSource();

    root.myGrooveUtils.midiNoteHasChanged(); // pretty likely the case

    // update the current URL so that reloads and history traversal and link shares and bookmarks work correctly
    root.updateCurrentURL();
    showPractiseBars();

    root.displayNewSVG();

    // Infinity Drumming, 2026: abc2svg broke a line in the middle of a bar (too
    // tight even so, its beams coming apart): draw it wider, so smaller, a few
    // times at most
    var tries = 0;
    for (; tries < 3 && musicLineBroken(fullABC, class_music_svg); tries++) {
      fullABC = generate_ABC(renderWidth, Math.ceil(class_music_render_width * 1.3));
      abcSource.value = fullABC;
      root.displayNewSVG();
    }
    if (tries) root.updateGrooveDBSource();
  }

  var class_music_svg = ''; // the sheet music last drawn

  // called by generate_ABC to remake the sheet music on the page
  root.displayNewSVG = function () {
    var svgTarget = document.getElementById('svgTarget'),
      diverr = document.getElementById('diverr');

    var abc_source = document.getElementById('ABCsource').value;
    var svg_return;
    try {
      svg_return = root.myGrooveUtils.renderABCtoSVG(abc_source);
    } catch (err) {
      // abc2svg gives up on a very long run of music (Infinity Drumming, 2026)
      svg_return = {
        svg:
          '<p class="musicTooLong">This is more music than can be written out at once: untick ' +
          'some figures, or use fewer bars. It still plays.</p>',
        error_html: String(err && err.message),
      };
    }

    diverr.innerHTML = svg_return.error_html;
    // each glyph defined once on the page (abc2svg repeats them line after line)
    svgTarget.innerHTML = defineGlyphsOnce(svg_return.svg);
    class_music_svg = svg_return.svg;
  };

  // Render an SVG that is good for download.
  // Constant size at 2000x200
  function downloadImages(imageType) {
    var abc_source = generate_ABC(800);
    var svg_obj = root.myGrooveUtils.renderABCtoSVG(abc_source);
    var filename;
    var tune_title = document.getElementById('tuneTitle').value;

    if (tune_title.length == 0) {
      filename = 'notation.';
    } else {
      filename = tune_title;
    }
    filename += imageType;

    var svg_images = svg_obj.svg.split('</svg>');
    // that split should always create at least 2 since it will match that </svg> if there is only one
    // since the split creates an extra one reduce the length by 1
    for (var i = 0; i < svg_images.length - 1; i++) {
      var myPablo = Pablo(svg_images[i] + '</svg>');
      var width = parseFloat(myPablo.attr('width'));
      var height = parseFloat(myPablo.attr('height'));
      var imageRatio = height / width;
      var newWidth = 2000;
      var newHeight = Math.round(newWidth * imageRatio);
      var newBoxWidth = Math.round(newWidth * 0.8);
      var newBoxHeight = Math.round(newHeight * 0.8);
      myPablo.attr('width', newWidth + 'px');
      myPablo.attr('height', newHeight + 'px');
      myPablo.attr('viewBox', '0 0 ' + newBoxWidth + ' ' + newBoxHeight);
      myPablo.children('g').attr('transform', 'scale(2)');

      myPablo.download(imageType, filename, function (result) {
        if (result.error) {
          alert('An error occurred when trying to convert the sheet music to a PNG file.');
        }
      });
    }
  }

  root.PNGSaveAs = function () {
    Pablo.support.image.png(function (acceptable) {
      if (acceptable) {
        downloadImages('png');
      } else {
        alert("Sorry, this browser can't export PNG images");
      }
    });
  };

  root.SVGSaveAs = function () {
    downloadImages('svg');
  };

  root.ShowHideABCResults = function () {
    var ABCResults = document.getElementById('ABC_Results');

    if (ABCResults.style.display == 'block') ABCResults.style.display = 'none';
    else ABCResults.style.display = 'block';

    return false; // don't follow the link
  };

  // remove a measure from the page (the other bars keep their muted lines)
  // measureNum is indexed starting at 1, not 0
  root.closeMeasureButtonClick = function (measureNum) {
    keepingMutes(
      function (bar) {
        if (bar == measureNum) return [];
        return [bar < measureNum ? bar : bar - 1];
      },
      function () {
        removeMeasure(measureNum);
      }
    );
  };

  function removeMeasure(measureNum) {
    if (isMixedMeterGroove()) {
      // bars of different lengths: take the bar out and lay the rest out again
      var records = readBarRecords();
      records.splice(measureNum - 1, 1);
      layOutBarRecords(records);
      return;
    }

    var uiStickings = '';
    var uiHH = '';
    var uiTom1 = '';
    var uiTom2 = '';
    var uiTom4 = '';
    var uiCrash = '';
    var uiRide = '';
    var uiSnare = '';
    var uiKick = '';
    var uiOrnaments = emptyOrnamentLines();

    // get the encoded notes out of the UI.
    // run through all the measure, but don't include the one that we are deleting
    var topIndex = class_notes_per_measure * class_number_of_measures;
    for (var i = 0; i < topIndex; i++) {
      // skip the range we are deleting
      if (
        i < (measureNum - 1) * class_notes_per_measure ||
        i >= measureNum * class_notes_per_measure
      ) {
        uiStickings += get_sticking_state(i, 'URL');
        uiHH += get_hh_state(i, 'URL');
        uiTom1 += get_tom_state(i, 1, 'URL');
        uiTom2 += get_tom_state(i, 2, 'URL');
        uiTom4 += get_tom_state(i, 4, 'URL');
        uiCrash += get_crash_state(i, 'URL');
        uiRide += get_ride_state(i, 'URL');
        uiSnare += get_snare_state(i, 'URL');
        uiKick += get_kick_state(i, 'URL');
        addOrnamentChars(uiOrnaments, i);
      }
    }

    class_number_of_measures--;
    class_straight_bars.splice(measureNum - 1, 1);
    class_beat_notes.splice(measureNum - 1, 1);
    class_bar_sections.splice(measureNum - 1, 1);
    class_section_repeats.splice(measureNum - 1, 1);

    root.expandAuthoringViewWhenNecessary(class_notes_per_measure, class_number_of_measures);

    changeDivisionWithNotes(
      class_time_division,
      uiStickings,
      uiHH,
      uiTom1,
      uiTom2,
      uiTom4,
      uiSnare,
      uiKick,
      uiCrash,
      uiRide,
      uiOrnaments
    );

    updateSheetMusic();
  }

  // add a measure to the page
  // currently always at the end of the measures
  // copy the notes from the last measure to the new measure
  // (the bars keep their muted lines, and the new bar the last one's)
  root.addMeasureButtonClick = function (event) {
    if (class_number_of_measures >= constant_MAX_MEASURES) return; // the most a link holds
    if (ostinatoIsFull()) return;
    var last = class_number_of_measures;
    keepingMutes(
      function (bar) {
        return bar == last ? [bar, bar + 1] : [bar];
      },
      function () {
        addMeasure();
      }
    );
  };

  function addMeasure() {
    if (isMixedMeterGroove()) {
      // bars of different lengths: the new bar copies the last one, time signature too
      var records = readBarRecords();
      var last = records[records.length - 1];
      records.push(JSON.parse(JSON.stringify(last)));
      layOutBarRecords(records);
      var addButton = document.getElementById('addMeasureButton');
      if (addButton && addButton.scrollIntoView)
        addButton.scrollIntoView({ block: 'start', behavior: 'smooth' });
      return;
    }

    var uiStickings = '';
    var uiHH = '';
    var uiTom1 = '';
    var uiTom2 = '';
    var uiTom4 = '';
    var uiCrash = '';
    var uiRide = '';
    var uiSnare = '';
    var uiKick = '';
    var uiOrnaments = emptyOrnamentLines();
    var i;

    // get the encoded notes out of the UI.
    var topIndex = class_notes_per_measure * class_number_of_measures;
    for (i = 0; i < topIndex; i++) {
      uiStickings += get_sticking_state(i, 'URL');
      uiHH += get_hh_state(i, 'URL');
      uiTom1 += get_tom_state(i, 1, 'URL');
      uiTom2 += get_tom_state(i, 2, 'URL');
      uiTom4 += get_tom_state(i, 4, 'URL');
      uiCrash += get_crash_state(i, 'URL');
      uiRide += get_ride_state(i, 'URL');
      uiSnare += get_snare_state(i, 'URL');
      uiKick += get_kick_state(i, 'URL');
      addOrnamentChars(uiOrnaments, i);
    }

    // run the the last measure twice to default in some notes
    for (i = topIndex - class_notes_per_measure; i < topIndex; i++) {
      uiStickings += get_sticking_state(i, 'URL');
      uiHH += get_hh_state(i, 'URL');
      uiTom1 += get_tom_state(i, 1, 'URL');
      uiTom2 += get_tom_state(i, 2, 'URL');
      uiTom4 += get_tom_state(i, 4, 'URL');
      uiCrash += get_crash_state(i, 'URL');
      uiRide += get_ride_state(i, 'URL');
      uiSnare += get_snare_state(i, 'URL');
      uiKick += get_kick_state(i, 'URL');
      addOrnamentChars(uiOrnaments, i);
    }

    class_number_of_measures++;
    // the new bar copies the last one, its straight / swung setting and beats too
    class_straight_bars[class_number_of_measures - 1] =
      !!class_straight_bars[class_number_of_measures - 2];
    class_beat_notes[class_number_of_measures - 1] = beatsOfBar(class_number_of_measures - 2);
    // ... and its section (the section goes on into it)
    class_bar_sections[class_number_of_measures - 1] =
      class_bar_sections[class_number_of_measures - 2] || '';
    class_section_repeats[class_number_of_measures - 1] =
      class_section_repeats[class_number_of_measures - 2] || 1;

    root.expandAuthoringViewWhenNecessary(class_notes_per_measure, class_number_of_measures);

    changeDivisionWithNotes(
      class_time_division,
      uiStickings,
      uiHH,
      uiTom1,
      uiTom2,
      uiTom4,
      uiSnare,
      uiKick,
      uiCrash,
      uiRide,
      uiOrnaments
    );

    // reference the button and scroll it into view
    var add_measure_button = document.getElementById('addMeasureButton');
    if (add_measure_button)
      add_measure_button.scrollIntoView({ block: 'start', behavior: 'smooth' });

    updateSheetMusic();

    if (class_number_of_measures === 5)
      window.alert(
        'Please be aware that the Groove Scribe is not designed to write an entire musical score.\n' +
          'You can create as many measures as you want, but your browser may slow down as more measures are added.\n' +
          'There are also many notation features that would be useful for score writing that are not part of Groove Scribe'
      );
  }

  // --- A copy of a bar right after it (Infinity Drumming, 2026) ----------------
  // The "+ Add a copy" under every bar: the bar again, right after itself, with
  // its time signature, swing / straight, beats and muted lines; the bars after
  // it move along one.
  // measureNum is indexed starting at 1, not 0
  root.duplicateMeasureButtonClick = function (measureNum) {
    if (class_number_of_measures >= constant_MAX_MEASURES) return; // the most a link holds
    if (ostinatoIsFull()) return;
    var laidOut = keepingMutes(
      function (bar) {
        if (bar < measureNum) return [bar];
        return bar == measureNum ? [bar, bar + 1] : [bar + 1];
      },
      function () {
        var records = readBarRecords();
        records.splice(measureNum, 0, JSON.parse(JSON.stringify(records[measureNum - 1])));
        return layOutBarRecords(records);
      }
    );
    var copy = document.getElementById('staff-container' + (measureNum + 1));
    if (laidOut && copy && copy.scrollIntoView)
      copy.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  // Laying the grid out again (a bar added, removed, copied or pasted) draws every
  // bar unmuted: layOut() does it, then each bar's muted lines are muted again
  // where the bar went (newBars(bar): its new numbers, 1-based, [] once it's
  // gone), as one change of the link (and one step of undo). Returns what
  // layOut() did (false: nothing changed). (Infinity Drumming, 2026)
  function keepingMutes(newBars, layOut) {
    var mutes = currentMutes();
    var holding = class_holding_url;
    class_holding_url = true;
    var result;
    try {
      result = layOut();
      if (result !== false) {
        var moved = {};
        for (var line in mutes)
          moved[line] = mutes[line].reduce(function (bars, bar) {
            return bars.concat(newBars(bar));
          }, []);
        setMutesFromLink(moved);
      }
    } finally {
      class_holding_url = holding;
    }
    if (result !== false && !holding) root.updateCurrentURL();
    return result;
  }

  // --- Straight bars in a swung groove ----------------------------------------
  // Each bar has a switch under its copy / paste buttons: swung bars use the swing
  // slider (amount and style), straight bars play straight.
  function refreshStraightBarButtons() {
    for (var bar = 1; bar <= class_number_of_measures; bar++) {
      var button = document.getElementById('straightBarButton' + bar);
      if (button)
        button.outerHTML = _view.straightBarButtonHTML(bar, !!class_straight_bars[bar - 1]);
    }
  }

  // --- Sections (Infinity Drumming, 2026) -------------------------------------
  // Each bar can have a section letter; bars in a row with the same letter are a
  // section, played as many times as its first bar says before what comes next
  // (A ×4, then B ×2, round and round; see sections.js). The music writes each
  // section once, with its letter, repeat signs and how many times.

  function currentSectionRuns() {
    return sectionRuns(class_bar_sections, class_section_repeats, class_number_of_measures);
  }

  // a bar's section for its buttons: {letter, repeats, first}
  function sectionOfBar(bar) {
    var run = currentSectionRuns().find(function (r) {
      return bar >= r.from && bar <= r.to;
    });
    return run
      ? { letter: run.letter, repeats: run.repeats, first: run.from == bar }
      : { letter: '', repeats: 1, first: false };
  }

  function refreshSectionButtons() {
    for (var bar = 1; bar <= class_number_of_measures; bar++) {
      var buttons = document.getElementById('barSection' + bar);
      if (buttons) buttons.outerHTML = _view.barSectionHTML(bar, sectionOfBar(bar - 1));
    }
  }

  // set every bar of a section to its repeats
  function setRunRepeats(run, times) {
    for (var bar = run.from; bar <= run.to; bar++) class_section_repeats[bar] = times;
  }

  // a bar's section letter chosen: it joins the section before it (or after it)
  // with that letter, taking its repeats, or starts one played once
  root.barSectionChange = function (measureNum, letter) {
    var bar = measureNum - 1;
    var before = currentSectionRuns().find(function (r) {
      return r.to == bar - 1 && r.letter == letter;
    });
    var after = currentSectionRuns().find(function (r) {
      return r.from == bar + 1 && r.letter == letter;
    });
    class_bar_sections[bar] = letter || '';
    var joined = before || after;
    class_section_repeats[bar] = joined ? joined.repeats : 1;
    // (a section split in two: each part keeps its repeats)
    refreshSectionButtons();
    root.refresh_ABC(); // the music, the playing order and the link
  };

  root.sectionRepeatsChange = function (measureNum, value) {
    var bar = measureNum - 1;
    var run = currentSectionRuns().find(function (r) {
      return bar >= r.from && bar <= r.to;
    });
    if (!run) return;
    setRunRepeats(run, Math.max(1, parseInt(value, 10) || 1));
    refreshSectionButtons();
    root.refresh_ABC();
  };

  // A bar of the whole groove's music with its section marked: at a section's
  // start its letter (and how many times), and repeat signs round a section that
  // plays more than once. `addon` is what ends the bar's lines.
  function withSectionMarks(barABC, bar, addon) {
    var run = currentSectionRuns().find(function (r) {
      return bar >= r.from && bar <= r.to;
    });
    if (!run) return barABC;
    var repeated = run.repeats > 1;
    if (bar == run.from) {
      var label = run.letter + (repeated ? ' \u00d7' + run.repeats : '');
      if (repeated) barABC = barABC.replace(/(V:Stickings\n|%%voicemap drum\n)/g, '$1|:');
      barABC = barABC.replace(/(V:Stickings\n)/, '$1[P:' + label + ']');
    }
    if (bar == run.to && repeated) barABC = barABC.split(' |' + addon).join(' :|' + addon);
    return barABC;
  }

  // measureNum is indexed starting at 1, not 0
  root.straightBarButtonClick = function (measureNum) {
    class_straight_bars[measureNum - 1] = !class_straight_bars[measureNum - 1];
    refreshStraightBarButtons();
    updateSheetMusic(); // markings, playback and the link
  };

  // the "Straight" / "Swing" markings depend on the swing slider too
  root.myGrooveUtils.swingChangedCallback = function () {
    if (class_straight_bars.indexOf(true) >= 0) updateSheetMusic();
  };

  // --- Copy / paste one measure ---------------------------------------------
  // Every line of the grid as URL tab characters (no "|"), all measures.
  function getTabLinesFromClickableUI() {
    var lines = {
      Stickings: '',
      HH: '',
      Tom1: '',
      Tom2: '',
      Tom4: '',
      Snare: '',
      Kick: '',
      Crash: '',
      Ride: '',
    };
    // flams, drags and ruffs: "Orn" + the line (OrnH, OrnS, OrnT1 ...)
    var ornaments = emptyOrnamentLines();
    var topIndex = class_notes_per_measure * class_number_of_measures;
    for (var i = 0; i < topIndex; i++) {
      addOrnamentChars(ornaments, i);
      lines.Stickings += get_sticking_state(i, 'URL');
      lines.HH += get_hh_state(i, 'URL');
      lines.Tom1 += get_tom_state(i, 1, 'URL');
      lines.Tom2 += get_tom_state(i, 2, 'URL');
      lines.Tom4 += get_tom_state(i, 4, 'URL');
      lines.Snare += get_snare_state(i, 'URL');
      lines.Kick += get_kick_state(i, 'URL');
      lines.Crash += get_crash_state(i, 'URL');
      lines.Ride += get_ride_state(i, 'URL');
    }
    for (var line in ornaments) lines['Orn' + line] = ornaments[line];
    return lines;
  }

  // Kept in localStorage as well, so a bar can be pasted into another groove
  // (another tab, or after loading a different groove); and (Infinity Drumming,
  // 2026) on the device's clipboard, which every tab, browser and home-screen app
  // shares, on either of the site's addresses too (each has its own localStorage).
  var constant_measure_clipboard_key = 'grooveScribeMeasureClipboard';
  var constant_measure_clipboard_text = 'Infinity Scribe bar ';
  var class_measure_clipboard = null;

  // measureNum is indexed starting at 1, not 0
  root.copyMeasureButtonClick = function (measureNum) {
    var lines = getTabLinesFromClickableUI();
    var start = (measureNum - 1) * class_notes_per_measure;
    var copied = {
      triplets: usingTriplets(),
      lines: {},
      sig: barSigOf(measureNum - 1),
      beats: beatsOfBar(measureNum - 1),
    };
    for (var name in lines) {
      copied.lines[name] = lines[name].slice(start, start + class_notes_per_measure);
    }
    copied.at = Date.now(); // (paste takes the newest copy)
    class_measure_clipboard = copied;
    try {
      window.localStorage.setItem(constant_measure_clipboard_key, JSON.stringify(copied));
    } catch (err) {
      /* storage unavailable: the in-page copy still works */
    }
    if (navigator.clipboard && navigator.clipboard.writeText)
      navigator.clipboard
        .writeText(constant_measure_clipboard_text + JSON.stringify(copied))
        .catch(function () {
          /* not allowed: the copies above remain */
        });

    // brief green flash so the click visibly did something
    var button = document.getElementById('copyMeasureButton' + measureNum);
    if (button) {
      button.style.color = '#2a9d2a';
      window.setTimeout(function () {
        button.style.color = '';
      }, 800);
    }
  };

  function getMeasureClipboard() {
    try {
      var stored = window.localStorage.getItem(constant_measure_clipboard_key);
      if (stored) return JSON.parse(stored);
    } catch (err) {
      /* fall back to the in-page copy */
    }
    return class_measure_clipboard;
  }

  // measureNum is indexed starting at 1, not 0
  // the flams, drags, ruffs and diddles of tab lines ("Orn" + each line's name)
  function ornamentLinesFromTabLines(lines) {
    var ornaments = emptyOrnamentLines();
    for (var line in ornaments) ornaments[line] = lines['Orn' + line];
    return ornaments;
  }

  // beat by beat, a pasted bar gets the beats of the bar copied (if it has the
  // same time signature), else the plainest its notes fit (Infinity Drumming, 2026)
  function setPastedBarBeats(bar, copied, pastedBar) {
    var grid = beatGrid();
    if (!grid) return;
    var sig = barSigOf(bar);
    var sameSig = copied.sig && copied.sig.top == sig.top && copied.sig.bottom == sig.bottom;
    // (beats for the other grid are worked out again from the notes)
    var fits = copied.beats && [0, grid].indexOf(gridOfBeats(copied.beats)) >= 0;
    class_beat_notes[bar] = sameSig && fits ? copied.beats : beatsFromTabLines(pastedBar, 0, sig);
  }

  // the bar on the device's clipboard ("Infinity Scribe bar {...}"), or null
  function measureFromClipboardText(text) {
    var prefix = constant_measure_clipboard_text.trim();
    text = String(text || '').trim();
    if (text.indexOf(prefix) !== 0) return null;
    try {
      var copied = JSON.parse(text.slice(prefix.length));
      return copied && copied.lines ? copied : null;
    } catch {
      return null; // not a bar after all
    }
  }

  // the bar to paste, to `then`: the newer of the device's clipboard's and this
  // site's copy (straight away when there's no clipboard to read)
  function readMeasureClipboard(then) {
    var stored = getMeasureClipboard();
    var clipboard = navigator.clipboard;
    if (!clipboard || !clipboard.readText) {
      then(stored);
      return;
    }
    clipboard.readText().then(
      function (text) {
        var copied = measureFromClipboardText(text);
        var newer = copied && (!stored || (copied.at || 0) >= (stored.at || 0));
        then(newer ? copied : stored);
      },
      function () {
        then(stored); // not allowed (or nothing there): this site's copy
      }
    );
  }

  root.pasteMeasureButtonClick = function (measureNum) {
    readMeasureClipboard(function (copied) {
      keepingMutes(
        function (bar) {
          return [bar];
        },
        function () {
          return pasteMeasure(measureNum, copied);
        }
      );
    });
  };

  function pasteMeasure(measureNum, copied) {
    if (!copied || !copied.lines) {
      window.alert('Copy a bar first: use the copy button under the bar you want.');
      return false;
    }
    if (copied.triplets !== usingTriplets()) {
      window.alert(
        'That bar was copied from a ' +
          (copied.triplets ? 'triplet' : 'non-triplet') +
          ' groove and can only be pasted into one too.'
      );
      return false;
    }

    var lines = getTabLinesFromClickableUI();
    var start = (measureNum - 1) * class_notes_per_measure;
    var end = start + class_notes_per_measure;
    var pastedBar = {};
    for (var name in lines) {
      if (copied.lines[name] === undefined) continue;
      var bar = scaleTabMeasure(copied.lines[name], class_notes_per_measure);
      pastedBar[name] = bar;
      lines[name] = lines[name].slice(0, start) + bar + lines[name].slice(end);
    }
    setPastedBarBeats(measureNum - 1, copied, pastedBar);

    changeDivisionWithNotes(
      class_time_division,
      lines.Stickings,
      lines.HH,
      lines.Tom1,
      lines.Tom2,
      lines.Tom4,
      lines.Snare,
      lines.Kick,
      lines.Crash,
      lines.Ride,
      ornamentLinesFromTabLines(lines)
    );

    // make sure pasted toms, cymbals and stickings are visible
    var hasNotes = function (tab) {
      return /[^-]/.test(tab);
    };
    if (hasNotes(copied.lines.Tom1 + copied.lines.Tom2 + copied.lines.Tom4))
      root.showHideToms(true, true, true);
    if (hasNotes((copied.lines.Crash || '') + (copied.lines.Ride || '')))
      root.showHideCymbals(true, true, true);
    if (hasNotes(copied.lines.Stickings)) root.stickingsShowHide(true, true, true);

    updateSheetMusic();
  }

  // --- A block of notes (Infinity Drumming, 2026) ------------------------------
  // Hold Shift (or ⌘ on a Mac) and drag a box over the grid to select notes: any
  // lines, any notes, across bars too (Ctrl + moving over notes already turns
  // them on). On a touch screen the Select button does the same for a finger.
  // Ctrl / ⌘ + C (or Copy) copies them; a Shift-click (a tap in Select) picks the
  // slot the block starts at, and Ctrl / ⌘ + V (or Paste) puts it there,
  // replacing what's in its rows (noteBlocks.js).
  var NOTE_ROW_CELLS = {
    sticking: 'sticking',
    crash: 'crash',
    ride: 'ride',
    hh: 'hi-hat',
    tom1: 'tom1-',
    tom2: 'tom2-',
    snare: 'snare',
    tom4: 'tom4-',
    kick: 'kick',
    hhfoot: 'hhfoot',
  };
  var class_note_selection = []; // the selected cells: {row, index}
  var class_note_block = null; // the copied block, and the note setting it's in
  var class_select_mode = false; // the Select button
  var class_selecting = null; // a box being dragged
  var class_swallow_note_click = false; // (the click that ends a drag)

  function noteCell(row, index) {
    return document.getElementById(NOTE_ROW_CELLS[row] + index);
  }

  // every cell showing in the grid, where it is on the screen
  function shownNoteCells() {
    var cells = [];
    var total = class_notes_per_measure * class_number_of_measures;
    for (var row in NOTE_ROW_CELLS)
      for (var index = 0; index < total; index++) {
        var cell = noteCell(row, index);
        if (!cell || !cell.offsetParent) continue; // (a hidden line or slot)
        var rect = cell.getBoundingClientRect();
        if (rect.width > 0) cells.push({ row: row, index: index, rect: rect });
      }
    return cells;
  }

  function showNoteSelection() {
    var marked = document.querySelectorAll('#measureContainer .noteSelected');
    for (var m = 0; m < marked.length; m++) marked[m].classList.remove('noteSelected');
    class_note_selection.forEach(function (cell) {
      var element = noteCell(cell.row, cell.index);
      if (element) element.classList.add('noteSelected');
    });
    showNoteSelectBar();
  }

  function selectionSummary() {
    var cells = class_note_selection;
    if (!cells.length) return '';
    var rows = {};
    var first = Infinity;
    var last = -1;
    cells.forEach(function (cell) {
      rows[cell.row] = true;
      first = Math.min(first, cell.index);
      last = Math.max(last, cell.index);
    });
    var lines = Object.keys(rows).length;
    var notes = last - first + 1;
    if (cells.length == 1) return '1 note';
    return (
      (lines == 1 ? '1 line' : lines + ' lines') + ' × ' + notes + (notes == 1 ? ' note' : ' notes')
    );
  }

  // Copy / Paste / Done, while there's a selection or Select is on
  function showNoteSelectBar(message) {
    var bar = document.getElementById('noteSelectBar');
    var on = class_select_mode || class_note_selection.length > 0;
    if (!bar) {
      if (!on) return;
      bar = document.createElement('div');
      bar.id = 'noteSelectBar';
      bar.innerHTML =
        '<span id="noteSelectText"></span>' +
        '<button type="button" id="noteSelectCopy" onclick="myGrooveWriter.copyNoteSelection()">' +
        '<i class="fa fa-copy"></i> Copy</button>' +
        '<button type="button" id="noteSelectPaste" onclick="myGrooveWriter.pasteNoteBlock()">' +
        '<i class="fa fa-paste"></i> Paste</button>' +
        '<button type="button" id="noteSelectDone" onclick="myGrooveWriter.endNoteSelection()">' +
        'Done</button>';
      document.body.appendChild(bar);
    }
    bar.style.display = on ? '' : 'none';
    var pick = class_select_mode ? 'tap' : 'Shift-click';
    var drag = class_select_mode ? 'Drag' : 'Shift + drag';
    var text = message || selectionSummary();
    if (!text)
      text = class_note_block ? 'Copied: ' + pick + ' where it goes' : drag + ' over the notes';
    document.getElementById('noteSelectText').textContent = text;
    /** @type {HTMLButtonElement} */ (document.getElementById('noteSelectCopy')).disabled =
      !class_note_selection.length;
    /** @type {HTMLButtonElement} */ (document.getElementById('noteSelectPaste')).disabled =
      !class_note_block || !class_note_selection.length;
  }

  function noteSelectPointerDown(event) {
    if (!(event.shiftKey || event.metaKey) && !class_select_mode) return;
    if (event.pointerType == 'mouse' && event.button !== 0) return;
    var target = /** @type {HTMLElement} */ (event.target);
    if (!target.closest || !target.closest('.notes-row-container')) return;
    if (target.closest('.line-labels')) return;
    event.preventDefault();
    class_selecting = {
      x: event.clientX,
      y: event.clientY,
      id: event.pointerId,
      cells: shownNoteCells(),
      moved: false,
    };
    class_swallow_note_click = true;
  }

  function noteSelectBox(drag, event) {
    return {
      left: Math.min(drag.x, event.clientX),
      right: Math.max(drag.x, event.clientX),
      top: Math.min(drag.y, event.clientY),
      bottom: Math.max(drag.y, event.clientY),
    };
  }

  function noteSelectPointerMove(event) {
    var drag = class_selecting;
    if (!drag || event.pointerId != drag.id) return;
    if (!drag.moved && Math.abs(event.clientX - drag.x) + Math.abs(event.clientY - drag.y) < 6)
      return;
    drag.moved = true;
    event.preventDefault();
    var box = noteSelectBox(drag, event);
    var outline = document.getElementById('noteSelectBox');
    if (!outline) {
      outline = document.createElement('div');
      outline.id = 'noteSelectBox';
      document.body.appendChild(outline);
    }
    outline.style.display = '';
    outline.style.left = box.left + 'px';
    outline.style.top = box.top + 'px';
    outline.style.width = box.right - box.left + 'px';
    outline.style.height = box.bottom - box.top + 'px';
    // the cells whose middles are in the box
    class_note_selection = drag.cells
      .filter(function (cell) {
        var x = (cell.rect.left + cell.rect.right) / 2;
        var y = (cell.rect.top + cell.rect.bottom) / 2;
        return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
      })
      .map(function (cell) {
        return { row: cell.row, index: cell.index };
      });
    showNoteSelection();
  }

  function noteSelectPointerUp(event) {
    var drag = class_selecting;
    if (!drag || event.pointerId != drag.id) return;
    class_selecting = null;
    var outline = document.getElementById('noteSelectBox');
    if (outline) outline.style.display = 'none';
    if (!drag.moved) {
      // a click or a tap: that one note (where a paste goes)
      var hit = drag.cells.filter(function (cell) {
        var r = cell.rect;
        return (
          event.clientX >= r.left &&
          event.clientX <= r.right &&
          event.clientY >= r.top &&
          event.clientY <= r.bottom
        );
      })[0];
      class_note_selection = hit ? [{ row: hit.row, index: hit.index }] : [];
      showNoteSelection();
    }
    // the click that follows doesn't play the note (noteSelectClick)
    window.setTimeout(function () {
      class_swallow_note_click = false;
    }, 400);
  }

  function noteSelectClick(event) {
    if (!class_swallow_note_click && !class_select_mode) return;
    var target = /** @type {HTMLElement} */ (event.target);
    if (!target.closest || !target.closest('.notes-row-container')) return;
    if (target.closest('.line-labels')) return;
    event.stopPropagation(); // (the notes' own onclick)
    event.preventDefault();
    class_swallow_note_click = false;
  }

  function noteSelectKeys(event) {
    var target = /** @type {HTMLElement} */ (event.target);
    if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
    if (event.key == 'Escape') {
      if (class_note_selection.length || class_select_mode) root.endNoteSelection();
      return;
    }
    if (!(event.ctrlKey || event.metaKey)) return;
    var key = String(event.key).toLowerCase();
    if (key == 'c' && class_note_selection.length) {
      if (window.getSelection && String(window.getSelection())) return; // copying text
      event.preventDefault();
      root.copyNoteSelection();
    } else if (key == 'v' && class_note_block && class_note_selection.length) {
      event.preventDefault();
      root.pasteNoteBlock();
    }
  }

  function setupNoteSelection() {
    var grid = document.getElementById('measureContainer');
    if (!grid) return;
    grid.addEventListener('pointerdown', noteSelectPointerDown);
    window.addEventListener('pointermove', noteSelectPointerMove, { passive: false });
    window.addEventListener('pointerup', noteSelectPointerUp);
    window.addEventListener('pointercancel', noteSelectPointerUp);
    grid.addEventListener('click', noteSelectClick, true); // before the notes' own
    document.addEventListener('keydown', noteSelectKeys);
  }

  root.copyNoteSelection = function () {
    if (!class_note_selection.length) return;
    var block = _blocks.copyBlock(getTabLinesFromClickableUI(), class_note_selection);
    class_note_block = { block: block, division: class_time_division };
    showNoteSelectBar(
      'Copied ' +
        selectionSummary() +
        ': ' +
        (class_select_mode ? 'tap' : 'Shift-click') +
        ' where it goes'
    );
  };

  // the copied block, from the first selected note's slot (rows of its own)
  root.pasteNoteBlock = function () {
    var copied = class_note_block;
    if (!copied || !class_note_selection.length) return;
    if (copied.division != class_time_division) {
      window.alert(
        'Those notes were copied with another note setting: change Notes back to paste them.'
      );
      return;
    }
    var at = Math.min.apply(
      null,
      class_note_selection.map(function (cell) {
        return cell.index;
      })
    );
    var written = [];
    keepingMutes(
      function (bar) {
        return [bar];
      },
      function () {
        var lines = getTabLinesFromClickableUI();
        written = _blocks.pasteBlock(lines, copied.block, at, function (slot) {
          return !isHiddenSlot(slot) && !isBeatHiddenSlot(slot);
        });
        if (!written.length) return false;
        changeDivisionWithNotes(
          class_time_division,
          lines.Stickings,
          lines.HH,
          lines.Tom1,
          lines.Tom2,
          lines.Tom4,
          lines.Snare,
          lines.Kick,
          lines.Crash,
          lines.Ride,
          ornamentLinesFromTabLines(lines)
        );
        // pasted toms, cymbals and stickings show
        if (pastedInto(written, ['tom1', 'tom2', 'tom4'])) root.showHideToms(true, true, true);
        if (pastedInto(written, ['crash', 'ride'])) root.showHideCymbals(true, true, true);
        if (pastedInto(written, ['sticking'])) root.stickingsShowHide(true, true, true);
        updateSheetMusic();
      }
    );
    if (written.length) class_note_selection = written; // (what was pasted)
    showNoteSelection();
  };

  function pastedInto(written, rows) {
    return written.some(function (cell) {
      return rows.indexOf(cell.row) >= 0;
    });
  }

  root.endNoteSelection = function () {
    class_note_selection = [];
    if (class_select_mode) root.toggleSelectNotes();
    showNoteSelection();
  };

  // the Select button (touch screens): a finger selects instead of playing notes
  root.toggleSelectNotes = function () {
    class_select_mode = !class_select_mode;
    var button = document.getElementById('selectNotesAnchor');
    if (button) {
      if (class_select_mode) selectButton(button);
      else unselectButton(button);
    }
    document.body.classList.toggle('selectingNotes', class_select_mode);
    if (!class_select_mode) class_note_selection = [];
    showNoteSelection();
  };

  function showHideCSS_ClassDisplay(className, force, showElseHide, showState) {
    var myElements = document.querySelectorAll(className);
    var newStateIsOn = true;

    for (var i = 0; i < myElements.length; i++) {
      var element = myElements[i];

      if (force) {
        newStateIsOn = showElseHide;
      } else {
        // no-force means to swap on each call
        if (element.style.display == showState) newStateIsOn = false;
        else newStateIsOn = true;
      }

      if (newStateIsOn) element.style.display = showState;
      else element.style.display = 'none';
    }

    return newStateIsOn;
  }

  function showHideCSS_ClassVisibility(className, force, showElseHide) {
    var myElements = document.querySelectorAll(className);
    for (var i = 0; i < myElements.length; i++) {
      var stickings = myElements[i];

      if (force) {
        if (showElseHide) stickings.style.visibility = 'visible';
        else stickings.style.visibility = 'hidden';
      } else {
        // no-force means to swap on each call
        if (stickings.style.visibility == 'visible') stickings.style.visibility = 'hidden';
        else stickings.style.visibility = 'visible';
      }
    }
  }

  // clear all the notes on all measures
  root.clearAllNotes = function () {
    for (var i = 0; i < class_number_of_measures * class_notes_per_measure; i++) {
      set_sticking_state(i, 'off');
      set_hh_state(i, 'off');
      set_tom1_state(i, 'off');
      set_tom2_state(i, 'off');
      set_crash_state(i, 'off');
      set_ride_state(i, 'off');
      set_tom4_state(i, 'off');
      set_snare_state(i, 'off');
      set_kick_state(i, 'off');
    }
    updateSheetMusic();
  };

  function isTomsVisible() {
    var myElements = document.querySelectorAll('.toms-container');
    for (var i = 0; i < myElements.length; i++) {
      if (myElements[i].style.display == 'block') return true;
    }

    return false;
  }

  // hidden tom lines are removed from the layout (not just made invisible), so
  // the grid closes up, like the cymbal lines
  root.showHideToms = function (force, showElseHide, dontRefreshScreen) {
    var OnElseOff = showHideCSS_ClassDisplay('.toms-container', force, showElseHide, 'block');
    showHideCSS_ClassDisplay('.tom-label', true, OnElseOff, 'block');
    if (OnElseOff) addOrRemoveKeywordFromClassById('showHideTomsButton', 'ClickToHide', true);
    else addOrRemoveKeywordFromClassById('showHideTomsButton', 'ClickToHide', false);

    if (!dontRefreshScreen) updateSheetMusic();

    return false; // don't follow the link
  };

  function isCymbalsVisible() {
    var myElements = /** @type {NodeListOf<HTMLElement>} */ (
      document.querySelectorAll('.cymbals-container')
    );
    for (var i = 0; i < myElements.length; i++) {
      if (myElements[i].style.display == 'block') return true;
    }

    return false;
  }

  // the crash and ride lines (CYMBALS button)
  root.showHideCymbals = function (force, showElseHide, dontRefreshScreen) {
    var OnElseOff = showHideCSS_ClassDisplay('.cymbals-container', force, showElseHide, 'block');
    showHideCSS_ClassDisplay('.cymbals-label', true, OnElseOff, 'block');
    if (document.getElementById('showHideCymbalsButton'))
      addOrRemoveKeywordFromClassById('showHideCymbalsButton', 'ClickToHide', OnElseOff);

    if (!dontRefreshScreen) updateSheetMusic();

    return false; // don't follow the link
  };

  function isStickingsVisible() {
    var myElements = document.querySelectorAll('.stickings-container');
    for (var i = 0; i < myElements.length; i++) {
      if (myElements[i].style.display == 'block') return true;
    }

    return false;
  }

  root.stickingsShowHide = function (force, showElseHide, dontRefreshScreen) {
    var OnElseOff = showHideCSS_ClassDisplay('.stickings-container', force, showElseHide, 'block');
    showHideCSS_ClassDisplay('.stickings-label', force, showElseHide, 'block');
    if (OnElseOff) {
      addOrRemoveKeywordFromClassById('stickingsButton', 'ClickToHide', true);
    } else {
      addOrRemoveKeywordFromClassById('stickingsButton', 'ClickToHide', false);
    }

    if (!dontRefreshScreen) {
      updateSheetMusic();
    }

    return false; // don't follow the link
  };

  // if stickings are shown, hide them and vice versa
  root.stickingsShowHideToggle = function () {
    var stickingsAreCurrentlyShown = isStickingsVisible();
    root.stickingsShowHide(true, !stickingsAreCurrentlyShown, false);
  };

  // Swap Right and Left stickings if any are shown
  root.stickingsReverseRL = function () {
    for (var i = 0; i < class_number_of_measures * class_notes_per_measure; i++) {
      var cur_state = get_sticking_state(i, 'URL');
      if (cur_state === 'R') {
        set_sticking_state(i, 'left', false);
      } else if (cur_state === 'L') {
        set_sticking_state(i, 'right', false);
      }
    }
    updateSheetMusic();
  };

  // the instructions on the page (Infinity Drumming, 2026), for the print window
  function instructionsForPrint() {
    var card = document.getElementById('exerciseInstructionsCard');
    var text = document.getElementById('exerciseInstructionsCardText');
    if (!card || !text || card.style.display == 'none') return '';
    return (
      '<div style="margin: 0 0 12px; font: 16px sans-serif; text-align: left; white-space: pre-wrap">' +
      '<b>Instructions</b>\n' +
      text.innerHTML + // the text as the page shows it, so escaped
      '</div>\n'
    );
  }

  root.printMusic = function () {
    var oldMethod = true;

    if (root.browserInfo.browser == 'Chrome' && root.browserInfo.platform == 'windows') {
      oldMethod = false;
    }

    if (oldMethod) {
      // css media queries wiil hide all but the music
      // force a print

      window.print();
    } else {
      // open a new window just for printing   (new method)
      var win = window.open('', class_app_title + ' Print');
      win.document.body.innerHTML = '<title>' + class_app_title + '</title>\n<center>\n';
      win.document.body.innerHTML += instructionsForPrint();
      win.document.body.innerHTML += document.getElementById('svgTarget').innerHTML;
      win.document.body.innerHTML += '\n</center>';
      win.print();
    }
  };

  root.setupWriterHotKeys = function () {
    document.addEventListener('keydown', function (e) {
      // only accept the event if it not going to an INPUT field   (allow for range types)
      if (
        e.target.type == 'range' ||
        (e.target.tagName.toUpperCase() != 'INPUT' && e.target.tagName.toUpperCase() != 'TEXTAREA')
      ) {
        switch (e.which) {
          case 90: // ctrl-z
            if (e.ctrlKey) {
              // ctrl-z
              root.undoCommand();
              return false;
            }
            break;

          case 89: // ctrl-y
            if (e.ctrlKey) {
              // ctrl-y
              root.redoCommand();
              return false;
            }
            break;

          case 37: // left arrow
            // left arrow
            root.myGrooveUtils.downTempo();
            return false;
          //break;

          case 39: // right arrow
            // right arrow
            root.myGrooveUtils.upTempo();
            return false;
          //break;

          default:
            /* DEBUG
					else if(e.ctrlKey && e.which !=17 && e.target.type != "text") {
					alert("Key is: " + e.which);
					}
					 */
            break;
        }
      }
      return true; // let the default handler deal with the keypress
    });
  };

  // the view switch: the student view hides the editing tools (Infinity Drumming, 2026)
  var STUDENT_VIEW_LABEL = '<i class="fa fa-eye"></i> Student<span class="longLabel"> view</span>';
  var EDIT_VIEW_LABEL = '<i class="fa fa-pencil"></i> Edit';
  root.swapViewEditMode = function (dontUpdateURL) {
    var view_edit_button = document.getElementById('view-edit-switch');

    if (root.myGrooveUtils.viewMode) {
      showHideCSS_ClassDisplay('.edit-block', true, true, 'block'); // show

      if (view_edit_button) view_edit_button.innerHTML = STUDENT_VIEW_LABEL;
      root.myGrooveUtils.viewMode = false;

      if (!dontUpdateURL) root.updateCurrentURL();
    } else {
      showHideCSS_ClassDisplay('.edit-block', true, false, 'block'); // hide

      if (view_edit_button) view_edit_button.innerHTML = EDIT_VIEW_LABEL;
      root.myGrooveUtils.viewMode = true;
      if (!dontUpdateURL) root.updateCurrentURL();
    }
  };

  // public function.
  // This function initializes the data for the groove Scribe web page
  // Auto-scroll on / off (metronome Options), remembered in this browser
  var constant_auto_scroll_key = 'grooveScribeAutoScroll';
  function setAutoScroll(on) {
    root.myGrooveUtils.autoScrollEnabled = on;
    addOrRemoveKeywordFromClassById('metronomeOptionsContextMenuAutoScroll', 'menuChecked', on);
    try {
      window.localStorage.setItem(constant_auto_scroll_key, on ? 'on' : 'off');
    } catch (err) {
      /* storage unavailable: the setting just lasts for this visit */
    }
  }
  function storedAutoScroll() {
    try {
      return window.localStorage.getItem(constant_auto_scroll_key) != 'off';
    } catch (err) {
      return true;
    }
  }

  root.runsOnPageLoad = function () {
    setAutoScroll(storedAutoScroll());
    root.setupWriterHotKeys(); // there are other hot keys in GrooveUtils for the midi player
    setupNoteSelection(); // Shift + drag over the notes (Infinity Drumming, 2026)

    setupPermutationMenu();
    root.setTimeSigLabel();

    // if Mode != "view" put into edit mode  (we default to view mode to prevent screen flicker)
    if ('view' != root.myGrooveUtils.getQueryVariableFromURL('Mode', 'edit'))
      root.swapViewEditMode(true);

    // set the background and text color of the current subdivision
    selectButton(document.getElementById('subdivision_' + class_notes_per_measure + 'ths'));
    syncToolbarSelects();

    // add html for the midi player
    root.myGrooveUtils.AddMidiPlayerToPage('midiPlayer', class_time_division);

    // load the groove from the URL data if it was passed in.
    set_Default_notes(window.location.search);

    root.myGrooveUtils.midiEventCallbacks.loadMidiDataEvent = function (myroot, playStarting) {
      var midiURL;

      if (playStarting) {
        resetGrooveClickPhase(); // always start with the groove
        resetPracticeCount();
      }

      // a flam / drag / ruff on the groove's first note: its grace notes come
      // before the 1, so they are played at the end of the count-in, or in a
      // short lead-in when there is no count-in
      var leadIn = null;
      if (playStarting) {
        buildGrooveMidiUrl();
        leadIn = root.myGrooveUtils.graceLeadIn;
      }

      if (playStarting && class_metronome_count_in_active) {
        midiURL = root.myGrooveUtils.MIDI_build_midi_url_count_in_track(
          class_num_beats_per_measure,
          class_note_value_per_measure,
          leadIn
        );
        root.myGrooveUtils.midiNoteHasChanged(); // this track is temporary
        class_metronome_count_in_is_playing = true;
      } else if (leadIn) {
        midiURL = root.myGrooveUtils.MIDI_build_lead_in_track(leadIn);
        root.myGrooveUtils.midiNoteHasChanged(); // this track is temporary
        class_metronome_count_in_is_playing = true; // (no cursor, like a count-in)
      } else {
        if (class_metronome_count_in_is_playing) {
          // we saved the state above so that we could reset the Offset click start, otherwise it starts on the 'e'
          class_metronome_count_in_is_playing = false;
          root.myGrooveUtils.resetMetronomeOptionsOffsetClickStartRotation();
        }
        midiURL = buildPlayingRoundMidiUrl();
        class_loaded_midi_straight_bars = loadedMidiStraightBars();
        class_rep_counter_numbers = shownPermutationNumbers();
        root.myGrooveUtils.midiResetNoteHasChanged();
      }
      root.myGrooveUtils.loadMIDIFromURL(midiURL);
      root.updateGrooveDBSource();
    };

    root.myGrooveUtils.midiEventCallbacks.notePlaying = function (
      myroot,
      note_type,
      percent_complete
    ) {
      if (note_type == 'complete' && class_metronome_auto_speed_up_active) {
        // reload with new tempo
        root.myGrooveUtils.midiNoteHasChanged();
        root.metronomeAutoSpeedUpTempoUpdate();
      }

      // the practice timer counts the bars played (not the count-in)
      if (note_type == 'complete' && !class_metronome_count_in_is_playing) countPracticeRound();
      if (class_practice_limit && note_type != 'complete' && note_type != 'clear')
        showPracticeStatus(percent_complete);

      // the count-in track doesn't count towards the groove bars
      if (
        note_type == 'complete' &&
        class_groove_click_active &&
        !class_metronome_count_in_is_playing
      )
        advanceGrooveClickCycle();

      if (note_type != 'complete' && note_type != 'clear')
        percent_complete = playingPercentToGroovePercent(percent_complete);
      updateRepCounter(note_type, percent_complete);
      hilight_note(note_type, percent_complete);
    };

    // stopped: the practice timer shows its setting again (or "Done!")
    var stopEvent = root.myGrooveUtils.midiEventCallbacks.stopEvent;
    root.myGrooveUtils.midiEventCallbacks.stopEvent = function (myroot) {
      stopEvent.call(this, myroot);
      showPracticeStatus(-1);
      showRepCounter('');
    };

    root.myGrooveUtils.oneTimeInitializeMidi();

    // enable or disable swing (by the note setting, not the notes in a bar: a 6/4
    // bar of 8ths has 12, which isn't triplets)
    root.myGrooveUtils.swingEnabled(
      root.myGrooveUtils.doesDivisionSupportSwing(class_time_division)
    );

    window.onresize = root.refresh_ABC;

    root.browserInfo = root.myGrooveUtils.getBrowserInfo();
    if (root.browserInfo.browser == 'MSIE' && root.browserInfo.version < 10) {
      window.alert(
        'This browser has been detected as: ' +
          root.browserInfo.browser +
          ' ver: ' +
          root.browserInfo.version +
          '.\n' +
          'This version of IE is unsupported.   Please use Chrome or Firefox instead'
      );
    } else if (
      root.browserInfo.browser == 'Safari' &&
      root.browserInfo.platform == 'windows' &&
      root.browserInfo.version < 535
    ) {
      window.alert(
        'This browser has been detected as: ' +
          root.browserInfo.browser +
          ' ver: ' +
          root.browserInfo.version +
          '.\n' +
          'This version of Safari is unsupported.   Please use Chrome instead'
      );
    }
    if (root.myGrooveUtils.debugMode) {
      var debugOutput = document.getElementById('debugOutput');
      if (debugOutput) {
        debugOutput.innerHTML +=
          '<div>This browser has been detected as: ' +
          root.browserInfo.browser +
          ' ver: ' +
          root.browserInfo.version +
          '.<br>' +
          root.browserInfo.uastring +
          '<br>Running on: ' +
          root.browserInfo.platform +
          '</div>';
      }
    }

    if (root.myGrooveUtils.is_touch_device()) {
      setTimeout(function () {
        window.scrollTo(0, 1);
      }, 1000);
    }

    // get updates when the tempo changes
    root.myGrooveUtils.tempoChangeCallback = root.tempoChangeCallback;
  };

  // called right before the midi reloads for the next replay
  // set the new tempo based on the delta required for the time interval
  var class_our_midi_start_time = null;
  var class_our_midi_start_tempo = 0;
  var class_our_last_midi_tempo_increase_time = null;
  var class_our_last_midi_tempo_increase_remainder = 0;
  root.metronomeAutoSpeedUpTempoUpdate = function () {
    var totalTempoIncreaseAmount = 1;
    if (document.getElementById('metronomeAutoSpeedupTempoIncreaseAmount'))
      totalTempoIncreaseAmount = parseInt(
        document.getElementById('metronomeAutoSpeedupTempoIncreaseAmount').value,
        10
      );
    var tempoIncreaseInterval = 60;
    if (document.getElementById('metronomeAutoSpeedupTempoIncreaseInterval')) {
      tempoIncreaseInterval = parseInt(
        document.getElementById('metronomeAutoSpeedupTempoIncreaseInterval').value,
        10
      );
      tempoIncreaseInterval = tempoIncreaseInterval * 60; // turn mins to secs
    }

    var keepIncreasingForever = false;
    if (document.getElementById('metronomeAutoSpeedUpKeepGoingForever'))
      keepIncreasingForever = document.getElementById(
        'metronomeAutoSpeedUpKeepGoingForever'
      ).checked;

    // "Stop at" target tempo: keep increasing until it is reached, then hold there
    var targetTempo = getAutoSpeedUpTargetTempo();
    if (targetTempo) keepIncreasingForever = true;

    if (speedUpCountsBars()) {
      speedUpAfterBars(totalTempoIncreaseAmount, keepIncreasingForever, targetTempo);
      return;
    }

    var curTempo = root.myGrooveUtils.getTempo();

    var midiStartTime = root.myGrooveUtils.getMidiStartTime();
    if (class_our_midi_start_time != midiStartTime) {
      class_our_midi_start_time = midiStartTime;
      class_our_last_midi_tempo_increase_remainder = 0;
      class_our_last_midi_tempo_increase_time = new Date(0);
      class_our_midi_start_tempo = curTempo;
    } else if (!keepIncreasingForever) {
      if (curTempo >= class_our_midi_start_tempo + totalTempoIncreaseAmount) {
        return; // don't increase any more after we have gone up the total amount
      }
    }
    var totalMidiPlayTime = root.myGrooveUtils.getMidiPlayTime();
    var timeDiffMilliseconds =
      totalMidiPlayTime.getTime() - class_our_last_midi_tempo_increase_time.getTime();
    var tempoDiffFloat =
      totalTempoIncreaseAmount * (timeDiffMilliseconds / (tempoIncreaseInterval * 1000));

    // round the number down, but keep track of the remainder so we carry it forward.   Otherwise
    // rounding errors cause us to be way off.
    tempoDiffFloat += class_our_last_midi_tempo_increase_remainder;
    var tempoDiffInt = Math.floor(tempoDiffFloat);
    class_our_last_midi_tempo_increase_remainder = tempoDiffFloat - tempoDiffInt;

    class_our_last_midi_tempo_increase_time = totalMidiPlayTime;

    if (!keepIncreasingForever) {
      if (curTempo + tempoDiffInt > class_our_midi_start_tempo + totalTempoIncreaseAmount) {
        // increase to the total max amount, then we are done
        tempoDiffInt = class_our_midi_start_tempo + totalTempoIncreaseAmount - curTempo;
      }
    }

    if (targetTempo && curTempo + tempoDiffInt > targetTempo) tempoDiffInt = targetTempo - curTempo; // never past the target (none if already there)

    if (tempoDiffInt > 0) root.myGrooveUtils.setTempo(root.myGrooveUtils.getTempo() + tempoDiffInt);
  };

  // --- Practice timer, and speed-up counted in bars (Infinity Drumming, 2026) ---
  // Playback goes round a set of bars (the groove, a permutation, or a groove /
  // click cycle), built again just before each time round.  When the practice
  // ends inside the next time round, only its bars up to the end are built,
  // followed by a crash on the next 1, so it stops right on the bar line.
  /** @type {import('./practiceTimer.js').PracticeLimit | null} */
  var class_practice_limit = null;
  var class_practice_played = { bars: 0, ms: 0 }; // since play was pressed
  var class_practice_ending = false; // the loaded time round is the last
  var class_practice_finished = false; // the timer has stopped the playing
  /** @type {number[]} */
  var class_round_bar_ms = []; // the loaded time round: each bar's length in ms
  var class_round_full_ms = 0; // the whole time round's, had it all been built
  var class_speed_up_bars = { played: 0, steps: 0 };
  var PRACTICE_ENDING_TICKS = 384; // the closing crash rings for 3 beats
  var PRACTICE_PRESETS = { minutes: [2, 5, 10, 15, 20, 30], bars: [8, 16, 32, 64] };

  /** @param {number[]} values */
  function sumOf(values) {
    return values.reduce(function (a, b) {
      return a + b;
    }, 0);
  }

  function resetPracticeCount() {
    class_practice_played = { bars: 0, ms: 0 };
    class_practice_ending = false;
    class_practice_finished = false;
    class_speed_up_bars = { played: 0, steps: 0 };
    root.myGrooveUtils.stopAtEndOfRound = false;
    showPracticeStatus(-1);
  }

  // The bars of the next time round, in playing order.  `bar` is a bar of the
  // groove, or of the permutation when one is chosen; `click` marks the
  // click-only bars of the groove / click option.
  function playingRoundBars() {
    var round = [];
    var length = grooveClickSequenceLength();
    if (class_groove_click_active && length > 0) {
      var start = class_groove_click_cycle_start_bar;
      var grooveBars = class_groove_click_groove_bars;
      for (var g = 0; g < grooveBars; g++)
        round.push({ bar: sequenceBar((start + g) % length), click: false });
      for (var c = 0; c < class_groove_click_click_bars; c++)
        round.push({ bar: sequenceBar((start + grooveBars + c) % length), click: true });
      return round;
    }
    for (var b = 0; b < length; b++) round.push({ bar: sequenceBar(b), click: false });
    return round;
  }

  function roundBarMs(entry) {
    var bar = class_permutation_type == 'none' ? entry.bar : 0; // permutations play bar 1
    return (barLengthInBeats(bar) * 60000) / root.myGrooveUtils.getTempo();
  }

  function practiceEndingMs() {
    return ((PRACTICE_ENDING_TICKS / 128) * 60000) / root.myGrooveUtils.getTempo();
  }

  function buildGrooveMidiUrl() {
    if (class_groove_click_active && grooveClickSequenceLength() > 0)
      return createGrooveClickCycleMidiUrl(class_groove_click_cycle_start_bar);
    if (playedBars().length) return createPlayedBarsMidiUrl();
    return createMidiUrlFromClickableUI('our_MIDI');
  }

  // The MIDI for the next time round (the last one cut short by the practice timer)
  function buildPlayingRoundMidiUrl() {
    var round = playingRoundBars();
    class_round_bar_ms = round.map(roundBarMs);
    class_round_full_ms = sumOf(class_round_bar_ms);
    class_practice_ending = false;
    if (class_practice_limit && round.length) {
      var count = barsBeforePracticeEnds(
        class_practice_limit,
        class_practice_played,
        class_round_bar_ms
      );
      if (count > 0) {
        class_practice_ending = true;
        class_round_bar_ms = class_round_bar_ms.slice(0, count);
        return practiceEndingMidiUrl(round.slice(0, count));
      }
    }
    return buildGrooveMidiUrl();
  }

  // The last bars of the practice, then a crash and a kick on the next 1
  function practiceEndingMidiUrl(entries) {
    var midiFile = new Midi.File();
    var midiTrack = newExactTimeTrack();
    midiFile.addTrack(midiTrack);
    midiTrack.setTempo(root.myGrooveUtils.getTempo());
    midiTrack.setInstrument(0, 0x13);
    if (class_groove_click_active)
      class_groove_click_playing_start_bar = class_groove_click_cycle_start_bar;
    var sections = class_permutation_type == 'none' ? null : get_shown_permutation_sections();
    entries.forEach(function (entry) {
      if (entry.click)
        addClickBarToMidiTrack(
          midiTrack,
          isSequenceBarStraight(entry.bar),
          sections ? 0 : entry.bar
        );
      else if (sections) addPermutationBarToMidiTrack(midiTrack, sections, entry.bar);
      else addGrooveBarToMidiTrack(midiTrack, entry.bar, 'our_MIDI');
    });
    root.myGrooveUtils.setTrackLoopLeadIn(midiTrack, null); // nothing comes after it
    midiTrack.addNoteOn(9, constant_OUR_MIDI_HIHAT_CRASH, 0, constant_OUR_MIDI_VELOCITY_ACCENT);
    midiTrack.addNoteOn(9, constant_OUR_MIDI_KICK_NORMAL, 0, constant_OUR_MIDI_VELOCITY_ACCENT);
    midiTrack.addNoteOff(0, 60, PRACTICE_ENDING_TICKS);
    return 'data:audio/midi;base64,' + btoa(midiFile.toBytes());
  }

  // A time round has just played
  function countPracticeRound() {
    if (!class_practice_limit) return;
    class_practice_played.bars += class_round_bar_ms.length;
    class_practice_played.ms += sumOf(class_round_bar_ms);
    if (class_practice_ending) {
      class_practice_ending = false;
      class_practice_finished = true;
      root.myGrooveUtils.stopAtEndOfRound = true;
    } else {
      root.myGrooveUtils.midiNoteHasChanged(); // the next time round may be the last
    }
    showPracticeStatus(-1);
  }

  function practiceStatusElement() {
    var element = document.getElementById('practiceTimerStatus');
    if (element) return element;
    var playTime = document.getElementById(
      'MIDIPlayTime' + root.myGrooveUtils.grooveUtilsUniqueIndex
    );
    if (!playTime || !playTime.parentNode) return null;
    element = document.createElement('span');
    element.id = 'practiceTimerStatus';
    element.className = 'practiceTimerStatus';
    // with the time played (one over the other on a phone, leaving room for the
    // "Practise bars" box)
    var both = document.createElement('span');
    both.className = 'playTimeAndTimer';
    playTime.parentNode.insertBefore(both, playTime);
    both.appendChild(playTime);
    both.appendChild(element);
    return element;
  }

  function practiceLimitLabel(limit) {
    if (limit.unit == 'minutes') return limit.amount + ' min';
    return limit.amount + (limit.amount == 1 ? ' bar' : ' bars');
  }

  // "4:12 left", "12 bars left", "Done!" or the timer's setting.  `percent` is how
  // far through the loaded time round playing is (-1: at its start).
  function showPracticeStatus(percent) {
    var element = practiceStatusElement();
    if (!element) return;
    if (!class_practice_limit) {
      element.textContent = '';
      element.style.display = 'none';
      return;
    }
    element.style.display = '';
    if (class_practice_finished) {
      element.textContent = 'Done!';
      return;
    }
    if (!root.myGrooveUtils.isPlaying()) {
      element.textContent = 'Timer: ' + practiceLimitLabel(class_practice_limit);
      return;
    }
    var intoMs = 0;
    var intoBars = 0;
    if (percent > 0 && !class_metronome_count_in_is_playing) {
      var roundMs = sumOf(class_round_bar_ms);
      intoMs = Math.min(
        percent * (roundMs + (class_practice_ending ? practiceEndingMs() : 0)),
        roundMs
      );
      var barEnd = 0;
      class_round_bar_ms.forEach(function (ms) {
        barEnd += ms;
        if (barEnd <= intoMs + 1) intoBars++;
      });
    }
    element.textContent = practiceLeftText(class_practice_limit, {
      bars: class_practice_played.bars + intoBars,
      ms: class_practice_played.ms + intoMs,
    });
  }

  /** @param {import('./practiceTimer.js').PracticeLimit | null} limit */
  function setPracticeLimit(limit, fromLink) {
    class_practice_limit = limit;
    class_practice_finished = false;
    addOrRemoveKeywordFromClassById(
      'metronomeOptionsContextMenuPracticeTimer',
      'menuChecked',
      !!limit
    );
    root.metronomeOptionsMenuSetSelectedState();
    root.myGrooveUtils.midiNoteHasChanged(); // the next time round may be the last
    showPracticeStatus(-1);
    if (!fromLink) root.updateCurrentURL(); // the timer is part of the link
  }

  function practiceTimerUnit() {
    var bars = /** @type {HTMLInputElement | null} */ (
      document.getElementById('practiceTimerUnitBars')
    );
    return bars && bars.checked ? 'bars' : 'minutes';
  }

  function practiceTimerAmountInput() {
    return /** @type {HTMLInputElement | null} */ (document.getElementById('practiceTimerAmount'));
  }

  function showPracticeTimerPresets() {
    var unit = practiceTimerUnit();
    var presets = document.getElementById('practiceTimerPresets');
    if (presets)
      presets.innerHTML = PRACTICE_PRESETS[unit]
        .map(function (amount) {
          return (
            '<button onclick="myGrooveWriter.practiceTimerPreset(' +
            amount +
            ');">' +
            amount +
            '</button>'
          );
        })
        .join(' ');
    var label = document.getElementById('practiceTimerUnitLabel');
    if (label) label.textContent = unit;
  }

  root.show_PracticeTimerConfiguration = function () {
    var limit = class_practice_limit || { unit: 'minutes', amount: 5 };
    var unitInput = /** @type {HTMLInputElement | null} */ (
      document.getElementById(
        limit.unit == 'bars' ? 'practiceTimerUnitBars' : 'practiceTimerUnitMinutes'
      )
    );
    if (unitInput) unitInput.checked = true;
    var amount = practiceTimerAmountInput();
    if (amount) amount.value = String(limit.amount);
    showPracticeTimerPresets();
    var popup = document.getElementById('practiceTimerConfiguration');
    if (popup) popup.style.display = 'block';
  };

  // minutes <-> bars: a sensible amount for the new unit
  root.practiceTimerUnitChange = function () {
    var amount = practiceTimerAmountInput();
    if (amount) amount.value = practiceTimerUnit() == 'bars' ? '16' : '5';
    showPracticeTimerPresets();
  };

  root.practiceTimerPreset = function (value) {
    var amount = practiceTimerAmountInput();
    if (amount) amount.value = String(value);
  };

  // 'ok' sets the timer, anything else turns it off
  root.close_PracticeTimerConfiguration = function (action) {
    var limit = null;
    if (action == 'ok') {
      var amount = practiceTimerAmountInput();
      limit = parsePracticeLimit(
        parseInt(amount ? amount.value : '', 10) + (practiceTimerUnit() == 'bars' ? 'b' : 'm')
      );
    }
    setPracticeLimit(limit, false);
    var popup = document.getElementById('practiceTimerConfiguration');
    if (popup) popup.style.display = 'none';
  };

  // --- Counting over the notes (Infinity Drumming, 2026) ---
  // choice: 'off', or a count mode (see countModes.js)
  function setCounting(choice) {
    var on = COUNT_MODES.indexOf(choice) >= 0;
    root.myGrooveUtils.showCounts = on;
    root.myGrooveUtils.countMode = on ? choice : 'all';
    var select = /** @type {HTMLSelectElement | null} */ (document.getElementById('countSelect'));
    if (select) select.value = on ? choice : 'off';
  }

  // the Count menu: "1 e & a" over the notes in the sheet music (and how), or not
  root.setCountChoice = function (choice) {
    setCounting(choice);
    updateSheetMusic();
    root.updateCurrentURL(); // counting is part of the link
  };

  // the click changed: the click's count follows it
  function clickChangedForCount() {
    if (root.myGrooveUtils.showCounts && root.myGrooveUtils.countMode == 'click')
      updateSheetMusic();
  }

  // --- Groove details in the header (Infinity Drumming, 2026) ---
  // The title, "by" the author and the comment, shown in the header; the pencil
  // opens the fields to change them.
  function inputValue(id) {
    var input = /** @type {HTMLInputElement | null} */ (document.getElementById(id));
    return input ? input.value.trim() : '';
  }

  function refreshHeaderTitle() {
    var title = document.getElementById('headerTitleText');
    var sub = document.getElementById('headerTitleSub');
    if (!title || !sub) return;
    title.textContent = inputValue('tuneTitle') || 'Untitled groove';
    var author = inputValue('tuneAuthor');
    sub.textContent = [author ? 'by ' + author : '', inputValue('tuneComments')]
      .filter(Boolean)
      .join(' · ');
  }

  root.showGrooveDetails = function () {
    var popup = document.getElementById('grooveDetailsPopup');
    if (popup) popup.style.display = 'block';
    var title = document.getElementById('tuneTitle');
    if (title) title.focus();
  };

  root.close_GrooveDetails = function () {
    var popup = document.getElementById('grooveDetailsPopup');
    if (popup) popup.style.display = 'none';
    root.refresh_ABC();
  };

  // the speed-up counts bars, not minutes
  function speedUpCountsBars() {
    var bars = /** @type {HTMLInputElement | null} */ (
      document.getElementById('metronomeAutoSpeedupUnitBars')
    );
    return !!(bars && bars.checked);
  }

  // the speed-up's bars box: any whole number of bars, 1 to 999 (16 if it's empty)
  function speedUpEveryBars() {
    var input = /** @type {HTMLInputElement | null} */ (
      document.getElementById('metronomeAutoSpeedupTempoIncreaseBars')
    );
    var bars = parseInt(input ? input.value : '', 10);
    if (isNaN(bars)) return 16;
    return Math.min(Math.max(bars, 1), MAX_SPEED_UP_BARS);
  }

  // Speed up every so many bars: called after each time round
  function speedUpAfterBars(amount, keepIncreasing, targetTempo) {
    if (class_metronome_count_in_is_playing) return; // the count-in doesn't count
    var every = speedUpEveryBars();
    class_speed_up_bars.played += class_round_bar_ms.length;
    var steps = speedUpStepsDue(class_speed_up_bars.played, class_speed_up_bars.steps, every);
    if (!keepIncreasing) steps = Math.min(steps, 1 - class_speed_up_bars.steps); // just once
    if (steps <= 0) return;
    class_speed_up_bars.steps += steps;
    var tempo = root.myGrooveUtils.getTempo();
    var newTempo = tempo + steps * amount;
    if (targetTempo) newTempo = Math.min(newTempo, Math.max(targetTempo, tempo)); // never past it
    if (newTempo > tempo) root.myGrooveUtils.setTempo(newTempo);
  }

  // minutes <-> bars in the speed-up settings
  root.speedUpUnitChange = function () {
    var bars = speedUpCountsBars();
    [
      ['metronomeAutoSpeedupMinutesText', !bars],
      ['metronomeAutoSpeedupConfigurationIntervalLable', !bars],
      ['metronomeAutoSpeedupTempoIncreaseInterval', !bars],
      ['metronomeAutoSpeedupBarsText', bars],
      ['metronomeAutoSpeedupConfigurationBarsLable', bars],
      ['metronomeAutoSpeedupTempoIncreaseBars', bars],
    ].forEach(function (shown) {
      var element = document.getElementById(String(shown[0]));
      if (element) element.style.display = shown[1] ? '' : 'none';
    });
  };

  // the speed-up's "Stop at" tempo, or 0 when that box isn't ticked
  function getAutoSpeedUpTargetTempo() {
    var useTarget = /** @type {HTMLInputElement | null} */ (
      document.getElementById('metronomeAutoSpeedUpUseTarget')
    );
    var target = /** @type {HTMLInputElement | null} */ (
      document.getElementById('metronomeAutoSpeedUpTargetTempo')
    );
    if (!useTarget || !useTarget.checked || !target) return 0;
    var tempo = parseInt(target.value, 10);
    return isNaN(tempo) ? 0 : tempo;
  }

  // takes a string of notes encoded in a serialized string and sets the notes on or off
  // uses drum tab format adapted from wikipedia: http://en.wikipedia.org/wiki/Drum_tablature
  //
  //
  //  HiHat support:
  //      x: normal
  //      X: accent
  //      o: open
  //		+: close
  //      c: crash
  //      r: ride
  //      b: ride bell
  //      m: cow bell (more)
  //      s: stacker
  //      -: off
  //
  //   Snare support:
  //      o: normal
  //      O: accent
  //      f: flam
  //      d: drag
  //      g: ghost
  //      x: cross stick
  //      -: off
  //
  //   Kick support:
  //      o: normal
  //      x: hi hat splash with foot
  //      X: kick & hi hat splash with foot simultaneously
  //
  //  Note that "|" and " " will be skipped so that standard drum tabs can be applied
  //  Example:
  //     H=|x---x---x---x---|x---x---x---x---|x---x---x---x---|
  // or  H=x-x-x-x-x-x-x-x-x-x-x-x-
  //     S=|----o-------o---|----o-------o---|----o-------o---|
  // or  S=--o---o---o---o---o---o-
  //     B=|o-------o-------|o-------o-o-----|o-----o-o-------|
  // or  B=o---o---o----oo-o--oo---|
  //
  function setNotesFromURLData(drumType, noteString, numberOfMeasures) {
    var setFunction;

    if (drumType == 'Stickings') {
      setFunction = set_sticking_state;
    } else if (drumType == 'H') {
      setFunction = set_hh_state;
    } else if (drumType == 'T1') {
      setFunction = set_tom1_state;
    } else if (drumType == 'T2') {
      setFunction = set_tom2_state;
    } else if (drumType == 'T4') {
      setFunction = set_tom4_state;
    } else if (drumType == 'S') {
      setFunction = set_snare_state;
    } else if (drumType == 'K') {
      setFunction = set_kick_state;
    } else if (drumType == 'C') {
      setFunction = set_crash_state;
    } else if (drumType == 'R') {
      setFunction = set_ride_state;
    }
    // the crash (C) and ride (R) lines have their own small tab alphabets
    var cymbalModes =
      drumType == 'C'
        ? { c: 'crash', C: 'crash2', s: 'splash' }
        : { r: 'ride', R: 'ride_accent', b: 'ride_bell', m: 'cow_bell', s: 'stacker' };
    var isCymbalLine = drumType == 'C' || drumType == 'R';

    // decode the %7C url encoding types
    noteString = decodeURIComponent(noteString);

    // ignore ":" and "|" by removing them
    var notes = noteString.replace(/:|\|/g, '');

    // multiple measures of "how_many_notes"
    var notesOnScreen = class_notes_per_measure * numberOfMeasures;

    var noteStringScaler = 1;
    var displayScaler = 1;
    if (notes.length > notesOnScreen && notes.length / notesOnScreen >= 2) {
      // if we encounter a 16th note groove for an 8th note board, let's scale it	down
      noteStringScaler = Math.ceil(notes.length / notesOnScreen);
    } else if (notes.length < notesOnScreen && notesOnScreen / notes.length >= 2) {
      // if we encounter a 8th note groove for an 16th note board, let's scale it up
      displayScaler = Math.ceil(notesOnScreen / notes.length);
    }

    //  DisplayIndex is the index into the notes on the HTML page  starts at 1/32\n%%flatbeams
    var displayIndex = 0;
    var topDisplay = class_notes_per_measure * class_number_of_measures;
    for (
      var i = 0;
      i < notes.length && displayIndex < topDisplay;
      i += noteStringScaler, displayIndex += displayScaler
    ) {
      if (isCymbalLine) {
        setFunction(displayIndex, cymbalModes[notes[i]] || 'off', false);
        continue;
      }
      switch (notes[i]) {
        case '$':
          setFunction(displayIndex, 'and', false);
          break;
        case '1':
          setFunction(displayIndex, '1', false);
          break;
        case 'a':
          setFunction(displayIndex, 'a', false);
          break;
        case 'B':
          if (drumType == 'Stickings') setFunction(displayIndex, 'both', false);
          break;
        case 'b':
          if (drumType == 'H') setFunction(displayIndex, 'ride_bell', false);
          else if (drumType == 'S') setFunction(displayIndex, 'buzz', false);
          break;
        case 'c':
          if (drumType == 'Stickings') setFunction(displayIndex, 'count', false);
          else setFunction(displayIndex, 'crash', false);
          break;
        case 'e':
          setFunction(displayIndex, 'e', false);
          break;
        case 'g':
          setFunction(displayIndex, 'ghost', false);
          break;
        case 'f':
          setFunction(displayIndex, 'flam', false);
          break;
        case 'd':
          setFunction(displayIndex, 'drag', false);
          break;
        case 'l':
        case 'L':
          if (drumType == 'Stickings') setFunction(displayIndex, 'left', false);
          break;
        case 'm':
          if (drumType == 'H') setFunction(displayIndex, 'cow_bell', false);
          break;
        case 'n':
          if (drumType == 'H') setFunction(displayIndex, 'metronome_normal', false);
          break;
        case 'N':
          if (drumType == 'H') setFunction(displayIndex, 'metronome_accent', false);
          break;
        case 'O':
          setFunction(displayIndex, 'accent', false);
          break;
        case 'o':
          if (drumType == 'H') setFunction(displayIndex, 'open', false);
          else setFunction(displayIndex, 'normal', false);
          break;
        case 'r':
        case 'R':
          if (drumType == 'H') setFunction(displayIndex, 'ride', false);
          else if (drumType == 'Stickings') setFunction(displayIndex, 'right', false);
          break;
        case 's':
          setFunction(displayIndex, 'stacker', false);
          break;
        case 'x':
          if (drumType == 'S') setFunction(displayIndex, 'xstick', false);
          else if (drumType == 'K') setFunction(displayIndex, 'splash', false);
          else setFunction(displayIndex, 'normal', false);
          break;
        case 'X':
          if (drumType == 'K') setFunction(displayIndex, 'kick_and_splash', false);
          else setFunction(displayIndex, 'accent', false);
          break;
        case '+':
          setFunction(displayIndex, 'close', false);
          break;
        case '-':
          setFunction(displayIndex, 'off', false);
          break;
        default:
          console.log('Bad note in setNotesFromURLData: ' + notes[i]);
          break;
      }
    }
  }

  function setNotesFromABCArray(drumType, abcArray, numberOfMeasures) {
    var setFunction;

    // multiple measures of "how_many_notes"
    var notesOnScreen = class_notes_per_measure * numberOfMeasures;

    var noteStringScaler = 1;
    var displayScaler = 1;
    if (abcArray.length > notesOnScreen && abcArray.length / notesOnScreen >= 2) {
      // if we encounter a 16th note groove for an 8th note board, let's scale it	down
      noteStringScaler = Math.ceil(abcArray.length / notesOnScreen);
    } else if (abcArray.length < notesOnScreen && notesOnScreen / abcArray.length >= 2) {
      // if we encounter a 8th note groove for an 16th note board, let's scale it up
      displayScaler = Math.ceil(notesOnScreen / abcArray.length);
    }

    if (drumType == 'Stickings') {
      setFunction = set_sticking_state;
    } else if (drumType == 'H') {
      setFunction = set_hh_state;
    } else if (drumType == 'T1') {
      setFunction = set_tom1_state;
    } else if (drumType == 'T2') {
      setFunction = set_tom2_state;
    } else if (drumType == 'T4') {
      setFunction = set_tom4_state;
    } else if (drumType == 'S') {
      setFunction = set_snare_state;
    } else if (drumType == 'K') {
      setFunction = set_kick_state;
    } else if (drumType == 'C') {
      setFunction = set_crash_state;
    } else if (drumType == 'R') {
      setFunction = set_ride_state;
    }

    //  DisplayIndex is the index into the notes on the HTML page  starts at 1/32\n%%flatbeams
    var displayIndex = 0;
    var topDisplay = class_notes_per_measure * class_number_of_measures;
    for (
      var i = 0;
      i < abcArray.length && displayIndex < topDisplay;
      i += noteStringScaler, displayIndex += displayScaler
    ) {
      // the note itself (its flam / drag / ruff and diddle are put on below)
      switch (withoutDiddle(withoutGrace(abcArray[i]))) {
        case constant_ABC_CR_Crash2:
          setFunction(displayIndex, 'crash2', false);
          break;
        case constant_ABC_RD_Accent:
          setFunction(displayIndex, 'ride_accent', false);
          break;
        case constant_ABC_T1_Ghost:
        case constant_ABC_T2_Ghost:
        case constant_ABC_T4_Ghost:
          setFunction(displayIndex, 'ghost', false);
          break;
        case constant_ABC_T1_Accent:
        case constant_ABC_T2_Accent:
        case constant_ABC_T4_Accent:
          setFunction(displayIndex, 'accent', false);
          break;
        case constant_ABC_T1_Rim:
        case constant_ABC_T2_Rim:
        case constant_ABC_T4_Rim:
          setFunction(displayIndex, 'rim', false);
          break;
        case constant_ABC_CR_Splash:
          setFunction(displayIndex, 'splash', false);
          break;
        case constant_ABC_STICK_R:
          setFunction(displayIndex, 'right', false);
          break;
        case constant_ABC_STICK_L:
          setFunction(displayIndex, 'left', false);
          break;
        case constant_ABC_STICK_BOTH:
          setFunction(displayIndex, 'both', false);
          break;
        case constant_ABC_STICK_COUNT:
          setFunction(displayIndex, 'count', false);
          break;
        case constant_ABC_STICK_OFF:
          setFunction(displayIndex, 'off', false);
          break;
        case constant_ABC_HH_Ride:
          setFunction(displayIndex, 'ride', false);
          break;
        case constant_ABC_HH_Ride_Bell:
          setFunction(displayIndex, 'ride_bell', false);
          break;
        case constant_ABC_HH_Cow_Bell:
          setFunction(displayIndex, 'cow_bell', false);
          break;
        case constant_ABC_HH_Crash:
          setFunction(displayIndex, 'crash', false);
          break;
        case constant_ABC_HH_Stacker:
          setFunction(displayIndex, 'stacker', false);
          break;
        case constant_ABC_HH_Metronome_Normal:
          setFunction(displayIndex, 'metronome_normal', false);
          break;
        case constant_ABC_HH_Metronome_Accent:
          setFunction(displayIndex, 'metronome_accent', false);
          break;
        case constant_ABC_HH_Open:
          setFunction(displayIndex, 'open', false);
          break;
        case constant_ABC_HH_Close:
          setFunction(displayIndex, 'close', false);
          break;
        case constant_ABC_HH_Accent:
          setFunction(displayIndex, 'accent', false);
          break;
        case constant_ABC_HH_Normal:
          setFunction(displayIndex, 'normal', false);
          break;
        case constant_ABC_T1_Normal:
          setFunction(displayIndex, 'normal', false);
          break;
        case constant_ABC_T2_Normal:
          setFunction(displayIndex, 'normal', false);
          break;
        case constant_ABC_T4_Normal:
          setFunction(displayIndex, 'normal', false);
          break;
        case constant_ABC_SN_Ghost:
          setFunction(displayIndex, 'ghost', false);
          break;
        case constant_ABC_SN_Accent:
          setFunction(displayIndex, 'accent', false);
          break;
        case constant_ABC_SN_Normal:
          setFunction(displayIndex, 'normal', false);
          break;
        case constant_ABC_SN_Flam:
          setFunction(displayIndex, 'flam', false);
          break;
        case constant_ABC_SN_Drag:
          setFunction(displayIndex, 'drag', false);
          break;
        case constant_ABC_SN_XStick:
          setFunction(displayIndex, 'xstick', false);
          break;
        case constant_ABC_SN_Buzz:
          setFunction(displayIndex, 'buzz', false);
          break;
        case constant_ABC_KI_SandK:
          setFunction(displayIndex, 'kick_and_splash', false);
          break;
        case constant_ABC_KI_Splash:
          setFunction(displayIndex, 'splash', false);
          break;
        case constant_ABC_KI_Normal:
          setFunction(displayIndex, 'normal', false);
          break;
        case false:
          setFunction(displayIndex, 'off', false);
          break;
        default:
          console.log('Bad note in setNotesFromABCArray: ' + abcArray[i]);
          break;
      }
      setOrnamentFromToken(drumType, displayIndex, abcArray[i]);
    }
  }

  // Put a note's flam / drag / ruff on the grid.  An older groove's crash or ride in
  // the hi-hat line has moved onto its own line, so its ornament goes with it.
  function setOrnamentFromToken(drumType, id, token) {
    var line = drumType;
    if (line == 'H' && token && !is_hh_on(id)) {
      if (get_ride_state(id, 'ABC')) line = 'R';
      else if (get_crash_state(id, 'ABC')) line = 'C';
    }
    if (!_grid.ORNAMENT_CELL_PREFIX[line]) return;
    set_ornament(line, id, ornamentChar(ornamentFromToken(token)));
    set_diddle(line, id, hasDiddle(token));
  }

  // get a really long URL that encodes all of the notes and the rest of the state of the page.
  // this will allow us to bookmark or reference a groove and handle undo/redo.
  //
  // includePractice false: without the practice settings (Save & Share's box)
  function get_FullURLForPage(url_destination, includePractice) {
    var myGrooveData = root.grooveDataFromClickableUI();
    if (includePractice === false) myGrooveData.includePractice = false;
    return root.myGrooveUtils.getUrlStringFromGrooveData(myGrooveData, url_destination);
  }

  // --- "Groove / click bars" metronome option --------------------------------
  // --- "Cursor timing": line the playback cursor up with the sound -----------
  function cursorTimingSlider() {
    return /** @type {HTMLInputElement} */ (document.getElementById('cursorTimingAdjust'));
  }

  function showCursorTiming() {
    var gu = root.myGrooveUtils;
    var adjust = gu.getCursorAdjustMs();
    var reported = gu.getReportedAudioLatencyMs();
    var sign = adjust > 0 ? '+' : '';
    var reportedText = reported ? ' (plus ' + reported + ' ms this device reports)' : '';
    document.getElementById('cursorTimingOutput').innerHTML =
      'Adjustment ' +
      sign +
      adjust +
      ' ms' +
      reportedText +
      ': the cursor waits ' +
      gu.getCursorDelayMs() +
      ' ms after each note is sent.';
  }

  root.show_CursorTimingConfiguration = function () {
    cursorTimingSlider().value = String(root.myGrooveUtils.getCursorAdjustMs());
    showCursorTiming();
    document.getElementById('cursorTimingConfiguration').style.display = 'block';
  };

  root.cursorTimingChange = function (event) {
    var ms = parseInt(event.target.value, 10);
    root.myGrooveUtils.setCursorAdjustMs(isNaN(ms) ? 0 : ms);
    showCursorTiming();
  };

  root.cursorTimingReset = function () {
    root.myGrooveUtils.setCursorAdjustMs(0);
    cursorTimingSlider().value = '0';
    showCursorTiming();
  };

  root.close_CursorTimingConfiguration = function () {
    document.getElementById('cursorTimingConfiguration').style.display = 'none';
  };

  // --- "Flams, drags & ruffs": grace-note spacing and volume, for practice -------
  // Saved in the groove's link (only when changed), so a teacher can send a
  // slowed-down version.
  function showGraceNoteSettings() {
    var gu = root.myGrooveUtils;
    var spacing = gu.graceSpacingMs;
    var feel = 'wide open, for practice';
    if (spacing <= 35) feel = 'tight, as played';
    else if (spacing <= 70) feel = 'relaxed';
    var spacingSlider = /** @type {HTMLInputElement} */ (
      document.getElementById('graceNoteSpacing')
    );
    var volumeSlider = /** @type {HTMLInputElement} */ (document.getElementById('graceNoteVolume'));
    spacingSlider.value = String(spacing);
    volumeSlider.value = String(gu.graceVolume);
    document.getElementById('graceNoteSpacingOutput').innerHTML =
      'Flams ' +
      spacing +
      ' ms, drags and ruffs ' +
      Math.round(spacing * DRAG_SPACING_FACTOR) +
      ' ms between notes (' +
      feel +
      ')';
    document.getElementById('graceNoteVolumeOutput').innerHTML =
      gu.graceVolume + '% of a normal hit';
  }

  root.show_GraceNoteConfiguration = function () {
    showGraceNoteSettings();
    document.getElementById('graceNoteConfiguration').style.display = 'block';
  };

  root.graceSpacingChange = function (event) {
    root.myGrooveUtils.setGraceSpacingMs(clampGraceSpacing(event.target.value));
    showGraceNoteSettings();
    root.updateCurrentURL();
  };

  root.graceVolumeChange = function (event) {
    root.myGrooveUtils.setGraceVolume(clampGraceVolume(event.target.value));
    showGraceNoteSettings();
    root.updateCurrentURL();
  };

  root.graceNotesReset = function () {
    root.myGrooveUtils.setGraceSpacingMs(DEFAULT_GRACE_SPACING_MS);
    root.myGrooveUtils.setGraceVolume(DEFAULT_GRACE_VOLUME);
    showGraceNoteSettings();
    root.updateCurrentURL();
  };

  root.close_GraceNoteConfiguration = function () {
    document.getElementById('graceNoteConfiguration').style.display = 'none';
  };

  root.show_GrooveClickConfiguration = function () {
    document.getElementById('grooveClickGrooveBars').value = class_groove_click_groove_bars;
    document.getElementById('grooveClickClickBars').value = class_groove_click_click_bars;
    document.getElementById('grooveClickConfiguration').style.display = 'block';
  };

  // The numbers take effect as they are typed (so pressing Play with the popup
  // still open, as is easy to do on a phone, plays the new numbers), and again
  // on Done.
  root.grooveClickBarsChanged = function () {
    var readBars = function (id, fallback) {
      var bars = parseInt(document.getElementById(id).value, 10);
      if (isNaN(bars)) return fallback;
      return Math.min(Math.max(bars, 1), 32);
    };
    var grooveBars = readBars('grooveClickGrooveBars', class_groove_click_groove_bars);
    var clickBars = readBars('grooveClickClickBars', class_groove_click_click_bars);
    if (
      grooveBars === class_groove_click_groove_bars &&
      clickBars === class_groove_click_click_bars
    )
      return;
    class_groove_click_groove_bars = grooveBars;
    class_groove_click_click_bars = clickBars;
    resetGrooveClickPhase();
    root.myGrooveUtils.midiNoteHasChanged(); // start over with the new numbers
    root.updateCurrentURL(); // the option and its numbers are part of the link
  };

  root.close_GrooveClickConfiguration = function () {
    root.grooveClickBarsChanged();
    document.getElementById('grooveClickConfiguration').style.display = 'none';
  };

  // Turn the option on or off from a link (grooveBars 0 = off), without the popup.
  function setGrooveClickFromLink(grooveBars, clickBars) {
    class_groove_click_active = grooveBars > 0;
    if (class_groove_click_active) {
      class_groove_click_groove_bars = grooveBars;
      class_groove_click_click_bars = clickBars;
    }
    addOrRemoveKeywordFromClassById(
      'metronomeOptionsContextMenuGrooveClick',
      'menuChecked',
      class_groove_click_active
    );
    resetGrooveClickPhase();
    root.metronomeOptionsMenuSetSelectedState();
  }

  function resetGrooveClickPhase() {
    class_groove_click_cycle_start_bar = 0;
    class_groove_click_playing_start_bar = 0;
  }

  // --- Practising some bars of a groove (Infinity Drumming, 2026) -------------
  // "Practise bars" in the play bar: only those bars play, round and round, and
  // the music shows just them (with their numbers; the grid dims the others). In
  // the link as PlayBars=1-2. With a permutation the same box is for the bars of
  // its run (PermBars=).
  var class_practise_bars = ''; // as typed ("1-2, 5"); '' for all
  var class_practise_bars_timer = null;

  // the bars the box names (1-based, in order), of the bars there are
  function chosenPractiseBars() {
    if (class_permutation_type != 'none') return [];
    return _perm.parseBarList(withSectionBars(class_practise_bars), class_number_of_measures);
  }

  // the box's sections ("B") as their bars ("3,4"), so "B" practises section B
  function withSectionBars(text) {
    return String(text || '').replace(/[A-Fa-f]/g, function (letter) {
      var bars = barsOfSection(class_bar_sections, letter.toUpperCase(), class_number_of_measures);
      return (
        ',' +
        bars
          .map(function (bar) {
            return bar + 1;
          })
          .join(',') +
        ','
      );
    });
  }

  // What's typed in the box, tidied: the sections it names that there are, then
  // its bars ("B, 1-3, 6")
  function tidyPractiseBars(text) {
    var letters = [];
    String(text || '').replace(/[A-Fa-f]/g, function (letter) {
      letter = letter.toUpperCase();
      if (letters.indexOf(letter) < 0 && class_bar_sections.indexOf(letter) >= 0)
        letters.push(letter);
      return '';
    });
    var numbers = String(text || '').replace(/[A-Fa-f]/g, ' ');
    var bars = _perm.barListToText(_perm.parseBarList(numbers, class_number_of_measures));
    return letters.concat(bars ? [bars] : []).join(', ');
  }

  // The groove's bars in the order they play (0-based): those practised, or the
  // sections each as many times as it says; [] when that's every bar once, in order
  function playedBars() {
    var practised = practisedBars();
    if (practised.length || class_permutation_type != 'none') return practised;
    var form = formBars(class_bar_sections, class_section_repeats, class_number_of_measures);
    var inOrder =
      form.length == class_number_of_measures &&
      form.every(function (bar, i) {
        return bar == i;
      });
    return inOrder ? [] : form;
  }

  // the groove's bars that are practised (0-based), [] for all of them
  function practisedBars() {
    var chosen = chosenPractiseBars();
    if (chosen.length >= class_number_of_measures) return [];
    return chosen.map(function (bar) {
      return bar - 1;
    });
  }

  function practiseBarsText() {
    return class_permutation_type == 'none' ? tidyPractiseBars(class_practise_bars) : '';
  }

  function setPractiseBars(text) {
    var bars = tidyPractiseBars(text);
    if (bars != class_practise_bars) {
      class_practise_bars = bars;
      resetGrooveClickPhase();
      // the music shows just them, the next time round plays them, the link has them
      root.refresh_ABC();
    }
    return bars;
  }

  // A position in the whole groove (0..1) as one in the music of the bars being
  // practised, which shows only them
  function practisedMusicPercent(groovePercent) {
    var practised = practisedBars();
    var where = positionInBars(groovePercent, allBars());
    var shown = practised.indexOf(where.index);
    if (shown < 0) return -1;
    var lengths = practised.map(barLengthInBeats);
    return (sumOf(lengths.slice(0, shown)) + where.fraction * lengths[shown]) / sumOf(lengths);
  }

  // The play bar's box is for a permutation's run when one is on (its own bars),
  // else the groove's
  function setBoxBars(text) {
    return class_permutation_type == 'none' ? setPractiseBars(text) : setPermutationBars(text);
  }

  // the box follows what's typed once typing pauses, and is tidied up ("1-3, 6")
  // on Enter or leaving it
  root.practiseBarsInput = function (event) {
    var box = event.target;
    if (class_practise_bars_timer) clearTimeout(class_practise_bars_timer);
    class_practise_bars_timer = setTimeout(function () {
      class_practise_bars_timer = null;
      setBoxBars(box.value);
    }, 300);
  };

  root.practiseBarsChange = function (event) {
    if (class_practise_bars_timer) clearTimeout(class_practise_bars_timer);
    class_practise_bars_timer = null;
    event.target.value = setBoxBars(event.target.value);
  };

  root.practiseBarsKey = function (event) {
    if (event.key == 'Enter') event.target.blur();
  };

  // the box in the play bar (only for a groove of more than one bar)
  function practiseBarsBox() {
    var box = /** @type {HTMLInputElement | null} */ (document.getElementById('practiseBars'));
    if (box) return box;
    var tempo = document.getElementById(
      'tempoAndProgress' + root.myGrooveUtils.grooveUtilsUniqueIndex
    );
    if (!tempo || !tempo.parentNode) return null;
    var option = document.createElement('span');
    option.id = 'practiseBarsOption';
    option.innerHTML = _view.practiseBarsHTML();
    tempo.parentNode.insertBefore(option, tempo);
    return /** @type {HTMLInputElement | null} */ (document.getElementById('practiseBars'));
  }

  // the box and the grid as the bars to practise have them (with a permutation,
  // its run's bars)
  function showPractiseBars() {
    var box = practiseBarsBox();
    var permutation = class_permutation_type != 'none';
    var shown = permutation || class_number_of_measures > 1;
    if (box) {
      /** @type {HTMLElement} */ (box.parentNode).style.display = shown ? '' : 'none';
      if (document.activeElement !== box)
        box.value = permutation ? class_permutation_bars : practiseBarsText();
    }
    var bars = practisedBars();
    for (var bar = 0; bar < class_number_of_measures; bar++) {
      var staff = document.getElementById('staff-container' + (bar + 1));
      if (staff) staff.classList.toggle('notPractised', bars.length > 0 && bars.indexOf(bar) < 0);
    }
  }

  // just the bars to practise (or the sections as they play), in order
  function createPlayedBarsMidiUrl() {
    var midiFile = new Midi.File();
    var midiTrack = newExactTimeTrack();
    midiFile.addTrack(midiTrack);
    midiTrack.setTempo(root.myGrooveUtils.getTempo());
    midiTrack.setInstrument(0, 0x13);
    playedBars().forEach(function (bar) {
      addGrooveBarToMidiTrack(midiTrack, bar, 'our_MIDI');
    });
    return 'data:audio/midi;base64,' + btoa(midiFile.toBytes());
  }

  // The bars the groove / click cycles count through: the groove's bars (those
  // to practise when some are chosen), or with a permutation every bar it plays
  // ("Play each" repeats included).
  function grooveClickSequenceLength() {
    return class_permutation_type == 'none'
      ? playedBars().length || class_number_of_measures
      : get_numberOfPermutationBars();
  }

  // Bar `index` of that sequence: a bar of the groove, or of the permutation's run
  function sequenceBar(index) {
    var bars = playedBars();
    return bars.length ? bars[index] : index;
  }

  // Does bar `bar` of the groove (of the run, with a permutation) play straight?
  // (Permutations: its bar of the ostinato.)
  function isSequenceBarStraight(bar) {
    return !!class_straight_bars[
      class_permutation_type == 'none' ? bar : bar % get_ostinato_bars()
    ];
  }

  // One cycle has played: the next one starts that many groove bars later.
  function advanceGrooveClickCycle() {
    var length = grooveClickSequenceLength();
    if (length < 1) return;
    class_groove_click_cycle_start_bar =
      (class_groove_click_cycle_start_bar +
        class_groove_click_groove_bars +
        class_groove_click_click_bars) %
      length;
    root.myGrooveUtils.midiNoteHasChanged(); // build the next cycle
  }

  // Where playback is in the groove / click cycle, as a fraction of the groove's
  // bars (what playing the plain groove would give). In the click-only bars the
  // cursor carries on through the groove, so players see where they are while
  // they play on without it.
  function grooveClickCycleGroovePercent(percent_complete) {
    var length = grooveClickSequenceLength();
    var cycleBars = class_groove_click_groove_bars + class_groove_click_click_bars;
    if (isMixedMeterGroove() && length > 0) {
      // the cycle's bars (click bars as long as the bars they stand in for)
      var cycle = [];
      for (var c = 0; c < cycleBars; c++)
        cycle.push(sequenceBar((class_groove_click_playing_start_bar + c) % length));
      var where = positionInBars(percent_complete, cycle);
      return groovePercentAt(cycle[where.index], where.fraction);
    }
    var position = percent_complete * cycleBars;
    var barInCycle = Math.min(Math.floor(position), cycleBars - 1);
    if (length < 1) return -1;
    var grooveBar = sequenceBar((class_groove_click_playing_start_bar + barInCycle) % length);
    var bars = class_permutation_type == 'none' ? class_number_of_measures : length;
    return (grooveBar + (position - barInCycle)) / bars;
  }

  // The playback position (a fraction of the MIDI now playing) as a position in the
  // groove for the cursor, or -1 when there is nothing to follow (the count-in).
  function playingPercentToGroovePercent(percent) {
    if (percent < 0) return percent;
    if (class_metronome_count_in_is_playing) return -1;
    if (class_practice_ending) {
      // the practice timer's last time round: its bars, then the closing crash
      var roundMs = sumOf(class_round_bar_ms);
      var at = percent * (roundMs + practiceEndingMs());
      if (at >= roundMs) return -1;
      percent = at / class_round_full_ms;
    }
    percent = snapToSwungGrid(percent);
    if (class_groove_click_active) return grooveClickCycleGroovePercent(percent);
    var played = playedBars();
    if (played.length) {
      var where = positionInBars(percent, played);
      return groovePercentAt(played[where.index], where.fraction);
    }
    return percent;
  }

  // Which bars of the MIDI just built play straight, in playing order.
  function loadedMidiStraightBars() {
    var repeat = function (count, straight) {
      var bars = [];
      for (var bar = 0; bar < count; bar++) bars.push(straight);
      return bars;
    };
    if (class_groove_click_active && grooveClickSequenceLength() > 0) {
      var cycleBars = [];
      var cycleLength = class_groove_click_groove_bars + class_groove_click_click_bars;
      for (var bar = 0; bar < cycleLength; bar++)
        cycleBars.push(
          isSequenceBarStraight(
            sequenceBar((class_groove_click_playing_start_bar + bar) % grooveClickSequenceLength())
          )
        );
      return cycleBars;
    }
    if (playedBars().length) return playedBars().map(isSequenceBarStraight);
    if (class_permutation_type != 'none') {
      var runBars = [];
      for (var b = 0; b < get_numberOfPermutationBars(); b++)
        runBars.push(isSequenceBarStraight(b));
      return runBars;
    }
    return class_straight_bars
      .slice(0, class_number_of_measures)
      .map(Boolean)
      .concat(repeat(Math.max(0, class_number_of_measures - class_straight_bars.length), false));
  }

  // When a 1/32 slot of the MIDI now playing starts, in slots, with Brazilian swing
  // (as midiFile.js spaces it: long-short-short-long; straight bars evenly).
  function brazilianSlotTime(slot, slotsPerBar, swing) {
    var bar = Math.floor(slot / slotsPerBar);
    var time = bar * slotsPerBar;
    if (class_loaded_midi_straight_bars[bar]) return time + (slot % slotsPerBar);
    var slotsPerSwingNote = slotsPerBar / get_num_notes_for_swing();
    for (var i = 0; i < slot % slotsPerBar; i++) {
      var region = Math.floor((i % (4 * slotsPerSwingNote)) / slotsPerSwingNote);
      time += region === 0 || region === 3 ? 1 + swing : 1 - swing;
    }
    return time;
  }

  // With Brazilian swing the "a" of each beat plays early, so its time falls in the
  // "&"'s part of the grid; snap the cursor to the nearest note as it was placed
  // (straight time, regular swing and triplets need no snapping).
  function snapToSwungGrid(percent) {
    var gu = root.myGrooveUtils;
    var swing = gu.getSwing() / 100;
    var bars = class_loaded_midi_straight_bars.length;
    if (
      percent < 0 ||
      !bars ||
      swing <= 0 ||
      gu.getSwingStyle() != 'brazilian' ||
      usingTriplets() ||
      isMixedMeterGroove()
    )
      return percent;
    var slotsPerBar = gu.calc_notes_per_measure(
      32,
      class_num_beats_per_measure,
      class_note_value_per_measure
    );
    var timeOf = function (slot) {
      return brazilianSlotTime(slot, slotsPerBar, swing);
    };
    var total = bars * slotsPerBar;
    var position = percent * total;
    var slot = Math.min(Math.floor(position), total - 1);
    if (slot + 1 < total && timeOf(slot + 1) - position < position - timeOf(slot)) slot++;
    return (slot + 0.5) / total;
  }

  // One groove bar (bar is 0-based) of the clickable grid, played into midiTrack.
  function addGrooveBarToMidiTrack(midiTrack, bar, MIDI_type) {
    var Sticking_Array = get_empty_note_array_in_32nds(bar);
    var HH_Array = get_empty_note_array_in_32nds(bar);
    var Snare_Array = get_empty_note_array_in_32nds(bar);
    var Kick_Array = get_empty_note_array_in_32nds(bar);
    var Toms_Array = get_empty_voice_arrays_in_32nds(bar);
    var num_notes = get32NoteArrayFromClickableUI(
      Sticking_Array,
      HH_Array,
      Snare_Array,
      Kick_Array,
      Toms_Array,
      class_notes_per_measure * bar
    );
    muteArrayFromClickableUI(Sticking_Array, HH_Array, Snare_Array, Kick_Array, Toms_Array, bar);
    root.myGrooveUtils.MIDI_from_HH_Snare_Kick_Arrays(
      midiTrack,
      HH_Array,
      Snare_Array,
      Kick_Array,
      Toms_Array,
      MIDI_type,
      root.getMetronomeFrequency(),
      num_notes,
      get_num_notes_for_swing(bar),
      class_straight_bars[bar] ? 0 : root.myGrooveUtils.getSwing() / 100, // a straight bar plays straight
      barSigOf(bar).top,
      barSigOf(bar).bottom,
      undefined, // the player's swing style
      undefined, // no cursor markers
      slotSpansOfBar(bar, num_notes) // diddles beat by beat
    );
  }

  // One click-only bar: the metronome (the 1/4 click if it is off), swung or
  // straight like the groove bar it stands in for, plus a silent cursor marker on
  // every note of the grid so the cursor carries on through the groove.
  function addClickBarToMidiTrack(midiTrack, straight, bar) {
    var empty = get_empty_note_array_in_32nds(bar); // as long as the bar it stands in for
    var slotsPerNote = empty.length / barCountOf(bar);
    var markers = empty.map(function (unused, slot) {
      return slot % slotsPerNote === 0;
    });
    root.myGrooveUtils.MIDI_from_HH_Snare_Kick_Arrays(
      midiTrack,
      empty,
      empty,
      empty,
      get_empty_voice_arrays_in_32nds(bar),
      'our_MIDI',
      root.getMetronomeFrequency() || 4,
      empty.length,
      get_num_notes_for_swing(bar),
      straight ? 0 : root.myGrooveUtils.getSwing() / 100,
      barSigOf(bar).top,
      barSigOf(bar).bottom,
      undefined, // the player's swing style
      markers
    );
  }

  // Bar `index` of a permutation as it plays (figures in order, each played
  // "Play each" times through the ostinato), built from its bar of the ostinato
  // like the permutation playback.
  function addPermutationBarToMidiTrack(midiTrack, sections, index) {
    var ostinato = get_ostinato_bars();
    var section = sections[Math.floor(index / (get_permutation_repeats() * ostinato))].section;
    var o = readOstinatoBar(index % ostinato, true);
    var bar = get_permutation_bar(section, o.Kick, o.Snare);
    root.myGrooveUtils.MIDI_from_HH_Snare_Kick_Arrays(
      midiTrack,
      o.HH,
      bar.snare,
      bar.kick,
      o.Toms,
      'our_MIDI',
      root.getMetronomeFrequency(),
      o.num_notes,
      permutationSwingNotes(),
      class_straight_bars[index % ostinato] ? 0 : root.myGrooveUtils.getSwing() / 100,
      class_num_beats_per_measure,
      class_note_value_per_measure
    );
  }

  // One cycle of the groove / click option, counted bar by bar: the groove bars
  // (from startBar, wrapping round the groove or permutation), then the
  // click-only bars.
  function createGrooveClickCycleMidiUrl(startBar) {
    var midiFile = new Midi.File();
    var midiTrack = newExactTimeTrack();
    midiFile.addTrack(midiTrack);
    midiTrack.setTempo(root.myGrooveUtils.getTempo());
    midiTrack.setInstrument(0, 0x13);

    class_groove_click_playing_start_bar = startBar;
    var length = grooveClickSequenceLength();
    var sections = class_permutation_type == 'none' ? null : get_shown_permutation_sections();
    for (var grooveBar = 0; grooveBar < class_groove_click_groove_bars; grooveBar++) {
      var bar = sequenceBar((startBar + grooveBar) % length);
      if (sections) addPermutationBarToMidiTrack(midiTrack, sections, bar);
      else addGrooveBarToMidiTrack(midiTrack, bar, 'our_MIDI');
    }
    for (var clickBar = 0; clickBar < class_groove_click_click_bars; clickBar++) {
      var standsFor = sequenceBar((startBar + class_groove_click_groove_bars + clickBar) % length);
      addClickBarToMidiTrack(midiTrack, isSequenceBarStraight(standsFor), sections ? 0 : standsFor);
    }

    // end with the grace notes of the next cycle's first bar (it may not be this one's)
    var ownLeadIn = root.myGrooveUtils.graceLeadIn;
    var nextBar = sequenceBar(
      (startBar + class_groove_click_groove_bars + class_groove_click_click_bars) % length
    );
    var probe = newExactTimeTrack();
    if (sections) addPermutationBarToMidiTrack(probe, sections, nextBar);
    else addGrooveBarToMidiTrack(probe, nextBar, 'our_MIDI');
    root.myGrooveUtils.setTrackLoopLeadIn(midiTrack, root.myGrooveUtils.graceLeadIn);
    root.myGrooveUtils.graceLeadIn = ownLeadIn;

    return 'data:audio/midi;base64,' + btoa(midiFile.toBytes());
  }

  root.show_MetronomeAutoSpeedupConfiguration = function () {
    var popup = document.getElementById('metronomeAutoSpeedupConfiguration');

    if (popup) {
      popup.style.display = 'block';
    }

    root.speedUpUnitChange();
    document.getElementById('metronomeAutoSpeedupTempoIncreaseAmountOutput').innerHTML =
      document.getElementById('metronomeAutoSpeedupTempoIncreaseAmount').value;
    document.getElementById('metronomeAutoSpeedupTempoIncreaseIntervalOutput').innerHTML =
      document.getElementById('metronomeAutoSpeedupTempoIncreaseInterval').value;
  };

  root.close_MetronomeAutoSpeedupConfiguration = function (type) {
    var popup = document.getElementById('metronomeAutoSpeedupConfiguration');

    if (popup) popup.style.display = 'none';
    if (class_metronome_auto_speed_up_active) root.updateCurrentURL(); // part of the link
  };

  root.timeSigPopupOpen = function (type) {
    var popup = document.getElementById('timeSigPopup');
    if (popup && popup.style.display == 'block' && class_time_sig_popup_bar === null) {
      root.timeSigPopupClose('cancel'); // a second tap closes it (Infinity Drumming, 2026)
      return;
    }
    class_time_sig_popup_bar = null; // the whole groove
    setTimeSigPopup(
      isMixedMeterGroove() ? 'Choose a Time Signature for every bar' : 'Choose a Time Signature',
      barSigOf(0)
    );

    if (popup) popup.style.display = 'block';
  };

  // --- A time signature for one bar (Infinity Drumming, 2026) ---------------------
  function setTimeSigPopup(title, sig) {
    var titleElement = document.getElementById('timeSigPopupTitle');
    var top = /** @type {HTMLSelectElement} */ (document.getElementById('timeSigPopupTimeSigTop'));
    var bottom = /** @type {HTMLSelectElement} */ (
      document.getElementById('timeSigPopupTimeSigBottom')
    );
    if (titleElement) titleElement.innerHTML = title;
    if (top) top.value = String(sig.top);
    if (bottom) bottom.value = String(sig.bottom);
  }

  // the time signature button under a bar (barNum starts at 1)
  root.barTimeSigButtonClick = function (barNum) {
    if (class_permutation_type != 'none') {
      window.alert('Turn the alphabet off to give a bar its own time signature.');
      return;
    }
    class_time_sig_popup_bar = barNum - 1;
    setTimeSigPopup('Time signature for bar ' + barNum, barSigOf(barNum - 1));
    var popup = document.getElementById('timeSigPopup');
    if (popup) popup.style.display = 'block';
  };

  // Every bar's notes and ornaments, each with only its own note slots, as tab
  // characters (like the link's), and its time signature.
  var BAR_LINE_READERS = {
    Stickings: function (id) {
      return get_sticking_state(id, 'URL');
    },
    HH: function (id) {
      return get_hh_state(id, 'URL');
    },
    Tom1: function (id) {
      return get_tom_state(id, 1, 'URL');
    },
    Tom2: function (id) {
      return get_tom_state(id, 2, 'URL');
    },
    Tom4: function (id) {
      return get_tom_state(id, 4, 'URL');
    },
    Snare: function (id) {
      return get_snare_state(id, 'URL');
    },
    Kick: function (id) {
      return get_kick_state(id, 'URL');
    },
    Crash: function (id) {
      return get_crash_state(id, 'URL');
    },
    Ride: function (id) {
      return get_ride_state(id, 'URL');
    },
  };
  function readBarRecords() {
    var records = [];
    for (var bar = 0; bar < class_number_of_measures; bar++) {
      var record = {
        sig: barSigOf(bar),
        straight: !!class_straight_bars[bar],
        section: class_bar_sections[bar] || '',
        sectionRepeats: class_section_repeats[bar] || 1,
        lines: {},
        beats: beatsOfBar(bar),
        beatsSig: barSigOf(bar),
      };
      var ornaments = emptyOrnamentLines();
      for (var name in BAR_LINE_READERS) record.lines[name] = '';
      for (var slot = 0; slot < barCountOf(bar); slot++) {
        var id = bar * class_notes_per_measure + slot;
        for (var line in BAR_LINE_READERS) record.lines[line] += BAR_LINE_READERS[line](id);
        addOrnamentChars(ornaments, id);
      }
      record.ornaments = ornaments;
      records.push(record);
    }
    return records;
  }

  // Lay the grid out again from bar records (after a bar's time signature
  // changes, or a bar is added or removed in a groove whose bars differ): each
  // bar keeps its notes from the start, cut off or with rests added to fit.
  // Returns false (and changes nothing) if the note setting doesn't fit a bar.
  function layOutBarRecords(records) {
    for (var r = 0; r < records.length; r++) {
      if (!divisionFitsBar(class_time_division, records[r].sig)) {
        window.alert(
          'The ' +
            (usingTriplets() ? 'triplet ' : '1/' + class_time_division + ' ') +
            'note setting does not fit a ' +
            records[r].sig.top +
            '/' +
            records[r].sig.bottom +
            ' bar. Choose another note setting first (on the left).'
        );
        return false;
      }
    }
    class_number_of_measures = records.length;
    class_num_beats_per_measure = records[0].sig.top;
    class_note_value_per_measure = records[0].sig.bottom;
    class_bar_time_sigs = records.map(function (record) {
      return { top: record.sig.top, bottom: record.sig.bottom };
    });
    if (!isMixedMeterGroove()) class_bar_time_sigs = [];
    class_straight_bars = records.map(function (record) {
      return record.straight;
    });
    class_bar_sections = records.map(function (record) {
      return record.section || '';
    });
    class_section_repeats = records.map(function (record) {
      return record.sectionRepeats || 1;
    });
    // beat by beat: a bar keeps its beats, or in a new time signature gets them
    // from its notes
    if (beatGrid())
      class_beat_notes = records.map(function (record) {
        var kept =
          record.beatsSig &&
          record.beatsSig.top == record.sig.top &&
          record.beatsSig.bottom == record.sig.bottom;
        if (kept && record.beats) return record.beats;
        if (!hasBeatNotes(record.sig)) return '';
        return beatsFromTabLines(record.lines, 0, record.sig);
      });
    var stride = barStrideFor(class_time_division);
    var notes = {};
    for (var name in BAR_LINE_READERS) notes[name] = layOutBarLine(records, stride, 'lines', name);
    var ornaments = emptyOrnamentLines();
    for (var orn in ornaments) ornaments[orn] = layOutBarLine(records, stride, 'ornaments', orn);
    root.expandAuthoringViewWhenNecessary(class_notes_per_measure, class_number_of_measures);
    changeDivisionWithNotes(
      class_time_division,
      notes.Stickings,
      notes.HH,
      notes.Tom1,
      notes.Tom2,
      notes.Tom4,
      notes.Snare,
      notes.Kick,
      notes.Crash,
      notes.Ride,
      ornaments
    );
    refreshStraightBarButtons();
    updateSheetMusic();
    return true;
  }

  // one line of the grid from bar records: each bar's characters cut off or
  // padded with rests to its note count, then to the bar stride
  function layOutBarLine(records, stride, kind, name) {
    var dashes = new Array(stride + 1).join('-');
    var line = '';
    records.forEach(function (record) {
      var count = barNoteCount(class_time_division, record.sig);
      line += ((record[kind][name] + dashes).slice(0, count) + dashes).slice(0, stride);
    });
    return line;
  }

  function setBarTimeSig(bar, sig) {
    var records = readBarRecords();
    records[bar].sig = sig;
    layOutBarRecords(records);
  }

  function setAllBarsTimeSig(sig) {
    var records = readBarRecords();
    records.forEach(function (record) {
      record.sig = sig;
    });
    layOutBarRecords(records);
  }

  // turns on or off triplet 1/4 and 1/8 note selection based on the current time sig setting
  root.setTimeDivisionSelectionOnOrOff = function () {
    if (isMixedMeterGroove()) {
      // bars with their own time signatures: a note setting has to fit every bar
      [8, 16, 32, 12, 24, 48].forEach(function (division) {
        var fits = allBars().every(function (bar) {
          return divisionFitsBar(division, barSigOf(bar));
        });
        addOrRemoveKeywordFromClassById('subdivision_' + division + 'ths', 'disabled', !fits);
      });
      syncToolbarSelects();
      return;
    }
    // a note setting has to give whole notes (no 8ths in 9/16), and triplets fit
    // only x/4 and x/8 time (8th triplets in x/8 only with whole quarter notes, 6/8)
    var sig = { top: class_num_beats_per_measure, bottom: class_note_value_per_measure };
    [8, 16, 32, 12, 24, 48].forEach(function (division) {
      addOrRemoveKeywordFromClassById(
        'subdivision_' + division + 'ths',
        'disabled',
        !divisionFitsBar(division, sig)
      );
    });
    syncToolbarSelects();
  };

  root.setTimeSigLabel = function () {
    // turn on/off special features that are only available in 4/4 time

    // set the label
    document.getElementById('timeSigLabel').innerHTML =
      '<sup>' +
      class_num_beats_per_measure +
      '</sup>/<sub>' +
      class_note_value_per_measure +
      '</sub>';
  };

  root.timeSigPopupClose = function (type, callback) {
    var popup = document.getElementById('timeSigPopup');

    if (popup) popup.style.display = 'none';

    var forBar = class_time_sig_popup_bar;
    class_time_sig_popup_bar = null;
    // ignore type "cancel"
    if (type == 'ok' && (forBar !== null || isMixedMeterGroove())) {
      // one bar's time signature, or every bar of a groove whose bars differ
      var topSelect = /** @type {HTMLSelectElement} */ (
        document.getElementById('timeSigPopupTimeSigTop')
      );
      var bottomSelect = /** @type {HTMLSelectElement} */ (
        document.getElementById('timeSigPopupTimeSigBottom')
      );
      var sig = { top: parseInt(topSelect.value, 10), bottom: parseInt(bottomSelect.value, 10) };
      if (forBar !== null) setBarTimeSig(forBar, sig);
      else setAllBarsTimeSig(sig);
    } else if (type == 'ok') {
      var newTimeSigTop = document.getElementById('timeSigPopupTimeSigTop').value;
      var newTimeSigBottom = document.getElementById('timeSigPopupTimeSigBottom').value;

      if (
        usingTriplets() &&
        !divisionFitsBar(class_time_division, { top: newTimeSigTop, bottom: newTimeSigBottom })
      ) {
        root.changeDivision(16); // switch to a non triplet division since they are not supported in this time signature
      }

      class_num_beats_per_measure = newTimeSigTop;
      class_note_value_per_measure = newTimeSigBottom;
      var new_notes_per_measure = root.myGrooveUtils.calc_notes_per_measure(
        class_time_division,
        class_num_beats_per_measure,
        class_note_value_per_measure
      );
      // If new_notes_per_measure is greater it will cause the changeDivision code to error
      // as it tries to read the notes from the UI.   Setting it lower will allow the code to truncate
      // the groove properly to something smaller rather than interpolating the groove into something weird
      if (new_notes_per_measure < class_notes_per_measure)
        class_notes_per_measure = new_notes_per_measure;
      root.changeDivision(class_time_division); // use this function because it will relayout everything
    }
    if (callback) {
      callback();
    }
  };

  root.updateRangeLabel = function (event, idToUpdate) {
    var element = document.getElementById(idToUpdate);

    if (element) {
      element.innerHTML = event.currentTarget.value;
    }
  };

  root.fillInFullURLInFullURLPopup = function () {
    document.getElementById('embedCodeCheckbox').checked = false; // uncheck embedCodeCheckbox
    document.getElementById('shortenerCheckbox').checked = false; // uncheck shortenerCheckbox

    var popup = document.getElementById('fullURLPopup');
    if (popup) {
      var fullURL = shareURL();
      var textField = document.getElementById('fullURLPopupTextField');
      textField.value = fullURL;

      popup.style.display = 'block';

      // select the URL for copy/paste
      textField.focus();
      textField.select();
    }
  };

  root.show_FullURLPopup = function () {
    var openPopup = document.getElementById('fullURLPopup');
    if (openPopup && openPopup.style.display == 'block') {
      root.close_FullURLPopup(); // a second tap on Save & Share closes it (Infinity Drumming, 2026)
      return;
    }

    new ShareButton({
      ui: {
        flyout: 'bottom center', // change the flyout direction of the shares. chose from `top left`, `top center`, `top right`, `bottom left`, `bottom right`, `bottom center`, `middle left`, or `middle right` [Default: `top center`]
        button_font: false, // include the Lato font set from the Google Fonts API. [Default: `true`]
        buttonText: 'SHARE', // change the text of the button, [Default: `Share`]
        icon_font: false, // include the minified Entypo font set. [Default: `true`]
      },
      networks: {
        facebook: {
          before: function () {
            this.url = document.getElementById('fullURLPopupTextField').value;
            this.description = 'Check out this groove.';
          },
          //app_id : "839699029418014"    // staging id
          // app_id : "1499163983742002"   // MLDC id, lou created
          appId: '445510575651140', // MLDC id, brad created
          loadSdk: true,
        },
        googlePlus: {
          enabled: false,
        },
        twitter: {
          before: function () {
            this.url = encodeURIComponent(document.getElementById('fullURLPopupTextField').value);
            this.description =
              'Check out this groove:  ' + document.getElementById('fullURLPopupTextField').value;
          },
        },
        reddit: {
          before: function () {
            this.url = document.getElementById('fullURLPopupTextField').value;
            this.title =
              'Check out this groove: ' + document.getElementById('fullURLPopupTextField').value;
          },
        },
        email: {
          before: function () {
            this.url = document.getElementById('fullURLPopupTextField').value;
            this.description =
              'Check out this groove. %0A%0A ' +
              encodeURIComponent(document.getElementById('fullURLPopupTextField').value);
          },
        },
        pinterest: {
          enabled: false,
        },
        linkedin: {
          enabled: false,
        },
        whatsapp: {
          enabled: false,
        },
      },
    });

    // open the popup with full url and try to load short in the background
    root.fillInFullURLInFullURLPopup();
    // default is to use shortened url
    fillInShortenedURLInFullURLPopup(shareURL(), 'fullURLPopupTextField');
  };

  root.copyShareURLToClipboard = function () {
    var copyText = document.getElementById('fullURLPopupTextField');

    copyText.select();
    // hack fix for mobile
    copyText.setSelectionRange(0, 99999);

    document.execCommand('copy');
    showButtonDone('fullURLPopupCopyButton', '<i class="fa fa-check"></i> Copied');
  };

  // --- Save & Share: My Grooves and sending the link (Infinity Drumming, 2026) ---
  function deviceStorage() {
    try {
      return window.localStorage;
    } catch (err) {
      console.warn('This browser blocks storage, so My Grooves stays empty:', err);
      return null;
    }
  }

  // a button says it's done ("Copied", "Saved") for a moment
  function showButtonDone(id, html) {
    var button = document.getElementById(id);
    if (!button) return;
    if (button.dataset.label === undefined) button.dataset.label = button.innerHTML;
    button.innerHTML = html;
    button.classList.add('saved');
    setTimeout(function () {
      button.innerHTML = button.dataset.label || '';
      button.classList.remove('saved');
    }, 2500);
  }

  root.saveToMyGrooves = function () {
    var title = /** @type {HTMLInputElement | null} */ (document.getElementById('tuneTitle'));
    var saved = saveMyGroove(
      deviceStorage(),
      title ? title.value : '',
      get_FullURLForPage(),
      new Date().toISOString()
    );
    showButtonDone(
      'saveToMyGroovesButton',
      saved
        ? '<i class="fa fa-check"></i><span><b>Saved to My Grooves</b><small>Find it under Grooves &rsaquo; My Grooves</small></span>'
        : '<i class="fa fa-exclamation-triangle"></i><span><b>Couldn\'t save on this device</b><small>Bookmark the link instead</small></span>'
    );
  };

  root.loadMyGroove = function (index) {
    var entry = loadMyGrooves(deviceStorage())[index];
    if (entry) root.loadNewGroove(entry.search);
  };

  root.removeMyGroove = function (index) {
    removeMyGroove(deviceStorage(), index);
    var myGroovesMenu = document.getElementById('myGroovesMenu');
    if (myGroovesMenu) myGroovesMenu.innerHTML = myGroovesMenuHTML(loadMyGrooves(deviceStorage()));
  };

  function shareLinkText() {
    var link = /** @type {HTMLInputElement | null} */ (
      document.getElementById('fullURLPopupTextField')
    );
    return link && link.value ? link.value : shareURL();
  }

  root.shareByWhatsApp = function () {
    window.open(
      'https://wa.me/?text=' + encodeURIComponent('Check out this groove: ' + shareLinkText()),
      '_blank'
    );
  };

  root.shareByEmail = function () {
    window.location.href =
      'mailto:?subject=' +
      encodeURIComponent('A groove from Infinity Scribe') +
      '&body=' +
      encodeURIComponent('Check out this groove:\n\n' + shareLinkText());
  };

  root.close_FullURLPopup = function () {
    var popup = document.getElementById('fullURLPopup');

    if (popup) popup.style.display = 'none';
  };

  // Infinity Drumming, 2026: our own short links (scribe.infinitydrumming.com/s/...)
  // when the site is hosted with them (functions/api/shorten.js); otherwise the
  // full link. The original Groove Scribe's gscribe.com short links are no longer
  // made: they went through a Google link service that has shut down, and on
  // iPhones they could open the original Groove Scribe instead of Infinity Scribe.
  function fillInShortenedURLInFullURLPopup(fullURL, cssIdOfTextFieldToFill) {
    document.getElementById('embedCodeCheckbox').checked = false; // uncheck embedCodeCheckbox, because it is not compatible
    if (typeof fetch != 'function') {
      showFullURLWithoutShortLinks(fullURL, cssIdOfTextFieldToFill);
      return;
    }
    fetch('/api/shorten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: fullURL }),
    })
      .then(function (response) {
        return response.ok ? response.json() : null;
      })
      .then(function (result) {
        if (result && result.shortLink) showShortURL(result.shortLink, cssIdOfTextFieldToFill);
        else showFullURLWithoutShortLinks(fullURL, cssIdOfTextFieldToFill);
      })
      .catch(function () {
        showFullURLWithoutShortLinks(fullURL, cssIdOfTextFieldToFill); // not hosted with our short links
      });
  }

  function showShortURL(shortLink, cssIdOfTextFieldToFill) {
    var textField = document.getElementById(cssIdOfTextFieldToFill);
    textField.value = shortLink;
    // select the URL for copy/paste
    textField.focus();
    textField.select();
    document.getElementById('shortenerCheckbox').checked = true;
  }

  // no short links on this site: the full link, and no "Short link" box to tick
  function showFullURLWithoutShortLinks(fullURL, cssIdOfTextFieldToFill) {
    var textField = /** @type {HTMLInputElement} */ (
      document.getElementById(cssIdOfTextFieldToFill)
    );
    var shortener = /** @type {HTMLInputElement} */ (document.getElementById('shortenerCheckbox'));
    var label = document.getElementById('shortURLLabel');
    if (textField) textField.value = fullURL;
    shortener.checked = false;
    if (label) label.style.display = 'none';
  }

  // embed looks something like this:
  // <iframe width="100%" height="240" src="https://hosting.com/path/GrooveDisplay.html?Div=16&Title=Example..." frameborder="0" ></iframe>
  function fillInEmbedURLInFullURLPopup(fullURL, cssIdOfTextFieldToFill) {
    document.getElementById('shortenerCheckbox').checked = false; // uncheck shortenerCheckbox, because it is not compatible
    document.getElementById('embedCodeCheckbox').checked = true; // this will be true if isn't already

    var embedText =
      '<iframe width="100%" height="240" src="' + fullURL + '" frameborder="0" ></iframe>	';

    var textField = document.getElementById(cssIdOfTextFieldToFill);
    textField.value = embedText;

    // select the URL for copy/paste
    textField.focus();
    textField.select();
  }

  root.shortenerCheckboxChanged = function () {
    if (document.getElementById('shortenerCheckbox').checked) {
      fillInShortenedURLInFullURLPopup(shareURL(), 'fullURLPopupTextField');
    } else {
      root.fillInFullURLInFullURLPopup();
    }
  };

  root.embedCodeCheckboxChanged = function () {
    if (document.getElementById('embedCodeCheckbox').checked) {
      fillInEmbedURLInFullURLPopup(shareURL('display'), 'fullURLPopupTextField');
    } else {
      fillInShortenedURLInFullURLPopup(shareURL(), 'fullURLPopupTextField');
    }
  };

  // --- An exercise in its link (Infinity Drumming, 2026) --------------------------
  // The practice settings (permutation, speed-up, count-in, the click's Solo and
  // offset start, muted lines) go into the groove's link with its notes,
  // so a teacher can send a whole assignment. The address bar (and so undo and
  // My Grooves) always has them; Save & Share's "Include practice settings" box
  // decides whether the shared link does. The instructions travel with the link
  // and show in a card over the music when it opens.
  var class_applying_link_settings = false; // while a link's settings are put in place
  var class_instructions_card_hidden = false; // "hide" pressed on the card

  function inputById(id) {
    return /** @type {HTMLInputElement | null} */ (document.getElementById(id));
  }

  // (not "Fat back", which the link has as its own setting)
  function permutationCheckboxes() {
    return /** @type {NodeListOf<HTMLInputElement>} */ (
      document.querySelectorAll(
        '#PermutationOptions input[type="checkbox"]:not(#PermuationOptionsFatBack):not(#PermutationRepCounter)'
      )
    );
  }

  // the permutation options' ticks, in order: "1101..."
  function permutationBoxes() {
    var text = '';
    permutationCheckboxes().forEach(function (box) {
      text += box.checked ? '1' : '0';
    });
    return text;
  }

  // the boxes a link's ticks are for, in order: all of them, or for a link from
  // before the layout gained groups (layout.groupsInOlderLinks), the menu's own
  // options then the groups there were then, in their order then
  function linkedPermutationBoxes(count) {
    var layout = get_permutation_layout();
    var boxes = Array.prototype.slice.call(permutationCheckboxes());
    if (count == boxes.length || !layout.groupsInOlderLinks) return boxes;
    var groupOf = function (box) {
      return box.id.replace(/_sub\d+$/, '');
    };
    var ids = layout.groups.map(function (group) {
      return group.id;
    });
    var older = boxes.filter(function (box) {
      return ids.indexOf(groupOf(box)) < 0;
    });
    layout.groupsInOlderLinks.forEach(function (id) {
      older = older.concat(
        boxes.filter(function (box) {
          return groupOf(box) == id;
        })
      );
    });
    return older;
  }

  // the permutation options' ticks by box, to put back when the menu is drawn
  // again with the same figures (a bar added to the ostinato, or another time
  // signature with the same figures: "Simplify multiple kicks" is only in 4/4)
  function permutationTicks() {
    /** @type {Object<string, boolean>} */
    var ticks = {};
    permutationCheckboxes().forEach(function (box) {
      ticks[box.id] = box.checked;
    });
    return ticks;
  }

  function setPermutationTicks(ticks) {
    var figureBoxes = function (ids) {
      return ids
        .filter(function (id) {
          return id != 'PermuationOptionsSkipSomeFirstNotes';
        })
        .sort()
        .join();
    };
    var boxes = Array.prototype.slice.call(permutationCheckboxes());
    var ids = boxes.map(function (box) {
      return box.id;
    });
    if (figureBoxes(ids) != figureBoxes(Object.keys(ticks))) return;
    boxes.forEach(function (box) {
      if (box.id in ticks) box.checked = ticks[box.id];
    });
  }

  function setPermutationBoxes(text) {
    if (!text) return;
    var boxes = linkedPermutationBoxes(text.length);
    if (text.length != boxes.length) return; // another layout: keep its own ticks
    permutationCheckboxes().forEach(function (box) {
      box.checked = false; // (a group the link has no tick for)
    });
    boxes.forEach(function (box, i) {
      box.checked = text.charAt(i) == '1';
    });
  }

  function inputNumber(id, fallback) {
    var input = inputById(id);
    var n = parseInt(input ? input.value : '', 10);
    return isNaN(n) ? fallback : n;
  }

  function currentSpeedUp() {
    if (!class_metronome_auto_speed_up_active) return null;
    var bars = speedUpCountsBars();
    var keepGoing = inputById('metronomeAutoSpeedUpKeepGoingForever');
    return {
      amount: inputNumber('metronomeAutoSpeedupTempoIncreaseAmount', 5),
      every: bars
        ? speedUpEveryBars()
        : inputNumber('metronomeAutoSpeedupTempoIncreaseInterval', 2),
      unit: bars ? 'b' : 'm',
      keepGoing: !keepGoing || keepGoing.checked,
      target: getAutoSpeedUpTargetTempo(),
    };
  }

  // the muted bars of each line: {hh: [1, 3], ...}
  function currentMutes() {
    var mutes = {};
    MUTE_LINES.forEach(function (line) {
      for (var bar = 1; bar <= class_number_of_measures; bar++)
        if (isInstrumentMuted(line, bar)) {
          if (!mutes[line]) mutes[line] = [];
          mutes[line].push(bar);
        }
    });
    return mutes;
  }

  function currentPracticeSettings() {
    var gu = root.myGrooveUtils;
    return {
      permutation:
        class_permutation_type == 'none'
          ? null
          : {
              type: class_permutation_type,
              boxes: permutationBoxes(),
              playEach: get_permutation_repeats(),
              bars: class_permutation_bars,
              fatBack: fatBackOn(),
              ostinato: get_ostinato_bars(),
            },
      speedUp: currentSpeedUp(),
      countIn: class_metronome_count_in_active,
      clickSolo: !!gu.getMetronomeSolo(),
      clickStart: gu.getMetronomeOffsetClickStart() || '1',
      mutes: currentMutes(),
      playBars: practiseBarsText(),
    };
  }

  function setPermutationFromLink(perm) {
    var allowed = !!perm && permutationsAllowed();
    class_permutation_repeats = allowed ? perm.playEach : 1;
    class_permutation_fat_back = allowed && !!perm.fatBack;
    root.permutationPopupClick(allowed ? perm.type : 'none');
    if (!allowed) return;
    // as many bars as the link's ostinato: links from before October 2026 played
    // bar 1 only, and closed any others on opening (they still do)
    closeBarsPastOstinato(perm.ostinato || 1);
    class_permutation_bars = perm.bars || '';
    document.getElementById('PermutationOptions').innerHTML = root.HTMLforPermutationOptions();
    setPermutationBoxes(perm.boxes);
  }

  function setSpeedUpFromLink(speedUp) {
    class_metronome_auto_speed_up_active = !!speedUp;
    addOrRemoveKeywordFromClassById('metronomeOptionsContextMenuSpeedUp', 'menuChecked', !!speedUp);
    if (!speedUp) return;
    var set = function (id, value) {
      var input = inputById(id);
      if (input) input.value = String(value);
    };
    var tick = function (id, on) {
      var input = inputById(id);
      if (input) input.checked = on;
    };
    var bars = speedUp.unit == 'b';
    set('metronomeAutoSpeedupTempoIncreaseAmount', speedUp.amount);
    tick('metronomeAutoSpeedupUnitBars', bars);
    tick('metronomeAutoSpeedupUnitMinutes', !bars);
    set(
      bars ? 'metronomeAutoSpeedupTempoIncreaseBars' : 'metronomeAutoSpeedupTempoIncreaseInterval',
      speedUp.every
    );
    tick('metronomeAutoSpeedUpKeepGoingForever', speedUp.keepGoing);
    tick('metronomeAutoSpeedUpUseTarget', !!speedUp.target);
    if (speedUp.target) set('metronomeAutoSpeedUpTargetTempo', speedUp.target);
    root.speedUpUnitChange();
    ['Amount', 'Interval', 'Bars'].forEach(function (name) {
      var input = inputById('metronomeAutoSpeedupTempoIncrease' + name);
      var output = document.getElementById('metronomeAutoSpeedupTempoIncrease' + name + 'Output');
      if (input && output) output.innerHTML = input.value;
    });
  }

  function setMutesFromLink(mutes) {
    MUTE_LINES.forEach(function (line) {
      for (var bar = 1; bar <= class_number_of_measures; bar++) {
        var muted = (mutes[line] || []).indexOf(bar) >= 0;
        if (
          document.getElementById('unmute' + line + 'Button' + bar) &&
          muted != isInstrumentMuted(line, bar)
        )
          root.muteInstrument(line, bar, muted);
      }
    });
  }

  // a link's practice settings, every one (off when the link doesn't have it)
  function applyPracticeSettings(settings) {
    if (!settings) return;
    var gu = root.myGrooveUtils;
    class_applying_link_settings = true;
    try {
      setPermutationFromLink(settings.permutation);
      setSpeedUpFromLink(settings.speedUp);
      class_metronome_count_in_active = settings.countIn;
      addOrRemoveKeywordFromClassById(
        'metronomeOptionsContextMenuCountIn',
        'menuChecked',
        settings.countIn
      );
      gu.setMetronomeSolo(settings.clickSolo);
      addOrRemoveKeywordFromClassById(
        'metronomeOptionsContextMenuSolo',
        'menuChecked',
        settings.clickSolo
      );
      if ((gu.getMetronomeOffsetClickStart() || '1') != settings.clickStart)
        root.metronomeOptionsMenuOffsetClickPopupClick(settings.clickStart);
      setMutesFromLink(settings.mutes || {});
      class_practise_bars = settings.playBars || '';
      resetGrooveClickPhase();
      showPractiseBars();
    } finally {
      class_applying_link_settings = false;
    }
    root.metronomeOptionsMenuSetSelectedState();
  }

  // --- the instructions ---
  function instructionsBox() {
    return /** @type {HTMLTextAreaElement | null} */ (
      document.getElementById('exerciseInstructions')
    );
  }

  function currentInstructions() {
    var box = instructionsBox();
    return box ? box.value.trim() : '';
  }

  // the card over the music: the instructions as plain text (never as HTML)
  function showInstructionsCard() {
    var card = document.getElementById('exerciseInstructionsCard');
    var text = document.getElementById('exerciseInstructionsCardText');
    if (!card || !text) return;
    var instructions = currentInstructions();
    text.textContent = instructions;
    card.style.display = instructions && !class_instructions_card_hidden ? 'block' : 'none';
  }

  function setInstructionsFromLink(instructions) {
    var box = instructionsBox();
    if (!box) return;
    if (box.value.trim() != instructions) class_instructions_card_hidden = false; // new ones show
    box.value = instructions;
    showInstructionsCard();
  }

  // typed in Save & Share
  root.instructionsChanged = function () {
    class_instructions_card_hidden = false;
    showInstructionsCard();
    root.updateCurrentURL();
    root.shareSettingsChanged();
  };

  root.hideInstructionsCard = function () {
    class_instructions_card_hidden = true;
    showInstructionsCard();
  };

  // --- Save & Share ---
  function includePracticeInShare() {
    var box = inputById('includePracticeCheckbox');
    return !box || box.checked;
  }

  // the link Save & Share gives: with the practice settings if its box is ticked
  function shareURL(url_destination) {
    return get_FullURLForPage(url_destination, includePracticeInShare());
  }

  // the box or the instructions changed: the link in Save & Share follows
  root.shareSettingsChanged = function () {
    var popup = document.getElementById('fullURLPopup');
    if (!popup || popup.style.display != 'block') return;
    if (inputById('embedCodeCheckbox').checked) {
      fillInEmbedURLInFullURLPopup(shareURL('display'), 'fullURLPopupTextField');
      return;
    }
    var field = inputById('fullURLPopupTextField');
    if (field) field.value = shareURL();
    if (inputById('shortenerCheckbox').checked)
      fillInShortenedURLInFullURLPopup(shareURL(), 'fullURLPopupTextField');
  };

  function set_Default_notes(encodedURLData) {
    var myGrooveData = root.myGrooveUtils.getGrooveDataFromUrlString(encodedURLData);

    class_num_beats_per_measure = myGrooveData.numBeats; // TimeSigTop
    class_note_value_per_measure = myGrooveData.noteValue; // TimeSigBottom

    // each bar's time signature, when they differ
    var oldBarSigs = JSON.stringify(class_bar_time_sigs);
    class_bar_time_sigs = (myGrooveData.barTimeSigs || []).map(function (sig) {
      return { top: sig.top, bottom: sig.bottom };
    });
    // the Mixed note setting's beats, bar by bar
    var oldBeats = JSON.stringify(currentBeatNotes());
    class_beat_notes = (myGrooveData.beatNotes || []).slice();

    if (
      myGrooveData.notesPerMeasure != class_notes_per_measure ||
      class_number_of_measures != myGrooveData.numberOfMeasures ||
      oldBarSigs != JSON.stringify(class_bar_time_sigs) ||
      myGrooveData.timeDivision != class_time_division ||
      oldBeats != JSON.stringify(myGrooveData.beatNotes || [])
    ) {
      class_number_of_measures = myGrooveData.numberOfMeasures;
      changeDivisionWithNotes(myGrooveData.timeDivision);
    }

    root.expandAuthoringViewWhenNecessary(class_notes_per_measure, class_number_of_measures);

    setNotesFromABCArray('Stickings', myGrooveData.sticking_array, class_number_of_measures);
    // the cymbal lines first: crashes and rides in an older H line move onto them
    setNotesFromABCArray('C', myGrooveData.crash_array, class_number_of_measures);
    setNotesFromABCArray('R', myGrooveData.ride_array, class_number_of_measures);
    setNotesFromABCArray('H', myGrooveData.hh_array, class_number_of_measures);
    setNotesFromABCArray('T1', myGrooveData.toms_array[0], class_number_of_measures);
    setNotesFromABCArray('T2', myGrooveData.toms_array[1], class_number_of_measures);
    setNotesFromABCArray('T4', myGrooveData.toms_array[3], class_number_of_measures);
    setNotesFromABCArray('S', myGrooveData.snare_array, class_number_of_measures);
    setNotesFromABCArray('K', myGrooveData.kick_array, class_number_of_measures);

    if (myGrooveData.showToms) root.showHideToms(true, true, true);

    // open the cymbal lines when the groove uses them (whether they came from
    // the C / R lines or from an older H line), like the toms
    for (var n = 0; n < class_notes_per_measure * class_number_of_measures; n++) {
      if (get_crash_state(n, 'ABC') || get_ride_state(n, 'ABC')) {
        root.showHideCymbals(true, true, true);
        break;
      }
    }

    if (myGrooveData.showStickings) root.stickingsShowHide(true, true, true);

    document.getElementById('tuneTitle').value = myGrooveData.title;

    document.getElementById('tuneAuthor').value = myGrooveData.author;

    document.getElementById('tuneComments').value = myGrooveData.comments;

    root.myGrooveUtils.setTempo(myGrooveData.tempo);

    class_straight_bars = (myGrooveData.straightBars || []).slice();
    refreshStraightBarButtons();
    class_bar_sections = (myGrooveData.barSections || []).slice();
    class_section_repeats = (myGrooveData.sectionRepeats || []).slice();
    refreshSectionButtons();
    root.myGrooveUtils.setSwing(myGrooveData.swingPercent);
    root.myGrooveUtils.setSwingStyle(myGrooveData.swingStyle);
    root.myGrooveUtils.setGraceSpacingMs(myGrooveData.graceSpacingMs);
    root.myGrooveUtils.setGraceVolume(myGrooveData.graceVolume);

    setGrooveClickFromLink(myGrooveData.grooveClickGrooveBars, myGrooveData.grooveClickClickBars);
    setPracticeLimit(parsePracticeLimit(myGrooveData.practiceLimit), true);
    setCounting(myGrooveData.showCounts ? myGrooveData.countMode || 'all' : 'off');
    applyPracticeSettings(myGrooveData.practice);
    setInstructionsFromLink(myGrooveData.instructions || '');
    root.setMetronomeFrequency(myGrooveData.metronomeFrequency);

    updateSheetMusic();
  }

  root.loadNewGroove = function (encodedURLData) {
    set_Default_notes(encodedURLData);
  };

  function getABCDataWithLineEndings() {
    var myABC = document.getElementById('ABCsource').value;

    // add proper line endings for windows
    myABC = myABC.replace(/\r?\n/g, '\r\n');

    return myABC;
  }

  root.saveABCtoFile = function () {
    var myABC = getABCDataWithLineEndings();

    var myURL = 'data:text/plain;charset=utf-8;base64,' + btoa(myABC);

    console.log('Use "Save As" to save the new page to a local file');
    window.open(myURL);
  };

  // change the base division to something else.
  // eg  16th to 8ths or   32nds to 8th note triplets
  // need to re-layout the html notes, change any globals and then reinitialize
  //
  // OMG this needs to be refactored really bad.   There is a GrooveData struct from groove utils that
  //      would make this whole thing much easier.  :(
  function changeDivisionWithNotes(
    newDivision,
    Stickings,
    HH,
    Tom1,
    Tom2,
    Tom4,
    Snare,
    Kick,
    Crash,
    Ride,
    Ornaments
  ) {
    var oldDivision = class_time_division;
    var wasStickingsVisable = isStickingsVisible();
    var wasTomsVisable = isTomsVisible();
    var wasCymbalsVisible = isCymbalsVisible();

    class_time_division = newDivision;
    // (the longest bar's note count when the bars' time signatures differ)
    class_notes_per_measure = barStrideFor(class_time_division);

    var newHTML = '';
    for (var cur_measure = 1; cur_measure <= class_number_of_measures; cur_measure++) {
      newHTML += root.HTMLforStaffContainer(
        cur_measure,
        (cur_measure - 1) * class_notes_per_measure
      );
    }

    // rewrite the HTML for the HTML note grid
    document.getElementById('measureContainer').innerHTML = newHTML;
    if (class_note_selection.length) showNoteSelection(); // (marked again)

    // change the Permutation options too (keeping their ticks when the figures
    // are the same: a bar added to the ostinato, say)
    var ticks = permutationTicks();
    newHTML = root.HTMLforPermutationOptions();
    document.getElementById('PermutationOptions').innerHTML = newHTML;
    setPermutationTicks(ticks);

    if (wasStickingsVisable) root.stickingsShowHide(true, true, true);

    if (wasTomsVisable) root.showHideToms(true, true, true);

    if (wasCymbalsVisible) root.showHideCymbals(true, true, true);

    // now set the right notes on and off
    // (the cymbal lines first: a crash or ride found in the H line moves onto them)
    if (Crash) setNotesFromURLData('C', Crash, class_number_of_measures);
    if (Ride) setNotesFromURLData('R', Ride, class_number_of_measures);
    if (Stickings && HH && Tom1 && Tom2 && Tom4 && Snare && Kick) {
      setNotesFromURLData('Stickings', Stickings, class_number_of_measures);
      setNotesFromURLData('H', HH, class_number_of_measures);
      setNotesFromURLData('T1', Tom1, class_number_of_measures);
      setNotesFromURLData('T2', Tom2, class_number_of_measures);
      setNotesFromURLData('T4', Tom4, class_number_of_measures);
      setNotesFromURLData('S', Snare, class_number_of_measures);
      setNotesFromURLData('K', Kick, class_number_of_measures);
    }
    // and the flams, drags and ruffs on them
    if (Ornaments) setOrnamentsFromTabLines(Ornaments, class_number_of_measures);

    // hide the note slots past the end of shorter bars, and those no beat uses
    hideUnusedBarSlots();
    applyBeatHiding();

    // un-highlight the old div
    unselectButton(document.getElementById('subdivision_' + oldDivision + 'ths'));
    unselectButton(document.getElementById('subdivision_48ths')); // (32nds beat by beat show it)

    // highlight the new div (Mixed for 32nds beat by beat)
    selectButton(document.getElementById('subdivision_' + shownDivision() + 'ths'));
    syncToolbarSelects();

    // This may disable or enable the menu
    setupPermutationMenu();

    // may turn on or off triplets and 1/4 or 1/8th notes based on time signature
    root.setTimeDivisionSelectionOnOrOff();

    // change the time label
    root.setTimeSigLabel();

    // enable or disable swing
    root.myGrooveUtils.swingEnabled(root.myGrooveUtils.doesDivisionSupportSwing(newDivision));
  }

  root.expandAuthoringViewWhenNecessary = function (numNotesPerMeasure, numberOfMeasures) {
    // set the size of the musicalInput authoring element based on the number of notes
    if (
      numNotesPerMeasure > 16 ||
      (numNotesPerMeasure > 4 && class_number_of_measures > 1) ||
      class_number_of_measures > 2
    ) {
      addOrRemoveKeywordFromClassById('musicalInput', 'expanded', true);
    } else {
      addOrRemoveKeywordFromClassById('musicalInput', 'expanded', false);
    }
  };

  // change the base division to something else.
  // eg  16th to 8ths or   32nds to 8th note triplets
  // need to re-layout the html notes, change any globals and then reinitialize
  // Mixed, beat by beat (Infinity Drumming, 2026): coming from another note
  // setting, every beat keeps the notes it had (16ths stay 16ths); going to
  // another, the beats are dropped (unless the beats say, see setGrooveBeats)
  function beatsInDivision(newDivision) {
    if (class_beats_for_next_division) return class_beats_for_next_division.slice();
    if (newDivision != 48) return [];
    if (class_time_division == 48) return class_beat_notes;
    return allBars().map(function (bar) {
      var char = beatCharForDivision(class_time_division, barSigOf(bar));
      var beats = '';
      for (var b = 0; char && b < barSigOf(bar).top; b++) beats += char;
      return beats;
    });
  }

  // Mixed asked for on the 32nds grid, beat by beat: it is already (and would
  // lose the 32nd notes)
  function alreadyBeatByBeat(newDivision) {
    return newDivision == 48 && beatGrid() == 32 && !class_beats_for_next_division;
  }

  root.changeDivision = function (newDivision) {
    if (alreadyBeatByBeat(newDivision)) return;
    var uiStickings = '|';
    var uiHH = '|';
    var uiTom1 = '|';
    var uiTom2 = '|';
    var uiTom4 = '|';
    var uiCrash = '|';
    var uiRide = '|';
    var uiSnare = '|';
    var uiKick = '|';
    var uiOrnaments = emptyOrnamentLines();

    var isNewDivisionTriplets = root.myGrooveUtils.isTripletDivision(newDivision);
    var new_notes_per_measure = root.myGrooveUtils.calc_notes_per_measure(
      isNewDivisionTriplets ? 48 : 32,
      class_num_beats_per_measure,
      class_note_value_per_measure
    );

    // bars with their own time signatures: the note setting has to fit every bar
    var unfitBar = allBars().find(function (bar) {
      return !divisionFitsBar(newDivision, barSigOf(bar));
    });
    if (isMixedMeterGroove() && unfitBar !== undefined) {
      window.alert(
        'That note setting does not fit bar ' +
          (unfitBar + 1) +
          ' (' +
          barSigLabel(unfitBar) +
          "). Change that bar's time signature first."
      );
      return;
    }

    // check for incompatible odd time signature division   9/8 and 1/4notes for instance or 9/16 and 1/8notes
    if (((newDivision * class_num_beats_per_measure) / class_note_value_per_measure) % 1 != 0) {
      alert(
        '1/' +
          newDivision +
          ' notes are disabled in ' +
          class_num_beats_per_measure +
          '/' +
          class_note_value_per_measure +
          ' time.  This combination would result in a half note.'
      );
      return;
    }
    if (
      isNewDivisionTriplets &&
      !divisionFitsBar(newDivision, {
        top: class_num_beats_per_measure,
        bottom: class_note_value_per_measure,
      })
    ) {
      alert(
        'Triplets are disabled in ' +
          class_num_beats_per_measure +
          '/' +
          class_note_value_per_measure +
          ' time.  Use x/4 or x/8 time for triplets.'
      );
      return;
    }

    class_beat_notes = beatsInDivision(newDivision);
    class_beats_for_next_division = null;

    // notes keep their places when one note setting's grid is a whole multiple of
    // the other's (16ths and Mixed, 8ths and 16th triplets...)
    var exactChange =
      newDivision % class_time_division === 0 || class_time_division % newDivision === 0;
    if (usingTriplets() !== isNewDivisionTriplets && exactChange)
      root.resetMetronomeOptionsMenuOffsetClick(); // the click's offsets differ in triplets

    if (usingTriplets() === isNewDivisionTriplets || exactChange) {
      // get the encoded notes out of the UI.
      // run through both measures.
      var topIndex = class_notes_per_measure * class_number_of_measures;
      for (var i = 0; i < topIndex; i++) {
        uiStickings += get_sticking_state(i, 'URL');
        uiHH += get_hh_state(i, 'URL');
        uiTom1 += get_tom_state(i, 1, 'URL');
        uiTom2 += get_tom_state(i, 2, 'URL');
        uiTom4 += get_tom_state(i, 4, 'URL');
        uiCrash += get_crash_state(i, 'URL');
        uiRide += get_ride_state(i, 'URL');
        uiSnare += get_snare_state(i, 'URL');
        uiKick += get_kick_state(i, 'URL');
        addOrnamentChars(uiOrnaments, i);
      }

      // override the hi-hat if we are going to a higher division.
      // otherwise the notes get lost in translation (not enough)
      //if (newDivision > class_notes_per_measure)
      //	uiHH = root.myGrooveUtils.GetDefaultHHGroove(new_notes_per_measure, class_num_beats_per_measure, class_note_value_per_measure, class_number_of_measures);
    } else {
      // changing from or changing to a triplet division
      // triplets don't scale well, so use defaults when we change
      uiStickings = root.myGrooveUtils.GetDefaultStickingsGroove(
        new_notes_per_measure,
        class_num_beats_per_measure,
        class_note_value_per_measure,
        class_number_of_measures
      );
      uiHH = root.myGrooveUtils.GetDefaultHHGroove(
        new_notes_per_measure,
        class_num_beats_per_measure,
        class_note_value_per_measure,
        class_number_of_measures
      );
      uiTom1 = root.myGrooveUtils.GetDefaultTom1Groove(
        new_notes_per_measure,
        class_num_beats_per_measure,
        class_note_value_per_measure,
        class_number_of_measures
      );
      uiTom2 = root.myGrooveUtils.GetDefaultTom2Groove(
        new_notes_per_measure,
        class_num_beats_per_measure,
        class_note_value_per_measure,
        class_number_of_measures
      );
      uiTom4 = root.myGrooveUtils.GetDefaultTom4Groove(
        new_notes_per_measure,
        class_num_beats_per_measure,
        class_note_value_per_measure,
        class_number_of_measures
      );
      uiSnare = root.myGrooveUtils.GetDefaultSnareGroove(
        new_notes_per_measure,
        class_num_beats_per_measure,
        class_note_value_per_measure,
        class_number_of_measures
      );
      uiKick = root.myGrooveUtils.GetDefaultKickGroove(
        new_notes_per_measure,
        class_num_beats_per_measure,
        class_note_value_per_measure,
        class_number_of_measures
      );

      // reset the metronome click, since it has different options
      root.resetMetronomeOptionsMenuOffsetClick();
    }

    root.expandAuthoringViewWhenNecessary(newDivision, class_number_of_measures);

    changeDivisionWithNotes(
      newDivision,
      uiStickings,
      uiHH,
      uiTom1,
      uiTom2,
      uiTom4,
      uiSnare,
      uiKick,
      uiCrash,
      uiRide,
      uiOrnaments
    );

    updateSheetMusic();
  };

  // public function
  // function to create HTML for the music staff and notes.   We usually want more than one of these
  // baseIndex is the index for the css labels "staff-container1, staff-container2"
  // indexStartForNotes is the index for the note ids.
  root.HTMLforStaffContainer = function (baseindex, indexStartForNotes) {
    return _view.buildStaffContainerHTML(baseindex, indexStartForNotes, {
      notesPerMeasure: class_notes_per_measure,
      numBeatsPerMeasure: class_num_beats_per_measure,
      noteValuePerMeasure: class_note_value_per_measure,
      numberOfMeasures: class_number_of_measures,
      straightBar: !!class_straight_bars[baseindex - 1],
      barTimeSig: barSigLabel(baseindex - 1),
      section: sectionOfBar(baseindex - 1),
      // the row of beats, to choose each beat's notes
      beatHeader: beatHeaderOfBar(baseindex - 1),
      // x/8 bars are grouped like their beaming (5/8 = 3+2, ...); beat by beat,
      // each beat (or triplet over two beats) is a group
      groupEnds:
        beatGroupEndsOfBar(baseindex - 1) ||
        beamGroupEnds(
          barSigOf(baseindex - 1).top,
          barSigOf(baseindex - 1).bottom,
          barCountOf(baseindex - 1)
        ),
      // the beats are grouped by the bar's own time signature
      noteGrouping: root.myGrooveUtils.noteGroupingSize(
        barCountOf(baseindex - 1),
        barSigOf(baseindex - 1).top,
        barSigOf(baseindex - 1).bottom
      ),
    });
  };

  // a click on a permutation option checkbox
  root.permutationOptionClick = function (event) {
    var optionId = event.target.id;
    var checkbox = document.getElementById(optionId);
    var OnElseOff = checkbox.checked;

    // a group has up to 8 sub-options (1/32 notes per beat)
    for (var i = 1; i <= 8; i++) {
      var subOption = optionId + '_sub' + i;

      checkbox = document.getElementById(subOption);
      if (checkbox) checkbox.checked = OnElseOff;
    }

    root.refresh_ABC();
  };

  // a click on a permutation sub option checkbox
  root.permutationSubOptionClick = function (event) {
    var optionId = event.target.id;
    var checkbox = document.getElementById(optionId);
    var OnElseOff = checkbox.checked;

    if (OnElseOff) {
      // only do this if turning a sub option on
      // remove the "_sub" and the number on the end (the last char)
      var mainOption = optionId.replace('_sub', '').slice(0, -1);

      checkbox = document.getElementById(mainOption);
      if (checkbox) checkbox.checked = true;
    }

    root.refresh_ABC();
  };

  // public function
  // function to create HTML for the music staff and notes.   We usually want more than one of these
  // baseIndex is the index for the css labels "staff-container1, staff-container2"
  // indexStartForNotes is the index for the note ids.
  root.HTMLforPermutationOptions = function () {
    var layout = get_permutation_layout();
    if (!layout) return ''; // (the time signature has none: the permutation goes off)
    return _view.buildPermutationOptionsHTML(
      class_permutation_type,
      layout,
      get_permutation_repeats(),
      class_permutation_fat_back,
      class_rep_counter
    );
  };
} // end of class

export { GrooveWriter };
