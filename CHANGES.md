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
