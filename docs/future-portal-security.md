# Future client portal: security boundary

This is a design requirement for a portal that may later hold client personal data and, separately, payments. It is not a certification, not a statement that the current preview is safe for that data, and not permission to turn the preview forms on.

The V82 site is a public static mockup. The login form is disabled. It does not create accounts, send mail, or accept passwords. Google Workspace is not chosen and is not connected. Staff use of Workspace multi-factor authentication would not prove multi-factor authentication for a customer account.

No card numbers, bank details, or client files belong in this repository or on the preview site.

## What must be true before confidential production use

An independent review against the OWASP Application Security Verification Standard, using a risk-based level agreed for this system, must be finished before real client data is collected. Passing that review is not a claim that risk is zero.

Identity:

- The candidate below is a research recommendation, not a decision and not a configured project. Nothing in Google Admin, Cloud, or Identity Platform has been provisioned.
- Server-side authentication on every request. Hiding a control in the browser is not protection.
- Server-side authentication on every request. Hiding a control in the browser is not protection.
- Authorization is default deny, checked on the server for each client, object, and action. One client must not read or change another client's records (including by changing an id). A staff role must not gain a client role by calling a client URL, and a client must not gain a staff action.
- Session cookies are Secure, HttpOnly, and SameSite. Sessions expire, rotate on privilege change, and are revoked on logout. State-changing requests require a CSRF token that is checked on the server and is not reused.
- Rate limits on login, recovery, and data reads. Failed attempts are logged without storing passwords or tokens in the log.

Data:

- Personal data and backups are encrypted, and the keys are not in the git repo or the page source.
- Servers and service accounts get only the access they need.
- Secrets live in a secrets manager. Audit logs record who accessed which client record. Logs do not contain session tokens, passwords, or full personal records.
- Input is validated on the server. Preview pages do not store client personal data.
- Retention, access review, and an incident and recovery plan exist before launch. Environments for development, test, and production are separate.

Build:

- Dependency and build provenance checks run before a production deploy.
- The content security policy is enforced by the production host as a response header. The preview's meta policy is only a static-page control and cannot set frame or sniff headers.

Payments, only if a later decision adds them:

- A hosted processor flow. The site stores a processor token or reference, not a card number or security code.
- No payment activity is set up now.
- A qualified PCI assessment is required before card data is in scope, plus signed webhooks, replay protection, idempotent charges, and reconciliation. None of that exists in this preview.

## Candidate identity architecture

Not selected for implementation. No project, OAuth client, domain, or delegation has been created. Staff use of Workspace multi-factor authentication does not prove that a customer account has a second factor.

The recommendation is Identity Platform, with Google as the first factor and a mandatory second factor, plus portal-owned roles. Workspace would be staff single sign-on, and only optionally a group that marks a person as eligible to be invited. Eligibility is not a client role.

Checked against the published guides, not against a running project:

- Verify a Google ID token on the server. Check the signature, `aud`, `iss` (`accounts.google.com` or `https://accounts.google.com`), and `exp`. Use `sub` as the stable account id. Google’s guide says email is a poor identifier because it can change, and that `sub` is not reused. Store `sub` only after a staff-controlled invite links it to the client record.
- Google is authoritative for the address when the email ends in `@gmail.com`, or when `email_verified` is true and `hd` is set (a hosted Workspace domain). If the address is not Gmail and `hd` is absent, Google is not authoritative, and a custom-domain address can be stale. Do not treat that address as proof of the current owner.
- Identity Platform can add TOTP as a second factor, at project or tenant level, after the user’s email is verified. Users enroll an authenticator app. The documented sign-in patterns include requiring enrollment for every user. This note did not run that enrollment.
- Blocking functions exist for `beforeCreate` and `beforeSignIn`. `beforeSignIn` runs after the password or provider check and, when multi-factor authentication is on, after the second factor. The function can reject the attempt. Anonymous and custom authentication do not support these functions. A blocking function does not, by itself, end sessions that were already issued.
- Identity Platform ID tokens last about an hour. Refresh tokens stop when the user is deleted, the user is disabled, or a major account change such as password or email is detected. `revokeRefreshTokens` can revoke a user’s refresh tokens. Because the ID token is a stateless JWT, the server only learns it was revoked if it verifies the token with the revocation check (`checkRevoked` / the equivalent). A disabled user fails that check. Removing someone from a Workspace group is not one of the documented reasons a refresh token expires, so group removal must not be treated as logout. The portal has to disable the user and revoke tokens, and every request has to check that state. Do not cache an allow list forever.
- The client should be signed out or asked to sign in again after revocation. Reauthentication is a separate step. Do not promise that the first Google sign-in remains valid for a later payment or other sensitive action.

Limits that the candidate must not paper over:

- Workspace cannot be assumed to force Google 2-Step Verification on people outside the staff domain. That was not re-tested in an admin console here.
- The second factor documented for this candidate is TOTP. Phone SMS is a separate Identity Platform factor and was not re-verified as a configured flow in this note. Neither is a native passkey second factor.
- TOTP is not phishing-resistant. Staff access should be designed for passkeys or security keys. A later payment or other financial step needs its own step-up and transaction checks. Google sign-in plus TOTP is not, by itself, unconditionally sufficient for that.
- Cross-domain group membership through the Admin SDK needs an authenticated, least-privilege call. Prefer read-only listing of direct members. Do not turn on domain-wide delegation as a convenience. Whether a given service account can read an external customer’s membership is unproven until that call is tested with the real roles. The provider API requires authorization. This repository does not have that access.

## Tests that must fail closed before launch

- The account key is the identity provider `sub` or `uid` linked by a staff invite, not an email address. A changed or unverified custom-domain email does not authorize the old client record.
- Removing a person from a Workspace eligibility group does not leave their existing session valid. The server disables the account or revokes refresh tokens, and the next request fails the revocation check.
- A signed-in client requests another client's id and receives no data and no useful error detail.
- A client calls a staff action and is denied.
- A staff user without that client assignment is denied.
- Session cookie is unreadable from script, and a logged-out or expired session is rejected.
- A state-changing request without a fresh CSRF token is rejected. Replaying an old token is rejected.
- Cached responses for client data are not stored in a shared cache.
- Logs and the repository contain no client personal data, passwords, or payment numbers.

## Current preview boundary

The estimate and login pages are design prototypes. They do not submit to a server. Average quoted block times are not loaded. No route file and no client record is published from JetInsight. Dismissing the cookie note stores only a local flag that the note was closed. It is not analytics consent, and analytics are not loaded.
