// Javascript for the Groove Scribe HTML application
// Groove Scribe is for drummers and helps create sheet music with an easy to use WYSIWYG groove editor.
//
// Author: Lou Montulli
// Original Creation date: Feb 2015.
//
//  Copyright 2015-2020 Lou Montulli, Mike Johnston
//  Modified by Infinity Drumming, 2026: mid tom, hi-hat foot, crash and ride lines, collapsing tom lines, copy / paste a bar, metronome bar click and groove / click bars, tom ghosts and accents, page title, ride accent, snare click adds a normal hit, permutations from the figure layout with repeats, alternating kick / snare permutations, auto-scroll switch, Brazilian swing, swung click in click-only bars. See CHANGES.md.
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
  constant_OUR_MIDI_SNARE_DRAG,
  constant_OUR_MIDI_SNARE_FLAM,
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
} from './constants.js';
import * as _perm from './permutations.js';
import * as _view from './viewHtml.js';
import * as _grid from './gridState.js';
import { scaleTabMeasure } from './noteArrays.js';

// GrooveWriter class.   The only one in this file.

function GrooveWriter() {
  'use strict';

  var root = this;

  root.myGrooveUtils = new GrooveUtils();
  root.myGrooveUtils.percentForSheetMusic = function (percent) {
    if (class_permutation_type == 'none' || get_permutation_repeats() < 2) return percent;
    var shown = get_numberOfActivePermutationSections();
    var bars = shown * get_permutation_repeats();
    var position = Math.min(percent * bars, bars - 1e-9);
    var bar = Math.floor(position);
    return (Math.floor(bar / get_permutation_repeats()) + (position - bar)) / shown;
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
  var class_groove_click_in_click_phase = false;
  var class_groove_click_bars_played = 0;

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
    if (ghost) ghost.style.color = constant_note_hidden_color_rgb;
    if (accent) accent.style.color = constant_note_hidden_color_rgb;
    circle.style.borderColor = constant_note_border_color_hex;

    var velocity = constant_OUR_MIDI_VELOCITY_NORMAL;
    switch (mode) {
      case 'off':
        circle.style.backgroundColor = constant_note_off_color_hex;
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
      default:
        console.log('bad switch in set_tom_state');
        return;
    }

    if (make_sound) {
      var tomSounds = {
        1: constant_OUR_MIDI_TOM1_NORMAL,
        2: constant_OUR_MIDI_TOM2_NORMAL,
        4: constant_OUR_MIDI_TOM4_NORMAL,
      };
      if (tomSounds[tom_num]) play_single_note_for_note_setting(tomSounds[tom_num], velocity);
      else console.log('bad switch in set_tom_state. bad tom num:' + tom_num);
    }
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
        break;
      case 'normal':
        document.getElementById('snare_circle' + id).style.backgroundColor =
          constant_note_on_color_hex;
        document.getElementById('snare_circle' + id).style.borderColor =
          constant_note_border_color_hex;
        if (make_sound) play_single_note_for_note_setting(constant_OUR_MIDI_SNARE_NORMAL);
        break;
      case 'flam':
        document.getElementById('snare_flam' + id).style.color = constant_note_on_color_hex;
        if (make_sound) play_single_note_for_note_setting(constant_OUR_MIDI_SNARE_FLAM);
        break;
      case 'drag':
        document.getElementById('snare_drag' + id).style.color = constant_note_on_color_hex;
        if (make_sound) play_single_note_for_note_setting(constant_OUR_MIDI_SNARE_DRAG);
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

    // if we are in a permutation, hightlight each measure as it goes
    if (class_permutation_type != 'none')
      percent_complete = (percent_complete * get_numberOfPermutationBars()) % 1.0;

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
  };

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

    selectButton(document.getElementById(id));

    root.myGrooveUtils.midiNoteHasChanged(); // pretty likely the case
  };

  root.class_metronome_frequency = 0;
  root.getMetronomeFrequency = function () {
    return root.class_metronome_frequency;
  };

  root.setMetronomeFrequency = function (newFrequency) {
    root.class_metronome_frequency = newFrequency;
    root.setMetronomeButton(newFrequency);

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

      root.myGrooveUtils.showContextMenu(contextMenu);
    }
  };

  // the user has clicked on the permutation menu
  root.permutationAnchorClick = function (event) {
    if (class_num_beats_per_measure != 4 || class_note_value_per_measure != 4) return; // permutations disabled except in 4/4 time

    var contextMenu = document.getElementById('permutationContextMenu');
    if (contextMenu) {
      var anchorPoint = document.getElementById('permutationAnchor');

      if (anchorPoint) {
        var anchorPos = getTagPosition(anchorPoint);
        contextMenu.style.top = anchorPos.y + anchorPoint.offsetHeight + 'px';
        contextMenu.style.left = anchorPos.x + anchorPoint.offsetWidth - 150 + 'px';
      }
      root.myGrooveUtils.showContextMenu(contextMenu);
    }
  };

  // the user has clicked on the grooves menu
  root.groovesAnchorClick = function (event) {
    var contextMenu = document.getElementById('grooveListWrapper');
    if (contextMenu) {
      var anchorPoint = document.getElementById('groovesAnchor');

      if (anchorPoint) {
        var anchorPos = getTagPosition(anchorPoint);
        contextMenu.style.top = anchorPos.y + anchorPoint.offsetHeight + 'px';
        contextMenu.style.left = anchorPos.x + anchorPoint.offsetWidth - 283 + 'px';
      }
      root.myGrooveUtils.showContextMenu(contextMenu);
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
      root.myGrooveUtils.showContextMenu(contextMenu);
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
      root.myGrooveUtils.showContextMenu(contextMenu);
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
      root.myGrooveUtils.showContextMenu(contextMenu);
    }
  };

  // figure out if the metronome options menu should be selected and change the UI
  root.metronomeOptionsMenuSetSelectedState = function () {
    if (
      root.myGrooveUtils.getMetronomeSolo() ||
      class_metronome_auto_speed_up_active ||
      class_groove_click_active ||
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

      case 'CountIn':
        if (class_metronome_count_in_active) {
          // just turn it off if it is on, don't show the configurator
          class_metronome_count_in_active = false;
          addOrRemoveKeywordFromClassById(
            'metronomeOptionsContextMenuCountIn',
            'menuChecked',
            false
          );
          root.myGrooveUtils.setMetronomeCountIn(false);
        } else {
          class_metronome_count_in_active = true;
          addOrRemoveKeywordFromClassById(
            'metronomeOptionsContextMenuCountIn',
            'menuChecked',
            true
          );
          root.myGrooveUtils.setMetronomeCountIn(true);
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
  };

  root.resetMetronomeOptionsMenuOffsetClick = function () {
    // call with the default option
    root.metronomeOptionsMenuOffsetClickPopupClick('1');
  };

  function setupPermutationMenu() {
    if (class_num_beats_per_measure == 4 && class_note_value_per_measure == 4) {
      addOrRemoveKeywordFromClassById('permutationAnchor', 'enabled', true);
    } else {
      // permutations disabled except in 4/4 time
      addOrRemoveKeywordFromClassById('permutationAnchor', 'enabled', false);
      root.permutationPopupClick('none'); // make sure permutation is off
    }
  }

  root.permutationPopupClick = function (perm_type) {
    if (class_permutation_type == perm_type) return;

    class_permutation_type = perm_type;

    switch (perm_type) {
      case 'kick_16ths':
        showHideCSS_ClassVisibility('.kick-container', true, false); // hide it
        showHideCSS_ClassVisibility('.snare-container', true, true); // show it
        while (class_number_of_measures > 1) {
          root.closeMeasureButtonClick(2);
        }
        selectButton(document.getElementById('permutationAnchor'));
        document.getElementById('PermutationOptions').innerHTML = root.HTMLforPermutationOptions();
        document.getElementById('PermutationOptions').className += ' displayed';
        break;

      case 'snare_16ths':
        showHideCSS_ClassVisibility('.kick-container', true, true); // show it
        showHideCSS_ClassVisibility('.snare-container', true, false); // hide it
        while (class_number_of_measures > 1) {
          root.closeMeasureButtonClick(2);
        }
        selectButton(document.getElementById('permutationAnchor'));
        document.getElementById('PermutationOptions').innerHTML = root.HTMLforPermutationOptions();
        document.getElementById('PermutationOptions').className += ' displayed';
        break;

      case 'kick_snare_kick_lead':
      case 'kick_snare_snare_lead':
        // alternating kick and snare: the permutation replaces both lines
        showHideCSS_ClassVisibility('.kick-container', true, false); // hide it
        showHideCSS_ClassVisibility('.snare-container', true, false); // hide it
        while (class_number_of_measures > 1) {
          root.closeMeasureButtonClick(2);
        }
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
      root.myGrooveUtils.showContextMenu(contextMenu);
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
      if (!event) event = window.event;
      if (event.clientX || event.clientY) {
        contextMenu.style.top = event.clientY - 30 + 'px';
        contextMenu.style.left = event.clientX - 75 + 'px';
      }
      root.myGrooveUtils.showContextMenu(contextMenu);
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
  function get_permutation_layout() {
    return _perm.getPermutationLayout(class_time_division);
  }

  function isPermutationSectionShown(section) {
    var main = document.getElementById(section.group.id);
    if (!main || !main.checked) return false;
    if (!section.sub) return true;
    var sub = document.getElementById(section.group.id + '_sub' + section.sub);
    return !!(sub && sub.checked);
  }

  // the shown figures in playing order, each with its ABC before / after
  function get_shown_permutation_sections() {
    var shown = _perm
      .getPermutationSections(get_permutation_layout())
      .filter(isPermutationSectionShown);
    var repeats = get_permutation_repeats();
    return shown.map(function (section, i) {
      var shownIndex = 0;
      for (var j = i - 1; j >= 0 && shown[j].group === section.group; j--) shownIndex++;
      var lastInGroup = i + 1 >= shown.length || shown[i + 1].group !== section.group;
      var abc = _perm.getPermutationSectionABC(section, shownIndex, lastInGroup, repeats);
      return { section: section, pre_abc: abc.pre, post_abc: abc.post };
    });
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
  function get_empty_note_array_in_32nds() {
    var notes_per_4_beats = 32;
    if (usingTriplets()) notes_per_4_beats = 48;
    var num_notes =
      (class_num_beats_per_measure * notes_per_4_beats) / class_note_value_per_measure;

    return _grid.get_empty_note_array(num_notes);
  }

  // The four tom voices plus the crash and ride lines (constant_CRASH_VOICE_INDEX /
  // constant_RIDE_VOICE_INDEX), which the ABC and MIDI builders treat as extra voices.
  function get_empty_voice_arrays_in_32nds() {
    var arrays = [];
    for (var v = 0; v <= constant_RIDE_VOICE_INDEX; v++)
      arrays.push(get_empty_note_array_in_32nds());
    return arrays;
  }

  function get_numberOfActivePermutationSections() {
    return get_shown_permutation_sections().length;
  }

  // bars in one full pass of the permutation, counting repeats
  function get_numberOfPermutationBars() {
    return get_numberOfActivePermutationSections() * get_permutation_repeats();
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
        notesPerMeasure: class_notes_per_measure,
        numBeatsPerMeasure: class_num_beats_per_measure,
        noteValuePerMeasure: class_note_value_per_measure,
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
  function get_num_notes_for_swing() {
    if (class_time_division < 16)
      return (8 * class_num_beats_per_measure) / class_note_value_per_measure;
    return (16 * class_num_beats_per_measure) / class_note_value_per_measure;
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
    var midiTrack = new Midi.Track();
    midiFile.addTrack(midiTrack);

    midiTrack.setTempo(root.myGrooveUtils.getTempo());
    midiTrack.setInstrument(0, 0x13);

    var swing_percentage = root.myGrooveUtils.getSwing() / 100;

    // all of the permutations use just the first measure
    switch (class_permutation_type) {
      case 'kick_16ths':
      case 'snare_16ths':
      case 'kick_snare_kick_lead':
      case 'kick_snare_snare_lead':
        // every shown figure, each played "Play each" times
        get_shown_permutation_sections().forEach(function (shownSection) {
          var bar = get_permutation_bar(shownSection.section, Kick_Array, Snare_Array);
          for (var repeat = 0; repeat < get_permutation_repeats(); repeat++)
            root.myGrooveUtils.MIDI_from_HH_Snare_Kick_Arrays(
              midiTrack,
              HH_Array,
              bar.snare,
              bar.kick,
              Toms_Array,
              MIDI_type,
              metronomeFrequency,
              num_notes,
              num_notes_for_swing,
              swing_percentage,
              class_num_beats_per_measure,
              class_note_value_per_measure
            );
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
          swing_percentage,
          class_num_beats_per_measure,
          class_note_value_per_measure
        );

        for (i = 1; i < class_number_of_measures; i++) {
          // reset arrays
          Sticking_Array = get_empty_note_array_in_32nds();
          HH_Array = get_empty_note_array_in_32nds();
          Snare_Array = get_empty_note_array_in_32nds();
          Kick_Array = get_empty_note_array_in_32nds();
          Toms_Array = get_empty_voice_arrays_in_32nds();

          // get another measure
          get32NoteArrayFromClickableUI(
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
            num_notes_for_swing,
            swing_percentage,
            class_num_beats_per_measure,
            class_note_value_per_measure
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
    myGrooveData.tempo = root.myGrooveUtils.getTempo();
    myGrooveData.metronomeFrequency = root.getMetronomeFrequency();
    myGrooveData.grooveClickGrooveBars = class_groove_click_active
      ? class_groove_click_groove_bars
      : 0;
    myGrooveData.grooveClickClickBars = class_groove_click_active
      ? class_groove_click_click_bars
      : 0;
    myGrooveData.kickStemsUp = true;

    for (var i = 0; i < class_number_of_measures; i++) {
      var total_notes = class_notes_per_measure * class_number_of_measures;
      myGrooveData.sticking_array = [];
      myGrooveData.hh_array = [];
      myGrooveData.snare_array = [];
      myGrooveData.kick_array = [];
      myGrooveData.toms_array = [[], [], [], []];
      myGrooveData.crash_array = [];
      myGrooveData.ride_array = [];

      // query the clickable UI and generate a arrays representing the notes of all measures
      for (i = 0; i < total_notes; i++) {
        // only grab the stickings if they are visible
        if (isStickingsVisible()) myGrooveData.sticking_array.push(get_sticking_state(i, 'ABC'));

        myGrooveData.hh_array.push(get_hh_state(i, 'ABC'));
        myGrooveData.snare_array.push(get_snare_state(i, 'ABC'));
        myGrooveData.kick_array.push(get_kick_state(i, 'ABC'));

        // like the toms, the cymbal lines only count while they are shown
        var cymbalsShown = isCymbalsVisible();
        myGrooveData.crash_array.push(cymbalsShown ? get_crash_state(i, 'ABC') : false);
        myGrooveData.ride_array.push(cymbalsShown ? get_ride_state(i, 'ABC') : false);

        if (isTomsVisible()) {
          myGrooveData.toms_array[0].push(get_tom_state(i, 1, 'ABC'));
          myGrooveData.toms_array[1].push(get_tom_state(i, 2, 'ABC'));
          myGrooveData.toms_array[3].push(get_tom_state(i, 4, 'ABC'));
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
  root.updateCurrentURL = function () {
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

  function generate_ABC(renderWidth) {
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

        // every shown figure, written once (marked "play each ×N" when repeated)
        get_shown_permutation_sections().forEach(function (shownSection) {
          var bar = get_permutation_bar(shownSection.section, Kick_Array, Snare_Array);
          fullABC += shownSection.pre_abc;
          fullABC += root.myGrooveUtils.create_ABC_from_snare_HH_kick_arrays(
            Sticking_Array,
            HH_Array,
            bar.snare,
            bar.kick,
            Toms_Array,
            shownSection.post_abc,
            num_notes,
            class_time_division,
            num_notes,
            true,
            class_num_beats_per_measure,
            class_note_value_per_measure
          );
          root.myGrooveUtils.note_mapping_array = root.myGrooveUtils.note_mapping_array.concat(
            root.myGrooveUtils.create_note_mapping_array_for_highlighting(
              HH_Array,
              bar.snare,
              bar.kick,
              Toms_Array,
              num_notes
            )
          );
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

        var numberOfMeasuresPerLine = 2;
        var addon_abc;

        if (class_notes_per_measure >= 32) {
          // Only put one measure per line for 32nd notes and above because of width issues
          numberOfMeasuresPerLine = 1;
        }

        for (i = 0; i < class_number_of_measures; i++) {
          // we already go the array states above, don't get it again.
          if (i > 0) {
            // reset arrays
            Sticking_Array = get_empty_note_array_in_32nds();
            HH_Array = get_empty_note_array_in_32nds();
            Snare_Array = get_empty_note_array_in_32nds();
            Kick_Array = get_empty_note_array_in_32nds();

            get32NoteArrayFromClickableUI(
              Sticking_Array,
              HH_Array,
              Snare_Array,
              Kick_Array,
              Toms_Array,
              class_notes_per_measure * i
            );
          }

          if (i + 1 == class_number_of_measures) {
            // last measure
            addon_abc = '|\n';
          } else if ((i + 1) % numberOfMeasuresPerLine === 0) {
            // new line measure
            addon_abc = '\n';
          } else {
            // continuation measure
            addon_abc = '\\\n';
          }
          fullABC += root.myGrooveUtils.create_ABC_from_snare_HH_kick_arrays(
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
            class_num_beats_per_measure,
            class_note_value_per_measure
          );
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

    var fullABC = generate_ABC(renderWidth);

    document.getElementById('ABCsource').value = fullABC;
    root.updateGrooveDBSource();

    root.myGrooveUtils.midiNoteHasChanged(); // pretty likely the case

    // update the current URL so that reloads and history traversal and link shares and bookmarks work correctly
    root.updateCurrentURL();

    root.displayNewSVG();
  }

  // called by generate_ABC to remake the sheet music on the page
  root.displayNewSVG = function () {
    var svgTarget = document.getElementById('svgTarget'),
      diverr = document.getElementById('diverr');

    var abc_source = document.getElementById('ABCsource').value;
    var svg_return = root.myGrooveUtils.renderABCtoSVG(abc_source);

    diverr.innerHTML = svg_return.error_html;
    svgTarget.innerHTML = svg_return.svg;
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

  // remove a measure from the page
  // measureNum is indexed starting at 1, not 0
  root.closeMeasureButtonClick = function (measureNum) {
    var uiStickings = '';
    var uiHH = '';
    var uiTom1 = '';
    var uiTom2 = '';
    var uiTom4 = '';
    var uiCrash = '';
    var uiRide = '';
    var uiSnare = '';
    var uiKick = '';

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
      }
    }

    class_number_of_measures--;

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
      uiRide
    );

    updateSheetMusic();
  };

  // add a measure to the page
  // currently always at the end of the measures
  // copy the notes from the last measure to the new measure
  root.addMeasureButtonClick = function (event) {
    var uiStickings = '';
    var uiHH = '';
    var uiTom1 = '';
    var uiTom2 = '';
    var uiTom4 = '';
    var uiCrash = '';
    var uiRide = '';
    var uiSnare = '';
    var uiKick = '';
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
    }

    class_number_of_measures++;

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
      uiRide
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
    var topIndex = class_notes_per_measure * class_number_of_measures;
    for (var i = 0; i < topIndex; i++) {
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
    return lines;
  }

  // Kept in localStorage as well, so a bar can be pasted into another groove
  // (another tab, or after loading a different groove).
  var constant_measure_clipboard_key = 'grooveScribeMeasureClipboard';
  var class_measure_clipboard = null;

  // measureNum is indexed starting at 1, not 0
  root.copyMeasureButtonClick = function (measureNum) {
    var lines = getTabLinesFromClickableUI();
    var start = (measureNum - 1) * class_notes_per_measure;
    var copied = { triplets: usingTriplets(), lines: {} };
    for (var name in lines) {
      copied.lines[name] = lines[name].slice(start, start + class_notes_per_measure);
    }
    class_measure_clipboard = copied;
    try {
      window.localStorage.setItem(constant_measure_clipboard_key, JSON.stringify(copied));
    } catch (err) {
      /* storage unavailable: the in-page copy still works */
    }

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
  root.pasteMeasureButtonClick = function (measureNum) {
    var copied = getMeasureClipboard();
    if (!copied || !copied.lines) {
      window.alert('Copy a bar first: use the copy button under the bar you want.');
      return;
    }
    if (copied.triplets !== usingTriplets()) {
      window.alert(
        'That bar was copied from a ' +
          (copied.triplets ? 'triplet' : 'non-triplet') +
          ' groove and can only be pasted into one too.'
      );
      return;
    }

    var lines = getTabLinesFromClickableUI();
    var start = (measureNum - 1) * class_notes_per_measure;
    var end = start + class_notes_per_measure;
    for (var name in lines) {
      if (copied.lines[name] === undefined) continue;
      var bar = scaleTabMeasure(copied.lines[name], class_notes_per_measure);
      lines[name] = lines[name].slice(0, start) + bar + lines[name].slice(end);
    }

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
      lines.Ride
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

  root.swapViewEditMode = function (dontUpdateURL) {
    var view_edit_button = document.getElementById('view-edit-switch');

    if (root.myGrooveUtils.viewMode) {
      showHideCSS_ClassDisplay('.edit-block', true, true, 'block'); // show

      if (view_edit_button) view_edit_button.innerHTML = 'Switch to VIEW mode';
      root.myGrooveUtils.viewMode = false;

      if (!dontUpdateURL) root.updateCurrentURL();
    } else {
      showHideCSS_ClassDisplay('.edit-block', true, false, 'block'); // hide

      if (view_edit_button) view_edit_button.innerHTML = 'Switch to EDIT mode';
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

    setupPermutationMenu();
    root.setTimeSigLabel();

    // if Mode != "view" put into edit mode  (we default to view mode to prevent screen flicker)
    if ('view' != root.myGrooveUtils.getQueryVariableFromURL('Mode', 'edit'))
      root.swapViewEditMode(true);

    // set the background and text color of the current subdivision
    selectButton(document.getElementById('subdivision_' + class_notes_per_measure + 'ths'));

    // add html for the midi player
    root.myGrooveUtils.AddMidiPlayerToPage('midiPlayer', class_time_division);

    // load the groove from the URL data if it was passed in.
    set_Default_notes(window.location.search);

    root.myGrooveUtils.midiEventCallbacks.loadMidiDataEvent = function (myroot, playStarting) {
      var midiURL;

      if (playStarting) resetGrooveClickPhase(); // always start with the groove

      if (playStarting && class_metronome_count_in_active) {
        midiURL = root.myGrooveUtils.MIDI_build_midi_url_count_in_track(
          class_num_beats_per_measure,
          class_note_value_per_measure
        );
        root.myGrooveUtils.midiNoteHasChanged(); // this track is temporary
        class_metronome_count_in_is_playing = true;
      } else {
        if (class_metronome_count_in_is_playing) {
          // we saved the state above so that we could reset the Offset click start, otherwise it starts on the 'e'
          class_metronome_count_in_is_playing = false;
          root.myGrooveUtils.resetMetronomeOptionsOffsetClickStartRotation();
        }
        if (class_groove_click_active && class_groove_click_in_click_phase)
          midiURL = createClickOnlyMidiUrl(class_groove_click_click_bars);
        else midiURL = createMidiUrlFromClickableUI('our_MIDI');
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

      // the count-in track doesn't count towards the groove bars
      if (
        note_type == 'complete' &&
        class_groove_click_active &&
        !class_metronome_count_in_is_playing
      )
        advanceGrooveClickPhase();

      // nothing to follow on the grid while only the click is playing
      var clickOnly = class_groove_click_active && class_groove_click_in_click_phase;
      hilight_note(note_type, clickOnly ? -1 : percent_complete);
    };

    root.myGrooveUtils.oneTimeInitializeMidi();

    // enable or disable swing
    root.myGrooveUtils.swingEnabled(
      root.myGrooveUtils.doesDivisionSupportSwing(class_notes_per_measure)
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

    if (tempoDiffInt > 0) root.myGrooveUtils.setTempo(root.myGrooveUtils.getTempo() + tempoDiffInt);
  };

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
      switch (abcArray[i]) {
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
    }
  }

  // get a really long URL that encodes all of the notes and the rest of the state of the page.
  // this will allow us to bookmark or reference a groove and handle undo/redo.
  //
  function get_FullURLForPage(url_destination) {
    var myGrooveData = root.grooveDataFromClickableUI();
    return root.myGrooveUtils.getUrlStringFromGrooveData(myGrooveData, url_destination);
  }

  // --- "Groove / click bars" metronome option --------------------------------
  root.show_GrooveClickConfiguration = function () {
    document.getElementById('grooveClickGrooveBars').value = class_groove_click_groove_bars;
    document.getElementById('grooveClickClickBars').value = class_groove_click_click_bars;
    document.getElementById('grooveClickConfiguration').style.display = 'block';
  };

  root.close_GrooveClickConfiguration = function () {
    var readBars = function (id, fallback) {
      var bars = parseInt(document.getElementById(id).value, 10);
      if (isNaN(bars)) return fallback;
      return Math.min(Math.max(bars, 1), 32);
    };
    class_groove_click_groove_bars = readBars(
      'grooveClickGrooveBars',
      class_groove_click_groove_bars
    );
    class_groove_click_click_bars = readBars('grooveClickClickBars', class_groove_click_click_bars);
    document.getElementById('grooveClickConfiguration').style.display = 'none';
    resetGrooveClickPhase();
    root.myGrooveUtils.midiNoteHasChanged(); // start over with the new numbers
    root.updateCurrentURL(); // the option and its numbers are part of the link
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
    class_groove_click_in_click_phase = false;
    class_groove_click_bars_played = 0;
  }

  // Called each time the groove (or the click-only part) finishes playing through.
  // The groove part always plays whole times through the groove, so with a
  // 2-bar groove and 3 groove bars it plays 4 bars before the click part.
  function advanceGrooveClickPhase() {
    if (class_groove_click_in_click_phase) {
      resetGrooveClickPhase(); // the click part is a single pass of N bars
    } else {
      class_groove_click_bars_played +=
        class_permutation_type == 'none' ? class_number_of_measures : get_numberOfPermutationBars();
      if (class_groove_click_bars_played < class_groove_click_groove_bars) return;
      class_groove_click_in_click_phase = true;
      class_groove_click_bars_played = 0;
    }
    root.myGrooveUtils.midiNoteHasChanged(); // load the other part next
  }

  // `bars` measures of just the metronome (quarter notes if it is off)
  function createClickOnlyMidiUrl(bars) {
    var midiFile = new Midi.File();
    var midiTrack = new Midi.Track();
    midiFile.addTrack(midiTrack);
    midiTrack.setTempo(root.myGrooveUtils.getTempo());
    midiTrack.setInstrument(0, 0x13);

    var empty = get_empty_note_array_in_32nds();
    // the click keeps the groove's swing (amount and style), so it doesn't
    // straighten out in the click-only bars
    var swing_percentage = root.myGrooveUtils.getSwing() / 100;
    for (var bar = 0; bar < bars; bar++) {
      root.myGrooveUtils.MIDI_from_HH_Snare_Kick_Arrays(
        midiTrack,
        empty,
        empty,
        empty,
        get_empty_voice_arrays_in_32nds(),
        'our_MIDI',
        root.getMetronomeFrequency() || 4,
        empty.length,
        get_num_notes_for_swing(),
        swing_percentage,
        class_num_beats_per_measure,
        class_note_value_per_measure
      );
    }
    return 'data:audio/midi;base64,' + btoa(midiFile.toBytes());
  }

  root.show_MetronomeAutoSpeedupConfiguration = function () {
    var popup = document.getElementById('metronomeAutoSpeedupConfiguration');

    if (popup) {
      popup.style.display = 'block';
    }

    document.getElementById('metronomeAutoSpeedupTempoIncreaseAmountOutput').innerHTML =
      document.getElementById('metronomeAutoSpeedupTempoIncreaseAmount').value;
    document.getElementById('metronomeAutoSpeedupTempoIncreaseIntervalOutput').innerHTML =
      document.getElementById('metronomeAutoSpeedupTempoIncreaseInterval').value;
  };

  root.close_MetronomeAutoSpeedupConfiguration = function (type) {
    var popup = document.getElementById('metronomeAutoSpeedupConfiguration');

    if (popup) popup.style.display = 'none';
  };

  root.timeSigPopupOpen = function (type) {
    var popup = document.getElementById('timeSigPopup');

    if (popup) popup.style.display = 'block';
  };

  // turns on or off triplet 1/4 and 1/8 note selection based on the current time sig setting
  root.setTimeDivisionSelectionOnOrOff = function () {
    // check for incompatible odd time signature division  9/16 and 1/8 notes for instance
    if (((8 * class_num_beats_per_measure) / class_note_value_per_measure) % 1 != 0) {
      addOrRemoveKeywordFromClassById('subdivision_8ths', 'disabled', true);
    } else {
      addOrRemoveKeywordFromClassById('subdivision_8ths', 'disabled', false);
    }

    if (class_note_value_per_measure != 4) {
      // triplets are too complicated right now outside of x/4 time.
      // disable them

      addOrRemoveKeywordFromClassById('subdivision_12ths', 'disabled', true);
      addOrRemoveKeywordFromClassById('subdivision_24ths', 'disabled', true);
      addOrRemoveKeywordFromClassById('subdivision_48ths', 'disabled', true);
    } else {
      addOrRemoveKeywordFromClassById('subdivision_12ths', 'disabled', false);
      addOrRemoveKeywordFromClassById('subdivision_24ths', 'disabled', false);
      addOrRemoveKeywordFromClassById('subdivision_48ths', 'disabled', false);
    }
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

    // ignore type "cancel"
    if (type == 'ok') {
      var newTimeSigTop = document.getElementById('timeSigPopupTimeSigTop').value;
      var newTimeSigBottom = document.getElementById('timeSigPopupTimeSigBottom').value;

      if (usingTriplets() && newTimeSigBottom != 4) {
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
      var fullURL = get_FullURLForPage();
      var textField = document.getElementById('fullURLPopupTextField');
      textField.value = fullURL;

      popup.style.display = 'block';

      // select the URL for copy/paste
      textField.focus();
      textField.select();
    }
  };

  root.show_FullURLPopup = function () {
    document.getElementById('fullURLPopup');

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
    fillInShortenedURLInFullURLPopup(get_FullURLForPage(), 'fullURLPopupTextField');
  };

  root.copyShareURLToClipboard = function () {
    var copyText = document.getElementById('fullURLPopupTextField');

    copyText.select();
    // hack fix for mobile
    copyText.setSelectionRange(0, 99999);

    document.execCommand('copy');
  };

  root.close_FullURLPopup = function () {
    var popup = document.getElementById('fullURLPopup');

    if (popup) popup.style.display = 'none';
  };

  function fillInShortenedURLInFullURLPopup(fullURL, cssIdOfTextFieldToFill) {
    document.getElementById('embedCodeCheckbox').checked = false; // uncheck embedCodeCheckbox, because it is not compatible

    var params = {
      dynamicLinkInfo: {
        domainUriPrefix: 'https://gscribe.com/share',
        link: fullURL,
      },
    };

    var xhr = new XMLHttpRequest();
    xhr.open(
      'POST',
      'https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=AIzaSyBx4So11fGFPgTI62nP-JmxrxHmuRpJ120'
    );
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function () {
      if (xhr.status === 200) {
        // success
        var response = JSON.parse(xhr.responseText);
        var textField = document.getElementById(cssIdOfTextFieldToFill);
        textField.value = response.shortLink;
        // select the URL for copy/paste
        textField.focus();
        textField.select();
        document.getElementById('shortenerCheckbox').checked = true; // this is now true if isn't already
      } else {
        document.getElementById('shortenerCheckbox').checked = false; // request failed
      }
    };
    xhr.send(JSON.stringify(params));
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
      fillInShortenedURLInFullURLPopup(get_FullURLForPage(), 'fullURLPopupTextField');
    } else {
      root.fillInFullURLInFullURLPopup();
    }
  };

  root.embedCodeCheckboxChanged = function () {
    if (document.getElementById('embedCodeCheckbox').checked) {
      fillInEmbedURLInFullURLPopup(get_FullURLForPage('display'), 'fullURLPopupTextField');
    } else {
      fillInShortenedURLInFullURLPopup(get_FullURLForPage(), 'fullURLPopupTextField');
    }
  };

  function set_Default_notes(encodedURLData) {
    var myGrooveData = root.myGrooveUtils.getGrooveDataFromUrlString(encodedURLData);

    class_num_beats_per_measure = myGrooveData.numBeats; // TimeSigTop
    class_note_value_per_measure = myGrooveData.noteValue; // TimeSigBottom

    if (
      myGrooveData.notesPerMeasure != class_notes_per_measure ||
      class_number_of_measures != myGrooveData.numberOfMeasures
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

    root.myGrooveUtils.setSwing(myGrooveData.swingPercent);
    root.myGrooveUtils.setSwingStyle(myGrooveData.swingStyle);

    setGrooveClickFromLink(myGrooveData.grooveClickGrooveBars, myGrooveData.grooveClickClickBars);
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
    Ride
  ) {
    var oldDivision = class_time_division;
    var wasStickingsVisable = isStickingsVisible();
    var wasTomsVisable = isTomsVisible();
    var wasCymbalsVisible = isCymbalsVisible();

    class_time_division = newDivision;
    class_notes_per_measure = root.myGrooveUtils.calc_notes_per_measure(
      class_time_division,
      class_num_beats_per_measure,
      class_note_value_per_measure
    );

    var newHTML = '';
    for (var cur_measure = 1; cur_measure <= class_number_of_measures; cur_measure++) {
      newHTML += root.HTMLforStaffContainer(
        cur_measure,
        (cur_measure - 1) * class_notes_per_measure
      );
    }

    // rewrite the HTML for the HTML note grid
    document.getElementById('measureContainer').innerHTML = newHTML;

    // change the Permutation options too
    newHTML = root.HTMLforPermutationOptions();
    document.getElementById('PermutationOptions').innerHTML = newHTML;

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

    // un-highlight the old div
    unselectButton(document.getElementById('subdivision_' + oldDivision + 'ths'));

    // highlight the new div
    selectButton(document.getElementById('subdivision_' + class_time_division + 'ths'));

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
  var have_shown_mixed_division_message = false;
  root.changeDivision = function (newDivision) {
    var uiStickings = '|';
    var uiHH = '|';
    var uiTom1 = '|';
    var uiTom2 = '|';
    var uiTom4 = '|';
    var uiCrash = '|';
    var uiRide = '|';
    var uiSnare = '|';
    var uiKick = '|';

    if (newDivision == 48 && !have_shown_mixed_division_message) {
      have_shown_mixed_division_message = true;
      alert(
        'The MIXED subdivision allows you to create a combination of triplets and non-triplet notes in one measure.  Set every 3rd note for 16ths and every 6th note for 8th notes'
      );
    }

    var isNewDivisionTriplets = root.myGrooveUtils.isTripletDivision(newDivision);
    var new_notes_per_measure = root.myGrooveUtils.calc_notes_per_measure(
      isNewDivisionTriplets ? 48 : 32,
      class_num_beats_per_measure,
      class_note_value_per_measure
    );

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
    if (isNewDivisionTriplets && class_note_value_per_measure != 4) {
      alert(
        'Triplets are disabled in ' +
          class_num_beats_per_measure +
          '/' +
          class_note_value_per_measure +
          ' time.  Use x/4 time for triplets.'
      );
      return;
    }

    if (usingTriplets() === isNewDivisionTriplets) {
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
      uiRide
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
      noteGrouping: root.myGrooveUtils.noteGroupingSize(
        class_notes_per_measure,
        class_num_beats_per_measure,
        class_note_value_per_measure
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
    return _view.buildPermutationOptionsHTML(
      class_permutation_type,
      get_permutation_layout(),
      get_permutation_repeats()
    );
  };
} // end of class

export { GrooveWriter };
