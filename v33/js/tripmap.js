/* AltitudeAccess flight-time map (V22). Plain JS, no libraries.
   Dots are authored in the HTML as inert SVG groups (no-JS visitors get the table list instead).
   This script turns each dot into a focusable button, shows the tooltip card on hover, keyboard focus and tap,
   closes it on Escape / outside tap, and adds the "View as list" toggle. */
(function () {
  var root = document.querySelector('[data-tripmap]');
  if (!root) return;
  var svg = root.querySelector('[data-trip-svg]');
  var stage = root.querySelector('[data-trip-stage]');
  var tip = root.querySelector('#trip-tip');
  var view = root.querySelector('[data-trip-view]');
  var list = root.querySelector('[data-trip-list]');
  var toggle = root.querySelector('[data-trip-toggle]');
  var hint = root.querySelector('[data-trip-hint]');
  var dots = Array.prototype.slice.call(root.querySelectorAll('.trip-dot[data-key]'));
  var arcs = Array.prototype.slice.call(root.querySelectorAll('.trip-arc'));
  var active = null, pinned = null;
  var tipGroup = tip.querySelector('.trip-tip-group'), tipName = tip.querySelector('.trip-tip-name'), tipTime = tip.querySelector('.trip-tip-time');

  root.classList.add('is-enhanced');
  toggle.hidden = false; hint.hidden = false; list.hidden = true;

  /* V26: the view is centred on Van Nuys (218,336) at every width. Wide: 896 x 560 (x -230 to 666, y 56 to 616) so all 12 dots, Calgary at the top and Los Cabos at the bottom, stay inside with room for the hit areas. Narrow (700px and below): portrait 332 x 536 around Van Nuys. */
  var mq = window.matchMedia('(max-width: 700px)');
  function fit() { svg.setAttribute('viewBox', mq.matches ? '52 68 332 536' : '-230 56 896 560'); if (active) place(active); }
  if (mq.addEventListener) mq.addEventListener('change', fit); else mq.addListener(fit);
  fit();

  dots.forEach(function (d) {
    var name = d.getAttribute('data-name'), grp = d.getAttribute('data-group'), spoken = d.getAttribute('data-spoken');
    d.removeAttribute('aria-hidden');
    d.setAttribute('role', 'button');
    d.setAttribute('tabindex', '0');
    d.setAttribute('aria-label', name + ', ' + spoken + ' from Van Nuys, ' + grp + ' trip');
    d.addEventListener('mouseenter', function () { cancelHide(); if (!pinned) show(d); });
    d.addEventListener('mouseleave', function () { if (!pinned) hideSoon(); });
    d.addEventListener('focus', function () { show(d); });
    d.addEventListener('blur', function () { if (pinned !== d) hide(); });
    d.addEventListener('click', function (e) { e.stopPropagation(); if (pinned === d) { pinned = null; hide(); } else { pinned = d; show(d); } });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); if (pinned === d) { pinned = null; hide(); } else { pinned = d; show(d); } }
    });
  });

  /* V32 (V30-08, WCAG 1.4.13): the tooltip is hoverable. Leaving the dot starts a short grace period (350ms) so the pointer can cross the gap onto the tooltip;
     while the pointer is over the tooltip it stays open, and it closes when the pointer leaves both. Escape still dismisses it, and it persists until dismissed or left. */
  var hideTimer = 0;
  function cancelHide() { window.clearTimeout(hideTimer); hideTimer = 0; }
  function hideSoon() { cancelHide(); hideTimer = window.setTimeout(function () { if (!pinned) hide(); }, 350); }
  tip.addEventListener('mouseenter', cancelHide);
  tip.addEventListener('mouseleave', function () { if (!pinned) hideSoon(); });

  function show(d) {
    if (active && active !== d) active.removeAttribute('aria-describedby');
    active = d;
    var key = d.getAttribute('data-key');
    dots.forEach(function (x) { x.classList.toggle('is-active', x === d); });
    arcs.forEach(function (a) { var on = a.getAttribute('data-key') === key; a.classList.toggle('is-active', on); a.classList.toggle('is-dim', !on); });
    tipGroup.textContent = d.getAttribute('data-group');
    tipName.textContent = d.getAttribute('data-name');
    tipTime.textContent = d.getAttribute('data-time') + ' from Van Nuys';
    tip.hidden = false;
    d.setAttribute('aria-describedby', 'trip-tip');
    place(d);
  }
  function hide() {
    cancelHide();
    if (active) active.removeAttribute('aria-describedby');
    active = null;
    dots.forEach(function (x) { x.classList.remove('is-active'); });
    arcs.forEach(function (a) { a.classList.remove('is-active', 'is-dim'); });
    tip.hidden = true;
  }
  function place(d) {
    var s = stage.getBoundingClientRect(), r = d.getBoundingClientRect();
    var cx = r.left + r.width / 2 - s.left, cy = r.top + r.height / 2 - s.top;
    var tw = tip.offsetWidth, th = tip.offsetHeight, gap = 16;
    var x = Math.min(Math.max(cx - tw / 2, 4), s.width - tw - 4);
    var y = cy - th - gap; var below = false;
    if (y < 4) { y = cy + gap; below = true; }
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
    tip.classList.toggle('is-below', below);
    tip.style.setProperty('--tip-arrow', Math.round(Math.min(Math.max(cx - x, 14), tw - 14)) + 'px');
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.key === 'Esc') { if (active) { var d = active; pinned = null; hide(); if (document.activeElement !== d && root.contains(document.activeElement)) { /* keep focus where it is */ } } }
  });
  document.addEventListener('click', function (e) { if (pinned && !tip.contains(e.target)) { pinned = null; hide(); } });
  window.addEventListener('resize', function () { if (active) place(active); });
  /* V24: the map lives in a collapsible panel. Nothing here measures at init (the viewBox is set by media query only), so it renders correctly
     when the panel is opened later; tooltip placement is measured on show. When the panel collapses the tooltip is closed, and when it settles open
     any active tooltip is re-placed. */
  document.addEventListener('ca:acc-change', function (e) {
    var sec = root.closest('[data-acc]');
    if (!sec || !e.detail || e.detail.id !== sec.id) return;
    if (!e.detail.open) { pinned = null; hide(); }
    else if (active) place(active);
  });

  toggle.addEventListener('click', function () {
    var showList = toggle.getAttribute('aria-pressed') !== 'true';
    toggle.setAttribute('aria-pressed', showList ? 'true' : 'false');
    toggle.textContent = showList ? 'View as map' : 'View as list';
    if (showList) { pinned = null; hide(); }
    view.hidden = showList; list.hidden = !showList;
  });
})();
