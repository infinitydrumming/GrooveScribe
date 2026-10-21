import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { newGrooveWriter, buildFullPageDOM } from '../helpers/loadGrooveWriter.js';
import { installMidiGlobal } from '../helpers/legacyLoader.js';

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

// the app's own pop-ups and parts, from index.html
function addPopups(...ids) {
  const page = new DOMParser().parseFromString(readFileSync('index.html', 'utf8'), 'text/html');
  ids.forEach((id) => document.body.appendChild(page.getElementById(id)));
}

// Infinity Drumming, 2026: a whole exercise in its link (practice settings and
// instructions), as the editor opens and shares it.
describe('an exercise in its link', () => {
  let gw;
  const EXERCISE =
    '?TimeSig=4/4&Div=16&Tempo=70&Measures=1&MetronomeFreq=4&Perm=kick_16ths&PlayEach=3' +
    '&SpeedUp=5,16b,once,to120&CountIn=1&ClickSolo=1&ClickStart=AND&Mute=hh:1' +
    '&Instructions=' +
    encodeURIComponent('Each figure ×3.\nThen <b>faster</b>') +
    '&H=|x-x-x-x-x-x-x-x-|&S=|----O-------O---|&K=|o-------o-------|';
  beforeEach(async () => {
    // the tempo's address-bar update waits 300 ms: run it before the page goes
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    window.history.replaceState(null, '', '/' + EXERCISE);
    document.body.innerHTML = '';
    globalThis.MIDI = makeMidiMock();
    await installMidiGlobal();
    gw = await newGrooveWriter();
    buildFullPageDOM(gw, 1);
    addPopups(
      'metronomeAutoSpeedupConfiguration',
      'metronomeOptionsContextMenu',
      'metronomeOptionsOffsetClickContextMenu',
      'fullURLPopup',
      'exerciseInstructionsCard'
    );
    gw.runsOnPageLoad();
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    delete globalThis.MIDI;
    vi.restoreAllMocks();
    window.history.replaceState(null, '', '/');
  });

  const checked = (id) => document.getElementById(id).className.includes('menuChecked');
  const params = (url) => [...new URL(url).searchParams.keys()];

  it('puts every setting in place when it opens', () => {
    expect(document.getElementById('PermutationOptions').className).toContain('displayed');
    expect(
      document.querySelector('#PermutationOptions select, #PermutationOptions input[type=number]')
        .value
    ).toBe('3');
    expect(checked('metronomeOptionsContextMenuSpeedUp')).toBe(true);
    expect(document.getElementById('metronomeAutoSpeedupUnitBars').checked).toBe(true);
    expect(document.getElementById('metronomeAutoSpeedupTempoIncreaseBars').value).toBe('16');
    expect(document.getElementById('metronomeAutoSpeedUpKeepGoingForever').checked).toBe(false);
    expect(document.getElementById('metronomeAutoSpeedUpTargetTempo').value).toBe('120');
    expect(checked('metronomeOptionsContextMenuCountIn')).toBe(true);
    expect(checked('metronomeOptionsContextMenuSolo')).toBe(true);
    expect(checked('metronomeOptionsOffsetClickContextMenuOnTheAND')).toBe(true);
    expect(document.getElementById('unmutehhButton1').style.display).toBe('inline-block');
  });

  it('shows the instructions as plain text over the music', () => {
    const card = document.getElementById('exerciseInstructionsCard');
    expect(card.style.display).toBe('block');
    expect(document.getElementById('exerciseInstructionsCardText').textContent).toBe(
      'Each figure ×3.\nThen <b>faster</b>'
    );
    expect(card.querySelector('b')).toBeNull();
    gw.hideInstructionsCard();
    expect(card.style.display).toBe('none');
  });

  it('shares them unless "Include practice settings" is unticked; the instructions always', () => {
    gw.fillInFullURLInFullURLPopup();
    const field = document.getElementById('fullURLPopupTextField');
    expect(params(field.value)).toEqual(
      expect.arrayContaining([
        'Perm',
        'PlayEach',
        'SpeedUp',
        'CountIn',
        'ClickSolo',
        'ClickStart',
        'Mute',
        'Instructions',
      ])
    );
    document.getElementById('includePracticeCheckbox').checked = false;
    gw.shareSettingsChanged();
    expect(params(field.value)).not.toEqual(expect.arrayContaining(['Perm']));
    for (const name of ['SpeedUp', 'CountIn', 'ClickSolo', 'ClickStart', 'Mute'])
      expect(params(field.value)).not.toContain(name);
    expect(params(field.value)).toContain('Instructions');
    // the address bar keeps everything
    expect(window.location.search).toContain('SpeedUp=5,16b,once,to120');
  });

  it('puts new instructions in the link and on the card', () => {
    gw.fillInFullURLInFullURLPopup();
    document.getElementById('exerciseInstructions').value = 'Slowly first';
    gw.instructionsChanged();
    const field = document.getElementById('fullURLPopupTextField');
    expect(new URL(field.value).searchParams.get('Instructions')).toBe('Slowly first');
    expect(document.getElementById('exerciseInstructionsCardText').textContent).toBe(
      'Slowly first'
    );
    expect(new URLSearchParams(window.location.search).get('Instructions')).toBe('Slowly first');
  });

  it('practises just the chosen bars of a permutation, numbered as in the whole run', () => {
    window.history.replaceState(
      null,
      '',
      '/' + EXERCISE.replace('&PlayEach=3', '&PlayEach=3&PermBars=3-4')
    );
    gw.loadNewGroove(window.location.search);
    const numbers = () =>
      [...document.getElementById('ABCsource').value.matchAll(/%%setbarnb (\d+)/g)].map(
        (m) => +m[1]
      );
    expect(document.getElementById('PermutationBars').value).toBe('3-4');
    expect(numbers()).toEqual([4]); // bar 3 opens the music; bar 4 is numbered
    expect(document.getElementById('ABCsource').value).toMatch(/P:.*\(bar 3\)/);
    expect(window.location.search).toContain('PermBars=3-4');

    const box = document.getElementById('PermutationBars');
    box.value = ' 7-8,5 ';
    gw.permutationBarsChange({ target: box });
    expect(box.value).toBe('5, 7-8');
    expect(numbers()).toEqual([7, 8]);

    box.value = '';
    gw.permutationBarsChange({ target: box });
    expect(numbers().slice(0, 3)).toEqual([2, 3, 4]); // the whole run again
    expect(window.location.search).not.toContain('PermBars');
  });
});
