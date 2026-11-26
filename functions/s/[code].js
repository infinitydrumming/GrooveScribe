// Infinity Drumming, 2026: open a short groove link, /s/<code> (see
// functions/api/shorten.js), by sending the browser on to the full groove.
// A groove too long to send in an address (a link of tens of thousands of
// characters goes past what browsers and Cloudflare take) opens as /?s=<code>
// instead: the page fetches it (functions/api/link/[code].js, js/main.js).

/** Links up to this long go to the full groove, as they always have. */
export var LONGEST_ADDRESS = 8000;

export async function onRequestGet(context) {
  var code = String(context.params.code || '');
  var search = /^[0-9A-Za-z]{8,16}$/.test(code)
    ? await context.env.SHORT_LINKS.get('s:' + code)
    : null;
  if (!search)
    return new Response('Sorry, this groove link was not found.', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  var to = search.length > LONGEST_ADDRESS ? '/?s=' + code : '/' + search;
  return Response.redirect(new URL(to, context.request.url).toString(), 302);
}
