// Infinity Drumming, 2026: the playback cursor through rests.
//
// While the editor plays, a silent marker comes on every grid note with nothing on it
// (groove_writer's restMarkers), so the cursor moves on through rests.  In the sheet
// music, the rests abc2svg draws are noted as it draws them (nothing is added to the
// music), with their times from its model, and a grid note in a gap between notes
// picks the rest written at that point of the gap.

var NOTE = 8; // abc2svg's symbol types
var REST = 10;

/**
 * Notes the rests (and the notes around them) while abc2svg draws a piece of music.
 * `take` is its get_abcmodel (the times of every note and rest, before they're drawn),
 * `drawn` its anno_stop (`note` and `rest` what that notes).  `firstNote`: the number of
 * the first note's highlight box (below 0 for the legend's).
 */
export function createRestNotes(firstNote) {
  var nextNote = firstNote || 0;
  /** @type {Object<number, {time: number, dur: number, invisible: boolean}>} by istart */
  var symbols = {};
  var end = 0; // where the music taken so far ends
  /** @type {{notes: number[], rests: {after: number, time: number, dur: number, w: number, glyph: number}[], glyphs: number}} */
  var written = { notes: [], rests: [], glyphs: 0 };
  return {
    written: written,
    /** abc2svg's model of a block of music (a new block's times may start again) */
    take: function (tsfirst) {
      var offset = tsfirst && tsfirst.time < end ? end - tsfirst.time : 0;
      for (var s = tsfirst; s; s = s.ts_next) {
        if (s.type != NOTE && s.type != REST) continue;
        symbols[s.istart] = { time: s.time + offset, dur: s.dur, invisible: !!s.invisible };
        end = Math.max(end, s.time + offset + s.dur);
      }
    },
    /** a symbol drawn (abc2svg's anno_stop: its type, where it starts in the music, its width) */
    drawn: function (type, istart, w) {
      if (type == 'note') this.note(nextNote++, istart);
      if (type == 'rest') this.rest(nextNote - 1, istart, w);
    },
    /** a note drawn: the index of its highlight box */
    note: function (index, istart) {
      var s = symbols[istart];
      if (s && index >= 0) written.notes[index] = s.time;
    },
    /** a rest drawn (`after`: the index of the note before it), `w` wide */
    rest: function (after, istart, w) {
      var s = symbols[istart];
      if (!s || s.invisible) return; // (spacers)
      var glyph = written.glyphs++;
      if (after >= -1)
        written.rests.push({ after: after, time: s.time, dur: s.dur, w: w, glyph: glyph });
    },
  };
}

/**
 * The rest the cursor is on at a place in the music: the rest drawn (its glyph's
 * number among the rests drawn), or null on a note or in a note's length.
 * @param {{notes: number[], rests: {after: number, time: number, dur: number, glyph: number}[]}} written
 * @param {boolean[]} mapping  the note slots of the music (true where a note is written)
 * @param {number} position  the place, in slots (as the notes' cursor: the last slot before it)
 */
export function restAt(written, mapping, position) {
  var slot = Math.ceil(position) - 1;
  if (slot < 0 || slot >= mapping.length || mapping[slot]) return null;
  var around = notesAround(mapping, slot);
  var j = around.before;
  var from = around.from;
  var to = around.to;
  var gap = written.rests.filter(function (rest) {
    return rest.after == j;
  });
  if (!gap.length) return null;
  var last = gap[gap.length - 1];
  var start = j >= 0 ? written.notes[j] : gap[0].time;
  var stop = written.notes[j + 1];
  if (stop === undefined) stop = last.time + last.dur;
  if (start === undefined) return null;
  // the time written at this point of the gap, and the last rest started by then
  var at = start + ((slot - from) / (to - from)) * (stop - start);
  var found = null;
  gap.forEach(function (rest) {
    if (rest.time <= at + 1e-6) found = rest;
  });
  return found;
}

// The notes around a slot of the music: the note before it (its number, -1 for none,
// and its slot, 0 for none) and the next note's slot (the music's end for none).
function notesAround(mapping, slot) {
  var before = -1;
  var from = 0;
  for (var i = 0; i <= slot; i++)
    if (mapping[i]) {
      before++;
      from = i;
    }
  var to = mapping.length;
  for (var k = mapping.length - 1; k > slot; k--) if (mapping[k]) to = k;
  return { before: before, from: from, to: to };
}
