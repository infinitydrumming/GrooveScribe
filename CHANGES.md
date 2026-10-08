# Changes in the Infinity Drumming version

This is a modified version of
[Groove Scribe by Lou Montulli and Mike Johnston](https://github.com/montulli/GrooveScribe),
published at https://groove.infinitydrumming.com from
https://github.com/infinitydrumming/GrooveScribe. It is distributed under the same
licence as the original: the GNU General Public License, version 2 or (at your
option) any later version. See [LICENSE.txt](LICENSE.txt).

As GPL v2 section 2(a) asks, this file records what was changed and when. Every
modified source file also carries a short "Modified by Infinity Drumming" notice.
The original copyright notices and credits are unchanged.

## 2026-10-08 — a time signature for each bar

- New `js/barMeters.js`. Each bar can have its own time signature, from a button
  under the bar (the TIME button still sets every bar). Links carry them as
  `BarSigs=4/4,2/4,4/4` only when the bars differ; grooves in one time signature
  are exactly as before (golden master unchanged).
- Every bar keeps the longest bar's number of note slots (the bar stride), so bar
  b still starts at b × stride everywhere; a shorter bar hides its extra slots on
  the grid, and they are always rests. Each bar's notes are written in links with
  only its own slots.
- Sheet music: an inline `[M:x/y]` in every voice where the time signature
  changes. Playback, metronome, count-in, cursor, groove / click bars (click bars
  as long as the bars they stand in for) follow each bar's length.
- Changing a bar's time signature keeps its notes from the start (cut off or with
  rests added); adding a bar copies the last bar's time signature; copy / paste
  between bars of different lengths keeps the notes in place.
- A note setting has to fit every bar (triplets only when every bar is x/4);
  permutations are only offered when every bar is 4/4.
- Classic beaming for x/8 bars, in the sheet music and the grid's spacing: 3/8 as
  one group of 3, 5/8 as 3+2, 7/8 as 2+2+3, 8/8 as 3+3+2 (and 10, 11, 13, 14/8),
  in 8th and 16th notes alike (`beamGroupEnds` in `js/musicMath.js`). 6/8, 9/8,
  12/8 and every x/4 bar beam as before.

## 2026-10-08 — flams, drags and ruffs on every drum

- New `js/ornaments.js`. A flam (1 grace note), drag (2) or ruff (3) can go on any
  note of the snare, the kick, the toms and the cymbal lines (hi-hat, crash, ride),
  from the note's right-click menu, with its grace notes on the same drum or on
  another (snare, kick, high / mid / floor tom, hi-hat). The note shows a small label.
- The ornament travels inside the note's ABC token as a grace group, like the
  snare flam always has, so it comes with the note through copy / paste, adding
  and removing bars, note-setting changes, permutations and undo. Links carry it
  on ornament lines next to each line (`SO`, `KO`, `HO`, `T1O`, `T2O`, `T4O`, `CO`, `RO`).
  Older links' snare flams and drags still load, and are written the new way.
- Playback (`js/midiFile.js`): the drums play the notes and the grace notes are
  added as separate soft hits a fixed number of milliseconds before their note,
  whatever the tempo. They are slipped in among the notes already written (only
  delta times are split), so no other note moves. A bar's first note takes its
  grace notes from the end of the previous bar; the groove's first note takes them
  from the end of the file (so they lead back in every loop), the end of the
  count-in, or a short lead-in when playing starts. Groove / click cycles end with
  the grace notes of the next cycle's first bar. The old recorded snare flam and
  drag sounds are no longer used.
- Metronome Options > "Flams, drags & ruffs": grace-note spacing (15–150 ms,
  default 30) and volume (default 40% of a normal hit), saved in the link as
  `GraceMs` / `GraceVol` only when changed. Drags and ruffs are spaced 1.5 times
  wider than flams (45 ms at the default), so each grace note is heard, like an
  open, even double stroke.
- Golden master: the four coverage grooves with snare flams / drags changed sound
  (their sheet music is unchanged); two new coverage grooves with ornaments.

## 2026-10-07 — groove / click numbers apply as you type

- The groove / click bar numbers now take effect as they are typed, not only on
  Done, so pressing Play with the pop-up still open (easy on a phone) plays the
  new numbers instead of the old ones.

## 2026-10-07 — screen stays on while playing

- New `js/screenWakeLock.js`: while a groove is playing, phones and tablets keep
  the screen on (Screen Wake Lock API, where the browser has it). It lets go on
  pause, stop or the end of the groove, and is asked for again if you switch
  back to the page while it is still playing.

## 2026-10-06 — Grooves menu scrolls again

- The colour theme had stopped the Grooves menu from scrolling (`overflow: hidden`
  for its rounded corners). It scrolls again; a new end-to-end test checks it.

## 2026-10-06 — footer feature list

- The "New in Infinity Scribe" line under the app lists everything added up to
  6 October 2026.

## 2026-10-06 — Infinity Drumming colours

- New `css/infinity_theme.css`, loaded last by `index.html`: navy, blue and amber
  from the Infinity Drumming brand palette, with high-contrast text throughout. The SCRIBE in the Infinity Scribe
  wordmark is now amber to match.
  The chosen metronome setting is a filled amber pill, the chosen note setting
  is blue with an amber edge, sliders fill in blue with an amber handle, and
  menus and pop-ups have rounded corners. Colours and spacing only; the music,
  playback and links are unchanged.

## 2026-10-06 — cursor through the silent bars

- With "Groove / click bars", the cursor now keeps moving through the groove (or
  the permutation) during the click-only bars, note by note at the same speed, so
  players can see exactly where they are while they play on without the groove.
  It is driven by silent marker notes (MIDI note 20, which has no sound) on every
  note of the grid in the click-only bars.
- A click-only bar is swung or straight like the bar it stands in for.

## 2026-10-05 (eighth update) — permutations with groove / click bars, count-in cursor

- Fixed: "Groove / click bars" didn't work with permutations: the whole
  permutation played before any click bars. Permutations now use the same
  bar-by-bar cycle as a normal groove (N permutation bars, M click-only bars,
  then on through the permutation).
- Fixed: during the count-in the cursor ran through the whole sheet music, so
  auto-scroll took the page to the bottom (and with a long permutation it stayed
  there). There is now no cursor and no scrolling during the count-in; it starts
  on the first note of the groove.
- The sheet-music cursor now also follows the groove / click cycle (it showed the
  wrong place when the cycle length differed from the groove's), and shows nothing
  during the click-only bars, like the grid.
- Fixed: choosing "Count it in" in the metronome Options raised an error (a
  call to a function that never existed, in the original Groove Scribe too), so
  the Options button didn't update.

## 2026-10-05 (seventh update) — playback cursor timing

- Fixed: the blue playback cursor could run ahead of the sound, typically by one
  subdivision on phones and Bluetooth speakers. It moved when each note was handed
  to the audio system, but the sound leaves the speaker later (the device's audio
  output latency). The cursor, on the grid and the sheet music, now waits for the
  latency the browser reports.
- New **Cursor timing** item in the metronome Options menu: a slider to nudge the
  cursor later or earlier until it lines up with what you hear on this device (for
  speakers whose latency the browser doesn't report). Each device remembers it.
- Fixed: with Brazilian swing, the early "a" of each beat was highlighted on the
  "&". The cursor now snaps to the note as written.

## 2026-10-05 (sixth update) — groove / click bars counted bar by bar

- Fixed: the "Groove / click bars" option always played the whole groove before
  the click bars, so a 4-bar groove with 3 groove bars + 1 click bar played all 4
  bars and then added a click bar (a 5-bar cycle). It now counts bar by bar: 3 + 1
  plays bars 1-3 and then the click bar in place of bar 4, every time round.
- The groove keeps its place through the click bars and comes back in on the bar
  it would have reached (a 2-bar groove with 3 + 2 plays 1 2 1, two click bars,
  then 2 1 2, ...). Straight bars stay straight, and the playing bar is still
  highlighted, with no highlight during the click bars. Permutations are unchanged.

## 2026-10-05 (fifth update) — speed-up target tempo

- **Target tempo for the metronome's Auto Speed Up:** tick "Stop at" and enter a
  tempo (clicking the box ticks it). The tempo keeps rising by the chosen amount
  per interval until it reaches the target, then holds there. Without it, the
  speed-up works as before.

## 2026-10-05 (fourth update) — straight and swung bars

- **Straight bars in a swung groove:** each bar has a small "swing" switch under its
  copy and paste buttons. Click it to make the bar "straight": it then plays
  straight while the other bars swing with the swing slider (amount and style,
  regular or Brazilian). A new bar copies the last bar's setting.
- The sheet music marks "Swing" (or "Brazilian swing") and "Straight" over the first
  bar and wherever the feel changes, when the groove is swung and has straight bars.
- Saved in links as `StraightBars=2,4` (the straight bars); links without it are
  unchanged, and shared links and embedded grooves play and mark it the same way.
- The help page explains it.

## 2026-10-05 (third update) — swung click in click-only bars

- Fixed: with the "Groove / click bars" option on, the click went straight in the
  click-only bars even when the groove was swung. It now keeps the groove's swing
  (amount, and regular or Brazilian), so the click sounds the same in both parts.

## 2026-10-05 (second update) — Brazilian swing

- **Brazilian swing:** click the word SWING in front of the swing slider to switch
  it to BRAZIL. The e of each beat is played a little late and the a a little early,
  so the four 16ths are spaced long-short-short-long (1 – e & – a), the samba /
  partido alto feel; the regular swing is long-short-long-short. The slider sets
  how strong it is (about 10% is a typical samba feel). In grooves written in 8th
  notes the same spacing covers each pair of beats. It only changes playback, and
  it is saved in links as `SwingStyle=brazilian` (older links are unchanged).
- New **Brazilian grooves** section in the Grooves menu, in 2/4 with Brazilian
  swing at 10%: Samba (hi-hat & bass drum), Samba (snare) and Samba (ride &
  cross-stick).
- Fixed: in shared links and embedded grooves, swing in time signatures other than
  4/4 (2/4, 3/4, ...) was spaced per 8th note instead of per beat. It now matches
  the editor. Grooves in 4/4 play exactly as before.
- The help page explains Brazilian swing.

## 2026-10-05 — Blues Shuffle, Train Beat in 8ths and a triplet notation fix

- New groove in the Grooves menu under triplet grooves: **Blues Shuffle**. The ride
  plays swung 8ths with the quarter notes accented, the snare ghosts every swung
  8th apart from the backbeat on 2 and 4, the kick plays all four quarter notes and
  the hi-hat foot closes on 2 and 4.
- The **Train Beat** in the Grooves menu is now written in 8th notes over 2 bars,
  so the backbeats fall on 2 and 4 instead of on the "&"s of a single 16th-note
  bar. The tempo is doubled to 190 so it plays exactly as before.
- Fixed: where a kick and the hi-hat foot land together with another note (for
  example on 2 and 4 of the Jazz Shuffle), the kick was written as a 32nd note (it
  showed up as 32nd-note triplets in the 1/8-triplet permutations). It now keeps
  its full length.

## 2026-10-04 (fifth update) — Infinity Scribe

- The app is now called **Infinity Scribe**: an INFINITY / SCRIBE wordmark
  (`images/InfinityScribe_Logo_word_stack.svg`) sits at the top left, where the
  Groove Scribe wordmark used to be. The page title is "Infinity Scribe | Infinity
  Drumming" and the link previews, footer, About page and README use the new name.
- The credits are unchanged: the footer and About page still say it is based on
  Groove Scribe by Lou Montulli and Mike Johnston, linked to the original project.
- Under the credits, the footer lists a few of the new features in Infinity Scribe,
  with the date of this update (4 October 2026).

## 2026-10-04 (fourth update) — Infinity Drumming

### Permutations

- The figures now depend on the note setting:
  - **1/16 notes:** Ostinato, Singles (1 e & a), **8th notes / Off-beat 16ths**
    (formerly "Downbeats/Upbeats", now straight after Singles and ticked by
    default), Doubles, Triples, Quads. The patterns themselves are unchanged.
  - **1/8 notes (new):** the same structure stretched over 2 beats: Singles on
    1 / & / 2 / &, Quarter notes / Off-beat 8ths, Doubles, Triples, Quads (all 8ths).
  - **1/8 triplets:** Ostinato, Singles (1 & a), Doubles, then cross-rhythms instead
    of Triples: every 2nd note (starting on 1 or &) and every 4th note (all four
    starting points: 1, &, a, 2).
  - **1/16 triplets:** the 1/8-triplet figures, each lasting an 8th note instead of
    a beat; the cross-rhythms count in 16th triplets. Plus **Singles / Doubles /
    Triples (per beat)**: figures lasting a whole beat on all 6 notes of the beat
    (the 8th-triplet notes 1, 3, 5 and the off-beats 2, 4, 6). They start unticked;
    tick a group, or single figures, to add them.
  - **1/32 notes:** the 1/16 figures, each lasting an 8th note (Singles,
    16ths / Off-beat 32nds, Doubles, Triples, Quads, with 4 starting points in the
    8th note), so the 32nd notes between the 16ths are covered; plus **Singles /
    Doubles / Triples (per beat)** on all 8 32nd notes of the beat, unticked by
    default.
- **Kick & Snare (kick lead)** and **Kick & Snare (snare lead)** in the
  Permutations menu, for every note setting: the same figures, with the hits
  alternating kick and snare starting on the lead drum (e.g. kick lead, singles on
  "1": kick on 1, snare on 2, kick on 3, snare on 4; doubles: kick then snare). The
  alternation runs through the whole bar, so triples go K S K, S K S. The hi-hat
  (and hi-hat foot notes) stay from the groove; the permutation replaces the kick
  and snare.
- **Play each ×** (1, 2, 3, 4, 6 or 8) in Permutation Options repeats every figure
  before the next one. The sheet music prints each figure once, with "play each ×N"
  next to the group name, and the play-along highlight follows the printed bar.
- Code: js/permutations.js builds the figure lists (getPermutationLayout); the
  menu, sheet music and playback all read from them. A check confirmed every
  existing 1/16 figure, "Simplify multiple kicks" bar and triplet single / double
  is identical to before.

### Auto-scroll

- While playing, the page scrolls to keep the playing bar of the sheet music in
  view (about a third of the way down the screen). It only follows while some of
  the sheet music is on screen, so it won't pull the page away from the note grid.
  On by default; **Auto-scroll** in metronome Options switches it off, and the
  browser remembers the choice.

### Tom ghost notes and accents

- Every tom line (Tom 1, Tom 2, Floor) now has **Tom Accent** and **Ghost Note** in
  its right-click menu, like the snare. Left click still adds a normal hit (and clears
  any tom note).
- Grid: an accent is a white `>` on the black circle; a ghost note is a bracketed dot.
  Notation: accents with `>`, ghost notes in brackets. Playback: same tom sound, ghost
  notes quieter (velocity 50) and accents louder (120).
- Links use the snare's letters in the tom lines: `g` ghost note, `O` accent (`o` /
  `x` are still a normal hit, so existing links open unchanged). Other copies of Groove
  Scribe don't know these letters and leave those notes out.

- Tom ghost notes play at velocity 25 (about 30% of a normal tom hit; MIDI.js volume
  is proportional to velocity). The snare keeps its own ghost-note recording.

### Ride accents

- The ride line's right-click menu has **Ride Accent**: the ride mark with a small `>`,
  a `>` over the note in the notation, and a louder ride (velocity 120).
- Links: `R` in the `R=` line. Accented rides always stay in `R=` (plain rides still go
  into `H=` where the hi-hat is silent), because older versions read `R` in `H=` as a
  plain ride; other copies of Groove Scribe leave accented rides out.

### Snare click

- Left-clicking (or ctrl-dragging over) the snare line now adds a normal snare hit
  instead of an accent. Accents are in the right-click menu and the label's
  "all Accented".

### "Groove / click bars" in links

- When the metronome option "Groove / click bars" is on, it is saved in the link as
  `&GrooveBars=4&ClickBars=4` (with your numbers), so a shared link opens with it
  already on. Links without it are unchanged; other copies of Groove Scribe ignore it.

## 2026-10-04 (third update) — Infinity Drumming

- The "full Groove Scribe" share link and the "open in Groove Scribe" link on
  embedded grooves now go to https://groove.infinitydrumming.com/ instead of
  mikeslessons.com.

## 2026-10-04 (second update) — Infinity Drumming

### Crash and ride lines

- A **CYMBALS** button (next to TOMS) shows two new lines above the hi-hat:
  - **Crash:** Crash 1 (left click), Crash 2 and Splash (right-click menu).
  - **Ride:** Ride (left click), Ride Bell, Cow Bell and Stacker (right-click
    menu); the label menu also has downbeats / upbeats.
  - Each has its own mute button. The metronome clicks stay on the hi-hat line. The lines open automatically for grooves that use them.
- Crashes and rides can now sound together with the hi-hat (e.g. a crash on
  beat 1 over a hi-hat pattern), and with each other.
- Links: wherever the hi-hat is silent, a ride or Crash 1 is still written in
  the `H=` line exactly as before (likewise a stacker), so typical ride and crash grooves still open
  fully in other copies of Groove Scribe. Only what can't go there (a cymbal on
  top of a hi-hat note, Crash 2, Splash, a crash together with a ride) goes in
  the new `C=` and `R=` lines, which other copies ignore.
  - `C=`: `c` Crash 1, `C` Crash 2, `s` Splash. `R=`: `r` Ride, `b` Ride Bell,
    `m` Cow Bell, `s` Stacker.
- Older links with crash / ride / bell / cow bell / stacker in the hi-hat line
  open with those notes on the new lines.
- Notation: Crash 2 is an x on the B above the staff, Splash an x on the high E;
  both are in the legend. Sounds: Crash 2 is General MIDI note 57 and uses the
  previously unused "22 Vintage Crash" recording; Splash is note 55, made from
  the Crash 1 recording played 1.6x faster (no splash recording exists yet).
  Both are stored as uncompressed WAV rather than MP3, because MP3 encoding adds
  about 25 ms of silence at the start and made them sound late.
  `scripts/make-cymbal-samples.mjs` rebuilds both and can take a real splash
  recording later.

### Hidden lines close up

- Hiding the toms (TOMS button) now removes their lines from the editor instead
  of leaving empty rows, the same as the CYMBALS lines. The grey separators are
  now drawn under each row, so they move with the rows.

### Metronome

- **Bar**: a new metronome setting (next to OFF / 4th / 8th / 16th) that clicks
  once per bar, on the 1. Saved in links as `MetronomeFreq=1`; older versions
  treat it as quarter notes.
- **Groove / click bars** (metronome Options): play the groove for a number of
  bars, then only the click for a number of bars, and repeat. The groove part
  always plays whole times through the groove; the click part uses the metronome
  setting (quarter notes if the metronome is off). A count-in doesn't count.
- The play-along highlight now also follows Crash 2 and Splash notes.

### Copy and paste a bar

- Every bar has copy and paste buttons under its remove button. Copy takes
  every line of the bar (including toms, cymbals, hi-hat foot and stickings);
  paste replaces another bar with it. The copy is kept in the browser, so it can
  be pasted into a different groove, and it is fitted to the other groove's note
  division (e.g. 16ths into 8ths). Undo works as usual.

## 2026-10-04 — Infinity Drumming

### Mid tom line

- With **Toms** on, the editor shows three tom lines: **Tom 1** (high), **Tom 2**
  (mid, new) and **Floor**. Tom 2 sits between Tom 1 and the snare, the same order
  as on the staff.
- Tom 2 uses Groove Scribe's existing, previously unused T2 voice: written on the
  staff line between the high tom and the snare (ABC `d`), played as General MIDI
  note 47 (low-mid tom), saved in links as `&T2=`.
- `&T2=` is only written when the groove uses the mid tom, so links for grooves
  without it are unchanged. Older versions of Groove Scribe can still open links
  that use it: they already read T2, they just have no line for it in the editor.
- Sounds, taken from the recordings already in `soundfont/NewDrumSamples`
  (OGG and MP3 soundfonts):
  - mid tom (note 47) uses the "Rack Tom" recording (~126 Hz), which was the
    high tom until now;
  - high tom (note 48) now uses the "10 Tom" recording (~154 Hz), so the three
    toms step down evenly to the floor tom (~87 Hz).
- The notation legend lists Tom 1, Tom 2 and Floor.
- Embedded GrooveDB grooves can include a `tom2Tab`.
- Credit: this follows the design of the mid tom in the
  [BenT-o fork](https://github.com/BenT-o/GrooveScribe) (by Ben, 2021: T2 voice,
  note 47, `&T2=`, high tom moved to the "10 Tom" sample). It was rewritten for the
  current code, includes the GrooveDB `tom1Tab` fix from the
  [leocaseiro fork](https://github.com/leocaseiro/GrooveScribe), and also updates
  the MP3 soundfont that Safari uses.

### Separate hi-hat foot line

- The left-foot hi-hat (hi-hat "splash"/chick) now has its own **HH foot** line
  under the kick. Clicking the kick line changes only the kick and clicking the
  HH foot line changes only the hi-hat foot, so both can be on at once.
- Each line has its own right-click menu and mute button. "HH foot #'s / &'s On"
  moved from the kick menu to the HH foot menu.
- Links are unchanged: the hi-hat foot is still stored in the kick line
  (`K=` `x` = hi-hat foot, `X` = kick + hi-hat foot), as in every earlier
  version. All existing links, including ones with the hi-hat foot on the kick
  line, open with the foot notes on the new line, and links made here still open
  in other copies of Groove Scribe. The printed notation is unchanged.

### Branding and credits

- Infinity Drumming logo (`images/InfinityDrumming_Logo.png`) in the top-left
  badge, replacing the Groove Scribe "g". The "Groove Scribe" wordmark next to it
  was removed; Groove Scribe stays credited in the page title, footer and About page.
- Page title "Groove Scribe | Infinity Drumming". The link-preview (Open Graph)
  tags now name Infinity Drumming and use the Infinity Drumming logo instead of
  MikesLessons.com. The script that pointed previews at an external groove-image
  service was removed (link-preview crawlers don't run it).
- A footer on every page, plus the About page, credits "Groove Scribe by Lou
  Montulli and Mike Johnston" (linked to the original project), states
  "Modified by Infinity Drumming" and links to this source code.
- README notes that this is a modified fork.

### Development

- `npm run serve` uses a small Node.js static server (`scripts/serve.mjs`) instead
  of Python, so it also works on Windows. Same address: http://localhost:8000.
- Unit tests added and updated for the mid tom and the hi-hat foot line.
