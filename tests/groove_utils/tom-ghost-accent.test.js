import { describe, it, expect, beforeEach } from 'vitest';
import { newGrooveUtils, installMidiGlobal } from '../helpers/legacyLoader.js';

// Tom ghost notes ("g") and accents ("O") in the T1 / T2 / T4 lines (Infinity Drumming).
describe('tom ghost notes and accents', () => {
  let gu;
  beforeEach(async () => {
    await installMidiGlobal();
    gu = await newGrooveUtils();
  });

  const base =
    '?TimeSig=4/4&Div=16&Tempo=80&Measures=1&H=|----------------|&S=|----------------|&K=|----------------|';

  it('reads g / O / o / x on every tom line', () => {
    const gd = gu.getGrooveDataFromUrlString(
      base + '&T1=|gOox------------|&T2=|gO--------------|&T4=|gO--------------|'
    );
    expect(gd.toms_array[0].slice(0, 4)).toEqual(['!(.!!).!e', '!accent!e', 'e', 'e']);
    expect(gd.toms_array[1].slice(0, 2)).toEqual(['!(.!!).!d', '!accent!d']);
    expect(gd.toms_array[3].slice(0, 2)).toEqual(['!(.!!).!A', '!accent!A']);
  });

  it('writes them back the same way', () => {
    const gd = gu.getGrooveDataFromUrlString(
      base + '&T1=|g-O-o-----------|&T2=|--g-------------|&T4=|O---------------|'
    );
    const out = gu.getUrlStringFromGrooveData(gd);
    expect(out).toContain('&T1=|g-O-o-----------|&T2=|--g-------------|&T4=|O---------------|');
  });

  it('leaves links with plain tom hits unchanged', () => {
    const qs = base.replace('?', '?') + '&T1=|o---------------|&T4=|--------o-------|';
    const gd = gu.getGrooveDataFromUrlString(qs);
    gd.viewMode = false;
    const out = gu.getUrlStringFromGrooveData(gd);
    expect(out.slice(out.indexOf('?'))).toBe(qs);
  });

  it('draws ghosts in brackets and accents with ">"', () => {
    const gd = gu.getGrooveDataFromUrlString(base + '&T1=|g---------------|&T4=|----O-----------|');
    const abc = gu.createABCFromGrooveData(gd, 1000);
    expect(abc).toContain('!(.!!).!e');
    expect(abc).toContain('!accent!A');
  });

  // velocity of the first note-on for a MIDI note (channel 10 = status 0x99)
  function velocityOf(midiUrl, note) {
    const bytes = atob(midiUrl.slice('data:audio/midi;base64,'.length));
    for (let i = 0; i < bytes.length - 2; i++)
      if (bytes.charCodeAt(i) === 0x99 && bytes.charCodeAt(i + 1) === note)
        return bytes.charCodeAt(i + 2);
    return null;
  }

  it('plays ghosts quieter and accents louder', () => {
    const play = (t1) =>
      gu.create_MIDIURLFromGrooveData(
        gu.getGrooveDataFromUrlString(base + '&T1=|' + t1 + '---------------|')
      );
    const TOM1 = 48;
    expect(velocityOf(play('o'), TOM1)).toBe(85);
    expect(velocityOf(play('g'), TOM1)).toBe(25); // about 30% of a normal hit
    expect(velocityOf(play('O'), TOM1)).toBe(120);
  });
});
