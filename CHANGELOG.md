# Changelog

## 0.2.1 - 2026-09-29

- Security maintenance release.
- Updates `nodemailer` to `10.0.10`.
- Published through npm Trusted Publishing (OIDC) with provenance.
- No functional regression expected from the previously deployed 0.2.1 candidate; executable package contents were verified before release.

## 0.2.0 - 2026-08-21

- Adds the `Reply` operation while preserving node v1 compatibility.
- Adds reply targets by Gmail Message ID or Thread ID.
- Adds Gmail-style reply options and improved Reply All recipient handling.
- Expands automated test coverage and release documentation.

## 0.1.0 - 2026-08-09

- Initial `Send` operation.
- Reuses n8n's built-in `gmailOAuth2` credential type.
- Discovers Gmail Send As identities dynamically.
- Rejects missing, pending, or unknown aliases at execution time.
- Supports text, HTML, and multipart alternative bodies.
- Supports To, CC, BCC, Reply-To, sender display name, and binary attachments.
