// Infinity Drumming, 2026: sections of a groove ("A" for 2 bars of paradiddles,
// then "B" for 2 bars of doubles), each played a number of times.
//
// Each bar can have a section letter; bars in a row with the same letter are one
// section, played as many times as its repeats say before the next (A ×4, then
// B ×2, then round again from A). Bars without a letter play once, where they
// are. Links carry them as "Sections=A1-2x4,B3-4x2" (a letter, its bars, its
// repeats), bars numbered from 1.

/** The letters a section can have. */
export var SECTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
/** The most times a section plays before the next. */
export var MAX_SECTION_REPEATS = 16;

/**
 * The sections: each run of bars in a row with the same letter.
 * @param {string[]} letters  each bar's letter ('' for none), bars from 0
 * @param {number[]} repeats  each bar's repeats (a section has its first bar's)
 * @param {number} count  the groove's bars
 * @returns {{letter: string, from: number, to: number, repeats: number}[]}  to: its last bar
 */
export function sectionRuns(letters, repeats, count) {
  var runs = [];
  for (var bar = 0; bar < count; bar++) {
    var letter = letters[bar] || '';
    if (!letter) continue;
    var last = runs[runs.length - 1];
    if (last && last.letter == letter && last.to == bar - 1) last.to = bar;
    else runs.push({ letter: letter, from: bar, to: bar, repeats: wholeRepeats(repeats[bar]) });
  }
  return runs;
}

function wholeRepeats(value) {
  var times = parseInt(value, 10);
  if (isNaN(times) || times < 1) return 1;
  return Math.min(times, MAX_SECTION_REPEATS);
}

/**
 * The bars in the order they play: each section as many times as it says, the
 * other bars once.
 * @returns {number[]}
 */
export function formBars(letters, repeats, count) {
  var runs = sectionRuns(letters, repeats, count);
  var bars = [];
  for (var bar = 0; bar < count; bar++) {
    var run = runs.find(function (r) {
      return r.from == bar;
    });
    if (!run) {
      if (!letters[bar]) bars.push(bar);
      continue;
    }
    for (var time = 0; time < run.repeats; time++)
      for (var b = run.from; b <= run.to; b++) bars.push(b);
  }
  return bars;
}

/** The bars with this letter (in every section that has it). */
export function barsOfSection(letters, letter, count) {
  var bars = [];
  for (var bar = 0; bar < count; bar++) if (letters[bar] == letter) bars.push(bar);
  return bars;
}

/** "Sections=" for a link ('' with none): "A1-2x4,B3-4x2". */
export function sectionsToUrl(letters, repeats, count) {
  return sectionRuns(letters, repeats, count)
    .map(function (run) {
      var bars = run.from == run.to ? String(run.from + 1) : run.from + 1 + '-' + (run.to + 1);
      return run.letter + bars + (run.repeats > 1 ? 'x' + run.repeats : '');
    })
    .join(',');
}

/**
 * A link's "Sections=" as each bar's letter and repeats.
 * @returns {{letters: string[], repeats: number[]}}
 */
export function sectionsFromUrl(text, count) {
  var letters = [];
  var repeats = [];
  for (var bar = 0; bar < count; bar++) {
    letters.push('');
    repeats.push(1);
  }
  String(text || '')
    .split(',')
    .forEach(function (part) {
      var run = /^([A-Fa-f])(\d+)(?:-(\d+))?(?:x(\d+))?$/.exec(part.trim());
      if (!run) return;
      var from = parseInt(run[2], 10) - 1;
      var to = run[3] ? parseInt(run[3], 10) - 1 : from;
      for (var bar = Math.max(from, 0); bar <= Math.min(to, count - 1); bar++) {
        letters[bar] = run[1].toUpperCase();
        repeats[bar] = wholeRepeats(run[4] || 1);
      }
    });
  return { letters: letters, repeats: repeats };
}
