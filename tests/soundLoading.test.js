import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSoundLoader, showSoundsBar, hideSoundsBar } from '../js/soundLoading.js';

// Infinity Drumming, 2026: the drum sounds, tried again when a try fails.

describe('loading the drum sounds', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  // a loader whose tries are recorded: tries[n](ok) ends try n (ok, or failed)
  const setUp = () => {
    const tries = [];
    const gaveUp = vi.fn();
    const loader = createSoundLoader({
      load: (failed) =>
        tries.push((ok) => {
          if (ok) loader.ready();
          else failed();
        }),
      gaveUp,
    });
    return { loader, tries, gaveUp };
  };

  it('is ready after a try that works', () => {
    const { loader, tries, gaveUp } = setUp();
    loader.start();
    tries[0](true);
    expect(loader.isReady()).toBe(true);
    vi.advanceTimersByTime(60000);
    expect(tries).toHaveLength(1);
    expect(gaveUp).not.toHaveBeenCalled();
  });

  it('tries again after a failed try, then gives up after three', () => {
    const { loader, tries, gaveUp } = setUp();
    loader.start();
    tries[0](false);
    tries[0](false); // (said twice: still one more try)
    vi.advanceTimersByTime(1000);
    expect(tries).toHaveLength(2);
    tries[1](false);
    vi.advanceTimersByTime(1000);
    tries[2](false);
    vi.advanceTimersByTime(60000);
    expect(tries).toHaveLength(3);
    expect(gaveUp).toHaveBeenCalledTimes(1);
    expect(loader.hasGivenUp()).toBe(true);
    // a tap tries again, three more times
    loader.retry();
    expect(tries).toHaveLength(4);
    expect(loader.hasGivenUp()).toBe(false);
    tries[3](true);
    expect(loader.isReady()).toBe(true);
  });

  it('tries again when a try stalls, and a slower try that ends still counts', () => {
    const { loader, tries } = setUp();
    loader.start();
    vi.advanceTimersByTime(20000 + 1000);
    expect(tries).toHaveLength(2);
    tries[0](false); // (an earlier try's failure: no extra try)
    vi.advanceTimersByTime(2000);
    expect(tries).toHaveLength(2);
    tries[0](true); // the first try comes in after all
    expect(loader.isReady()).toBe(true);
    vi.advanceTimersByTime(60000);
    expect(tries).toHaveLength(2);
  });

  it('tries again on a tap only once it has given up', () => {
    const { loader, tries } = setUp();
    loader.start();
    loader.retry();
    expect(tries).toHaveLength(1);
  });
});

describe('the drum sounds bar', () => {
  it('says the sounds did not load, with a button to try again, and goes when they are in', () => {
    const retry = vi.fn();
    showSoundsBar(document, "The drum sounds didn't load.", retry);
    const bar = document.getElementById('soundsBar');
    expect(bar.textContent).toContain("didn't load");
    document.getElementById('soundsBarButton').click();
    expect(retry).toHaveBeenCalledTimes(1);
    showSoundsBar(document, 'Loading the drum sounds…');
    expect(document.querySelectorAll('#soundsBar')).toHaveLength(1);
    expect(document.getElementById('soundsBarButton')).toBeNull();
    hideSoundsBar(document);
    expect(document.getElementById('soundsBar')).toBeNull();
  });
});
