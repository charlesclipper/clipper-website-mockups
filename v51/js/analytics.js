/* V49 change 2: Microsoft Clarity + Google Analytics 4, plus the cookie notice.
 *
 * ============================== PASTE THE REAL IDs HERE (the only place) ==============================
 *  CLARITY_ID : the Clarity project id (Clarity > Settings > Overview), e.g. 'abcd1234ef'
 *  GA4_ID     : the GA4 web data stream Measurement ID, e.g. 'G-ABC123XYZ9'
 * While an ID is still a placeholder (or empty) that tool is not loaded at all: no script, no request, no console noise.
 * ======================================================================================================== */
(function () {
  'use strict';
  var CLARITY_ID = 'PLACEHOLDER_CLARITY';
  var GA4_ID = 'G-PLACEHOLDER';

  /* Hosts that count as the real site. Anything else (this mockup domain, localhost) is labelled traffic_type:'internal' in GA4 so a GA4
     internal-traffic data filter can keep it out of the reports (see ISSUES.md V49 change 2). Add the final domain(s) at launch. */
  var PRODUCTION_HOSTS = ['clipperaviation.com', 'www.clipperaviation.com'];

  /* Consent hook. 'notice' = US style: tracking starts on page load and the notice is informational (current setting).
     'opt-in' = tracking waits until something calls window.CA_ANALYTICS.grant() (or fires the 'ca:consent' event with detail.granted true),
     for example from a future EU/UK consent banner. The GA4 Consent Mode default is set here, so wiring a CMP later is a one-line change. */
  var CONSENT_MODE = 'notice';

  /* The cookie notice is only needed when tracking is on. For this mockup review it is shown even with placeholder IDs so it can be seen
     and checked; set to false when the real IDs go in (it then shows only because the IDs are real). */
  var NOTICE_WITHOUT_IDS = true;

  var NOTICE_KEY = 'ca_cookie_notice_ok';
  var PRIVACY_URL = 'https://clipperaviation.com/privacy-policy/';   // same link as the footer

  function isReal(id) { return !!id && id.indexOf('PLACEHOLDER') === -1; }   // empty or any *PLACEHOLDER* value = not configured
  var haveGA = isReal(GA4_ID), haveCL = isReal(CLARITY_ID);
  var consented = CONSENT_MODE !== 'opt-in';
  var started = false;
  var internal = PRODUCTION_HOSTS.indexOf(location.hostname) === -1;

  /* ---------- tracking events (no-ops until GA4 is running) ---------- */
  function track(name, params) {
    if (!haveGA || !started || typeof window.gtag !== 'function') return;
    window.gtag('event', name, params || {});
  }

  function start() {
    if (started || !consented) return;
    started = true;
    if (haveGA) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      if (CONSENT_MODE === 'opt-in') window.gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
      window.gtag('js', new Date());
      var cfg = {};   // enhanced measurement (scroll depth, outbound clicks, file downloads) is switched on in the GA4 data stream settings
      if (internal) cfg.traffic_type = 'internal';
      window.gtag('config', GA4_ID, cfg);
      if (CONSENT_MODE === 'opt-in') window.gtag('consent', 'update', { analytics_storage: 'granted' });
      var g = document.createElement('script'); g.async = true; g.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA4_ID);
      document.head.appendChild(g);
    }
    if (haveCL) {
      /* Clarity's standard snippet, kept in this external file so the page needs no inline script (CSP friendly) */
      (function (c, l, a, r, i, t, y) {
        c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
        t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
        y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
      })(window, document, 'clarity', 'script', CLARITY_ID);
      if (internal) window.clarity('set', 'environment', 'mockup');
    }
  }

  window.CA_ANALYTICS = {
    grant: function () { consented = true; start(); document.dispatchEvent(new CustomEvent('ca:consent', { detail: { granted: true } })); },
    track: track
  };
  document.addEventListener('ca:consent', function (e) { if (e.detail && e.detail.granted) { consented = true; start(); } });
  if (haveGA || haveCL) start();

  /* ---------- event wiring (delegated, so it also covers elements created later) ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target; if (!t || !t.closest) return;
    if (t.closest('[data-quote-open]')) track('quote_open', { link_text: (t.closest('[data-quote-open]').textContent || '').trim().slice(0, 60) });
    var a = t.closest('a[href^="tel:"], a[href^="mailto:"]');
    if (a) track('contact_click', { type: a.getAttribute('href').indexOf('tel:') === 0 ? 'phone' : 'email' });
  }, true);   // capture phase: other handlers (the map dots) stop propagation

  /* quote form (and the Maintenance service request) after a valid, accepted submit: js/main.js fires ca:form-sent */
  document.addEventListener('ca:form-sent', function (e) {
    var f = e.detail && e.detail.form;
    if (f && f.dataset.botFlag) return;   // honeypot hit: js/turnstile.js fakes a success for bots, never count it as a lead
    track('generate_lead', { form_id: f ? (f.hasAttribute('data-jetinsight') ? 'quote_request' : 'service_request') : 'form' });
  });

  /* expandable sections: fires when one starts to open (js/main.js fires ca:acc-change; the 'settled' repeat is ignored) */
  document.addEventListener('ca:acc-change', function (e) {
    var d = e.detail; if (!d || !d.open || d.settled) return;
    var btn = document.getElementById(d.id + '-toggle'), k = btn && btn.querySelector('.section-kicker');
    track('section_expand', { section: (k ? k.textContent : d.id).trim(), page: location.pathname.split('/').pop() || 'index.html' });
  });

  /* map destinations: keyboard focus or tap/click on a dot (hover alone is not counted), de-duplicated for one second */
  var lastDest = '', lastAt = 0;
  function dest(e) {
    var d = e.target && e.target.closest && e.target.closest('.trip-dot[data-key]'); if (!d) return;
    var k = d.getAttribute('data-key'), now = Date.now();
    if (k === lastDest && now - lastAt < 1000) return;
    lastDest = k; lastAt = now;
    track('destination_view', { destination: d.getAttribute('data-name') });
  }
  document.addEventListener('focusin', dest);
  document.addEventListener('click', dest, true);

  /* ---------- cookie notice (informational, CCPA style; does not block tracking) ---------- */
  function noticeInit() {
    var n = document.querySelector('[data-cookie-notice]'); if (!n) return;
    var seen = false; try { seen = localStorage.getItem(NOTICE_KEY) === '1'; } catch (err) { /* storage blocked: show it every visit */ }
    if (seen || !(haveGA || haveCL || NOTICE_WITHOUT_IDS)) return;
    var link = n.querySelector('[data-cookie-privacy]'); if (link) link.href = PRIVACY_URL;
    n.hidden = false;
    n.querySelector('[data-cookie-ok]').addEventListener('click', function () {
      try { localStorage.setItem(NOTICE_KEY, '1'); } catch (err) { /* ignore */ }
      n.hidden = true;
      document.dispatchEvent(new CustomEvent('ca:notice-ack'));
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', noticeInit); else noticeInit();
})();
