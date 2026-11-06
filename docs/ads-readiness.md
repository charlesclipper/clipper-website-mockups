# Ads measurement readiness

This is a design note for a later decision. It does not create a campaign, set a budget, link an account, turn on remarketing or Signals, upload customer data, or give anyone spending authority. No Ads plugin is installed. No connector such as Adspirer or Ryzen is installed. No account was opened or changed.

## What can count later

A `generate_lead` event is appropriate only after a server confirms that a quote request was actually received. The preview form does not POST, so it must not send that event, a key event, or a primary conversion. Opening the quote dialog, clicking a phone link, a mailto link, or the estimator, and seeing an estimator result are intent counts. They are not qualified leads, confirmed bookings, or qualified calls.

If Ads measurement is approved later, the same confirmed submission is either imported from GA4 or recorded as a native Ads conversion. It is not both. The count for that lead is One, not Every. That choice is made in the Ads and GA4 account screens. It is not made by this static page.

A phone click is not a qualified call. Call forwarding and a duration rule need a separate approval.

## What stays denied

`ad_storage`, `ad_user_data`, and `ad_personalization` stay denied. Signals and remarketing stay off. Enhanced conversions and hashed email or phone uploads are not anonymous and are not approved. Customer lists are not approved.

Auto-tagging and linking GA4 to Ads are account settings, not tags in these HTML files. `gclid`, `gbraid`, and `wbraid` must not be copied into Clarity or into a stored analytics payload. Keeping them for Ads attribution, if that is approved later, needs its own ads consent and a review of the owned container. This preview does not record those ids.

The hard off in `v82/js/analytics.js` means the tag is not inserted. It does not mean cookieless measurement continues. A modelled or ping-based consent mode is not this design.

## Budget

An average daily budget is not a strict cap on one day. Account type, campaign changes, and the exceptions in Google's spending rules matter. No amount, geography, service list, or change authority is set here. Those have to be written down and approved before any spend.

## Landing pages

The pages that match a future charter, program, or maintenance visit are `charter.html`, `altitudeaccess.html`, and `maintenance.html`. `estimate.html` and `empty-legs.html` are previews, not booking confirmations. `client-login.html` is not a campaign landing page. None of these pages fires a conversion.
