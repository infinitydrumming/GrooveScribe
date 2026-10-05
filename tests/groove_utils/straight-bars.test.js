import { describe, it, expect, beforeEach } from 'vitest';
import { newGrooveUtils, installMidiGlobal } from '../helpers/legacyLoader.js';
import { getFeelMarkings, addFeelMarking } from '../../js/abcNotation.js';

// Straight bars in a swung groove (Infinity Drumming, 2026): StraightBars=2,4 plays
// those bars straight, and the sheet music marks "Straight" / "Swing" where the
// feel changes.

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
      p++;
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

const CLOSED_HH = 42;
const bars = (n, tab) => '|' + Array(n).fill(tab).join('|') + '|';
const fourBars = (extra) =>
  '?TimeSig=4/4&Div=16&Tempo=80&Measures=4' +
  extra +
  '&H=' +
  bars(4, 'xxxxxxxxxxxxxxxx') +
  '&S=' +
  bars(4, '----O-------O---') +
  '&K=' +
  bars(4, 'o-------o-------');

describe('Straight bars in a swung groove', () => {
  let gu;
  beforeEach(async () => {
    await installMidiGlobal(); // jsmidgen's Midi global, needed before any MIDI call
    gu = await newGrooveUtils();
  });

  it('reads StraightBars from a link and writes it back', () => {
    const gd = gu.getGrooveDataFromUrlString(fourBars('&Swing=30&StraightBars=2,4'));
    expect(gd.straightBars).toEqual([false, true, false, true]);
    expect(gu.getUrlStringFromGrooveData(gd)).toContain('&StraightBars=2,4');
  });

  it('ignores bar numbers outside the groove and leaves links without it unchanged', () => {
    const gd = gu.getGrooveDataFromUrlString(fourBars('&Swing=30&StraightBars=0,3,9,x'));
    expect(gd.straightBars).toEqual([false, false, true, false]);

    const plain = gu.getGrooveDataFromUrlString(fourBars('&Swing=30'));
    expect(plain.straightBars).toEqual([false, false, false, false]);
    expect(gu.getUrlStringFromGrooveData(plain)).not.toContain('StraightBars');
  });

  it('plays the straight bars without swing', () => {
    const gd = gu.getGrooveDataFromUrlString(fourBars('&Swing=30&StraightBars=2,4'));
    const times = noteOnTicks(gu.create_MIDIURLFromGrooveData(gd), CLOSED_HH);
    const gapsOfBar = (bar) =>
      times.slice(bar * 16 + 1, bar * 16 + 5).map((t, i) => t - times[bar * 16 + i]);
    expect(gapsOfBar(0)[0]).toBeGreaterThan(gapsOfBar(0)[1]); // swung
    expect(gapsOfBar(1)).toEqual([32, 32, 32, 32]); // straight 16ths
    expect(gapsOfBar(2)).toEqual(gapsOfBar(0));
    expect(gapsOfBar(3)).toEqual([32, 32, 32, 32]);
  });

  it('marks bar 1 and every change of feel on the sheet music', () => {
    const gd = gu.getGrooveDataFromUrlString(fourBars('&Swing=30&StraightBars=3,4'));
    const abc = gu.createABCFromGrooveData(gd, 900);
    expect(abc.match(/"\^[A-Za-z ]+"/g)).toEqual(['"^Swing"', '"^Straight"']);
  });

  it('marks nothing when the groove is not swung, and keeps the usual layout', () => {
    const marked = gu.getGrooveDataFromUrlString(fourBars('&StraightBars=2'));
    const plain = gu.getGrooveDataFromUrlString(fourBars(''));
    const normalize = (abc) => abc.replace(/%%fullsvg _\d+\n/, '');
    expect(normalize(gu.createABCFromGrooveData(marked, 900))).toBe(
      normalize(gu.createABCFromGrooveData(plain, 900))
    );
  });

  describe('getFeelMarkings', () => {
    it('names the swing style and skips bars that keep the feel', () => {
      expect(getFeelMarkings([false, false, true], 3, 20, 'brazilian', false)).toEqual([
        'Brazilian swing',
        '',
        'Straight',
      ]);
      expect(getFeelMarkings([true, false, false], 3, 20, 'swing', false)).toEqual([
        'Straight',
        'Swing',
        '',
      ]);
    });

    it('marks nothing in triplets, without swing, or with no straight bars', () => {
      expect(getFeelMarkings([true, false], 2, 20, 'swing', true)).toEqual(['', '']);
      expect(getFeelMarkings([true, false], 2, 0, 'swing', false)).toEqual(['', '']);
      expect(getFeelMarkings([false, false], 2, 20, 'swing', false)).toEqual(['', '']);
    });
  });

  it('addFeelMarking puts the text before the first note of the hands voice', () => {
    expect(addFeelMarking('V:Hands stem=up\n%%voicemap drum\nc4', 'Straight')).toBe(
      'V:Hands stem=up\n%%voicemap drum\n"^Straight"c4'
    );
    expect(addFeelMarking('abc', '')).toBe('abc');
  });
});
