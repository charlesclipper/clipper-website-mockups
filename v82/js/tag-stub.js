/* Local stand-in used only when a test sets window.__CA_MEASURE_TEST__ before this page loads.
   It does not contact Google or Microsoft. Production pages never set that flag. */
(function () {
  var list = window.__CA_STUBS__ = window.__CA_STUBS__ || [];
  list.push(document.currentScript && document.currentScript.src || 'tag-stub');
})();
