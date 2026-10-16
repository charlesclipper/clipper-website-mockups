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

  /* 2. Mobile menu (V32, audit V30-04). Modal dialog behaviour: focus moves to the Close button on open, the page behind (header, main,
        footer, skip link, badge) is inert so Tab cannot reach it, Tab and Shift+Tab cycle inside the menu, Escape, the Close button and a
        link click close it and focus returns to the menu button. aria-expanded on the button always matches the state. */
  var menu = document.querySelector('.mobile-menu');
  var menuToggle = document.querySelector('[data-menu-open]');
  function menuIsOpen() { return !!menu && menu.classList.contains('is-open'); }
  function menuInertTargets() { return Array.prototype.slice.call(document.querySelectorAll('main, footer, .site-header, .skip-link, .mockup-badge')); }
  function menuFocusables() {
    return Array.prototype.filter.call(menu.querySelectorAll('a[href], button:not([disabled])'), function (n) { return n.getClientRects().length > 0; });
  }
  function setMenu(open, opts) {
    if (!menu || menuIsOpen() === open) return;
    menu.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    if (menuToggle) menuToggle.setAttribute('aria-expanded', String(open));
    if (open) {
      menuInertTargets().forEach(function (n) { n.setAttribute('inert', ''); });
      var f = menu.querySelector('[data-menu-close]') || menuFocusables()[0];
      if (f) f.focus({ preventScroll: true });
    } else {
      menuInertTargets().forEach(function (n) { n.removeAttribute('inert'); });
      if (!(opts && opts.restore === false) && menuToggle && menuToggle.getClientRects().length) menuToggle.focus({ preventScroll: true });
    }
  }
  if (menuToggle) menuToggle.addEventListener('click', function () { setMenu(!menuIsOpen()); });
  document.querySelectorAll('[data-menu-close], .mobile-menu a').forEach(function (b) { b.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) {
    if (!menuIsOpen()) return;
    if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); setMenu(false); return; }
    if (e.key === 'Tab') {
      var f = menuFocusables(); if (!f.length) { e.preventDefault(); return; }
      var first = f[0], last = f[f.length - 1], a = document.activeElement;
      if (!menu.contains(a)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
    }
  });
  if (window.matchMedia) {   // the menu button is hidden from 1061px up: close the menu (no focus move) if the window grows while it is open
    var wideMQ = window.matchMedia('(min-width: 1061px)');
    var onWide = function () { if (wideMQ.matches) setMenu(false, { restore: false }); };
    if (wideMQ.addEventListener) wideMQ.addEventListener('change', onWide); else if (wideMQ.addListener) wideMQ.addListener(onWide);
  }

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
    function reveal(hash, focusBtn) {
      var id = (hash || '').replace(/^#/, '');
      if (!id) return false;
      var el; try { el = document.getElementById(decodeURIComponent(id)); } catch (err) { return false; }
      var sec = el && el.closest('[data-acc]');
      if (!sec) return false;
      document.dispatchEvent(new Event('ca:nav-start'));
      /* V24: land on the target band when it is marked data-land (AltitudeAccess bands inside a panel), else on the section */
      var tgt = el.closest('[data-land]') || sec;
      setOpen(sec, true, function () {
        landOn(tgt);
        /* V32 (V30-13): a keyboard activation of a link to this section leaves focus on the section's button instead of dropping it to the body */
        if (focusBtn) { var b = parts(sec).btn; if (b) b.focus({ preventScroll: true }); }
      });
      return true;
    }
    /* V24: panels may ship without the inert attribute (AltitudeAccess), so no-JS visitors keep them usable; collapse them here */
    secs.forEach(function (sec) { var pn = parts(sec).panel; if (!pn.classList.contains('is-open')) pn.setAttribute('inert', ''); });
    secs.forEach(function (sec) {
      var q = parts(sec);
      q.btn.addEventListener('click', function () { setOpen(sec, !isOpen(sec)); });
    });
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href*="#"]');
      if (!a) return;
      try {
        var u = new URL(a.href, window.location.href);
        if (u.hash && u.origin === window.location.origin && u.pathname === window.location.pathname) reveal(u.hash, e.detail === 0);
      } catch (err) { /* ignore */ }
    });
    window.addEventListener('hashchange', function () { reveal(window.location.hash); });
    if (window.location.hash) reveal(window.location.hash);
  })();

  /* 3c2. V32 change 12: the cap top of the first line of the text column (not its line box) and the top edge of the scroll box beside it start at the same y.
         Chrome rounds font ascent and descent to whole pixels, so the cap top is MEASURED from the real rendering (baseline of the first line minus the cap height of its font)
         and the scroll box gets a margin-top (--cap-align) equal to the difference. Side by side only (901px and up); stacked layouts use their normal spacing.
         Runs on load, font load, resize and accordion changes (collapsed panels still have layout, so the numbers are valid before they open). */
  (function () {
    var grids = Array.prototype.slice.call(document.querySelectorAll('.fleet-grid')).filter(function (g) { return g.querySelector(':scope > .fleet-text') && g.querySelector(':scope > .attr-carousel'); });
    if (!grids.length) return;
    var cv = document.createElement('canvas').getContext('2d'), raf = 0, wideMQ = window.matchMedia('(min-width: 901px)');
    function capTopOf(el) {
      var cs = getComputedStyle(el);
      cv.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      var capH = cv.measureText('H').actualBoundingBoxAscent;
      var s = document.createElement('span'); s.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
      el.insertBefore(s, el.firstChild); var y = s.getBoundingClientRect().bottom; s.remove();
      return y - capH;
    }
    function sync() {
      raf = 0;
      grids.forEach(function (g) {
        var car = g.querySelector(':scope > .attr-carousel'), txt = g.querySelector(':scope > .fleet-text');
        if (!wideMQ.matches) { car.style.removeProperty('--cap-align'); return; }
        car.style.setProperty('--cap-align', '0px');   // measure from the unshifted position
        var first = Array.prototype.filter.call(txt.children, function (c) { return c.getClientRects().length && c.textContent.trim() && !c.classList.contains('visually-hidden'); })[0];
        if (!first) return;
        var cr = car.getBoundingClientRect(), fr = first.getBoundingClientRect();
        if (!cr.height || !fr.height || cr.top > fr.bottom - 2) { car.style.removeProperty('--cap-align'); return; }   // not side by side
        var d = capTopOf(first) - cr.top;
        if (isFinite(d) && Math.abs(d) < 40) car.style.setProperty('--cap-align', (Math.round(d * 100) / 100) + 'px');
      });
    }
    function queue() { if (!raf) raf = window.requestAnimationFrame(sync); }
    window.addEventListener('resize', queue);
    window.addEventListener('load', queue);
    document.addEventListener('ca:acc-change', queue);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(queue);
    if (wideMQ.addEventListener) wideMQ.addEventListener('change', queue);
    queue();
  })();

  /* 3d. Partner logo marquee (V17, hardened). The loop itself is a pure CSS keyframe animation over two identical sets
         (the second is aria-hidden and not focusable), so it does not depend on this script to run. This script only
         (1) sets the duration for about 28px per second from the measured set width (guarded: it ignores a not-yet-laid-out
         set and keeps the current position when the duration changes), (2) wires the visible Pause / Play button,
         (3) pauses the animation while the strip is off screen, and (4) self-heals: if the animation is missing or has stalled
         while it should be running (for example after a compositor hiccup, a tab switch or an accordion change), it is
         restarted in place. CSS keeps it static under prefers-reduced-motion. */
  (function () {
    var mq = document.querySelector('[data-marquee]');
    if (!mq) return;
    var track = mq.querySelector('.marquee-track'), set = mq.querySelector('.marquee-set');
    var btn = document.querySelector('[data-marquee-toggle]'), label = btn && btn.querySelector('[data-marquee-label]');
    var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
    var SPEED = 28, raf = 0, inView = true, lastX = null, lastAt = 0;
    function anim() { var a = track.getAnimations ? track.getAnimations() : []; return a.length ? a[0] : null; }
    function curDur() { var d = parseFloat(getComputedStyle(track).animationDuration); return isFinite(d) && d > 0 ? d : 0; }
    function size() {
      raf = 0;
      var w = set.getBoundingClientRect().width;
      if (!(w > 200)) return;                       // not laid out yet: keep the CSS fallback duration
      var dur = w / SPEED;
      if (!isFinite(dur) || dur < 10 || dur > 900) return;
      var old = curDur(), a = anim(), prog = 0;
      if (Math.abs(old - dur) < 0.5) return;
      if (a && old) prog = ((a.currentTime || 0) / 1000 % old) / old;
      track.style.setProperty('--marquee-dur', dur.toFixed(1) + 's');
      a = anim();
      if (a && prog) { try { a.currentTime = prog * dur * 1000; } catch (e) { /* ignore */ } }
    }
    function queue() { if (!raf) raf = window.requestAnimationFrame(size); }
    function shouldRun() {
      return !reduceMQ.matches && inView && !mq.classList.contains('is-paused') && !mq.matches(':hover') && !mq.matches(':focus-within') && !document.hidden;
    }
    function restart() {
      var a = anim(), t = a && isFinite(a.currentTime) ? a.currentTime : 0;
      track.style.animation = 'none'; void track.offsetWidth; track.style.animation = '';
      var b = anim(); if (b && t) { try { b.currentTime = t; } catch (e) { /* ignore */ } }
      lastX = null;
    }
    function heal() {
      if (reduceMQ.matches) return;
      queue();                                      // re-check the duration too (cheap, only writes when it is off by 0.5s or more)
      var a = anim();
      if (!a) { restart(); return; }
      if (!shouldRun()) { lastX = null; return; }
      if (a.playState !== 'running') { a.play(); lastX = null; return; }
      var x = new DOMMatrix(getComputedStyle(track).transform).m41, now = Date.now();
      if (lastX !== null && now - lastAt > 1500 && Math.abs(x - lastX) < 0.5) { restart(); return; }
      if (lastX === null || now - lastAt > 1500) { lastX = x; lastAt = now; }
    }
    window.addEventListener('resize', queue); window.addEventListener('load', queue); window.addEventListener('pageshow', function () { queue(); heal(); });
    if (window.ResizeObserver) new ResizeObserver(queue).observe(mq);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(queue);
    Array.prototype.forEach.call(mq.querySelectorAll('img'), function (im) { if (!im.complete) im.addEventListener('load', queue); });
    if ('IntersectionObserver' in window) {
      inView = false;
      new IntersectionObserver(function (en) {
        inView = en[0].isIntersecting;
        mq.classList.toggle('is-offscreen', !inView);
        if (inView) { queue(); window.setTimeout(heal, 200); }
      }, { rootMargin: '200px 0px' }).observe(mq);
    }
    document.addEventListener('visibilitychange', function () { if (!document.hidden) { queue(); window.setTimeout(heal, 200); } });
    document.addEventListener('ca:acc-change', function () { queue(); window.setTimeout(heal, 600); });
    window.setInterval(heal, 2000);
    queue();
    if (btn) btn.addEventListener('click', function () {
      var paused = mq.classList.toggle('is-paused');
      btn.setAttribute('aria-pressed', String(paused));
      if (label) label.textContent = paused ? 'Play logos' : 'Pause logos';
      lastX = null;
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
  /* V32 (V30-19): errors say what is needed per field, and a summary (role="alert", so it is announced) states how many fields need attention
     and names them. It sits beside the submit button, where the user's attention is; focus still moves to the first invalid field. */
  var ERR_TEXT = {
    'q-from': 'Enter where you are departing from.', 'q-to': 'Enter where you are travelling to.', 'q-date': 'Choose a departure date.',
    'q-name': 'Enter your full name.', 'q-email': 'Enter your email address.', 'm-name': 'Enter your full name.', 'm-email': 'Enter your email address.'
  };
  function fieldLabel(f) { var l = f.id && document.querySelector('label[for="' + f.id + '"]'); return l ? l.textContent.replace(/\s*\(.*\)\s*$/, '').trim() : (f.name || 'field'); }
  function fieldMessage(f) {
    if (f.validity.valueMissing) return ERR_TEXT[f.id] || ('Enter ' + fieldLabel(f).toLowerCase() + '.');
    if (f.validity.typeMismatch && f.type === 'email') return 'Enter an email address in the format name@example.com.';
    return f.validationMessage || ('Check ' + fieldLabel(f).toLowerCase() + '.');
  }
  document.querySelectorAll('[data-mock-form]').forEach(function (form) {
    function clearErrors() {
      form.querySelectorAll('.field-error').forEach(function (n) { n.remove(); });
      form.querySelectorAll('[aria-invalid]').forEach(function (f) { f.removeAttribute('aria-invalid'); f.removeAttribute('aria-describedby'); });
      var sm = form.querySelector('.form-summary'); if (sm) sm.remove();
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearErrors();
      var bad = Array.prototype.filter.call(form.elements, function (f) { return f.willValidate && !f.checkValidity(); });
      if (bad.length) {
        bad.forEach(function (f) {
          var id = (f.id || f.name) + '-err', msg = document.createElement('p');
          msg.className = 'field-error'; msg.id = id;
          msg.textContent = fieldMessage(f);
          f.setAttribute('aria-invalid', 'true'); f.setAttribute('aria-describedby', id);
          f.parentNode.appendChild(msg);
        });
        var sum = document.createElement('div'); sum.className = 'form-summary full'; sum.setAttribute('role', 'alert');
        sum.textContent = (bad.length === 1 ? '1 field needs attention: ' : bad.length + ' fields need attention: ') + bad.map(fieldLabel).join(', ') + '.';
        var btnRow = form.querySelector('button[type="submit"]'); btnRow = btnRow && btnRow.closest('.full');
        form.insertBefore(sum, btnRow || null);
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
      var sm = form.querySelector('.form-summary'); if (sm) sm.remove();   // the summary has been announced; once the user starts fixing, it would go stale
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

/* V29: header dropdowns (Charter, AltitudeAccess, About) as disclosure menus.
   Each .has-dropdown has a button (aria-expanded, aria-controls) beside its link; the link still goes to the page.
   Opens on hover, on keyboard focus within the item and on tap/click of the button. A hover or focus opening is "light": activating the button then PINS it open (so Enter on a focused button,
   or a tap that follows the emulated hover on a touch screen, keeps the menu open); activating a pinned button closes it. Closes on mouse leave (unless pinned), when focus leaves the item,
   on Escape (focus returns to the button) and on a click outside. Without JS the CSS :hover / :focus-within rules still show the menu. */
(function () {
  var items = Array.prototype.slice.call(document.querySelectorAll('.nav > li.has-dropdown'));
  if (!items.length) return;
  function btnOf(li) { return li.querySelector('.dd-toggle'); }
  function setOpen(li, open) {
    li.classList.toggle('is-open', open);
    if (open) li.classList.remove('dd-closed'); else li._pinned = false;
    var b = btnOf(li); if (b) b.setAttribute('aria-expanded', String(open));
  }
  function closeAll(except) { items.forEach(function (li) { if (li !== except) setOpen(li, false); }); }
  items.forEach(function (li) {
    var b = btnOf(li); if (!b) return;
    li._pinned = false;
    b.addEventListener('click', function (e) {
      e.preventDefault(); closeAll(li);
      if (li.classList.contains('is-open') && li._pinned) { setOpen(li, false); li.classList.add('dd-closed'); }
      else { setOpen(li, true); li._pinned = true; }
    });
    li.addEventListener('mouseenter', function () { closeAll(li); setOpen(li, true); });
    li.addEventListener('mouseleave', function () { li.classList.remove('dd-closed'); if (!li._pinned && !(li.contains(document.activeElement) && document.activeElement.matches(':focus-visible'))) setOpen(li, false); });
    li.addEventListener('focusin', function (e) { if (e.target.matches && e.target.matches(':focus-visible')) { closeAll(li); setOpen(li, true); } });
    li.addEventListener('focusout', function (e) { if (!li.contains(e.relatedTarget)) { li.classList.remove('dd-closed'); setOpen(li, false); } });
    li.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && (li.classList.contains('is-open') || li.matches(':hover, :focus-within'))) {
        if (li.contains(document.activeElement)) b.focus();   // focus first (its focusin would reopen), then close
        setOpen(li, false); li.classList.add('dd-closed');
        e.stopPropagation();
      }
    });
  });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('.dropdown a');
    if (a) { closeAll(null); items.forEach(function (li) { li.classList.add('dd-closed'); }); return; }
    if (!e.target.closest || !e.target.closest('.nav > li.has-dropdown')) closeAll(null);
  });
})();
