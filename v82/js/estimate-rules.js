/* V82 trip-estimate prototype.
   Published money rules are from the V81 AltitudeAccess page and brochure
   shared/80/802cda35.../Clipper-Aviation-AltitudeAccess-Brochure.pdf
   (60,271,047 bytes, sha256 802cda35...453409).
   Quoted block times, per Charles on 5 Nov 2026: a future average will be
   Clipper's own JetInsight historical quoted block hours on flown legs only.
   None are loaded. Typed minutes are a scenario quoted block time, not that
   average, and not a flown, billed, or airborne time.
   Repositioning applicability, mile unit, and the 800-mile gap stay unpublished. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ClipperEstimate = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  var RATE_CENTS_PER_HOUR = 550000;
  var HOUR_MINUTES = 60;

  var PLACES = [
    { id: 'vny', label: 'Van Nuys' },
    { id: 'psp', label: 'Palm Springs', publishedMinutes: 30 },
    { id: 'san', label: 'San Diego', publishedMinutes: 30 },
    { id: 'las', label: 'Las Vegas', publishedMinutes: 50 },
    { id: 'mmh', label: 'Mammoth', publishedMinutes: 50 },
    { id: 'mry', label: 'Monterey', publishedMinutes: 50 },
    { id: 'sfo', label: 'San Francisco', publishedMinutes: 70 },
    { id: 'apc', label: 'Napa', publishedMinutes: 70 },
    { id: 'sdl', label: 'Scottsdale', publishedMinutes: 90 },
    { id: 'ege', label: 'Vail', publishedMinutes: 140 },
    { id: 'sjd', label: 'Los Cabos, Mexico', publishedMinutes: 160, international: true },
    { id: 'yvr', label: 'Vancouver, BC', publishedMinutes: 200, international: true },
    { id: 'yyc', label: 'Calgary, AB', publishedMinutes: 210, international: true },
    { id: 'other', label: 'Other place (not in the published table)' }
  ];

  var PEAK_2027 = {
    '2027-01-01': 1, '2027-01-02': 1,
    '2027-05-27': 1, '2027-05-28': 1, '2027-05-29': 1, '2027-05-30': 1, '2027-05-31': 1,
    '2027-07-03': 1, '2027-07-04': 1, '2027-07-05': 1,
    '2027-09-04': 1, '2027-09-05': 1, '2027-09-06': 1,
    '2027-11-25': 1, '2027-11-26': 1, '2027-11-27': 1,
    '2027-12-23': 1, '2027-12-24': 1, '2027-12-25': 1, '2027-12-26': 1, '2027-12-30': 1, '2027-12-31': 1
  };

  function placeById(id) {
    for (var i = 0; i < PLACES.length; i++) if (PLACES[i].id === id) return PLACES[i];
    return null;
  }

  function centsFromMinutes(totalMinutes) {
    var num = totalMinutes * RATE_CENTS_PER_HOUR;
    var cents = Math.floor(num / HOUR_MINUTES);
    if (num % HOUR_MINUTES >= HOUR_MINUTES / 2) cents += 1;
    return cents;
  }

  function repoFee(miles) {
    if (typeof miles !== 'number' || !isFinite(miles)) return { status: 'invalid' };
    if (miles <= 0) return { status: 'invalid' };
    if (miles > 20000) return { status: 'invalid' };
    if (miles < 200) return { status: 'fee', cents: 100000, band: 'Under 200 miles' };
    if (miles >= 200 && miles <= 399) return { status: 'fee', cents: 150000, band: '200–399 miles' };
    if (miles >= 400 && miles <= 599) return { status: 'fee', cents: 200000, band: '400–599 miles' };
    if (miles >= 600 && miles <= 799) return { status: 'fee', cents: 250000, band: '600–799 miles' };
    if (miles > 800) return { status: 'fee', cents: 300000, band: 'Greater than 800 miles' };
    return { status: 'ambiguous' };
  }

  function parseUsd(raw) {
    if (raw == null) return { status: 'empty' };
    var s = String(raw).trim().replace(/[$,\s]/g, '');
    if (!s) return { status: 'empty' };
    if (/e/i.test(s) || s.charAt(0) === '-' || s.charAt(0) === '+') return { status: 'invalid' };
    var m = s.match(/^(\d+)(?:\.(\d+))?$/);
    if (!m) return { status: 'invalid' };
    if (m[2] && m[2].length > 2) return { status: 'invalid' };
    var dollars = parseInt(m[1], 10);
    var frac = m[2] ? m[2] : '';
    while (frac.length < 2) frac += '0';
    if (dollars > 1000000) return { status: 'invalid' };
    return { status: 'ok', cents: dollars * 100 + parseInt(frac, 10) };
  }

  function formatUsd(cents) {
    var sign = cents < 0 ? '-' : '';
    var n = Math.abs(cents);
    var d = Math.floor(n / 100);
    var c = n % 100;
    var body = String(d).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return sign + '$' + body + '.' + (c < 10 ? '0' : '') + c;
  }

  function intField(value, label, min, max) {
    if (value == null || String(value).trim() === '') return { status: 'empty' };
    if (typeof value === 'number') {
      if (!isFinite(value) || Math.floor(value) !== value) return { status: 'invalid', message: label + ' must be a whole number.' };
      if (value < min || value > max) return { status: 'invalid', message: label + ' is outside the range this preview accepts (' + min + '–' + max + '). That limit is an entry guard, not a published Clipper rule.' };
      return { status: 'ok', value: value };
    }
    var s = String(value).trim();
    if (!/^\d+$/.test(s)) return { status: 'invalid', message: label + ' must be a whole number.' };
    var n = parseInt(s, 10);
    if (n < min || n > max) return { status: 'invalid', message: label + ' is outside the range this preview accepts (' + min + '–' + max + '). That limit is an entry guard, not a published Clipper rule.' };
    return { status: 'ok', value: n };
  }

  function estimate(input) {
    input = input || {};
    var errors = [];
    var pending = [];
    var lines = [];
    var assumptions = [];
    var occupiedMinutes = 0;
    var occupiedLegs = 0;
    var sawIntl = false;
    var legs = input.occupied || [];

    if (!legs.length) errors.push('Add at least one occupied leg and enter a quoted block time for this scenario. A route name is not a time. Average quoted block time is not loaded.');

    legs.forEach(function (leg, index) {
      var n = index + 1;
      var from = placeById(leg.from);
      var to = placeById(leg.to);
      if (!from || !to) errors.push('Leg ' + n + ' needs a place from the published list, or Other.');
      else if (from.id === to.id && from.id !== 'other') errors.push('Leg ' + n + ' origin and destination are the same.');
      if ((from && from.international) || (to && to.international)) sawIntl = true;
      var hours = intField(leg.hours, 'Leg ' + n + ' hours', 0, 24);
      var mins = intField(leg.minutes, 'Leg ' + n + ' minutes', 0, 59);
      if (hours.status === 'invalid') errors.push(hours.message);
      if (mins.status === 'invalid') errors.push(mins.message);
      if (hours.status === 'empty' || mins.status === 'empty') errors.push('Leg ' + n + ' needs a quoted block time. Leave hours or minutes at 0 only when the other is greater than 0. Brochure times, flown time, and billed time are not a substitute.');
      if (hours.status === 'ok' && mins.status === 'ok') {
        var total = hours.value * 60 + mins.value;
        if (total <= 0) errors.push('Leg ' + n + ' quoted block time is 0. Enter a quoted block time for this scenario, or remove the leg. Do not substitute a brochure time, a flown time, or a billed time.');
        else if (total > 24 * 60) errors.push('Leg ' + n + ' is longer than 24 hours. This preview rejects that as an entry guard, not as a published limit.');
        else {
          occupiedMinutes += total;
          occupiedLegs += 1;
        }
      }
    });

    var pax = input.passengers;
    if (pax != null && String(pax).trim() !== '') {
      var p = intField(pax, 'Passengers', 1, 9);
      if (p.status !== 'ok') errors.push('Passengers must be 1 through 9. The published cabin is 8+1.');
    }

    if (errors.length) {
      return {
        ok: false,
        fullTotal: false,
        status: 'Known charges cannot be subtotaled until the marked entries are fixed. This is not a full trip price.',
        errors: errors,
        lines: [],
        pending: [],
        assumptions: baseAssumptions(0),
        knownSubtotalCents: null,
        knownSubtotal: null
      };
    }

    if (occupiedLegs) {
      var occCents = centsFromMinutes(occupiedMinutes);
      lines.push({
        kind: 'occupied',
        label: 'Quoted block time',
        detail: occupiedMinutes + ' quoted block min entered for this scenario × $5,500 / 60, rounded half-up to the cent once after the minutes are added. This is not an average quoted block time. No Clipper JetInsight quoted-block file is loaded. It is not a flown time, not a billed time, and not a confirmed final billable time. Taxes and fees are already in the rate and are not added again.',
        cents: occCents
      });
    }

    (input.reposition || []).forEach(function (leg, index) {
      var miles = typeof leg.miles === 'number' ? leg.miles : parseFloat(String(leg.miles == null ? '' : leg.miles).replace(/,/g, ''));
      var fee = repoFee(miles);
      var label = 'Unoccupied repositioning leg ' + (index + 1);
      if (fee.status === 'fee') {
        lines.push({
          kind: 'repo',
          label: label,
          detail: fee.band + ' flat fee for the miles you entered (' + miles + '). Not an hourly charge. Mile unit and when a repositioning leg applies are not published.',
          cents: fee.cents
        });
      } else if (fee.status === 'ambiguous') {
        pending.push(label + ': ' + miles + ' miles is not in a published band (the gaps include 399–400, 599–600, and 799 through 800). No fee was chosen.');
      } else {
        errors.push(label + ' needs a positive number of miles.');
      }
    });

    if (errors.length) {
      return {
        ok: false,
        fullTotal: false,
        status: 'Known charges cannot be subtotaled until the marked entries are fixed. This is not a full trip price.',
        errors: errors,
        lines: [],
        pending: [],
        assumptions: baseAssumptions((input.reposition || []).length),
        knownSubtotalCents: null,
        knownSubtotal: null
      };
    }

    if (input.sameDay) {
      lines.push({
        kind: 'sameday',
        label: 'Same-day round trip surcharge',
        detail: 'You selected the published $1,000 surcharge for this scenario. Crew-rest limits and whether this replaces repositioning are not published.',
        cents: 100000
      });
    }

    if (input.crewNights != null && String(input.crewNights).trim() !== '') {
      var nights = intField(input.crewNights, 'Crew overnight nights', 0, 30);
      if (nights.status !== 'ok') errors.push(nights.message || 'Crew overnight nights must be a whole number from 0 to 30.');
      else lines.push({
        kind: 'crew',
        label: 'Crew overnight',
        detail: nights.value + ' × $2,500 per night (not per pilot).',
        cents: nights.value * 250000
      });
    }

    if (input.pets) {
      var tier = String(input.tier || '');
      if (tier === '25' || tier === '50') {
        lines.push({
          kind: 'pets',
          label: 'Pet travel',
          detail: 'Included for the ' + tier + '-hour tier. $0 added.',
          cents: 0
        });
      } else if (tier === '10') {
        if (input.petMode === 'once') {
          lines.push({
            kind: 'pets',
            label: 'Pet travel (scenario assumption)',
            detail: 'Brochure: "$500 per flight" for the 10-hour tier. The site does not say per flight. Whether "per flight" means per leg or per trip is not settled, so this scenario counts $500 once. It is not a published per-leg rule.',
            cents: 50000
          });
        } else {
          pending.push('Pet travel for the 10-hour tier is $500 per flight in the brochure. Leg versus trip is not defined, so the charge is pending until you choose to count $500 once for this scenario.');
        }
      } else {
        pending.push('Pets are selected. Choose the 10-, 25-, or 50-hour tier. The hourly rate does not change; the pet rule does.');
      }
    }

    addPassThrough(lines, pending, errors, input.catering, 'Special catering', 'No rate is published. Standard stocking is already in the hourly rate.');
    addPassThrough(lines, pending, errors, input.hangar, 'Weather hangaring and de-icing', 'No rate is published. The brochure adds "(away from base)"; the website does not. This preview does not decide which trips qualify.');
    addPassThrough(lines, pending, errors, input.specialEvent, 'Special-event surcharge', 'No amount or trigger is published. Peak days do not create this charge.');

    var intl = input.international || {};
    if (sawIntl && intl.mode !== 'amount') {
      pending.push('International handling applies to Los Cabos, Calgary, or Vancouver when you select them. No rate is published, and no country was guessed beyond that published list. Enter an actual amount to include a scenario figure.');
    } else if (!sawIntl && intl.mode === 'pending') {
      pending.push('You marked international handling as part of this scenario. No rate is published, so it stays pending until you enter an amount.');
    } else if (intl.mode === 'amount') {
      var money = parseUsd(intl.amount);
      if (money.status !== 'ok') errors.push('International handling amount must be a zero-or-greater dollar figure with at most two decimals.');
      else lines.push({ kind: 'pass', label: 'International handling (amount you entered)', detail: 'Scenario figure. Not a published rate.', cents: money.cents });
    }

    if (errors.length) {
      return {
        ok: false,
        fullTotal: false,
        status: 'Known charges cannot be subtotaled until the marked entries are fixed. This is not a full trip price.',
        errors: errors,
        lines: [],
        pending: [],
        assumptions: baseAssumptions((input.reposition || []).length),
        knownSubtotalCents: null,
        knownSubtotal: null
      };
    }

    var total = 0;
    lines.forEach(function (line) { total += line.cents; });
    assumptions = baseAssumptions((input.reposition || []).length);
    if (input.departureDate && PEAK_2027[input.departureDate]) {
      assumptions.push('This date is a published 2027 peak day. Peak days do not change the rate. Cancellation terms differ (site: 50% within 2 weeks, 100% within 72 hours; outside 2 weeks the site says no penalty, and that outside line is not repeated on the brochure peak list).');
    } else if (input.departureDate) {
      assumptions.push('No peak price change. The published peak calendar is 2027 only, so a date outside that list is not marked peak here.');
    }

    return {
      ok: true,
      fullTotal: false,
      status: pending.length
        ? 'Known charges subtotal only. Pending items below are not priced and are not treated as $0. This is not a full trip price.'
        : 'Known charges subtotal for the items in this scenario. The minutes are a quoted block time typed here, not an average quoted block time. No Clipper JetInsight quoted-block file is loaded. Repositioning applicability is still unresolved, so this is not a full trip price.',
      errors: [],
      lines: lines,
      pending: pending,
      assumptions: assumptions,
      knownSubtotalCents: total,
      knownSubtotal: formatUsd(total),
      occupiedMinutes: occupiedMinutes
    };
  }

  function addPassThrough(lines, pending, errors, spec, label, detail) {
    spec = spec || {};
    if (spec.mode === 'pending') {
      pending.push(label + ' is selected and has no amount. It is not entered as $0. ' + detail);
      return;
    }
    if (spec.mode === 'amount') {
      var money = parseUsd(spec.amount);
      if (money.status !== 'ok') errors.push(label + ' needs a dollar amount of zero or more, with at most two decimals.');
      else lines.push({ kind: 'pass', label: label + ' (amount you entered)', detail: detail, cents: money.cents });
    }
  }

  function baseAssumptions(repoCount) {
    var repo = repoCount
      ? 'You added ' + repoCount + ' unoccupied repositioning leg(s) as a scenario. The program does not state when repositioning is charged, how many legs, or whether the miles are statute or nautical. The flat fee uses only the number you typed.'
      : 'No repositioning leg is in this scenario. Whether one applies (for example from or back to Van Nuys) is not published. Do not read the subtotal as a full trip price.';
    return [
      'Quoted block times, set by Charles on 5 Nov 2026. Average quoted block time will be the mean quoted block hours on completed Clipper legs, from Clipper’s own JetInsight records only, kept as a separate direction for each airport pair and kept apart by aircraft type. No other operator, marketplace, or flight-tracking source is used. No quoted-block file has been retrieved, so nothing below is an average quoted block time or JetInsight data. The minutes in the subtotal are the quoted block time typed for this scenario. A historical quote average is not a flown time, not a billed time, and not a confirmed final billable time. A rounding increment and a minimum are still unpublished. The subtotal adds the entered quoted block minutes, multiplies by $5,500 / 60, and rounds half-up to the cent once. That cent step is display math, not a published billing rule.',
      repo,
      'The same-day $1,000 surcharge is added only when you select it. Whether it stacks with or replaces repositioning is not published.',
      'Standard stocking, Wi-Fi, and FBO and landing fees stay inside the occupied-hour rate. They are not added again.',
      'King Air 350 cabin is published as 8+1. Nothing here confirms availability or a nonstop routing.'
    ];
  }

  function publishedHint(fromId, toId) {
    var from = placeById(fromId);
    var to = placeById(toId);
    var named = null;
    if (to && to.publishedMinutes) named = to;
    else if (from && from.publishedMinutes) named = from;
    if (!named) return null;
    return {
      minutes: named.publishedMinutes,
      place: named.label,
      text: 'Brochure reference only, not an average quoted block time and not JetInsight data: about ' + Math.floor(named.publishedMinutes / 60) + 'h ' + (named.publishedMinutes % 60) + 'm for ' + named.label + '. The website says Los Angeles / Southern California. The brochure footnote names Van Nuys. Do not enter this figure as the quoted block time. It is not a flown time and not a billed time.'
    };
  }

  return {
    PLACES: PLACES,
    PEAK_2027: PEAK_2027,
    centsFromMinutes: centsFromMinutes,
    repoFee: repoFee,
    parseUsd: parseUsd,
    formatUsd: formatUsd,
    estimate: estimate,
    publishedHint: publishedHint
  };
});
