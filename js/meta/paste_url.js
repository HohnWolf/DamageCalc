// Only pokepast.es. Showdown hosts are rejected on purpose.
'use strict';
function allowedPasteUrl(raw) {
  let url;
  try { url = new URL(String(raw || '')); }
  catch (e) { return null; }
  if (url.protocol !== 'https:' || url.hostname !== 'pokepast.es') return null;
  if (!/^\/[A-Za-z0-9]+/.test(url.pathname)) return null;
  if (!url.pathname.endsWith('/raw')) url.pathname = url.pathname.replace(/\/$/, '') + '/raw';
  return url.toString();
}
module.exports = { allowedPasteUrl: allowedPasteUrl };
