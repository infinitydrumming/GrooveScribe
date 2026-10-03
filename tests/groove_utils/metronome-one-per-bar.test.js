import { describe, it, expect, beforeEach } from 'vitest';
import { newGrooveUtils, installMidiGlobal } from '../helpers/legacyLoader.js';

// MetronomeFreq=1: one click per bar, on the 1 (Infinity Drumming).
describe('metronome: one click per bar', () => {
  let gu;
  beforeEach(async () => {
    await installMidiGlobal();
    gu = await newGrooveUtils();
  });

  // count note-on events (channel 10 = status 0x99) for a MIDI note number
  function countNoteOns(midiUrl, note) {
    const bytes = atob(midiUrl.slice('data:audio/midi;base64,'.length));
    let count = 0;
    for (let i = 0; i < bytes.length - 1; i++)
      if (bytes.charCodeAt(i) === 0x99 && bytes.charCodeAt(i + 1) === note) count++;
    return count;
  }

  const METRONOME_1 = 76;
  const METRONOME_CLICK = 77;
  const groove = (freq, measures = 2) =>
    gu.getGrooveDataFromUrlString(
      `?TimeSig=4/4&Div=16&Measures=${measures}&MetronomeFreq=${freq}&H=|----------------|----------------|&S=|----------------|----------------|&K=|----------------|----------------|`
    );

  it('reads and writes MetronomeFreq=1', () => {
    const gd = groove(1);
    expect(gd.metronomeFrequency).toBe(1);
    expect(gu.getUrlStringFromGrooveData(gd)).toContain('&MetronomeFreq=1');
  });

  it('clicks only on the 1 of each bar', () => {
    const url = gu.create_MIDIURLFromGrooveData(groove(1));
    expect(countNoteOns(url, METRONOME_1)).toBe(2); // two bars
    expect(countNoteOns(url, METRONOME_CLICK)).toBe(0);
  });

  it('quarter notes still click on every beat', () => {
    const url = gu.create_MIDIURLFromGrooveData(groove(4));
    expect(countNoteOns(url, METRONOME_1)).toBe(2);
    expect(countNoteOns(url, METRONOME_CLICK)).toBe(6);
  });
});
