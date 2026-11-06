/* V83 measurement for GA4 and Clarity.
   The request form lives in a separate opaque document, so a future replay script
   on the public page cannot read those fields. Login, estimate, maintenance, and
   the form documents themselves stay excluded. Real tags stay off until an owned
   id is verified. A local stub is not proof that Google or Clarity stayed quiet.
   Both loaders exist. Neither runs until an owned id is verified and the visitor has accepted.
   The off switch is: do not insert the tag, save the denial, and open a fresh document whose
   loader sees that denial. A consent update after a tag is already running is not treated as off.
   Clarity's consentv2 denial still allows limited cookieless capture. No pause or stop call is used.
   One Analytics path: the GTM container. The GA4 id is not loaded beside it.
   Google Consent Mode is gtag('consent','default'|'update', ...) via dataLayer.push(arguments),
   the command in Google's tag setup guide. A plain object named consent_default is not that command.
   Ads storage, ad user data, and ad personalization stay denied on both calls. Signals, remarketing,
   enhanced conversions, and conversion events stay off. The quote form does not POST,
   so this file does not send generate_lead. A future lead, if any, is one server-confirmed
   submission, counted once, and is not also a native Ads primary conversion. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CA_ANALYTICS = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  var CANDIDATE_GTM_ID = 'GTM-MFBP4H3';
  var CANDIDATE_GA4_ID = 'G-YKMHHTEZ7J';
  var ACTIVE = { activation: 'hold', gtmId: '', clarityId: '', tagsEnabled: false };
  var PRODUCTION_HOSTS = { 'clipperaviation.com': 1, 'www.clipperaviation.com': 1 };
  var STORE_KEY = 'ca_consent_v1';
  var GA_BLOCKED = { 'client-login': 1, 'quote-frame': 1, 'mx-frame': 1 };
  var CLARITY_BLOCKED = {
    'client-login': 1, 'estimate': 1, 'maintenance': 1,
    'quote-frame': 1, 'mx-frame': 1
  };

  function pageName(path) {
    var p = String(path || '').split('?')[0].split('#')[0];
    try { p = decodeURIComponent(p); } catch (e) {}
    p = p.replace(/\/+$/, '');
    var parts = p.split('/');
    var last = parts[parts.length - 1] || 'index';
    last = last.replace(/\.html$/i, '');
    if (!last) last = 'index';
    if (!/^[a-z0-9.-]+$/i.test(last) || last.length >= 80) return '';
    return last.toLowerCase();
  }
  function consentCommands() {
    var deniedAds = {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    };
    return {
      /* Google Consent Mode: dataLayer.push(arguments), not a plain object. */
      defaultCall: ['consent', 'default', {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: 'denied',
        functionality_storage: 'denied',
        personalization_storage: 'denied',
        security_storage: 'granted'
      }],
      updateCall: ['consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: deniedAds.ad_storage,
        ad_user_data: deniedAds.ad_user_data,
        ad_personalization: deniedAds.ad_personalization
      }]
    };
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
  function testMode() {
    if (typeof window === 'undefined' || !window.__CA_MEASURE_TEST__) return null;
    var t = window.__CA_MEASURE_TEST__;
    return t && t.stub === true ? t : null;
  }
  function measureFlag(flag) {
    if (typeof document === 'undefined') return false;
    var m = document.querySelector('meta[name="ca-measure"]');
    if (!m) return false;
    return new RegExp('(^|\\s)' + flag + '(\\s|$)').test(m.getAttribute('content') || '');
  }
  function clientInputInDom() {
    if (typeof document === 'undefined') return false;
    return !!document.querySelector('form[data-mock-form] input, form[data-mock-form] textarea, form[data-mock-form] select, #estimate-form input, #estimate-form select, #estimate-form textarea, #client-pass, input[type="password"]');
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
    if (GA_BLOCKED[page] || page === '') return null;
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

  function planLoads(ctx) {
    var c = ctx || {};
    var consent = c.consent || { analytics: false, replay: false };
    var page = pageName(c.page || '');
    var signal = !!c.signalOptOut;
    var clientInput = !!c.clientInput;
    var noGa = !!c.noGa;
    var noReplay = !!c.noReplay;
    var gtmShape = /^GTM-[A-Z0-9]+$/.test(c.gtmId || '');
    var clarityShape = /^[a-z0-9]{4,32}$/.test(c.clarityId || '');
    var verified = c.activation === 'verified' && c.tagsEnabled === true && !!c.hostOk && !signal;
    var stub = !!c.testStub;
    var named = page !== '';
    var gtm = named && verified && consent.analytics === true && !noGa && !GA_BLOCKED[page] && gtmShape;
    var clarity = named && verified && consent.replay === true && !noReplay && !CLARITY_BLOCKED[page] && !clientInput && clarityShape;
    if (stub) {
      gtm = named && consent.analytics === true && !signal && !noGa && !GA_BLOCKED[page];
      clarity = named && consent.replay === true && !signal && !noReplay && !CLARITY_BLOCKED[page] && !clientInput;
    }
    return {
      gtm: !!gtm,
      clarity: !!clarity,
      separateGtag: false,
      ads: {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        signals: false,
        remarketing: false,
        enhancedConversions: false,
        conversion: false
      }
    };
  }

  var state = { analytics: false, replay: false, chosen: false };
  var started = { gtm: false, clarity: false };
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

  function currentPlan() {
    var t = testMode();
    return planLoads({
      consent: state,
      page: currentPage(),
      signalOptOut: signalOptOut(),
      clientInput: clientInputInDom(),
      noGa: measureFlag('no-ga'),
      noReplay: measureFlag('no-replay'),
      activation: ACTIVE.activation,
      tagsEnabled: ACTIVE.tagsEnabled,
      hostOk: hostAllowed(),
      gtmId: ACTIVE.gtmId,
      clarityId: ACTIVE.clarityId,
      testStub: !!t
    });
  }

  function addScript(kind, src) {
    if (typeof document === 'undefined') return;
    var s = document.createElement('script');
    s.async = true;
    s.src = src;
    s.setAttribute('data-ca-tag', kind);
    document.head.appendChild(s);
  }

  function loadFromPlan() {
    var plan = currentPlan();
    if (typeof document === 'undefined') return plan;
    var t = testMode();
    if (plan.gtm && !started.gtm) {
      started.gtm = true;
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
      var consent = consentCommands();
      window.gtag.apply(null, consent.defaultCall);
      window.gtag.apply(null, consent.updateCall);
      if (t) addScript('gtm', 'js/tag-stub.js?kind=gtm');
      else if (ACTIVE.gtmId) addScript('gtm', 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(ACTIVE.gtmId));
    }
    if (plan.clarity && !started.clarity) {
      started.clarity = true;
      /* Clarity consent v2 is sent only if that script is actually started.
         A denied consentv2 signal is not a hard off; withdrawal reloads a fresh document. */
      window.clarity = window.clarity || function () { (window.clarity.q = window.clarity.q || []).push(arguments); };
      window.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' });
      if (t) addScript('clarity', 'js/tag-stub.js?kind=clarity');
      else if (ACTIVE.clarityId) addScript('clarity', 'https://www.clarity.ms/tag/' + encodeURIComponent(ACTIVE.clarityId));
    }
    return plan;
  }

  function freshOff() {
    if (typeof location === 'undefined' || !location.replace) return;
    location.replace(location.pathname + (location.hash || ''));
  }

  function track(name, params) {
    var ev = buildEvent(name, params);
    if (!ev) return null;
    log.push(ev);
    if (currentPlan().gtm && window.dataLayer) window.dataLayer.push(ev);
    return ev;
  }

  function applyChoice(next) {
    var priorOn = !!(state.analytics || state.replay || started.gtm || started.clarity);
    state.analytics = next.analytics === true && !signalOptOut();
    state.replay = next.replay === true && !signalOptOut();
    state.chosen = true;
    writeStore();
    track('consent_choice', { analytics: state.analytics, replay: state.replay });
    if (priorOn && !state.analytics && !state.replay) {
      freshOff();
      return;
    }
    loadFromPlan();
  }

  function bindNotice() {
    if (typeof document === 'undefined') return;
    var n = document.querySelector('[data-cookie-notice]');
    if (!n) return;
    var box = n.querySelector('[data-cookie-customize]');
    var saved = readStore();
    if (signalOptOut()) state = { analytics: false, replay: false, chosen: false };
    else if (saved) state = { analytics: saved.analytics, replay: saved.replay, chosen: true };
    var replayInput = n.querySelector('[data-purpose="replay"]');
    var replayBlocked = !!CLARITY_BLOCKED[currentPage()] || clientInputInDom();
    if (replayInput && replayBlocked) {
      replayInput.disabled = true;
      replayInput.checked = false;
      var label = replayInput.parentNode;
      if (label) label.appendChild(document.createTextNode(' This page keeps a form, so replay stays off here.'));
    }
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
      if (kind === 'accept') applyChoice({ analytics: true, replay: true });
      if (kind === 'reject') applyChoice({ analytics: false, replay: false });
      if (kind === 'save') {
        var a = n.querySelector('[data-purpose="analytics"]');
        var r = n.querySelector('[data-purpose="replay"]');
        var replay = r && !r.disabled ? !!r.checked : state.replay;
        applyChoice({ analytics: !!(a && a.checked), replay: replay });
      }
      if (kind === 'accept' || kind === 'reject' || kind === 'save') {
        var text = n.querySelector('[data-cookie-text]');
        if (text) text.textContent = 'Choice saved on this browser. This preview does not contact Google or Microsoft. Withdrawing a yes saves the denial and opens a fresh copy of the page with the tags blocked.';
        if (box) box.hidden = true;
      }
    });
    if (state.chosen && (state.analytics || state.replay)) loadFromPlan();
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
    planLoads: planLoads,
    consentCommands: consentCommands,
    debugLog: function () { return log.slice(); },
    tagsEnabled: function () { return ACTIVE.tagsEnabled; },
    activation: function () { return ACTIVE.activation; },
    productionGa4Id: CANDIDATE_GA4_ID,
    productionGtmId: CANDIDATE_GTM_ID,
    clarityConfigured: function () { return ACTIVE.clarityId.length > 0; },
    replayPermitted: function () { return currentPlan().clarity; },
    hardLoadGate: function () { return currentPlan().gtm; },
    clientInputInDom: clientInputInDom,
    gaBlocked: GA_BLOCKED,
    clarityBlocked: CLARITY_BLOCKED
  };
});
