# Notices

This project was designed with the public official n8n Gmail node as a technical reference,
especially its Gmail OAuth2 credential integration, MIME generation with Nodemailer,
binary attachment handling, Gmail API request patterns, and the behavior expected for
replying inside an existing Gmail thread.

The implementation in this repository is independently organized and adapted for the
specific purpose of sending and replying through Gmail Send As identities. It does not
import code from private or undocumented n8n package paths at runtime.

Reference sources reviewed include:

- n8n Gmail node and helpers, tag `n8n@2.4.3`
- the later public n8n Gmail Reply implementation and tests in the n8n GitHub repository
- Gmail API public documentation for messages, threads, and Send As settings

Original baseline reference:

- https://github.com/n8n-io/n8n/tree/n8n%402.4.3/packages/nodes-base/nodes/Google/Gmail

n8n is a trademark of n8n GmbH. Gmail and Google are trademarks of Google LLC.
This project is not affiliated with or endorsed by n8n GmbH or Google LLC.
