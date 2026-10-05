import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { newGrooveUtils } from '../helpers/legacyLoader.js';

// Playback cursor timing (Infinity Drumming, 2026): the cursor waits for the
// audio latency the browser reports plus the player's own "Cursor timing"
// adjustment, so it lines up with the sound instead of running ahead of it.

describe('playback cursor timing', () => {
  let gu;
  beforeEach(async () => {
    window.localStorage.clear();
    gu = await newGrooveUtils();
    globalThis.MIDI = { Player: { ctx: { outputLatency: 0.12, baseLatency: 0.01 } } };
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    delete globalThis.MIDI;
  });

  it('waits for the latency the browser reports', () => {
    expect(gu.getReportedAudioLatencyMs()).toBe(130);
    expect(gu.getCursorDelayMs()).toBe(130);
  });

  it('adds the remembered adjustment, never going below no delay', () => {
    gu.setCursorAdjustMs(70);
    expect(gu.getCursorAdjustMs()).toBe(70);
    expect(gu.getCursorDelayMs()).toBe(200);
    gu.setCursorAdjustMs(-300);
    expect(gu.getCursorDelayMs()).toBe(0);
  });

  it('works without a reported latency', () => {
    globalThis.MIDI = { Player: { ctx: {} } };
    expect(gu.getReportedAudioLatencyMs()).toBe(0);
    gu.setCursorAdjustMs(40);
    expect(gu.getCursorDelayMs()).toBe(40);
  });

  it('moves the cursor once the note can be heard', () => {
    const update = vi.fn();
    gu.whenNoteIsHeard(update);
    vi.advanceTimersByTime(129);
    expect(update).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('moves it straight away when there is no delay', () => {
    globalThis.MIDI = { Player: { ctx: {} } };
    const update = vi.fn();
    gu.whenNoteIsHeard(update);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('drops pending cursor moves when playback stops', () => {
    const update = vi.fn();
    gu.whenNoteIsHeard(update);
    gu.whenNoteIsHeard(update);
    gu.cancelPendingCursorUpdates();
    vi.advanceTimersByTime(500);
    expect(update).not.toHaveBeenCalled();
  });
});
