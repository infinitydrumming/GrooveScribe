// Infinity Drumming, 2026: sections of a groove ("A" for 2 bars of paradiddles,
// then "B" for 2 bars of doubles), each played a number of times, in order or in
// a form ("ABAC", "ABCA ABCA").
//
// Each bar can have a section letter; bars in a row with the same letter are one
// section, played as many times as its repeats say before the next (A ×4, then
// B ×2, then round again from A). Bars without a letter play once, where they
// are. Links carry them as "Sections=A1-2x4,B3-4x2" (a letter, its bars, its
// repeats), bars numbered from 1.
//
// A repeated section can end differently each time through (1st and 2nd time
// endings): its last bars, each marked for one time ("1st time", "2nd time"),
// play only then. Links: "Endings=8:1,9-10:2" (bars, the time), bars from 1.

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
 * A repeated section's endings in effect: its last bars marked for a time
 * through it (from 1, no more than its repeats), back from its end to the first
 * bar played every time; never its first bar. Every other bar plays every time.
 * @param {number[] | undefined} endings  each bar's mark: the time (from 1) it plays, 0 every time
 * @returns {number[]}  each bar's ending in effect (0: every time)
 */
export function sectionEndings(letters, repeats, endings, count) {
  var inEffect = [];
  for (var bar = 0; bar < count; bar++) inEffect.push(0);
  sectionRuns(letters, repeats, count).forEach(function (run) {
    if (run.repeats < 2) return;
    for (var b = run.to; b > run.from; b--) {
      var time = parseInt(String((endings && endings[b]) || 0), 10);
      if (!(time >= 1 && time <= run.repeats)) break;
      inEffect[b] = time;
    }
  });
  return inEffect;
}

// a section's bars, `time` (from 0) through it: its endings for other times left out
function sectionTimeBars(run, time, inEffect) {
  var bars = [];
  for (var b = run.from; b <= run.to; b++)
    if (!inEffect[b] || inEffect[b] == time + 1) bars.push(b);
  return bars;
}

/**
 * The bars in the order they play: each section as many times as it says (each
 * time with its own ending), the other bars once.
 * @param {number[]} [endings]  each bar's ending mark (see sectionEndings)
 * @returns {number[]}
 */
export function formBars(letters, repeats, count, endings) {
  var runs = sectionRuns(letters, repeats, count);
  var inEffect = sectionEndings(letters, repeats, endings, count);
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
      bars = bars.concat(sectionTimeBars(run, time, inEffect));
  }
  return bars;
}

/** The bars with this letter (in every section that has it). */
export function barsOfSection(letters, letter, count) {
  var bars = [];
  for (var bar = 0; bar < count; bar++) if (letters[bar] == letter) bars.push(bar);
  return bars;
}

/** "Endings=" for a link ('' with none in effect): "8:1,9-10:2". */
export function endingsToUrl(letters, repeats, endings, count) {
  var inEffect = sectionEndings(letters, repeats, endings, count);
  var parts = [];
  var bar = 0;
  while (bar < count) {
    var time = inEffect[bar];
    var to = bar;
    while (to + 1 < count && inEffect[to + 1] == time) to++;
    if (time) parts.push((to > bar ? bar + 1 + '-' + (to + 1) : String(bar + 1)) + ':' + time);
    bar = to + 1;
  }
  return parts.join(',');
}

/**
 * A link's "Endings=" as each bar's ending mark (0: every time).
 * @returns {number[]}
 */
export function endingsFromUrl(text, count) {
  var endings = [];
  for (var bar = 0; bar < count; bar++) endings.push(0);
  String(text || '')
    .split(',')
    .forEach(function (part) {
      var ending = /^(\d+)(?:-(\d+))?:(\d+)$/.exec(part.trim());
      if (!ending) return;
      var from = parseInt(ending[1], 10) - 1;
      var to = ending[2] ? parseInt(ending[2], 10) - 1 : from;
      var time = Math.min(parseInt(ending[3], 10), MAX_SECTION_REPEATS);
      for (var b = Math.max(from, 0); b <= Math.min(to, count - 1); b++) endings[b] = time;
    });
  return endings;
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

/** The most letters a form has. */
export var MAX_FORM_LETTERS = 32;

/**
 * A form as typed, tidied: its section letters in capitals, a space between
 * groups ("abca abca" → "ABCA ABCA"), MAX_FORM_LETTERS at most.
 * @returns {string}
 */
export function tidyForm(text) {
  var count = 0;
  return String(text || '')
    .toUpperCase()
    .replace(/[^A-F\s]/g, '')
    .replace(/[A-F]/g, function (letter) {
      return ++count > MAX_FORM_LETTERS ? '' : letter;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The bars in the order a form plays them: each letter its section (every section
 * with that letter, each as many times as it says); letters with no section are
 * left out, and so are bars with no letter.
 * @returns {number[]}
 */
export function formOrderBars(form, letters, repeats, count, endings) {
  var runs = sectionRuns(letters, repeats, count);
  var inEffect = sectionEndings(letters, repeats, endings, count);
  var bars = [];
  tidyForm(form)
    .replace(/ /g, '')
    .split('')
    .forEach(function (letter) {
      runs.forEach(function (run) {
        if (run.letter != letter) return;
        for (var time = 0; time < run.repeats; time++)
          bars = bars.concat(sectionTimeBars(run, time, inEffect));
      });
    });
  return bars;
}

/** "Form=" for a link: "ABCA-ABCA" ('' with none). */
export function formToUrl(form) {
  return tidyForm(form).replace(/ /g, '-');
}

/** A link's "Form=" as a form. */
export function formFromUrl(text) {
  var form = String(text || '');
  try {
    form = decodeURIComponent(form);
  } catch {
    /* as it is */
  }
  return tidyForm(form.replace(/[-+_]/g, ' '));
}
