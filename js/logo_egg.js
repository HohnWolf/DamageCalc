/* Shiny-Rattfratz am Logo (Easter Egg, seit 1.10.9, Quote 1:8192).
   Auslöser wie damals: ein Wurf beim Laden, ?shiny in der Adresse, oder #…shiny… im Hash.
   Die Desktop-App würfelt zusätzlich in electron/main.js und hängt dann ?shiny=1 an
   (Fenster-Icon: icon_shiny.ico). Kein Merken, kein Ton: nur das Bild wechselt.
   Pro/Studio blenden das große Startlogo aus (1.11.0); die Klasse is-shiny-logo zeigt es wieder. */
(function (root) {
  var ODDS = 8192;
  var ASSETS = {
    logo: 'img/logo.png',
    logoShiny: 'img/logo_shiny.png',
    home: 'img/home.png',
    homeShiny: 'img/home_shiny.png'
  };

  function isShinyLogo(opts) {
    opts = opts || {};
    var search = opts.search != null ? String(opts.search) : (root.location ? root.location.search : '');
    var hash = opts.hash != null ? String(opts.hash) : (root.location ? root.location.hash : '');
    var random = opts.random || Math.random;
    var forced = false;
    try {
      forced = new URLSearchParams(search.charAt(0) === '?' ? search.slice(1) : search).has('shiny');
    } catch (e) { forced = false; }
    if (!forced && hash.indexOf('shiny') !== -1) forced = true;
    var rolled = Math.floor(random() * ODDS) === 0;
    return !!(forced || rolled);
  }

  function homeSrc(shiny) { return shiny ? ASSETS.homeShiny : ASSETS.home; }
  function logoSrc(shiny) { return shiny ? ASSETS.logoShiny : ASSETS.logo; }

  function setSrc(el, src) {
    if (!el) return;
    var cur = el.getAttribute ? el.getAttribute('src') || el.getAttribute('href') || '' : (el.src || el.href || '');
    if (cur === src) return;
    if (el.tagName === 'LINK' || (el.rel && String(el.rel).indexOf('icon') !== -1)) {
      if (el.setAttribute) el.setAttribute('href', src);
      else el.href = src;
    } else if (el.setAttribute) el.setAttribute('src', src);
    else el.src = src;
  }

  function apply(doc, shiny) {
    var d = doc || root.document;
    if (!d || !d.documentElement) return !!shiny;
    var on = !!shiny;
    var html = d.documentElement;
    if (html.classList) {
      if (on) html.classList.add('is-shiny-logo');
      else html.classList.remove('is-shiny-logo');
    }
    if (on) html.setAttribute('data-shiny-logo', '1');
    else html.removeAttribute('data-shiny-logo');
    root.__IS_SHINY_LOGO = on;
    if (!on) return false;
    setSrc(d.querySelector('.start-logo'), ASSETS.logoShiny);
    setSrc(d.querySelector('link[rel="icon"]'), ASSETS.logoShiny);
    var brands = d.querySelectorAll('#btnHome img, img.sb-logo, img[data-rl-brand], .set-upd-badge img');
    for (var i = 0; i < brands.length; i++) setSrc(brands[i], ASSETS.homeShiny);
    return true;
  }

  function boot() {
    try { apply(root.document, isShinyLogo()); } catch (e) { /* Logo bleibt normal */ }
  }

  root.RLLogoEgg = {
    ODDS: ODDS,
    ASSETS: ASSETS,
    isShinyLogo: isShinyLogo,
    homeSrc: homeSrc,
    logoSrc: logoSrc,
    apply: apply,
    boot: boot
  };

  if (root.document) {
    if (root.document.querySelector && root.document.querySelector('.start-logo')) boot();
    else if (root.document.addEventListener) root.document.addEventListener('DOMContentLoaded', boot);
  }
})(typeof window !== 'undefined' ? window : globalThis);
