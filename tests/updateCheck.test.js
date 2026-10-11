// Infinity Drumming, 2026: the "new version is ready" bar (js/updateCheck.js).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { versionOf, liveVersion, showUpdateBar, startUpdateChecks } from '../js/updateCheck.js';

const answer = (body, ok = true) => vi.fn(async () => ({ ok, json: async () => body }));

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('update check', () => {
  it('reads the version a module was loaded as', () => {
    expect(versionOf('https://x.test/js/updateCheck.js?v=20261011-0507')).toBe('20261011-0507');
    expect(versionOf('https://x.test/js/updateCheck.js')).toBeNull();
  });

  it('asks for version.json past every cache', async () => {
    const fetchFn = answer({ version: '2' });
    expect(await liveVersion(fetchFn)).toBe('2');
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toMatch(/^version\.json\?t=\d+$/);
    expect(init).toEqual({ cache: 'no-store' });
  });

  it('gives no version when version.json cannot be read', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await liveVersion(answer({}, false))).toBeNull();
    expect(await liveVersion(answer({ nothing: 1 }))).toBeNull();
    expect(
      await liveVersion(
        vi.fn(async () => {
          throw new Error('offline');
        })
      )
    ).toBeNull();
  });

  it('shows the bar when a newer version is live, and Update reloads', async () => {
    const reload = vi.fn();
    const check = startUpdateChecks({
      running: '1',
      doc: document,
      fetchFn: answer({ version: '2' }),
      reload,
    });
    await check();
    expect(document.getElementById('updateBar').textContent).toContain(
      'A new version of Infinity Scribe is ready'
    );
    document.getElementById('updateBarButton').click();
    expect(reload).toHaveBeenCalled();
  });

  it('shows nothing when this is the live version', async () => {
    const check = startUpdateChecks({
      running: '2',
      doc: document,
      fetchFn: answer({ version: '2' }),
    });
    await check();
    expect(document.getElementById('updateBar')).toBeNull();
  });

  it('does not check without a version of its own', async () => {
    const fetchFn = answer({ version: '2' });
    const check = startUpdateChecks({ running: null, doc: document, fetchFn });
    await check();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('checks again when the page comes back into view, at most once a minute', async () => {
    vi.useFakeTimers();
    try {
      const fetchFn = answer({ version: '1' });
      startUpdateChecks({ running: '1', doc: document, fetchFn });
      await vi.advanceTimersByTimeAsync(5000); // first check after opening
      expect(fetchFn).toHaveBeenCalledTimes(1);
      document.dispatchEvent(new Event('visibilitychange')); // too soon
      expect(fetchFn).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(61 * 1000);
      document.dispatchEvent(new Event('visibilitychange'));
      expect(fetchFn).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('the bar can be closed, and appears only once', () => {
    showUpdateBar(document, () => {});
    showUpdateBar(document, () => {});
    expect(document.querySelectorAll('#updateBar')).toHaveLength(1);
    document.getElementById('updateBarClose').click();
    expect(document.getElementById('updateBar')).toBeNull();
  });
});
