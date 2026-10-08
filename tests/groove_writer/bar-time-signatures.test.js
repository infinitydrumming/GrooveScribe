import { describe, it, expect, beforeEach, vi } from 'vitest';
import { newGrooveWriter, buildFullPageDOM } from '../helpers/loadGrooveWriter.js';

// Infinity Drumming, 2026: the editor with a time signature for each bar.

const ALIVE =
  '?TimeSig=4/4&Div=8&Tempo=120&Measures=3&BarSigs=4/4,2/4,4/4' +
  '&H=|xxxxxxxx|xxxx|xxxxxxxx|&S=|--o---o-|--o-|--o---o-|&K=|o---o---|o---|o---o---|';

describe('GrooveWriter: a time signature for each bar', () => {
  let gw;
  const link = () => gw.myGrooveUtils.getUrlStringFromGrooveData(gw.grooveDataFromClickableUI());
  const chooseBarTimeSig = (barNum, top, bottom) => {
    gw.barTimeSigButtonClick(barNum);
    document.getElementById('timeSigPopupTimeSigTop').value = String(top);
    document.getElementById('timeSigPopupTimeSigBottom').value = String(bottom);
    gw.timeSigPopupClose('ok');
  };

  beforeEach(async () => {
    document.body.innerHTML = '';
    gw = await newGrooveWriter();
    buildFullPageDOM(gw, 1);
    document.body.insertAdjacentHTML(
      'beforeend',
      '<div id="timeSigPopup"><div id="timeSigPopupTitle"></div>' +
        '<select id="timeSigPopupTimeSigTop">' +
        [2, 3, 4, 5, 6, 7].map((n) => `<option value="${n}">${n}</option>`).join('') +
        '</select><select id="timeSigPopupTimeSigBottom">' +
        [4, 8, 16].map((n) => `<option value="${n}">${n}</option>`).join('') +
        '</select></div>'
    );
    gw.loadNewGroove(ALIVE);
  });

  it('loads a groove whose bars differ and gives the same link back', () => {
    const url = link();
    expect(url).toContain('&BarSigs=4/4,2/4,4/4');
    expect(url).toContain('&H=|xxxxxxxx|xxxx|xxxxxxxx|');
    expect(url).toContain('&S=|--o---o-|--o-|--o---o-|');
  });

  it("hides the 2/4 bar's extra note slots on the grid", () => {
    // every bar has 8 slots; the 2/4 bar (slots 8-15) shows only the first 4
    expect(document.getElementById('hi-hat11').classList.contains('hiddenBarSlot')).toBe(false);
    expect(document.getElementById('hi-hat12').classList.contains('hiddenBarSlot')).toBe(true);
    expect(document.getElementById('snare15').classList.contains('hiddenBarSlot')).toBe(true);
    expect(document.getElementById('hi-hat16').classList.contains('hiddenBarSlot')).toBe(false);
  });

  it("changes one bar's time signature, keeping its notes from the start", () => {
    chooseBarTimeSig(2, 3, 4);
    const url = link();
    expect(url).toContain('&BarSigs=4/4,3/4,4/4');
    expect(url).toContain('&H=|xxxxxxxx|xxxx--|xxxxxxxx|'); // the 3/4 bar gains 2 rests
    expect(url).toContain('&S=|--o---o-|--o---|--o---o-|');
  });

  it('goes back to one time signature, and an ordinary link, when the bars match again', () => {
    chooseBarTimeSig(2, 4, 4);
    const url = link();
    expect(url).not.toContain('BarSigs');
    expect(url).toContain('&H=|xxxxxxxx|xxxx----|xxxxxxxx|');
  });

  it('adds a bar in the last bar’s time signature and removes bars', () => {
    chooseBarTimeSig(3, 3, 4);
    gw.addMeasureButtonClick();
    expect(link()).toContain('&BarSigs=4/4,2/4,3/4,3/4');
    gw.closeMeasureButtonClick(2);
    expect(link()).toContain('&BarSigs=4/4,3/4,3/4');
  });

  it("refuses a note setting that doesn't fit a bar", () => {
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    chooseBarTimeSig(2, 7, 8);
    gw.changeDivision(12); // 1/8 triplets don't fit a 7/8 bar
    expect(alert).toHaveBeenCalled();
    expect(link()).toContain('&Div=8');
    alert.mockRestore();
  });

  it('keeps the hidden slots empty, whatever is pasted into the bar', () => {
    gw.copyMeasureButtonClick(1);
    gw.pasteMeasureButtonClick(2); // a 4/4 bar into the 2/4 bar: only its first half fits
    expect(link()).toContain('&H=|xxxxxxxx|xxxx|xxxxxxxx|');
    expect(link()).toContain('&K=|o---o---|o---|o---o---|');
  });
});
