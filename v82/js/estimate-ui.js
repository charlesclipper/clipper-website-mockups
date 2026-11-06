/* V82 estimate page. Reads the form, calls ClipperEstimate, writes text. No storage, no submit. */
(function () {
  'use strict';
  var api = window.ClipperEstimate;
  if (!api) return;
  var form = document.getElementById('estimate-form');
  if (!form) return;

  var occHost = document.getElementById('occ-legs');
  var repoHost = document.getElementById('repo-legs');
  var occTpl = document.getElementById('occ-template');
  var repoTpl = document.getElementById('repo-template');
  var out = document.getElementById('estimate-out');

  function placeOptions(select) {
    api.PLACES.forEach(function (p) {
      var o = document.createElement('option');
      o.value = p.id;
      o.textContent = p.label;
      select.appendChild(o);
    });
  }

  function addOcc() {
    var node = occTpl.content.firstElementChild.cloneNode(true);
    placeOptions(node.querySelector('.leg-from'));
    placeOptions(node.querySelector('.leg-to'));
    node.querySelector('.leg-from').value = 'vny';
    node.querySelector('.leg-to').value = 'las';
    occHost.appendChild(node);
    bindLeg(node);
    renumber();
  }

  function addRepo() {
    repoHost.appendChild(repoTpl.content.firstElementChild.cloneNode(true));
    renumber();
  }

  function renumber() {
    var legs = occHost.querySelectorAll('.est-leg');
    Array.prototype.forEach.call(legs, function (leg, i) {
      var legend = leg.querySelector('legend');
      legend.textContent = 'Occupied leg ' + (i + 1);
      var hint = leg.querySelector('.pub-hint');
      hint.textContent = '';
      hint.hidden = true;
    });
    var repos = repoHost.querySelectorAll('.repo-leg');
    Array.prototype.forEach.call(repos, function (leg, i) {
      leg.querySelector('legend').textContent = 'Repositioning leg ' + (i + 1) + ' (scenario)';
    });
    refreshHints();
  }

  function refreshHints() {
    Array.prototype.forEach.call(occHost.querySelectorAll('.est-leg'), function (leg) {
      var hint = api.publishedHint(leg.querySelector('.leg-from').value, leg.querySelector('.leg-to').value);
      var box = leg.querySelector('.pub-hint');
      if (!hint) { box.hidden = true; box.textContent = ''; return; }
      box.hidden = false;
      box.textContent = hint.text;
    });
  }

  function bindLeg(leg) {
    leg.addEventListener('change', function (e) {
      if (e.target.classList.contains('leg-from') || e.target.classList.contains('leg-to')) refreshHints();
    });
    leg.addEventListener('click', function (e) {
      if (e.target.classList.contains('clear-date')) {
        leg.querySelector('.leg-date').value = '';
        render();
      }
      if (e.target.classList.contains('remove-leg')) {
        if (occHost.querySelectorAll('.est-leg').length > 1) leg.remove();
        renumber();
        render();
      }
    });
  }

  repoHost.addEventListener('click', function (e) {
    if (e.target.classList.contains('remove-repo')) {
      e.target.closest('.repo-leg').remove();
      renumber();
      render();
    }
  });

  function val(sel) { var n = form.querySelector(sel); return n ? n.value : ''; }
  function checked(sel) { var n = form.querySelector(sel); return !!(n && n.checked); }

  function pass(modeName, amountName) {
    var mode = val(modeName);
    if (mode === 'amount') return { mode: 'amount', amount: val(amountName) };
    if (mode === 'pending') return { mode: 'pending' };
    return { mode: 'off' };
  }

  function read() {
    var occupied = [];
    Array.prototype.forEach.call(occHost.querySelectorAll('.est-leg'), function (leg) {
      occupied.push({
        from: leg.querySelector('.leg-from').value,
        to: leg.querySelector('.leg-to').value,
        hours: leg.querySelector('.leg-hours').value,
        minutes: leg.querySelector('.leg-minutes').value,
        date: leg.querySelector('.leg-date').value
      });
    });
    var reposition = [];
    Array.prototype.forEach.call(repoHost.querySelectorAll('.repo-leg'), function (leg) {
      reposition.push({ miles: leg.querySelector('.repo-miles').value });
    });
    return {
      occupied: occupied,
      reposition: reposition,
      sameDay: checked('#est-sameday'),
      crewNights: val('#est-nights'),
      pets: checked('#est-pets'),
      tier: val('#est-tier'),
      petMode: val('#est-pet-mode'),
      catering: pass('#est-catering-mode', '#est-catering-amt'),
      hangar: pass('#est-hangar-mode', '#est-hangar-amt'),
      specialEvent: pass('#est-event-mode', '#est-event-amt'),
      international: pass('#est-intl-mode', '#est-intl-amt'),
      passengers: val('#est-pax')
    };
  }

  function li(text) {
    var n = document.createElement('li');
    n.textContent = text;
    return n;
  }

  function dateSentence(row) {
    if (row.status === 'blank') return 'Requested departure date: none entered.';
    if (row.status === 'invalid') return 'Requested departure date is not a real calendar date.';
    if (row.status === 'unsupported') return row.iso + ' is outside the published 2027 peak calendar. Coverage for ' + row.year + ' is unavailable, so this date is not classified as peak or non-peak.';
    if (row.status === 'peak') return 'Peak day. ' + row.iso + ' is a published 2027 peak day. The rate does not increase. Cancellation terms differ.';
    return row.iso + ' is a 2027 date and is not a published peak day. The rate does not change.';
  }

  function paintDates() {
    var rows = [];
    Array.prototype.forEach.call(occHost.querySelectorAll('.est-leg'), function (leg, index) {
      var classified = api.classifyDate(leg.querySelector('.leg-date').value);
      var note = leg.querySelector('.leg-date-note');
      note.textContent = 'Leg ' + (index + 1) + '. ' + dateSentence(classified);
      note.classList.toggle('leg-peak', classified.status === 'peak');
      rows.push({ leg: index + 1, status: classified.status, iso: classified.iso || '', year: classified.year || null });
    });
    var panel = document.getElementById('peak-panel');
    panel.replaceChildren();
    var anyPeak = rows.some(function (row) { return row.status === 'peak'; });
    var title = document.createElement('h2');
    title.className = 'h3';
    title.textContent = anyPeak ? 'Peak day booking' : 'Requested trip dates';
    panel.appendChild(title);
    var list = document.createElement('ul');
    rows.forEach(function (row) {
      var item = document.createElement('li');
      item.appendChild(document.createTextNode(dateSentence(row)));
      list.appendChild(item);
    });
    panel.appendChild(list);
    var terms = api.peakTerms;
    function addP(text) {
      var p = document.createElement('p');
      p.textContent = text;
      panel.appendChild(p);
    }
    if (anyPeak) {
      addP('Peak period cancellation terms, from the AltitudeAccess page: ' + terms.peakShared.join('; ') + '.');
      addP(terms.siteNote);
    } else if (rows.length && rows.every(function (row) { return row.status === 'nonpeak'; })) {
      addP('Non-peak cancellation terms: ' + terms.nonPeak.join('; ') + '.');
    }
    addP(terms.rate);
    addP(terms.availability);
    var link = document.createElement('p');
    var a = document.createElement('a');
    a.href = 'altitudeaccess.html#cancellation-terms';
    a.textContent = 'AltitudeAccess cancellation terms and 2027 peak calendar';
    link.appendChild(a);
    panel.appendChild(link);
  }

  function render() {
    paintDates();
    var result = api.estimate(read());
    out.replaceChildren();
    var status = document.createElement('p');
    status.className = 'est-status';
    status.textContent = result.status;
    out.appendChild(status);

    if (result.errors.length) {
      var err = document.createElement('ul');
      err.setAttribute('role', 'alert');
      result.errors.forEach(function (e) { err.appendChild(li(e)); });
      out.appendChild(err);
    }

    if (result.lines.length) {
      var table = document.createElement('ul');
      table.className = 'est-lines';
      result.lines.forEach(function (line) {
        table.appendChild(li(line.label + ': ' + api.formatUsd(line.cents) + '. ' + line.detail));
      });
      out.appendChild(table);
      var sub = document.createElement('p');
      sub.className = 'est-subtotal';
      sub.textContent = 'Known charges subtotal: ' + result.knownSubtotal + '. Not a full trip price.';
      out.appendChild(sub);
    }

    if (result.pending.length) {
      var pendTitle = document.createElement('h2');
      pendTitle.className = 'h3';
      pendTitle.textContent = 'Pending, not priced';
      var pend = document.createElement('ul');
      pend.className = 'est-pending';
      result.pending.forEach(function (e) { pend.appendChild(li(e)); });
      out.appendChild(pendTitle);
      out.appendChild(pend);
    }

    var aTitle = document.createElement('h2');
    aTitle.className = 'h3';
    aTitle.textContent = 'Assumptions still open';
    var alist = document.createElement('ul');
    result.assumptions.forEach(function (e) { alist.appendChild(li(e)); });
    out.appendChild(aTitle);
    out.appendChild(alist);
  }

  document.getElementById('add-occ').addEventListener('click', function () { addOcc(); render(); });
  document.getElementById('add-repo').addEventListener('click', function () { addRepo(); render(); });
  form.addEventListener('submit', function (e) { e.preventDefault(); render(); });
  form.addEventListener('input', render);
  form.addEventListener('change', render);
  addOcc();
  render();
})();
