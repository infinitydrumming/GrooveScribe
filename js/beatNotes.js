// Infinity Drumming, 2026: notes beat by beat.
//
// In the Mixed note setting (Div=48) the grid has 12 slots to a quarter note (6 to
// an 8th note), enough for 8ths, 16ths and every kind of triplet.  Each beat says
// which of its slots it uses, one character a beat ("ssqq": two beats of 16ths,
// then quarter-note triplets over beats 3 and 4), so the grid shows only those
// and the music is written to match:
//   e  8th notes            s  16th notes
//   t  8th-note triplets    x  16th-note triplets (sextuplets)
//   q  quarter-note triplets, over this beat and the next
//   a  every slot (32nd-note triplets), as the Mixed grid always was
// A beat is the bottom of the time signature: a quarter note in x/4 bars, an 8th
// note in x/8 bars.  In x/8 bars "e" is one 8th note, "s" two 16ths, "x" a
// 16th-note triplet and "t" an 8th-note triplet over this beat and the next.
// Links carry them as "Beats=ssqq,ssss" (one group per bar).
//
// 32nd notes don't fit that grid, so a groove with a beat of them is on the
// 32nds grid instead (Div=32 with Beats=, 8 slots to a quarter note), where a
// beat has 8ths, 16ths or
//   d  32nd notes
// A groove with both triplets and 32nd notes is on the fine grid (Div=96, 24 slots
// to a quarter note, Infinity Drumming, 2026), where a beat can have any of them;
// only such a groove is, so the others keep their grids and links.  The functions
// below take the grid (48, 32 or 96) last, 48 when it isn't given.

// slots between the notes of each choice, on each grid
var STEPS = {
  48: { e: 6, s: 3, t: 4, x: 2, q: 8, a: 1 },
  32: { e: 4, s: 2, d: 1 },
  96: { e: 12, s: 6, d: 3, t: 8, x: 4, q: 16, a: 2 },
};

// the choices for a beat, in menu order, by the bottom of the time signature
var CHOICES = {
  4: [
    { char: 'e', label: '8ths', beats: 1 },
    { char: 's', label: '16ths', beats: 1 },
    { char: 'd', label: '32nds', beats: 1 },
    { char: 't', label: '8th triplets', beats: 1 },
    { char: 'x', label: '16th triplets', beats: 1 },
    { char: 'q', label: 'Quarter-note triplets', beats: 2 },
    { char: 'a', label: '32nd-note triplets', beats: 1 },
  ],
  8: [
    { char: 'e', label: 'One 8th note', beats: 1 },
    { char: 's', label: '16ths', beats: 1 },
    { char: 'd', label: '32nds', beats: 1 },
    { char: 'x', label: '16th triplets', beats: 1 },
    { char: 't', label: '8th triplets', beats: 2 },
    { char: 'a', label: '32nd-note triplets', beats: 1 },
  ],
};

// the note setting a whole groove of one choice is, by the bottom of the time signature
var DIVISION_FOR_CHOICE = { e: 8, s: 16, t: 12, x: 24, d: 32 };

/** The grid a choice needs: 32 for 32nds, 48 for triplets, 0 for either (8ths, 16ths). */
export function gridOfChoice(char) {
  if (char == 'd') return 32;
  return char == 'e' || char == 's' ? 0 : 48;
}

/** The grid some beats need: 32 or 48, 0 for either, 96 for both (32nds and triplets). */
export function gridOfBeats(text) {
  var grid = 0;
  var chars = String(text || '').split('');
  for (var c = 0; c < chars.length; c++) {
    var needs = gridOfChoice(chars[c]);
    if (needs && grid && needs != grid) return 96;
    grid = needs || grid;
  }
  return grid;
}

/** Whether a time signature can have beat-by-beat notes (x/4 and x/8). */
export function hasBeatNotes(sig) {
  return !!sig && !!CHOICES[sig.bottom];
}

/** How many grid slots a beat has: 12 in x/4, 6 in x/8 (8 and 4 on the 32nds grid, 24 and 12 on the fine grid). */
export function beatSlots(sig, grid) {
  return (grid || 48) / sig.bottom;
}

/** The choices for a beat in this time signature ({char, label, beats}), on either grid. */
export function beatChoices(sig) {
  return CHOICES[sig.bottom] || [];
}

function choiceFor(char, sig, grid) {
  if (!(char in STEPS[grid || 48])) return null;
  var list = beatChoices(sig);
  for (var i = 0; i < list.length; i++) if (list[i].char == char) return list[i];
  return null;
}

/** The choice that a groove all in one note setting has on every beat ('s' for 16ths). */
export function beatCharForDivision(division, sig) {
  for (var char in DIVISION_FOR_CHOICE) {
    var choice = choiceFor(char, sig, gridOfChoice(char) || 48);
    if (DIVISION_FOR_CHOICE[char] == division && choice) {
      // 8th triplets in x/8 cover two beats
      if (choice.beats > 1 && sig.top % 2) return null;
      return char;
    }
  }
  return division == 48 ? 'a' : null;
}

/**
 * A bar's beats, made whole: one valid choice a beat, and a choice over two
 * beats only where both beats have it (else `fallback`, 16ths by default).
 */
export function normalizeBeats(text, sig, fallback, grid) {
  fallback = fallback || 's';
  var chars = String(text || '').split('');
  var out = '';
  var k;
  for (var beat = 0; beat < sig.top;) {
    var choice = choiceFor(chars[beat], sig, grid);
    if (!choice) {
      out += fallback;
      beat++;
      continue;
    }
    var whole = beat + choice.beats <= sig.top;
    for (k = 1; whole && k < choice.beats; k++) whole = chars[beat + k] == choice.char;
    if (!whole) {
      out += fallback;
      beat++;
      continue;
    }
    for (k = 0; k < choice.beats; k++) out += choice.char;
    beat += choice.beats;
  }
  return out;
}

/**
 * A bar's groups: each beat, or the two beats of a triplet over two beats.
 * @returns {{beat: number, beats: number, char: string, start: number, span: number, step: number}[]}
 *   start / span / step in grid slots from the start of the bar
 */
export function beatGroups(text, sig, grid) {
  var beats = normalizeBeats(text, sig, undefined, grid);
  var size = beatSlots(sig, grid);
  var groups = [];
  for (var beat = 0; beat < sig.top;) {
    var choice = choiceFor(beats[beat], sig, grid);
    groups.push({
      beat: beat,
      beats: choice.beats,
      char: choice.char,
      start: beat * size,
      span: choice.beats * size,
      step: STEPS[grid || 48][choice.char],
    });
    beat += choice.beats;
  }
  return groups;
}

/** The group a slot of the bar is in. */
export function groupAt(groups, slot) {
  for (var g = 0; g < groups.length; g++)
    if (slot >= groups[g].start && slot < groups[g].start + groups[g].span) return groups[g];
  return null;
}

/** Whether a slot of the bar is on its beat's notes (shown on the grid). */
export function slotIsUsed(groups, slot) {
  var group = groupAt(groups, slot);
  return !!group && (slot - group.start) % group.step === 0;
}

/**
 * Each beat's choice from the notes in it, for a Mixed bar that doesn't say:
 * the plainest choice its notes all fit (8ths, then 16ths, triplets...).  An empty
 * beat takes its neighbour's.  Quarter-note triplets are never guessed.
 * @param {Array<Array<string|false>>} lines  the bar's lines, at 12 slots a quarter note (8 on the 32nds grid)
 * @param {number} start  where the bar starts in them
 */
export function inferBeats(lines, start, sig, grid) {
  var size = beatSlots(sig, grid);
  var step = STEPS[grid || 48];
  var order = sig.bottom == 8 ? ['e', 's', 'x', 'a'] : ['e', 's', 't', 'x', 'a'];
  if (grid == 32) order = ['e', 's', 'd'];
  if (grid == 96)
    order = sig.bottom == 8 ? ['e', 's', 'd', 'x', 'a'] : ['e', 's', 'd', 't', 'x', 'a'];
  var chars = [];
  for (var beat = 0; beat < sig.top; beat++) {
    var offsets = [];
    for (var slot = 0; slot < size; slot++) {
      var at = start + beat * size + slot;
      var used = lines.some(function (line) {
        return line && line[at];
      });
      if (used) offsets.push(slot);
    }
    if (!offsets.length) {
      chars.push(null);
      continue;
    }
    chars.push(
      order.find(function (char) {
        return offsets.every(function (offset) {
          return offset % step[char] === 0;
        });
      })
    );
  }
  // empty beats: like the beat before (or after)
  var last = chars.find(Boolean) || 's';
  return chars
    .map(function (char) {
      if (char) last = char;
      return char || last;
    })
    .join('');
}

/**
 * The note setting for a groove whose beats are all one plain choice (16 for all
 * 16ths, 32 for all 32nds ...), so it can go back to it; the grid (48, Mixed, or
 * 32) otherwise.
 * @param {string[]} bars  each bar's beats
 * @param {{top: number, bottom: number}[]} sigs  each bar's time signature
 * @param {number} [grid]  48, 32 or 96
 */
export function divisionForBeats(bars, sigs, grid) {
  grid = grid || 48;
  var chars = bars.join('').split('');
  var char = chars[0];
  if (!DIVISION_FOR_CHOICE[char]) return grid;
  for (var c = 1; c < chars.length; c++) if (chars[c] != char) return grid;
  var division = DIVISION_FOR_CHOICE[char];
  for (var b = 0; b < sigs.length; b++) {
    var count = (division / sigs[b].bottom) * sigs[b].top;
    if (count % 1 !== 0) return grid;
  }
  return division;
}

/** "Beats=" for a link: each bar's beats, comma separated. */
export function beatsToList(bars) {
  return bars.join(',');
}

/** Each bar's beats from a link's "Beats=" list ('' where a bar has none). */
export function beatsFromList(list, numberOfMeasures) {
  var parts = list ? String(decodeURIComponent(list)).split(',') : [];
  var bars = [];
  for (var bar = 0; bar < numberOfMeasures; bar++) bars.push(parts[bar] || '');
  return bars;
}

// --- counting ---------------------------------------------------------------------
// What each note of a group is counted ("1 e & a"), by its place in the group (in
// slots); the beat's number goes where it says N, the next beat's where it says M.
// 32nd notes: "1 a li bi & a la ba", short for "1 ah lee bee & ah lah bah" (as the
// 32nds note setting counts them), and in x/8 bars "1 e & a".
var COUNTS_32 = {
  4: {
    e: { 0: 'N', 4: '&' },
    s: { 0: 'N', 2: 'e', 4: '&', 6: 'a' },
    d: { 0: 'N', 1: 'a', 2: 'li', 3: 'bi', 4: '&', 5: 'a', 6: 'la', 7: 'ba' },
  },
  8: {
    e: { 0: 'N' },
    s: { 0: 'N', 2: '&' },
    d: { 0: 'N', 1: 'e', 2: '&', 3: 'a' },
  },
};
var COUNTS = {
  4: {
    e: { 0: 'N', 6: '&' },
    s: { 0: 'N', 3: 'e', 6: '&', 9: 'a' },
    t: { 0: 'N', 4: '&', 8: 'a' },
    x: { 0: 'N', 2: 'a', 4: 'li', 6: '&', 8: 'a', 10: 'la' },
    q: { 0: 'N', 8: 'a', 16: '&' },
    a: { 0: 'N', 4: '&', 8: 'a' },
  },
  8: {
    e: { 0: 'N' },
    s: { 0: 'N', 3: '&' },
    x: { 0: 'N', 2: '&', 4: 'a' },
    t: { 0: 'N', 4: 'a', 8: '&' },
    a: { 0: 'N', 2: '&', 4: 'a' },
  },
};

/** The count of a slot of the bar ('1', 'e', '&' ...), or null if none is said there. */
function countAt(groups, sig, slot, grid) {
  var group = groupAt(groups, slot);
  if (!group) return null;
  var place = slot - group.start;
  // (the fine grid: as the 32nds grid counts 32nd notes, the Mixed one the rest)
  if (grid == 96) {
    var thirtySeconds = group.char == 'd';
    if (place % (thirtySeconds ? 3 : 2)) return null;
    place /= thirtySeconds ? 3 : 2;
    grid = thirtySeconds ? 32 : 48;
  }
  var table = ((grid == 32 ? COUNTS_32 : COUNTS)[sig.bottom] || {})[group.char] || {};
  var said = table[place];
  if (!said) return null;
  return said == 'N' ? String(group.beat + 1) : said;
}

/**
 * The beat plan of some bars (each bar's beats and time signature, every bar
 * `slotsPerBar` slots apart), for the music writers: slot i is in bar
 * floor(i / slotsPerBar).  `grid`: 48 (Mixed, the default), 32 or 96.
 */
export function makeBeatPlan(bars, sigs, grid) {
  var groups = bars.map(function (beats, b) {
    return beatGroups(beats, sigs[b], grid);
  });
  return {
    groups: groups,
    sigs: sigs,
    /** how many slots the note at a slot of bar `bar` lasts on the grid */
    slotsPerNoteAt: function (slot, bar) {
      var group = groupAt(groups[bar] || [], slot);
      return group ? group.step : 1;
    },
    /** the slots between the notes of a beat of 8ths or 16ths at this slot of bar `bar` (0 for other beats) */
    straightStepAt: function (slot, bar) {
      var group = groupAt(groups[bar] || [], slot);
      return group && (group.char == 'e' || group.char == 's') ? group.step : 0;
    },
    /** a triplet over two beats starting at this slot of bar `bar`, or null */
    longTripletAt: function (slot, bar) {
      var group = groupAt(groups[bar] || [], slot);
      return group && group.beats > 1 && group.start == slot ? group : null;
    },
    /** the count said at this slot of bar `bar`, or null */
    countAt: function (slot, bar) {
      return sigs[bar] ? countAt(groups[bar] || [], sigs[bar], slot, grid) : null;
    },
  };
}
