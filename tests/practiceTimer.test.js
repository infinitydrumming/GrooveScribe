import { describe, it, expect } from 'vitest';
import {
  parsePracticeLimit,
  practiceLimitToText,
  barsBeforePracticeEnds,
  practiceLeftText,
  speedUpStepsDue,
} from '../js/practiceTimer.js';
import { newGrooveUtils } from './helpers/legacyLoader.js';

// Infinity Drumming, 2026: the practice timer, and speed-up counted in bars.

describe('practice timer', () => {
  it('reads and writes its link value', () => {
    expect(parsePracticeLimit('10m')).toEqual({ unit: 'minutes', amount: 10 });
    expect(parsePracticeLimit('16b')).toEqual({ unit: 'bars', amount: 16 });
    expect(parsePracticeLimit('500m')).toEqual({ unit: 'minutes', amount: 120 });
    for (const bad of ['', '0m', '10', 'm', '10x', '-5b', null, undefined])
      expect(parsePracticeLimit(bad)).toBeNull();
    expect(practiceLimitToText({ unit: 'minutes', amount: 5 })).toBe('5m');
    expect(practiceLimitToText({ unit: 'bars', amount: 32 })).toBe('32b');
    expect(practiceLimitToText(null)).toBe('');
  });

  it('ends a bars timer inside the time round that reaches it', () => {
    const fourBars = [2000, 2000, 2000, 2000];
    const sixteen = { unit: 'bars', amount: 16 };
    expect(barsBeforePracticeEnds(sixteen, { bars: 8, ms: 0 }, fourBars)).toBe(-1);
    expect(barsBeforePracticeEnds(sixteen, { bars: 12, ms: 0 }, fourBars)).toBe(4);
    // a 3-bar groove: 16 bars is 5 times round and 1 bar
    expect(barsBeforePracticeEnds(sixteen, { bars: 15, ms: 0 }, [1, 1, 1])).toBe(1);
  });

  it('ends a minutes timer at the end of the bar the time runs out in', () => {
    const oneMinute = { unit: 'minutes', amount: 1 };
    const bars = [2000, 2000, 2000, 2000];
    expect(barsBeforePracticeEnds(oneMinute, { bars: 0, ms: 48000 }, bars)).toBe(-1);
    expect(barsBeforePracticeEnds(oneMinute, { bars: 0, ms: 56000 }, bars)).toBe(2);
    expect(barsBeforePracticeEnds(oneMinute, { bars: 0, ms: 55000 }, bars)).toBe(3); // mid-bar
  });

  it('shows what is left', () => {
    expect(practiceLeftText({ unit: 'minutes', amount: 5 }, { bars: 0, ms: 47900 })).toBe(
      '4:13 left'
    );
    expect(practiceLeftText({ unit: 'minutes', amount: 1 }, { bars: 0, ms: 70000 })).toBe(
      '0:00 left'
    );
    expect(practiceLeftText({ unit: 'bars', amount: 16 }, { bars: 4, ms: 0 })).toBe('12 bars left');
    expect(practiceLeftText({ unit: 'bars', amount: 16 }, { bars: 15, ms: 0 })).toBe('1 bar left');
  });

  it('is kept in the groove link', async () => {
    const gu = await newGrooveUtils();
    const url = '?TimeSig=4/4&Div=8&Measures=1&H=|xxxxxxxx|&Practice=10m';
    const gd = gu.getGrooveDataFromUrlString(url);
    expect(gd.practiceLimit).toBe('10m');
    expect(gu.getUrlStringFromGrooveData(gd)).toContain('&Practice=10m');
    const none = gu.getGrooveDataFromUrlString(url.replace('&Practice=10m', '&Practice=oops'));
    expect(gu.getUrlStringFromGrooveData(none)).not.toContain('Practice');
  });
});

describe('speed-up counted in bars', () => {
  it('takes a step every so many bars', () => {
    expect(speedUpStepsDue(4, 0, 16)).toBe(0);
    expect(speedUpStepsDue(16, 0, 16)).toBe(1);
    expect(speedUpStepsDue(20, 1, 16)).toBe(0);
    expect(speedUpStepsDue(48, 1, 16)).toBe(2); // two steps due at once
    expect(speedUpStepsDue(48, 0, 0)).toBe(0);
  });
});
