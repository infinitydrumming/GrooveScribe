// Infinity Drumming, 2026: open a short groove link, /s/<code> (see
// functions/api/shorten.js), by sending the browser on to the full groove.

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
  return Response.redirect(new URL('/' + search, context.request.url).toString(), 302);
}
