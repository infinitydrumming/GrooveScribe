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

## 2026-10-05 — Blues Shuffle and a triplet notation fix

- New groove in the Grooves menu under triplet grooves: **Blues Shuffle**. The ride
  plays swung 8ths with the quarter notes accented, the snare ghosts every swung
  8th apart from the backbeat on 2 and 4, the kick plays all four quarter notes and
  the hi-hat foot closes on 2 and 4.
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
