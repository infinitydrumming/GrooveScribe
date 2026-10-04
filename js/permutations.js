// Modified by Infinity Drumming, 2026: permutation figures per note setting (1/8, 1/16, triplets), cross-rhythms, 1/16 triplet and 1/32 per-beat figures, alternating kick / snare, repeats. See CHANGES.md.
// Permutation engine (Step 4 extraction from groove_writer.js).
//
// Pure combinatorial generators for the "permutation" practice modes: they build
// note arrays (and the ABC section boilerplate) for each permutation section.
// These functions carry no state — callers that vary by time division pass the
// current `usingTriplets` flag in. The stateful/DOM parts of the permutation
// UI (shouldDisplayPermutationForSection, get_numberOfActivePermutationSections)
// stay in GrooveWriter, which delegates its own methods here.

import {
  constant_ABC_SN_Normal,
  constant_ABC_SN_Accent,
  constant_ABC_SN_Ghost,
  constant_ABC_SN_Buzz,
  constant_ABC_KI_Normal,
  constant_ABC_KI_SandK,
  constant_ABC_KI_Splash,
} from './constants.js';

// --- Permutation figures (Infinity Drumming, 2026) ----------------------------
//
// Each note setting has its own ordered list of figure groups (Singles, Doubles,
// ...). A group is one checkbox in the Permutation Options menu, with optional
// sub-checkboxes, one per figure. A figure is one bar of the permutation: a list
// of hits over the full-size bar (32 slots, or 48 for triplets).
//
//   1/16 notes       a 4-note pattern per beat (1 e & a)
//   1/8 notes        the same 4-note pattern stretched over 2 beats (1 & 2 &)
//   1/8 triplets     a 3-note pattern per beat (1 & a), plus cross-rhythms
//   1/16 triplets    the 1/8 triplet figures, each lasting an 8th note, plus per-beat figures
//   1/32 notes       the 1/16 figures, each lasting an 8th note, plus per-beat figures

// a full-size bar of hits: isHit(slot) -> boolean
function hitsArray(slots, isHit) {
  var hits = [];
  for (var slot = 0; slot < slots; slot++) hits.push(!!isHit(slot));
  return hits;
}

// "Per beat" groups: Singles / Doubles / Triples lasting a whole beat, starting
// on each of the `notesPerBeat` grid notes of the beat (1/16 triplets: 6, the
// 8th-triplet notes and the off-beats between them; 1/32 notes: 8). Unticked by
// default to keep the list short.
function perBeatGroups(slots, unit, notesPerBeat) {
  var beat = notesPerBeat * unit;
  var labels = [];
  for (var l = 1; l <= notesPerBeat; l++) labels.push(String(l));
  var inBeat = function (notes) {
    return function (slot) {
      return notes.some(function (note) {
        return slot % beat == (note % notesPerBeat) * unit;
      });
    };
  };
  return [
    { id: 'PermuationOptionsSinglesBeat', name: 'Singles (per beat)', length: 1 },
    { id: 'PermuationOptionsDoublesBeat', name: 'Doubles (per beat)', length: 2 },
    { id: 'PermuationOptionsTriplesBeat', name: 'Triples (per beat)', length: 3 },
  ].map(function (spec) {
    return {
      id: spec.id,
      name: spec.name,
      defaultOn: false,
      subLabels: labels,
      figures: labels.map(function (label, start) {
        var notes = [];
        for (var n = 0; n < spec.length; n++) notes.push(start + n);
        return { hits: hitsArray(slots, inBeat(notes)) };
      }),
    };
  });
}

// Straight figures: `unit` slots per grid note, 4 grid notes per pattern.
// `labels` names the 4 positions. Only the 16ths layout keeps a link to the
// original section numbers, for the hand-written "Simplify multiple kicks" bars.
function straightLayout(mode, unit, labels, pairName, pairLabels, extraGroups) {
  var slots = 32;
  var group = 4 * unit;
  var at = function (position) {
    return function (slot) {
      return slot % group == position * unit;
    };
  };
  var any = function (positions) {
    return function (slot) {
      return positions.some(function (position) {
        return at(position % 4)(slot);
      });
    };
  };
  var legacy = function (section) {
    return mode == 'sixteenths' ? section : undefined;
  };
  var figure = function (isHit, legacySection) {
    return { hits: hitsArray(slots, isHit), legacy16th: legacy(legacySection) };
  };
  var positions = [0, 1, 2, 3];

  return {
    mode: mode,
    slots: slots,
    unit: unit,
    simplifyAllowed: mode == 'sixteenths',
    groups: [
      {
        id: 'PermuationOptionsOstinato',
        name: 'Ostinato',
        defaultOn: false,
        subLabels: [],
        figures: [figure(() => false, 0)],
      },
      {
        id: 'PermuationOptionsSingles',
        name: 'Singles',
        defaultOn: true,
        subLabels: labels,
        figures: positions.map((p) => figure(at(p), 1 + p)),
      },
      {
        // was "Downbeats/Upbeats": every other grid note, on and off the beat
        id: 'PermuationOptionsUpsDowns',
        name: pairName,
        defaultOn: true,
        subLabels: pairLabels,
        figures: [figure(any([0, 2]), 9), figure(any([1, 3]), 10)],
      },
      {
        id: 'PermuationOptionsDoubles',
        name: 'Doubles',
        defaultOn: true,
        subLabels: labels,
        figures: positions.map((p) => figure(any([p, p + 1]), 5 + p)),
      },
      {
        id: 'PermuationOptionsTriples',
        name: 'Triples',
        defaultOn: true,
        subLabels: labels,
        figures: positions.map((p) => figure(any([p, p + 1, p + 2]), 11 + p)),
      },
      {
        id: 'PermuationOptionsQuads',
        name: 'Quads',
        defaultOn: false,
        subLabels: [],
        figures: [figure(any([0, 1, 2, 3]), 15)],
      },
      ...(extraGroups || []),
    ],
  };
}

// Triplet figures: `unit` slots per triplet note, 3 notes per pattern, then
// cross-rhythms that run across the bar: every 2nd note (2 starting points)
// and every 4th note (4 starting points).
function tripletLayout(mode, unit, labels, every2Labels, every4Labels) {
  var slots = 48;
  var group = 3 * unit;
  var at = function (position) {
    return function (slot) {
      return slot % group == position * unit;
    };
  };
  var any = function (positions) {
    return function (slot) {
      return positions.some(function (position) {
        return at(position % 3)(slot);
      });
    };
  };
  var everyNth = function (n, start) {
    return function (slot) {
      return slot % unit == 0 && (slot / unit) % n == start;
    };
  };
  var figure = function (isHit) {
    return { hits: hitsArray(slots, isHit) };
  };
  var positions = [0, 1, 2];

  // 1/16 triplets only: the per-beat figures on all 6 notes of the beat
  var perBeat = mode == 'triplets16' ? perBeatGroups(slots, unit, 6) : [];

  return {
    mode: mode,
    slots: slots,
    unit: unit,
    simplifyAllowed: false,
    groups: [
      {
        id: 'PermuationOptionsOstinato',
        name: 'Ostinato',
        defaultOn: false,
        subLabels: [],
        figures: [figure(() => false)],
      },
      {
        id: 'PermuationOptionsSingles',
        name: 'Singles',
        defaultOn: true,
        subLabels: labels,
        figures: positions.map((p) => figure(at(p))),
      },
      {
        id: 'PermuationOptionsDoubles',
        name: 'Doubles',
        defaultOn: true,
        subLabels: labels,
        figures: positions.map((p) => figure(any([p, p + 1]))),
      },
      ...perBeat,
      {
        id: 'PermuationOptionsEvery2nd',
        name: 'Cross-rhythm: every 2nd note',
        defaultOn: true,
        subLabels: every2Labels,
        figures: [0, 1].map((start) => figure(everyNth(2, start))),
      },
      {
        id: 'PermuationOptionsEvery4th',
        name: 'Cross-rhythm: every 4th note',
        defaultOn: true,
        subLabels: every4Labels,
        figures: [0, 1, 2, 3].map((start) => figure(everyNth(4, start))),
      },
    ],
  };
}

/**
 * The permutation figure groups for a note setting (time division).
 *
 * @param {number} timeDivision  4, 8, 16, 32, or triplet forms 12, 24, 48.
 */
export function getPermutationLayout(timeDivision) {
  switch (timeDivision) {
    case 12:
    case 48:
      return tripletLayout('triplets8', 4, ['1', '&', 'a'], ['1', '&'], ['1', '&', 'a', '2']);
    case 24:
      return tripletLayout(
        'triplets16',
        2,
        ['1', '&', 'a'],
        ['1st', '2nd'],
        ['1st', '2nd', '3rd', '4th']
      );
    case 32:
      return straightLayout(
        'thirtyseconds',
        1,
        ['1st', '2nd', '3rd', '4th'],
        '16ths / Off-beat 32nds',
        ['16ths', 'off 32nds'],
        perBeatGroups(32, 1, 8)
      );
    case 4:
    case 8:
      return straightLayout('eighths', 4, ['1', '&', '2', '&'], 'Quarter notes / Off-beat 8ths', [
        '4ths',
        'off 8ths',
      ]);
    default:
      return straightLayout('sixteenths', 2, ['1', 'e', '&', 'a'], '8th notes / Off-beat 16ths', [
        '8ths',
        'off 16ths',
      ]);
  }
}

/**
 * Every figure of a layout in playing order, with the group it belongs to and
 * its sub-checkbox number (1-based; 0 when the group has no sub-checkboxes).
 */
export function getPermutationSections(layout) {
  var sections = [];
  layout.groups.forEach(function (group, groupIndex) {
    group.figures.forEach(function (figure, figureIndex) {
      sections.push({
        group: group,
        groupIndex: groupIndex,
        sub: group.subLabels.length ? figureIndex + 1 : 0,
        label: group.subLabels[figureIndex] || '',
        figure: figure,
      });
    });
  });
  return sections;
}

// ABC that goes before / after one bar of a permutation. `shownIndex` is the
// bar's position among the shown bars of its group; `lastInGroup` marks the last
// one. Two bars per line; the group name is printed over its first bar.
export function getPermutationSectionABC(section, shownIndex, lastInGroup, repeats) {
  var pre = '';
  if (shownIndex === 0) {
    if (section.groupIndex === 0) pre += 'P:Ostinato\n';
    else
      pre +=
        'T: \nP: ' +
        section.group.name +
        (repeats > 1 ? '   (play each ×' + repeats + ')' : '') +
        '\n';
  }
  pre +=
    '%\n% ' + section.group.name + (section.label ? ' on "' + section.label + '"' : '') + '\n%\n';

  var post;
  if (lastInGroup) post = '|\n';
  else if (shownIndex % 2 == 1) post = '\n';
  else post = '\\\n';

  return { pre: pre, post: post };
}

// One bar of kicks for a figure. "Simplify multiple kicks" (1/16 notes only)
// uses the original hand-written bars, which leave out some kicks.
export function getPermutationKickArray(section, simplify) {
  if (simplify && section.figure.legacy16th !== undefined)
    return get_kick16th_minus_some_strait_permutation_array(section.figure.legacy16th);
  return section.figure.hits.map((hit) => (hit ? constant_ABC_KI_Normal : false));
}

/**
 * One bar of alternating kick and snare for a figure: the figure's hits, in
 * order, go lead drum, other drum, lead drum, ... across the bar.
 *
 * @param {object} section
 * @param {boolean} kickLead  true: the first hit is a kick; false: a snare
 * @returns {{kick: Array<string|false>, snare: Array<string|false>}}
 */
export function getPermutationAlternatingBar(section, kickLead) {
  var kick = [];
  var snare = [];
  var count = 0;
  section.figure.hits.forEach(function (hit) {
    var isKick = hit && (count % 2 === 0) === kickLead;
    kick.push(hit && isKick ? constant_ABC_KI_Normal : false);
    snare.push(hit && !isKick ? constant_ABC_SN_Normal : false);
    if (hit) count++;
  });
  return { kick: kick, snare: snare };
}

/**
 * One bar of snare for a figure.
 *
 * @param {object} section
 * @param {'normal'|'accent'|'diddle'} style  plain hits; accents with ghost notes on
 *   every other grid note ("Use Accent Grid"); or buzzed accents with diddled ghosts
 * @param {number} unit  slots per grid note (from the layout)
 */
export function getPermutationSnareArray(section, style, unit) {
  var hits = section.figure.hits;
  if (style == 'normal' || section.groupIndex === 0)
    return hits.map((hit) => (hit ? constant_ABC_SN_Normal : false));

  var snare = [];
  if (style == 'accent') {
    for (var i = 0; i < hits.length; i++) {
      if (hits[i]) snare.push(constant_ABC_SN_Accent);
      else if (i % unit === 0) snare.push(constant_ABC_SN_Ghost);
      else snare.push(false);
    }
    return snare;
  }

  // diddle: each accent is a buzz followed by a rest, every other slot a ghost
  for (var j = 0; j < hits.length; j++) {
    if (hits[j]) {
      snare.push(constant_ABC_SN_Buzz);
      if (j + 1 < hits.length) snare.push(false);
      j++;
    } else snare.push(constant_ABC_SN_Ghost);
  }
  return snare;
}

// The original hand-written 1/16 kick bars for "Simplify multiple kicks", by original
// section number (1-4 singles, 5-8 doubles, 9-10 8ths / off 16ths, 11-14 triples, 15 quads).
function get_kick16th_minus_some_strait_permutation_array(section) {
  var kick_array;

  switch (section) {
    case 0:
      kick_array = [
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
      break;
    case 1:
      kick_array = [
        'F',
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        'F',
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        'F',
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        'F',
        false,
        false,
        false,
        false,
        false,
        false,
        false,
      ];
      break;
    case 2:
      kick_array = [
        false,
        false,
        'F',
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        'F',
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        'F',
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        'F',
        false,
        false,
        false,
        false,
        false,
      ];
      break;
    case 3:
      kick_array = [
        false,
        false,
        false,
        false,
        'F',
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        'F',
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        'F',
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        'F',
        false,
        false,
        false,
      ];
      break;
    case 4:
      kick_array = [
        false,
        false,
        false,
        false,
        false,
        false,
        'F',
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        'F',
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        'F',
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        'F',
        false,
      ];
      break;
    case 5:
      kick_array = [
        'F',
        false,
        'F',
        false,
        false,
        false,
        false,
        false,
        'F',
        false,
        'F',
        false,
        false,
        false,
        false,
        false,
        'F',
        false,
        'F',
        false,
        false,
        false,
        false,
        false,
        'F',
        false,
        'F',
        false,
        false,
        false,
        false,
        false,
      ];
      break;
    case 6:
      kick_array = [
        false,
        false,
        'F',
        false,
        'F',
        false,
        false,
        false,
        false,
        false,
        'F',
        false,
        'F',
        false,
        false,
        false,
        false,
        false,
        'F',
        false,
        'F',
        false,
        false,
        false,
        false,
        false,
        'F',
        false,
        'F',
        false,
        false,
        false,
      ];
      break;
    case 7:
      kick_array = [
        false,
        false,
        false,
        false,
        'F',
        false,
        'F',
        false,
        false,
        false,
        false,
        false,
        'F',
        false,
        'F',
        false,
        false,
        false,
        false,
        false,
        'F',
        false,
        'F',
        false,
        false,
        false,
        false,
        false,
        'F',
        false,
        'F',
        false,
      ];
      break;
    case 8:
      kick_array = [
        false,
        false,
        false,
        false,
        false,
        false,
        'F',
        false,
        'F',
        false,
        false,
        false,
        false,
        false,
        'F',
        false,
        'F',
        false,
        false,
        false,
        false,
        false,
        'F',
        false,
        'F',
        false,
        false,
        false,
        false,
        false,
        'F',
        false,
      ];
      break;
    case 9: // downbeats
      kick_array = [
        'F',
        false,
        false,
        false,
        'F',
        false,
        false,
        false,
        'F',
        false,
        false,
        false,
        'F',
        false,
        false,
        false,
        'F',
        false,
        false,
        false,
        'F',
        false,
        false,
        false,
        'F',
        false,
        false,
        false,
        'F',
        false,
        false,
        false,
      ];
      break;
    case 10: // upbeats
      kick_array = [
        false,
        false,
        'F',
        false,
        false,
        false,
        'F',
        false,
        false,
        false,
        'F',
        false,
        false,
        false,
        'F',
        false,
        false,
        false,
        'F',
        false,
        false,
        false,
        'F',
        false,
        false,
        false,
        'F',
        false,
        false,
        false,
        'F',
        false,
      ];
      break;
    case 11:
      kick_array = [
        'F',
        false,
        'F',
        false,
        'F',
        false,
        false,
        false,
        'F',
        false,
        'F',
        false,
        'F',
        false,
        false,
        false,
        'F',
        false,
        'F',
        false,
        'F',
        false,
        false,
        false,
        'F',
        false,
        'F',
        false,
        'F',
        false,
        false,
        false,
      ];
      break;
    case 12:
      kick_array = [
        false,
        false,
        'F',
        false,
        'F',
        false,
        'F',
        false,
        false,
        false,
        'F',
        false,
        'F',
        false,
        'F',
        false,
        false,
        false,
        'F',
        false,
        'F',
        false,
        'F',
        false,
        false,
        false,
        'F',
        false,
        'F',
        false,
        'F',
        false,
      ];
      break;
    case 13:
      kick_array = [
        false,
        false,
        false,
        false,
        'F',
        false,
        'F',
        false,
        'F',
        false,
        false,
        false,
        'F',
        false,
        'F',
        false,
        'F',
        false,
        false,
        false,
        'F',
        false,
        'F',
        false,
        'F',
        false,
        false,
        false,
        'F',
        false,
        'F',
        false,
      ];
      break;
    case 14:
      kick_array = [
        false,
        false,
        false,
        false,
        false,
        false,
        'F',
        false,
        'F',
        false,
        'F',
        false,
        false,
        false,
        'F',
        false,
        'F',
        false,
        'F',
        false,
        false,
        false,
        'F',
        false,
        'F',
        false,
        'F',
        false,
        false,
        false,
        'F',
        false,
      ];
      break;
    case 15:
    /* falls through */
    default:
      kick_array = [
        'F',
        false,
        'F',
        false,
        'F',
        false,
        'F',
        false,
        'F',
        false,
        'F',
        false,
        'F',
        false,
        'F',
        false,
        'F',
        false,
        'F',
        false,
        'F',
        false,
        'F',
        false,
        'F',
        false,
        'F',
        false,
        'F',
        false,
        'F',
        false,
      ];
      break;
  }

  return kick_array;
}

// Reduce a kick array to just its splash notes (used when merging a permutation
// kick line on top of the ostinato). Pure.
export function filter_kick_array_for_permutation(old_kick_array) {
  var new_kick_array = [];

  for (var i in old_kick_array) {
    if (old_kick_array[i] == constant_ABC_KI_Splash || old_kick_array[i] == constant_ABC_KI_SandK)
      new_kick_array.push(constant_ABC_KI_Splash);
    else new_kick_array.push(false);
  }

  return new_kick_array;
}

// merge 2 kick arrays
//  4 possible states
//  false   (off)
//  constant_ABC_KI_Normal
//  constant_ABC_KI_SandK
//  constant_ABC_KI_Splash
export function merge_kick_arrays(primary_kick_array, secondary_kick_array) {
  var new_kick_array = [];

  for (var i in primary_kick_array) {
    switch (primary_kick_array[i]) {
      case false:
        new_kick_array.push(secondary_kick_array[i]);
        break;

      case constant_ABC_KI_SandK:
        new_kick_array.push(constant_ABC_KI_SandK);
        break;

      case constant_ABC_KI_Normal:
        if (
          secondary_kick_array[i] == constant_ABC_KI_SandK ||
          secondary_kick_array[i] == constant_ABC_KI_Splash
        )
          new_kick_array.push(constant_ABC_KI_SandK);
        else new_kick_array.push(constant_ABC_KI_Normal);
        break;

      case constant_ABC_KI_Splash:
        if (
          secondary_kick_array[i] == constant_ABC_KI_Normal ||
          secondary_kick_array[i] == constant_ABC_KI_SandK
        )
          new_kick_array.push(constant_ABC_KI_SandK);
        else new_kick_array.push(constant_ABC_KI_Splash);
        break;

      default:
        console.log('bad case in merge_kick_arrays()');
        new_kick_array.push(primary_kick_array[i]);
        break;
    }
  }

  return new_kick_array;
}
