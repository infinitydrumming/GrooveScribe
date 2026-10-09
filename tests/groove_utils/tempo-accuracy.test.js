import { describe, it, expect, beforeEach } from 'vitest';
import { newGrooveUtils, installMidiGlobal } from '../helpers/legacyLoader.js';

// Infinity Drumming, 2026: every bar plays for exactly its own length, whatever
// the note setting or swing (a 4/4 bar is 512 MIDI ticks).

// the end tick of a single-track MIDI data: URL, and the ticks its hi-hats play on
function midiTiming(midiUrl) {
  const bytes = Uint8Array.from(atob(midiUrl.split(',')[1]), (c) => c.charCodeAt(0));
  let p = 22;
  let tick = 0;
  let status = 0;
  const hats = [];
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
      if (type == 0x2f) return { end: tick, hats };
    } else if ((status & 0xf0) == 0xc0 || (status & 0xf0) == 0xd0) p += 1;
    else {
      if ((status & 0xf0) == 0x90 && bytes[p + 1] > 0 && bytes[p] == 42) hats.push(tick);
      p += 2;
    }
  }
  return { end: tick, hats };
}

const bars = (n, bar) => '|' + Array(n).fill(bar).join('|') + '|';

describe('tempo accuracy', () => {
  let gu;
  beforeEach(async () => {
    await installMidiGlobal();
    gu = await newGrooveUtils();
  });
  const timing = (url) =>
    midiTiming(gu.create_MIDIURLFromGrooveData(gu.getGrooveDataFromUrlString(url)));

  it.each([
    ['straight 8ths', 'Div=8', 'xxxxxxxx'],
    ['8th-note triplets', 'Div=12', 'xxxxxxxxxxxx'],
    ['16th-note triplets', 'Div=24', 'x'.repeat(24)],
    ['swung 16ths', 'Div=16&Swing=30', 'x'.repeat(16)],
  ])('plays 4 bars of %s in exactly 4 bars', (name, settings, bar) => {
    const { end, hats } = timing('?TimeSig=4/4&Measures=4&' + settings + '&H=' + bars(4, bar));
    expect(end).toBe(4 * 512);
    // each bar starts exactly a bar after the one before
    const perBar = hats.length / 4;
    expect(hats[2 * perBar] - hats[perBar]).toBe(512);
    expect(hats[3 * perBar] - hats[2 * perBar]).toBe(512);
  });

  it('spaces triplets evenly, never drifting more than a tick', () => {
    const { hats } = timing('?TimeSig=4/4&Div=12&Measures=1&H=' + bars(1, 'x'.repeat(12)));
    hats.forEach((tick, i) => expect(Math.abs(tick - (1 + (i * 512) / 12))).toBeLessThanOrEqual(1));
  });
});
