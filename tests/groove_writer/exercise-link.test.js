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
    // (the play bar's "Practise bars" box is the run's while a permutation is on)
    expect(document.getElementById('practiseBars').value).toBe('3-4');
    expect(numbers()).toEqual([4]); // bar 3 opens the music; bar 4 is numbered
    expect(document.getElementById('ABCsource').value).toMatch(/P:.*\(bar 3\)/);
    expect(window.location.search).toContain('PermBars=3-4');

    const box = document.getElementById('practiseBars');
    box.value = ' 7-8,5 ';
    gw.practiseBarsChange({ target: box });
    expect(box.value).toBe('5, 7-8');
    expect(numbers()).toEqual([7, 8]);

    // emptied without Enter: the whole run comes back once typing pauses
    box.value = '';
    gw.practiseBarsInput({ target: box });
    expect(numbers()).toEqual([7, 8]); // not yet
    vi.advanceTimersByTime(300);
    expect(numbers().slice(0, 3)).toEqual([2, 3, 4]); // the whole run again
    expect(window.location.search).not.toContain('PermBars');
  });

  it('counts the click when the Count menu says so, following the click as it changes', () => {
    const counts = () =>
      [...document.getElementById('ABCsource').value.matchAll(/"([^"$]+)"x/g)].map((m) => m[1]);
    gw.setCountChoice('click');
    expect(new URLSearchParams(window.location.search).get('Count')).toBe('click');
    expect(counts().slice(0, 5)).toEqual(['&', '&', '&', '&', '&']); // 4ths, from the & (every bar of the permutation)
    gw.metronomeOptionsMenuOffsetClickPopupClick('1');
    gw.setMetronomeFrequency('12');
    expect(counts().slice(0, 3)).toEqual(['1', '&', 'a']);
    gw.setCountChoice('off');
    expect(window.location.search).not.toContain('Count=');
  });

  it('plays the kick figures fat back when the link says so, as a setting of its own', () => {
    const FAT_BACK =
      '?TimeSig=4/4&Div=16&Tempo=80&Measures=1&Perm=kick_16ths&PermSet=001111111111111111111' +
      '&FatBack=1&H=|x-x-x-x-x-x-x-x-|&S=|----O-------O---|&K=|o-------o-------|';
    const link = () => gw.myGrooveUtils.getUrlStringFromGrooveData(gw.grooveDataFromClickableUI());
    const abc = () => document.getElementById('ABCsource').value;
    // the kicks of the first figure, Singles on "1"
    const kicksOn1 = () =>
      abc().split('% Singles on "1"')[1].split('%%voicemap drum\n')[1].split('\n')[0].split('F')
        .length - 1;
    gw.loadNewGroove(FAT_BACK);
    const box = document.getElementById('PermuationOptionsFatBack');
    expect(box.checked).toBe(true);
    expect(kicksOn1()).toBe(2); // on 1 and 3: the snare plays 2 and 4 alone
    expect(abc()).toContain('P: Singles   (fat back)');
    expect(link()).toContain('&PermSet=001111111111111111111&FatBack=1');

    box.checked = false;
    gw.permutationFatBackClick({ target: box });
    expect(kicksOn1()).toBe(4);
    expect(link()).toContain('&PermSet=001111111111111111111');
    expect(link()).not.toContain('FatBack');

    // a snare permutation has no fat back
    gw.loadNewGroove(FAT_BACK.replace('kick_16ths', 'snare_16ths'));
    expect(document.getElementById('PermuationOptionsFatBack')).toBeNull();
    expect(link()).not.toContain('FatBack');
  });

  // "Music spacing" (Infinity Drumming, 2026): how wide bars of music are drawn
  it('draws bars as wide as Music spacing says, and this device remembers it', () => {
    addPopups('musicSpacingConfiguration');
    const abc = () => document.getElementById('ABCsource').value;
    const page = () => Number(/%%pagewidth (\d+)px/.exec(abc())[1]);
    const margin = () => (/%%leftmargin (\d+)px/.exec(abc()) || [])[1];
    gw.loadNewGroove(EXERCISE.replace('&PlayEach=3', '&PermBars=1-3'));
    const moderate = page(); // (two practised bars a line)
    expect(abc()).toContain('%%stretchlast 0.01\n');

    gw.show_MusicSpacingConfiguration();
    expect(document.getElementById('musicSpacingAdjust').value).toBe('100');
    gw.musicSpacingChange({ target: { value: '60' } }); // three a line, on a wider page
    expect(window.localStorage.getItem('grooveScribeMusicSpacing')).toBe('60');
    expect(page()).toBeGreaterThan(moderate);
    expect(abc()).toContain('%%stretchlast 1\n');
    gw.musicSpacingChange({ target: { value: '210' } }); // the far end: a bar a line
    expect(page()).toBe(moderate);
    expect(document.getElementById('musicSpacingOutput').textContent).toContain('A bar a line');
    gw.musicSpacingReset();
    expect(page()).toBe(moderate);

    // a groove's bars too: at a quarter as wide, three bars on one line, centred
    gw.loadNewGroove(
      '?TimeSig=4/4&Div=16&Tempo=80&Measures=3&S=|----O-------O---|----O-------O---|----O-------O---|'
    );
    expect(margin()).toBeUndefined(); // (as laid out)
    gw.musicSpacingChange({ target: { value: '25' } });
    expect(margin()).toBe('320'); // (8 bars of 128px a line, on a 1024px page)
    expect(page()).toBe(1024);
    gw.close_MusicSpacingConfiguration();
    window.localStorage.clear();
  });

  // the Notes change's "Keep" switch (Infinity Drumming, 2026)
  it("keeps an ostinato's timing whatever the switch says", () => {
    gw.setNotesKeep('phrase');
    gw.loadNewGroove(
      '?TimeSig=4/4&Div=8&Tempo=80&Measures=1&Perm=kick_16ths' +
        '&H=|xxxxxxxx|&S=|--O---O-|&K=|o---o---|'
    );
    gw.changeDivision(16);
    const now = new URLSearchParams(window.location.search);
    expect(now.get('Div')).toBe('16');
    expect(now.get('S')).toBe('|----O-------O---|');
    expect(now.get('K')).toBe('|o-------o-------|');
    window.localStorage.clear();
  });

  it('keeps the ticks of a 1/16 triplet link from before the per-beat figures were filled out', () => {
    const ticked = () =>
      [...document.querySelectorAll('#PermutationOptions input[type="checkbox"]')]
        .filter((box) => box.checked)
        .map((box) => box.id);
    // Ostinato, Singles, Doubles, Singles/Doubles/Triples (per beat), every 2nd, every 4th
    const OLD = '0' + '0100' + '0000' + '0000000' + '0000000' + '1111111' + '000' + '11000';
    gw.loadNewGroove(
      '?TimeSig=4/4&Div=24&Tempo=70&Measures=1&Perm=kick_16ths&PermSet=' +
        OLD +
        '&H=|------------------------|&S=|------O-----------O-----|&K=|o-----------o-----------|'
    );
    const tripleBoxes = ['', 1, 2, 3, 4, 5, 6].map(
      (n) => 'PermuationOptionsTriplesBeat' + (n ? '_sub' + n : '')
    );
    expect(ticked()).toEqual([
      ...tripleBoxes,
      'PermuationOptionsSingles_sub1', // (now after the per-beat groups)
      'PermuationOptionsEvery4th',
      'PermuationOptionsEvery4th_sub1',
    ]);

    // a new link has a tick for every box, and opens the same
    const permSet = new URLSearchParams(window.location.search).get('PermSet');
    expect(permSet.length).toBe(OLD.length + 2 * 7 + 4 * 7 + 1);
    gw.loadNewGroove(window.location.search);
    expect(ticked()).toEqual([
      ...tripleBoxes,
      'PermuationOptionsSingles_sub1', // (now after the per-beat groups)
      'PermuationOptionsEvery4th',
      'PermuationOptionsEvery4th_sub1',
    ]);
  });
});
