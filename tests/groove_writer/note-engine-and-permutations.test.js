import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { newGrooveWriter, buildFullPageDOM } from '../helpers/loadGrooveWriter.js';
import { installMidiGlobal } from '../helpers/legacyLoader.js';

// jsdom has no scrollIntoView; adding a bar scrolls to it
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = vi.fn();

// A permissive MIDI.js stand-in sufficient for runsOnPageLoad / playback wiring.
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

// Coverage-focused sweep of the two largest engines in groove_writer.js that
// only run when a real groove is loaded and re-rendered:
//   - the note-setting engine (setNotesFromURLData / setNotesFromABCArray), which
//     decodes a URL groove and clicks it into the grid, and
//   - the permutation engine (get_permutation_pre/post_ABC + the snare/kick
//     permutation array builders), which runs during generate_ABC when a
//     permutation type is active.
// loadNewGroove drives the first; activating a permutation type + refresh_ABC
// drives the second. buildFullPageDOM stubs only the final SVG render.

describe('GrooveWriter note-setting engine (loadNewGroove sweep)', () => {
  let gw;
  beforeEach(async () => {
    document.body.innerHTML = '';
    gw = await newGrooveWriter();
    buildFullPageDOM(gw, 1);
  });

  // Each groove uses a different mix of articulations / divisions / voices so
  // that setNotesFromABCArray's per-symbol switch is exercised broadly.
  const GROOVES = [
    {
      name: 'straight 16 basic',
      url: '?TimeSig=4/4&Div=16&Tempo=90&Measures=1&H=|x-x-x-x-x-x-x-x-|&S=|----O-------O---|&K=|o-------o-------|',
    },
    {
      name: 'HH articulations',
      url: '?TimeSig=4/4&Div=16&Tempo=90&Measures=1&H=|bcmnNorsxX+-oR--|&S=|----O-------O---|&K=|o-------o-------|',
    },
    {
      name: 'snare articulations',
      url: '?TimeSig=4/4&Div=16&Tempo=90&Measures=1&H=|xxxxxxxxxxxxxxxx|&S=|Ogfdxbo---------|&K=|o-------o-------|',
    },
    {
      name: 'kick articulations',
      url: '?TimeSig=4/4&Div=16&Tempo=90&Measures=1&H=|xxxxxxxxxxxxxxxx|&S=|----O-------O---|&K=|oxX-o-x-o-------|',
    },
    {
      name: 'stickings shown',
      url: '?TimeSig=4/4&Div=16&Tempo=90&Measures=1&Stickings=|RLRLRLRLRLRLRLRL|&H=|xxxxxxxxxxxxxxxx|&S=|----O-------O---|&K=|o-------o-------|',
    },
    {
      name: 'toms shown',
      url: '?TimeSig=4/4&Div=16&Tempo=90&Measures=1&H=|----------------|&S=|----------------|&K=|o-------o-------|&T1=|x---o-----------|&T4=|--------ox------|',
    },
    {
      name: 'triplets',
      url: '?TimeSig=4/4&Div=12&Tempo=90&Measures=1&H=|rrrrrrrrrrrr|&S=|---O----O---|&K=|o--o--o--o--|',
    },
    {
      name: 'two measures',
      url: '?TimeSig=4/4&Div=16&Tempo=90&Measures=2&H=|xxxxxxxxxxxxxxxx|xxxxxxxxxxxxxxxx|&S=|----O-------O---|----O-------O---|&K=|o-------o-------|o-------o-------|',
    },
    { name: '6/8', url: '?TimeSig=6/8&Div=8&Tempo=90&Measures=1&H=|xxxxxx|&S=|--O--O|&K=|o--o--|' },
  ];

  it.each(GROOVES)('loads "$name" into the grid without error', ({ url }) => {
    expect(() => gw.loadNewGroove(url)).not.toThrow();
    const gd = gw.grooveDataFromClickableUI();
    expect(gd.hh_array).toHaveLength(gd.notesPerMeasure * gd.numberOfMeasures);
  });

  it('round-trips a groove: loaded notes read back as the same voices', () => {
    gw.loadNewGroove(
      '?TimeSig=4/4&Div=16&Tempo=110&Measures=1&H=|x-x-x-x-x-x-x-x-|&S=|----O-------O---|&K=|o-------o-------|'
    );
    const gd = gw.grooveDataFromClickableUI();
    expect(gd.hh_array.filter(Boolean)).toHaveLength(8);
    expect(gd.snare_array[4]).toBeTruthy();
    expect(gd.kick_array[0]).toBeTruthy();
    expect(gd.kick_array[8]).toBeTruthy();
  });

  it('loads stickings and reflects them in the read-back', () => {
    gw.loadNewGroove(
      '?TimeSig=4/4&Div=16&Tempo=90&Measures=1&Stickings=|RLRLRLRLRLRLRLRL|&H=|xxxxxxxxxxxxxxxx|&S=|----O-------O---|&K=|o-------o-------|'
    );
    const gd = gw.grooveDataFromClickableUI();
    expect(gd.showStickings).toBe(true);
    expect(gd.sticking_array.filter((s) => s && s !== false).length).toBeGreaterThan(0);
  });
});

describe('GrooveWriter permutation engine', () => {
  let gw;
  beforeEach(async () => {
    document.body.innerHTML = '';
    gw = await newGrooveWriter();
    buildFullPageDOM(gw, 1);
    // A permutation menu container is needed by permutationPopupClick.
    const pm = document.createElement('div');
    pm.id = 'PermutationOptions';
    document.body.appendChild(pm);
    // Load a groove so the permutation engine has notes to permute.
    gw.loadNewGroove(
      '?TimeSig=4/4&Div=16&Tempo=90&Measures=1&H=|xxxxxxxxxxxxxxxx|&S=|----O-------O---|&K=|o-o-o-o-o-o-o-o-|'
    );
  });

  it.each(['kick_16ths', 'snare_16ths'])(
    'activates the "%s" permutation and regenerates ABC without error',
    (permType) => {
      // permutationPopupClick sets class_permutation_type then re-renders,
      // which runs generate_ABC through the permutation code paths.
      expect(() => gw.permutationPopupClick(permType)).not.toThrow();
      // The ABC source should now be populated (rendered via the stubbed SVG).
      const abc = document.getElementById('ABCsource').value;
      expect(typeof abc).toBe('string');
      expect(abc.length).toBeGreaterThan(0);
    }
  );

  it('returns to non-permuted rendering when set back to "none"', () => {
    gw.permutationPopupClick('kick_16ths');
    expect(() => gw.permutationPopupClick('none')).not.toThrow();
  });
});

// Deep coverage of the permutation-GENERATION engine (get_permutation_pre/post_ABC
// and the kick/snare permutation array builders). These only run inside
// generate_ABC's per-section loop when a section is "active", which requires the
// sub-option checkboxes to be present AND checked -- so we check them explicitly.
describe('GrooveWriter permutation generation engine', () => {
  let gw;

  // The permutation sub-option checkbox ids (note the source's "Permuation"
  // misspelling). shouldDisplayPermutationForSection reads .checked on these.
  const SUB_OPTIONS = [
    'PermuationOptionsSkipSomeFirstNotes',
    'PermuationOptionsOstinato',
    'PermuationOptionsOstinato_sub',
    'PermuationOptionsSingles',
    'PermuationOptionsSingles_sub1',
    'PermuationOptionsSingles_sub2',
    'PermuationOptionsSingles_sub3',
    'PermuationOptionsSingles_sub4',
    'PermuationOptionsDoubles',
    'PermuationOptionsDoubles_sub1',
    'PermuationOptionsDoubles_sub2',
    'PermuationOptionsDoubles_sub3',
    'PermuationOptionsDoubles_sub4',
    'PermuationOptionsUpsDowns',
    'PermuationOptionsUpsDowns_sub1',
    'PermuationOptionsUpsDowns_sub2',
    'PermuationOptionsTriples',
    'PermuationOptionsTriples_sub1',
    'PermuationOptionsTriples_sub2',
    'PermuationOptionsTriples_sub3',
    'PermuationOptionsTriples_sub4',
    'PermuationOptionsQuads',
  ];
  const checkAllPermutationSections = () => {
    for (const id of SUB_OPTIONS) {
      const el = document.getElementById(id);
      if (el) el.checked = true;
    }
  };

  beforeEach(async () => {
    document.body.innerHTML = '';
    gw = await newGrooveWriter();
    buildFullPageDOM(gw, 1);
    gw.loadNewGroove(
      '?TimeSig=4/4&Div=16&Tempo=90&Measures=1&H=|xxxxxxxxxxxxxxxx|&S=|----O-------O---|&K=|o-o-o-o-o-o-o-o-|'
    );
  });

  it('generates all active kick-permutation sections (pre/post ABC + kick arrays)', () => {
    gw.permutationPopupClick('kick_16ths');
    checkAllPermutationSections();
    gw.refresh_ABC();
    const abc = document.getElementById('ABCsource').value;
    // Multi-section output is much larger than a single groove's ABC.
    expect(abc.length).toBeGreaterThan(3000);
    // A note-mapping entry is built per section for playback highlighting.
    expect(Array.isArray(gw.myGrooveUtils.note_mapping_array)).toBe(true);
    expect(gw.myGrooveUtils.note_mapping_array.length).toBeGreaterThan(0);
  });

  it('honors the "skip some first notes" kick-permutation variant', () => {
    gw.permutationPopupClick('kick_16ths');
    checkAllPermutationSections();
    // Force the minus-some kick-array branch.
    document.getElementById('PermuationOptionsSkipSomeFirstNotes').checked = true;
    expect(() => gw.refresh_ABC()).not.toThrow();
    expect(document.getElementById('ABCsource').value.length).toBeGreaterThan(3000);
  });

  it('generates all active snare-permutation sections', () => {
    gw.permutationPopupClick('snare_16ths');
    checkAllPermutationSections();
    gw.refresh_ABC();
    const abc = document.getElementById('ABCsource').value;
    expect(abc.length).toBeGreaterThan(3000);
  });

  it('generates triplet-division permutations (fewer active sections)', () => {
    // Reload as a triplet groove, then permute -- exercises the usingTriplets()
    // guards inside shouldDisplayPermutationForSection and the array builders.
    gw.loadNewGroove(
      '?TimeSig=4/4&Div=12&Tempo=90&Measures=1&H=|rrrrrrrrrrrr|&S=|---O----O---|&K=|o--o--o--o--|'
    );
    gw.permutationPopupClick('kick_16ths');
    checkAllPermutationSections();
    expect(() => gw.refresh_ABC()).not.toThrow();
    expect(document.getElementById('ABCsource').value.length).toBeGreaterThan(2000);
  });
});

describe('GrooveWriter playback highlighting (hilight_note)', () => {
  let gw;
  beforeEach(async () => {
    document.body.innerHTML = '';
    globalThis.MIDI = makeMidiMock();
    await installMidiGlobal();
    gw = await newGrooveWriter();
    buildFullPageDOM(gw, 1);
    gw.loadNewGroove(
      '?TimeSig=4/4&Div=16&Tempo=90&Measures=1&H=|xxxxxxxxxxxxxxxx|&S=|----O-------O---|&K=|o-------o-------|'
    );
    // Bootstrap so the notePlaying callback (which calls hilight_note) is wired.
    gw.runsOnPageLoad();
  });
  afterEach(() => {
    delete globalThis.MIDI;
    vi.restoreAllMocks();
  });

  const fireNote = (type, pct) => gw.myGrooveUtils.midiEventCallbacks.notePlaying(gw, type, pct);

  it.each(['hi-hat', 'snare', 'kick', 'tom1', 'tom4'])(
    'highlights the %s row as playback advances without error',
    (instrument) => {
      expect(() => {
        fireNote(instrument, 0.0);
        fireNote(instrument, 0.25);
        fireNote(instrument, 0.5);
        fireNote(instrument, 0.99);
      }).not.toThrow();
    }
  );

  it('clears highlights when percent_complete is negative', () => {
    fireNote('hi-hat', 0.5);
    expect(() => fireNote('hi-hat', -1)).not.toThrow();
  });

  it('maps percent to per-section position when a permutation is active', () => {
    const pm = document.getElementById('PermutationOptions') || document.body;
    pm.id = 'PermutationOptions';
    gw.permutationPopupClick('kick_16ths');
    expect(() => fireNote('hi-hat', 0.5)).not.toThrow();
  });

  // The loadMidiDataEvent callback (wired by runsOnPageLoad) builds the MIDI URL
  // from the clickable UI via createMidiUrlFromClickableUI, then loads it.
  describe('createMidiUrlFromClickableUI (via loadMidiDataEvent)', () => {
    const loadMidi = (playStarting) =>
      gw.myGrooveUtils.midiEventCallbacks.loadMidiDataEvent(gw, playStarting);

    it('builds and loads MIDI from the current grid (no permutation)', () => {
      expect(() => loadMidi(false)).not.toThrow();
      // MIDI.Player.loadFile (our mock) receives a midi data URL.
      const call = globalThis.MIDI.Player.loadFile.mock.calls.at(-1);
      expect(call && String(call[0]).startsWith('data:audio/midi;base64,')).toBe(true);
    });

    // Check every permutation sub-option so all sections run.
    const checkAll = () => {
      const html = document.getElementById('PermutationOptions').innerHTML;
      for (const m of html.matchAll(/id="(Permuation[^"]*)"/g)) {
        const el = document.getElementById(m[1]);
        if (el && el.type === 'checkbox') el.checked = true;
      }
    };

    it('builds MIDI across kick-permutation sections when active', () => {
      gw.permutationPopupClick('kick_16ths');
      checkAll();
      expect(() => loadMidi(false)).not.toThrow();
    });

    it.each(['kick_snare_kick_lead', 'kick_snare_snare_lead'])(
      '"%s" alternates kick and snare in playback, replacing both lines',
      (permType) => {
        const noteOns = (note) => {
          const url = String(globalThis.MIDI.Player.loadFile.mock.calls.at(-1)[0]);
          const bytes = atob(url.slice('data:audio/midi;base64,'.length));
          let count = 0;
          for (let i = 0; i < bytes.length - 1; i++)
            if (bytes.charCodeAt(i) === 0x99 && bytes.charCodeAt(i + 1) === note) count++;
          return count;
        };
        gw.permutationPopupClick(permType);
        expect(document.getElementById('PermutationOptions').innerHTML).toContain(
          'PermuationOptionsSingles'
        );
        loadMidi(false);
        const kicks = noteOns(35);
        const snares = noteOns(38);
        // the default figures have an even number of hits, so it splits evenly
        expect(kicks).toBeGreaterThan(0);
        expect(kicks).toBe(snares);
      }
    );

    it('Auto-scroll is on by default and its Options switch is remembered', () => {
      expect(gw.myGrooveUtils.autoScrollEnabled).toBe(true);
      gw.metronomeOptionsMenuPopupClick('AutoScroll');
      expect(gw.myGrooveUtils.autoScrollEnabled).toBe(false);
      expect(window.localStorage.getItem('grooveScribeAutoScroll')).toBe('off');
      gw.metronomeOptionsMenuPopupClick('AutoScroll');
      expect(gw.myGrooveUtils.autoScrollEnabled).toBe(true);
      expect(window.localStorage.getItem('grooveScribeAutoScroll')).toBe('on');
    });

    it('a group tick turns on all 6 per-beat figures in 1/16 triplets', () => {
      gw.loadNewGroove(
        '?TimeSig=4/4&Div=24&Tempo=90&Measures=1&H=|------------------------|&S=|------O-----------O-----|&K=|o-----------o-----------|'
      );
      gw.permutationPopupClick('kick_16ths');
      const group = document.getElementById('PermuationOptionsTriplesBeat');
      expect(group.checked).toBe(false); // starts unticked
      group.checked = true;
      gw.permutationOptionClick({ target: group });
      for (let n = 1; n <= 6; n++)
        expect(document.getElementById('PermuationOptionsTriplesBeat_sub' + n).checked).toBe(true);
    });

    it('"Play each ×2" plays every permutation bar twice', () => {
      // count kick note-ons (channel 10 = 0x99, kick = 35) in the loaded MIDI
      const kicksInLoadedMidi = () => {
        const url = String(globalThis.MIDI.Player.loadFile.mock.calls.at(-1)[0]);
        const bytes = atob(url.slice('data:audio/midi;base64,'.length));
        let count = 0;
        for (let i = 0; i < bytes.length - 1; i++)
          if (bytes.charCodeAt(i) === 0x99 && bytes.charCodeAt(i + 1) === 35) count++;
        return count;
      };
      gw.permutationPopupClick('kick_16ths');
      loadMidi(false);
      const once = kicksInLoadedMidi();
      expect(once).toBeGreaterThan(0);

      gw.permutationRepeatChange({ target: { value: '2' } });
      loadMidi(false);
      expect(kicksInLoadedMidi()).toBe(2 * once);
      // the menu keeps the chosen value when it is rebuilt
      expect(gw.HTMLforPermutationOptions()).toContain('<option value="2" selected>');
    });

    // Infinity Drumming, 2026: a permutation over the groove's first bars
    describe('over a multi-bar ostinato', () => {
      // Singles only, over 2 bars: bar 2 has an open hi-hat on the "&" of 4
      const TWO_BARS =
        '?TimeSig=4/4&Div=16&Tempo=90&Measures=2&Perm=kick_16ths&PermSet=001111100000000000000&Ostinato=2' +
        '&H=|x-x-x-x-x-x-x-x-|x-x-x-x-x-x-x-o-|&S=|----O-------O---|----O-------O---|' +
        '&K=|o-------o-------|o-------o-------|';
      // note-ons of a note in the loaded MIDI (channel 10: 0x99)
      const noteOns = (note) => {
        const url = String(globalThis.MIDI.Player.loadFile.mock.calls.at(-1)[0]);
        const bytes = atob(url.slice('data:audio/midi;base64,'.length));
        let count = 0;
        for (let i = 0; i < bytes.length - 2; i++)
          if (
            bytes.charCodeAt(i) === 0x99 &&
            bytes.charCodeAt(i + 1) === note &&
            bytes.charCodeAt(i + 2)
          )
            count++;
        return count;
      };
      const highlighted = () =>
        [...document.querySelectorAll('[id^="bg-highlight"]')].find((el) =>
          el.style.background.includes('50, 126, 173')
        )?.id;
      // the tempo's address-bar update waits 300 ms: run it before the page goes
      beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }));
      afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
      });

      it('plays each figure over both bars, "Play each" times through them', () => {
        gw.loadNewGroove(TWO_BARS + '&PlayEach=2');
        expect(gw.numberOfMeasures()).toBe(2);
        loadMidi(false);
        // 4 figures × 2 times × 2 bars = 16 bars of 4 kicks; an open hi-hat in every 2nd bar
        expect(noteOns(35)).toBe(64);
        expect(noteOns(46)).toBe(8);
      });

      it('writes each figure once over the bars, each bar numbered with its figure', () => {
        gw.loadNewGroove(TWO_BARS + '&PlayEach=2');
        const abc = document.getElementById('ABCsource').value;
        expect(abc.match(/ostinato bar 1/g)).toHaveLength(4);
        expect(abc.match(/ostinato bar 2/g)).toHaveLength(4);
        expect(abc.match(/^P: /gm)).toHaveLength(1);
        // figure 2's bars: "2" over its bar 1 (set in the bar before) and its bar 2
        expect(abc).toContain('%%setbarnb 2\n%\n% Singles on "e", ostinato bar 1');
        expect(abc).toContain('%%setbarnb 3\n%\n% Singles on "e", ostinato bar 2');
      });

      it('follows the run on the music and on the grid', () => {
        gw.loadNewGroove(TWO_BARS + '&PlayEach=2');
        // run bar -> bar of the music (8 bars: 4 figures over 2 bars)
        const musicBar = (runBar) =>
          Math.floor(gw.myGrooveUtils.percentForSheetMusic((runBar + 0.5) / 16) * 8);
        expect([0, 1, 2, 3, 4, 5, 15].map(musicBar)).toEqual([0, 1, 0, 1, 2, 3, 7]);
        // the grid highlights the ostinato's bar: bar 2 starts at note 16
        fireNote('hi-hat', 0.01 / 16);
        expect(highlighted()).toBe('bg-highlight0');
        fireNote('hi-hat', 1.01 / 16);
        expect(highlighted()).toBe('bg-highlight16');
      });

      it('keeps the first 5 bars when a permutation is chosen, and adds no more', () => {
        const seven = '|x-x-x-x-x-x-x-x-'.repeat(7) + '|';
        gw.loadNewGroove(`?TimeSig=4/4&Div=16&Tempo=90&Measures=7&H=${seven}`);
        gw.permutationPopupClick('snare_16ths');
        expect(gw.numberOfMeasures()).toBe(5);
        const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
        gw.addMeasureButtonClick();
        gw.duplicateMeasureButtonClick(1);
        expect(gw.numberOfMeasures()).toBe(5);
        expect(alert).toHaveBeenCalledWith(
          'The alphabet plays over 5 bars at most. Turn the alphabet off to add more bars.'
        );
        gw.permutationPopupClick('none');
        gw.addMeasureButtonClick();
        expect(gw.numberOfMeasures()).toBe(6);
      }, 20_000); // (lays out up to 7 bars several times over)

      // Infinity Drumming, 2026: which bar and rep is playing
      it('shows the bar and rep playing when the rep counter is on, outside the link', () => {
        localStorage.removeItem('grooveScribeRepCounter');
        gw.loadNewGroove(TWO_BARS + '&PlayEach=3'); // Singles: 4 figures, each 3 times over 2 bars
        const counter = () => {
          const element = document.getElementById('repCounter');
          return element && element.style.display != 'none' ? element.textContent : null;
        };
        loadMidi(false);
        fireNote('hi-hat', 0.5 / 24);
        expect(counter()).toBeNull(); // off to start with

        const link = gw.myGrooveUtils.getUrlStringFromGrooveData(gw.grooveDataFromClickableUI());
        const box = document.getElementById('PermutationRepCounter');
        box.checked = true;
        gw.repCounterChange({ target: box });
        expect(localStorage.getItem('grooveScribeRepCounter')).toBe('on');
        expect(gw.myGrooveUtils.getUrlStringFromGrooveData(gw.grooveDataFromClickableUI())).toBe(
          link
        ); // not one of the figures' ticks

        fireNote('hi-hat', 0.5 / 24); // run bar 0
        expect(counter()).toBe('Bar 1 \u00b7 Rep 1 of 3 \u00b7 ostinato 1/2');
        fireNote('hi-hat', 3.5 / 24); // run bar 3
        expect(counter()).toBe('Bar 1 \u00b7 Rep 2 of 3 \u00b7 ostinato 2/2');
        fireNote('hi-hat', 23.5 / 24); // the last bar
        expect(counter()).toBe('Bar 4 \u00b7 Rep 3 of 3 \u00b7 ostinato 2/2');
        gw.myGrooveUtils.midiEventCallbacks.stopEvent(gw.myGrooveUtils);
        expect(counter()).toBeNull();
        // the menu is drawn with the switch on, from now on
        expect(gw.HTMLforPermutationOptions()).toMatch(/id="PermutationRepCounter" checked/);
        localStorage.removeItem('grooveScribeRepCounter');
      });

      // Infinity Drumming, 2026: the bars to practise in an order of their own
      it('plays the bars in the order the box says, each as many times as it says', () => {
        gw.loadNewGroove(TWO_BARS + '&PermBars=2_1x3');
        expect(document.getElementById('practiseBars').value).toBe('2 1x3');
        expect(window.location.search).toContain('PermBars=2_1x3');
        loadMidi(false);
        // figure 2 once, then figure 1 three times, each over both bars: 8 bars
        expect(noteOns(35)).toBe(8 * 4);
        expect(noteOns(46)).toBe(4);
        // the music writes figures 1 and 2 once each (bars 0-1, 2-3), the order over them
        const abc = document.getElementById('ABCsource').value;
        expect(abc).toContain('%%center Order: 2 1\u00d73\n');
        expect(abc.match(/ostinato bar 1/g)).toHaveLength(2);
        const musicBar = (runBar) =>
          Math.floor(gw.myGrooveUtils.percentForSheetMusic((runBar + 0.5) / 8) * 4);
        expect([0, 1, 2, 3, 4, 7].map(musicBar)).toEqual([2, 3, 0, 1, 0, 1]);

        const box = document.getElementById('PermutationRepCounter');
        box.checked = true;
        gw.repCounterChange({ target: box });
        loadMidi(false);
        fireNote('hi-hat', 0.5 / 8);
        expect(document.getElementById('repCounter').textContent).toBe(
          'Bar 2 \u00b7 Rep 1 of 1 \u00b7 ostinato 1/2'
        );
        fireNote('hi-hat', 5.5 / 8); // figure 1's 2nd time, its 2nd bar
        expect(document.getElementById('repCounter').textContent).toBe(
          'Bar 1 \u00b7 Rep 2 of 3 \u00b7 ostinato 2/2'
        );
        localStorage.removeItem('grooveScribeRepCounter');
      });

      // Infinity Drumming, 2026: grooves or fills traded with the figures
      describe('trade bars', () => {
        // Singles over bar 1; bar 2 a trade bar (16th hi-hats, 8th kicks), twice before each
        const TRADE =
          '?TimeSig=4/4&Div=16&Tempo=90&Measures=2&Perm=kick_16ths&PermSet=001111100000000000000&Trade=1x2' +
          '&H=|x-x-x-x-x-x-x-x-|xxxxxxxxxxxxxxxx|&S=|----O-------O---|----O-------O---|' +
          '&K=|o-------o-------|o-o-o-o-o-o-o-o-|';

        it('plays the trade bars as written, before each bar of the run', () => {
          gw.loadNewGroove(TRADE);
          expect(gw.numberOfMeasures()).toBe(2);
          expect(window.location.search).toContain('&Trade=1x2');
          loadMidi(false);
          // 4 figures, each after the trade bar twice: 4 × (8 + 2 × 16) closed hi-hats
          expect(noteOns(42)).toBe(160);
          // the figures' kicks (one a beat) and the trade bar's 8, twice before each
          expect(noteOns(35)).toBe(4 * 4 + 4 * 2 * 8);
        });

        it('writes the trade bar once, first, and follows the run on the music', () => {
          gw.loadNewGroove(TRADE);
          const abc = document.getElementById('ABCsource').value;
          expect(abc).toContain('P: Trade   (\u00d72, before each bar)');
          expect(abc.indexOf('P: Trade')).toBeLessThan(abc.indexOf('P: Singles'));
          expect(abc).toContain('%%setbarnb 1\n'); // (the first figure keeps its number)
          // run bar -> bar of the music (the trade bar, then 4 figures)
          const musicBar = (runBar) =>
            Math.floor(gw.myGrooveUtils.percentForSheetMusic((runBar + 0.5) / 12) * 5);
          expect([0, 1, 2, 3, 5, 11].map(musicBar)).toEqual([0, 0, 1, 0, 2, 4]);
        });

        it('says it is trading on the rep counter, and the grid shows every line in it', () => {
          gw.loadNewGroove(TRADE);
          const box = document.getElementById('PermutationRepCounter');
          box.checked = true;
          gw.repCounterChange({ target: box });
          loadMidi(false);
          fireNote('hi-hat', 1.5 / 12);
          expect(document.getElementById('repCounter').textContent).toBe('Trade \u00b7 2 of 2');
          fireNote('hi-hat', 2.5 / 12);
          expect(document.getElementById('repCounter').textContent).toBe('Bar 1 \u00b7 Rep 1 of 1');
          localStorage.removeItem('grooveScribeRepCounter');
          const kickLine = (bar) =>
            document.querySelector('#staff-container' + bar + ' .kick-container').style.visibility;
          expect(document.getElementById('staff-container2').classList).toContain('tradeBar');
          expect([kickLine(1), kickLine(2)]).toEqual(['hidden', 'visible']);
        });

        it('trades after each bar, adds and removes trade bars', () => {
          gw.loadNewGroove(TRADE);
          document.getElementById('PermutationTradeWhere').value = 'after';
          gw.tradeChange();
          expect(window.location.search).toContain('&Trade=1x2a');
          const musicBar = (runBar) =>
            Math.floor(gw.myGrooveUtils.percentForSheetMusic((runBar + 0.5) / 12) * 5);
          expect([0, 1, 2, 3].map(musicBar)).toEqual([1, 0, 0, 2]);
          gw.addMeasureButtonClick(); // another trade bar (a copy of the last)
          expect(gw.numberOfMeasures()).toBe(3);
          expect(window.location.search).toContain('&Trade=2x2a');
          gw.closeMeasureButtonClick(3);
          gw.closeMeasureButtonClick(2); // no trade bars: trading is off
          expect(gw.numberOfMeasures()).toBe(1);
          expect(window.location.search).not.toContain('Trade=');
          document.getElementById('PermutationTradeBars').value = '2';
          gw.tradeChange(); // two new ones, copies of the groove's first bar
          expect(gw.numberOfMeasures()).toBe(3);
          expect(window.location.search).toContain('&Trade=2x2a');
        });
      });

      it('counts the bars to practise by their numbers in the music', () => {
        gw.loadNewGroove(TWO_BARS + '&PermBars=3-4');
        const box = document.getElementById('PermutationRepCounter');
        box.checked = true;
        gw.repCounterChange({ target: box });
        loadMidi(false);
        fireNote('hi-hat', 2.5 / 4); // the 3rd of 4 run bars: figure 4's first bar
        expect(document.getElementById('repCounter').textContent).toBe(
          'Bar 4 \u00b7 Rep 1 of 1 \u00b7 ostinato 1/2'
        );
        localStorage.removeItem('grooveScribeRepCounter');
      });

      // a tempo change while playing is heard from the next bar line
      it('hands the round, built again at the new tempo, to the player for the next bar line', () => {
        gw.loadNewGroove(TWO_BARS + '&PlayEach=2'); // 90 bpm: 16 bars of 2666.7 ms
        loadMidi(false);
        const gu = gw.myGrooveUtils;
        vi.spyOn(gu, 'isPlaying').mockReturnValue(true);
        vi.spyOn(gu, 'loadedTempo').mockReturnValue(90);
        const handOver = vi.spyOn(gu, 'switchTempoAtNextBar').mockReturnValue(true);
        gu.setTempo(60);
        gu.setTempo(45); // the slider still moving: only where it stops counts
        vi.advanceTimersByTime(300);
        expect(handOver).toHaveBeenCalledTimes(1);
        const [url, oldBarMs, newBarMs] = handOver.mock.calls[0];
        expect(url).toMatch(/^data:audio\/midi;base64,/);
        expect(oldBarMs).toHaveLength(16);
        expect(oldBarMs[0]).toBeCloseTo(8000 / 3);
        expect(newBarMs[0]).toBeCloseTo(16000 / 3);

        // not when the playing round has the tempo already (a speed-up builds it at its end)
        handOver.mockClear();
        gu.loadedTempo.mockReturnValue(45);
        gu.setTempo(45);
        vi.advanceTimersByTime(300);
        expect(handOver).not.toHaveBeenCalled();
      });

      it('keeps the ticked figures when a bar is added to the ostinato', () => {
        gw.loadNewGroove(TWO_BARS); // Singles only (Doubles and Triples are on by default)
        const box = (id) => document.getElementById('PermuationOptions' + id);
        box('Quads').checked = true; // off by default
        box('Singles_sub2').checked = false; // on by default
        gw.addMeasureButtonClick();
        expect(gw.numberOfMeasures()).toBe(3);
        expect(box('Quads').checked).toBe(true);
        expect(box('Singles_sub2').checked).toBe(false);
        expect(box('Doubles').checked).toBe(false);
        expect(box('Singles').checked).toBe(true);
      });

      // links from before October 2026 played bar 1 only, closing any others on opening
      it('opens an older link with a permutation and more bars at bar 1, as it did', () => {
        const link = () =>
          gw.myGrooveUtils.getUrlStringFromGrooveData(gw.grooveDataFromClickableUI());
        gw.loadNewGroove(TWO_BARS.replace('&Ostinato=2', ''));
        expect(gw.numberOfMeasures()).toBe(1);
        expect(link()).toContain('&Measures=1');
        expect(link()).not.toContain('Ostinato');
      });

      it('writes its bars into the link, and an undo keeps them', () => {
        const link = () =>
          gw.myGrooveUtils.getUrlStringFromGrooveData(gw.grooveDataFromClickableUI());
        gw.loadNewGroove(TWO_BARS);
        expect(gw.numberOfMeasures()).toBe(2);
        expect(link()).toContain('&Ostinato=2');
        gw.updateCurrentURL();
        gw.addMeasureButtonClick();
        expect(link()).toContain('&Ostinato=3');
        gw.undoCommand();
        expect(gw.numberOfMeasures()).toBe(2);
        expect(link()).toContain('&Ostinato=2');
      });

      it('keeps the ticked figures in a time signature with the same figures', () => {
        gw.loadNewGroove(TWO_BARS); // Singles only
        const box = (id) => document.getElementById('PermuationOptions' + id);
        box('Singles_sub2').checked = false;
        document.body.insertAdjacentHTML(
          'beforeend',
          '<div id="timeSigPopup"><select id="timeSigPopupTimeSigTop">' +
            '<option>3</option><option>4</option><option>6</option></select>' +
            '<select id="timeSigPopupTimeSigBottom"><option>4</option><option>8</option></select></div>'
        );
        const changeTimeSig = (top, bottom) => {
          document.getElementById('timeSigPopupTimeSigTop').value = top;
          document.getElementById('timeSigPopupTimeSigBottom').value = bottom;
          gw.timeSigPopupClose('ok');
        };
        changeTimeSig('3', '4'); // the same figures, without "Simplify multiple kicks"
        expect(box('SkipSomeFirstNotes')).toBeNull();
        expect(box('Singles_sub2').checked).toBe(false);
        expect(box('Doubles').checked).toBe(false);
        changeTimeSig('6', '8'); // other figures: ticked as they start
        expect(box('SinglesBeat')).not.toBeNull();
        expect(box('Doubles').checked).toBe(true);
      });
    });

    describe('"groove / click" bars, counted bar by bar', () => {
      // the loaded MIDI split into bars (each starts with the accented bar click,
      // note 76): per bar, the kick count and the gaps between its note-ons
      const loadedBars = () => {
        const url = String(globalThis.MIDI.Player.loadFile.mock.calls.at(-1)[0]);
        const bytes = Uint8Array.from(atob(url.split(',')[1]), (c) => c.charCodeAt(0));
        const events = [];
        let p = 22; // after the file and track headers
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
            p += vlq();
          } else if ((status & 0xf0) == 0xc0) p++;
          else {
            const [key, velocity] = [bytes[p], bytes[p + 1]];
            p += 2;
            if ((status & 0xf0) == 0x90 && velocity > 0) events.push({ tick, key });
          }
        }
        const starts = events.filter((e) => e.key == 76).map((e) => e.tick);
        return starts.map((start, i) => {
          const inBar = events.filter(
            (e) => e.tick >= start && e.tick < (starts[i + 1] ?? Infinity)
          );
          const times = [...new Set(inBar.map((e) => e.tick))];
          return {
            kicks: inBar.filter((e) => e.key == 35).length,
            gaps: times.slice(1, 5).map((t, j) => t - times[j]),
          };
        });
      };
      // bar n of the groove has n kicks, so each bar can be recognised
      const groove = (measures, options) =>
        '?TimeSig=4/4&Div=16&Tempo=80&Swing=30&MetronomeFreq=4' +
        options +
        '&Measures=' +
        measures +
        '&H=|' +
        Array(measures).fill('xxxxxxxxxxxxxxxx').join('|') +
        '|&S=|' +
        Array(measures).fill('----------------').join('|') +
        '|&K=|' +
        ['o---------------', 'o---o-----------', 'o---o---o-------', 'o---o---o---o---']
          .slice(0, measures)
          .join('|') +
        '|';
      const playCycle = (first) => {
        loadMidi(first);
        const bars = loadedBars();
        fireNote('complete', 1); // the cycle has played through
        return bars.map((bar) => bar.kicks);
      };

      it('3 groove bars + 1 click bar over a 4-bar groove: bar 4 is the click bar', () => {
        gw.loadNewGroove(groove(4, '&StraightBars=4&GrooveBars=3&ClickBars=1'));
        expect(playCycle(true)).toEqual([1, 2, 3, 0]);
        expect(playCycle(false)).toEqual([1, 2, 3, 0]);
      });

      it('new numbers apply as they are typed, without pressing Done', () => {
        // a student types 6 and 2, then presses Play with the popup still open
        gw.loadNewGroove(groove(1, '&GrooveBars=4&ClickBars=4'));
        document.body.insertAdjacentHTML(
          'beforeend',
          '<div id="grooveClickConfiguration"><input id="grooveClickGrooveBars">' +
            '<input id="grooveClickClickBars"></div>'
        );
        gw.show_GrooveClickConfiguration();
        document.getElementById('grooveClickGrooveBars').value = '6';
        document.getElementById('grooveClickClickBars').value = '2';
        gw.grooveClickBarsChanged();
        expect(playCycle(true)).toEqual([1, 1, 1, 1, 1, 1, 0, 0]);
        // a half-typed (empty) box keeps the last number
        document.getElementById('grooveClickClickBars').value = '';
        gw.grooveClickBarsChanged();
        expect(playCycle(true)).toEqual([1, 1, 1, 1, 1, 1, 0, 0]);
      });

      it('the groove keeps counting through the click bars', () => {
        // 2-bar groove, 3 + 2: 1 2 1 (click click) 2 1 2 (click click) ...
        gw.loadNewGroove(groove(2, '&GrooveBars=3&ClickBars=2'));
        expect(playCycle(true)).toEqual([1, 2, 1, 0, 0]);
        expect(playCycle(false)).toEqual([2, 1, 2, 0, 0]);
        expect(playCycle(false)).toEqual([1, 2, 1, 0, 0]);
      });

      it('works with permutations: N permutation bars, then M click bars, and on', () => {
        gw.loadNewGroove(groove(1, '&GrooveBars=2&ClickBars=2'));
        const pm = document.getElementById('PermutationOptions') || document.body;
        pm.id = 'PermutationOptions';
        gw.permutationPopupClick('kick_16ths');
        const first = playCycle(true);
        const second = playCycle(false);
        expect(first).toHaveLength(4);
        expect(first.slice(2)).toEqual([0, 0]); // the click bars
        expect(first[0]).toBeGreaterThan(0);
        expect(first[1]).toBeGreaterThan(0);
        expect(second.slice(2)).toEqual([0, 0]);
        // the second cycle carries on to the next permutation bars
        expect(second.slice(0, 2)).not.toEqual(first.slice(0, 2));
      });

      it('keeps the cursor moving through the groove during the click bars', () => {
        // 2-bar groove of 16ths, 1 groove bar + 1 click bar: bar 2 is silent
        gw.loadNewGroove(groove(2, '&GrooveBars=1&ClickBars=1'));
        loadMidi(true);
        // one silent cursor marker (note 20) on every 16th of the click bar
        const url = String(globalThis.MIDI.Player.loadFile.mock.calls.at(-1)[0]);
        const bytes = atob(url.split(',')[1]);
        let markers = 0;
        for (let i = 0; i < bytes.length - 2; i++)
          if (bytes.charCodeAt(i) === 0x99 && bytes.charCodeAt(i + 1) === 20) markers++;
        expect(markers).toBe(16);
        // three quarters of the way through the cycle is half way through bar 2
        const litCell = () =>
          [...document.querySelectorAll('[id^="bg-highlight"]')].findIndex(
            (el) => el.style.background && !el.style.background.includes('transparent')
          );
        fireNote('cursor', 0.76);
        expect(litCell()).toBe(24);
      });

      it('shows no cursor during the count-in', () => {
        gw.loadNewGroove(groove(2, ''));
        gw.metronomeOptionsMenuPopupClick('CountIn');
        loadMidi(true); // the count-in bar
        const litNotes = () =>
          [...document.querySelectorAll('[id^="bg-highlight"]')].filter(
            (el) => el.style.background && !el.style.background.includes('transparent')
          ).length;
        fireNote('metronome', 0.5);
        expect(litNotes()).toBe(0);
        expect(gw.myGrooveUtils.percentForSheetMusic(0.5)).toBeLessThan(0);

        fireNote('complete', 1); // the count-in has played: the groove starts
        loadMidi(false);
        fireNote('hi-hat', 0.01);
        expect(litNotes()).toBe(1);
        expect(gw.myGrooveUtils.percentForSheetMusic(0.01)).toBeGreaterThanOrEqual(0);
      });

      it('plays straight bars straight, and keeps the swing on the click in click bars', () => {
        gw.loadNewGroove(
          groove(2, '&StraightBars=2&GrooveBars=2&ClickBars=1').replace(
            'MetronomeFreq=4',
            'MetronomeFreq=16'
          )
        );
        loadMidi(true);
        const [swung, straight, click] = loadedBars();
        expect(swung.gaps[0]).toBeGreaterThan(swung.gaps[1]);
        expect(straight.gaps).toEqual([32, 32, 32, 32]);
        expect(click.kicks).toBe(0);
        expect(click.gaps).toEqual(swung.gaps);
      });
    });

    it('builds MIDI across snare-permutation sections when active', () => {
      gw.permutationPopupClick('snare_16ths');
      checkAll();
      expect(() => loadMidi(false)).not.toThrow();
    });

    it('uses the snare accent-grid permutation arrays when those options are on', () => {
      gw.permutationPopupClick('snare_16ths');
      checkAll();
      // Plain accent grid -> get_snare_accent_permutation_array.
      const accent = document.getElementById('PermuationOptionsAccentGrid');
      if (accent) accent.checked = true;
      expect(() => loadMidi(false)).not.toThrow();
      // Diddled accent grid -> get_snare_accent_with_diddle_permutation_array.
      const diddled = document.getElementById('PermuationOptionsAccentGridDiddled');
      if (diddled) diddled.checked = true;
      expect(() => loadMidi(false)).not.toThrow();
    });
  });
});
