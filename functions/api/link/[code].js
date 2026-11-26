// Infinity Drumming, 2026: a short link's groove, for a groove too long to open by
// its address (functions/s/[code].js sends those to /?s=<code>, and js/main.js
// fetches the groove from here): { "search": "?TimeSig=..." }. A code is made from
// its groove's contents, so its answer never changes.

export async function onRequestGet(context) {
  var code = String(context.params.code || '');
  var search = /^[0-9A-Za-z]{8,16}$/.test(code)
    ? await context.env.SHORT_LINKS.get('s:' + code)
    : null;
  if (!search)
    return new Response(JSON.stringify({ error: 'Sorry, this groove link was not found.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  return new Response(JSON.stringify({ search: search }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
