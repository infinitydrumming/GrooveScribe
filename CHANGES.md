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
