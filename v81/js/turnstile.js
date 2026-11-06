/* V39 change 20: bot protection for the two request forms (Request a Quote popup, Maintenance service request).
 *
 * WHAT IT DOES
 *  1. Cloudflare Turnstile, managed mode, "interaction-only" (invisible unless Cloudflare needs the visitor to do something).
 *     The widget script is loaded only when a form is about to be used (the popup opens, or the Maintenance form scrolls near the screen),
 *     so it adds nothing to the initial page load.
 *  2. The submit button stays disabled until Turnstile has issued a token. Token expiry or a reset disables it again.
 *  3. Honeypot input (company_website, off-screen, tabindex -1, aria-hidden). If it is filled the form shows its normal "thank you"
 *     state but nothing is handed off (js/jetinsight.js and the future endpoint must check form.dataset.botFlag).
 *  4. Minimum time to submit: 3 seconds after the form is shown (popup open / form first near the screen).
 *
 * SITEKEY: 1x00000000000000000000AA is Cloudflare's always-pass TEST key. It is NOT protection. A developer must create the real sitekey and secret
 * in Clipper's Cloudflare account (change the data-sitekey attribute on both forms) and verify the token SERVER-SIDE with
 * https://challenges.cloudflare.com/turnstile/v0/siteverify (field cf-turnstile-response). The checks here run in the browser and do not stop bots by themselves.
 */
(function () {
  'use strict';
  var SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  var MIN_MS = 3000;
  var loading = null;

  function loadApi() {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = SRC; s.async = true; s.defer = true;
      s.onload = function () { window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile missing')); };
      s.onerror = function () { loading = null; reject(new Error('turnstile blocked')); };
      document.head.appendChild(s);
    });
    return loading;
  }

  function setup(form) {
    var wrap = form.querySelector('[data-ts-wrap]'); if (!wrap) return;
    var box = wrap.querySelector('[data-turnstile]'), status = wrap.querySelector('[data-ts-status]');
    var btn = form.querySelector('[data-ts-submit]'), hp = form.querySelector('input[name="company_website"]');
    var widgetId = null, started = Date.now(), rendered = false;

    function say(t) { status.textContent = t; status.hidden = !t; }
    function lock() { btn.disabled = true; }
    function unlock() { btn.disabled = false; say(''); }
    function render() {
      if (rendered) return; rendered = true;
      loadApi().then(function (ts) {
        widgetId = ts.render(box, {
          sitekey: box.getAttribute('data-sitekey'),
          appearance: 'interaction-only', theme: 'light', size: 'flexible', language: 'auto',
          callback: unlock,
          'expired-callback': function () { lock(); say('Security check expired. Please wait a moment.'); },
          'timeout-callback': function () { lock(); say('Security check timed out. Please wait a moment.'); },
          'error-callback': function () { lock(); say('The security check could not load. Please call +1 (855) 463-5999 or email info@clipperaviation.com.'); }
        });
      }).catch(function () {
        say('The security check could not load. Please call +1 (855) 463-5999 or email info@clipperaviation.com.');
      });
    }

    form._botCheck = function () {
      var msg = form.querySelector('.ts-msg'); if (msg) msg.remove();
      if (hp && hp.value) {                       // bot: look like success, send nothing
        form.dataset.botFlag = '1';
        form.classList.add('is-sent'); return true;
      }
      if (Date.now() - started < MIN_MS) {
        var m = document.createElement('div'); m.className = 'form-summary full ts-msg'; m.setAttribute('role', 'alert');
        m.textContent = 'Please give us a moment to check the form, then press the button again.';
        var row = btn.closest('.full'); form.insertBefore(m, row || null); return false;
      }
      var tok = form.querySelector('[name="cf-turnstile-response"]');
      if (!tok || !tok.value) return false;
      return true;
    };

    var origReset = form._resetMock;
    form._resetMock = function () {
      if (origReset) origReset();
      delete form.dataset.botFlag;
      var msg = form.querySelector('.ts-msg'); if (msg) msg.remove();
      started = Date.now(); lock(); say('Security check in progress\u2026');
      if (widgetId !== null && window.turnstile) { try { window.turnstile.reset(widgetId); } catch (e) {} }
    };

    // The popup form: start when the popup opens. The Maintenance form: start when it nears the viewport.
    var modal = form.closest('#quote-modal');
    if (modal) {
      var go = function () { if (!modal.hidden) { started = Date.now(); render(); } };
      new MutationObserver(go).observe(modal, { attributes: true, attributeFilter: ['hidden'] });
      go();
    } else if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (en) {
        if (en.some(function (e) { return e.isIntersecting; })) { io.disconnect(); started = Date.now(); render(); }
      }, { rootMargin: '300px 0px' });
      io.observe(form);
    } else { render(); }
  }

  document.querySelectorAll('form[data-mock-form]').forEach(setup);
})();
