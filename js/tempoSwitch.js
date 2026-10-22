// Infinity Drumming, 2026: a tempo change while a groove plays takes effect at the
// next bar line.
//
// The player plays each time round from one MIDI file (a whole permutation run can
// last minutes), so a new tempo used to wait for the round to end. Instead the
// round is built again at the new tempo, and just after the last note before the
// next bar line the player carries on in the new MIDI from the same place. These
// are the sums for that; groove_utils.js does the moving.
//
// Times are in ms, as MIDI.js's player counts them: its event list holds
// [event, ms since the event before], and its clock starts at 0.5 ms.

/**
 * The time of each event in a MIDI.js event list, and which are notes (the
 * events the player reports as they play).
 *
 * @param {Array<Array<any>>} data
 * @returns {{times: number[], notes: boolean[]}}
 */
export function eventTimes(data) {
  var times = [];
  var notes = [];
  var time = 0.5;
  for (var n = 0; n < data.length; n++) {
    time += data[n][1];
    times.push(time);
    var event = data[n][0] && data[n][0].event;
    notes.push(
      !!event &&
        event.type == 'channel' &&
        (event.subtype == 'noteOn' || event.subtype == 'noteOff')
    );
  }
  return { times: times, notes: notes };
}

// How far from a bar line a note can be and still be on it: the MIDI's whole
// ticks round the bar lines a little
function onTheLine(barMs) {
  return Math.min(10, Math.max(2, barMs / 150));
}

/**
 * The time of the last note before a bar line, or -1.
 *
 * @param {{times: number[], notes: boolean[]}} events  from eventTimes
 * @param {number} barLine
 * @param {number} barMs  the length of the bar before the line
 */
export function lastNoteBefore(events, barLine, barMs) {
  var last = -1;
  var before = barLine - onTheLine(barMs);
  for (var n = 0; n < events.times.length && events.times[n] < before; n++)
    if (events.notes[n]) last = events.times[n];
  return last;
}

/**
 * Where to move: the first bar line inside the round whose last note before it is
 * still to come. `now` is the time of the last note played. Returns that note's
 * time in the playing MIDI and in the new one, and the bar line (1: the line after
 * the first bar), or null when no bar line is left (the round's end takes the new
 * tempo anyway).
 *
 * @param {{times: number[], notes: boolean[]}} playing
 * @param {{times: number[], notes: boolean[]}} next
 * @param {number[]} oldBarMs  the round's bars at the playing tempo
 * @param {number[]} newBarMs  and at the new one
 * @param {number} now
 * @returns {{oldTrigger: number, newTrigger: number, bar: number} | null}
 */
export function planTempoSwitch(playing, next, oldBarMs, newBarMs, now) {
  if (oldBarMs.length != newBarMs.length) return null;
  var oldLine = 0.5;
  var newLine = 0.5;
  for (var bar = 1; bar < oldBarMs.length; bar++) {
    oldLine += oldBarMs[bar - 1];
    newLine += newBarMs[bar - 1];
    var oldTrigger = lastNoteBefore(playing, oldLine, oldBarMs[bar - 1]);
    if (oldTrigger <= now) continue; // already played: the next bar line
    var newTrigger = lastNoteBefore(next, newLine, newBarMs[bar - 1]);
    if (newTrigger < 0) continue;
    return { oldTrigger: oldTrigger, newTrigger: newTrigger, bar: bar };
  }
  return null;
}

/**
 * The player starts again from the note after `from` as if it were `from`'s
 * moment; it gets there `late` ms after that moment, so the wait for that next
 * note is shortened by as much (never past `from`). Changes `data` in place.
 *
 * @param {Array<Array<any>>} data  the new MIDI's event list
 * @param {number[]} times  its event times
 * @param {number} from  the time the player starts after
 * @param {number} late
 */
export function catchUp(data, times, from, late) {
  for (var n = 0; n < data.length; n++) {
    if (times[n] <= from) continue;
    var spare = times[n] - from - 0.5; // stays after where the player starts
    data[n][1] -= Math.max(0, Math.min(late, spare));
    return;
  }
}
