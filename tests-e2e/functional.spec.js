import { test, expect, blockOutsideRequests } from './fixtures.js';
import { grooveUrl } from './corpus.js';
import { loadGroove, getSvg, grooveData } from './helpers.js';

// Functional end-to-end flows: drive the real UI and assert observable results.
// These cover the wiring the jsdom unit tests can only approximate — real clicks,
// real re-rendering, real menus.

const EMPTY_16 =
  '?TimeSig=4/4&Div=16&Tempo=80&Measures=1' +
  '&H=|----------------|&S=|----------------|&K=|----------------|';

test.beforeEach(async ({ page }) => {
  await loadGroove(page, grooveUrl(EMPTY_16));
});

test.describe('grid editing', () => {
  test('clicking a hi-hat cell turns a note on and re-renders the sheet music', async ({
    page,
  }) => {
    expect((await grooveData(page)).hhOn).toBe(0);
    await page.click('#hi-hat0');
    expect((await grooveData(page)).hhOn).toBe(1);
    // Sheet music re-rendered after the edit.
    expect(await getSvg(page)).toContain('<svg');
  });

  test('clearAllNotes empties the grid', async ({ page }) => {
    await page.click('#hi-hat0');
    await page.click('#snare4');
    expect((await grooveData(page)).hhOn).toBeGreaterThan(0);
    await page.evaluate(() => window.myGrooveWriter.clearAllNotes());
    const gd = await grooveData(page);
    expect(gd.hhOn).toBe(0);
    expect(gd.snareOn).toBe(0);
  });

  test('undo reverts an edit and redo re-applies it', async ({ page }) => {
    await page.click('#hi-hat0');
    expect((await grooveData(page)).hhOn).toBe(1);
    // force: the undo button is visually overlapped by the division-button
    // container at this viewport; we still want to fire its click handler.
    await page.click('#undoButton', { force: true });
    expect((await grooveData(page)).hhOn).toBe(0);
    await page.evaluate(() => window.myGrooveWriter.redoCommand());
    expect((await grooveData(page)).hhOn).toBe(1);
  });
});

test.describe('division & structure', () => {
  test('changing the subdivision updates notes-per-measure', async ({ page }) => {
    expect((await grooveData(page)).notesPerMeasure).toBe(16);
    await page.click('#subdivision_8ths');
    expect((await grooveData(page)).notesPerMeasure).toBe(8);
    await page.click('#subdivision_12ths');
    const gd = await grooveData(page);
    expect(gd.notesPerMeasure).toBe(12);
    expect(gd.timeDivision).toBe(12);
  });

  test('adding and removing a measure changes the measure count', async ({ page }) => {
    expect((await grooveData(page)).numberOfMeasures).toBe(1);
    await page.evaluate(() => window.myGrooveWriter.addMeasureButtonClick(1));
    expect((await grooveData(page)).numberOfMeasures).toBe(2);
    await page.evaluate(() => window.myGrooveWriter.closeMeasureButtonClick(2));
    expect((await grooveData(page)).numberOfMeasures).toBe(1);
  });

  test('toggling toms flips showToms and keeps the sheet rendering', async ({ page }) => {
    const before = (await grooveData(page)).showToms;
    await page.click('#showHideTomsButton');
    expect((await grooveData(page)).showToms).toBe(!before);
    expect(await getSvg(page)).toContain('<svg');
  });
});

test.describe('menus & popups', () => {
  test('grooves menu opens', async ({ page }) => {
    await page.click('#groovesAnchor');
    await expect(page.locator('#grooveListWrapper')).toBeVisible();
  });

  test('help menu opens', async ({ page }) => {
    await page.click('#helpAnchor');
    await expect(page.locator('#helpContextMenu')).toBeVisible();
  });

  test('share-URL popup shows the current groove URL', async ({ page }) => {
    await page.evaluate(() => window.myGrooveWriter.show_FullURLPopup());
    await expect(page.locator('#fullURLPopup')).toBeVisible();
    const shared = await page.inputValue('#fullURLPopupTextField');
    expect(shared).toContain('TimeSig=4/4');
  });
});

test.describe('playback', () => {
  test('pressing play starts MIDI playback', async ({ page }) => {
    await page.click('[id^="midiPlayImage"]');
    // Playback becomes active once the soundfont is ready.
    await expect
      .poll(() => page.evaluate(() => window.myGrooveWriter.myGrooveUtils.isPlaying()), {
        timeout: 15000,
      })
      .toBe(true);
    // Stop again cleanly and confirm playback ends.
    await page.evaluate(() => window.myGrooveWriter.myGrooveUtils.stopMIDI_playback());
    const stillPlaying = await page.evaluate(() => window.myGrooveWriter.myGrooveUtils.isPlaying());
    expect(stillPlaying).toBe(false);
  });
});

test.describe('export', () => {
  test('the ABC source is generated and the download menu opens', async ({ page }) => {
    const abc = await page.inputValue('#ABCsource');
    expect(abc).toContain('X:');
    await page.click('#downloadButton');
    await expect(page.locator('#downloadContextMenu')).toBeVisible();
  });
});

// Infinity Drumming, 2026: the click's count in a 16th-triplet permutation on a
// phone-wide page, where abc2svg breaks lines inside bars (it once crashed there).
test.describe('counting the click', () => {
  test('a 16th-triplet permutation counts the click on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await loadGroove(
      page,
      grooveUrl(
        '?TimeSig=4/4&Div=24&Tempo=80&Measures=1&MetronomeFreq=4&Count=click' +
          '&H=|x--x--x--x--x--x--x--x--|&S=|------O-----------O-----|&K=|o-----------o-----------|'
      )
    );
    await page.evaluate(() => {
      const gw = window.myGrooveWriter;
      gw.permutationPopupClick('kick_16ths');
      const box = document.getElementById('PermuationOptionsSinglesBeat');
      box.checked = true;
      gw.permutationOptionClick({ target: box });
      gw.setMetronomeFrequency('16'); // sextuplets on the triplet grid
    });
    expect(errors).toEqual([]);
    expect(await getSvg(page)).toContain('>li</text>');
  });
});

// Infinity Drumming, 2026: on a phone, dense bars go one to a line, and no line
// is broken in the middle of a bar (which loses its beams); a desktop keeps two.
test.describe('music lines on a phone', () => {
  const SEXTUPLETS =
    '?TimeSig=4/4&Div=24&Tempo=80&Measures=2&Count=1' +
    '&H=|x--x--x--x--x--x--x--x--|x--x--x--x--x--x--x--x--|' +
    '&S=|------O-----------O-----|------O-----------O-----|' +
    '&K=|o----o-----o--o---------|o----o-----o--o---------|';
  const musicLines = (page) =>
    page.evaluate(
      () =>
        [...document.querySelectorAll('#svgTarget svg')].filter((svg) => svg.querySelector('use'))
          .length
    );

  test('two bars of 16th triplets: a line each on a phone, one line on a desktop', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loadGroove(page, grooveUrl(SEXTUPLETS));
    expect(await musicLines(page)).toBe(2);
    expect(await page.inputValue('#ABCsource')).not.toMatch(/\|\\\n/); // no bar carries on to the next

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.evaluate(() => window.myGrooveWriter.refresh_ABC());
    expect(await musicLines(page)).toBe(1);
  });
});

// Infinity Drumming, 2026: "+ Add a copy" under every bar, and a bar copied on
// one of the site's addresses pasted on the other: each address has its own
// storage, so the bar goes by way of the device's clipboard.
test.describe('copies of bars', () => {
  const TWO_BARS =
    '?TimeSig=4/4&Div=8&Tempo=80&Measures=2&Mute=hh:2' +
    '&H=|xxxxxxxx|x-x-x-x-|&S=|--o---o-|-o-o-o-o|&K=|o---o---|oo--oo--|';
  const EMPTY_8 = '?TimeSig=4/4&Div=8&Tempo=80&Measures=1&H=|--------|&S=|--------|&K=|--------|';
  const inLink = (page, name) =>
    page.evaluate((param) => new URLSearchParams(window.location.search).get(param), name);

  test('"+ Add a copy" puts the bar right after it, and one undo takes it back', async ({
    page,
  }) => {
    await loadGroove(page, grooveUrl(TWO_BARS));
    await page.click('#duplicateMeasureButton1');
    expect(await inLink(page, 'Measures')).toBe('3');
    expect(await inLink(page, 'H')).toBe('|xxxxxxxx|xxxxxxxx|x-x-x-x-|');
    expect(await inLink(page, 'Mute')).toBe('hh:3');

    await page.click('#undoButton', { force: true });
    expect(await inLink(page, 'Measures')).toBe('2');
    expect(await inLink(page, 'Mute')).toBe('hh:2');
  });

  test('a bar copied on one address pastes on the other', async ({ page, context }) => {
    for (const origin of ['http://localhost:8000', 'http://127.0.0.1:8000'])
      await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
    await loadGroove(page, grooveUrl(TWO_BARS));
    await page.click('#copyMeasureButton2');

    const other = await context.newPage();
    await blockOutsideRequests(other);
    await loadGroove(other, 'http://127.0.0.1:8000' + grooveUrl(EMPTY_8));
    await other.bringToFront();
    await other.click('#pasteMeasureButton1');
    await expect.poll(() => inLink(other, 'K')).toBe('|oo--oo--|');
    expect(await inLink(other, 'S')).toBe('|-o-o-o-o|');
    expect(await inLink(other, 'H')).toBe('|x-x-x-x-|');
  });
});
