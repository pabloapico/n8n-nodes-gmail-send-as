# Notices

This project was designed with the official n8n Gmail node as a technical reference,
especially its Gmail OAuth2 credential integration, MIME generation with Nodemailer,
binary attachment handling, and Gmail API request patterns.

The implementation in this repository is independently organized and adapted for the
specific purpose of sending through Gmail Send As identities. It does not import code
from private or undocumented n8n package paths at runtime.

Reference source reviewed:

- n8n Gmail node and helpers, tag `n8n@2.4.3`
- https://github.com/n8n-io/n8n/tree/n8n%402.4.3/packages/nodes-base/nodes/Google/Gmail

n8n is a trademark of n8n GmbH. Gmail and Google are trademarks of Google LLC.
This project is not affiliated with or endorsed by n8n GmbH or Google LLC.
