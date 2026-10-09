import { describe, it, expect } from 'vitest';
import { onRequestPost, grooveSearch, storeGroove } from '../functions/api/shorten.js';
import { onRequestGet } from '../functions/s/[code].js';

// Infinity Drumming, 2026: short groove links on Cloudflare Pages.

function memoryKV() {
  const data = new Map();
  return {
    data,
    get: async (key) => (data.has(key) ? data.get(key) : null),
    put: async (key, value) => {
      data.set(key, value);
    },
  };
}
const GROOVE = 'https://scribe.infinitydrumming.com/?TimeSig=4/4&Div=16&H=|x-x-|';
const shorten = (env, body) =>
  onRequestPost({
    env,
    request: new Request('https://scribe.infinitydrumming.com/api/shorten', {
      method: 'POST',
      body: typeof body == 'string' ? body : JSON.stringify(body),
    }),
  });
const open = (env, code) =>
  onRequestGet({
    env,
    params: { code },
    request: new Request('https://scribe.infinitydrumming.com/s/' + code),
  });

describe('short groove links', () => {
  it('makes a short link that opens the groove', async () => {
    const env = { SHORT_LINKS: memoryKV() };
    const { shortLink } = await (await shorten(env, { url: GROOVE })).json();
    expect(shortLink).toMatch(/^https:\/\/scribe\.infinitydrumming\.com\/s\/[0-9A-Za-z]{8}$/);
    const response = await open(env, shortLink.split('/s/')[1]);
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe(GROOVE);
  });

  it('gives the same groove the same short link', async () => {
    const env = { SHORT_LINKS: memoryKV() };
    const first = await (await shorten(env, { url: GROOVE })).json();
    const again = await (await shorten(env, { url: GROOVE.replace('scribe.', 'groove.') })).json();
    expect(again.shortLink).toBe(first.shortLink);
    expect(env.SHORT_LINKS.data.size).toBe(1);
  });

  it('only shortens Infinity Scribe grooves', async () => {
    const env = { SHORT_LINKS: memoryKV() };
    for (const body of [
      { url: 'https://example.com/?TimeSig=4/4' },
      { url: 'https://scribe.infinitydrumming.com/' },
      { url: 'not a link' },
      'not json',
      {},
    ])
      expect((await shorten(env, body)).status).toBe(400);
    expect(env.SHORT_LINKS.data.size).toBe(0);
    expect(grooveSearch('https://infinity-scribe.pages.dev/?a=1')).toBe('?a=1');
  });

  it("says when a link isn't known", async () => {
    const env = { SHORT_LINKS: memoryKV() };
    expect((await open(env, 'AbCdEfGh')).status).toBe(404);
    expect((await open(env, '../etc')).status).toBe(404);
  });

  it('never gives two grooves the same code', async () => {
    const kv = memoryKV();
    const code = await storeGroove(kv, '?a=1');
    kv.data.set('s:' + code, '?something=else'); // as if another groove had it
    const other = await storeGroove(kv, '?a=1');
    expect(other).not.toBe(code);
    expect(other.startsWith(code)).toBe(true);
  });
});
