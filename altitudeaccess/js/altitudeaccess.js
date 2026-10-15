/* AltitudeAccess® mockup — vanilla JS, no dependencies.
   1) Mobile nav + dropdown toggles  2) Accordion  3) Placeholder form handling */
(function () {
  'use strict';

  /* ---- Mobile nav ---- */
  var burger = document.querySelector('.aa-header__burger');
  var nav = document.getElementById('primary-nav');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('is-open', !open);
    });
  }

  /* ---- Dropdown (sub-menu) toggles: tap/keyboard friendly; desktop also opens on hover/focus via CSS ---- */
  var toggles = document.querySelectorAll('.aa-nav__toggle');
  function closeAll(except) {
    toggles.forEach(function (t) {
      var li = t.closest('.aa-nav__item');
      if (li !== except) { li.classList.remove('is-open'); t.setAttribute('aria-expanded', 'false'); }
    });
  }
  toggles.forEach(function (t) {
    t.addEventListener('click', function () {
      var li = t.closest('.aa-nav__item');
      var open = t.getAttribute('aria-expanded') === 'true';
      closeAll(li);
      li.classList.toggle('is-open', !open);
      t.setAttribute('aria-expanded', String(!open));
    });
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.aa-nav__item')) closeAll(null);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeAll(null);
      if (burger && burger.getAttribute('aria-expanded') === 'true' && window.matchMedia('(max-width:900px)').matches) {
        burger.setAttribute('aria-expanded', 'false'); nav.classList.remove('is-open'); burger.focus();
      }
    }
  });

  /* ---- Accordion (WAI-ARIA disclosure pattern: button[aria-expanded] controls a region) ---- */
  document.querySelectorAll('[data-aa-accordion]').forEach(function (group) {
    var buttons = Array.prototype.slice.call(group.querySelectorAll('.aa-acc__btn'));
    buttons.forEach(function (btn) {
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      btn.addEventListener('click', function () {
        var expanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!expanded));
        if (panel) panel.hidden = expanded;
      });
      btn.addEventListener('keydown', function (e) {   /* optional arrow-key / Home / End navigation */
        var i = buttons.indexOf(btn), n = null;
        if (e.key === 'ArrowDown') n = buttons[(i + 1) % buttons.length];
        else if (e.key === 'ArrowUp') n = buttons[(i - 1 + buttons.length) % buttons.length];
        else if (e.key === 'Home') n = buttons[0];
        else if (e.key === 'End') n = buttons[buttons.length - 1];
        if (n) { e.preventDefault(); n.focus(); }
      });
    });
  });

  /* ---- Placeholder forms: not functional in the mockup ---- */
  document.querySelectorAll('[data-aa-form]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var s = form.querySelector('[data-aa-status]');
      if (s) s.textContent = 'Mockup only — this form is not connected yet.';
    });
  });
})();
