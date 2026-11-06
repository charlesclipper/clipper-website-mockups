/* Runs only inside the untracked request document. The parent cannot read this
   document: the frame is sandboxed without allow-same-origin. This file does not
   load Analytics or Clarity. Tab past either end is handed back to the dialog.
   A date, time, or suggestion field keeps Escape, because those controls open a
   browser picker that uses the same key. */
(function () {
  'use strict';
  function height() {
    var h = Math.ceil(Math.max(document.body.scrollHeight, document.documentElement.scrollHeight));
    parent.postMessage({ source: 'ca-quote-frame', type: 'height', height: h }, '*');
  }
  function concealed(n) {
    for (var p = n; p && p.nodeType === 1; p = p.parentElement) {
      if (p.hasAttribute('hidden')) return true;
      var s = window.getComputedStyle(p);
      if (s.display === 'none' || s.visibility === 'hidden') return true;
    }
    return false;
  }
  function tabbables() {
    return Array.prototype.filter.call(
      document.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'),
      function (n) {
        if (n.tabIndex < 0 || n.hasAttribute('data-ca-sentinel')) return false;
        return !concealed(n);
      }
    );
  }
  function focusField(list, index) {
    var el = list[index];
    if (el) el.focus();
  }
  function focusFirst() {
    var list = tabbables();
    var at = 0;
    for (var i = 0; i < list.length; i++) {
      if (list[i].matches('input:not([type="radio"]):not([type="hidden"]), select, textarea')) { at = i; break; }
    }
    focusField(list, at);
  }
  function focusLast() {
    var list = tabbables();
    if (list.length) focusField(list, list.length - 1);
  }
  function nativePicker(el) {
    return !!(el && el.matches && el.matches('input[type="date"], input[type="time"], input[type="datetime-local"], input[list]'));
  }
  function sentinel(dir) {
    var s = document.createElement('span');
    s.tabIndex = 0;
    s.setAttribute('data-ca-sentinel', dir);
    s.setAttribute('aria-hidden', 'true');
    s.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0)';
    s.addEventListener('focus', function (ev) {
      if (dir === 'start' && !(ev.relatedTarget && document.contains(ev.relatedTarget))) {
        var list = tabbables();
        if (list[0]) list[0].focus();
        return;
      }
      parent.postMessage({ source: 'ca-quote-frame', type: 'tab-out', dir: dir === 'start' ? 'prev' : 'next' }, '*');
    });
    return s;
  }
  var start = sentinel('start');
  var end = sentinel('end');
  function park() {
    if (document.body.firstChild !== start) document.body.insertBefore(start, document.body.firstChild);
    if (document.body.lastChild !== end) document.body.appendChild(end);
  }
  if (document.body) park();
  else document.addEventListener('DOMContentLoaded', park);
  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || d.source !== 'ca-quote-parent' || e.source !== parent) return;
    if (d.type === 'focus') focusFirst();
    if (d.type === 'focus-last') focusLast();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (e.defaultPrevented || nativePicker(e.target)) return;
      parent.postMessage({ source: 'ca-quote-frame', type: 'escape' }, '*');
      return;
    }
    if (e.key !== 'Tab') return;
    var list = tabbables();
    var first = list[0], last = list[list.length - 1], a = document.activeElement;
    var atStart = !list.length || a === first || a === document.body || a === document.documentElement || a === start;
    if (!e.shiftKey && (a === end || !list.length || a === last)) {
      e.preventDefault();
      parent.postMessage({ source: 'ca-quote-frame', type: 'tab-out', dir: 'next' }, '*');
    } else if (e.shiftKey && atStart) {
      e.preventDefault();
      parent.postMessage({ source: 'ca-quote-frame', type: 'tab-out', dir: 'prev' }, '*');
    }
  });
  window.addEventListener('load', function () { park(); height(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(height);
  if (window.ResizeObserver && document.body) new ResizeObserver(function () { park(); height(); }).observe(document.body);
  window.setTimeout(function () { park(); height(); }, 60);
})();
