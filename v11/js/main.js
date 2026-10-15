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
    var canHide = function () { return !document.body.classList.contains('menu-open') && !header.contains(document.activeElement); };
    var setHidden = function (h) { header.classList.toggle('is-hidden', h && canHide()); };
    var onHeaderScroll = function () {
      var y = Math.max(0, window.scrollY);
      if (y <= hideAfter()) setHidden(false);
      else if (y > lastY) setHidden(true);
      else if (y < lastY) setHidden(false);
      lastY = y; ticking = false;
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; window.requestAnimationFrame(onHeaderScroll); } }, { passive: true });
    header.addEventListener('focusin', function () { header.classList.remove('is-hidden'); });
    // Anchor jumps: show the header and re-baseline, so it can never be left stuck hidden over the target
    var jumped = function () { header.classList.remove('is-hidden'); window.requestAnimationFrame(function () { lastY = window.scrollY; }); };
    window.addEventListener('hashchange', jumped);
    document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('a[href^="#"]'); if (a) jumped(); });
    window.addEventListener('keydown', function (e) { if (e.key === 'Tab') header.classList.remove('is-hidden'); });
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
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      form.classList.add('is-sent');
      var ok = form.nextElementSibling;
      if (ok) ok.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });

  /* Trip type toggle: hide the return date for one-way trips */
  document.querySelectorAll('input[name="trip-type"]').forEach(function (r) {
    r.addEventListener('change', function () {
      var ret = document.querySelector('[data-return-date]');
      if (ret) ret.style.display = (r.value === 'one-way' && r.checked) ? 'none' : '';
    });
  });
})();
