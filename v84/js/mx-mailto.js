/* V52 change 1: Maintenance request popup (maintenance.html only). No server: after js/main.js has validated the form it fires ca:form-sent,
 * and this file opens the visitor's email app with a mailto: link to mx@clipperaviation.com, pre-filled from the form.
 * Honeypot: a filled company_website field fakes success and sends nothing. The GA4 generate_lead event (form_id 'maintenance-mailto', from the
 * form's data-form-id) is fired by js/analytics.js on ca:form-sent; it is a no-op while its IDs are placeholders. window.CA_MX_LAST_MAILTO keeps the last URL (used by QA).
 */
(function () {
  'use strict';
  var TO = 'mx@clipperaviation.com';
  var form = document.querySelector('form[data-mx-mailto]');
  if (!form) return;

  function val(n) { var f = form.elements[n]; return f ? String(f.value || '').replace(/\s+$/g, '').replace(/^\s+/g, '') : ''; }

  var FIELDS = [
    ['Name', 'name'], ['Email', 'email'], ['Phone', 'phone'], ['Aircraft make/model', 'aircraft'],
    ['Tail number', 'tail'], ['Service needed', 'service'], ['Preferred date', 'date'], ['Details', 'details']
  ];

  function build() {
    var aircraft = val('aircraft'), tail = val('tail');
    var subject = 'Maintenance Request: ' + aircraft + (tail ? ' ' + tail : '');
    var lines = FIELDS.map(function (p) {
      var v = val(p[1]).replace(/\r?\n/g, ' / ');   // one line per field, so a multi-line Details stays "Label: value" on its own line
      return p[0] + ': ' + (v || 'Not provided');
    });
    return 'mailto:' + TO + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\r\n'));
  }

  form._botCheck = function () {
    var hp = form.querySelector('input[name="company_website"]');
    if (hp && hp.value) { form.dataset.botFlag = '1'; form.classList.add('is-sent'); return true; }   // looks like success, sends nothing
    return true;
  };

  var origReset = form._resetMock;
  form._resetMock = function () { if (origReset) origReset(); delete form.dataset.botFlag; };

  document.addEventListener('ca:form-sent', function (e) {
    if (!e.detail || e.detail.form !== form || form.dataset.botFlag) return;
    var url = build();
    window.CA_MX_LAST_MAILTO = url;
    var again = form.parentNode.querySelector('[data-mx-reopen]'); if (again) again.setAttribute('href', url);
    window.location.href = url;
  });
})();
