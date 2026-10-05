import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { newGrooveWriter, buildFullPageDOM } from '../helpers/loadGrooveWriter.js';
import { installMidiGlobal } from '../helpers/legacyLoader.js';

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

      it('the groove keeps counting through the click bars', () => {
        // 2-bar groove, 3 + 2: 1 2 1 (click click) 2 1 2 (click click) ...
        gw.loadNewGroove(groove(2, '&GrooveBars=3&ClickBars=2'));
        expect(playCycle(true)).toEqual([1, 2, 1, 0, 0]);
        expect(playCycle(false)).toEqual([2, 1, 2, 0, 0]);
        expect(playCycle(false)).toEqual([1, 2, 1, 0, 0]);
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
