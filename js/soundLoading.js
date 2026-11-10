// Infinity Drumming, 2026: loading the drum sounds, and again when a try fails.
//
// MIDI.js waits for ever when the sounds don't come (a network blip, a download cut
// off, a sound that won't decode): the play button stays on its "not ready" sign and
// does nothing.  So a try that fails, or still isn't done after a while, is made
// again (three tries); then the page says the sounds didn't load, with a button to
// try again, and a tap on play tries again too.  The first try to finish wins.

var STALLED_MS = 20 * 1000; // a try not done by then has stalled
var RETRY_GAP_MS = 1000;
var TRIES = 3; // in a row, before saying so

/**
 * @param {{
 *   load: (failed: () => void) => void,
 *   gaveUp: () => void,
 *   stalledMs?: number,
 *   retryGapMs?: number,
 * }} how  `load` makes one try, calling `failed` if it sees it fail; `gaveUp` when
 *   the tries in a row have all failed.  The caller says `ready()` when the sounds are in.
 */
export function createSoundLoader(how) {
  var stalledMs = how.stalledMs || STALLED_MS;
  var retryGapMs = how.retryGapMs === undefined ? RETRY_GAP_MS : how.retryGapMs;
  var tries = 0; // every try so far (the latest is the one that counts)
  var inARow = 0; // tries since the last start or retry
  var settled = 0; // the latest try seen to fail
  var ready = false;
  var givenUp = false;
  /** @type {ReturnType<typeof setTimeout> | null} */
  var stall = null;

  function attempt() {
    if (ready) return;
    var mine = ++tries;
    inARow++;
    givenUp = false;
    if (stall) clearTimeout(stall);
    stall = setTimeout(function () {
      failed(mine);
    }, stalledMs);
    how.load(function () {
      failed(mine);
    });
  }

  function failed(which) {
    if (ready || which != tries || which == settled) return; // (an earlier try's, or said already)
    settled = which;
    if (stall) clearTimeout(stall);
    if (inARow < TRIES) {
      setTimeout(attempt, retryGapMs);
      return;
    }
    givenUp = true;
    how.gaveUp();
  }

  return {
    start: attempt,
    /** the sounds are in (from any try) */
    ready: function () {
      ready = true;
      if (stall) clearTimeout(stall);
    },
    isReady: function () {
      return ready;
    },
    /** given up: whether the page says the sounds didn't load */
    hasGivenUp: function () {
      return givenUp;
    },
    /** try again now (after giving up) */
    retry: function () {
      if (ready || !givenUp) return;
      inARow = 0;
      attempt();
    },
  };
}

/** Say the sounds didn't load (or are loading again), with a button to try again. */
export function showSoundsBar(doc, text, retry) {
  var bar = doc.getElementById('soundsBar');
  if (!bar) {
    bar = doc.createElement('div');
    bar.id = 'soundsBar';
    bar.setAttribute('role', 'status');
    doc.body.appendChild(bar);
  }
  bar.innerHTML =
    '<span>' +
    text +
    '</span>' +
    (retry ? '<button type="button" id="soundsBarButton">Try again</button>' : '');
  if (retry) doc.getElementById('soundsBarButton').addEventListener('click', retry);
}

/** The sounds are in: no more bar. */
export function hideSoundsBar(doc) {
  var bar = doc.getElementById('soundsBar');
  if (bar) bar.remove();
}
