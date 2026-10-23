# GrooveScribe — project guide for Claude

Browser-based drum-notation editor. Runs entirely client-side (no server, no
build step). A groove is encoded in the URL, rendered to sheet music as SVG
(via the vendored `abc2svg`) and played back as MIDI (via `jsmidgen` +
`MIDI.js` soundfonts).

## Running & developing

- **Serve locally:** `npm run serve` (→ http://localhost:8000). You MUST serve
  over HTTP — opening `index.html` via `file://` breaks soundfont loading
  (CORS on the `*-ogg.js` files).
- No compile/bundle: source in `js/` is loaded directly as native ES modules
  (`<script type="module">`). Editing a file = refresh the page.

### Verify loop (run after every change; all must stay green)

| Command                | Expectation                                                                                                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`             | Vitest unit suite — **1157 pass** (8 "unhandled errors" from a tempo timer outliving its test's DOM are a known, pre-existing quirk)                                         |
| `npm run test:e2e`     | Playwright golden-master — **125 pass**. Byte-identical SVG+MIDI snapshots; this is the real proof that a refactor changed nothing functional. Finishes in <5 min by design. |
| `npm run lint`         | ESLint — **0 errors** (~75 SonarJS _warnings_ are an accepted refactor backlog, not failures)                                                                                |
| `npm run typecheck`    | `tsc --noEmit` checkJs via JSDoc — ~173 known errors baseline; changes should be typecheck-**neutral**                                                                       |
| `npm run knip`         | no unused exports/files                                                                                                                                                      |
| `npm run format:check` | Prettier clean (`npm run format` to fix)                                                                                                                                     |
| `npm run check`        | lint + typecheck + format:check + test in one shot                                                                                                                           |

Standing rule for all refactoring here: **nothing functional may change** —
prove it with the golden-master E2E, not by eyeballing.

## Architecture

### Render pipeline (the mental model)

```
URL query string  ──parse──►  grooveData  ──►  ABC notation ──► SVG  (abc2svg)
   (urlSerialization)         (the contract)   (abcNotation)
                                   │
                                   └──────────►  MIDI file   (midiFile + jsmidgen)
```

`grooveData` is the central data contract (js/grooveData.js: `GrooveData`
@typedef + pure `createGrooveData()` factory). Everything flows through it.

### The three top-level objects

- **GrooveUtils** (`js/groove_utils.js`) — shared core engine. Owns URL↔grooveData,
  ABC + MIDI generation (delegates to the pure modules below), MIDI playback,
  tempo/swing, note-array math. Used by both the editor and the embed viewer.
- **GrooveWriter** (`js/groove_writer.js`) — the interactive **editor** controller:
  the clickable note grid, menus/popups, undo/redo, permutation practice modes,
  hotkeys. Instantiated in `js/main.js` for `index.html`.
- **GrooveDisplay** (`js/groove_display.js`) — read-only **embed** renderer
  (used by the `GrooveEmbed*.html` / `grooveDBTest*.html` pages).

### Module map (`js/`, ours — everything else in `js/` is vendored, don't lint/edit)

Pure / low-coupling core (extracted from the two big files, imported back):

- `constants.js` — all `constant_*` values (ABC tokens, MIDI numbers, grid colors).
- `musicMath.js` — pure time-signature / note-scaling math.
- `noteArrays.js` — note-array ↔ tab/ABC conversions.
- `grooveData.js` — `GrooveData` typedef + factory (see above).
- `urlSerialization.js` — URL ↔ grooveData (fully pure; instance flags passed via a `config` arg).
- `midiFile.js` — grooveData → MIDI (takes a GrooveUtils `gu`).
- `abcNotation.js` — grooveData → ABC (takes `gu`).
- `browserInfo.js` — user-agent / touch probes.
- `permutations.js` — pure permutation-mode note-array generators (+ kick-array merge/filter), and the
  figure layouts per note setting and time signature (`getPermutationLayout(division, top, bottom)`).
- `viewHtml.js` — pure HTML string builders (staff container, permutation-options menu).
- `updateCheck.js` — the "new version is ready" bar (compares its own `?v=` with `version.json`).
- `metronome.js` — the Click menu's settings (`MetronomeFreq`) and the exactly timed clicks
  (triplets, sextuplets, swung 8ths/16ths, dotted quarters) as ticks per bar.
- `beatNotes.js` — notes beat by beat in the Mixed setting (`Beats=ssqq`): each beat's choice,
  which grid slots it uses, inference from notes, counting, and the beat plan the ABC/MIDI writers take.
  A beat of 32nds (`d`) needs the 32nds grid instead (`Div=32&Beats=sssd`, 8 slots a beat); functions take
  the grid (48 / 32) last.
- `ornaments.js` — flams/drags/ruffs (grace groups) and diddles (`!/!`) inside note tokens.
- `barMeters.js` — a time signature per bar; which note settings fit a bar.
- `practiceSettings.js` — an exercise's practice settings in its link (`Perm`/`PermSet`/`PlayEach`/`PermBars`/`FatBack`/`Ostinato`,
  `PlayBars`, `SpeedUp`, `CountIn`, `ClickSolo`, `ClickStart`, `Mute`); only those that are on. Save & Share's
  "Include practice settings" box sets `grooveData.includePractice`; `Instructions` always travel.
- `countModes.js` — the Count menu's choices (`Count=1|bold|ghosts|rhythm|click`): the bold / small styling of
  counts, rhythm-only counts with bracketed silent beats, and the click's own count as a hidden
  stickings voice (its tuplets drawn without numbers).
- `tempoSwitch.js` — the sums for a tempo change while playing: the next bar line whose last note
  before it is still to come, in the playing MIDI and in the round built again at the new tempo.
- `sections.js` — a groove's sections (`Sections=A1-2x4,B3-4x2`): a letter per bar, runs of the same letter
  are a section, its first bar's repeats; the playing order (`formBars`) and the link form.
- `noteBlocks.js` — a block of notes (any rows, any slots) copied from / pasted into the groove's tab
  lines, keeping its shape; the kick line holds two grid rows (kick, hi-hat foot), kept apart.
- `audioSession.js` — while a groove plays, `navigator.audioSession.type = 'playback'` so iPhones
  play it through the silent switch; `'auto'` again on pause/stop.
- `gridState.js` — the DOM grid **read** layer: per-cell state (`is_*_on`/`get_*_state`)
  and whole-measure array readers (`get32NoteArrayFromClickableUI`, `muteArrayFromClickableUI`).
  Reads the ambient global `document`; caller state injected via ctx/callbacks.

Entry/support: `main.js` (index.html bootstrap, wires `window.myGrooveWriter` etc.),
`grooves.js` (built-in groove library).

### Tests

- `tests/` — Vitest (jsdom). Subdirs per subject (`groove_utils/`, `groove_writer/`,
  `groove_display/`). Legacy source is loaded via `tests/helpers/` shims. See `tests/README.md`.
- `tests-e2e/` — Playwright (Chromium). `golden-master.spec.js` snapshots SVG+MIDI for a
  groove corpus; `fixtures.js` blocks non-localhost requests for hermetic runs.

## Conventions & gotchas

- **Releases are version-stamped:** run `npm run stamp` before each release (writes `?v=<version>` on
  every file `index.html` loads, the import map for the modules, and `version.json`). After adding a
  module run it too: `tests/version.test.js` fails until the import map covers every module.
- **Adding a new `js/*.js` ES module:** add it to the module-files list in
  `eslint.config.js` (else "import/export only allowed with sourceType: module").
  App source is otherwise treated as classic scripts. `tsconfig.json` `include` lists
  only the big files; small modules are checked transitively.
- **Native modules run deferred**, so parse-time `document.write` is gone — DOM is built
  in `main.js` / inline module scripts. Use `import.meta.url` (not `document.currentScript`,
  which is null in modules) for locating the script's own path.
- Extraction pattern used throughout: move code to a new module, leave a **same-name
  delegating wrapper** in the original file so call sites stay untouched; verify byte-identical
  output via the golden master.
- Grid state is read back from **rendered CSS color** — the note setters (still in GrooveWriter)
  paint a cell, the `gridState` readers compare its color against the shared
  `constant_*_on_color_rgb` values in `constants.js` (setters paint the hex form; the browser
  normalizes it to rgb on readback).
- Vendored globals (don't redefine): `Midi`, `MIDI`, `Abc`, `Share`, `ShareButton`, `Pablo`.
- **Bars per line** come from `abcNotation.musicLayout` (two only when they fit the page; a bar too
  wide alone gets a wider page), and the editor redraws wider if abc2svg still breaks a line
  mid-bar (`musicLineBroken`). Triplet-grid bars are written 12 units a quarter note (their
  tuplets only labels) but plain beats 8: anything laid over them (counts, the click's count)
  must follow the writer's beats (`withCountsOver`), never assume a length.
- **Permutation ticks** (`PermSet`) are every option checkbox in DOM order: a new box shifts them and
  older links lose their ticks. A new option gets its own link setting and stays out of
  `permutationCheckboxes()` (as "Fat back" does, `FatBack=1`, and the device's "Rep counter"
  switch), or new groups go through
  `layout.groupsInOlderLinks`.
- **Permutation runs** play over an ostinato of the groove's first bars (`get_ostinato_bars()`, up to
  `MAX_OSTINATO_BARS`): bar `n` of the run is figure `n / (repeats × bars)` over ostinato bar
  `n % bars`; the music writes each figure once over the bars. A link says its ostinato's bars
  (`Ostinato=N`, past one bar only); a permutation link without it closes every bar after the
  first on opening, as links did before multi-bar ostinatos. A one-bar run must stay
  byte-identical: the golden master's permutation exercises (`permutationPlayback` in
  `tests-e2e/helpers.js`) pin down their music, first playback rounds, cursor and grid highlight.
- **Permutation time signatures**: `getPermutationLayout` returns null where the figures don't fit
  (that greys out the menu and turns a permutation off). 4/4 is any note setting; x/4 is 16ths, 32nds
  and both triplets, 8ths only with even beats; compound x/8 is 8ths / 16ths with the triplet figures
  per dotted-quarter beat. Cross-rhythm groups exist only when they divide the bar, so a group list
  (and `PermSet`) depends on the meter too. After the time-signature popup the beats can be strings
  ("3"): keep layout maths to `*`, `%` and `==`.
- **The editor puts each glyph on the page once** (`defineGlyphsOnce` in `displayNewSVG`): with
  `%%fullsvg`, abc2svg 1.3.2 repeats every earlier line's `<defs>` in each line (quadratic: seconds
  for a long permutation run). The golden master snapshots that page form; `musicLineBroken` still
  reads abc2svg's own output. The music engine also crashes (`gchord_width ... seqst`) somewhere
  around 500 counted bars of music, so keep runs (figures × ostinato bars) well under that.
- **Tempo changes while playing** (`switchTempoAtNextBar` in groove_utils): a time round is one
  MIDI file (a permutation run is one round), so the editor builds the round again at the new tempo
  and the player moves into it just after the last note before the next bar line: `MIDI.Player.stop()`,
  then its `replayer` / `data` / `currentTime` set and `resume()`, from a `setTimeout(0)` after that
  note's callback (inside it, `stop()` would cut the note still in MIDI.js's queue). The golden master
  doesn't cover it (no tempo changes); check it in a real browser by recording `MIDI.noteOn` times.
- **Selecting notes** is Shift (or ⌘) + drag on `#measureContainer` (pointer events; Ctrl + hover
  is the original "paint notes on" shortcut, Alt + hover erases), or the Select button on touch
  screens (`touch-action: none` on the rows while on). A capture-phase click handler on the grid
  swallows the click that ends a drag, so no note toggles. Pastes go through `keepingMutes`.
- **Practise bars** (`PlayBars=1-2`, the play bar's box): the time round is just those bars
  (`practisedBars()`), built bar by bar like the groove / click cycle, whose sequence they become
  (`sequenceBar(i)`); `playingPercentToGroovePercent` turns the playing position back into the whole
  groove's for the grid highlight, and `practisedMusicPercent` into the music's, which writes just those
  bars (`barsWritten()`, numbered with `%%measurenb 1` and a `%%setbarnb` of the _next_ bar before each:
  abc2svg numbers the bar after). A practised round must stay byte-identical to a groove made of just those
  bars (the functional E2E checks it). The same box is a permutation's `PermBars` while one is on
  (`setBoxBars`); the Alphabet panel has no box of its own.
- **Sections & the playing order**: `playedBars()` is the order the groove's bars play: the practised
  bars, else the sections' form (A ×4, B ×2), else `[]` (every bar once, in order: the old byte-identical
  path). Everything that plays bar by bar (`sequenceBar`, the groove / click cycle, the practice timer,
  tempo switches, the cursor) goes through it. The music writes every bar once (`withSectionMarks`: an
  inline `[P:A ×4]` and `|:` / `:|` in each voice; the last bar's line end becomes `\n` so it isn't
  `:||`), numbered (`%%measurenb 1`) from 2 bars up.
- **Two beat-by-beat grids**: Mixed (`Div=48`, 12 slots a quarter: 8ths, 16ths, every triplet) and
  32nds with `Beats=` (`Div=32`, 8 a quarter: 8ths, 16ths, 32nds); `beatGrid()` says which (0: plain).
  32nds and triplets never share a groove (`gridOfBeats` → -1; the beat menu greys them out). Grid
  changes go through `setGrooveBeats` / `divisionRoute` (by way of 16ths, so notes keep their places;
  a direct 48↔32 change would fall back to the default groove). A plain `Div=32` link has no
  `Beats=` and stays byte-identical.
- **Bar copies** go to localStorage and the device clipboard (`Infinity Scribe bar {json}`, with an
  `at` time; paste takes the newer): each origin, home-screen app and private tab has its own
  storage. Anything that lays the grid out again (add / remove / paste / "Add a copy") goes through
  `keepingMutes` (mutes live in the DOM and would reset), which also makes it one link update.

## Refactor status (strangler-fig, ES-module migration)

Steps 1–3 complete: native ESM (no build); pure core extracted; `grooveData` contract
formalized. **Step 4 (decomposing GrooveWriter) is paused** with the high-value cuts done —
`permutations.js`, `viewHtml.js`, and the full `gridState.js` read layer are extracted, taking
`groove_writer.js` from ~5,800 → ~3,870 lines. The remainder is mostly irreducible
controller/event-handler/DOM-write glue. If resumed, candidate cuts: the UI→grooveData
**bridge** (`grooveDataFromClickableUI` / `createMidiUrlFromClickableUI` — top-of-graph, needs a
ctx-bag) or the note **setters** (`set_*_state`, the DOM-**write** counterpart to `gridState`).
