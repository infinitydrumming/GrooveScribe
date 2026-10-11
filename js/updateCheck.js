// Infinity Drumming, 2026: tell an open page when a newer Infinity Scribe is live.
//
// A phone can keep the page open (or bring it back from memory) long after a new
// version went live, and goes on running the old one.  So the page checks
// version.json when it opens and whenever it comes back into view, and if a newer
// version is live it offers to update: one tap reloads it, and the groove is kept
// because it is in the page's address.
//
// The page's own version is the "?v=" this module was loaded with (the import map
// in index.html, written by scripts/stamp-version.mjs).  Without one (an old
// browser without import maps, or the tests) it does not check.

var MIN_GAP_MS = 60 * 1000; // at most one check a minute
var FIRST_CHECK_MS = 5 * 1000; // after opening, once the page has settled

/** The version a module was loaded as ("?v=" on its address), or null. */
export function versionOf(moduleUrl) {
  return new URL(moduleUrl).searchParams.get('v');
}

/** The version that is live now (from version.json), or null if it can't be read. */
export async function liveVersion(fetchFn) {
  try {
    var response = await fetchFn('version.json?t=' + Date.now(), { cache: 'no-store' });
    if (!response.ok) return null;
    var data = await response.json();
    return data && typeof data.version == 'string' ? data.version : null;
  } catch (error) {
    console.warn('Infinity Scribe update check skipped:', error); // offline, most likely
    return null;
  }
}

/** Show the "new version" bar (once). */
export function showUpdateBar(doc, reload) {
  if (doc.getElementById('updateBar')) return;
  var bar = doc.createElement('div');
  bar.id = 'updateBar';
  bar.setAttribute('role', 'status');
  bar.innerHTML =
    '<span>A new version of Infinity Scribe is ready.</span>' +
    '<button type="button" id="updateBarButton">Update</button>' +
    '<button type="button" id="updateBarClose" aria-label="Not now">&times;</button>';
  doc.body.appendChild(bar);
  doc.getElementById('updateBarButton').addEventListener('click', reload);
  doc.getElementById('updateBarClose').addEventListener('click', function () {
    bar.remove();
  });
}

/**
 * Check for a newer version now and then: shortly after opening and whenever the
 * page comes back into view.  Returns the check function (for the tests).
 */
export function startUpdateChecks(options) {
  var opts = options || {};
  var running = opts.running !== undefined ? opts.running : versionOf(import.meta.url);
  var doc = opts.doc || document;
  var fetchFn = opts.fetchFn || fetch.bind(window);
  var reload =
    opts.reload ||
    function () {
      window.location.reload();
    };
  var lastCheck = -Infinity;

  async function check() {
    if (!running || Date.now() - lastCheck < MIN_GAP_MS) return;
    lastCheck = Date.now();
    var live = await liveVersion(fetchFn);
    if (live && live !== running) showUpdateBar(doc, reload);
  }

  if (running) {
    setTimeout(check, FIRST_CHECK_MS);
    doc.addEventListener('visibilitychange', function () {
      if (doc.visibilityState === 'visible') check();
    });
  }
  return check;
}
