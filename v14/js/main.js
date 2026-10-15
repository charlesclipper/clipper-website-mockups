/* =====================================================================
   Clipper Aviation: Website Mockup V1 interactions
   Vanilla JS, no dependencies. Every feature is opt-in via data attributes.
   ===================================================================== */
(function () {
  'use strict';

  /* 1. Sticky header: transparent over the hero, solid once you scroll.
        Pages without a photo hero set <body data-header="solid">. */
  var header = document.querySelector('.site-header');
  function onScroll() {
    if (!header) return;
    var forceSolid = true; // V2: header is always solid (Charles feedback)
    header.classList.toggle('is-solid', forceSolid || window.scrollY > 40);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* 1b. Hide-on-scroll header (V10): visible at the top and within its own height; slides out when scrolling
         down past it; slides back on any upward scroll. Never hidden while the mobile menu is open or while
         focus is inside the header (keyboard users). */
  if (header) {
    var lastY = window.scrollY, ticking = false;
    var hideAfter = function () { return header.offsetHeight; };
    var canHide = function () { return !document.body.classList.contains('menu-open') && !document.body.classList.contains('modal-open') && !header.querySelector(':focus-visible'); };
    var setHidden = function (h) { header.classList.toggle('is-hidden', h && canHide()); };
    /* Anchor navigation lock: while a link-triggered jump / smooth scroll is in flight the header stays put
       (visible, stuck to the top). The lock clears on scrollend, when the scroll position has settled, after a hard
       cap, or on the first manual input (wheel, touch, scroll keys, pointer press). Clearing re-baselines lastY so
       only a later manual scroll down past the header height hides it again. */
    var navLock = false, lockPoll = 0, lockCap = 0, lockStart = 0;
    var releaseLock = function () {
      if (!navLock) return;
      navLock = false; window.clearInterval(lockPoll); window.clearTimeout(lockCap);
      lastY = Math.max(0, window.scrollY);
    };
    var startLock = function () {
      navLock = true; lockStart = Date.now(); header.classList.remove('is-hidden');
      window.clearInterval(lockPoll); window.clearTimeout(lockCap);
      var prev = -1, still = 0;
      lockPoll = window.setInterval(function () {
        var y = Math.round(window.scrollY);
        still = (y === prev) ? still + 1 : 0; prev = y;
        if (still >= 4 && Date.now() - lockStart > 600) releaseLock();   // settled for about 200ms (and at least 600ms in)
      }, 50);
      lockCap = window.setTimeout(releaseLock, 3000);   // hard cap for very long smooth scrolls
    };
    var onHeaderScroll = function () {
      var y = Math.max(0, window.scrollY);
      if (navLock) { header.classList.remove('is-hidden'); lastY = y; ticking = false; return; }
      if (y <= hideAfter()) setHidden(false);
      else if (y > lastY) setHidden(true);
      else if (y < lastY) setHidden(false);
      lastY = y; ticking = false;
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; window.requestAnimationFrame(onHeaderScroll); } }, { passive: true });
    if ('onscrollend' in window) window.addEventListener('scrollend', releaseLock);
    header.addEventListener('focusin', function () { if (header.querySelector(':focus-visible')) header.classList.remove('is-hidden'); });
    // Any link to a hash on this page (#x or page.html#x), from the header, dropdown, mobile menu or footer
    var samePageHash = function (a) {
      try { var u = new URL(a.href, window.location.href); return !!u.hash && u.origin === window.location.origin && u.pathname === window.location.pathname; }
      catch (err) { return false; }
    };
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href*="#"]');
      if (a && samePageHash(a)) startLock();
    });
    window.addEventListener('hashchange', startLock);
    var hashOnLoad = function () { if (window.location.hash && document.querySelector(window.location.hash.replace(/[^#\w-]/g, ''))) startLock(); };
    hashOnLoad();
    window.addEventListener('load', hashOnLoad);   // the browser's own jump to the hash can land after load (images, fonts)
    // First manual input ends the lock immediately (and cancels any pending smooth scroll in the browser)
    ['wheel', 'touchstart', 'pointerdown'].forEach(function (t) { window.addEventListener(t, function (e) { if (navLock && !(e.target.closest && e.target.closest('a[href*="#"]'))) releaseLock(); }, { passive: true }); });
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') header.classList.remove('is-hidden');
      if (navLock && ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ', 'Spacebar'].indexOf(e.key) > -1) releaseLock();
    });
    onHeaderScroll();
  }

  /* 2. Mobile menu */
  var menu = document.querySelector('.mobile-menu');
  function setMenu(open) {
    if (!menu) return;
    menu.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    document.querySelectorAll('[data-menu-open]').forEach(function (b) { b.setAttribute('aria-expanded', String(open)); });
  }
  document.querySelectorAll('[data-menu-open]').forEach(function (b) { b.addEventListener('click', function () { setMenu(true); }); });
  document.querySelectorAll('[data-menu-close], .mobile-menu a').forEach(function (b) { b.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  /* 3. Carousels: <div data-carousel> containing .carousel-track > .slide,
        plus optional [data-prev], [data-next], .carousel-dots.
        Native scroll-snap handles touch swipe; mouse drag is added below. */
  document.querySelectorAll('[data-carousel]').forEach(function (root) {
    var track = root.querySelector('.carousel-track');
    var slides = Array.prototype.slice.call(track.children);
    var dotsWrap = root.querySelector('.carousel-dots');
    var dots = [];

    function current() {
      var startAligned = root.classList.contains('attr-carousel');
      var center = startAligned ? track.scrollLeft + track.offsetLeft : track.scrollLeft + track.clientWidth / 2, best = 0, bestD = Infinity;
      slides.forEach(function (s, i) {
        var d = Math.abs((startAligned ? s.offsetLeft : s.offsetLeft + s.offsetWidth / 2) - center);
        if (d < bestD) { bestD = d; best = i; }
      });
      return best;
    }
    function goTo(i) {
      i = (i + slides.length) % slides.length; // wrap around
      var s = slides[i];
      // respect prefers-reduced-motion: jump instead of animating
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var align = root.classList.contains('attr-carousel') ? s.offsetLeft - track.offsetLeft : s.offsetLeft - (track.clientWidth - s.offsetWidth) / 2;
      track.scrollTo({ left: align, behavior: reduce ? 'auto' : 'smooth' });
    }
    function update() {
      var c = current();
      dots.forEach(function (d, i) { d.setAttribute('aria-current', i === c ? 'true' : 'false'); });
      var ctr = root.querySelector('[data-counter]');
      if (ctr) { var t = (c + 1) + ' / ' + slides.length; if (ctr.textContent !== t) ctr.textContent = t; }
    }
    if (dotsWrap) {
      slides.forEach(function (_, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', 'Go to slide ' + (i + 1));
        b.addEventListener('click', function () { goTo(i); });
        dotsWrap.appendChild(b); dots.push(b);
      });
    }
    var prev = root.querySelector('[data-prev]'), next = root.querySelector('[data-next]');
    // step(): base on the last requested slide while a smooth scroll is still running, so quick repeated presses advance one card each
    var pending = null, pendingTimer = null;
    function step(d) {
      var base = pending !== null ? pending : current();
      pending = (base + d + slides.length) % slides.length;
      goTo(pending);
      clearTimeout(pendingTimer); pendingTimer = setTimeout(function () { pending = null; }, 700);
    }
    if (prev) prev.addEventListener('click', function () { step(-1); });
    if (next) next.addEventListener('click', function () { step(1); });
    track.addEventListener('scroll', function () { window.requestAnimationFrame(update); }, { passive: true });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    });

    // Mouse drag-to-swipe (desktop)
    var down = false, startX = 0, startLeft = 0;
    track.addEventListener('mousedown', function (e) { down = true; startX = e.pageX; startLeft = track.scrollLeft; track.classList.add('dragging'); });
    window.addEventListener('mouseup', function () {
      if (!down) return; down = false; track.classList.remove('dragging'); goTo(current());
    });
    track.addEventListener('mousemove', function (e) { if (!down) return; e.preventDefault(); track.scrollLeft = startLeft - (e.pageX - startX); });

    update();
  });


  /* 3b. Service and Safety scroller cards = Fleet scroller card size.
         Desktop: the Fleet card spans its text block, so copy its height to the other card (--card-h).
         Stacked layout: use the tallest natural height of the sections for all. Re-runs on resize, font and image load. */
  (function () {
    var fleet = document.querySelector('#fleet .attr-track');
    var others = ['#service', '#safety'].map(function (id) { return document.querySelector(id + ' .attr-track'); }).filter(Boolean);
    if (!fleet || !others.length) return;
    var fc = fleet.closest('.attr-carousel'), raf = 0;
    function sync() {
      raf = 0;
      var stacked = window.matchMedia('(max-width: 900px)').matches;
      fc.style.removeProperty('--card-h');
      others.forEach(function (o) { o.closest('.attr-carousel').style.removeProperty('--card-h'); o.style.minHeight = '0'; });
      fleet.style.minHeight = '0';
      var h;
      if (stacked) {
        h = fleet.getBoundingClientRect().height;
        others.forEach(function (o) { h = Math.max(h, o.scrollHeight, o.getBoundingClientRect().height); });
      } else { h = fleet.getBoundingClientRect().height; }
      fleet.style.minHeight = '';
      others.forEach(function (o) { o.style.minHeight = ''; });
      if (h > 0) {
        var v = Math.ceil(h) + 'px';
        others.forEach(function (o) { o.closest('.attr-carousel').style.setProperty('--card-h', v); });
        if (stacked) fc.style.setProperty('--card-h', v);
      }
    }
    function queue() { if (!raf) raf = window.requestAnimationFrame(sync); }
    window.addEventListener('resize', queue);
    window.addEventListener('load', queue);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(queue);
    queue();
  })();

  /* 4. Fade-in on scroll: add class "reveal" to any element */
  var els = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(function (el) { io.observe(el); });
  } else { els.forEach(function (el) { el.classList.add('is-visible'); }); }

  /* 5. Forms are FRONT-END ONLY in the mockup: nothing is sent.
        The developer wires [data-mock-form] to the real endpoint (CRM / email). */
  document.querySelectorAll('[data-mock-form]').forEach(function (form) {
    function clearErrors() {
      form.querySelectorAll('.field-error').forEach(function (n) { n.remove(); });
      form.querySelectorAll('[aria-invalid]').forEach(function (f) { f.removeAttribute('aria-invalid'); f.removeAttribute('aria-describedby'); });
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearErrors();
      var bad = Array.prototype.filter.call(form.elements, function (f) { return f.willValidate && !f.checkValidity(); });
      if (bad.length) {
        bad.forEach(function (f) {
          var id = (f.id || f.name) + '-err', msg = document.createElement('p');
          msg.className = 'field-error'; msg.id = id;
          msg.textContent = f.validity.valueMissing ? 'Please fill in this field.' : (f.validationMessage || 'Please check this field.');
          f.setAttribute('aria-invalid', 'true'); f.setAttribute('aria-describedby', id);
          f.parentNode.appendChild(msg);
        });
        bad[0].focus();
        return;
      }
      form.classList.add('is-sent');
      var ok = form.nextElementSibling;
      if (ok) { if (!ok.hasAttribute('tabindex')) ok.setAttribute('tabindex', '-1'); ok.focus({ preventScroll: true }); }
    });
    form.addEventListener('input', function (e) {
      var f = e.target, err = f.parentNode && f.parentNode.querySelector('.field-error');
      if (err && f.checkValidity()) { err.remove(); f.removeAttribute('aria-invalid'); f.removeAttribute('aria-describedby'); }
    });
    form._resetMock = function () { clearErrors(); form.reset(); form.classList.remove('is-sent'); var r = form.querySelector('[data-return-date]'); if (r) r.style.display = ''; };
  });

  /* 5b. Quote request modal (opened by any [data-quote-open]).
         Dialog semantics: focus moves in on open and returns to the trigger on close; Tab is trapped; Escape,
         the close button and the backdrop all close it; page scroll is locked while open. The header stays
         visible (body.modal-open pins it), so nothing is hidden behind the hide-on-scroll behaviour. */
  (function () {
    var modal = document.getElementById('quote-modal');
    if (!modal) return;
    var dialog = modal.querySelector('.quote-dialog'), trigger = null;
    var inertTargets = function () { return Array.prototype.slice.call(document.querySelectorAll('main, footer, .site-header, .mobile-menu, .mockup-badge')); };
    function focusables() {
      return Array.prototype.filter.call(dialog.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'),
        function (n) { return n.offsetParent !== null || n === document.activeElement; });
    }
    function openModal(from) {
      if (!modal.hidden) return;
      trigger = from || document.activeElement;
      // opened from the mobile menu: close the menu first and return focus to its toggle
      if (trigger && trigger.closest && trigger.closest('.mobile-menu')) { setMenu(false); trigger = document.querySelector('[data-menu-open]') || trigger; }
      var f = dialog.querySelector('[data-mock-form]'); if (f && f._resetMock) f._resetMock();
      var sbw = window.innerWidth - document.documentElement.clientWidth;
      document.documentElement.style.setProperty('--sbw', sbw + 'px');
      modal.hidden = false;
      document.body.classList.add('modal-open');
      if (header) header.classList.remove('is-hidden');
      inertTargets().forEach(function (n) { n.setAttribute('inert', ''); });
      window.requestAnimationFrame(function () { modal.classList.add('is-open'); });
      var first = dialog.querySelector('input:not([type="radio"]), select, textarea') || focusables()[0];
      dialog.setAttribute('tabindex', '-1');
      (first || dialog).focus({ preventScroll: true });
      dialog.scrollTop = 0;
    }
    function closeModal() {
      if (modal.hidden) return;
      modal.classList.remove('is-open');
      var done = function () {
        modal.hidden = true;
        document.body.classList.remove('modal-open');
        document.documentElement.style.removeProperty('--sbw');
        inertTargets().forEach(function (n) { n.removeAttribute('inert'); });
        if (trigger && document.contains(trigger)) trigger.focus();
        trigger = null;
      };
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce) done(); else window.setTimeout(done, 220);
    }
    document.querySelectorAll('[data-quote-open]').forEach(function (b) {
      b.addEventListener('click', function (e) { e.preventDefault(); openModal(b); });
    });
    modal.querySelectorAll('[data-quote-close]').forEach(function (b) { b.addEventListener('click', closeModal); });
    document.addEventListener('keydown', function (e) {
      if (modal.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); closeModal(); return; }
      if (e.key === 'Tab') {
        var f = focusables(); if (!f.length) { e.preventDefault(); return; }
        var first = f[0], last = f[f.length - 1], a = document.activeElement;
        if (!dialog.contains(a)) { e.preventDefault(); first.focus(); }
        else if (e.shiftKey && (a === first || a === dialog)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
      }
    }, true);
  })();

  /* Trip type toggle: hide the return date for one-way trips */
  document.querySelectorAll('input[name="trip-type"]').forEach(function (r) {
    r.addEventListener('change', function () {
      var ret = document.querySelector('[data-return-date]');
      if (ret) ret.style.display = (r.value === 'one-way' && r.checked) ? 'none' : '';
    });
  });
})();
