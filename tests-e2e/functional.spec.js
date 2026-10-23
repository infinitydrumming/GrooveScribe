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
