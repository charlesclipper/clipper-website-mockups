/* Runs only inside the untracked request document. The parent cannot read this
   document: the frame is sandboxed without allow-same-origin. This file does not
   load Analytics or Clarity. */
(function () {
  'use strict';
  function height() {
    var h = Math.ceil(Math.max(document.body.scrollHeight, document.documentElement.scrollHeight));
    parent.postMessage({ source: 'ca-quote-frame', type: 'height', height: h }, '*');
  }
  function focusFirst() {
    var first = document.querySelector('input:not([type="radio"]):not([type="hidden"]), select, textarea');
    if (first) first.focus();
  }
  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || d.source !== 'ca-quote-parent' || e.source !== parent) return;
    if (d.type === 'focus') focusFirst();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    parent.postMessage({ source: 'ca-quote-frame', type: 'escape' }, '*');
  });
  window.addEventListener('load', height);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(height);
  if (window.ResizeObserver) new ResizeObserver(height).observe(document.body);
  window.setTimeout(height, 60);
})();
