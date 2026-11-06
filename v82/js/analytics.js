/* V82 measurement. The only off switch this file trusts is not inserting the tag.
   A later consent=denied update, or a missing cookie, is not treated as proof that
   cookieless GA pings or limited Clarity capture have stopped. No Clarity pause or
   stop call is used. Official hard-off behavior is still unverified.
   One path only: GTM-MFBP4H3. G-YKMHHTEZ7J is not loaded beside it.
   Ads storage, ad user data, and ad personalization stay denied. Signals and
   remarketing are not turned on. Replay stays unloaded on every current page
   because the request form is in the page, and masking is not an exclusion.
   Tags stay off in this preview. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CA_ANALYTICS = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  var PRODUCTION_GTM_ID = 'GTM-MFBP4H3';
  var PRODUCTION_GA4_ID = 'G-YKMHHTEZ7J';
  var CLARITY_ID = '';
  var TAGS_ENABLED = false;
  var PRODUCTION_HOSTS = { 'clipperaviation.com': 1, 'www.clipperaviation.com': 1 };
  var STORE_KEY = 'ca_consent_v1';
  var MARKETING = {
    'index.html': 1, 'charter.html': 1, 'altitudeaccess.html': 1, 'maintenance.html': 1,
    'about.html': 1, 'privacy.html': 1, 'accessibility.html': 1, '404.html': 1, '': 1
  };
  var BLOCKED = { 'client-login.html': 1 };
  var SENSITIVE = { 'client-login.html': 1, 'estimate.html': 1, 'empty-legs.html': 1 };

  function pageName(path) {
    var p = String(path || '').split('?')[0].split('#')[0];
    var parts = p.split('/');
    var last = parts[parts.length - 1] || '';
    if (LAST_OK(last)) return last;
    return '';
  }
  function LAST_OK(name) {
    return !/[^a-z0-9.-]/i.test(name) && name.length < 80;
  }
  function currentPage() {
    if (typeof location === 'undefined') return '';
    return pageName(location.pathname);
  }
  function signalOptOut() {
    if (typeof navigator === 'undefined') return false;
    if (navigator.globalPrivacyControl) return true;
    var dnt = navigator.doNotTrack || (typeof window !== 'undefined' && window.doNotTrack);
    return dnt === '1' || dnt === 'yes';
  }
  function hostAllowed() {
    if (typeof location === 'undefined') return false;
    return !!PRODUCTION_HOSTS[location.hostname];
  }

  function sanitizeValue(value) {
    if (value == null) return null;
    if (typeof value === 'number' && isFinite(value)) return value;
    if (typeof value === 'boolean') return value;
    var s = String(value);
    if (/[@]|token|password|bearer|mailto:|cf-turnstile/i.test(s)) return null;
    if (/[?&#=]/.test(s)) return null;
    if (s.length > 80) return null;
    return s;
  }

  function buildEvent(name, params, path) {
    var page = pageName(path == null ? currentPage() : path);
    if (BLOCKED[page]) return null;
    var allowed = {
      nav_select: ['link_path'],
      quote_cta: [],
      brochure_download: [],
      cabin_tour: [],
      estimator_start: ['leg_count'],
      estimator_result: ['leg_count', 'pending', 'peak_legs'],
      empty_leg_intent: [],
      consent_choice: ['analytics', 'replay']
    }[name];
    if (!allowed) return null;
    var clean = { event: name, page: page || 'unknown' };
    for (var i = 0; i < allowed.length; i++) {
      var key = allowed[i];
      if (!params || !Object.prototype.hasOwnProperty.call(params, key)) continue;
      var v = sanitizeValue(params[key]);
      if (v == null) return null;
      if (key === 'link_path' && String(v).indexOf('..') !== -1) return null;
      clean[key] = v;
    }
    return clean;
  }

  function safeLocation(href) {
    try {
      var u = new URL(href, 'https://clipperaviation.com');
      return u.origin + u.pathname;
    } catch (e) {
      return '';
    }
  }

  var state = { analytics: false, replay: false, chosen: false };
  var started = { gtm: false };
  var log = [];

  function readStore() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || (o.analytics !== true && o.analytics !== false)) return null;
      return { analytics: o.analytics === true, replay: o.replay === true };
    } catch (e) { return null; }
  }
  function writeStore() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ analytics: state.analytics, replay: state.replay, v: 1 }));
    } catch (e) { /* storage blocked */ }
  }

  function clientInputInDom() {
    if (typeof document === 'undefined') return false;
    return !!document.querySelector('#quote-modal, [data-quote-open], #client-pass, .leg-date, form[data-mock-form]');
  }

  function replayPermitted() {
    /* Marketing-page allowlists are not enough: the quote form is on those pages too.
       Masking does not count as exclusion. Replay is not loaded until a separate
       architecture keeps client fields out of the captured DOM. */
    if (clientInputInDom()) return false;
    if (!CLARITY_ID || signalOptOut() || SENSITIVE[currentPage()]) return false;
    return state.replay === true;
  }

  function hardLoadGate() {
    return TAGS_ENABLED === true && state.analytics === true && hostAllowed() && !signalOptOut() && !BLOCKED[currentPage()];
  }

  function loadGtm() {
    if (started.gtm || !hardLoadGate()) return;
    if (typeof document === 'undefined') return;
    started.gtm = true;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'consent_default',
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(PRODUCTION_GTM_ID);
    s.setAttribute('data-ca-tag', 'gtm');
    document.head.appendChild(s);
  }

  function track(name, params) {
    var ev = buildEvent(name, params);
    if (!ev) return null;
    log.push(ev);
    if (hardLoadGate() && window.dataLayer) window.dataLayer.push(ev);
    return ev;
  }

  function applyChoice(next) {
    state.analytics = next.analytics === true;
    state.replay = next.replay === true && replayPermitted();
    state.chosen = true;
    writeStore();
    track('consent_choice', { analytics: state.analytics, replay: state.replay });
    if (state.analytics) loadGtm();
  }

  function bindNotice() {
    if (typeof document === 'undefined') return;
    var n = document.querySelector('[data-cookie-notice]');
    if (!n) return;
    var box = n.querySelector('[data-cookie-customize]');
    var saved = readStore();
    if (signalOptOut()) state = { analytics: false, replay: false, chosen: false };
    else if (saved) state = { analytics: saved.analytics, replay: saved.replay, chosen: true };
    function paint() {
      n.hidden = false;
      if (box) box.hidden = true;
    }
    paint();
    n.addEventListener('click', function (e) {
      var b = e.target.closest('[data-consent]');
      if (!b) return;
      var kind = b.getAttribute('data-consent');
      if (kind === 'customize') { if (box) box.hidden = false; return; }
      if (kind === 'accept') applyChoice({ analytics: true, replay: false });
      if (kind === 'reject') applyChoice({ analytics: false, replay: false });
      if (kind === 'save') {
        var a = n.querySelector('[data-purpose="analytics"]');
        var r = n.querySelector('[data-purpose="replay"]');
        applyChoice({ analytics: !!(a && a.checked), replay: !!(r && r.checked) });
      }
      if (kind === 'accept' || kind === 'reject' || kind === 'save') {
        n.querySelector('[data-cookie-text]').textContent = 'Choice saved. This preview still does not insert Analytics or replay tags. Rejecting or withdrawing a choice only keeps them from being added. A denial after a tag has already loaded is not proof that cookieless pings have stopped.';
        if (box) box.hidden = true;
      }
    });
    if (state.chosen && state.analytics) loadGtm();
  }

  function bindEvents() {
    if (typeof document === 'undefined') return;
    var estimateStarted = false;
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      if (t.closest('a.nav-link, .dropdown a, a.m-main, .m-sub a')) {
        var href = (t.closest('a').getAttribute('href') || '').split('?')[0].split('#')[0];
        track('nav_select', { link_path: href });
      }
      if (t.closest('[data-quote-open]')) track('quote_cta');
      if (t.closest('a[download], a[href$=".pdf"]')) track('brochure_download');
      if (t.closest('[data-tour-play]')) track('cabin_tour');
      if (t.closest('.empty-legs a.btn[href^="mailto:"], a.btn[href^="mailto:access@clipperaviation.com"]')) track('empty_leg_intent');
    }, true);
    document.addEventListener('input', function (e) {
      if (!e.target || !e.target.closest || !e.target.closest('#estimate-form') || estimateStarted) return;
      estimateStarted = true;
      track('estimator_start', { leg_count: document.querySelectorAll('.est-leg').length });
    }, true);
    document.addEventListener('ca:estimate-result', function (e) {
      var d = e.detail || {};
      track('estimator_result', { leg_count: d.leg_count || 0, pending: d.pending ? 1 : 0, peak_legs: d.peak_legs || 0 });
    });
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { bindNotice(); bindEvents(); });
    else { bindNotice(); bindEvents(); }
  }

  return {
    buildEvent: buildEvent,
    sanitizeValue: sanitizeValue,
    safeLocation: safeLocation,
    pageName: pageName,
    debugLog: function () { return log.slice(); },
    tagsEnabled: function () { return TAGS_ENABLED; },
    productionGa4Id: PRODUCTION_GA4_ID,
    productionGtmId: PRODUCTION_GTM_ID,
    clarityConfigured: function () { return !!CLARITY_ID; },
    replayPermitted: replayPermitted,
    hardLoadGate: hardLoadGate,
    clientInputInDom: clientInputInDom
  };
});
