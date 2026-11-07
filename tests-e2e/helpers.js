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

// Infinity Drumming, 2026: a MIDI data URL's events, track by track: {delta, status, body}
// (running status written out, so the same events compare the same).
function midiEvents(midiUrl) {
  const bytes = Buffer.from(midiUrl.slice(midiUrl.indexOf(',') + 1), 'base64');
  // a variable-length number at p: [value, the byte after it]
  const number = (p) => {
    let value = 0;
    while (bytes[p] & 128) value = value * 128 + (bytes[p++] & 127);
    return [value * 128 + bytes[p], p + 1];
  };
  // the event at p (after its delta), `status` the one before: [status, its data, its end]
  const eventAt = (p, status) => {
    const from = bytes[p] & 128 ? p + 1 : p;
    if (bytes[p] & 128) status = bytes[p];
    if (status == 0xff || status == 0xf0 || status == 0xf7) {
      const [length, data] = number(status == 0xff ? from + 1 : from);
      return [status, from, data + length];
    }
    const channelMessage = status & 0xf0;
    return [status, from, from + (channelMessage == 0xc0 || channelMessage == 0xd0 ? 1 : 2)];
  };
  const tracks = [];
  for (let at = 14; at < bytes.length; at += 8 + bytes.readUInt32BE(at + 4)) {
    const end = at + 8 + bytes.readUInt32BE(at + 4);
    const events = [];
    let status = 0;
    for (let p = at + 8; p < end;) {
      const [delta, start] = number(p);
      let from;
      [status, from, p] = eventAt(start, status);
      events.push({ delta, status, body: bytes.subarray(from, p) });
    }
    tracks.push(events);
  }
  return tracks;
}

// the silent cursor markers (note 20) the editor's playback puts on grid notes with
// nothing on them
const isCursorMarker = (event) => (event.status & 0xf0) == 0x90 && event.body[0] == 20;

// how many cursor markers a MIDI data URL has
export function cursorMarkers(midiUrl) {
  return midiEvents(midiUrl).flat().filter(isCursorMarker).length;
}

// What a MIDI data URL sounds like: each track's events as "delta:status body", without
// the cursor markers (a marker's wait carried to the next event).  For comparing
// playback where the grids, so the cursor's steps, differ but the sound mustn't.
export function soundOf(midiUrl) {
  return midiEvents(midiUrl)
    .map((events) => {
      let wait = 0;
      const heard = [];
      for (const event of events) {
        if (isCursorMarker(event)) {
          wait += event.delta;
          continue;
        }
        const body = Buffer.from(event.body).toString('hex');
        heard.push(event.delta + wait + ':' + event.status.toString(16) + ' ' + body);
        wait = 0;
      }
      return heard.join(' ');
    })
    .join('\n');
}
