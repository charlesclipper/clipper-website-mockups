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
      lastY = Math.max(0, window.scrollY); upAcc = 0;
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
    /* Reveal buffer (V15): once hidden by scrolling down, the header only returns after the user has scrolled UP by a
       cumulative distance (about 120px desktop, 80px mobile). The upward total resets whenever direction flips to down. */
    var upAcc = 0;
    var revealDist = function () { return window.matchMedia('(max-width: 900px)').matches ? 80 : 120; };
    var onHeaderScroll = function () {
      var y = Math.max(0, window.scrollY);
      if (navLock) { header.classList.remove('is-hidden'); lastY = y; upAcc = 0; ticking = false; return; }
      var dy = y - lastY;
      if (dy > 0) {
        upAcc = 0;
        if (y <= hideAfter()) setHidden(false); else setHidden(true);
      } else if (dy < 0) {
        upAcc += -dy;
        if (y <= hideAfter() || upAcc >= revealDist()) setHidden(false);
      } else if (y <= hideAfter()) setHidden(false);
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
    document.addEventListener('ca:nav-start', startLock);   // accordion expansion asks for the same lock
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
        Native scroll-snap (horizontal, inside the card scroller only) handles touch swipe; mouse drag is added below. */
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

    /* Auto-advance (Fleet, Service and Safety scrollers only): next card after 10s idle, looping to the first card.
       Runs only while the scroller is in the viewport and its section is expanded. Any interaction restarts the 10s;
       hover or focus inside pauses it. Off entirely under prefers-reduced-motion. A visible pause/play button (WCAG 2.2.2)
       stops it for good until pressed again. The slide counter is only announced (polite) for user actions, never for auto-advance. */
    if (root.classList.contains('attr-carousel')) (function () {
      var IDLE = 10000, reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
      var timer = 0, hovering = false, focused = false, inView = false, userPaused = false, liveTimer = 0;
      var ctr = root.querySelector('[data-counter]'), live = ctr && ctr.closest('[aria-live]');
      var arrows = root.querySelector('.carousel-arrows');
      var btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'carousel-pause'; btn.setAttribute('aria-pressed', 'false');
      btn.setAttribute('aria-label', 'Pause automatic card advance'); btn.title = 'Pause automatic card advance';
      btn.innerHTML = '<svg class="mq-ico mq-ico-pause" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M2 1h3v10H2zM7 1h3v10H7z" fill="currentColor"/></svg><svg class="mq-ico mq-ico-play" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M2 1l9 5-9 5z" fill="currentColor"/></svg>';
      if (arrows) arrows.appendChild(btn);
      function expanded() { var pn = root.closest('.acc-panel'); return !pn || pn.classList.contains('is-open'); }
      function canRun() { return !reduceMQ.matches && !userPaused && !hovering && !focused && inView && expanded() && !document.hidden; }
      function schedule() { window.clearTimeout(timer); timer = 0; if (canRun()) timer = window.setTimeout(tick, IDLE); }
      function tick() {
        timer = 0;
        if (!canRun()) return;
        if (live) { live.setAttribute('aria-live', 'off'); window.clearTimeout(liveTimer); liveTimer = window.setTimeout(function () { live.setAttribute('aria-live', 'polite'); }, 1500); }
        root.dataset.autoAdvanced = String((+root.dataset.autoAdvanced || 0) + 1);
        step(1);
        schedule();
      }
      // Interaction resets the idle timer
      ['pointerdown', 'touchstart', 'keydown', 'wheel', 'click'].forEach(function (ev) { root.addEventListener(ev, schedule, { passive: true }); });
      root.addEventListener('mouseenter', function () { hovering = true; schedule(); });
      root.addEventListener('mouseleave', function () { hovering = false; schedule(); });
      root.addEventListener('focusin', function (e) { focused = !!(e.target.matches && e.target.matches(':focus-visible')); schedule(); });   // keyboard focus pauses; a mouse click leaving focus on a button does not
      root.addEventListener('focusout', function (e) { if (!e.relatedTarget || !root.contains(e.relatedTarget)) { focused = false; schedule(); } });
      btn.addEventListener('click', function () {
        userPaused = !userPaused;
        btn.setAttribute('aria-pressed', String(userPaused));
        var l = userPaused ? 'Play automatic card advance' : 'Pause automatic card advance';
        btn.setAttribute('aria-label', l); btn.title = l;
        schedule();
      });
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (en) { inView = en[0].isIntersecting; schedule(); }, { threshold: 0.4 }).observe(root);
      } else { inView = true; }
      document.addEventListener('ca:acc-change', schedule);
      document.addEventListener('visibilitychange', schedule);
      if (reduceMQ.addEventListener) reduceMQ.addEventListener('change', schedule);
      schedule();
    })();
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

  /* 3c. Accordions: Fleet, Service and Safety are collapsed by default. Real buttons (aria-expanded, aria-controls);
         the collapsed panel is inert (out of tab order and the accessibility tree) and animates with grid rows
         (instant under prefers-reduced-motion). Intro boxes, header and footer links, and #fleet / #service / #safety
         (or anything inside them) in the URL expand the matching section, then land on it once the animation ends. */
  (function () {
    var secs = Array.prototype.slice.call(document.querySelectorAll('[data-acc]'));
    if (!secs.length) return;
    var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
    function parts(sec) { return { btn: sec.querySelector('.acc-toggle'), panel: sec.querySelector('.acc-panel'), hint: sec.querySelector('[data-acc-hint]') }; }
    function isOpen(sec) { return parts(sec).panel.classList.contains('is-open'); }
    function setOpen(sec, open, done) {
      var q = parts(sec), p = q.panel;
      if (isOpen(sec) === open) { if (done) done(); return; }
      q.btn.setAttribute('aria-expanded', String(open));
      q.hint.textContent = open ? 'Click to collapse' : 'Click to expand';
      p.classList.remove('is-settled');
      if (open) { p.removeAttribute('inert'); p.classList.add('is-open'); }
      else { p.setAttribute('inert', ''); p.classList.remove('is-open'); }
      document.dispatchEvent(new CustomEvent('ca:acc-change', { detail: { id: sec.id, open: open } }));
      var finished = false;
      function fin(e) {
        if (finished || (e && (e.target !== p || e.propertyName !== 'grid-template-rows'))) return;
        finished = true; p.removeEventListener('transitionend', fin);
        if (open) p.classList.add('is-settled');
        document.dispatchEvent(new CustomEvent('ca:acc-change', { detail: { id: sec.id, open: open, settled: true } }));
        if (done) done();
      }
      if (reduceMQ.matches) { fin(); return; }
      p.addEventListener('transitionend', fin);
      window.setTimeout(fin, 750);
    }
    function landOn(sec) {
      // wait for any browser scroll to rest, then correct the position if the expansion moved the target
      var last = -1, same = 0, n = 0;
      var iv = window.setInterval(function () {
        var y = Math.round(window.scrollY); same = (y === last) ? same + 1 : 0; last = y; n++;
        if (same >= 3 || n > 40) {
          window.clearInterval(iv);
          var mt = (parseFloat(getComputedStyle(sec).scrollMarginTop) || 0) + (parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0);
          var want = Math.round(sec.getBoundingClientRect().top + window.scrollY - mt);
          if (Math.abs(want - window.scrollY) > 2) window.scrollTo({ top: want, behavior: reduceMQ.matches ? 'auto' : 'smooth' });
        }
      }, 50);
    }
    function reveal(hash) {
      var id = (hash || '').replace(/^#/, '');
      if (!id) return false;
      var el; try { el = document.getElementById(decodeURIComponent(id)); } catch (err) { return false; }
      var sec = el && el.closest('[data-acc]');
      if (!sec) return false;
      document.dispatchEvent(new Event('ca:nav-start'));
      setOpen(sec, true, function () { landOn(sec); });
      return true;
    }
    secs.forEach(function (sec) {
      var q = parts(sec);
      q.btn.addEventListener('click', function () { setOpen(sec, !isOpen(sec)); });
    });
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href*="#"]');
      if (!a) return;
      try {
        var u = new URL(a.href, window.location.href);
        if (u.hash && u.origin === window.location.origin && u.pathname === window.location.pathname) reveal(u.hash);
      } catch (err) { /* ignore */ }
    });
    window.addEventListener('hashchange', function () { reveal(window.location.hash); });
    if (window.location.hash) reveal(window.location.hash);
  })();

  /* 3d. Partner logo marquee: seamless loop (the second set is aria-hidden and not focusable), pauses on hover and focus,
         has a visible pause/play button (WCAG 2.2.2). CSS keeps it static under prefers-reduced-motion. About 28px per second. */
  (function () {
    var mq = document.querySelector('[data-marquee]');
    if (!mq) return;
    var track = mq.querySelector('.marquee-track'), set = mq.querySelector('.marquee-set');
    var btn = document.querySelector('[data-marquee-toggle]'), label = btn && btn.querySelector('[data-marquee-label]');
    var SPEED = 28, raf = 0;
    function size() { raf = 0; var w = set.getBoundingClientRect().width; if (w > 0) track.style.setProperty('--marquee-dur', (w / SPEED).toFixed(1) + 's'); }
    function queue() { if (!raf) raf = window.requestAnimationFrame(size); }
    window.addEventListener('resize', queue); window.addEventListener('load', queue); queue();
    if (btn) btn.addEventListener('click', function () {
      var paused = mq.classList.toggle('is-paused');
      btn.setAttribute('aria-pressed', String(paused));
      if (label) label.textContent = paused ? 'Play logos' : 'Pause logos';
    });
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
