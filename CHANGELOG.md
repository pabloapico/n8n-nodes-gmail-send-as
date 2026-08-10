# Changelog

## 0.1.0 - 2026-08-09

- Initial `Send` operation.
- Reuses n8n's built-in `gmailOAuth2` credential type.
- Discovers Gmail Send As identities dynamically.
- Rejects missing, pending, or unknown aliases at execution time.
- Supports text, HTML, and multipart alternative bodies.
- Supports To, CC, BCC, Reply-To, sender display name, and binary attachments.
