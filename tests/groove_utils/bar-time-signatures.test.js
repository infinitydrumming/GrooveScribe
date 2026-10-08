import { describe, it, expect, beforeEach } from 'vitest';
import { newGrooveUtils, installMidiGlobal } from '../helpers/legacyLoader.js';
import { addMeterChange } from '../../js/abcNotation.js';

// Infinity Drumming, 2026: a time signature for each bar ("BarSigs" in links).

// every note-on in a single-track MIDI data: URL, as { tick, key }, and the end tick
function midiEvents(midiUrl) {
  const bytes = Uint8Array.from(atob(midiUrl.split(',')[1]), (c) => c.charCodeAt(0));
  let p = 22;
  let tick = 0;
  let status = 0;
  let end = 0;
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
      const type = bytes[p++];
      const length = vlq();
      p += length;
      if (type == 0x2f) end = tick;
    } else if ((status & 0xf0) == 0xc0 || (status & 0xf0) == 0xd0) p += 1;
    else {
      const [key, velocity] = [bytes[p], bytes[p + 1]];
      p += 2;
      if ((status & 0xf0) == 0x90 && velocity > 0) events.push({ tick, key });
    }
  }
  return { events, end };
}

const HH = 42;
const BAR_CLICK = 76;
const CLICK = 77;

// a bar of 8th-note hi-hats with the snare on the 2nd 8th of each beat pair
const eighths = (n) => 'x'.repeat(n);

describe('a time signature for each bar', () => {
  let gu;
  beforeEach(async () => {
    await installMidiGlobal();
    gu = await newGrooveUtils();
  });

  // 4/4, 2/4, 4/4 in 8th notes (like a bar of 2/4 in "Alive")
  const ALIVE =
    '?TimeSig=4/4&Div=8&Tempo=120&Measures=3&BarSigs=4/4,2/4,4/4' +
    '&H=|' +
    eighths(8) +
    '|' +
    eighths(4) +
    '|' +
    eighths(8) +
    '|&S=|--o---o-|--o-|--o---o-|&K=|o---o---|o---|o---o---|';

  it('reads each bar with its own number of notes, and writes the link back the same', () => {
    const gd = gu.getGrooveDataFromUrlString(ALIVE);
    expect(gd.barTimeSigs).toEqual([
      { top: 4, bottom: 4 },
      { top: 2, bottom: 4 },
      { top: 4, bottom: 4 },
    ]);
    expect(gd.notesPerMeasure).toBe(8); // every bar keeps the longest bar's slots
    // bar 2 uses its first 4 slots and leaves the rest empty
    expect(gd.hh_array.slice(8, 16)).toEqual(['^g', '^g', '^g', '^g', false, false, false, false]);
    expect(gd.snare_array[10]).toBe('c');
    const url = gu.getUrlStringFromGrooveData(gd);
    expect(url).toContain('&BarSigs=4/4,2/4,4/4');
    expect(url).toContain('&H=|xxxxxxxx|xxxx|xxxxxxxx|');
    expect(url).toContain('&S=|--o---o-|--o-|--o---o-|');
    expect(url).toContain('&K=|o---o---|o---|o---o---|');
  });

  it('leaves grooves in one time signature exactly as they were', () => {
    const plain = '?TimeSig=4/4&Div=8&Measures=2&H=|xxxxxxxx|xxxxxxxx|&S=|--o---o-|--o---o-|';
    const same = gu.getGrooveDataFromUrlString(plain + '&BarSigs=4/4,4/4');
    expect(same.barTimeSigs).toEqual([]);
    expect(gu.getUrlStringFromGrooveData(same)).not.toContain('BarSigs');
    expect(gu.createABCFromGrooveData(same, 800)).toBe(
      gu.createABCFromGrooveData(gu.getGrooveDataFromUrlString(plain), 800)
    );
  });

  it('writes the new time signature on the sheet music where it changes', () => {
    const abc = gu.createABCFromGrooveData(gu.getGrooveDataFromUrlString(ALIVE), 800);
    expect(abc).toContain('M:4/4');
    // bar 2 changes to 2/4 and bar 3 back to 4/4, in every voice
    expect(abc.match(/\[M:2\/4\]/g)).toHaveLength(abc.match(/\[M:4\/4\]/g).length);
    expect(abc.indexOf('[M:2/4]')).toBeLessThan(abc.indexOf('[M:4/4]'));
  });

  it('plays each bar for its own length, with its own metronome', () => {
    const gd = gu.getGrooveDataFromUrlString(ALIVE + '&MetronomeFreq=4');
    const { events } = midiEvents(gu.create_MIDIURLFromGrooveData(gd));
    const hats = events.filter((e) => e.key == HH).map((e) => e.tick);
    expect(hats).toHaveLength(20); // 8 + 4 + 8
    const eighth = hats[1] - hats[0];
    // the 2/4 bar is half as long as a 4/4 bar: bar 3 starts 12 eighths in
    expect(hats[12] - hats[0]).toBeGreaterThanOrEqual(12 * eighth - 2);
    expect(hats[12] - hats[0]).toBeLessThanOrEqual(12 * eighth);
    // the metronome counts 4 + 2 + 4 beats, the 1 of each bar accented
    const clicks = events.filter((e) => e.key == BAR_CLICK || e.key == CLICK);
    expect(clicks.map((e) => (e.key == BAR_CLICK ? '1' : '.')).join('')).toBe('1...1.1...');
  });

  it('handles x/8 bars, like the 3/8 and 5/8 bars of "Here Comes the Sun"', () => {
    const gd = gu.getGrooveDataFromUrlString(
      '?TimeSig=4/4&Div=16&Tempo=120&Measures=3&BarSigs=4/4,3/8,5/8' +
        '&H=|xxxxxxxxxxxxxxxx|xxxxxx|xxxxxxxxxx|&S=|----o-------o---|--o---|--o-----o-|&K=|o-------o-------|o-----|o---o-----|'
    );
    expect(gd.notesPerMeasure).toBe(16);
    const url = gu.getUrlStringFromGrooveData(gd);
    expect(url).toContain('&H=|xxxxxxxxxxxxxxxx|xxxxxx|xxxxxxxxxx|');
    const abc = gu.createABCFromGrooveData(gd, 800);
    expect(abc).toContain('[M:3/8]');
    expect(abc).toContain('[M:5/8]');
    const hats = midiEvents(gu.create_MIDIURLFromGrooveData(gd)).events.filter((e) => e.key == HH);
    expect(hats).toHaveLength(32); // 16 + 6 + 10
  });

  it('puts the time signature change at the start of every voice of a bar', () => {
    const bar = 'V:Stickings\nx8 x8 |\\\nV:Hands stem=up\n%%voicemap drum\n[^g2F2]^g2 |\\\n';
    expect(addMeterChange(bar, { top: 3, bottom: 8 })).toBe(
      'V:Stickings\n[M:3/8]x8 x8 |\\\nV:Hands stem=up\n%%voicemap drum\n[M:3/8][^g2F2]^g2 |\\\n'
    );
  });
});
