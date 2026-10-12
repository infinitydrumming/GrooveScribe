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

// slots between the notes of each choice
var STEP = { e: 6, s: 3, t: 4, x: 2, q: 8, a: 1 };

// the choices for a beat, in menu order, by the bottom of the time signature
var CHOICES = {
  4: [
    { char: 'e', label: '8ths', beats: 1 },
    { char: 's', label: '16ths', beats: 1 },
    { char: 't', label: '8th triplets', beats: 1 },
    { char: 'x', label: '16th triplets', beats: 1 },
    { char: 'q', label: 'Quarter-note triplets', beats: 2 },
    { char: 'a', label: '32nd-note triplets', beats: 1 },
  ],
  8: [
    { char: 'e', label: 'One 8th note', beats: 1 },
    { char: 's', label: '16ths', beats: 1 },
    { char: 'x', label: '16th triplets', beats: 1 },
    { char: 't', label: '8th triplets', beats: 2 },
    { char: 'a', label: '32nd-note triplets', beats: 1 },
  ],
};

// the note setting a whole groove of one choice is, by the bottom of the time signature
var DIVISION_FOR_CHOICE = { e: 8, s: 16, t: 12, x: 24 };

/** Whether a time signature can have beat-by-beat notes (x/4 and x/8). */
export function hasBeatNotes(sig) {
  return !!sig && !!CHOICES[sig.bottom];
}

/** How many grid slots a beat has: 12 in x/4, 6 in x/8. */
export function beatSlots(sig) {
  return 48 / sig.bottom;
}

/** The choices for a beat in this time signature ({char, label, beats}). */
export function beatChoices(sig) {
  return CHOICES[sig.bottom] || [];
}

function choiceFor(char, sig) {
  var list = beatChoices(sig);
  for (var i = 0; i < list.length; i++) if (list[i].char == char) return list[i];
  return null;
}

/** The choice that a groove all in one note setting has on every beat ('s' for 16ths). */
export function beatCharForDivision(division, sig) {
  for (var char in DIVISION_FOR_CHOICE)
    if (DIVISION_FOR_CHOICE[char] == division && choiceFor(char, sig)) {
      // 8th triplets in x/8 cover two beats
      if (choiceFor(char, sig).beats > 1 && sig.top % 2) return null;
      return char;
    }
  return division == 48 ? 'a' : null;
}

/**
 * A bar's beats, made whole: one valid choice a beat, and a choice over two
 * beats only where both beats have it (else `fallback`, 16ths by default).
 */
export function normalizeBeats(text, sig, fallback) {
  fallback = fallback || 's';
  var chars = String(text || '').split('');
  var out = '';
  var k;
  for (var beat = 0; beat < sig.top;) {
    var choice = choiceFor(chars[beat], sig);
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
export function beatGroups(text, sig) {
  var beats = normalizeBeats(text, sig);
  var size = beatSlots(sig);
  var groups = [];
  for (var beat = 0; beat < sig.top;) {
    var choice = choiceFor(beats[beat], sig);
    groups.push({
      beat: beat,
      beats: choice.beats,
      char: choice.char,
      start: beat * size,
      span: choice.beats * size,
      step: STEP[choice.char],
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
 * @param {Array<Array<string|false>>} lines  the bar's lines, at 12 slots a quarter note
 * @param {number} start  where the bar starts in them
 */
export function inferBeats(lines, start, sig) {
  var size = beatSlots(sig);
  var order = sig.bottom == 8 ? ['e', 's', 'x', 'a'] : ['e', 's', 't', 'x', 'a'];
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
          return offset % STEP[char] === 0;
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
 * 16ths, ...), so it can go back to it; 48 (Mixed) otherwise.
 * @param {string[]} bars  each bar's beats
 * @param {{top: number, bottom: number}[]} sigs  each bar's time signature
 */
export function divisionForBeats(bars, sigs) {
  var chars = bars.join('').split('');
  var char = chars[0];
  if (!DIVISION_FOR_CHOICE[char]) return 48;
  for (var c = 1; c < chars.length; c++) if (chars[c] != char) return 48;
  var division = DIVISION_FOR_CHOICE[char];
  for (var b = 0; b < sigs.length; b++) {
    var count = (division / sigs[b].bottom) * sigs[b].top;
    if (count % 1 !== 0) return 48;
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
var COUNTS = {
  4: {
    e: { 0: 'N', 6: '&' },
    s: { 0: 'N', 3: 'e', 6: '&', 9: 'a' },
    t: { 0: 'N', 4: '&', 8: 'a' },
    x: { 0: 'N', 2: '&', 4: 'a', 6: 'N', 8: '&', 10: 'a' },
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
function countAt(groups, sig, slot) {
  var group = groupAt(groups, slot);
  if (!group) return null;
  var table = (COUNTS[sig.bottom] || {})[group.char] || {};
  var said = table[slot - group.start];
  if (!said) return null;
  return said == 'N' ? String(group.beat + 1) : said;
}

/**
 * The beat plan of some bars (each bar's beats and time signature, every bar
 * `slotsPerBar` slots apart), for the music writers: slot i is in bar
 * floor(i / slotsPerBar).
 */
export function makeBeatPlan(bars, sigs) {
  var groups = bars.map(function (beats, b) {
    return beatGroups(beats, sigs[b]);
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
      return sigs[bar] ? countAt(groups[bar] || [], sigs[bar], slot) : null;
    },
  };
}
