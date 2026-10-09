// Infinity Drumming, 2026: short links for grooves, on Cloudflare Pages.
//
// POST /api/shorten  { "url": "https://scribe.infinitydrumming.com/?TimeSig=..." }
//   -> { "shortLink": "https://scribe.infinitydrumming.com/s/Ab3kP9xy" }
//
// The groove's link (its "?..." part) is kept in the SHORT_LINKS KV namespace
// under a code made from its own contents, so the same groove always gets the
// same short link.  Only links to Infinity Scribe itself are shortened, so the
// service can't be used to hide anyone else's links.  Nothing about the person
// is stored.  GET /s/<code> (functions/s/[code].js) opens it.

var OUR_HOSTS = [
  'scribe.infinitydrumming.com',
  'groove.infinitydrumming.com',
  'infinitydrumming.github.io',
  'localhost',
];
var MAX_LINK_LENGTH = 8000;
var CODE_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** The groove part ("?TimeSig=...") of a link to Infinity Scribe, or null. */
export function grooveSearch(link) {
  if (typeof link != 'string' || !URL.canParse(link)) return null;
  var url = new URL(link);
  if (OUR_HOSTS.indexOf(url.hostname) < 0 && !url.hostname.endsWith('.pages.dev')) return null;
  if (url.search.length < 2 || url.search.length > MAX_LINK_LENGTH) return null;
  return url.search;
}

/** A short code for a groove: its SHA-256 written in letters and digits. */
export async function codeFor(search, length) {
  var digest = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(search))
  );
  var code = '';
  for (var i = 0; i < length; i++) code += CODE_ALPHABET[digest[i] % CODE_ALPHABET.length];
  return code;
}

/** Store a groove and return its code (longer if a different groove has it already). */
export async function storeGroove(kv, search) {
  for (var length = 8; length <= 16; length++) {
    var code = await codeFor(search, length);
    var stored = await kv.get('s:' + code);
    if (stored === search) return code;
    if (stored === null) {
      await kv.put('s:' + code, search);
      return code;
    }
  }
  throw new Error('no free short code');
}

export async function onRequestPost(context) {
  var body = await context.request.json().catch(function () {
    return null; // not JSON
  });
  var search = grooveSearch(body && body.url);
  if (!search) return json({ error: 'Only Infinity Scribe groove links can be shortened' }, 400);
  var code = await storeGroove(context.env.SHORT_LINKS, search);
  return json({ shortLink: new URL('/s/' + code, context.request.url).toString() });
}
