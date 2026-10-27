import { describe, it, expect, beforeEach } from 'vitest';
import { newGrooveUtils, installMidiGlobal } from '../helpers/legacyLoader.js';

// Infinity Drumming, 2026: the fine grid (Div=96, 24 slots a quarter note), for a
// groove whose beats have both 32nd notes and triplets. A bar needing only the
// Mixed grid, or only the 32nds grid, is written and played exactly as on it.

// every note-on in a single-track MIDI data: URL, as { tick, key }
function midiEvents(midiUrl) {
  const bytes = Uint8Array.from(atob(midiUrl.split(',')[1]), (c) => c.charCodeAt(0));
  let p = 22;
  let tick = 0;
  let status = 0;
  const events = [];
  const vlq = () => {
    let v = 0;
    let b;
    do {
      b = bytes[p++];
      v = (v << 7) | (b & 0x7f);
    } while (b & 0x80);
    return v;
  };
  while (p < bytes.length) {
    tick += vlq();
    if (bytes[p] & 0x80) status = bytes[p++];
    if (status == 0xff) {
      p++;
      const length = vlq();
      p += length;
    } else if ((status & 0xf0) == 0xc0 || (status & 0xf0) == 0xd0) p += 1;
    else {
      const [key, velocity] = [bytes[p], bytes[p + 1]];
      p += 2;
      if ((status & 0xf0) == 0x90 && velocity > 0) events.push({ tick, key });
    }
  }
  return events;
}

const HH = 42;

let gu;
beforeEach(async () => {
  await installMidiGlobal();
  gu = await newGrooveUtils();
});
const groove = (query) => gu.getGrooveDataFromUrlString(query);
const play = (query) => midiEvents(gu.create_MIDIURLFromGrooveData(groove(query)));
const music = (query) => gu.createABCFromGrooveData(groove(query), 800);
const link = (query) => gu.getUrlStringFromGrooveData(groove(query));

// a bar's line of `slots` with `ch` at each of `hits`, on a grid `k` times finer
const tab = (slots, hits, ch, k = 1) => {
  const line = Array(slots * k).fill('-');
  hits.forEach((hit) => (line[hit * k] = ch));
  return line.join('');
};
// a 4/4 bar of hi-hat, snare and kick, its slots written `k` times finer
const bar = (div, per, beats, notes, k = 1, extra = '') =>
  `?TimeSig=4/4&Div=${div}&Tempo=80&Measures=1&Beats=${beats}` +
  `&H=|${tab(per, notes.H, 'x', k)}|&S=|${tab(per, notes.S, 'O', k)}|&K=|${tab(per, notes.K, 'o', k)}|` +
  extra;

// Mixed: 8th triplets, 16th triplets, 16ths, 32nd-note triplets (12 slots a beat)
const MIXED = {
  H: [0, 4, 8, 12, 14, 16, 18, 20, 22, 24, 27, 30, 33, 36, 37, 38, 39, 40, 41, 42, 43, 44],
  S: [4, 18, 36],
  K: [0, 12, 27],
};
// 32nds: 32nds, 16ths, 32nds, 8ths (8 slots a beat)
const THIRTY_SECONDS = {
  H: [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 16, 17, 18, 19, 20, 21, 22, 23, 24, 28],
  S: [3, 10, 21],
  K: [0, 14],
};

describe('the fine grid (32nd notes and triplets in one groove)', () => {
  it.each(['', '&Count=1', '&Count=bold', '&Swing=30'])(
    'writes and plays a bar of Mixed beats as the Mixed grid does%s',
    (extra) => {
      const mixed = bar(48, 48, 'txsa', MIXED, 1, extra);
      const fine = bar(96, 48, 'txsa', MIXED, 2, extra);
      expect(music(fine)).toBe(music(mixed));
      expect(play(fine)).toEqual(play(mixed));
    }
  );

  it.each(['', '&Count=1', '&Count=bold', '&Swing=30'])(
    'writes and plays a bar of 32nds beats as the 32nds grid does%s',
    (extra) => {
      const grid32 = bar(32, 32, 'dsde', THIRTY_SECONDS, 1, extra);
      const fine = bar(96, 32, 'dsde', THIRTY_SECONDS, 3, extra);
      expect(music(fine)).toBe(music(grid32));
      expect(play(fine)).toEqual(play(grid32));
    }
  );

  // beat 1 32nds, beat 2 sextuplets, beats 3-4 quarter-note triplets
  const both = bar(96, 96, 'dxqq', {
    H: [0, 3, 6, 9, 12, 15, 18, 21, 24, 28, 32, 36, 40, 44, 48, 64, 80],
    S: [9, 36],
    K: [0, 48],
  });

  it('writes 32nd notes next to triplets in one bar', () => {
    const hands = music(both).split('V:Hands')[1].split('\n')[2];
    expect(hands).toBe(
      '[^g1F1]^g1^g1!accent![c1^g1]^g1^g1^g1^g1 (6:6:6^g2^g2^g2!accent![c2^g2]^g2^g2 (3:3:3[^g8F8]^g8^g8 ||'
    );
  });

  it('plays each note at its own time', () => {
    const hats = play(both)
      .filter((event) => event.key == HH)
      .map((event) => Math.round(event.tick - 1));
    expect(hats).toEqual([
      0, 16, 32, 48, 64, 80, 96, 112, 128, 149, 171, 192, 213, 235, 256, 341, 427,
    ]);
  });

  it('counts 32nd notes as the 32nds grid does, triplets as the Mixed grid', () => {
    const counts = [...music(both + '&Count=1').matchAll(/"([^"]+)"x/g)].map((m) => m[1]);
    expect(counts.join(' ')).toBe('1 a li bi & a la ba 2 a li & a la 3 a &');
  });

  it('keeps its beats and notes in links', () => {
    expect(groove(both).timeDivision).toBe(96);
    expect(groove(both).beatNotes).toEqual(['dxqq']);
    expect(link(both)).toContain('Div=96');
    expect(link(both)).toContain('&Beats=dxqq');
    expect(link('?' + link(both).split('?')[1])).toBe(link(both));
  });

  it('guesses the beats from the notes when a link does not say', () => {
    expect(groove(both.replace('&Beats=dxqq', '')).beatNotes).toEqual(['dxtt']);
  });
});

describe('swing, beat by beat, on every grid', () => {
  // the & of an 8ths beat and the e and a of a 16ths beat move as in the 8ths and
  // 16ths note settings, on the Mixed, 32nds and fine grids alike
  const spread = (line, step) => [...line].map((ch) => ch + '-'.repeat(step - 1)).join('');
  const snareTicks = (query) =>
    play(query)
      .filter((event) => event.key == 38)
      .map((event) => Math.round(event.tick - 1));

  it.each([
    ['eeee', 8, [6, 4, 12]],
    ['ssss', 16, [3, 2, 6]],
  ])('beats %s swing like the 1/%i setting', (beats, div, steps) => {
    const notes = 'o'.repeat(div);
    const plain = snareTicks(`?TimeSig=4/4&Div=${div}&Measures=1&Swing=30&S=|${notes}|`);
    [48, 32, 96].forEach((grid, i) => {
      const query = `?TimeSig=4/4&Div=${grid}&Measures=1&Swing=30&Beats=${beats}&S=|${spread(notes, steps[i])}|`;
      expect(snareTicks(query)).toEqual(plain);
    });
  });
});
