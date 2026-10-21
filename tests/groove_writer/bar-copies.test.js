import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { newGrooveWriter, buildFullPageDOM } from '../helpers/loadGrooveWriter.js';

// Infinity Drumming, 2026: "+ Add a copy" under every bar (the bar again, right
// after itself), bars copied from one window to another through the device's
// clipboard, and muted lines that stay with their bars as bars come and go.

// three bars that differ: bar 2 plays straight, the hi-hat is muted in bar 2
// and the kick in bar 3
const THREE_BARS =
  '?TimeSig=4/4&Div=8&Tempo=80&Measures=3&StraightBars=2&Mute=hh:2,kick:3' +
  '&H=|xxxxxxxx|x-x-x-x-|xx-xx-xx|&S=|--o---o-|-o-o-o-o|--o--o--|&K=|o---o---|oo--oo--|o--o--o-|';
const TWO_EMPTY_BARS =
  '?TimeSig=4/4&Div=8&Tempo=80&Measures=2&H=|--------|--------|&S=|--------|--------|&K=|--------|--------|';
const STORAGE_KEY = 'grooveScribeMeasureClipboard';

// jsdom has no scrollIntoView; adding a bar scrolls to it
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = vi.fn();

let gw;
const link = () => gw.myGrooveUtils.getUrlStringFromGrooveData(gw.grooveDataFromClickableUI());

// a window of the editor with this groove open; each address (and the
// home-screen app) has its own storage, so a new window starts without a copy
async function openWindow(groove) {
  document.body.innerHTML = '';
  window.localStorage.clear();
  gw = await newGrooveWriter();
  buildFullPageDOM(gw, 1);
  gw.loadNewGroove(groove);
}

// the device's clipboard, which every window shares
function useClipboard() {
  let text = '';
  const clipboard = {
    writeText: vi.fn((newText) => {
      text = newText;
      return Promise.resolve();
    }),
    readText: vi.fn(() => Promise.resolve(text)),
  };
  Object.defineProperty(window.navigator, 'clipboard', { value: clipboard, configurable: true });
  return clipboard;
}

// a paste reads the clipboard first: let that finish
async function settle() {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

beforeEach(async () => {
  await openWindow(THREE_BARS);
});

afterEach(() => {
  delete window.navigator.clipboard;
  vi.restoreAllMocks();
});

describe('"+ Add a copy" under every bar', () => {
  it('is under every bar', () => {
    [1, 2, 3].forEach((bar) =>
      expect(document.getElementById('duplicateMeasureButton' + bar)).not.toBeNull()
    );
  });

  it('puts a copy of the bar right after it, and moves the bars after it along', () => {
    gw.duplicateMeasureButtonClick(2);
    const url = link();
    expect(url).toContain('&Measures=4');
    expect(url).toContain('&H=|xxxxxxxx|x-x-x-x-|x-x-x-x-|xx-xx-xx|');
    expect(url).toContain('&S=|--o---o-|-o-o-o-o|-o-o-o-o|--o--o--|');
    expect(url).toContain('&K=|o---o---|oo--oo--|oo--oo--|o--o--o-|');
  });

  it("gives the copy the bar's swing / straight setting and muted lines", () => {
    gw.duplicateMeasureButtonClick(2);
    expect(link()).toContain('&StraightBars=2,3');
    expect(link()).toContain('&Mute=hh:2:3,kick:4');
    gw.duplicateMeasureButtonClick(4); // the last bar, at the end
    expect(link()).toContain('&Mute=hh:2:3,kick:4:5');
  });

  it('copies the first bar too', () => {
    gw.duplicateMeasureButtonClick(1);
    expect(link()).toContain('&H=|xxxxxxxx|xxxxxxxx|x-x-x-x-|xx-xx-xx|');
    expect(link()).toContain('&StraightBars=3');
    expect(link()).toContain('&Mute=hh:3,kick:4');
  });

  it('is one change of the link, so one undo takes it back', () => {
    gw.updateCurrentURL(); // the groove as it opened
    const changes = vi.spyOn(gw, 'AddFullURLToUndoStack');
    gw.duplicateMeasureButtonClick(2);
    expect(changes).toHaveBeenCalledTimes(1);
    expect(changes.mock.calls[0][0]).toContain('&Mute=hh:2:3,kick:4');

    gw.undoCommand();
    expect(link()).toContain('&Measures=3');
    expect(link()).toContain('&H=|xxxxxxxx|x-x-x-x-|xx-xx-xx|');
    expect(link()).toContain('&Mute=hh:2,kick:3');
  });

  it("copies a bar's own time signature when the bars differ", () => {
    gw.loadNewGroove(
      '?TimeSig=4/4&Div=8&Tempo=120&Measures=3&BarSigs=4/4,2/4,4/4' +
        '&H=|xxxxxxxx|xxxx|xxxxxxxx|&S=|--o---o-|--o-|--o---o-|&K=|o---o---|o---|o---o---|'
    );
    gw.duplicateMeasureButtonClick(2);
    expect(link()).toContain('&BarSigs=4/4,2/4,2/4,4/4');
    expect(link()).toContain('&H=|xxxxxxxx|xxxx|xxxx|xxxxxxxx|');
  });

  it("copies a bar's beats in the Mixed note setting", () => {
    // beats 3 and 4 are empty, so only the bar's own beats say they are quarter-note triplets
    const bar = '|' + 'x-----'.repeat(4).padEnd(48, '-') + '|';
    gw.loadNewGroove(
      `?TimeSig=4/4&Div=48&Tempo=80&Measures=1&Beats=ssqq&H=${bar}&S=${bar.replace(/x/g, '-')}` +
        `&K=${bar.replace(/x/g, '-')}`
    );
    gw.duplicateMeasureButtonClick(1);
    expect(link()).toContain('&Beats=ssqq,ssqq');
  });

  // (laying out 32 bars takes jsdom a few seconds)
  it('is not offered once the groove has the most bars a link holds (32)', () => {
    const bars = (cells) => '|' + new Array(32).fill(cells).join('|') + '|';
    gw.loadNewGroove(
      `?TimeSig=4/4&Div=4&Tempo=80&Measures=32&H=${bars('xxxx')}&S=${bars('----')}&K=${bars('o---')}`
    );
    expect(gw.numberOfMeasures()).toBe(32);
    expect(document.querySelector('.duplicateMeasureButton')).toBeNull();
    gw.duplicateMeasureButtonClick(1);
    expect(gw.numberOfMeasures()).toBe(32);
  }, 20_000);
});

describe('muted lines stay with their bars', () => {
  it('adding a bar keeps them, and the new bar copies the last bar’s', () => {
    gw.addMeasureButtonClick();
    expect(link()).toContain('&Mute=hh:2,kick:3:4');
  });

  it('removing a bar moves those of the bars after it along', () => {
    gw.closeMeasureButtonClick(2);
    expect(link()).toContain('&Measures=2');
    expect(link()).toContain('&Mute=kick:2');
    expect(link()).toContain('&H=|xxxxxxxx|xx-xx-xx|');
  });

  it('pasting into a bar keeps them all', () => {
    gw.copyMeasureButtonClick(1);
    gw.pasteMeasureButtonClick(3);
    expect(link()).toContain('&K=|o---o---|oo--oo--|o---o---|');
    expect(link()).toContain('&Mute=hh:2,kick:3');
  });
});

describe('copy and paste between windows (through the device clipboard)', () => {
  it('copying puts the bar on the device clipboard too', () => {
    const clipboard = useClipboard();
    gw.copyMeasureButtonClick(3);
    expect(clipboard.writeText).toHaveBeenCalledTimes(1);
    const text = clipboard.writeText.mock.calls[0][0];
    expect(text.startsWith('Infinity Scribe bar {')).toBe(true);
    const copied = JSON.parse(text.slice('Infinity Scribe bar '.length));
    expect(copied.lines.HH).toBe('xx-xx-xx');
    expect(copied.lines.Kick).toBe('o--o--o-');
    expect(copied.at).toBeGreaterThan(0);
  });

  it('pastes a bar copied in another window, which has its own storage', async () => {
    useClipboard();
    gw.copyMeasureButtonClick(3);
    await openWindow(TWO_EMPTY_BARS); // e.g. the other address, or the home-screen app
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();

    gw.pasteMeasureButtonClick(2);
    await settle();
    expect(link()).toContain('&H=|--------|xx-xx-xx|');
    expect(link()).toContain('&S=|--------|--o--o--|');
    expect(link()).toContain('&K=|--------|o--o--o-|');
  });

  it("takes the clipboard's bar when it was copied after this window's own copy", async () => {
    useClipboard();
    const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
    gw.copyMeasureButtonClick(1);
    const mine = window.localStorage.getItem(STORAGE_KEY);
    now.mockReturnValue(2000);
    gw.copyMeasureButtonClick(3);
    window.localStorage.setItem(STORAGE_KEY, mine); // bar 3 was copied in another window

    gw.pasteMeasureButtonClick(2);
    await settle();
    expect(link()).toContain('&K=|o---o---|o--o--o-|o--o--o-|');
  });

  it("takes this window's own copy when it is newer (the clipboard refused it)", async () => {
    const clipboard = useClipboard();
    const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
    gw.copyMeasureButtonClick(3);
    now.mockReturnValue(2000);
    clipboard.writeText.mockImplementationOnce(() => Promise.reject(new Error('NotAllowedError')));
    gw.copyMeasureButtonClick(1);

    gw.pasteMeasureButtonClick(2);
    await settle();
    expect(link()).toContain('&K=|o---o---|o---o---|o--o--o-|');
  });

  it('ignores anything else on the clipboard', async () => {
    const clipboard = useClipboard();
    gw.copyMeasureButtonClick(3);
    clipboard.writeText('https://scribe.infinitydrumming.com/?Div=16'); // copied since

    gw.pasteMeasureButtonClick(1);
    await settle();
    expect(link()).toContain('&K=|o--o--o-|oo--oo--|o--o--o-|');
  });

  it("uses this window's own copy when the clipboard can't be read", async () => {
    const clipboard = useClipboard();
    gw.copyMeasureButtonClick(3);
    clipboard.readText.mockImplementation(() => Promise.reject(new Error('NotAllowedError')));

    gw.pasteMeasureButtonClick(1);
    await settle();
    expect(link()).toContain('&K=|o--o--o-|oo--oo--|o--o--o-|');
  });

  it('still asks for a bar to be copied first when there is none anywhere', async () => {
    const clipboard = useClipboard();
    clipboard.writeText('some other text');
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const changes = vi.spyOn(gw, 'AddFullURLToUndoStack');

    gw.pasteMeasureButtonClick(1);
    await settle();
    expect(alert).toHaveBeenCalledWith(
      'Copy a bar first: use the copy button under the bar you want.'
    );
    expect(changes).not.toHaveBeenCalled();
    expect(link()).toContain('&K=|o---o---|oo--oo--|o--o--o-|');
  });
});
