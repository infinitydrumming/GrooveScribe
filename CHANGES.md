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

## 2026-10-22 — Copying some notes

- Hold Shift (or ⌘ on a Mac) and drag a box over the grid to select notes: any
  lines, any notes, in one bar or across bars. Ctrl / ⌘ + C (or the Copy button
  of the bar that appears) copies them; a Shift-click picks the note where the
  copy starts and Ctrl / ⌘ + V (or Paste) puts it there, in its own lines,
  replacing what's there (rests included, with accents, flams and diddles) and
  keeping its shape across bars; other lines stay. One undo takes it back. On
  touch screens a **Select** button (next to Articulations) makes a finger do
  the same: drag, Copy, tap where, Paste, Done. Shift because Ctrl + moving over
  notes already turns them on (an original shortcut, kept). The copying and
  pasting are in the new `js/noteBlocks.js` (the kick line holds the kick and the
  hi-hat foot rows, kept apart); `js/groove_writer.js`, `js/main.js`,
  `index.html`, `css/infinity_layout.css`, `gscribe_help.html`.

## 2026-10-22 — The Alphabet

- Infinity Drumming's students know the permutations as the Alphabet, so that's
  what the app calls them: the header button ("ABC Alphabet"), its menu ("Kick
  Alphabet", "Snare Alphabet"), the options panel ("Alphabet Options"), its
  messages, the Save & Share note and the help, whose section is "The Alphabet
  (permutations)". Links and the code keep "permutation" (`Perm=...`), so every
  link opens as before (`index.html`, `js/viewHtml.js`, `js/groove_writer.js`,
  `gscribe_help.html`).

## 2026-10-22 — Typing a tempo, tempo changes while playing, the rep counter

- The BPM number in the play bar looks like the box it is: tap it and type a
  tempo (a number keypad on phones; Enter or Done sets it, Esc puts it back). It
  keeps to the slider's 30-300; anything that isn't a number puts the tempo
  back (letters used to send it to 165, and 500 showed 500 at 300 bpm)
  (`js/groove_utils.js`, `css/infinity_layout.css`).
- A tempo change while playing is heard from the next bar line. Each time round
  plays from one MIDI file, and a whole permutation run is one round, so a new
  tempo used to wait for the run to end (minutes). Now, once the slider or the box
  settles, the round is built again at the new tempo and just after the last note
  before the next bar line the player carries on in it from the same place: no
  note is cut, played twice or moved but those after the line (the sums are in
  the new `js/tempoSwitch.js`; `js/groove_utils.js`, `js/groove_writer.js`). The
  count-in and the practice timer's last round take it when they end, as before.
- Permutations: **Play each** goes up to ×16 (it was 1, 2, 3, 4, 6, 8; links
  already allowed 16), and a **Rep counter** switch next to it shows, just above
  the play bar while the permutation plays, the bar of the music and the time
  through it ("Bar 7 · Rep 2 of 4", "· ostinato 2/3" over a multi-bar ostinato).
  The device remembers the switch; it isn't one of the figures' ticks, so links
  are unchanged (`js/viewHtml.js`, `js/groove_writer.js`, `gscribe_help.html`).

## 2026-10-22 — Save & Share on phones

- The pop-ups (Save & Share, the time signature, speed-up, practice timer,
  groove / click bars, flams, cursor timing and title boxes) end at the bottom
  of the screen and scroll inside when they hold more: on a phone the bottom of
  Save & Share (Save to My Grooves, WhatsApp, Email, Print, MIDI) was off the
  screen with no way to reach it. On phones and short screens Save & Share
  opens just below the header, over the toolbar, to show more of it at once
  (`css/infinity_layout.css`).

## 2026-10-21 — Permutations in more time signatures; 5-bar ostinatos

- Permutations work outside 4/4 where the figures fit the beats: x/4 bars
  (2/4, 3/4, 5/4, 7/4...) in 1/16 notes, 1/32 notes and both triplet settings,
  the 4/4 figures beat by beat, and in 1/8 notes with an even number of beats
  (the 1/8 figures last two beats); compound x/8 bars (3/8, 6/8, 9/8, 12/8,
  15/8) in 1/8 and 1/16 notes, with the 1/8 and 1/16 triplet figures over each
  dotted-quarter beat (the 1/8 ones named by the x/8 count: "Singles on 2").
  The cross-rhythms (every 2nd / 4th note) are only there when they come round
  evenly in the bar. 5/8, 7/8 and other bars of uneven beats, x/16 and mixed
  time signatures have none, and the Permutations button stays dimmed there.
  "Simplify multiple kicks" stays a 4/4 option (`js/permutations.js`,
  `js/groove_writer.js`).
- A permutation's swing goes by the bar's 16ths (12 in 3/4) as a groove's does,
  rather than 16 a bar; changing to a time signature with the same figures
  keeps the ticked figures (a bar added to the ostinato already did). If
  abc2svg can't write out a very long run, the page says so instead of
  breaking, and it still plays.
- The ostinato can be up to 5 bars (was 4): room for 5-note groupings to come
  round over the bar lines in 16ths.
- 4/4 permutations play and look exactly as before (the golden master's
  permutation exercises are unchanged); six more pin down a 5-bar ostinato and
  permutations in 3/4, 6/8, 12/8, 5/4 and 2/4 (`tests-e2e/`).
- Older links open exactly as before: a link's ostinato is in it as
  `Ostinato=2` (written past one bar only), and a permutation link without it
  plays bar 1 and closes any other bars, as before October 2026 (a bar added
  after choosing a permutation used to be left out). Over 50 links of the kinds
  the live version writes (every permutation, note setting and practice
  setting, Ollie's routine among them) open the same in both versions: the
  same link, music, playback, cursor and options (`js/practiceSettings.js`,
  `js/groove_writer.js`).

## 2026-10-21 — Permutations over a multi-bar ostinato

- A permutation plays over the groove's first bars, up to 4 (its ostinato),
  instead of bar 1 only: every figure over each bar of it, and **Play each**
  counts the times through the ostinato (×2 with a 2-bar ostinato gives each
  figure 4 bars). Choosing a permutation closes the bars after the 4th (it
  used to close all but the first), and with a permutation on no bar can be
  added past the 4th.
- The music writes each figure once over the ostinato's bars, each bar
  numbered with its figure (the number "Practise bars" takes); the sound, the
  cursor, the grid's highlight, groove / click bars, the practice timer and
  the speed-up follow the run bar by bar. Each bar keeps its swing / straight
  switch and muted lines, and fat back follows each bar's snare
  (`js/groove_writer.js`, `js/permutations.js`, `gscribe_help.html`).
- One-bar permutations play and look exactly as before. The golden master
  now covers permutations: eight exercises (Ollie's routine among them) pin
  down their music, the MIDI of their first rounds and where the cursor and
  the grid's highlight are, before and after; three more do the same for
  ostinatos of 2, 3 and 4 bars (`tests-e2e/`).
- Long music goes on the page much faster (a 4-bar ostinato with every 1/16
  triplet figure: 0.9 s instead of 12 s on a desktop). In "fullsvg" mode the
  bundled abc2svg writes every earlier line's glyph definitions (note heads,
  accents, clefs) again in each line, so the page held thousands of copies;
  the editor now puts each on the page once. A <use> took the first copy
  anyway, so the music is drawn exactly as before: of the golden master's 172
  snapshots, 18 changed, each to its old self minus the copies, and drawn pixel
  for pixel the same (`js/abcNotation.js`, `js/groove_writer.js`).

## 2026-10-21 — Fat back kick permutations

- **Fat back** in a kick permutation's options: every figure leaves the backbeat
  to the snare, with no kick wherever the groove's snare plays (normally 2 and
  4; its ghost notes aside, so kicks under them stay). The headings over the
  figures say "fat back". Saved in links as `FatBack=1`, its own setting, so
  the ticks of the figures (`PermSet`) and older links are as before
  (`js/permutations.js`, `js/groove_writer.js`, `js/viewHtml.js`,
  `js/practiceSettings.js`).
- The help's Permutations section is shown (since the original Groove Scribe
  it was hidden in an HTML comment, with the notes on practising some bars and
  on 1/16 triplets), with fat back, Simplify multiple kicks and Use Accent Grid
  (`gscribe_help.html`).

## 2026-10-21 — A copy of a bar right after it; copy and paste between windows

- **Add a copy** under every bar puts the bar again right after itself,
  wherever it is in the groove, with its time signature, swing / straight
  switch, beats and muted lines; the bars after it move along one. It is one
  step of undo (`js/groove_writer.js`, `js/viewHtml.js`,
  `css/infinity_layout.css`, `css/groove_writer_orange.css`,
  `gscribe_help.html`).
- A copied bar also goes on the device's clipboard (as "Infinity Scribe bar"
  and its data), so it pastes in any window: another browser, the home-screen
  app, a private tab, or the site's other address, each of which keeps its
  own storage, so pasting there had nothing to paste. A paste takes the newer
  of the clipboard's bar and this window's own copy, and uses its own copy
  when the clipboard can't be read (`js/groove_writer.js`).
- Muted lines stay with their bars when a bar is added, removed, copied or
  pasted (laying the grid out again used to unmute every bar), and each of
  those is one change of the link (`js/groove_writer.js`).

## 2026-10-21 — Dense bars one to a line on a phone; every count in triplet beats

- Two bars go on a line of music only when they fit (a note needs about 8px,
  10 with the count over it, a tenth more in triplets): on a phone, bars of
  16th triplets (and counted 16ths) now go one to a line instead of being
  squeezed until abc2svg broke them in the middle, losing their beams. A bar
  too wide even alone is drawn a little smaller, and if abc2svg still breaks a
  line in the middle of a bar the editor draws it wider (smaller) again. A
  desktop's lines are as before (`js/abcNotation.js`, `js/groove_writer.js`,
  `js/permutations.js`, `js/countModes.js`).
- "Every note" and the bold counts in 1/8 and 1/16 triplets count every note of
  a beat the music writes as a plain quarter, 8ths or 16ths ("2 a li & a la",
  not "2 &"): the counts are laid over the beat as written, as the click's
  count is (`js/abcNotation.js`, `js/countModes.js`).

## 2026-10-21 — The click's count keeps to the bars in triplet grooves

- In 1/8 and 1/16 triplets the music writes a beat of plain notes (a quarter,
  8ths, 16ths) shorter than a triplet beat, so "Count: the click" (which took
  every beat as a triplet beat) drifted out of the bars, most of all in
  permutations. The count is now written over each beat as the music writer
  laid it out, with its click syllables placed in that beat
  (`js/countModes.js`, `js/abcNotation.js`).

## 2026-10-21 — 32nd notes counted "1 a li bi & a la ba"

- 32nd notes are counted "1 a li bi & a la ba" (short for "1 ah lee bee & ah
  lah bah"), in smaller letters (11px; bold counts 14px and 11px), so a bar of
  them fits on one line on a phone instead of breaking in the middle of beat 3
  (`js/noteArrays.js`, `js/countModes.js`, `js/abcNotation.js`,
  `js/groove_writer.js`, `js/groove_utils.js`, `gscribe_help.html`).

## 2026-10-21 — Count: bold with ghosts; the click's count fixed in triplets

- **The click** count in 1/16 or 1/8 triplets (and permutations of them, where on
  a phone the music stopped redrawing and kept an old count) lines up with the
  notes: triplet bars are written half as long again, and the count now is too,
  with a (hidden) note on every note of the grid as the other counts have
  (`js/countModes.js`, `js/abcNotation.js`).

- **Bold with ghosts** in the Count menu: as "rhythm in bold", with ghost notes
  in bold too (the hi-hat / ride ostinato stays small and grey). Saved in links
  as Count=ghosts (`js/countModes.js`, `js/abcNotation.js`, `index.html`,
  `gscribe_help.html`).

## 2026-10-21 — Counting choices: every note, rhythm in bold, rhythm only, the click

- The **Count** menu (next to Click) replaces the Counting switch:
  - **Every note**: as the switch counted, each note of the note setting.
  - **Rhythm in bold**: every note, with the rhythm in bold and the rest small and
    grey. The rhythm is the kick, snare and toms (not ghost notes) and any accent;
    the hi-hat, crash and ride lines and the hi-hat foot are the ostinato. In a
    permutation, only the permuted line.
  - **Rhythm only**: just where something plays (every line), with the beat
    numbers always there, in brackets when nothing plays on them ("(3)").
  - **The click**: what the click plays, in its own subdivision ("1 & a" for
    triplets, "1 a li & a la" for sextuplets, "1 a" for swung 8ths, the beats
    when it is off), over any groove; it follows the click as it changes and
    replaces the stickings.
    Saved in links as Count=1 (every note), Count=bold, Count=rhythm or
    Count=click (`js/countModes.js`, `js/abcNotation.js`, `js/groove_writer.js`,
    `js/urlSerialization.js`, `js/grooveData.js`, `js/groove_utils.js`,
    `index.html`, `css/infinity_layout.css`, `gscribe_help.html`).

## 2026-10-21 — 1/16 triplets counted "1 a li & a la"

- Counting in 1/16 triplets (and 1/16-triplet beats in the Mixed setting) says
  each note of the beat, "1 a li & a la" (short for "1 ah lee & ah la"), instead
  of "1 & a 1 & a", which said the beat's number twice (`js/noteArrays.js`,
  `js/beatNotes.js`).

## 2026-10-21 — Every 1/16 triplet figure in the permutations

- In 1/16 triplets the permutation has every rhythm of hits on the 6 notes of a
  beat. New whole-beat figures, each on all 6 starting notes: **Single, gap,
  single**, **Double, gap, single**, **Double, 2 gaps, single** (which also gives
  single, gap, double), **Triple, gap, single**, **Quads**, **Fives** and **All
  six**. The list now runs from the whole-beat figures, a hit more at a time
  (each core figure followed by its "+ single" forms), to the ones that repeat
  inside the beat: **Singles / Doubles (twice a beat)**, then the cross-rhythms.
  The new figures start unticked, so a run with the menu's own ticks plays as
  before, and links made before keep their ticks (`js/permutations.js`,
  `js/groove_writer.js`, `gscribe_help.html`).

## 2026-10-21 — "Practise bars" follows as you type

- The permutation's **Practise bars** box takes effect as you type (once typing
  pauses for a moment), so emptying it brings the whole run back without pressing
  Enter; Enter or leaving the box still tidies it ("7-8,5" becomes "5, 7-8")
  (`js/groove_writer.js`, `js/viewHtml.js`).

## 2026-10-21 — Practise just some bars of a permutation

- A permutation's bars are numbered in the music, and **Practise bars** in the
  Permutation Options plays just the ones typed: "5", "3-6" or "2, 5, 9-10". The
  music shows only those, with their numbers in the whole run (the music's first
  bar, which has no bar number, says it in its heading). "Play each", the
  speed-up, the practice timer and groove / click bars all count just those bars.
  Saved in links as "PermBars" (`js/permutations.js`, `js/groove_writer.js`,
  `js/viewHtml.js`, `js/abcNotation.js`, `js/practiceSettings.js`,
  `css/infinity_layout.css`, `gscribe_help.html`).

## 2026-10-21 — Rim clicks on the toms

- Each tom's note menu has **Rim Click**: an x notehead on that tom's line in the
  music, an x in the tom's circle on the grid, and the cross-stick sound. In a link
  it is an "r" on the tom's line ("x" there stays a plain tom hit, as in older
  links). The rim click notes are written "_e", "_d", "_B", "_A" so they share no
  pitch with another drum's x notehead ("^d" would be the cow bell's "^D'")
  (`js/constants.js`, `js/abcNotation.js`, `js/noteArrays.js`, `js/gridState.js`,
  `js/groove_writer.js`, `js/midiFile.js`, `js/viewHtml.js`, `index.html`,
  `css/groove_writer_orange.css`, `gscribe_help.html`).

## 2026-10-20 — Speed up every so many bars: any number up to 999

- The speed-up's "every so many bars" is a box to type in, from 1 to 999 bars
  (was a slider from 4 to 64 in 4s), so it can wait for a whole permutation run,
  112 bars for example (`index.html`, `css/groove_writer_orange.css`,
  `js/groove_writer.js`, `js/practiceSettings.js`).

## 2026-10-20 — Send a whole exercise in a link

- A groove's link can carry its **practice settings**: the permutation (which
  figures are ticked, "Play each"), the auto speed-up (amount, every so many
  minutes or bars, only once, "Stop at"), count-in, the click's Solo and offset
  start, and muted lines, alongside the practice timer and groove / click bars it
  already carried. Only settings that are on go into the link, so plain grooves'
  links are unchanged, and older links open as before (`js/practiceSettings.js`,
  `js/urlSerialization.js`, `js/grooveData.js`, `js/groove_writer.js`).
- **Save & Share** has a clear **Include practice settings** box, ticked to start
  with; unticked, the shared link has just the groove. The address bar (and so
  undo and My Grooves) always keeps the settings (`index.html`,
  `css/infinity_layout.css`).
- An **Instructions** box in Save & Share: what the student should do. They go in
  the link and show in a card at the top of the page when it opens (as plain text),
  and print with the music.
- Changing one of these settings now updates the address bar straight away, like
  the notes, so undo never switches a setting off by surprise.

## 2026-10-16 — Up to 32 bars, and long grooves open faster

- A groove can have up to **32 bars** (was 10). Before, the editor let you add more
  bars than a link could hold, and a shared link quietly dropped the rest. Now
  the add-bar button gives way to a note at 32 bars (`js/constants.js`,
  `js/viewHtml.js`, `js/groove_writer.js`, `css/infinity_layout.css`).
- Long grooves open much faster: reading the grid back asked the whole page
  whether the tom, cymbal and sticking lines were shown for every single note; it
  now asks once. An 11-bar Mixed groove opens in about 1 second instead of 6
  (`js/groove_writer.js`).

## 2026-10-16 — Swing in the Mixed note setting

- Grooves in the **Mixed** note setting (notes beat by beat) can be swung: the
  swing slider no longer says "N/A". Beats of 8ths and 16ths swing exactly as
  the 8ths and 16ths settings do, regular or Brazilian; triplet and
  quarter-note-triplet beats play as written. Straight bars stay straight
  (`js/midiFile.js`, `js/groove_utils.js`, `gscribe_help.html`).

## 2026-10-15 — Heard on an iPhone set to silent

- On an iPhone with the ring/silent switch on silent, a groove played without a
  sound: Safari treats a web page's sound like a notification's. While a groove
  plays, Infinity Scribe now tells the browser it is music playback, so it is
  heard like a music app, silent switch or not (iOS 17 and later). Like a music
  app, pressing play pauses music playing in another app. When the groove stops
  the page goes back to the browser's default (`js/audioSession.js`,
  `js/groove_utils.js`).

## 2026-10-15 — Swing in 6/4

- Swing works in 6/4 grooves of 8ths or 16ths (and any bar of 12 or 24 notes
  that isn't triplets). When a groove opened, swing was allowed or not by how
  many notes a bar has, and 12 and 24 are the triplet counts, so those grooves
  showed "N/A" and played straight. It now goes by the note setting, as it does
  when the setting is changed (`js/groove_writer.js`, `js/groove_display.js`).

## 2026-10-13 — Shared links always open Infinity Scribe

- **Save & Share** no longer makes the original Groove Scribe's `gscribe.com`
  short links. They went through a Google link service that has shut down, and
  on iPhones they could open the original Groove Scribe instead of Infinity
  Scribe, so a groove's click bars went silent there. Share now gives the full
  Infinity Scribe link, or our own short link once the site is hosted with them;
  the "Short link" box is hidden while there are none (`js/groove_writer.js`).

## 2026-10-13 — The row of beats lines up with its notes

- Each beat's band in the row of beats now sits exactly over that beat's notes.
  The note rows leave a small space after every cell and the row of beats
  didn't, so the bands drifted left beat by beat, most in long bars like 6/8 and
  7/8 (`js/viewHtml.js`, `css/infinity_layout.css`).

## 2026-10-13 — Auto-scroll follows a repeat back to the start

- When a permutation (or any long groove) repeats and the cursor jumps back to
  the first bar, auto-scroll now scrolls back up to it. It used to check only
  the line of music the cursor was on, which was off screen by then, so it
  stayed put (`js/groove_utils.js`).

## 2026-10-12 — Diddles, more clicks, notes beat by beat, triplets in x/8, 32nd counts

- **Diddles (double strokes)** on every drum and cymbal: a note's menu has
  "Diddle (double stroke)", which plays the note as two strokes, each half as
  long as the note setting's notes (two 32nds for a 16th note, two 16th
  triplets for an 8th-note triplet); an accented note's second stroke is
  unaccented. The music shows one slash through the note's stem, written on a
  note exactly one grid note long so the slash always means double speed, and
  the grid a red slash on the note. A diddle rides in the note's ABC token
  ("!/!", `js/ornaments.js`), so it goes wherever notes go (bars, copy / paste,
  permutations, undo); links carry it on lines of its own (`SD`, `HD`, `KD`,
  `T1D`... with `d` on a note; `js/urlSerialization.js`); the second stroke is
  scheduled at its exact time (`js/midiFile.js`), and the music written by
  `js/abcNotation.js`.
- **More clicks**: the Click menu, now on every screen, adds triplets (3 a beat),
  sextuplets (6 a beat), swung 8ths, swung 16ths and dotted quarter notes for
  6/8 and 12/8. They are timed exactly, so they fit any groove, straight or
  triplet (`js/metronome.js`; `MetronomeFreq=12`, `24`, `8s`, `16s`, `4d` in
  links). The app never wrote `MetronomeFreq=12` before; it now means triplets.
- **Notes beat by beat**: a row of beats over each bar; tapping a beat chooses
  its notes: 8ths, 16ths, 8th triplets, 16th triplets, quarter-note triplets
  (over that beat and the next) or 32nd-note triplets, and in x/8 bars one 8th,
  two 16ths, a 16th-note triplet or 8th-note triplets over two 8th notes. The
  groove changes to the Mixed note setting; the grid shows only the notes each
  beat uses, and the music, sound, cursor and counting follow
  (`js/beatNotes.js`, `js/groove_writer.js`, `js/viewHtml.js`). Links carry
  each bar's beats (`Beats=ssqq,ssss`); older Mixed links get them from their
  notes. When every beat is the same again the groove goes back to that note
  setting. Copy / paste, adding and removing bars, bar time signatures and
  undo keep them. A beat of 8ths or 16ths is written and counted exactly as
  in the 8ths and 16ths settings (so older Mixed links now write, say, an 8th
  note where they wrote a 16th and a 16th rest). Mixed no longer shows a
  notice when chosen.
- **Triplets in x/8 time**: 16th triplets (and Mixed) in every x/8 bar, each
  8th note a group, beamed in the bar's classic groups (2+2+3 in 7/8); 8th
  triplets, three over every two 8th notes, in bars of whole quarter notes
  (6/8, 12/8...), counted "1 a & 3 a &" (`js/barMeters.js`,
  `js/abcNotation.js`, `js/noteArrays.js`).
- **32nd notes are counted "1 ah lee bee & ah lah bah"** (`js/noteArrays.js`).
- A menu opened near the bottom of a short screen stays wholly on it
  (`js/groove_utils.js`).

## 2026-10-11 — "Advanced Edit" is now "Articulations"

- The touch-screen button that makes a tap open a note's menu (accent, ghost
  note, open hi-hat, flam...) instead of turning the note on or off is now
  called **Articulations**, with a tooltip saying what it does (`js/main.js`);
  the help page explains it, and press and hold (`gscribe_help.html`).

## 2026-10-11 — Tap a menu's button again to close it; "ABC" permutations button

- Tapping the button that opened a menu closes it again: Grooves, Permutations,
  Help, the click's "..." options, Stickings, Download, the instrument labels and
  the note menus (`toggleContextMenu` in `js/groove_utils.js`), and the Save &
  Share and time signature panels (`js/groove_writer.js`). Tapping another
  button or note still switches straight to its menu.
- The permutations button's icon is now "ABC" (`index.html`), and the header's
  buttons sit a little closer on phones so it fits narrow ones
  (`css/infinity_layout.css`).

## 2026-10-11 — Phones get new versions straight away

- Every file the app page loads now carries the release version in its address
  (`?v=...`; the modules through an import map in `index.html`), so a phone never
  mixes files kept from an older version with a new one, and loads the new files
  as soon as it has the new page. `npm run stamp` (`scripts/stamp-version.mjs`)
  writes the version on `index.html` and in `version.json` for each release;
  `tests/version.test.js` checks they agree.
- A page left open checks `version.json` when it opens and whenever it comes back
  into view; if a newer version is live it shows "A new version of Infinity
  Scribe is ready" with an **Update** button, which reloads the page (the groove
  is kept: it is in the page's address) (`js/updateCheck.js`).

## 2026-10-11 — Phone toolbar fits on every phone

- On a phone held upright the toolbar's rows could be cut off at the top and
  bottom (narrower phones, and the touch-only "Advanced Edit" button made a
  third row). The toolbar now grows to fit its rows and the page below follows
  it (`js/main.js`); the rows keep a fixed order (time, notes, click; then the
  click's options, counting and the view switches); the selectors are as wide as
  the choice they show; and on phones "Student view" / "Advanced Edit" read
  "Student" / "Advanced" (`css/infinity_layout.css`).

## 2026-10-09 — Notes and Click selectors on phones

- On phones and narrow windows the rows of Notes buttons (8ths, 16ths, ...) and
  Metronome buttons (Off, Bar, 4th, ...) no longer scroll sideways: they are two
  selectors, "Notes: 16ths" and "Click: 4ths" (with a metronome icon), and the
  click's extra options are a "..." button. The toolbar takes two rows, with
  Counting and the Edit / Student view on the second. Desktop is unchanged
  (`index.html`, `css/infinity_layout.css`, `syncToolbarSelects` in `js/groove_writer.js`).

## 2026-10-09 — "Swing" / "Straight" above the counts

- With counting (or stickings) over the music, the "Swing" / "Straight" markings
  sat between the counts and the music, pushing some counts up out of line and
  spacing out the bar's first beat. They now go above the counts, on an invisible
  bar line at the start of the stickings voice (`addFeelMarking` in
  `js/abcNotation.js`). Without counts or stickings nothing changes.

## 2026-10-09 — phones: menus on screen, landscape

- Menus (Grooves, Help, Permutations, …) are kept fully on the screen; on a
  phone they used to open partly off the left edge.
- The swing slider shows on phones too: on its own line in the play bar on an
  upright phone, beside the tempo on a phone on its side (it was hidden on
  narrow screens).
- The "New in Infinity Scribe" feature list under the grid is gone (it took a lot
  of room); what's new is in the help page and in this file.
- "Total Play Time … repetitions" is a small badge just above the play bar (it
  sat on top of the credits); phones leave it out, the play bar has the time.
- Phone on its side (screens under 520px tall): the header and toolbar scroll away
  with the page, the play bar is slimmer and the credits come at the end, so the
  music and grid get nearly all the height.

## 2026-10-09 — our own short links (ready for Cloudflare Pages)

- New `functions/api/shorten.js` and `functions/s/[code].js`, Cloudflare Pages
  functions: **Save & Share** makes short links like
  `scribe.infinitydrumming.com/s/Ab3kP9xy`, kept in a KV namespace (`SHORT_LINKS`).
  The code comes from the groove's own link (the same groove always gets the same
  short link); only Infinity Scribe groove links are accepted; nothing about the
  person is stored. Tested on Cloudflare's local runtime (wrangler) and in
  `tests/shortLinks.test.js`.
- The app tries these first and falls back to the original Groove Scribe short
  links when they aren't there (GitHub Pages).
- Setting it up: `docs/CLOUDFLARE_SETUP.md`.

## 2026-10-09 — new layout, Save & Share, My Grooves, student view

- New `css/infinity_layout.css` (index.html only; the embed pages keep their look):
  a header (logo, Grooves, Permutations, Help, Undo, **Save & Share**), one
  toolbar (time signature, note setting, metronome, counting, view), the content
  as cards, the play bar pinned to the bottom of the window, and the credits in a
  small strip under it. Every control keeps its id and job. The music area is as
  wide as before, so the golden-master sheet music and MIDI are unchanged; the
  two whole-page smoke screenshots change.
- Bars wrap onto the next line when they don't fit (they used to run off the right
  of the screen). Each bar is a card headed "Bar 1", "Bar 2"... with its time
  signature, swing, copy, paste and remove buttons along the top. Notes that are on
  show in each drum's colour (hi-hat blue, snare amber, kick navy) by CSS over the
  editor's own black, which it still reads back.
- The groove's title, author and comment show in the header; clicking them opens
  a "Groove details" box with the Title, Author and Comment fields and the key
  switch (same ids), so they no longer sit between the music and the grid.
- The view switch is now **Student view** / **Edit**.
- **Save & Share** panel (the old share pop-up, same ids): "Your groove is saved
  in this link", Copy link, short link and embed code, **Save to My Grooves**,
  WhatsApp, Email, Print / PDF, MIDI file.
- New `js/myGrooves.js`: **My Grooves**, grooves saved in this browser's local
  storage, listed at the top of the Grooves menu.
- index.html now has a phone `viewport` setting, so phones get the narrow layout
  (icon-only header, scrolling toolbar, the grid scrolling sideways in its card)
  instead of a shrunken desktop page.

## 2026-10-09 — counting over the notes

- A **COUNTING** button writes the count over the notes ("1 e & a", "1 &", "1 & a"
  in triplets, "1 2 3" in 8th-note x/8 bars) using the stickings line's existing
  count symbol. A beat that has stickings keeps just its stickings. Links carry it
  as `Count=1`; it is off by default, so existing grooves are unchanged.
  (`addCounting` in `js/abcNotation.js`, `GrooveUtils.showCounts`.)

## 2026-10-09 — practice timer, and speed-up every so many bars

- New `js/practiceTimer.js`. **Practice timer** (Metronome Options): stop after a
  number of minutes or bars. Links carry it as `Practice=10m` or `Practice=16b`.
  The player shows what is left ("4:12 left", "12 bars left") and "Done!".
- Playback goes round a set of bars (the groove, a permutation, or a groove /
  click cycle), built again before each time round. When the practice ends inside
  the next time round, only its bars up to the end are built, then a crash and a
  kick on the next 1, so it stops right on the bar line (a minutes timer finishes
  the bar the time runs out in). `GrooveUtils.stopAtEndOfRound` stops the player
  at the end of that file.
- **Auto speed up** can step every so many bars (4 to 64) instead of minutes, e.g.
  5 bpm every 16 bars; "Keep increasing" and "Stop at" work as before. The minutes
  setting is unchanged.

## 2026-10-09 — Infinity Scribe icon

- New browser-tab, bookmark and home-screen icon: a navy "iS" with a white i and an
  amber S (`images/iscribe-icon-32/96/192/512.png`,
  `images/iscribe-apple-touch-icon.png`), in place of the GrooveScribe "g", on the
  app, help and about pages. The original icons stay in `images/`.

## 2026-10-09 — exact tempo

- Swung, triplet and Brazilian-swing grooves played about 1.5% fast: the MIDI
  library drops the fraction of every delta time (a triplet note is 10.67 ticks,
  written as 10). MIDI tracks are now made by `newExactTimeTrack()` in
  `js/midiFile.js`, which carries each fraction over to the next event, and a
  triplet note is exactly 128 / 12 ticks.
- Every bar after the first also lost one tick (the player's opening blank tick
  was taken back from every bar, not just the bar that added it), about 0.2% fast
  on any groove of more than one bar.
- Every bar now plays for exactly its own length (512 ticks for 4/4). The
  golden-master MIDI changed only in timing: the same notes, drums and volumes,
  each at most a few ticks later (`tests/groove_utils/tempo-accuracy.test.js`).

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
