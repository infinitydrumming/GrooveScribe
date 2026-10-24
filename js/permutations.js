// Modified by Infinity Drumming, 2026: more time signatures, multi-bar ostinatos, fat back kick permutations, dense bars one a line on phones, practising some bars of a run (or a groove), bar numbers, permutation figures per note setting (1/8, 1/16, triplets), cross-rhythms, 1/16 triplet and 1/32 per-beat figures, every 1/16 triplet rhythm, alternating kick / snare, repeats, kick flams kept with the hi-hat foot, diddles. See CHANGES.md.
// Permutation engine (Step 4 extraction from groove_writer.js).
//
// Pure combinatorial generators for the "permutation" practice modes: they build
// note arrays (and the ABC section boilerplate) for each permutation section.
// These functions carry no state — callers that vary by time division pass the
// current `usingTriplets` flag in. The stateful/DOM parts of the permutation
// UI (shouldDisplayPermutationForSection, get_numberOfActivePermutationSections)
// stay in GrooveWriter, which delegates its own methods here.

import { withoutDiddle, withoutGrace } from './ornaments.js';

// a kick token's feet, without its flam or diddle
function bareFeet(token) {
  return withoutDiddle(withoutGrace(token));
}
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
// default to keep the list short. `shapes`: the groups, each with the notes its
// figures hit, counted from the start of the figure.
var PER_BEAT_SHAPES = [
  { id: 'PermuationOptionsSinglesBeat', name: 'Singles (per beat)', notes: [0] },
  { id: 'PermuationOptionsDoublesBeat', name: 'Doubles (per beat)', notes: [0, 1] },
  { id: 'PermuationOptionsTriplesBeat', name: 'Triples (per beat)', notes: [0, 1, 2] },
];

// 1/16 triplets: every rhythm of hits on the 6 notes of a beat, repeating each
// beat, is a figure here or in the figures that repeat inside the beat. A core
// figure (single, double, triple) is followed by its "+ single" forms, so each
// group builds on the one before and the hits go up one at a time.
var SEXTUPLET_SHAPES = [
  PER_BEAT_SHAPES[0],
  {
    id: 'PermuationOptionsSingleGapSingleBeat',
    name: 'Single, gap, single (per beat)',
    notes: [0, 2],
  },
  PER_BEAT_SHAPES[1],
  {
    id: 'PermuationOptionsDoubleGapSingleBeat',
    name: 'Double, gap, single (per beat)',
    notes: [0, 1, 3],
  },
  {
    id: 'PermuationOptionsDouble2GapsSingleBeat',
    name: 'Double, 2 gaps, single (per beat)',
    notes: [0, 1, 4],
  },
  PER_BEAT_SHAPES[2],
  {
    id: 'PermuationOptionsTripleGapSingleBeat',
    name: 'Triple, gap, single (per beat)',
    notes: [0, 1, 2, 4],
  },
  { id: 'PermuationOptionsQuadsBeat', name: 'Quads (per beat)', notes: [0, 1, 2, 3] },
  { id: 'PermuationOptionsFivesBeat', name: 'Fives (per beat)', notes: [0, 1, 2, 3, 4] },
  {
    id: 'PermuationOptionsSixesBeat',
    name: 'All six (per beat)',
    notes: [0, 1, 2, 3, 4, 5],
    once: true,
  },
];

function perBeatGroups(slots, unit, notesPerBeat, shapes) {
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
  return (shapes || PER_BEAT_SHAPES).map(function (spec) {
    var starts = spec.once ? [0] : labels.map((label, start) => start);
    return {
      id: spec.id,
      name: spec.name,
      defaultOn: false,
      subLabels: spec.once ? [] : labels,
      figures: starts.map(function (start) {
        var notes = spec.notes.map((note) => start + note);
        return { hits: hitsArray(slots, inBeat(notes)) };
      }),
    };
  });
}

// Straight figures: `unit` slots per grid note, 4 grid notes per pattern.
// `labels` names the 4 positions. Only the 16ths layout in 4/4 keeps a link to
// the original section numbers, for the hand-written "Simplify multiple kicks"
// bars. `slots`: the bar's 32nd notes (32 in 4/4).
function straightLayout(mode, unit, labels, pairName, pairLabels, extraGroups, slots) {
  slots = slots || 32;
  var simplifiable = mode == 'sixteenths' && slots == 32;
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
    return simplifiable ? section : undefined;
  };
  var figure = function (isHit, legacySection) {
    return { hits: hitsArray(slots, isHit), legacy16th: legacy(legacySection) };
  };
  var positions = [0, 1, 2, 3];

  return {
    mode: mode,
    slots: slots,
    unit: unit,
    simplifyAllowed: simplifiable,
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
// and every 4th note (4 starting points), where they repeat evenly in the bar.
// `slots`: the bar's slots (48 in 4/4). Compound x/8 bars ("compound8",
// "compound16") have the same figures over their dotted-quarter beats.
function tripletLayout(mode, unit, labels, every2Labels, every4Labels, slots) {
  slots = slots || 48;
  var notes = slots / unit;
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

  var ostinato = {
    id: 'PermuationOptionsOstinato',
    name: 'Ostinato',
    defaultOn: false,
    subLabels: [],
    figures: [figure(() => false)],
  };
  var singles = {
    id: 'PermuationOptionsSingles',
    name: 'Singles',
    defaultOn: true,
    subLabels: labels,
    figures: positions.map((p) => figure(at(p))),
  };
  var doubles = {
    id: 'PermuationOptionsDoubles',
    name: 'Doubles',
    defaultOn: true,
    subLabels: labels,
    figures: positions.map((p) => figure(any([p, p + 1]))),
  };
  var crossRhythms = [];
  if (notes % 2 === 0)
    crossRhythms.push({
      id: 'PermuationOptionsEvery2nd',
      name: 'Cross-rhythm: every 2nd note',
      defaultOn: true,
      subLabels: every2Labels,
      figures: [0, 1].map((start) => figure(everyNth(2, start))),
    });
  if (notes % 4 === 0)
    crossRhythms.push({
      id: 'PermuationOptionsEvery4th',
      name: 'Cross-rhythm: every 4th note',
      defaultOn: true,
      subLabels: every4Labels,
      figures: [0, 1, 2, 3].map((start) => figure(everyNth(4, start))),
    });
  var layout = {
    mode: mode,
    slots: slots,
    unit: unit,
    simplifyAllowed: false,
    groups: [ostinato, singles, doubles].concat(crossRhythms),
  };
  if (mode == 'triplets16' || mode == 'compound16') {
    // the figures over a whole beat (all 6 notes) first, then the ones that
    // repeat inside the beat: twice (Singles, Doubles), three times (every 2nd note)
    singles.name = 'Singles (twice a beat)';
    doubles.name = 'Doubles (twice a beat)';
    layout.groups = [ostinato]
      .concat(perBeatGroups(slots, unit, 6, SEXTUPLET_SHAPES), [singles, doubles])
      .concat(crossRhythms);
  }
  if (mode == 'triplets16' && slots == 48) {
    // links from before October 2026 have ticks for these groups, in this order
    layout.groupsInOlderLinks = [
      ostinato.id,
      singles.id,
      doubles.id,
      'PermuationOptionsSinglesBeat',
      'PermuationOptionsDoublesBeat',
      'PermuationOptionsTriplesBeat',
    ].concat(
      crossRhythms.map(function (group) {
        return group.id;
      })
    );
  }
  return layout;
}

/**
 * The permutation figure groups for a note setting (time division) in a time
 * signature, or null when there are none for it (Infinity Drumming, 2026: x/4
 * bars in 1/16 and 1/32 notes and both triplet settings, and in 8ths with an
 * even number of beats; compound x/8 bars (3/8, 6/8, 9/8, 12/8, 15/8) in 8ths and
 * 16ths, their dotted-quarter beats having the triplet figures; 4/4 in every
 * note setting).
 *
 * @param {number} timeDivision  4, 8, 16, 32, or triplet forms 12, 24, 48.
 * @param {number} [top]  the time signature (4/4 if not given)
 * @param {number} [bottom]
 */
export function getPermutationLayout(timeDivision, top, bottom) {
  top = top || 4;
  bottom = bottom || 4;
  if (top == 4 && bottom == 4) timeDivision = fourFourDivision(timeDivision);
  if (bottom == 4) return quarterBeatsLayout(timeDivision, top);
  if (bottom == 8 && top % 3 === 0) return compoundLayout(timeDivision, top);
  return null;
}

// 4/4 has figures in every note setting: 1/4 notes have the 1/8 figures, the
// Mixed setting the 1/8 triplet ones, and any other the 1/16 ones
function fourFourDivision(timeDivision) {
  if (timeDivision == 4) return 8;
  if (timeDivision == 48) return 12;
  return [8, 12, 16, 24, 32].indexOf(timeDivision) >= 0 ? timeDivision : 16;
}

// x/4 bars: the figures go beat by beat (the 1/8 ones two beats at a time)
function quarterBeatsLayout(timeDivision, top) {
  var straight = top * 8; // the bar's 32nd notes
  switch (timeDivision) {
    case 12:
      return tripletLayout(
        'triplets8',
        4,
        ['1', '&', 'a'],
        ['1', '&'],
        ['1', '&', 'a', '2'],
        top * 12
      );
    case 24:
      return tripletLayout(
        'triplets16',
        2,
        ['1', '&', 'a'],
        ['1st', '2nd'],
        ['1st', '2nd', '3rd', '4th'],
        top * 12
      );
    case 32:
      return straightLayout(
        'thirtyseconds',
        1,
        ['1st', '2nd', '3rd', '4th'],
        '16ths / Off-beat 32nds',
        ['16ths', 'off 32nds'],
        perBeatGroups(straight, 1, 8),
        straight
      );
    case 8:
      if (top % 2) return null;
      return straightLayout(
        'eighths',
        4,
        ['1', '&', '2', '&'],
        'Quarter notes / Off-beat 8ths',
        ['4ths', 'off 8ths'],
        undefined,
        straight
      );
    case 16:
      return straightLayout(
        'sixteenths',
        2,
        ['1', 'e', '&', 'a'],
        '8th notes / Off-beat 16ths',
        ['8ths', 'off 16ths'],
        undefined,
        straight
      );
    default:
      return null;
  }
}

// compound x/8 bars: dotted-quarter beats of 3 eighths or 6 sixteenths, with the
// 1/8 and 1/16 triplet figures beat for beat
function compoundLayout(timeDivision, top) {
  var slots = top * 4; // the bar's 32nd notes
  if (timeDivision == 8)
    // labelled as x/8 eighths are counted: 1 2 3 4 5 6
    return tripletLayout('compound8', 4, ['1', '2', '3'], ['1', '2'], ['1', '2', '3', '4'], slots);
  if (timeDivision == 16)
    return tripletLayout(
      'compound16',
      2,
      ['1st', '2nd', '3rd'],
      ['1st', '2nd'],
      ['1st', '2nd', '3rd', '4th'],
      slots
    );
  return null;
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

// The heading over a group's first bar: its name, and how its bars are played
// ("Singles   (fat back, play each ×4)").
function groupHeading(section, repeats, fatBack) {
  if (section.groupIndex === 0) return 'P:Ostinato\n';
  var notes = [];
  if (fatBack) notes.push('fat back');
  if (repeats > 1) notes.push('play each ×' + repeats);
  return (
    'T: \nP: ' + section.group.name + (notes.length ? '   (' + notes.join(', ') + ')' : '') + '\n'
  );
}

// A permutation plays over the groove's first bars, its ostinato, this many at
// most: each figure over every bar of it (Infinity Drumming, 2026).
export var MAX_OSTINATO_BARS = 5;

// ABC that goes before / after one bar of a permutation. `shownIndex` is the
// figure's position among the shown figures of its group; `lastInGroup` marks
// the last one. Two bars per line; the group name is printed over its first bar.
// `nextBarNumber` (optional): the number in the run of the bar shown after this
// one; the music prints it at the start of that bar (a number set in a bar takes
// effect at its closing bar line; the first bar of the music has none).
// `ostinato` (optional): which bar of a multi-bar ostinato this is, {bar, bars}
// (bar from 0); the figure is written over each of them, the heading over its first.
export function getPermutationSectionABC(
  section,
  shownIndex,
  lastInGroup,
  repeats,
  nextBarNumber,
  barsPerLine,
  fatBack,
  ostinato
) {
  var bar = ostinato ? ostinato.bar : 0;
  var bars = ostinato ? ostinato.bars : 1;
  var pre = '';
  if (nextBarNumber) pre += '%%setbarnb ' + nextBarNumber + '\n';
  if (shownIndex === 0 && bar === 0) pre += groupHeading(section, repeats, fatBack);
  pre += '%\n% ' + figureName(section) + (bars > 1 ? ', ostinato bar ' + (bar + 1) : '') + '\n%\n';

  // two bars a line, or one (dense bars on a phone, see abcNotation.musicLayout),
  // or as many as the device's Music spacing says (Infinity Drumming, 2026)
  var place = shownIndex * bars + bar; // the bar's place in its group
  var post;
  if (lastInGroup && bar == bars - 1) post = '|\n';
  else if ((place + 1) % (barsPerLine || 2) == 0) post = '\n';
  else post = '\\\n';

  return { pre: pre, post: post };
}

/**
 * Infinity Drumming, 2026: the bars of the alphabet being practised, in one run of
 * lines, `barsPerLine` a line, so that every bar can be as wide (each group's
 * heading would start its lines again, a line of its own spaced alone): the
 * heading goes over its group's first bar instead, as a part label.
 * @param {{pre: string, post: string}[]} bars  every bar's ABC before / after, in order
 * @param {number} barsPerLine
 * @returns {{pre: string, post: string, label: string}[]}  label: '' for none
 */
export function practisedBarsABC(bars, barsPerLine) {
  return bars.map(function (abc, i) {
    var label = '';
    var pre = abc.pre.replace(/^(?:T: \n)?P: ?(.*)\n/m, function (heading, name) {
      label = name;
      return '';
    });
    var post;
    if (i == bars.length - 1) post = '|\n';
    else if ((i + 1) % barsPerLine == 0) post = '\n';
    else post = '\\\n';
    return { pre: pre, post: post, label: label };
  });
}

// "Singles on "e""
function figureName(section) {
  return section.group.name + (section.label ? ' on "' + section.label + '"' : '');
}

// One bar of kicks for a figure. "Simplify multiple kicks" (1/16 notes only)
// uses the original hand-written bars, which leave out some kicks.
export function getPermutationKickArray(section, simplify) {
  if (simplify && section.figure.legacy16th !== undefined)
    return get_kick16th_minus_some_strait_permutation_array(section.figure.legacy16th);
  return section.figure.hits.map((hit) => (hit ? constant_ABC_KI_Normal : false));
}

/**
 * "Fat back" (Infinity Drumming, 2026): a bar of kicks without the kicks that
 * land with the snare's backbeat, i.e. wherever the groove's snare plays
 * (accents, normal hits, cross sticks, buzzes, flams...), its ghost notes aside.
 *
 * @param {Array<string|false>} kick_array
 * @param {Array<string|false>} snare_array  the groove's snare, the same length
 */
export function fatBackKickArray(kick_array, snare_array) {
  return kick_array.map(function (kick, i) {
    var snare = snare_array[i];
    var backbeat = !!snare && withoutDiddle(withoutGrace(snare)) != constant_ABC_SN_Ghost;
    return backbeat ? false : kick;
  });
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
    var feet = bareFeet(old_kick_array[i]);
    if (feet == constant_ABC_KI_Splash || feet == constant_ABC_KI_SandK)
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
          bareFeet(secondary_kick_array[i]) == constant_ABC_KI_SandK ||
          bareFeet(secondary_kick_array[i]) == constant_ABC_KI_Splash
        )
          new_kick_array.push(constant_ABC_KI_SandK);
        else new_kick_array.push(constant_ABC_KI_Normal);
        break;

      case constant_ABC_KI_Splash:
        if (
          bareFeet(secondary_kick_array[i]) == constant_ABC_KI_Normal ||
          bareFeet(secondary_kick_array[i]) == constant_ABC_KI_SandK
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

// --- Practising some bars of a run or a groove (Infinity Drumming, 2026) ----------
// "3-6, 9": bars 3 to 6 and bar 9 of the run (numbered like the music). Spaces
// or anything else can part them too ("2 5"), and "3 to 6" or "3–6" is a range:
// an iPhone's keyboard is on its letters to start with.

/**
 * The bars a list names, in order, only those from 1 to `count`; [] for all bars.
 * @param {string} text  e.g. "5", "3-6", "2, 5, 9-10"
 * @param {number} count  bars in the run
 * @returns {number[]}
 */
export function parseBarList(text, count) {
  var bars = [];
  String(text || '')
    .replace(/to|[\u2013\u2014]/gi, '-')
    .split('-')
    .map(function (part) {
      return part.trim(); // "3 - 6" is "3-6"
    })
    .join('-')
    .split(/[^\d-]+/)
    .forEach(function (part) {
      var range = /^(\d+)(?:-(\d+))?$/.exec(part);
      if (!range) return;
      var from = parseInt(range[1], 10);
      var to = range[2] ? parseInt(range[2], 10) : from;
      var low = Math.min(from, to); // a range written backwards is fine
      var high = Math.max(from, to);
      for (var bar = Math.max(low, 1); bar <= Math.min(high, count); bar++)
        if (bars.indexOf(bar) < 0) bars.push(bar);
    });
  return bars.sort(function (a, b) {
    return a - b;
  });
}

/**
 * Bars as a list again: [3, 4, 5, 6, 9] -> "3-6, 9" ('' for none).
 * @param {number[]} bars  in order
 * @param {string} [separator]  between the parts (", " by default)
 */
export function barListToText(bars, separator) {
  var parts = [];
  for (var i = 0; i < bars.length; i++) {
    var start = bars[i];
    while (i + 1 < bars.length && bars[i + 1] == bars[i] + 1) i++;
    parts.push(start == bars[i] ? String(start) : start + '-' + bars[i]);
  }
  return parts.join(separator === undefined ? ', ' : separator);
}

/** The most times one bar of an order plays (as "Play each bar" goes). */
var MAX_ORDER_TIMES = 16;

/**
 * Infinity Drumming, 2026: the bars to practise as typed, in the order they play:
 * "1 2 1 3", "1x4 2x2 1x4 3" (bar 1 four times...), "1-4x2" (each of 1 to 4
 * twice), "1-4 1-4 7", "6-3" (6, 5, 4, 3). Bars past the run are left out.
 * @param {string} text
 * @param {number} count  the bars of the run
 * @returns {{bar: number, times: number}[]}  bars from 1; times 0: as "Play each bar" says
 */
export function parseBarOrder(text, count) {
  var order = [];
  var entry = /(\d+)(?:-(\d+))?(?:x(\d+))?/g;
  var tidy = String(text || '')
    .toLowerCase()
    .replace(/to|[\u2013\u2014]/g, '-')
    .replace(/[\u00d7*]/g, 'x')
    .split(/([-x])/)
    .map(function (part) {
      return part.trim(); // "3 - 6 x 2" is "3-6x2"
    })
    .join('');
  var match;
  while ((match = entry.exec(tidy))) {
    var from = parseInt(match[1], 10);
    var to = match[2] ? parseInt(match[2], 10) : from;
    var times = match[3] ? Math.min(Math.max(parseInt(match[3], 10), 1), MAX_ORDER_TIMES) : 0;
    var step = to < from ? -1 : 1;
    for (var n = 0; n <= Math.abs(to - from); n++) {
      var bar = from + n * step;
      if (bar >= 1 && bar <= count) order.push({ bar: bar, times: times });
    }
  }
  return order;
}

/**
 * Whether an order is just some bars, each once, from first to last ("3-6, 9"):
 * those play as practised bars always have, each "Play each bar" times.
 * @param {{bar: number, times: number}[]} order
 */
export function isPlainOrder(order) {
  return order.every(function (entry, i) {
    return !entry.times && (i === 0 || entry.bar > order[i - 1].bar);
  });
}

/**
 * An order as the box shows it: three or more bars one after another with the
 * same times as a range ("1-4x2 7 1x4", "1 2 1 3").
 * @param {{bar: number, times: number}[]} order
 */
export function barOrderToText(order) {
  var parts = [];
  var i = 0;
  while (i < order.length) {
    var start = order[i];
    var end = i;
    while (
      end + 1 < order.length &&
      order[end + 1].bar == order[end].bar + 1 &&
      order[end + 1].times == start.times
    )
      end++;
    if (end - i < 2) end = i; // (two in a row stay apart)
    var bars = end == i ? String(start.bar) : start.bar + '-' + order[end].bar;
    parts.push(bars + (start.times ? 'x' + start.times : ''));
    i = end + 1;
  }
  return parts.join(' ');
}
