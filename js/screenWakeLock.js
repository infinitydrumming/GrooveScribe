// Infinity Drumming, 2026: keep a phone or tablet screen from going to sleep
// while a groove is playing, using the Screen Wake Lock API where the browser
// has it (it does nothing elsewhere). The browser drops the lock whenever the
// page is hidden, so it is asked for again when the page comes back into view.

/**
 * @param {any} [nav] the navigator (injected for tests)
 * @param {any} [doc] the document (injected for tests)
 */
export function createScreenWakeLock(nav, doc) {
  nav = nav || (typeof navigator !== 'undefined' ? navigator : undefined);
  doc = doc || (typeof document !== 'undefined' ? document : undefined);
  var wanted = false;
  /** @type {any} */
  var lock = null;

  function supported() {
    return !!(nav && nav.wakeLock && typeof nav.wakeLock.request === 'function');
  }

  function acquire() {
    if (!wanted || lock || !supported()) return;
    if (doc && doc.visibilityState && doc.visibilityState !== 'visible') return;
    nav.wakeLock.request('screen').then(
      function (sentinel) {
        if (!wanted) {
          sentinel.release();
          return;
        }
        lock = sentinel;
        sentinel.addEventListener('release', function () {
          if (lock === sentinel) lock = null;
        });
      },
      function () {
        // refused (battery saver, no permission): the screen just sleeps as usual
      }
    );
  }

  if (doc && doc.addEventListener)
    doc.addEventListener('visibilitychange', function () {
      if (doc.visibilityState === 'visible') acquire();
    });

  return {
    /** @param {boolean} on keep the screen awake (true) or let it sleep again */
    keepAwake: function (on) {
      wanted = !!on;
      if (wanted) acquire();
      else if (lock) {
        var held = lock;
        lock = null;
        held.release();
      }
    },
  };
}
