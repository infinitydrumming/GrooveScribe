import { describe, it, expect, vi } from 'vitest';
import { createScreenWakeLock } from '../../js/screenWakeLock.js';

// Infinity Drumming, 2026: the screen stays awake while a groove plays.

function fakes() {
  const listeners = {};
  const doc = {
    visibilityState: 'visible',
    addEventListener: (type, fn) => (listeners[type] = fn),
  };
  const sentinels = [];
  const nav = {
    wakeLock: {
      request: vi.fn(() => {
        const s = { release: vi.fn(), addEventListener: vi.fn() };
        sentinels.push(s);
        return Promise.resolve(s);
      }),
    },
  };
  return { doc, nav, sentinels, listeners };
}
const settle = () => new Promise((r) => setTimeout(r, 0));

describe('screen wake lock', () => {
  it('asks for a screen lock when playing and releases it on stop', async () => {
    const { doc, nav, sentinels } = fakes();
    const lock = createScreenWakeLock(nav, doc);
    lock.keepAwake(true);
    await settle();
    expect(nav.wakeLock.request).toHaveBeenCalledWith('screen');
    lock.keepAwake(false);
    expect(sentinels[0].release).toHaveBeenCalled();
  });

  it('asks again when the page comes back into view while still playing', async () => {
    const { doc, nav, sentinels, listeners } = fakes();
    const lock = createScreenWakeLock(nav, doc);
    lock.keepAwake(true);
    await settle();
    // the browser drops the lock when the page is hidden
    sentinels[0].addEventListener.mock.calls[0][1]();
    doc.visibilityState = 'hidden';
    listeners.visibilitychange();
    expect(nav.wakeLock.request).toHaveBeenCalledTimes(1);
    doc.visibilityState = 'visible';
    listeners.visibilitychange();
    await settle();
    expect(nav.wakeLock.request).toHaveBeenCalledTimes(2);
  });

  it('does not ask again after stopping', async () => {
    const { doc, nav, listeners } = fakes();
    const lock = createScreenWakeLock(nav, doc);
    lock.keepAwake(true);
    await settle();
    lock.keepAwake(false);
    listeners.visibilitychange();
    expect(nav.wakeLock.request).toHaveBeenCalledTimes(1);
  });

  it('does nothing on browsers without the API', () => {
    const lock = createScreenWakeLock({}, { addEventListener() {} });
    expect(() => {
      lock.keepAwake(true);
      lock.keepAwake(false);
    }).not.toThrow();
  });

  it('lets go of a lock that arrives after playing has already stopped', async () => {
    const { doc, nav, sentinels } = fakes();
    const lock = createScreenWakeLock(nav, doc);
    lock.keepAwake(true);
    lock.keepAwake(false);
    await settle();
    expect(sentinels[0].release).toHaveBeenCalled();
  });
});
