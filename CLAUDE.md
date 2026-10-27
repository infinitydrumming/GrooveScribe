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
| `npm test`             | Vitest unit suite — **1275 pass** (8 "unhandled errors" from a tempo timer outliving its test's DOM are a known, pre-existing quirk)                                         |
| `npm run test:e2e`     | Playwright golden-master — **137 pass**. Byte-identical SVG+MIDI snapshots; this is the real proof that a refactor changed nothing functional. Finishes in <5 min by design. |
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
  figure layouts per note setting and time signature (`getPermutationLayout(division, top, bottom)`);
  the 32nd layout's `chapters` (`thirtySecondChapters`: every rhythm of a beat of 32nds, built on the 16th alphabet).
- `viewHtml.js` — pure HTML string builders (staff container, permutation-options menu).
- `updateCheck.js` — the "new version is ready" bar (compares its own `?v=` with `version.json`).
- `metronome.js` — the Click menu's settings (`MetronomeFreq`) and the exactly timed clicks
  (triplets, sextuplets, swung 8ths/16ths, dotted quarters) as ticks per bar.
- `beatNotes.js` — notes beat by beat in the Mixed setting (`Beats=ssqq`): each beat's choice,
  which grid slots it uses, inference from notes, counting, and the beat plan the ABC/MIDI writers take.
  A beat of 32nds (`d`) needs the 32nds grid instead (`Div=32&Beats=sssd`, 8 slots a beat), 32nds with
  triplets the fine grid (`Div=96`, 24 a beat); functions take the grid (48 / 32 / 96) last.
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
  are a section, its first bar's repeats; the playing order (`formBars`, or a typed form's `formOrderBars`,
  `Form=ABAC`) and the link form.
- `noteBlocks.js` — a block of notes (any rows, any slots) copied from / pasted into the groove's tab
  lines, keeping its shape; the kick line holds two grid rows (kick, hi-hat foot), kept apart.
- `audioSession.js` — while a groove plays, `navigator.audioSession.type = 'playback'` so iPhones
  play it through the silent switch; `'auto'` again on pause/stop.
- `playAlong.js` — playing along with a song: the sums (tap tempo, where song and drums start, the song's
  position through speed changes and round a loop, the hit nearest a tap, wave peaks) and the steady clock (`createPlayAlong`)
  that plays the rounds in place of MIDI.Player while a song is on, with the song (`createSongPlayer`).
- `timeStretch.js` — a slower or faster song keeping its pitch: a phase vocoder (phase locking, a phase reset placing
  each drum hit exactly on time) whose windows come from a time map (`positionOfFrame`), and the song's hits
  (`findHits`). Snapshots let the stretch be made again after a speed change.
- `playAlongPanel.js` — the "Play along with a song" pop-up and the song chip in the play bar; each song's
  settings on this device (localStorage `infinityScribePlayAlong`). The link form (`Song=`...) is in
  `practiceSettings.js`.
- `gridState.js` — the DOM grid **read** layer: per-cell state (`is_*_on`/`get_*_state`)
  and whole-measure array readers (`get32NoteArrayFromClickableUI`, `muteArrayFromClickableUI`).
  Reads the ambient global `document`; caller state injected via ctx/callbacks.
- `lineStartNumbers.js` — the bar numbers starting lines, kept out of abc2svg's layout (through its
  `get_abcmodel` hook) and written in afterwards where abc2svg would have put them (see the engraving gotcha).

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
  mid-bar (`musicLineBroken`). A bar alone on its line with a count over 32nds gets at least
  `countRoom` of the page (90 a quarter note, so "la ba" keep apart; a phone's page is wider, drawn
  smaller; desktops are already wider). Triplet-grid bars are written 12 units a quarter note (their
  tuplets only labels) but plain beats 8: anything laid over them (counts, the click's count)
  must follow the writer's beats (`withCountsOver`), never assume a length.
- **Permutation ticks** (`PermSet`) are every option checkbox in DOM order: a new box shifts them and
  older links lose their ticks. A new option gets its own link setting and stays out of
  `permutationCheckboxes()` (as "Fat back" does, `FatBack=1`, and the device's "Rep counter"
  switch), or new groups go through
  `layout.groupsInOlderLinks`.
- **32nd chapters** (`PermChapter=3&PermPick=1-4,7`, `data-chapter` boxes outside `PermSet`): all 255
  rhythms of a beat of 32nds in 15 chapters built on the 16th alphabet (`ALPHABET_16`): chapter 1 is it over
  half a beat (= the 1/32 groups, byte-identical MIDI; the functional E2E checks it), chapter 2 over the beat
  with every 16th as a pair; the rest play each 16th of a figure as a 16th, a pair or the off-beat 32nd
  (`SIXTEENTH_WAY`), a mix a chapter. 16 rhythms are in two chapters. A chosen chapter replaces the ticked
  groups (`tickedPermutationSections`), a bar a rhythm. Links number chapters and their rhythms by position:
  reordering chapters after release changes what old links play.
- **Note lengths abc2svg can't draw** (5/32 came out as a triple-dotted quarter): the straight-bar
  writer cuts them at the next 8th (else 16th) of the bar, rests after (`drawnLengths`); hands and feet
  only, the stickings voice keeps its `x` spacers.
- **Long MIDI runs**: jsmidgen's `codes2Str` is one `String.fromCharCode.apply` per track, refused past
  65,536 bytes on iPhones (~125,000 Chrome); `newExactTimeTrack` swaps in `codesToString` (same bytes,
  8 KB at a time).
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
- **The music is engraved after abc2svg** (`engravedMusic` in `displayNewSVG`): part-label boxes (section
  letters: `%%partsfont calibri-Bold 18 box` once a groove has sections, ×N as `"_×N"` before the feet's
  end repeat) get round corners, and a bar number starting a line (`x` under 100) moves by the clef just
  over the stave, as abc2svg stacks it over the first note's stem. `musicLineBroken` still reads the raw SVG.
  abc2svg also keeps room over that first note for the number (`y_set` in its `draw_measnb`), which pushed
  the note's accent, its count and the line's count row up (from bar 10 on; a wide page's buckets even
  from bar 2), so the editor gives abc2svg none (`renderABCtoSVG(abc, true)`): `lineStartNumbers.js`
  numbers each line-ending bar 0.5 in `get_abcmodel` (drawn neither at the bar nor at the next line's
  start), then writes each number in where `draw_measnb` would have (`s.x - s.wl` of the line's first
  symbol, `nl === false` after abc2svg cuts the lines), first in the stave's text group. Only the editor
  does it (embeds and downloads keep abc2svg's numbers, which stay over the first note). The vendored
  engine is untouched; the functional E2E checks the numbers match abc2svg's own. abc2svg also crashes
  numbering a line that starts with a flam's grace notes (they sort before the Stickings voice, the
  line's clef is only in that voice, `s.prev` is null): `renderABCtoSVG` catches it (`draw_measnb`)
  and draws twice, once to see which bars before a lead-in end a line (`leadIns: 'all'`,
  `barsEndingLines`), then with just those numbers written in the same way; music that doesn't crash
  is drawn once, as before.
- **Counts and stickings are centred on their notes** (`centredChordTexts`, every `renderABCtoSVG`):
  abc2svg writes a chord symbol from `0.4 × w` (at most 8) left of its note, and its `strw` skips the
  letter after a `$1` font change, so counts started at their note and ran right. Its `anno_start`
  ("annot", just before each chord symbol's `xy_str`) gives x and w; each matching `<text>` (same x, in
  order) moves to the note and gets `text-anchor="middle"`. Annotations (`"^Straight"`, `"_×4"`, the
  legend) stay. Over 32nds the bold count font is as small as the rest (11). The music's font
  `calibri` is an `@font-face` in `css/groove_display*.css`: the device's Calibri, else Carlito (the same
  widths, OFL, `fonts/carlito/`) — phones had put a much wider font in its place.
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
- **Playing along with a song** (`playAlong.js`): while a song is loaded, groove_utils' `player()` is the
  steady clock instead of MIDI.Player (same calls: start / resume / pause / stop / loop / playing; `loadFile`
  still fills MIDI.Player.data, which the clock reads). It places notes `LOOKAHEAD` ahead on the audio clock
  (`MIDI.noteOn` with absolute times) and tells `ourMIDICallback` each note as MIDI.js would; a round's end is
  told `HANDOVER` early, and a `start()` during that call queues Scribe's next round exactly at the old one's
  end (a `stop()` then is deferred: no `start()` means the groove ends). Every round's first bar is played a
  blank tick early (`firstBarOnTime`), a count-in ends a tick sooner, so all bars sit on the song's beats. The
  song's speed is the groove's tempo / the song's, changed at round starts and tempo switches
  (`switchTempoAtNextBar`); it keeps its pitch (`createStretchedSongPlayer`, made `STRETCH_AHEAD` ahead in
  pieces, made again from a speed change) unless switched off (varispeed, `createSongPlayer`). Loop mode
  (`SongLoop=17-24`, `songLoop`): the groove starts on the loop's first bar; the players count the song's place on
  linearly and wrap it at the loop (`loopedPosition`; varispeed sets the source's own `loop` / `loopStart` /
  `loopEnd`, the stretcher cuts its windows at the join), so a rate change's `from` is the counted-on place, never
  the wrapped one; the join moves onto a hit within 6 ms (`loopSeam`). Without a song MIDI.js plays as always (golden master untouched); the
  functional E2E checks kicks against a generated song's beats.
- **Changing the note setting: phrase or timing** (`changeKeepsThePhrase`): the "Keep" switch
  (`#notesKeepToggle`, the phone's `#notesSelect` foot; localStorage `grooveScribeNotesKeep`, 'phrase' to
  start) picks `changeDivisionKeepingThePhrase`, where the notes keep their slot order across the groove
  (`reflowIntoDivision`: every bar's slots as one phrase, laid into the same number of bars in the new
  setting, as a whole-groove time-signature change does), or the old path, which keeps the notes' time.
  Between triplets and straight notes (no common grid) the phrase is kept either way; Mixed, anything
  beat by beat and a permutation's ostinato keep the time. Internal steps (`setGrooveBeats`, Mixed by way of 16ths) call
  `changeDivision(n, true)` to keep the time whatever the switch says.
- **Selecting notes** is Shift (or ⌘) + drag on `#measureContainer` (pointer events; Ctrl + hover
  is the original "paint notes on" shortcut, Alt + hover erases), or the Select button on touch
  screens (`touch-action: none` on the rows while on). A capture-phase click handler on the grid
  swallows the click that ends a drag, so no note toggles. Pastes go through `keepingMutes`. A copied block
  also goes to localStorage and the clipboard (`Infinity Scribe notes {json}`, newest wins); Ctrl/⌘+V uses
  the `paste` event's own text (no permission prompt), the Paste button `readText` with a 1.5 s fallback.
- **Practise bars** (`PlayBars=1-2`, the play bar's box): the time round is just those bars
  (`practisedBars()`), built bar by bar like the groove / click cycle, whose sequence they become
  (`sequenceBar(i)`); `playingPercentToGroovePercent` turns the playing position back into the whole
  groove's for the grid highlight, and `practisedMusicPercent` into the music's, which writes just those
  bars (`barsWritten()`, numbered with `%%measurenb 1` and a `%%setbarnb` of the _next_ bar before each:
  abc2svg numbers the bar after). A practised round must stay byte-identical to a groove made of just those
  bars (the functional E2E checks it). The same box is a permutation's `PermBars` while one is on
  (`setBoxBars`); the Alphabet panel has no box of its own.
- **Practised alphabet bars** (`PermBars`): written in one run of lines (`practisedBarsABC`: each group's
  `T:`/`P:` heading becomes an inline `[P:...]` over its first bar, as a new heading block would space its
  lines alone), and `practisedBarsLayout` sets the bars a line and centring margins so every bar is as wide,
  no wider than a moderate bar (120 page px a quarter) times the device's Music spacing (localStorage
  `grooveScribeMusicSpacing`, percent; 0 fills the page). One line is stretched (`%%stretchlast 1`); more,
  the last takes the line before's spacing (`%%stretchlast 0.01`: abc2svg rejects 0, keeping the value
  before it, so the permutation boilerplate's `0` is really its default .25). Drawn wider for a broken line:
  no margins.
- **Music spacing for all music** (`spacedMusic` in `generate_ABC`): other than practised alphabet bars,
  `spacedLayout` makes `musicLayout`'s bars a line `1 / spacing` times as many (at most 8; a wider page,
  drawn smaller, when `bar` × that won't fit), and a groove's `spacedLines` heading centres one short line
  and keeps a last line's spacing. 100% returns the layout untouched (golden master unchanged). Alphabet
  groups break their lines every `barsPerLine` (`getPermutationSectionABC`).
- **The alphabet's run, in order and with trade bars**: `permutationRun()` is the run as it plays, each
  entry a written figure (`index` among the shown ones, `number`) and its `times`: the shown figures each
  "Play each" times, or a `PermBars` order (`parseBarOrder`; `isPlainOrder` lists play as before). Trade
  bars (`class_trade` {bars, times, after}; the grid's last bars, `get_ostinato_bars()` excludes them) play
  `times` times before / after each entry. Bar `n` of the run is `permutationRunBar(run, n)` (entry, rep,
  ostinatoBar, or trade / tradeTime; `gridBar` always): everything bar by bar (MIDI, the cursor, the grid
  highlight, the rep counter, straight bars) goes through it. With trade bars or an order
  (`writtenAsPlayed()`), the music is the run written out as it plays (`runAsPlayedABC`: each entry's trade
  bars and figure once, `|:`/`:|` and `"_×N"` when they repeat; `asPlayedMusicBar` maps the cursor), else
  each figure once as before. Trade bars are numbered from `UNNUMBERED_BARS` (9000), whose numbers
  `engravedMusic` drops. A `%%setbarnb` goes to the next bar LINE abc2svg reads, so a repeat start sits on
  the previous bar's closing line (`|:` / `:|:`), never at a bar's start (none at the music's start).
  `showTradeBars` hides the figures' lines per bar (ostinato bars) and shows every line in trade bars.
- **Trade bars with notes of their own** (beat by beat): a trade bar's beat menu puts the groove on the Mixed
  (or 32nds) grid like any bar's, but the alphabet keeps its note setting: `alphabetDivision()` is the one every
  beat of the ostinato's bars has (`ostinatoBeats`, by `class_trade.bars` so a link's alphabet is set up after its
  trade bars), and `get_permutation_layout()` uses it. `get_permutation_bar` puts the figures on the grid's bar
  (`notesInBarOfSize`, 32 → 48 slots), every bar of the run is written with its own beat plan
  (`permutationBarABC(..., gridBar)`) and played with its beats' diddle spans. The Notes buttons and an ostinato
  bar's beat menu set the alphabet's notes (`setAlphabetNotes`: every ostinato beat), keeping the trade bars'
  (`alphabetNotesButton`); trade bars all back to the alphabet's notes (or removed) return the plain note setting.
  On a beat grid the run's MIDI, cursor and grid highlight are byte-identical to the same run in its plain setting
  (the functional E2E checks the MIDI). The 32nds grid allows an alphabet only with alike ostinato beats.
- **Sections & the playing order**: `playedBars()` is the order the groove's bars play: the practised
  bars, else the typed form (`Form=ABCA-ABCA`, `#sectionForm` above the bars once there are sections:
  `formOrderBars`, each letter every section with it, its repeats; `%%center Form: A B A C` over the
  music), else the sections in order (A ×4, B ×2), else `[]` (every bar once, in order: the old byte-identical
  path). Everything that plays bar by bar (`sequenceBar`, the groove / click cycle, the practice timer,
  tempo switches, the cursor) goes through it. The music writes every bar once (`withSectionMarks`: an
  inline `[P:A ×4]` and `|:` / `:|` in each voice; the last bar's line end becomes `\n` so it isn't
  `:||`), numbered (`%%measurenb 1`) from 2 bars up.
- **Three beat-by-beat grids**: Mixed (`Div=48`, 12 slots a quarter: 8ths, 16ths, every triplet),
  32nds with `Beats=` (`Div=32`, 8 a quarter: 8ths, 16ths, 32nds), and the fine grid (`Div=96`,
  `FINE_DIVISION`, 24 a quarter: every choice), only for a groove whose beats mix 32nds and triplets
  (`gridOfBeats` → 96); `beatGrid()` says which (0: plain). Grid changes go through `setGrooveBeats` /
  `divisionRoute` (by way of 16ths, so notes keep their places; a direct 48↔32 change would fall back
  to the default groove), so a groove leaves 96 as soon as its 32nds or triplets go. A plain `Div=32`
  link has no `Beats=` and stays byte-identical. A fine-grid bar is written as the grid its own beats
  need would write it (`fineGridABC`: no 32nds → every 2nd slot through the Mixed writer, no triplets →
  every 3rd through the 32nds writer, byte-identical music and MIDI, unit-tested), and with both
  through the Mixed writer with each `d` beat written from the fine slots (`fineBeatABC`, its counts
  and diddle stops from the fine beat plan). Its layout counts its notes as Mixed (`layoutNotes`).
  Beats of 8ths and 16ths swing on every grid (`beatSlotDuration`, by slots a quarter note).
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
