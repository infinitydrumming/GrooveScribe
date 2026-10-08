// Infinity Drumming, 2026: a time signature for each bar.
//
// A groove's TimeSig is its first bar's.  When bars differ, grooveData.barTimeSigs
// holds every bar's ({ top, bottom }), and links carry them as
// "BarSigs=4/4,4/4,2/4,4/4".  Grooves in one time signature leave it empty and
// are exactly as they always were.
//
// Every bar keeps the same number of note slots in the groove's arrays (and the
// editor's grid): as many as its longest bar needs, the "bar stride".  A shorter
// bar uses the first of its slots and leaves the rest empty, so bar b always
// starts at b * stride, as it does when all bars are the same.

import {
  calc_notes_per_measure,
  isTripletDivision,
  notesPerMeasureInFullSizeArray,
  scaleNoteArrayToFullSize,
} from './musicMath.js';

var SIG_PATTERN = /^(\d{1,2})\/(\d{1,2})$/;
var BOTTOMS = [2, 4, 8, 16];

/** A time signature "7/8" as { top: 7, bottom: 8 }, or null if it isn't one we support. */
export function parseBarSig(text) {
  var match = SIG_PATTERN.exec(String(text).trim());
  if (!match) return null;
  var top = parseInt(match[1], 10);
  var bottom = parseInt(match[2], 10);
  if (top < 1 || top > 32 || BOTTOMS.indexOf(bottom) < 0) return null;
  return { top: top, bottom: bottom };
}

/** Each bar's time signature, from a "BarSigs" list; bars it doesn't cover take the groove's. */
export function barSigsFromList(list, numberOfMeasures, top, bottom) {
  var parts = list ? String(decodeURIComponent(list)).split(',') : [];
  var sigs = [];
  for (var bar = 0; bar < numberOfMeasures; bar++) {
    sigs.push(parseBarSig(parts[bar] || '') || { top: top, bottom: bottom });
  }
  return sigs;
}

/** True when the bars don't all have the same time signature. */
export function isMixedMeter(barTimeSigs, numberOfMeasures) {
  if (!barTimeSigs || !barTimeSigs.length) return false;
  for (var bar = 1; bar < numberOfMeasures; bar++) {
    var a = barTimeSigs[bar - 1];
    var b = barTimeSigs[bar];
    if (a && b && (a.top != b.top || a.bottom != b.bottom)) return true;
  }
  return false;
}

/** The "BarSigs" list for a link: every bar's time signature, or '' when they are all the same. */
export function barSigsToList(barTimeSigs, numberOfMeasures) {
  if (!isMixedMeter(barTimeSigs, numberOfMeasures)) return '';
  var parts = [];
  for (var bar = 0; bar < numberOfMeasures; bar++)
    parts.push(barTimeSigs[bar].top + '/' + barTimeSigs[bar].bottom);
  return parts.join(',');
}

/** A bar's time signature: its own, or the groove's when the bars are all the same. */
export function barSig(barTimeSigs, bar, top, bottom) {
  return (barTimeSigs && barTimeSigs[bar]) || { top: top, bottom: bottom };
}

/** How many note slots a bar has at a note setting (1/8, 1/16, ...). */
export function barNoteCount(timeDivision, sig) {
  return calc_notes_per_measure(timeDivision, sig.top, sig.bottom);
}

/** The bar stride: the most note slots any bar has. */
export function barStride(timeDivision, barTimeSigs, numberOfMeasures, top, bottom) {
  var stride = calc_notes_per_measure(timeDivision, top, bottom);
  for (var bar = 0; bar < numberOfMeasures; bar++)
    stride = Math.max(stride, barNoteCount(timeDivision, barSig(barTimeSigs, bar, top, bottom)));
  return stride;
}

/**
 * Whether a note setting works in a bar: whole notes per bar, and triplets only
 * in x/4 bars.
 */
export function divisionFitsBar(timeDivision, sig) {
  if (barNoteCount(timeDivision, sig) % 1 !== 0) return false;
  if (timeDivision % 12 === 0 && sig.bottom != 4) return false;
  return true;
}

/**
 * Split a link's tab line into bars ("|xx-x|x-x-|" -> ["xx-x", "x-x-"]) and lay
 * them out at the bar stride, each bar scaled to its own note count.  `toValue`
 * turns a tab character into the array's value.
 */
export function barTabsToArray(tabLine, barCounts, stride, toValue) {
  var bars = decodeURIComponent(tabLine)
    .split('|')
    .filter(function (bar) {
      return bar.length > 0;
    });
  var array = [];
  for (var i = 0; i < barCounts.length * stride; i++) array.push(false);
  for (var bar = 0; bar < barCounts.length && bar < bars.length; bar++) {
    var chars = bars[bar].replace(/[:!()[\]]/g, '');
    var count = barCounts[bar];
    var charStep = 1;
    var slotStep = 1;
    if (chars.length > count && chars.length / count >= 2)
      charStep = Math.ceil(chars.length / count);
    else if (chars.length < count && count / chars.length >= 2)
      slotStep = Math.ceil(count / chars.length);
    for (var j = 0, k = 0; j < chars.length && k < count; j += charStep, k += slotStep)
      array[bar * stride + k] = toValue(chars[j]);
  }
  return array;
}

/** Each bar's slice of a stride-laid-out array, only its own note slots. */
export function barSlice(array, bar, stride, count) {
  return array.slice(bar * stride, bar * stride + count);
}

/**
 * One bar of a groove whose bars have different time signatures, every line
 * scaled up to 32nd notes (48ths in triplets) in that bar's own time signature,
 * ready for the sheet-music and MIDI builders.
 */
export function fullSizeBar(gd, bar) {
  var sig = gd.barTimeSigs[bar];
  var count = barNoteCount(gd.timeDivision, sig);
  var full = function (array) {
    return scaleNoteArrayToFullSize(
      barSlice(array || [], bar, gd.notesPerMeasure, count),
      1,
      count,
      sig.top,
      sig.bottom
    );
  };
  var toms = gd.toms_array.map(full);
  [gd.crash_array, gd.ride_array].forEach(function (cymbalArray) {
    if (cymbalArray) toms.push(full(cymbalArray));
  });
  return {
    sig: sig,
    fullCount: notesPerMeasureInFullSizeArray(
      isTripletDivision(gd.timeDivision),
      sig.top,
      sig.bottom
    ),
    sticking: full(gd.sticking_array),
    hh: full(gd.hh_array),
    snare: full(gd.snare_array),
    kick: full(gd.kick_array),
    toms: toms,
  };
}
