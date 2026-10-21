import { describe, it, expect, beforeEach } from 'vitest';
import {
  emptyPracticeSettings,
  practiceSettingsFromUrl,
  practiceSettingsToUrl,
} from '../js/practiceSettings.js';
import { newGrooveUtils } from './helpers/legacyLoader.js';

// Infinity Drumming, 2026: an exercise's practice settings and instructions in its link.

const fromQuery = (query) =>
  practiceSettingsFromUrl((name, fallback) => {
    const pair = query
      .replace(/^[?&]/, '')
      .split('&')
      .map((p) => p.split('='))
      .find((p) => p[0].toLowerCase() == name.toLowerCase());
    return pair ? pair[1] : fallback;
  });

describe('practice settings in a link', () => {
  it('adds nothing when every setting is off', () => {
    expect(practiceSettingsToUrl(emptyPracticeSettings())).toBe('');
    expect(fromQuery('')).toEqual(emptyPracticeSettings());
  });

  it('round-trips every setting', () => {
    const settings = {
      permutation: {
        type: 'kick_16ths',
        boxes: '0011110101',
        playEach: 2,
        bars: '3-6, 9',
        fatBack: true,
        ostinato: 2,
      },
      speedUp: { amount: 5, every: 16, unit: 'b', keepGoing: false, target: 120 },
      countIn: true,
      clickSolo: true,
      clickStart: 'AND',
      mutes: { hh: [1, 2], kick: [3] },
    };
    const url = practiceSettingsToUrl(settings);
    expect(url).toBe(
      '&Perm=kick_16ths&PermSet=0011110101&PlayEach=2&PermBars=3-6,9&FatBack=1&Ostinato=2' +
        '&SpeedUp=5,16b,once,to120' +
        '&CountIn=1&ClickSolo=1&ClickStart=AND&Mute=hh:1:2,kick:3'
    );
    expect(fromQuery(url)).toEqual(settings);
  });

  // links from before multi-bar ostinatos (October 2026) played bar 1 only
  it('writes the ostinato only past one bar, and reads 1 bar when a link has none', () => {
    const perm = { type: 'kick_16ths', boxes: '', playEach: 1, bars: '', fatBack: false };
    const settings = (ostinato) => ({
      ...emptyPracticeSettings(),
      permutation: { ...perm, ostinato },
    });
    expect(practiceSettingsToUrl(settings(1))).toBe('&Perm=kick_16ths');
    expect(practiceSettingsToUrl(settings(3))).toBe('&Perm=kick_16ths&Ostinato=3');
    expect(fromQuery('&Perm=kick_16ths').permutation.ostinato).toBe(1);
    expect(fromQuery('&Perm=kick_16ths&Ostinato=x').permutation.ostinato).toBe(1);
    expect(fromQuery('&Perm=kick_16ths&Ostinato=0').permutation.ostinato).toBe(1);
  });

  it('keeps a speed-up in minutes that keeps going', () => {
    const speedUp = { amount: 3, every: 2, unit: 'm', keepGoing: true, target: 0 };
    const url = practiceSettingsToUrl({ ...emptyPracticeSettings(), speedUp });
    expect(url).toBe('&SpeedUp=3,2m');
    expect(fromQuery(url).speedUp).toEqual(speedUp);
  });

  it('keeps out-of-range or unknown values inside what the menus offer', () => {
    const s = fromQuery(
      '&Perm=bogus&SpeedUp=500,99m,to9999&ClickStart=xyz&Mute=nose:1,hh:0:2:abc&PlayEach=0'
    );
    expect(s.permutation).toBeNull();
    expect(s.speedUp).toEqual({ amount: 100, every: 20, unit: 'm', keepGoing: true, target: 300 });
    expect(s.clickStart).toBe('1');
    expect(s.mutes).toEqual({ hh: [2] });
    expect(fromQuery('&SpeedUp=5,112b').speedUp.every).toBe(112); // any number of bars
    expect(fromQuery('&SpeedUp=5,21b').speedUp.every).toBe(21);
    expect(fromQuery('&SpeedUp=5,5000b').speedUp.every).toBe(999);
  });
});

describe('a groove link with practice settings and instructions', () => {
  let gu;
  beforeEach(async () => {
    gu = await newGrooveUtils();
  });
  const link = (query) => {
    const url = gu.getUrlStringFromGrooveData(gu.getGrooveDataFromUrlString(query));
    // (a bare player starts in view mode, which links say as Mode=view)
    return url.slice(url.indexOf('?')).replace('?Mode=view&', '?');
  };

  it('reads and writes them back unchanged', () => {
    const query =
      '?TimeSig=4/4&Div=16&Tempo=80&Measures=1&GrooveBars=4&ClickBars=4&Practice=10m' +
      '&Perm=snare_16ths&PermSet=0111&PlayEach=3&CountIn=1&Mute=kick:1' +
      '&Instructions=' +
      encodeURIComponent('Play each figure ×4.\nThen 5 bpm faster & again!') +
      '&H=|x-x-x-x-x-x-x-x-|';
    const gd = gu.getGrooveDataFromUrlString(query);
    expect(gd.instructions).toBe('Play each figure ×4.\nThen 5 bpm faster & again!');
    expect(gd.practice.permutation).toEqual({
      type: 'snare_16ths',
      boxes: '0111',
      playEach: 3,
      bars: '',
      fatBack: false,
      ostinato: 1,
    });
    expect(link(query)).toContain('&Perm=snare_16ths&PermSet=0111&PlayEach=3&CountIn=1');
    expect(link(link(query))).toBe(link(query));
  });

  it('leaves the practice settings out when Save & Share says so, but keeps the instructions', () => {
    const gd = gu.getGrooveDataFromUrlString(
      '?TimeSig=4/4&Div=16&Measures=1&GrooveBars=2&ClickBars=2&Practice=16b&CountIn=1' +
        '&Instructions=Slowly'
    );
    gd.includePractice = false;
    const url = gu.getUrlStringFromGrooveData(gd);
    for (const name of ['GrooveBars', 'ClickBars', 'Practice', 'CountIn'])
      expect(url).not.toContain(name + '=');
    expect(url).toContain('&Instructions=Slowly');
  });

  it('writes an old link exactly as before', () => {
    const query =
      '?TimeSig=4/4&Div=16&Tempo=90&Measures=1&MetronomeFreq=4&GrooveBars=4&ClickBars=4&Count=1' +
      '&Practice=10m&H=|x-x-x-x-x-x-x-x-|&S=|----O-------O---|&K=|o-------o-------|';
    expect(link(query)).toBe(query);
  });
});
