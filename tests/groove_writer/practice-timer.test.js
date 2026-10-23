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
  afterEach(async () => {
    // a tempo change updates the address bar 300 ms later: let it, while the page is here
    await new Promise((resolve) => setTimeout(resolve, 350));
    delete globalThis.MIDI;
    vi.restoreAllMocks();
    // the address bar holds the practice settings now: the next test opens a fresh page
    window.history.replaceState(null, '', '/');
  });

  const link = () => gw.myGrooveUtils.getUrlStringFromGrooveData(gw.grooveDataFromClickableUI());
  const callbacks = () => gw.myGrooveUtils.midiEventCallbacks;
  // the tempo after the groove has played once more round
  const tempoAfterRound = () => {
    callbacks().notePlaying(gw, 'complete', 1);
    callbacks().loadMidiDataEvent(gw, false);
    return gw.myGrooveUtils.getTempo();
  };
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
    callbacks().loadMidiDataEvent(gw, true);
    expect(tempoAfterRound()).toBe(80); // 4 bars
    expect(tempoAfterRound()).toBe(85); // 8 bars
    expect(tempoAfterRound()).toBe(85); // 12 bars
    expect(tempoAfterRound()).toBe(90); // 16 bars
  });

  it('speeds up after any number of bars, 112 for example', () => {
    gw.loadNewGroove(FOUR_BARS.replace('Tempo=120', 'Tempo=80'));
    gw.metronomeOptionsMenuPopupClick('SpeedUp');
    document.getElementById('metronomeAutoSpeedupUnitBars').checked = true;
    gw.speedUpUnitChange();
    document.getElementById('metronomeAutoSpeedupTempoIncreaseBars').value = '112';
    gw.close_MetronomeAutoSpeedupConfiguration('ok');
    callbacks().loadMidiDataEvent(gw, true);
    for (let round = 1; round < 28; round++) expect(tempoAfterRound()).toBe(80); // up to 108 bars
    expect(tempoAfterRound()).toBe(85); // 112 bars
    expect(window.location.search).toContain('SpeedUp=5,112b');
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

  // --- practising some bars of a groove ("Practise bars" in the play bar) ---
  // bar n has its kick on its nth 16th
  const KICK = 35;
  const KICK_PER_BAR = FOUR_BARS.replace(
    /&K=.*$/,
    '&K=|' + [0, 1, 2, 3].map((n) => '-'.repeat(n) + 'o' + '-'.repeat(15 - n)).join('|') + '|'
  );
  // (a file's first bar starts a tick in)
  const kicks = (notes) => notes.filter((n) => n.key == KICK).map((n) => n.tick);
  const box = () => document.getElementById('practiseBars');

  it('plays just the bars a link says, round and round', () => {
    gw.loadNewGroove(KICK_PER_BAR + '&PlayBars=2,4');
    expect(kicks(playRounds(0))).toEqual([1 + 32, 512 + 96]); // bar 2, then bar 4
    expect(kicks(playRounds(1))).toEqual([1 + 32, 512 + 96]);
    expect(box().value).toBe('2, 4');
    expect(document.querySelector('#staff-container1').classList.contains('notPractised')).toBe(
      true
    );
    expect(document.querySelector('#staff-container2').classList.contains('notPractised')).toBe(
      false
    );
    expect(link()).toContain('&PlayBars=2,4');
    // the music: just those bars, numbered as in the whole groove (the music
    // engine numbers the bar after each "setbarnb"; the first is in the heading)
    const abc = document.getElementById('ABCsource').value;
    expect(abc).toContain('P:Bars 2, 4');
    expect([...abc.matchAll(/%%setbarnb (\d+)/g)].map((m) => +m[1])).toEqual([4]);
    expect(gw.myGrooveUtils.note_mapping_array).toHaveLength(2 * 32);
  });

  it('takes the bars typed in the box, tidied, into the link', () => {
    gw.loadNewGroove(KICK_PER_BAR);
    expect(box().value).toBe('');
    expect(kicks(playRounds(0))).toEqual([1, 512 + 32, 1024 + 64, 1536 + 96]); // all 4
    box().value = '3 - 4';
    gw.practiseBarsChange({ target: box() }); // (what leaving the box does)
    expect(box().value).toBe('3-4');
    expect(window.location.search).toContain('PlayBars=3-4');
    expect(kicks(playRounds(1))).toEqual([1 + 64, 512 + 96]);
    box().value = '';
    gw.practiseBarsChange({ target: box() });
    expect(window.location.search).not.toContain('PlayBars');
    expect(document.querySelectorAll('.notPractised')).toHaveLength(0);
  });

  it('counts the practised bars for the practice timer', () => {
    gw.loadNewGroove(KICK_PER_BAR + '&PlayBars=1-2&Practice=3b');
    expect(barsIn(playRounds(0))).toBe(2);
    const last = playRounds(1);
    expect(kicks(last)).toEqual([1, 512]); // bar 1 once more, then the crash and a kick
    expect(last.find((n) => n.key == CRASH).tick).toBe(512);
  });

  // --- sections (A ×2, B ×3 ...) ---
  it('plays its sections as many times as they say, the other bars once', () => {
    gw.loadNewGroove(KICK_PER_BAR + '&Sections=A1-2x2,B3x3');
    // bars 1, 2, 1, 2, 3, 3, 3, 4 (each bar's kick on its own 16th)
    expect(kicks(playRounds(0))).toEqual(
      [0, 1, 0, 1, 2, 2, 2, 3].map((bar, i) => i * 512 + bar * 32 + (i ? 0 : 1))
    );
    expect(link()).toContain('&Sections=A1-2x2,B3x3');
    // the music: each section once, its letter (bold, boxed) and repeat signs, how
    // many times under the end one
    const abc = document.getElementById('ABCsource').value;
    expect(abc).toContain('%%partsfont calibri-Bold 18 box\n');
    expect(abc).toContain('[P:A]|:');
    expect(abc).toContain('[P:B]|:');
    expect(abc.match(/ :\|/g)).toHaveLength(2); // (each section's end, in the hands' voice)
    expect(abc.match(/ "_\u00d72":\|/g)).toHaveLength(1); // (and the feet's)
    expect(abc.match(/ "_\u00d73":\|/g)).toHaveLength(1);
    expect(abc).toContain('%%measurenb 1');
  });

  // Infinity Drumming, 2026: a form, the order the sections play
  it('plays the sections in the order the form says, written once with the form over them', () => {
    const formBox = document.createElement('div');
    formBox.id = 'sectionFormBox';
    formBox.innerHTML = '<input id="sectionForm">';
    document.body.appendChild(formBox);
    gw.loadNewGroove(KICK_PER_BAR + '&Sections=A1x2,B2,C3&Form=ABAC');
    expect(formBox.style.display).toBe(''); // (shown: there are sections)
    // A twice (bar 1), B (bar 2), A twice, C (bar 3); bar 4 has no letter
    expect(kicks(playRounds(0))).toEqual(
      [0, 0, 1, 0, 0, 2].map((bar, i) => i * 512 + bar * 32 + (i ? 0 : 1))
    );
    expect(link()).toContain('&Sections=A1x2,B2,C3&Form=ABAC');
    expect(document.getElementById('ABCsource').value).toContain('%%center Form: A B A C\n');
    expect(document.getElementById('sectionForm').value).toBe('ABAC');

    gw.sectionFormChange('ca ca');
    expect(document.getElementById('sectionForm').value).toBe('CA CA');
    expect(link()).toContain('&Form=CA-CA');
    expect(document.getElementById('ABCsource').value).toContain('Form: C A   |   C A');
    gw.sectionFormChange(''); // in order again: every bar
    expect(link()).not.toContain('Form=');
    expect(document.getElementById('ABCsource').value).not.toContain('Form:');
  });

  it('sets sections from the bar chips: a bar joins the section before it', () => {
    gw.loadNewGroove(KICK_PER_BAR);
    gw.barSectionChange(3, 'B');
    gw.sectionRepeatsChange(3, '3');
    gw.barSectionChange(4, 'B');
    expect(link()).toContain('&Sections=B3-4x3');
    expect(document.querySelector('#barSection3 .sectionRepeatsSelect').value).toBe('3');
    expect(document.querySelector('#barSection4 .sectionRepeatsSelect')).toBeNull();
    // practise just B, by its letter
    box().value = 'b';
    gw.practiseBarsChange({ target: box() });
    expect(box().value).toBe('B');
    expect(kicks(playRounds(0))).toEqual([1 + 64, 512 + 96]);
    expect(document.getElementById('ABCsource').value).toContain('P:Section B');
  });

  it('leaves the box out for one bar, and with a permutation is for its run', () => {
    gw.loadNewGroove(KICK_PER_BAR.replace('Measures=4', 'Measures=1') + '&PlayBars=1');
    expect(box().parentNode.style.display).toBe('none');
    gw.loadNewGroove(KICK_PER_BAR + '&PlayBars=2');
    expect(box().parentNode.style.display).toBe('');
    gw.permutationPopupClick('kick_16ths');
    expect(box().value).toBe(''); // now the run's bars: all of them
    expect(link()).not.toContain('PlayBars');
    expect(document.getElementById('ABCsource').value).not.toContain('P:Bar 2');
  });
});
