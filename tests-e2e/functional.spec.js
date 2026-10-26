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

// Infinity Drumming, 2026: some notes of some lines, chosen with a box
test.describe('a block of notes', () => {
  const TWO_BARS =
    '?TimeSig=4/4&Div=16&Tempo=80&Measures=2&H=|x-x-x-x-x-x-x-x-|----------------|' +
    '&S=|----O-------O---|----------------|&K=|o-------o-------|----------------|';
  const inLink = (page, name) =>
    page.evaluate((param) => new URLSearchParams(window.location.search).get(param), name);
  const middle = async (page, id, scroll = true) => {
    if (scroll)
      await page.locator('#' + id).evaluate((cell) => cell.scrollIntoView({ block: 'center' }));
    const box = await page.locator('#' + id).boundingBox();
    return [box.x + box.width / 2, box.y + box.height / 2];
  };

  test('Shift + drag selects without playing notes; Ctrl + C, Shift-click, Ctrl + V pastes it there', async ({
    page,
  }) => {
    await loadGroove(page, grooveUrl(TWO_BARS));
    const [x0, y0] = await middle(page, 'hi-hat0');
    const [x1, y1] = await middle(page, 'snare7', false); // (in view with the first)
    await page.keyboard.down('Shift');
    await page.mouse.move(x0 - 4, y0 - 4);
    await page.mouse.down();
    await page.mouse.move(x1 + 4, y1 + 4, { steps: 6 });
    await page.mouse.up();
    await page.keyboard.up('Shift');
    await expect(page.locator('#noteSelectText')).toHaveText('2 lines × 8 notes');
    expect(await inLink(page, 'H')).toBe('|x-x-x-x-x-x-x-x-|----------------|'); // nothing played

    await page.keyboard.press('Control+c');
    const [kx, ky] = await middle(page, 'kick24'); // bar 2, beat 3
    await page.keyboard.down('Shift');
    await page.mouse.click(kx, ky);
    await page.keyboard.up('Shift');
    expect(await inLink(page, 'K')).toBe('|o-------o-------|----------------|'); // still no note
    await page.keyboard.press('Control+v');

    await expect.poll(() => inLink(page, 'H')).toBe('|x-x-x-x-x-x-x-x-|--------x-x-x-x-|');
    expect(await inLink(page, 'S')).toBe('|----O-------O---|------------O---|');
    expect(await inLink(page, 'K')).toBe('|o-------o-------|----------------|');
    await expect(page.locator('.noteSelected')).toHaveCount(16); // what was pasted

    await page.click('#undoButton', { force: true });
    await expect.poll(() => inLink(page, 'H')).toBe('|x-x-x-x-x-x-x-x-|----------------|');
  });
});

// Infinity Drumming, 2026: the MIDI that pressing play loads
const playing = (page) =>
  page.evaluate(() => {
    const gu = window.myGrooveWriter.myGrooveUtils;
    let midi = null;
    gu.loadMIDIFromURL = (url) => (midi = url);
    gu.midiEventCallbacks.loadMidiDataEvent(gu, true);
    return midi;
  });

// Infinity Drumming, 2026: "Practise bars" in the play bar plays just the bars typed
test.describe('practising some bars', () => {
  const bars = ['x-x-x-x-x-x-x-x-', 'xxxxxxxxxxxxxxxx', 'x---x---x---x---', 'X-X-X-X-X-X-X-X-'];
  const kicks = ['o---------------', '-o--------------', '--o-------------', '---o------------'];
  const groove = (which) =>
    '?TimeSig=4/4&Div=16&Tempo=80&Measures=' +
    which.length +
    '&H=|' +
    which.map((b) => bars[b]).join('|') +
    '|&S=|' +
    which.map(() => '----O-------O---').join('|') +
    '|&K=|' +
    which.map((b) => kicks[b]).join('|') +
    '|';

  test('typing bars plays just those, as a groove of only them would', async ({ page }) => {
    await loadGroove(page, grooveUrl(groove([1, 2])));
    const own = await playing(page);

    await loadGroove(page, grooveUrl(groove([0, 1, 2, 3])));
    await page.fill('#practiseBars', '2 - 3');
    await page.press('#practiseBars', 'Enter');
    await expect(page.locator('#practiseBars')).toHaveValue('2-3');
    await expect.poll(() => page.evaluate(() => location.search)).toContain('PlayBars=2-3');
    await expect(page.locator('.staff-container.notPractised')).toHaveCount(2);
    expect(await playing(page)).toBe(own);
    // the music shows just them, numbered as in the whole groove
    const abc = await page.locator('#ABCsource').inputValue();
    expect(abc).toContain('P:Bars 2-3');
    expect(abc.match(/%%setbarnb \d+/g)).toEqual(['%%setbarnb 3']);
  });
});

// Infinity Drumming, 2026: a beat of 32nd notes in a groove of 16ths
test.describe('32nds on one beat', () => {
  const sixteenths =
    '?TimeSig=4/4&Div=16&Tempo=80&Measures=1' +
    '&H=|x-x-x-x-x-x-x-x-|&S=|----O-------O---|&K=|o-------o-------|';
  const inLink = (page, name) =>
    page.evaluate((param) => new URLSearchParams(window.location.search).get(param), name);
  const choose = async (page, slot, choice) => {
    await page.click('#beatSlot' + slot);
    await page.waitForTimeout(150); // (a menu closes on the next click from 100 ms after it opens)
    await page.click('#beatContextMenu li[data-beat-choice="' + choice + '"]');
  };

  test('puts the groove on the 32nds grid, plays as 32nds would, and goes back', async ({
    page,
  }) => {
    await loadGroove(page, grooveUrl(sixteenths));
    await choose(page, 12, 'd'); // beat 4
    await expect.poll(() => inLink(page, 'Div')).toBe('32');
    expect(await inLink(page, 'Beats')).toBe('sssd');
    await page.click('#snare25');
    await page.click('#snare27');
    await expect.poll(() => inLink(page, 'S')).toBe('|--------O---------------Oo-o----|');
    const beatByBeat = await playing(page);

    // the triplets aren't for this groove now
    await page.click('#beatSlot0');
    await page.waitForTimeout(150);
    await expect(page.locator('#beatContextMenu li[data-beat-choice="t"]')).toHaveClass(/disabled/);
    await page.keyboard.press('Escape');

    // the same notes in the 32nds note setting sound the same
    await loadGroove(
      page,
      grooveUrl(
        '?TimeSig=4/4&Div=32&Tempo=80&Measures=1&H=|x---x---x---x---x---x---x---x---|' +
          '&S=|--------O---------------Oo-o----|&K=|o---------------o---------------|'
      )
    );
    expect(await playing(page)).toBe(beatByBeat);
  });

  test('16ths again on that beat take the groove back to 16ths', async ({ page }) => {
    await loadGroove(page, grooveUrl(sixteenths));
    await choose(page, 12, 'd');
    await expect.poll(() => inLink(page, 'Div')).toBe('32');
    await choose(page, 24, 's'); // beat 4 on the 32nds grid
    await expect.poll(() => inLink(page, 'Div')).toBe('16');
    expect(await inLink(page, 'Beats')).toBeNull();
    expect(await inLink(page, 'S')).toBe('|----O-------O---|');
  });
});

// Infinity Drumming, 2026: sections (A ×2, then B) on the groove page
test.describe('sections', () => {
  const bars = { A: 'RLRRLRLLRLRRLRLL', B: 'RRLLRRLLRRLLRRLL', C: 'RLRLRLRLRLRLRLRL' };
  const snare = { A: 'O-------O-------', B: 'oooooooooooooooo', C: '----O-------O---' };
  const groove = (which, extra = '') =>
    '?TimeSig=4/4&Div=16&Tempo=80&Measures=' +
    which.length +
    '&Stickings=|' +
    which.map((b) => bars[b]).join('|') +
    '|&S=|' +
    which.map((b) => snare[b]).join('|') +
    '|&K=|' +
    which.map(() => 'o---o---o---o---').join('|') +
    '|' +
    extra;

  test('chosen on the bars, play as the bars written out would', async ({ page }) => {
    await loadGroove(page, grooveUrl(groove(['A', 'A', 'B'])));
    const writtenOut = await playing(page);

    await loadGroove(page, grooveUrl(groove(['A', 'B'])));
    await page.selectOption('#barSection1 select', 'A');
    await page.selectOption('#barSection1 .sectionRepeatsSelect', '2');
    await page.selectOption('#barSection2 select', 'B');
    await expect
      .poll(() => page.evaluate(() => new URLSearchParams(location.search).get('Sections')))
      .toBe('A1x2,B2');
    expect(await playing(page)).toBe(writtenOut);
    // the music: each once, lettered, A between repeat signs, ×2 under the end one
    const abc = await page.locator('#ABCsource').inputValue();
    expect(abc).toContain('[P:A]|:');
    expect(abc).toContain('"_×2"');
    expect(abc).toContain('[P:B]');
  });

  test('a form typed in plays them in its order, as the bars written out would', async ({
    page,
  }) => {
    await loadGroove(page, grooveUrl(groove(['A', 'B', 'A', 'C', 'A', 'B', 'A', 'C'])));
    const writtenOut = await playing(page);

    await loadGroove(page, grooveUrl(groove(['A', 'B', 'C'], '&Sections=A1,B2,C3')));
    await expect(page.locator('#sectionFormBox')).toBeVisible();
    await page.fill('#sectionForm', 'abac abac');
    await page.press('#sectionForm', 'Enter');
    await expect
      .poll(() => page.evaluate(() => new URLSearchParams(location.search).get('Form')))
      .toBe('ABAC-ABAC');
    expect(await page.locator('#sectionForm').inputValue()).toBe('ABAC ABAC');
    expect(await playing(page)).toBe(writtenOut);
    expect(await page.locator('#ABCsource').inputValue()).toContain('Form: A B A C   |   A B A C');
  });
});

// Infinity Drumming, 2026: changing the Notes keeps the notes in order (the phrase
// played through the new note setting), always between straight notes and triplets
test.describe('changing the Notes', () => {
  const linkPart = (page, name) =>
    page.evaluate((param) => new URLSearchParams(window.location.search).get(param), name);
  // 3/4 bars of 16ths (12 notes) made 4/4 (the notes flow on across the bar lines)
  const fourFour =
    '?TimeSig=4/4&Div=16&Tempo=80&Measures=3' +
    '&S=|-o-o-o-o-o-o--oo|--oo--oo-o--o-oo|-o--------------|' +
    '&K=|X-o-X-o-X-o-Xo--|Xo--Xo--X-ooxo--|X-oo------------|';

  test('8th triplets put each 12-note phrase back in a bar of its own, and 16ths again undo it', async ({
    page,
  }) => {
    await loadGroove(page, grooveUrl(fourFour));
    await page.click('#subdivision_12ths');
    await expect.poll(() => linkPart(page, 'Div')).toBe('12');
    expect(await linkPart(page, 'S')).toBe('|-o-o-o-o-o-o|--oo--oo--oo|-o--o-oo-o--|');
    expect(await linkPart(page, 'K')).toBe('|X-o-X-o-X-o-|Xo--Xo--Xo--|X-ooxo--X-oo|');
    await page.click('#subdivision_16ths');
    await expect.poll(() => linkPart(page, 'Div')).toBe('16');
    expect(await linkPart(page, 'S')).toBe('|-o-o-o-o-o-o--oo|--oo--oo-o--o-oo|-o--------------|');
  });

  // the Notes setting's "Keep" switch: the phrase (to start with) or the timing
  test('8ths keep the phrase across the bars; switched to the timing, they keep the beat', async ({
    page,
  }) => {
    const sixteenths =
      '?TimeSig=4/4&Div=16&Tempo=80&Measures=2&S=|oo-o-oo-oo-o-oo-|----------------|';
    await loadGroove(page, grooveUrl(sixteenths));
    await expect(page.locator('#notesKeepToggle')).toHaveText('Keep: phrase');
    await page.click('#subdivision_8ths');
    await expect.poll(() => linkPart(page, 'Div')).toBe('8');
    expect(await linkPart(page, 'S')).toBe('|oo-o-oo-|oo-o-oo-|');
    await page.click('#subdivision_16ths');
    await expect.poll(() => linkPart(page, 'Div')).toBe('16');
    expect(await linkPart(page, 'S')).toBe('|oo-o-oo-oo-o-oo-|----------------|');

    await page.click('#notesKeepToggle');
    await expect(page.locator('#notesKeepToggle')).toHaveText('Keep: timing');
    await page.click('#subdivision_8ths');
    await expect.poll(() => linkPart(page, 'Div')).toBe('8');
    expect(await linkPart(page, 'S')).toBe('|o--oo--o|--------|');
    await page.reload();
    await expect(page.locator('#notesKeepToggle')).toHaveText('Keep: timing'); // this device remembers
  });

  test("a bar's eraser clears just that bar", async ({ page }) => {
    await loadGroove(page, grooveUrl(fourFour));
    await page.locator('#clearMeasureButton2').click();
    await expect
      .poll(() => linkPart(page, 'S'))
      .toBe('|-o-o-o-o-o-o--oo|----------------|-o--------------|');
    expect(await linkPart(page, 'K')).toBe('|X-o-X-o-X-o-Xo--|----------------|X-oo------------|');
    await page.click('#undoButton', { force: true });
    await expect
      .poll(() => linkPart(page, 'S'))
      .toBe('|-o-o-o-o-o-o--oo|--oo--oo-o--o-oo|-o--------------|');
  });
});

test.describe('a block of notes in another tab', () => {
  test('copied in one tab, pastes in another (in time, into 32nds)', async ({ page, context }) => {
    // (the other address too: by way of the device's clipboard)
    for (const origin of ['http://localhost:8000', 'http://127.0.0.1:8000'])
      await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
    const groove = (div, s) =>
      '?TimeSig=4/4&Div=' + div + '&Tempo=80&Measures=1&S=|' + s + '|&K=|' + '-'.repeat(div) + '|';
    await loadGroove(page, grooveUrl(groove(16, 'O-o-o-----------')));
    // select the first 3 snare notes (16ths), copy
    await page.evaluate(() => {
      const gw = window.myGrooveWriter;
      gw.toggleSelectNotes();
    });
    const cell = async (id) => {
      const box = await page.locator('#' + id).boundingBox();
      return [box.x + box.width / 2, box.y + box.height / 2];
    };
    await page.locator('#snare0').scrollIntoViewIfNeeded();
    const [x0, y0] = await cell('snare0');
    const [x1, y1] = await cell('snare4');
    await page.mouse.move(x0, y0);
    await page.mouse.down();
    await page.mouse.move(x1, y1, { steps: 5 });
    await page.mouse.up();
    await page.click('#noteSelectCopy');
    await expect(page.locator('#noteSelectText')).toContainText('Copied');

    const other = await context.newPage();
    await blockOutsideRequests(other);
    await loadGroove(other, 'http://127.0.0.1:8000' + grooveUrl(groove(32, '-'.repeat(32))));
    await other.bringToFront();
    await other.evaluate(() => window.myGrooveWriter.toggleSelectNotes());
    await other.locator('#snare8').scrollIntoViewIfNeeded();
    await other.locator('#snare8').click();
    await other.click('#noteSelectPaste');
    await expect
      .poll(() => other.evaluate(() => new URLSearchParams(location.search).get('S')))
      .toBe('|--------O---o---o---------------|');
  });
});

// Infinity Drumming, 2026: an alphabet with grooves or fills traded between its bars
test.describe('alphabet trade bars', () => {
  test('a trade bar after the ostinato plays before each bar, written out as it plays', async ({
    page,
  }) => {
    await loadGroove(
      page,
      grooveUrl(
        '?TimeSig=4/4&Div=16&Tempo=80&Measures=1&Perm=kick_16ths' +
          '&H=|x-x-x-x-x-x-x-x-|&S=|----O-------O---|&K=|o-------o-------|'
      )
    );
    await page.selectOption('#PermutationTradeBars', '1');
    await page.selectOption('#PermutationTradeTimes', '3');
    await expect
      .poll(() => page.evaluate(() => new URLSearchParams(location.search).get('Trade')))
      .toBe('1x3');
    await expect(page.locator('#staff-container2')).toHaveClass(/tradeBar/);
    await expect(page.locator('#staff-container2 .kick-container')).toBeVisible();
    const abc = await page.locator('#ABCsource').inputValue();
    expect(abc).toContain('[P:Trade]'); // (before each bar, as it plays)
    expect(abc).toContain('"_×3"');
    // the order in the practise box: bar 2, then bar 1 twice
    await page.fill('#practiseBars', '2 1x2');
    await page.press('#practiseBars', 'Enter');
    await expect
      .poll(() => page.evaluate(() => new URLSearchParams(location.search).get('PermBars')))
      .toBe('2_1x2');
    expect(await page.locator('#ABCsource').inputValue()).toContain('Order: 2 1×2');
  });
});

// Infinity Drumming, 2026: every rhythm of a beat of 32nds, a chapter at a time
test.describe('alphabet 32nd chapters', () => {
  const groove =
    '?TimeSig=4/4&Div=32&Tempo=80&Measures=1&Perm=snare_16ths' +
    '&H=|x---x---x---x---x---x---x---x---|&S=|-|&K=|o---------------o---------------|';
  const inLink = (page, name) =>
    page.evaluate((name) => new URLSearchParams(location.search).get(name), name);

  test('chapter 1 plays as the alphabet over half a beat; a chapter plays instead of the groups, its ticks and the link follow', async ({
    page,
  }) => {
    // the 1/32 groups, every figure ticked: Singles, 16ths / off-beat 32nds, Doubles, Triples, Quads
    await loadGroove(
      page,
      grooveUrl(groove + '&PermSet=00' + '11111' + '111' + '11111' + '11111' + '1' + '0'.repeat(27))
    );
    const alphabet = await playing(page);

    await loadGroove(page, grooveUrl(groove + '&PermChapter=1'));
    await expect(page.locator('#PermutationChapter')).toHaveValue('1');
    expect(await playing(page)).toBe(alphabet);

    await page.selectOption('#PermutationChapter', '3');
    await expect.poll(() => inLink(page, 'PermChapter')).toBe('3');
    let abc = await page.locator('#ABCsource').inputValue();
    expect(abc).toContain('P: Chapter 3: fill-ins on the 16ths');
    await expect(page.locator('#PermutationChapterOption .chapterRhythm')).toHaveCount(15);
    await expect(page.locator('#PermuationOptionsSinglesGroup')).toHaveClass(/chapterOn/);
    // a rhythm unticked: one bar fewer, in the link too
    await page.click('label[for="PermutationChapterPick2"]');
    await expect.poll(() => inLink(page, 'PermPick')).toBe('1,3-15');
    abc = await page.locator('#ABCsource').inputValue();
    expect(abc).toContain('% Chapter 3: fill-ins on the 16ths on "1 a li & la"');
    expect(abc).not.toContain('on "1 li bi & la"');

    // off: the groups again, the link without a chapter
    await page.selectOption('#PermutationChapter', '0');
    await expect.poll(() => inLink(page, 'PermChapter')).toBe(null);
    await expect(page.locator('#PermuationOptionsSinglesGroup')).not.toHaveClass(/chapterOn/);
  });
});

// Infinity Drumming, 2026: the editor writes in the bar numbers starting lines
// (abc2svg kept room for them over the first note, which pushed its accent, its
// count and the line's counts up, from bar 10 on)
test.describe('bar numbers starting lines', () => {
  test('are where abc2svg puts them, and leave every line of an accent grid level', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 412, height: 900 });
    await loadGroove(
      page,
      grooveUrl(
        '?TimeSig=4/4&Div=32&Tempo=80&Measures=1&H=|-|&K=|-|&S=|-|&Perm=snare_16ths&PermChapter=2' +
          '&Count=bold&PermSet=1' +
          '0'.repeat(47)
      )
    );
    const music = await page.evaluate(() => {
      const gu = window.myGrooveWriter.myGrooveUtils;
      const abc = document.getElementById('ABCsource').value;
      const stave = (line) => /<path class="stroke" d="m0\.00 ([\d.]+)\nh/.exec(line);
      // each line's first bar number: its line, number and place across
      const numbers = (svg) =>
        svg
          .split(/(?=<svg[\s>])/)
          .filter(stave)
          .map((line, i) => {
            const n =
              /<g transform="translate\(0,[-\d.]+\)">\n<text class="f\d+_\d+" x="([\d.]+)" y="[-\d.]+">(\d+)</.exec(
                line
              );
            return n && i + ': ' + n[2] + ' at ' + n[1];
          })
          .filter(Boolean);
      // on the page, each line's accents and counts: their heights over the stave
      const rows = [...document.querySelectorAll('#svgTarget svg')]
        .filter((svg) => stave(svg.outerHTML))
        .map((svg) => {
          const y = Number(stave(svg.outerHTML)[1]);
          const heights = (elements, at) => [
            ...new Set(elements.map((e) => (at(e) || 0).toFixed(2))),
          ];
          const group = svg.querySelector('g[transform="translate(0,' + y.toFixed(2) + ')"]');
          return {
            accents: heights(
              [...svg.querySelectorAll('use')].filter(
                (use) => use.getAttribute('xlink:href') == '#accent'
              ),
              (use) => y - Number(use.getAttribute('y'))
            ),
            // (the first line's counts are with its heading)
            counts: heights(
              [...(group ? group.querySelectorAll('text') : [])].filter(
                (text) => !text.getAttribute('text-anchor')
              ),
              (text) => -Number(text.getAttribute('y'))
            ),
          };
        });
      return {
        ours: numbers(gu.renderABCtoSVG(abc, true).svg),
        abc2svg: numbers(gu.renderABCtoSVG(abc).svg),
        rows,
      };
    });
    expect(music.ours).toHaveLength(14); // (bars 2 to 15)
    expect(music.ours).toEqual(music.abc2svg);
    // every line after the first: one row of accents, one of counts, the same in each
    const rows = music.rows.slice(1).map((row) => JSON.stringify(row));
    expect(new Set(rows).size).toBe(1);
    expect(music.rows[1].accents).toHaveLength(1);
    expect(music.rows[1].counts).toHaveLength(1);
  });
});

// a song of kicks (a 16-bit mono WAV): `bpm`, the first on `bar1` (s), louder on each 1;
// `tone`: a 1 kHz tone for 50 ms from that time (s)
function kickSong(bpm, bar1, seconds, tone) {
  const rate = 22050;
  const samples = new Float32Array(Math.round(rate * seconds));
  if (tone)
    for (let j = 0; j < rate * 0.05; j++)
      samples[Math.round(tone * rate) + j] += 0.5 * Math.sin((2 * Math.PI * 1000 * j) / rate);
  const beats = Math.floor(((seconds - 0.2 - bar1) * bpm) / 60) + 1;
  for (let k = 0; k < beats; k++) {
    const start = Math.round((bar1 + (k * 60) / bpm) * rate);
    for (let j = 0; j < rate * 0.15 && start + j < samples.length; j++)
      samples[start + j] +=
        (k % 4 ? 0.5 : 0.9) *
        (Math.exp(-j / (0.03 * rate)) * Math.sin((2 * Math.PI * 60 * j) / rate) +
          0.5 * Math.exp(-j / (0.002 * rate)) * Math.sin((2 * Math.PI * 1500 * j) / rate)); // (the beater's click)
  }
  const wav = Buffer.alloc(44 + samples.length * 2);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + samples.length * 2, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20); // PCM
  wav.writeUInt16LE(1, 22); // mono
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((x, i) =>
    wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, x)) * 32767), 44 + i * 2)
  );
  return wav;
}

test.describe('play along with a song', () => {
  test("the drums come in on the song's bar 1 and stay on its beats, slowed down too; the link carries the song", async ({
    page,
  }) => {
    await loadGroove(
      page,
      grooveUrl(
        '?TimeSig=4/4&Div=16&Tempo=100&Measures=1&H=|x-x-x-x-x-x-x-x-|&S=|----O-------O---|&K=|o---o---o---o---|'
      )
    );
    await page.waitForFunction(() => window.MIDI && window.MIDI.Player && window.MIDI.Player.ctx);
    await page.evaluate(() => window.myGrooveWriter.metronomeOptionsMenuPopupClick('PlayAlong'));
    await page.setInputFiles('#playAlongFile', {
      name: 'Kicks100.wav',
      mimeType: 'audio/wav',
      buffer: kickSong(100, 1.234, 12),
    });
    await expect(page.locator('#playAlongSongName')).toContainText('Kicks100.wav');
    // bar 1 found on the first kick, to the ms or so
    const bar1 = parseFloat((await page.inputValue('#playAlongBar1')).split(':')[1]);
    expect(Math.abs(bar1 - 1.234)).toBeLessThan(0.003);
    await page.fill('#playAlongBpm', '100');
    await page.dispatchEvent('#playAlongBpm', 'change');
    await expect
      .poll(() => page.evaluate(() => location.search))
      .toContain('Song=Kicks100.wav&SongBPM=100&SongBar1=');
    await expect(page.locator('#playAlongChip')).toBeVisible();

    await page.evaluate(() => {
      window.__kicks = [];
      window.__pieces = [];
      const midi = window.MIDI;
      const noteOn = midi.noteOn;
      midi.noteOn = function (channel, note, velocity, at) {
        if (note == 35) window.__kicks.push(at);
        return noteOn.apply(this, arguments);
      };
      // the song comes in short pieces, stretched to keep its pitch
      const start = AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start = function (when, offset) {
        if (this.buffer && this.buffer.length == 4096) {
          const piece = {
            when,
            offset: offset || 0,
            data: this.buffer.getChannelData(0),
            stopped: null,
          };
          window.__pieces.push(piece);
          const stop = this.stop.bind(this);
          this.stop = (at) => {
            piece.stopped = at;
            return stop(at);
          };
        }
        return start.apply(this, arguments);
      };
      window.myGrooveWriter.myGrooveUtils.setTempo(80); // (the song at 80%)
    });
    await expect(page.locator('#playAlongSpeed')).toContainText('80%');
    await page.click('#playAlongDone');
    await page.click('[id^="midiPlayImage"]');
    await page.waitForTimeout(4000); // more than a round
    const errors = await page.evaluate(async () => {
      window.myGrooveWriter.myGrooveUtils.stopMIDI_playback();
      // the song as it was heard: each piece at its time (not those made again)
      const rate = window.MIDI.Player.ctx.sampleRate;
      const pieces = window.__pieces.filter((p) => !(p.stopped !== null && p.stopped <= p.when));
      const from = pieces[0].when;
      const heard = new Float32Array(
        Math.ceil((pieces[pieces.length - 1].when - from) * rate) + 4096
      );
      pieces.forEach((p) => {
        const at = Math.round((p.when - from) * rate) - Math.round(p.offset * rate);
        for (let i = Math.round(p.offset * rate); i < 4096; i++) heard[at + i] += p.data[i];
      });
      const stretcher = '/js/timeStretch.js'; // (the page's own module, served to it)
      const { findHits } = await import(stretcher);
      const hits = findHits(heard, rate).map((h) => from + h / rate);
      return window.__kicks
        .filter((at) => at < from + heard.length / rate - 0.3)
        .map(
          (at) =>
            hits.reduce((best, h) => (Math.abs(h - at) < Math.abs(best - at) ? h : best), -1) - at
        );
    });
    // every kick has the song's hit with it: the same distance from each (bar 1 as
    // found, a ms or so from the first kick), to well under a ms
    expect(errors.length).toBeGreaterThan(3);
    expect(Math.abs(errors[0])).toBeLessThan(0.004);
    errors.forEach((error) => expect(Math.abs(error - errors[0])).toBeLessThan(0.0005));
  });

  test('loop mode: some bars of the song round and round, the groove on them every time', async ({
    page,
  }) => {
    await loadGroove(
      page,
      grooveUrl(
        '?TimeSig=4/4&Div=16&Tempo=100&Measures=1&H=|x-x-x-x-x-x-x-x-|&S=|----O-------O---|&K=|o---o---o---o---|'
      )
    );
    await page.waitForFunction(() => window.MIDI && window.MIDI.Player && window.MIDI.Player.ctx);
    await page.evaluate(() => window.myGrooveWriter.metronomeOptionsMenuPopupClick('PlayAlong'));
    // a tone just past bar 3's end (bar 1 at 1.234 s, 2.4 s a bar)
    await page.setInputFiles('#playAlongFile', {
      name: 'LoopSong.wav',
      mimeType: 'audio/wav',
      buffer: kickSong(100, 1.234, 14, 1.234 + 3 * 2.4 + 0.02),
    });
    await expect(page.locator('#playAlongSongName')).toContainText('LoopSong.wav');
    await page.fill('#playAlongBpm', '100');
    await page.dispatchEvent('#playAlongBpm', 'change');
    await page.check('#playAlongLoop');
    await page.fill('#playAlongLoopFrom', '2');
    await page.dispatchEvent('#playAlongLoopFrom', 'change');
    await page.fill('#playAlongLoopTo', '3');
    await page.dispatchEvent('#playAlongLoopTo', 'change');
    await expect(page.locator('#playAlongLoopFit')).toContainText('2 times through');
    await expect.poll(() => page.evaluate(() => location.search)).toContain('SongLoop=2-3');

    await page.evaluate(() => {
      window.__kicks = [];
      window.__pieces = [];
      const midi = window.MIDI;
      const noteOn = midi.noteOn;
      midi.noteOn = function (channel, note, velocity, at) {
        if (note == 35) window.__kicks.push(at);
        return noteOn.apply(this, arguments);
      };
      const start = AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start = function (when, offset) {
        if (this.buffer && this.buffer.length == 4096) {
          const piece = {
            when,
            offset: offset || 0,
            data: this.buffer.getChannelData(0),
            stopped: null,
          };
          window.__pieces.push(piece);
          const stop = this.stop.bind(this);
          this.stop = (at) => {
            piece.stopped = at;
            return stop(at);
          };
        }
        return start.apply(this, arguments);
      };
    });
    await page.click('#playAlongDone');
    await page.click('[id^="midiPlayImage"]');
    await page.waitForTimeout(7000); // the loop is 4.8 s: once round, and on
    const heard = await page.evaluate(async () => {
      window.myGrooveWriter.myGrooveUtils.stopMIDI_playback();
      const rate = window.MIDI.Player.ctx.sampleRate;
      const pieces = window.__pieces.filter((p) => !(p.stopped !== null && p.stopped <= p.when));
      const from = pieces[0].when;
      const song = new Float32Array(
        Math.ceil((pieces[pieces.length - 1].when - from) * rate) + 4096
      );
      pieces.forEach((p) => {
        const at = Math.round((p.when - from) * rate) - Math.round(p.offset * rate);
        for (let i = Math.round(p.offset * rate); i < 4096; i++) song[at + i] += p.data[i];
      });
      // the tone's loudness, 20 ms at a time
      let tone = 0;
      const span = Math.round(rate * 0.02);
      for (let at = 0; at + span < song.length; at += span) {
        let re = 0;
        let im = 0;
        for (let i = 0; i < span; i++) {
          re += song[at + i] * Math.cos((2 * Math.PI * 1000 * i) / rate);
          im += song[at + i] * Math.sin((2 * Math.PI * 1000 * i) / rate);
        }
        tone = Math.max(tone, Math.hypot(re, im) / span);
      }
      const stretcher = '/js/timeStretch.js'; // (the page's own module, served to it)
      const { findHits } = await import(stretcher);
      const hits = findHits(song, rate).map((h) => from + h / rate);
      const kicks = window.__kicks.filter((at) => at < from + song.length / rate - 0.3);
      return {
        tone,
        seconds: song.length / rate,
        offsets: kicks.map(
          (at) =>
            hits.reduce((best, h) => (Math.abs(h - at) < Math.abs(best - at) ? h : best), -1) - at
        ),
      };
    });
    expect(heard.seconds).toBeGreaterThan(5.5); // (past the loop's first time round)
    expect(heard.tone).toBeLessThan(0.02); // never heard (it's 0.25 in the song)
    // every kick on the song's hit, the same each time round, to well under a ms
    expect(heard.offsets.length).toBeGreaterThan(8);
    expect(Math.abs(heard.offsets[1])).toBeLessThan(0.004);
    heard.offsets
      .slice(1)
      .forEach((offset) => expect(Math.abs(offset - heard.offsets[1])).toBeLessThan(0.0005));
  });
});
