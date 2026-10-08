import { describe, it, expect, beforeEach } from 'vitest';
import { newGrooveUtils, installMidiGlobal } from '../helpers/legacyLoader.js';

// Infinity Drumming, 2026: flams, drags and ruffs play as separate quiet grace
// notes a fixed number of milliseconds before their note, without moving it.

// every note-on in a single-track MIDI data: URL, as { tick, key, velocity },
// plus the tick the track ends on
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
      if ((status & 0xf0) == 0x90 && velocity > 0) events.push({ tick, key, velocity });
    }
  }
  return { events, end };
}

const SNARE = 38;
const HH = 42;

describe('grace notes (flams, drags, ruffs)', () => {
  let gu;
  beforeEach(async () => {
    await installMidiGlobal();
    gu = await newGrooveUtils();
  });
  const play = (query) =>
    midiEvents(gu.create_MIDIURLFromGrooveData(gu.getGrooveDataFromUrlString(query)));
  const ticksPerMs = (tempo) => (tempo * 128) / 60000;

  it('puts a drag before its note and leaves every other note where it was', () => {
    const plain = play(
      '?TimeSig=4/4&Div=16&Tempo=120&H=|xxxxxxxxxxxxxxxx|&S=|----o-------o---|&K=|o-------o-------|'
    );
    const drag = play(
      '?TimeSig=4/4&Div=16&Tempo=120&H=|xxxxxxxxxxxxxxxx|&S=|----d-------o---|&K=|o-------o-------|'
    );
    const spacing = Math.round(30 * ticksPerMs(120)); // 8 ticks
    const graces = drag.events.filter((e) => e.key == SNARE && e.velocity < 85);
    const main = drag.events.find((e) => e.key == SNARE && e.velocity == 85);
    expect(graces.map((e) => main.tick - e.tick)).toEqual([2 * spacing, spacing]);
    // without the grace notes, the same notes at the same times
    const rest = drag.events.filter((e) => !(e.key == SNARE && e.velocity < 85));
    expect(rest).toEqual(plain.events);
    expect(drag.end).toBe(plain.end);
  });

  it('takes the grace notes for beat 1 of bar 2 from the end of bar 1', () => {
    const query =
      '?TimeSig=4/4&Div=16&Tempo=120&Measures=2&H=|xxxxxxxxxxxxxxxx|xxxxxxxxxxxxxxxx|&S=|----------------|f---------------|&K=|----------------|----------------|';
    const { events } = play(query);
    const barLine = events.filter((e) => e.key == HH)[16].tick;
    const grace = events.find((e) => e.key == SNARE && e.velocity < 85);
    expect(barLine - grace.tick).toBe(Math.round(30 * ticksPerMs(120)));
    // everything else plays exactly as it does without the flam
    const plain = play(query.replace('|f---', '|O---')); // (the old snare flam is accented)
    expect(events.filter((e) => e.velocity >= 85)).toEqual(plain.events);
  });

  it("puts the first note's grace notes at the end, so they lead back into the 1", () => {
    const query = '?TimeSig=4/4&Div=16&Tempo=120&H=|x---------------|&S=|o---------------|';
    const plain = play(query);
    const gd = gu.getGrooveDataFromUrlString(query);
    gd.snare_array[0] = '{/ccc}' + gd.snare_array[0]; // a ruff on the 1
    const ruff = midiEvents(gu.create_MIDIURLFromGrooveData(gd));
    expect(ruff.end).toBe(plain.end); // the loop is no longer and no shorter
    const graces = ruff.events.filter((e) => e.key == SNARE && e.velocity < 85);
    const spacing = Math.round(30 * ticksPerMs(120));
    expect(graces.map((e) => ruff.end - e.tick)).toEqual([3 * spacing, 2 * spacing, spacing]);
  });

  it('plays the grace notes on another drum when they are written there', () => {
    // a flam from the snare into tom 1, written straight into the groove data
    const gd = gu.getGrooveDataFromUrlString(
      '?TimeSig=4/4&Div=16&Tempo=120&H=|x-x-x-x-x-x-x-x-|&S=|----------------|&T1=|----x-----------|'
    );
    gd.toms_array[0][4] = '{/c}' + gd.toms_array[0][4];
    const { events } = midiEvents(gu.create_MIDIURLFromGrooveData(gd));
    const tom = events.find((e) => e.key == 48);
    const grace = events.find((e) => e.key == SNARE);
    expect(tom.tick - grace.tick).toBe(Math.round(30 * ticksPerMs(120)));
  });

  it('follows the spacing and volume settings, in milliseconds whatever the tempo', () => {
    gu.setGraceSpacingMs(100);
    gu.setGraceVolume(20);
    const { events } = play(
      '?TimeSig=4/4&Div=16&Tempo=60&H=|----------------|&S=|----f-----------|'
    );
    const [grace, main] = events.filter((e) => e.key == SNARE || e.key == 22);
    expect(main.tick - grace.tick).toBe(Math.round(100 * ticksPerMs(60)));
    expect(grace.velocity).toBe(Math.round(85 * 0.2));
  });

  it('keeps slow grace notes evenly spaced, even right after another note', () => {
    // a ruff a 16th note after a hi-hat, opened right out for practice
    gu.setGraceSpacingMs(120);
    const query =
      '?TimeSig=4/4&Div=16&Tempo=100&H=|xxxxxxxxxxxxxxxx|&S=|------------o---|&K=|o-------o-------|';
    const plain = play(query);
    const ruff = play(query.replace('o---|&K', 'o---|&SO=|------------r---|&K'));
    const spacing = Math.round(120 * ticksPerMs(100));
    const snare = ruff.events.filter((e) => e.key == SNARE).map((e) => e.tick);
    expect([snare[1] - snare[0], snare[2] - snare[1], snare[3] - snare[2]]).toEqual([
      spacing,
      spacing,
      spacing,
    ]);
    // the hi-hats and kicks around it don't move
    expect(ruff.events.filter((e) => e.key != SNARE)).toEqual(
      plain.events.filter((e) => e.key != SNARE)
    );
  });

  it('plays flams, drags and ruffs on the kick, also with the hi-hat foot', () => {
    const query =
      '?TimeSig=4/4&Div=16&Tempo=120&H=|----------------|&S=|----------------|&K=|o-------X-------|&KO=|----------------|';
    const plain = play(query);
    const drags = play(query.replace('&KO=|----------------|', '&KO=|d-------f-------|'));
    const KICK = 35;
    const spacing = Math.round(30 * ticksPerMs(120));
    const kicks = drags.events.filter((e) => e.key == KICK);
    const mains = kicks.filter((e) => e.velocity == 85).map((e) => e.tick);
    const graces = kicks.filter((e) => e.velocity < 85).map((e) => e.tick);
    // the drag on the 1 leads in from the end of the loop, the flam is before beat 3
    expect(graces).toEqual([mains[1] - spacing, drags.end - 2 * spacing, drags.end - spacing]);
    // the hi-hat foot still plays with the kick on beat 3
    expect(drags.events.filter((e) => e.velocity == 85)).toEqual(plain.events);
  });

  it('carries the kick ornament line in links, with grace notes on another drum', () => {
    const gd = gu.getGrooveDataFromUrlString(
      '?TimeSig=4/4&Div=16&H=|----------------|&S=|----------------|&K=|----o-----------|&KO=|----D-----------|'
    );
    expect(gd.kick_array[4]).toBe('{/cc}F'); // a drag on the snare into the kick
    expect(gu.getUrlStringFromGrooveData(gd)).toContain('&KO=|----D-----------|');
  });

  describe('in links', () => {
    const base = '?TimeSig=4/4&Div=16&Tempo=90&H=|xxxxxxxxxxxxxxxx|';
    it('still reads the old snare flam and drag, and writes them as ornaments', () => {
      const gd = gu.getGrooveDataFromUrlString(base + '&S=|----f-------d---|&K=|o-------o-------|');
      const url = gu.getUrlStringFromGrooveData(gd);
      expect(url).toContain('&S=|----O-------o---|');
      expect(url).toContain('&SO=|----f-------d---|');
      // and reading that back gives the same notes
      const again = gu.getGrooveDataFromUrlString(url.slice(url.indexOf('?')));
      expect(again.snare_array).toEqual(
        gd.snare_array.map((t) => t && t.replace('!accent!{/c}', '{/c}!accent!'))
      );
    });

    it('carries flams, drags and ruffs on any line, with the grace notes on any drum', () => {
      const query =
        base +
        '&S=|o-------o-------|&K=|o-------o-------|&T1=|----x-----------|&T4=|------------x---|' +
        '&HO=|r---------------|&SO=|--------F-------|&T1O=|----F-----------|&T4O=|------------j---|';
      const gd = gu.getGrooveDataFromUrlString(query);
      expect(gd.hh_array[0]).toBe('{/^g^g^g}^g');
      expect(gd.snare_array[8]).toBe('{/c}c');
      expect(gd.toms_array[0][4]).toBe('{/c}e'); // a flam from the snare into tom 1
      expect(gd.toms_array[3][12]).toBe('{/eee}A'); // a ruff from tom 1 into the floor tom
      const url = gu.getUrlStringFromGrooveData(gd);
      for (const line of [
        '&HO=|r---',
        '&SO=|--------f---',
        '&T1O=|----F---',
        '&T4O=|------------j---',
      ])
        expect(url).toContain(line);
    });

    it('keeps the practice settings only when they are changed', () => {
      const plain = gu.getGrooveDataFromUrlString(base);
      expect(gu.getUrlStringFromGrooveData(plain)).not.toMatch(/Grace/);
      const slow = gu.getGrooveDataFromUrlString(base + '&GraceMs=80&GraceVol=60');
      expect([slow.graceSpacingMs, slow.graceVolume]).toEqual([80, 60]);
      expect(gu.getUrlStringFromGrooveData(slow)).toContain('&GraceMs=80&GraceVol=60');
    });

    it('writes the grace notes on the sheet music', () => {
      const gd = gu.getGrooveDataFromUrlString(
        base + '&S=|----o-----------|&SO=|----r-----------|'
      );
      expect(gu.createABCFromGrooveData(gd, 800)).toContain('{/ccc}');
    });
  });
});
