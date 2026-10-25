import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  tapTempo,
  playAlongStart,
  songPositionAt,
  nearestHit,
  wavePeaks,
  songTimeText,
  songTimeFromText,
  createPlayAlong,
} from '../js/playAlong.js';
import { firstHit, songKey } from '../js/playAlongPanel.js';
import {
  practiceSettingsToUrl,
  practiceSettingsFromUrl,
  emptyPracticeSettings,
} from '../js/practiceSettings.js';

// Infinity Drumming, 2026: playing along with a song.

describe('the sums', () => {
  it('finds the tempo of taps from their average beat, the last 8 of them', () => {
    expect(tapTempo([10, 10.6, 11.2, 11.8])).toBe(100);
    expect(tapTempo([10])).toBe(0);
    expect(tapTempo([])).toBe(0);
    // an early stray tap drops out once there are 8 newer
    const taps = [0];
    for (let i = 0; i < 8; i++) taps.push(5 + i * 0.5);
    expect(tapTempo(taps)).toBeCloseTo(120, 9);
    expect(tapTempo([1, 1.61])).toBeCloseTo(98.4, 9); // (one decimal)
  });

  it('starts the song and the drums together on bar 1', () => {
    expect(playAlongStart({ bar1: 3.5, start: 'bar1' }, 1, 0)).toEqual({
      songAt: 0,
      songFrom: 3.5,
      drumsAt: 0,
    });
    // a count-in: the song starts with it, a bar before bar 1
    expect(playAlongStart({ bar1: 3.5, start: 'bar1' }, 1, 2.4)).toEqual({
      songAt: -2.4,
      songFrom: 1.1,
      drumsAt: -2.4,
    });
    // ... or from its start, when bar 1 comes sooner than that
    const early = playAlongStart({ bar1: 1.2, start: 'bar1' }, 1, 2.4);
    expect(early.songFrom).toBe(0);
    expect(early.songAt).toBeCloseTo(-1.2, 9);
    expect(early.drumsAt).toBeCloseTo(-2.4, 9);
  });

  it('starts the song at its start for an intro, the drums on bar 1', () => {
    expect(playAlongStart({ bar1: 12, start: 'intro' }, 1, 0)).toEqual({
      songAt: -12,
      songFrom: 0,
      drumsAt: 0,
    });
    // slower: the intro takes longer to play
    expect(playAlongStart({ bar1: 12, start: 'intro' }, 0.8, 0).songAt).toBe(-15);
  });

  it('knows where in the song it is through its changes of speed', () => {
    const changes = [
      { at: 10, from: 2, rate: 1 },
      { at: 14, from: 6, rate: 0.5 },
    ];
    expect(songPositionAt(changes, 12)).toBe(4);
    expect(songPositionAt(changes, 16)).toBe(7);
    expect(songPositionAt(changes, 9)).toBe(1); // (still to start)
    expect(songPositionAt([], 5)).toBe(0);
  });

  it('finds the hit nearest a tap, or keeps the tap where there is none', () => {
    const rate = 1000;
    const samples = new Float32Array(3000);
    samples.fill(0.01);
    for (let i = 1500; i < 1600; i++) samples[i] = 0.8 * Math.exp(-(i - 1500) / 30);
    expect(nearestHit(samples, rate, 1.47, 0.06)).toBeCloseTo(1.5, 9);
    expect(nearestHit(samples, rate, 1.53, 0.06)).toBeCloseTo(1.5, 9);
    expect(nearestHit(samples, rate, 0.7, 0.06)).toBeCloseTo(0.7, 9); // (only a quiet hum there)
    expect(nearestHit(samples, rate, 1.62, 0.06)).toBeCloseTo(1.62, 9); // (the hit dying away)
    expect(firstHit(samples, rate)).toBeCloseTo(1.5, 9);
  });

  it('draws the loudest sample in each column', () => {
    const samples = new Float32Array([0.1, -0.5, 0.2, 0.3, 0, -0.9, 0.4, 0.1]);
    const peaks = wavePeaks(samples, 4, 0, 2, 2);
    expect(peaks[0]).toBeCloseTo(0.5, 6);
    expect(peaks[1]).toBeCloseTo(0.9, 6);
    expect(wavePeaks(samples, 4, 0, 2, 4)).toHaveLength(4);
  });

  it('writes and reads times in a song to the ms', () => {
    expect(songTimeText(1.2345)).toBe('0:01.235'); // (to the ms: 1.2345 is just under)
    expect(songTimeText(62.5)).toBe('1:02.500');
    expect(songTimeText(-1)).toBe('0:00.000');
    expect(songTimeFromText('1:02.5')).toBeCloseTo(62.5, 9);
    expect(songTimeFromText(' 3.2149 ')).toBeCloseTo(3.215, 9);
    expect(songTimeFromText('12')).toBe(12);
    expect(songTimeFromText('abc')).toBeNaN();
  });

  it('knows a song on this device by its name and length', () => {
    expect(songKey('Song.mp3', 183.4)).toBe('Song.mp3|183');
  });
});

describe('a song in a link', () => {
  const get = (url) => (name, fallback) => {
    const pair = url
      .split('&')
      .map((p) => p.split('='))
      .find((p) => p[0].toLowerCase() == name.toLowerCase());
    return pair ? pair[1] : fallback;
  };

  it('carries the song name, tempo, bar 1 and start', () => {
    const settings = Object.assign(emptyPracticeSettings(), {
      song: { name: 'Back in Black (live).mp3', bpm: 92.4, bar1: 3.2149, start: 'intro' },
    });
    const url = practiceSettingsToUrl(settings);
    expect(url).toBe(
      '&Song=Back%20in%20Black%20(live).mp3&SongBPM=92.4&SongBar1=3.215&SongStart=intro'
    );
    expect(practiceSettingsFromUrl(get(url.slice(1))).song).toEqual({
      name: 'Back in Black (live).mp3',
      bpm: 92.4,
      bar1: 3.215,
      start: 'intro',
    });
  });

  it('starts at bar 1 unless it says the intro, and needs a name and a tempo', () => {
    expect(practiceSettingsFromUrl(get('Song=A.mp3&SongBPM=100')).song).toEqual({
      name: 'A.mp3',
      bpm: 100,
      bar1: 0,
      start: 'bar1',
    });
    expect(practiceSettingsFromUrl(get('Song=A+b.mp3&SongBPM=100')).song.name).toBe('A b.mp3');
    expect(practiceSettingsFromUrl(get('Song=A.mp3&SongBPM=900')).song).toBeUndefined();
    expect(practiceSettingsFromUrl(get('SongBPM=100')).song).toBeUndefined();
    expect(practiceSettingsFromUrl(get('Tempo=80')).song).toBeUndefined();
    expect(practiceSettingsToUrl(emptyPracticeSettings())).toBe('');
  });
});

// --- the steady clock, on a pretend audio clock ---

// a round as MIDI.js holds it: [event, ms since the one before]; Scribe's blank
// tick first (bar 1's notes a tick late), a kick on each beat, the bar's end
const TICK = 600 / 128; // ms, at 100 bpm
function kickRound(bars) {
  const data = [[{ event: { type: 'meta', subtype: 'setTempo' } }, 0]];
  data.push([{ event: { type: 'channel', subtype: 'noteOff', channel: 9, noteNumber: 60 } }, TICK]);
  for (let bar = 0; bar < bars; bar++) {
    for (let beat = 0; beat < 4; beat++)
      data.push([
        {
          event: { type: 'channel', subtype: 'noteOn', channel: 9, noteNumber: 35, velocity: 100 },
        },
        beat == 0 ? 0 : 600, // (a bar's first kick comes with the end of the bar before)
      ]);
    data.push([
      { event: { type: 'channel', subtype: 'noteOff', channel: 0, noteNumber: 60 } },
      bar == 0 ? 600 - TICK : 600,
    ]);
  }
  return data;
}
// (a 1-bar round: blank, kicks at TICK + 600k, the bar's end at 2400.5)

function fakeAudio() {
  const started = [];
  const param = (value) => ({
    value,
    changes: [],
    setValueAtTime(v, t) {
      this.changes.push([t, v]);
    },
    linearRampToValueAtTime() {},
    cancelScheduledValues(t) {
      this.changes = this.changes.filter((c) => c[0] < t);
    },
  });
  const ctx = {
    get currentTime() {
      return Date.now() / 1000;
    },
    destination: {},
    createGain: () => ({ gain: param(1), connect() {} }),
    createBufferSource() {
      const source = {
        playbackRate: param(1),
        connect() {},
        start(when, offset) {
          started.push({ when, offset, source });
        },
        stop(t) {
          source.stopped = t;
        },
      };
      return source;
    },
  };
  return { ctx, started };
}

function fakeMidi() {
  const midi = {
    channels: { 0: {}, 9: {} },
    played: [],
    noteOn(channel, note, velocity, at) {
      const source = { note, at, stop: vi.fn(), disconnect: vi.fn() };
      midi.played.push(source);
      return source;
    },
    noteOff() {},
    setVolume: vi.fn(),
    Player: {},
  };
  return midi;
}

describe('the steady clock', () => {
  let audio, midi, told, onTell, loaded, leadsIn, engine;

  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
    });
    vi.setSystemTime(1000 * 1000); // the audio clock at 1000 s
    audio = fakeAudio();
    midi = fakeMidi();
    told = [];
    onTell = null;
    loaded = { data: kickRound(1), bpm: 100 };
    leadsIn = false;
    engine = createPlayAlong({
      ctx: () => audio.ctx,
      midi: () => midi,
      round: () => loaded,
      leadsIn: () => leadsIn,
      tell: (data) => {
        told.push(data);
        if (onTell) onTell(data);
      },
      songEnded: vi.fn(),
    });
    engine.setSong({ duration: 200 }, { name: 'Song.mp3', bpm: 100, bar1: 10, start: 'bar1' });
    engine.loop(true);
  });

  afterEach(() => {
    engine.stop();
    vi.useRealTimers();
  });

  const kicks = () =>
    midi.played.filter((n) => n.note == 35 && !n.stop.mock.calls.length).map((n) => n.at);
  const songStart = () => audio.started[audio.started.length - 1];

  it('starts the song and the first bar together, every kick on the song’s beat', () => {
    engine.start();
    expect(engine.playing).toBe(true);
    const song = songStart();
    expect(song.offset).toBe(10); // from bar 1
    vi.advanceTimersByTime(10000); // four rounds and a bit
    const beats = kicks().map((at) => song.offset + (at - song.when) - 10);
    beats.forEach((beat, k) => expect(beat).toBeCloseTo(k * 0.6, 9));
    expect(beats.length).toBeGreaterThan(16);
  });

  it('tells Scribe each note as MIDI.js would, and each round’s end once, a moment early', () => {
    engine.start();
    const song = songStart();
    vi.advanceTimersByTime(2350); // just past the round's end, less the handover
    const ends = told.filter((d) => d.now == d.end);
    expect(ends).toHaveLength(1);
    expect(ends[0]).toMatchObject({ channel: 0, note: 60, message: 128, end: 2400.5 });
    const kicksTold = told.filter((d) => d.message == 144 && d.note == 35);
    expect(kicksTold.map((d) => Math.round(d.now))).toEqual([5, 605, 1205, 1805]);
    // (which is before the round has ended on the clock)
    expect(Date.now() / 1000).toBeLessThan(song.when + 2.4);
  });

  it('starts the round Scribe builds exactly where the last one ends', () => {
    engine.start();
    const song = songStart();
    // Scribe builds the next round (a speed-up...) when it hears the end
    let built = false;
    onTell = (data) => {
      if (data.now == data.end && !built) {
        built = true;
        engine.stop();
        loaded = { data: kickRound(2), bpm: 100 };
        engine.start();
      }
    };
    vi.advanceTimersByTime(7000);
    expect(built).toBe(true);
    expect(engine.playing).toBe(true);
    const beats = kicks().map((at) => at - song.when);
    beats.forEach((beat, k) => expect(beat).toBeCloseTo(k * 0.6, 9));
    expect(beats.length).toBeGreaterThan(9);
  });

  it('stops by itself after the round Scribe ends with, the song fading out', () => {
    engine.start();
    const song = songStart();
    onTell = (data) => {
      if (data.now == data.end) engine.stop(); // (the groove isn't repeating)
    };
    vi.advanceTimersByTime(3000);
    expect(engine.playing).toBe(false);
    expect(song.source.stopped).toBeCloseTo(song.when + 2.4 + 1.5, 9);
    expect(kicks()).toHaveLength(4); // (none after)
  });

  it('puts a count-in’s end on bar 1, its clicks on the beats before', () => {
    leadsIn = true;
    const countIn = kickRound(1);
    countIn[countIn.length - 1][1] += TICK; // a count-in lasts its blank tick longer
    loaded = { data: countIn, bpm: 100 };
    engine.start();
    const song = songStart();
    expect(song.offset).toBeCloseTo(10 - 2.4, 9); // the song starts with the count-in
    onTell = (data) => {
      if (data.now == data.end && leadsIn) {
        leadsIn = false;
        engine.stop();
        loaded = { data: kickRound(1), bpm: 100 };
        engine.start();
      }
    };
    vi.advanceTimersByTime(4000);
    const beats = kicks().map((at) => song.offset + (at - song.when) - 10);
    beats.forEach((beat, k) => expect(beat).toBeCloseTo((k - 4) * 0.6, 9));
  });

  it('plays the song slower with a slower groove, its beats still with the kicks', () => {
    engine.setSetting({ name: 'Song.mp3', bpm: 125, bar1: 10, start: 'bar1' });
    engine.start();
    const song = songStart();
    expect(song.source.playbackRate.value).toBeCloseTo(0.8, 9);
    vi.advanceTimersByTime(5000);
    const beats = kicks().map((at) => song.offset + (at - song.when) * 0.8 - 10);
    beats.forEach((beat, k) => expect(beat).toBeCloseTo(k * 0.48, 9)); // (the song's own beat)
  });

  it('carries on from where it was paused, song and drums together', () => {
    engine.start();
    const song = songStart();
    vi.advanceTimersByTime(1000);
    engine.pause();
    expect(engine.playing).toBe(false);
    const position = song.offset + (Date.now() / 1000 - song.when);
    vi.advanceTimersByTime(5000);
    engine.resume();
    const again = songStart();
    expect(again.offset).toBeCloseTo(position, 9);
    vi.advanceTimersByTime(3000);
    // every kick still sounding is on the song's beat
    const after = kicks().filter((at) => at > again.when);
    after.forEach((at) => {
      const beat = again.offset + (at - again.when) - 10;
      expect(beat / 0.6 - Math.round(beat / 0.6)).toBeCloseTo(0, 6);
    });
    expect(after.length).toBeGreaterThan(3);
  });

  it('changes tempo at the next bar line, the song speeding up there too', () => {
    loaded = { data: kickRound(4), bpm: 100 };
    engine.start();
    const song = songStart();
    vi.advanceTimersByTime(1000);
    const switched = vi.fn();
    const faster = { data: kickRound(4).map(([e, ms]) => [e, ms * 0.8]), bpm: 125 };
    expect(
      engine.switchTempoAtNextBar(
        faster.data,
        125,
        [2400, 2400, 2400, 2400],
        [1920, 1920, 1920, 1920],
        switched
      )
    ).toBe(true);
    const rate = song.source.playbackRate.changes;
    expect(rate).toHaveLength(1);
    expect(rate[0][0]).toBeCloseTo(song.when + 2.4, 9);
    expect(rate[0][1]).toBeCloseTo(1.25, 9);
    vi.advanceTimersByTime(1600);
    expect(switched).toHaveBeenCalledWith(1);
    vi.advanceTimersByTime(3000);
    const line = song.when + 2.4;
    kicks().forEach((at) => {
      const position = at <= line ? at - song.when : 2.4 + (at - line) * 1.25;
      expect(position / 0.6 - Math.round(position / 0.6)).toBeCloseTo(0, 6);
    });
  });

  it('moves the drums straight away when bar 1 is nudged', () => {
    engine.start();
    const song = songStart();
    vi.advanceTimersByTime(1000);
    engine.moveBar1(0.01);
    vi.advanceTimersByTime(3000);
    const later = kicks().filter((at) => at > song.when + 1.1);
    later.forEach((at) => {
      const beat = at - song.when - 0.01;
      expect(beat / 0.6 - Math.round(beat / 0.6)).toBeCloseTo(0, 6);
    });
    expect(later.length).toBeGreaterThan(3);
  });

  it('is off without a song, and puts the drums’ volume back', () => {
    expect(engine.isOn()).toBe(true);
    engine.setVolumes(1, 0.5);
    engine.start();
    expect(midi.setVolume).toHaveBeenLastCalledWith(0, 64);
    engine.setSong(null, null);
    expect(engine.isOn()).toBe(false);
    expect(engine.playing).toBe(false);
    expect(midi.setVolume).toHaveBeenLastCalledWith(0, 127);
  });
});
