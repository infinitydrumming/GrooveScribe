import { describe, it, expect } from 'vitest';
import { loadMyGrooves, saveMyGroove, removeMyGroove, myGroovesMenuHTML } from '../js/myGrooves.js';

// Infinity Drumming, 2026: "My Grooves", grooves saved on this device.

function memoryStorage() {
  const data = {};
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = String(value);
    },
  };
}

describe('My Grooves', () => {
  it('saves grooves newest first, one entry per groove', () => {
    const storage = memoryStorage();
    expect(loadMyGrooves(storage)).toEqual([]);
    saveMyGroove(storage, 'Funky', 'https://x.test/?TimeSig=4/4&H=|x|', 't1');
    saveMyGroove(storage, '', 'https://x.test/index.html?TimeSig=3/4&H=|x|', 't2');
    saveMyGroove(storage, 'Funky again', 'https://x.test/?TimeSig=4/4&H=|x|', 't3');
    expect(loadMyGrooves(storage)).toEqual([
      { title: 'Funky again', search: '?TimeSig=4/4&H=|x|', savedAt: 't3' },
      { title: 'Untitled groove', search: '?TimeSig=3/4&H=|x|', savedAt: 't2' },
    ]);
    removeMyGroove(storage, 0);
    expect(loadMyGrooves(storage).map((g) => g.savedAt)).toEqual(['t2']);
  });

  it('copes with no storage, spoilt storage, and links without a groove', () => {
    expect(loadMyGrooves(null)).toEqual([]);
    expect(saveMyGroove(null, 'x', 'https://x.test/?a=1', 't')).toBe(false);
    const storage = memoryStorage();
    storage.setItem('infinityScribeMyGrooves', '{not json');
    expect(loadMyGrooves(storage)).toEqual([]);
    expect(saveMyGroove(storage, 'x', 'https://x.test/', 't')).toBe(false);
  });

  it('lists them in the Grooves menu, safely', () => {
    expect(myGroovesMenuHTML([])).toBe('');
    const html = myGroovesMenuHTML([
      { title: '<b>Rock</b>', search: '?a=1', savedAt: '2026-10-09T10:00:00Z' },
    ]);
    expect(html).toContain('My Grooves');
    expect(html).toContain('&lt;b&gt;Rock&lt;/b&gt;');
    expect(html).toContain('myGrooveWriter.loadMyGroove(0)');
    expect(html).toContain('myGrooveWriter.removeMyGroove(0)');
  });
});
