import { coverageGrooves } from '../tests/fixtures/coverage-grooves.js';
import { grooves } from '../js/grooves.js';

// The corpus of grooves the golden-master suite renders. It combines two sources:
//   - the built-in groove library shipped in js/grooves.js (real musical content
//     shown in the app's menu), now imported directly (grooves.js is an ES module),
//   - the coverage-grooves fixture (every articulation / division / time signature
//     / swing / metronome / multi-measure combination) reused from the unit suite.
// Every entry becomes an index.html?<query> URL that renders one groove.

const CATEGORIES = [
  'Rock_Grooves',
  'Triplet_Grooves',
  'World_Grooves',
  'Brazilian_Grooves',
  'Foot_Ostinatos',
];

const builtIn = CATEGORIES.flatMap((cat) =>
  Object.entries(grooves[cat]).map(([name, url]) => ({ name: `builtin/${cat}/${name}`, url }))
);

const coverage = coverageGrooves.map((g) => ({ name: `coverage/${g.name}`, url: g.url }));

export const allGrooves = [...builtIn, ...coverage];

// Permutation exercises (Infinity Drumming, 2026), one-bar ostinatos as links
// make them: the golden master pins down their music, the MIDI of their first
// rounds and where the cursor and the grid highlight are as they play.
const PER_BEAT_SINGLES_24 = '0' + '1'.repeat(7) + '0'.repeat(57) + '1'.repeat(16); // 1/16 triplets
export const permutationExercises = [
  {
    name: 'kick 16ths, Ollie routine',
    url:
      '?TimeSig=4/4&Div=16&Title=16th%20Note%20Kick%20Perms%20-%20Ollie%27s%20routine&Tempo=80' +
      '&Measures=1&MetronomeFreq=1&GrooveBars=2&ClickBars=2&Count=rhythm&Practice=120b' +
      '&Perm=kick_16ths&PermSet=001111111111111111111&PlayEach=4&SpeedUp=11,60b,to110&CountIn=1' +
      '&H=|x-x-x-x-x-x-x-x-|&S=|----O-------O---|&K=|o-------o-------|',
  },
  {
    name: 'kick 16ths fat back, simplified, swung, hi-hat foot, ghost notes, play each 2',
    url:
      '?TimeSig=4/4&Div=16&Tempo=90&Swing=30&Measures=1&Perm=kick_16ths' +
      '&PermSet=111111111111111111111&PlayEach=2&FatBack=1' +
      '&H=|x-x-x-x-x-x-x-x-|&S=|--g-O--g--g-O---|&K=|x---x---x---x---|',
  },
  {
    name: 'snare 16ths accent grid, bars 3-6, play each 3, bold count',
    url:
      '?TimeSig=4/4&Div=16&Tempo=70&Measures=1&Count=bold&Perm=snare_16ths' +
      '&PermSet=101111111111111111110&PlayEach=3&PermBars=3-6' +
      '&H=|x-x-x-x-x-x-x-x-|&S=|----O-------O---|&K=|o-------o-o-----|',
  },
  {
    name: 'kick and snare 8ths kick lead, hi-hat muted, straight in a swing',
    url:
      '?TimeSig=4/4&Div=8&Tempo=100&Swing=40&StraightBars=1&Measures=1&Mute=hh:1' +
      '&Perm=kick_snare_kick_lead&H=|xxxxxxxx|&S=|--O---O-|&K=|o---o---|',
  },
  {
    name: 'kick 16th triplets, singles per beat, the click counted',
    url:
      '?TimeSig=4/4&Div=24&Tempo=70&Measures=1&MetronomeFreq=4&Count=click&Perm=kick_16ths' +
      '&PermSet=' +
      PER_BEAT_SINGLES_24 +
      '&H=|x-x-x-x-x-x-x-x-x-x-x-x-|&S=|------O-----------O-----|&K=|o-----------o-----------|',
  },
  {
    name: 'snare 8th triplets, groove 3 click 1, play each 3',
    url:
      '?TimeSig=4/4&Div=12&Tempo=80&Measures=1&MetronomeFreq=4&GrooveBars=3&ClickBars=1' +
      '&Perm=snare_16ths&PlayEach=3&H=|x--x--x--x--|&S=|------------|&K=|o-----o-----|',
  },
  {
    name: 'kick 32nds',
    url:
      '?TimeSig=4/4&Div=32&Tempo=60&Measures=1&Perm=kick_16ths' +
      '&H=|x---x---x---x---x---x---x---x---|&S=|--------O---------------O-------|' +
      '&K=|o---------------o---------------|',
  },
  {
    name: 'kick and snare 16ths snare lead, toms in the ostinato, ghosts counted',
    url:
      '?TimeSig=4/4&Div=16&Tempo=85&Measures=1&Count=ghosts&Perm=kick_snare_snare_lead&PlayEach=2' +
      '&H=|x-x-x-x-x-x-x-x-|&S=|----------------|&K=|----------------|' +
      '&T1=|------------o---|&T4=|--------------o-|',
  },
];

// A filesystem-safe slug for snapshot filenames.
export function slug(name) {
  // The first replace collapses each run of non-alphanumerics to a single "_",
  // so trimming a single leading/trailing "_" is enough (no "+" needed).
  return name.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
}

// Build a navigable app URL from a groove query string. Only spaces are encoded
// (some built-in groove titles contain raw spaces); characters like `|`, `&`, `=`
// are left intact because the app reads them verbatim from location.search and
// Chromium accepts them in navigation.
export function grooveUrl(query) {
  const q = query.startsWith('?') ? query : `?${query}`;
  return '/index.html' + q.replace(/ /g, '%20');
}
