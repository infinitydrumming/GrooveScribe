// Infinity Drumming, 2026: play through the iPhone's silent switch.
//
// Safari treats sound from a web page (Web Audio) like a notification sound:
// with the ring/silent switch on silent, a groove plays without a sound. While
// a groove plays, the page says it is music playback (the Audio Session API,
// Safari 17 / iOS 17 and later), so it is heard like a music app's, silent
// switch or not; when it stops, the page goes back to the browser's default.
// Elsewhere (no navigator.audioSession) it does nothing.

/**
 * @param {any} [nav] the navigator (injected for tests)
 */
export function createAudioSession(nav) {
  nav = nav || (typeof navigator !== 'undefined' ? navigator : undefined);

  // (a browser that doesn't know a type ignores it, as for any web enum setting)
  function setType(type) {
    if (nav && nav.audioSession) nav.audioSession.type = type;
  }

  return {
    /** @param {boolean} on a groove is about to play (true) or has stopped (false) */
    playing: function (on) {
      setType(on ? 'playback' : 'auto');
    },
  };
}
