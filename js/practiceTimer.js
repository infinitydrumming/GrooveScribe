// Infinity Drumming, 2026: the practice timer, and speed-up counted in bars.
//
// The practice timer stops playback after a number of minutes or bars, at the
// end of a bar.  Links carry it as "Practice=10m" or "Practice=16b".
//
// Playback is a loop of bars (the groove, a permutation, or a groove / click
// cycle) that the player builds again each time round.  When the practice will
// end inside the next time round, only the bars up to the end are built, so it
// stops exactly on the bar line.

/** @typedef {{ unit: 'minutes' | 'bars', amount: number }} PracticeLimit */

var MAX_MINUTES = 120;
var MAX_BARS = 999;

/**
 * A practice limit from a link's "Practice" value ("10m", "16b"), or null.
 * @returns {PracticeLimit | null}
 */
export function parsePracticeLimit(text) {
  var match = /^(\d{1,3})([mb])$/.exec(String(text || '').trim());
  if (!match) return null;
  var amount = parseInt(match[1], 10);
  if (amount < 1) return null;
  if (match[2] == 'm') return { unit: 'minutes', amount: Math.min(amount, MAX_MINUTES) };
  return { unit: 'bars', amount: Math.min(amount, MAX_BARS) };
}

/** The link's "Practice" value for a limit, or '' for none. */
export function practiceLimitToText(limit) {
  if (!limit) return '';
  return limit.amount + (limit.unit == 'minutes' ? 'm' : 'b');
}

/**
 * How many bars of the next time round to play before the practice ends, or -1
 * if it doesn't end in it.
 *
 * @param {PracticeLimit} limit
 * @param {{ bars: number, ms: number }} played  how much has been played so far
 * @param {number[]} barMs  each bar of the next time round, in milliseconds
 */
export function barsBeforePracticeEnds(limit, played, barMs) {
  if (limit.unit == 'bars') {
    var left = limit.amount - played.bars;
    return left <= barMs.length ? Math.max(left, 1) : -1;
  }
  // minutes: the bar the time runs out in is played to its end
  var ms = played.ms;
  for (var k = 0; k < barMs.length; k++) {
    ms += barMs[k];
    if (ms >= limit.amount * 60000) return k + 1;
  }
  return -1;
}

/**
 * What the player shows while practising: "4:12 left" or "12 bars left".
 *
 * @param {PracticeLimit} limit
 * @param {{ bars: number, ms: number }} played  including the bars played so far this time round
 */
export function practiceLeftText(limit, played) {
  if (limit.unit == 'bars') {
    var bars = Math.max(limit.amount - played.bars, 0);
    return bars + (bars == 1 ? ' bar left' : ' bars left');
  }
  var seconds = Math.max(Math.ceil((limit.amount * 60000 - played.ms) / 1000), 0);
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0') + ' left';
}

/**
 * Speed-up in bars: how many tempo steps are due once `barsPlayed` bars have
 * been played in all, `stepsTaken` steps having been taken already, one step
 * every `everyBars` bars.
 */
export function speedUpStepsDue(barsPlayed, stepsTaken, everyBars) {
  if (!everyBars || everyBars <= 0) return 0;
  return Math.max(Math.floor(barsPlayed / everyBars) - stepsTaken, 0);
}
