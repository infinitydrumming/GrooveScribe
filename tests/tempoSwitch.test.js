import { describe, it, expect } from 'vitest';
import { eventTimes, lastNoteBefore, planTempoSwitch, catchUp } from '../js/tempoSwitch.js';

// Infinity Drumming, 2026: a tempo change while playing is heard from the next bar line.

// a MIDI.js event list: [event, ms since the event before]
const note = (ms, subtype = 'noteOn') => [{ event: { type: 'channel', subtype } }, ms];
const meta = (ms) => [{ event: { type: 'meta', subtype: 'setTempo' } }, ms];

// a 4/4 bar of 8ths at `beatMs` a beat (an 8th = beatMs / 2), `bars` of them
function eighths(beatMs, bars) {
  const data = [meta(0), note(2)]; // the lead blank, as the app writes it (taken off bar 1's end)
  for (let i = 1; i < bars * 8; i++) data.push(note(i == 1 ? beatMs / 2 - 2 : beatMs / 2));
  return data;
}

describe('a tempo change while playing', () => {
  it('times every event as the player counts them, from 0.5 ms, and knows the notes', () => {
    const events = eventTimes([meta(0), note(2), note(100, 'noteOff'), meta(5)]);
    expect(events.times).toEqual([0.5, 2.5, 102.5, 107.5]);
    expect(events.notes).toEqual([false, true, true, false]);
  });

  it('finds the last note before a bar line, a note on the line counting as on it', () => {
    const events = eventTimes(eighths(500, 2)); // bar 2 starts at 2000.5
    expect(lastNoteBefore(events, 2000.5, 2000)).toBe(1750.5); // the "4 &"
    // a note a millisecond early (rounded ticks) is still on the line
    const early = eventTimes([meta(0), note(1000), note(999), note(250)]);
    expect(lastNoteBefore(early, 2000.5, 2000)).toBe(1000.5);
    expect(lastNoteBefore(events, 0.5, 2000)).toBe(-1);
  });

  it('moves at the next bar line whose last note is still to come', () => {
    const playing = eventTimes(eighths(500, 4)); // 120 bpm: bars of 2000 ms
    const next = eventTimes(eighths(1000, 4)); // 60 bpm: 4000 ms
    const oldBars = [2000, 2000, 2000, 2000];
    const newBars = [4000, 4000, 4000, 4000];
    // at the start: the line after bar 1
    expect(planTempoSwitch(playing, next, oldBars, newBars, 0.5)).toEqual({
      oldTrigger: 1750.5,
      newTrigger: 3500.5,
      bar: 1,
    });
    // that bar's "4 &" already played: the line after bar 2
    expect(planTempoSwitch(playing, next, oldBars, newBars, 1750.5).bar).toBe(2);
    // in the last bar there's no line left: the round's end takes the tempo
    expect(planTempoSwitch(playing, next, oldBars, newBars, 5800)).toBeNull();
    expect(planTempoSwitch(playing, next, oldBars, [4000], 0.5)).toBeNull();
  });

  it('shortens the wait for the next note by how late the move is, never past the note before', () => {
    const data = [meta(0), note(500), note(500), note(500)];
    const times = eventTimes(data).times; // 0.5, 500.5, 1000.5, 1500.5
    catchUp(data, times, 500.5, 12);
    expect(data.map((e) => e[1])).toEqual([0, 500, 488, 500]);
    const tight = [meta(0), note(500), note(4)];
    catchUp(tight, eventTimes(tight).times, 500.5, 12);
    expect(tight[2][1]).toBeCloseTo(0.5); // still just after the note it starts from
  });
});
