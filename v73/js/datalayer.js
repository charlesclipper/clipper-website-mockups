/* V60: GTM-ready conversion event layer. Vanilla JS, no network, no cookies, no storage.
 * It only pushes plain objects onto window.dataLayer, so it is inert until a GTM container (or something else that reads dataLayer) is loaded.
 * Event names, parameters and the GA4 / Google Ads mapping are documented in TRACKING.md. Loaded with defer on every page. */
(function () {
  'use strict';
  var dl = window.dataLayer = window.dataLayer || [];
  var PROD = ['clipperaviation.com', 'www.clipperaviation.com'];

  function loc(el) {
    if (el.closest('.fab-quote')) return 'floating_button';
    if (el.closest('.mobile-menu')) return 'mobile_menu';
    if (el.closest('.quote-modal, .mx-modal, [role="dialog"]')) return 'quote_modal';
    if (el.closest('.site-header')) return 'header';
    if (el.closest('.site-footer')) return 'footer';
    if (el.closest('.hero')) return 'hero';
    var s = el.closest('section[id], [id].section, main [id]');
    return s ? s.id : 'body';
  }
  function push(name, el, extra) {
    var o = { event: name, page_path: location.pathname, link_location: el ? loc(el) : 'unknown', site_env: PROD.indexOf(location.hostname) === -1 ? 'mockup' : 'production' };
    for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) o[k] = extra[k];
    dl.push(o);
  }
  function txt(el) { return (el.textContent || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 60); }

  /* clicks: capture phase, so handlers that stop propagation (map dots, modals) cannot hide them */
  document.addEventListener('click', function (e) {
    var t = e.target; if (!t || !t.closest) return;
    var q = t.closest('[data-quote-open]');
    if (q) push('quote_request_open', q, { link_text: txt(q) });
    var a = t.closest('a[href^="tel:"], a[href^="mailto:"]');
    if (a) push(a.getAttribute('href').indexOf('tel:') === 0 ? 'click_to_call' : 'click_to_email', a, { link_text: txt(a) });
    var d = t.closest('a[download], a[href$=".pdf"][href*="Brochure"]');
    if (d) push('brochure_download', d, { file_name: (d.getAttribute('href') || '').split('/').pop(), link_text: txt(d) });
    var m = t.closest('[data-tour-play]');
    if (m) push('cabin_tour_open', m, { tour: 'matterport' });
  }, true);

  /* submits: js/main.js fires ca:form-sent only after a valid submit. Honeypot hits (form.dataset.botFlag) are never counted. */
  document.addEventListener('ca:form-sent', function (e) {
    var f = e.detail && e.detail.form;
    if (!f || f.dataset.botFlag) return;
    var popup = f.hasAttribute('data-jetinsight') || f.hasAttribute('data-mx-mailto');
    push(popup ? 'quote_submit' : 'contact_form_submit', f, { form_id: f.getAttribute('data-form-id') || (popup ? 'quote_request' : 'contact_form') });
  });
})();
