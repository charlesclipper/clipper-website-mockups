/* Clipper Aviation: Request a Quote popup, JetInsight hand-off (V35 change 32).
 * Read /JETINSIGHT_NOTES.md (in the project folder, not published) before changing anything here.
 *
 * WHAT THIS FILE DOES
 *  1. Runs the trip-type toggle and the repeatable "legs" (From, To, Depart date, Start time, Remove) in the popup form [data-jetinsight].
 *  2. Builds one payload object from the form (see buildPayload) in the shape of a JetInsight trip request: a list of legs plus passengers and contact.
 *  3. Hands the payload off. TEST MODE (the default, live:false) never touches the network: it only stores the payload in
 *     window.JetInsight.lastPayload and logs it to the console, so the mockup can be reviewed safely.
 *
 * GOING LIVE (a developer, after JetInsight confirms the points in the notes file):
 *  - Option A "iframe": set live:true and mode:'iframe'. The popup then shows JetInsight's own official form (cross-origin iframe, so it keeps
 *    JetInsight's styling and cannot be restyled from our page). This is the only route that is known to work without JetInsight's help.
 *  - Option B "post": set live:true and mode:'post' and fill in endpoint with the URL JetInsight gives you for API/form posts. The field names in
 *    buildPayload are our best guess and must be mapped to the real parameter names. Cross-origin POSTs also need CORS to be allowed by JetInsight.
 *
 * No secret keys belong in this file. operatorId is the public id that is already in the embed script on the live site.
 */
(function () {
  'use strict';

  var cfg = window.JETINSIGHT_CONFIG = Object.assign({
    live: false,                       // JETINSIGHT_LIVE: false = test mode, nothing is sent. Keep false in the mockup.
    mode: 'iframe',                    // 'iframe' (official embed) or 'post' (own form posting to endpoint). Only used when live is true.
    operatorId: '103b7e72-0f68-4bc7-8657-9b08e59e6e59',   // public id from https://client.jetinsight.com/embed/<id>/Web-Request.js on the live site
    operatorSlug: 'envol-jets-inc',    // slug used inside that script's iframe URL on the live site (to be confirmed with JetInsight)
    embedBase: 'https://client.jetinsight.com/embed/',
    endpoint: '',                      // unknown until JetInsight confirms (mode 'post'); left empty on purpose
    prefillParams: {}                  // unknown: the live script ends its iframe URL with "?" and no parameters. Document any that JetInsight confirms.
  }, window.JETINSIGHT_CONFIG || {});

  var form = document.querySelector('form[data-jetinsight]');
  if (!form) return;
  var legsBox = form.querySelector('[data-legs]');
  var addBtn = form.querySelector('[data-leg-add]');
  var note = form.querySelector('[data-ji-note]');
  var MAX_LEGS = 6;

  function legs() { return Array.prototype.slice.call(legsBox.querySelectorAll('[data-leg]')); }
  function tripType() { var r = form.querySelector('input[name="trip-type"]:checked'); return r ? r.value : 'round-trip'; }

  /* Number the legs and keep ids, labels and names unique after any add or remove */
  function renumber() {
    var all = legs(), multi = tripType() === 'multi-leg';
    all.forEach(function (leg, i) {
      var n = i + 1;
      leg.querySelector('legend').textContent = 'Leg ' + n;
      [['from', 'From', 'q-from-'], ['to', 'To', 'q-to-'], ['date', 'Depart (date)', 'q-date-'], ['time', 'Start time', 'q-time-']].forEach(function (d) {
        var inp = leg.querySelector('input[name^="' + d[0] + '-"]'), lab = inp.parentNode.querySelector('label');
        inp.id = d[2] + n; inp.name = d[0] + '-' + n; lab.setAttribute('for', inp.id);
        inp.setAttribute('data-label', 'Leg ' + n + ' ' + (d[0] === 'time' ? 'start time' : d[0]));
      });
      var rm = leg.querySelector('[data-leg-remove]');
      rm.setAttribute('aria-label', 'Remove leg ' + n);
      rm.hidden = !(multi && all.length > 1);
    });
    addBtn.hidden = !multi || all.length >= MAX_LEGS;
  }

  function clearLegErrors(leg) {
    leg.querySelectorAll('.field-error').forEach(function (n) { n.remove(); });
    leg.querySelectorAll('[aria-invalid]').forEach(function (f) { f.removeAttribute('aria-invalid'); f.removeAttribute('aria-describedby'); });
  }

  function addLeg(prefill) {
    var all = legs(); if (all.length >= MAX_LEGS) return null;
    var src = all[all.length - 1], clone = src.cloneNode(true);
    clone.querySelectorAll('input').forEach(function (i) { i.value = ''; });
    clearLegErrors(clone);
    legsBox.appendChild(clone);
    if (prefill) {   // next leg starts where the last one ended
      clone.querySelector('input[name^="from-"]').value = src.querySelector('input[name^="to-"]').value;
    }
    renumber();
    return clone;
  }

  function setTripType() {
    var t = tripType(), all = legs();
    if (t === 'multi-leg') { /* keep what is there; the user adds or removes legs */ }
    else {
      var want = t === 'round-trip' ? 2 : 1;
      while (legs().length > want) legsBox.removeChild(legs()[legs().length - 1]);
      while (legs().length < want) addLeg(false);
      if (t === 'round-trip') mirrorReturn();
    }
    renumber();
  }

  /* Round trip: leg 2 flies leg 1 backwards until the user types in leg 2 themselves */
  function mirrorReturn() {
    if (tripType() !== 'round-trip') return;
    var a = legs(); if (a.length < 2) return;
    var f1 = a[0].querySelector('input[name^="from-"]'), t1 = a[0].querySelector('input[name^="to-"]');
    var f2 = a[1].querySelector('input[name^="from-"]'), t2 = a[1].querySelector('input[name^="to-"]');
    if (!f2.dataset.touched) f2.value = t1.value;
    if (!t2.dataset.touched) t2.value = f1.value;
  }

  form.querySelectorAll('input[name="trip-type"]').forEach(function (r) { r.addEventListener('change', setTripType); });
  addBtn.addEventListener('click', function () { var l = addLeg(true); if (l) l.querySelector('input').focus(); });
  legsBox.addEventListener('click', function (e) {
    var b = e.target.closest('[data-leg-remove]'); if (!b) return;
    var all = legs(), leg = b.closest('[data-leg]'), i = all.indexOf(leg);
    if (all.length < 2) return;
    legsBox.removeChild(leg);
    renumber();
    var rest = legs(); (rest[Math.min(i, rest.length - 1)].querySelector('input')).focus();   // focus stays inside the form
  });
  legsBox.addEventListener('input', function (e) {
    var n = e.target.name || '';
    if (/^(from|to)-2$/.test(n)) e.target.dataset.touched = '1';
    if (/^(from|to)-1$/.test(n)) mirrorReturn();
    if (/^date-1$/.test(n)) { var l = legs(); if (l.length > 1) l.slice(1).forEach(function (x) { var d = x.querySelector('input[type="date"]'); d.min = e.target.value || ''; }); }
  });
  (function () { var t = new Date(), m = ('0' + (t.getMonth() + 1)).slice(-2), d = ('0' + t.getDate()).slice(-2); legsBox.querySelectorAll('input[type="date"]').forEach(function (i) { i.min = t.getFullYear() + '-' + m + '-' + d; }); })();

  /* ---- hand-off ---- */
  function buildPayload() {
    var v = function (n) { var el = form.elements[n]; return el ? el.value.trim() : ''; };
    return {
      operator: cfg.operatorId,
      tripType: tripType(),
      legs: legs().map(function (leg, i) {
        var n = i + 1;
        return { from: v('from-' + n), to: v('to-' + n), departDate: v('date-' + n), startTime: v('time-' + n) };
      }),
      passengers: parseInt(v('passengers'), 10) || 1,
      contact: { name: v('name'), email: v('email'), phone: v('phone') },
      notes: v('notes')
    };
  }

  function embedUrl() {
    var q = Object.keys(cfg.prefillParams).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(cfg.prefillParams[k]); }).join('&');
    return cfg.embedBase + encodeURIComponent(cfg.operatorId) + '/Web-Request' + (q ? '?' + q : '');
  }

  function showIframe() {   // Option A: the official JetInsight form
    if (form.parentNode.querySelector('.ji-frame')) return;
    var f = document.createElement('iframe');
    f.className = 'ji-frame'; f.title = 'JetInsight request a quote form'; f.src = embedUrl(); f.loading = 'lazy';
    form.hidden = true; form.parentNode.insertBefore(f, form);
  }

  var JetInsight = window.JetInsight = { config: cfg, lastPayload: null, buildPayload: buildPayload, embedUrl: embedUrl };

  form.addEventListener('submit', function () {
    // main.js has already validated; it adds .is-sent only when every required field is valid.
    if (!form.classList.contains('is-sent')) return;
    var payload = buildPayload();
    JetInsight.lastPayload = payload;
    if (!cfg.live) { if (window.console) console.info('[JetInsight TEST MODE] nothing was sent. Payload:', payload); return; }
    if (cfg.mode === 'post' && cfg.endpoint) {
      fetch(cfg.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        .catch(function () { /* show an error state here once the real endpoint is known */ });
    }
  });

  var origReset = form._resetMock;
  form._resetMock = function () {
    if (origReset) origReset();
    form.querySelectorAll('input[data-touched]').forEach(function (i) { delete i.dataset.touched; });
    setTripType();
  };

  if (cfg.live && cfg.mode === 'iframe') showIframe();
  else if (note && !cfg.live) note.innerHTML = '&nbsp; Mockup: test mode, this form does not send.';
  setTripType();
})();
