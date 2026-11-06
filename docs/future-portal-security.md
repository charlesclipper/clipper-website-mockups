# Future client portal: security boundary

This is a design requirement for a portal that may later hold client personal data and, separately, payments. It is not a certification, not a statement that the current preview is safe for that data, and not permission to turn the preview forms on.

The V82 site is a public static mockup. The login form is disabled. It does not create accounts, send mail, or accept passwords. Google Workspace is not chosen and is not connected. Staff use of Workspace multi-factor authentication would not prove multi-factor authentication for a customer account.

No card numbers, bank details, or client files belong in this repository or on the preview site.

## What must be true before confidential production use

An independent review against the OWASP Application Security Verification Standard, using a risk-based level agreed for this system, must be finished before real client data is collected. Passing that review is not a claim that risk is zero.

Identity:

- A managed identity provider, chosen after the current Workspace research, with verified multi-factor authentication, account linking, recovery, and revocation for customer accounts.
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

## Tests that must fail closed before launch

- A signed-in client requests another client's id and receives no data and no useful error detail.
- A client calls a staff action and is denied.
- A staff user without that client assignment is denied.
- Session cookie is unreadable from script, and a logged-out or expired session is rejected.
- A state-changing request without a fresh CSRF token is rejected. Replaying an old token is rejected.
- Cached responses for client data are not stored in a shared cache.
- Logs and the repository contain no client personal data, passwords, or payment numbers.

## Current preview boundary

The estimate and login pages are design prototypes. They do not submit to a server. Average quoted block times are not loaded. No route file and no client record is published from JetInsight. Dismissing the cookie note stores only a local flag that the note was closed. It is not analytics consent, and analytics are not loaded.
