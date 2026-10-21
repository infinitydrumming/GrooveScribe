// Shared helpers for the Groove Scribe browser tests.

// Navigate to a groove URL and wait until the sheet-music SVG has rendered.
export async function loadGroove(page, url) {
  await page.goto(url);
  await page.waitForSelector('#svgTarget svg', { timeout: 15000 });
}

// The rendered sheet-music SVG markup (abc2svg output).
export function getSvg(page) {
  return page.locator('#svgTarget').innerHTML();
}

// The MIDI data URL the app would play for the current grid state.
export function getMidi(page) {
  return page.evaluate(() => {
    const gw = window.myGrooveWriter;
    return gw.myGrooveUtils.create_MIDIURLFromGrooveData(gw.grooveDataFromClickableUI());
  });
}

// A snapshot of the groove data currently represented by the clickable grid.
export function grooveData(page) {
  return page.evaluate(() => {
    const gd = window.myGrooveWriter.grooveDataFromClickableUI();
    return {
      notesPerMeasure: gd.notesPerMeasure,
      timeDivision: gd.timeDivision,
      numberOfMeasures: gd.numberOfMeasures,
      numBeats: gd.numBeats,
      noteValue: gd.noteValue,
      showToms: gd.showToms,
      showStickings: gd.showStickings,
      tempo: gd.tempo,
      hhOn: gd.hh_array.filter(Boolean).length,
      snareOn: gd.snare_array.filter(Boolean).length,
      kickOn: gd.kick_array.filter(Boolean).length,
    };
  });
}

// Infinity Drumming, 2026: what playing a permutation gives. Where the sheet
// music's cursor and the grid's highlight are at points through the first
// round, then the MIDI of the first rounds as playback loads them (a count-in
// first if the groove has one, then each round reported complete).
export function permutationPlayback(page) {
  return page.evaluate(() => {
    const gu = window.myGrooveWriter.myGrooveUtils;
    const highlighted = () => {
      const cell = [...document.querySelectorAll('[id^="bg-highlight"]')].find((el) =>
        el.style.background.includes('50, 126, 173')
      );
      return cell ? cell.id : null;
    };
    const cursor = [];
    for (let i = 0; i < 20; i++) {
      const percent = i / 20 + 0.01;
      const sheet = gu.percentForSheetMusic(percent);
      gu.midiEventCallbacks.notePlaying(gu, 'hh', percent);
      cursor.push([percent, Math.round(sheet * 1e6) / 1e6, highlighted()]);
    }
    const midi = [];
    gu.loadMIDIFromURL = (url) => midi.push(url);
    gu.midiEventCallbacks.loadMidiDataEvent(gu, true);
    for (let round = 0; round < 3; round++) {
      gu.midiEventCallbacks.notePlaying(gu, 'complete', 1);
      gu.midiEventCallbacks.loadMidiDataEvent(gu, false);
    }
    return { cursor, midi };
  });
}
