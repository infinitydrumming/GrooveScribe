import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { newGrooveWriter, buildFullPageDOM } from '../helpers/loadGrooveWriter.js';
import { installMidiGlobal } from '../helpers/legacyLoader.js';

// Infinity Drumming, 2026: the practice timer (stop after so many minutes or
// bars) and speed-up every so many bars, as the editor plays a groove.

function makeMidiMock() {
  return {
    Player: {
      playing: false,
      currentTime: 0,
      endTime: 0,
      start: vi.fn(),
      stop: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      loop: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      loadFile: vi.fn((url, cb) => cb && cb()),
      ctx: { resume: vi.fn() },
    },
    loadPlugin: vi.fn((opts) => opts && opts.callback && opts.callback()),
    programChange: vi.fn(),
    setVolume: vi.fn(),
    noteOn: vi.fn(),
    noteOff: vi.fn(),
    WebAudio: {},
    AudioTag: {},
    USE_XHR: false,
  };
}

// the app's own pop-ups for these options, from index.html
function addPopups(...ids) {
  const page = new DOMParser().parseFromString(readFileSync('index.html', 'utf8'), 'text/html');
  ids.forEach((id) => document.body.appendChild(page.getElementById(id)));
}

// every note-on of the MIDI file last loaded, as { tick, key }
function loadedNotes() {
  const url = String(globalThis.MIDI.Player.loadFile.mock.calls.at(-1)[0]);
  const bytes = Uint8Array.from(atob(url.split(',')[1]), (c) => c.charCodeAt(0));
  const notes = [];
  let p = 22;
  let tick = 0;
  let status = 0;
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
      const length = vlq();
      p += length;
    } else if ((status & 0xf0) == 0xc0) p++;
    else {
      if ((status & 0xf0) == 0x90 && bytes[p + 1] > 0) notes.push({ tick, key: bytes[p] });
      p += 2;
    }
  }
  return notes;
}
const HH = 42;
const CRASH = 49;

// 4 bars of 16th-note hi-hats in 4/4
const FOUR_BARS =
  '?TimeSig=4/4&Div=16&Tempo=120&Measures=4&H=|' +
  Array(4).fill('x'.repeat(16)).join('|') +
  '|&S=|' +
  Array(4).fill('-'.repeat(16)).join('|') +
  '|&K=|' +
  Array(4).fill('o-------o-------').join('|') +
  '|';

describe('practice timer and speed-up in bars', () => {
  let gw;
  beforeEach(async () => {
    document.body.innerHTML = '';
    globalThis.MIDI = makeMidiMock();
    await installMidiGlobal();
    gw = await newGrooveWriter();
    buildFullPageDOM(gw, 4);
    addPopups(
      'practiceTimerConfiguration',
      'metronomeAutoSpeedupConfiguration',
      'metronomeOptionsContextMenu'
    );
    gw.runsOnPageLoad();
  });
  afterEach(() => {
    delete globalThis.MIDI;
    vi.restoreAllMocks();
  });

  const link = () => gw.myGrooveUtils.getUrlStringFromGrooveData(gw.grooveDataFromClickableUI());
  const callbacks = () => gw.myGrooveUtils.midiEventCallbacks;
  // play from the start, then `rounds` more times round; the notes of the last
  const playRounds = (rounds) => {
    callbacks().loadMidiDataEvent(gw, true);
    for (let r = 0; r < rounds; r++) {
      callbacks().notePlaying(gw, 'complete', 1);
      callbacks().loadMidiDataEvent(gw, false);
    }
    return loadedNotes();
  };
  const barsIn = (notes) => notes.filter((n) => n.key == HH).length / 16;

  it('stops after 6 bars: the second time round is 2 bars, then a crash on the 1', () => {
    gw.loadNewGroove(FOUR_BARS + '&Practice=6b');
    expect(barsIn(playRounds(0))).toBe(4);
    const last = playRounds(1);
    expect(barsIn(last)).toBe(2);
    const crash = last.find((n) => n.key == CRASH);
    expect(crash.tick).toBe(2 * 512); // right on the bar line after bar 2
    expect(gw.myGrooveUtils.stopAtEndOfRound).toBe(false);
    callbacks().notePlaying(gw, 'complete', 1); // the last bars have played
    expect(gw.myGrooveUtils.stopAtEndOfRound).toBe(true);
  });

  it('stops after 1 minute at 120 bpm: 30 bars, the 8th time round cut to 2', () => {
    gw.loadNewGroove(FOUR_BARS + '&Practice=1m');
    expect(barsIn(playRounds(6))).toBe(4); // bars 25 to 28
    expect(barsIn(playRounds(7))).toBe(2); // bars 29 and 30, then the crash
  });

  it('keeps playing round and round without a timer', () => {
    gw.loadNewGroove(FOUR_BARS);
    const notes = playRounds(3);
    expect(barsIn(notes)).toBe(4);
    expect(notes.some((n) => n.key == CRASH)).toBe(false);
    callbacks().notePlaying(gw, 'complete', 1);
    expect(gw.myGrooveUtils.stopAtEndOfRound).toBe(false);
  });

  it('is set from its pop-up and saved in the link', () => {
    gw.loadNewGroove(FOUR_BARS);
    expect(link()).not.toContain('Practice=');
    gw.metronomeOptionsMenuPopupClick('PracticeTimer');
    document.getElementById('practiceTimerUnitBars').checked = true;
    gw.practiceTimerUnitChange();
    expect(document.getElementById('practiceTimerPresets').textContent).toContain('32');
    gw.practiceTimerPreset(32);
    gw.close_PracticeTimerConfiguration('ok');
    expect(link()).toContain('&Practice=32b');
    expect(
      document
        .getElementById('metronomeOptionsContextMenuPracticeTimer')
        .className.includes('menuChecked')
    ).toBe(true);
    gw.metronomeOptionsMenuPopupClick('PracticeTimer'); // clicking it again turns it off
    expect(link()).not.toContain('Practice=');
  });

  it('speeds up 5 bpm every 8 bars', () => {
    gw.loadNewGroove(FOUR_BARS.replace('Tempo=120', 'Tempo=80'));
    gw.metronomeOptionsMenuPopupClick('SpeedUp');
    document.getElementById('metronomeAutoSpeedupUnitBars').checked = true;
    gw.speedUpUnitChange();
    document.getElementById('metronomeAutoSpeedupTempoIncreaseBars').value = '8';
    gw.close_MetronomeAutoSpeedupConfiguration('ok');
    const tempoAfterRound = () => {
      callbacks().notePlaying(gw, 'complete', 1);
      callbacks().loadMidiDataEvent(gw, false);
      return gw.myGrooveUtils.getTempo();
    };
    callbacks().loadMidiDataEvent(gw, true);
    expect(tempoAfterRound()).toBe(80); // 4 bars
    expect(tempoAfterRound()).toBe(85); // 8 bars
    expect(tempoAfterRound()).toBe(85); // 12 bars
    expect(tempoAfterRound()).toBe(90); // 16 bars
  });

  it('shows the bars in the speed-up pop-up only when counting bars', () => {
    gw.metronomeOptionsMenuPopupClick('SpeedUp');
    const barsText = document.getElementById('metronomeAutoSpeedupBarsText');
    expect(barsText.style.display).toBe('none');
    document.getElementById('metronomeAutoSpeedupUnitBars').checked = true;
    gw.speedUpUnitChange();
    expect(barsText.style.display).toBe('');
    expect(document.getElementById('metronomeAutoSpeedupMinutesText').style.display).toBe('none');
  });
});
