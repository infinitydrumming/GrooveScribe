import { describe, it, expect, beforeEach } from 'vitest';
import { newGrooveUtils, installMidiGlobal } from '../helpers/legacyLoader.js';

// Brazilian swing (Infinity Drumming, 2026): each group of four notes is spaced
// long-short-short-long (the e late, the a early), where the regular swing is
// long-short-long-short. Saved in links as SwingStyle=brazilian.

// note-on times (in ticks) of one drum in a single-track MIDI data: URL
function noteOnTicks(midiUrl, note) {
  const bytes = Uint8Array.from(atob(midiUrl.split(',')[1]), (c) => c.charCodeAt(0));
  let p = 22; // after the MThd header (14 bytes) and the MTrk header (8 bytes)
  let tick = 0;
  let status = 0;
  const times = [];
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
      p++; // meta type
      p += vlq();
    } else if ((status & 0xf0) == 0xc0 || (status & 0xf0) == 0xd0) {
      p += 1;
    } else {
      const [key, velocity] = [bytes[p], bytes[p + 1]];
      p += 2;
      if ((status & 0xf0) == 0x90 && velocity > 0 && key == note) times.push(tick);
    }
  }
  return times;
}

// gaps between the first five notes: the four 16ths of beat 1 and the next 1
function firstBeatGaps(times) {
  return [1, 2, 3, 4].map((i) => times[i] - times[i - 1]);
}

const CLOSED_HH = 42;
const SIXTEENTHS = '&H=|xxxxxxxxxxxxxxxx|&S=|----------------|&K=|----------------|';

describe('Brazilian swing', () => {
  let gu;
  beforeEach(async () => {
    await installMidiGlobal(); // jsmidgen's Midi global, needed before any MIDI call
    gu = await newGrooveUtils();
  });

  it('reads SwingStyle from a link and writes it back only when Brazilian', () => {
    const brazil = gu.getGrooveDataFromUrlString(
      '?TimeSig=4/4&Div=16&Swing=10&SwingStyle=brazilian' + SIXTEENTHS
    );
    expect(brazil.swingStyle).toBe('brazilian');
    expect(gu.getUrlStringFromGrooveData(brazil)).toContain('&Swing=10&SwingStyle=brazilian');

    const plain = gu.getGrooveDataFromUrlString('?TimeSig=4/4&Div=16&Swing=10' + SIXTEENTHS);
    expect(plain.swingStyle).toBe('swing');
    expect(gu.getUrlStringFromGrooveData(plain)).not.toContain('SwingStyle');
  });

  it('spaces the 16ths of a beat long-short-short-long', () => {
    const gd = gu.getGrooveDataFromUrlString(
      '?TimeSig=4/4&Div=16&Swing=20&SwingStyle=brazilian' + SIXTEENTHS
    );
    const [one, e, and, a] = firstBeatGaps(
      noteOnTicks(gu.create_MIDIURLFromGrooveData(gd), CLOSED_HH)
    );
    expect(one).toBeGreaterThan(e);
    expect(e).toBe(and);
    expect(a).toBe(one);
    // the & stays on its straight position, half way through the beat
    expect(one + e).toBe(and + a);
  });

  it('keeps the regular swing long-short-long-short', () => {
    const gd = gu.getGrooveDataFromUrlString('?TimeSig=4/4&Div=16&Swing=20' + SIXTEENTHS);
    const [one, e, and, a] = firstBeatGaps(
      noteOnTicks(gu.create_MIDIURLFromGrooveData(gd), CLOSED_HH)
    );
    expect(one).toBeGreaterThan(e);
    expect(and).toBe(one);
    expect(a).toBe(e);
  });

  it('groups each beat in 2/4 as well as in 4/4', () => {
    const gd = gu.getGrooveDataFromUrlString(
      '?TimeSig=2/4&Div=16&Swing=20&SwingStyle=brazilian&H=|xxxxxxxx|&S=|--------|&K=|--------|'
    );
    const times = noteOnTicks(gu.create_MIDIURLFromGrooveData(gd), CLOSED_HH);
    const [one, e, and, a] = firstBeatGaps(times);
    expect(one).toBeGreaterThan(e);
    expect(e).toBe(and);
    expect(a).toBe(one);
    // beat 2 is spaced the same as beat 1 (each beat is one group of four)
    expect(times.slice(5, 8).map((t, i) => t - times[4 + i])).toEqual([one, e, and]);
  });
});
