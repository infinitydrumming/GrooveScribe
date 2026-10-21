import { test, expect } from './fixtures.js';
import { allGrooves, permutationExercises, slug, grooveUrl } from './corpus.js';
import { loadGroove, getSvg, getMidi, permutationPlayback } from './helpers.js';

// GOLDEN MASTER — the pre-refactor safety net.
//
// For every groove in the corpus (built-in library + coverage fixture) this
// renders the real app in Chromium and snapshots two outputs:
//   1. the rendered sheet-music SVG markup (real abc2svg output — the layer the
//      jsdom unit suite cannot exercise),
//   2. the generated MIDI data URL.
// On first run these snapshots are written as baselines and the tests pass;
// after a refactor, re-running compares against them. Because the app produces
// byte-identical output for a given groove on a fresh page load (verified), the
// snapshots are stable. Any diff = the refactor changed observable output.
//
// To re-baseline intentionally: `npm run test:e2e -- --update-snapshots`.

test.describe('golden master: rendered SVG + generated MIDI', () => {
  for (const g of allGrooves) {
    test(`groove ${g.name}`, async ({ page }) => {
      await loadGroove(page, grooveUrl(g.url));

      const svg = await getSvg(page);
      expect(svg, 'sheet music should render as SVG').toContain('<svg');
      expect(svg).toMatchSnapshot(`${slug(g.name)}.svg`);

      const midi = await getMidi(page);
      expect(midi.startsWith('data:audio/midi;base64,')).toBe(true);
      expect(midi).toMatchSnapshot(`${slug(g.name)}.midi.txt`);
    });
  }
});

// Infinity Drumming, 2026: permutations play from the editor (not from the groove
// data alone), so their playback is pinned down as it plays: the MIDI of the first
// rounds, and where the cursor and the grid highlight are.
test.describe('golden master: permutations (music, playback rounds, cursor)', () => {
  for (const g of permutationExercises) {
    test(`permutation ${g.name}`, async ({ page }) => {
      await loadGroove(page, grooveUrl(g.url));

      const svg = await getSvg(page);
      expect(svg, 'sheet music should render as SVG').toContain('<svg');
      expect(svg).toMatchSnapshot(`perm-${slug(g.name)}.svg`);

      const playback = await permutationPlayback(page);
      expect(playback.midi.length).toBe(4);
      expect(JSON.stringify(playback, null, 1)).toMatchSnapshot(
        `perm-${slug(g.name)}.playback.txt`
      );
    });
  }
});
