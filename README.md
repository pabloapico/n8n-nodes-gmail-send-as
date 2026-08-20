# n8n-nodes-gmail-send-as

An n8n community node for sending and replying to Gmail messages from a Gmail **Send As** identity instead of always using the authenticated account's primary address.

The node reuses n8n's built-in `gmailOAuth2` credential. It never asks for an access token, refresh token, client secret, or OAuth payload as a regular node parameter.

## Status

Current release: `0.2.0`.

Version 2 adds **Reply**, Gmail-style **Options**, and explicit reply targeting by either Gmail **Message ID** or **Thread ID**. Existing workflows created with node version 1 keep the original Send-only behavior; newly added nodes use version 2.

A possible **Send and Wait** operation remains a separate future enhancement.

## Features

- Dynamically lists the primary Gmail address and configured Send As identities.
- Shows Gmail display name, primary/default status, and verification status.
- Rejects missing, pending, or unverified Send As identities at execution time.
- Revalidates the selected identity on every execution.
- **Send** new Gmail messages from a selected verified Send As identity.
- **Reply** to an existing Gmail message while preserving Gmail threading.
- Reply by **Message ID** or by **Thread ID**. Thread mode uses the newest message in the thread as the RFC reply reference.
- Reply All behavior excludes every address configured as one of the authenticated account's own Send As identities, helping avoid sending a reply back to the selected group/alias.
- Optional **Reply to Sender Only** mode.
- Gmail-style **Options** collection for attribution, attachments, BCC, CC, Sender Name, Send Replies To, and Reply to Sender Only.
- Supports plain text, HTML, or text-and-HTML alternatives.
- Supports one or more attachments from n8n binary properties.
- Uses Gmail API `users.messages.send` with RFC-compatible MIME encoded as base64url.
- Does not log or return OAuth secrets or raw credential payloads.

## Compatibility

- n8n self-hosted.
- Built and tested against `n8n-workflow 2.4.1`; the package declares the standard `n8n-workflow: *` peer dependency required by n8n community packages.
- Development references include the public official n8n Gmail node implementation and Gmail API documentation.
- Node.js 20.19 or newer for the package; the npm release workflow uses Node.js 24 and npm 11 for Trusted Publishing.

The primary validation target is the project's n8nlabs test instance.

## Gmail requirements

The selected n8n Gmail OAuth2 credential must have permission to:

- list Gmail Send As settings;
- read message/thread metadata when using Reply;
- send Gmail messages.

The default scopes of n8n's built-in Gmail OAuth2 credential normally cover these operations. A credential configured with custom scopes must retain compatible Gmail scopes.

The address selected in **From / Send As** must be either:

- the primary Gmail address; or
- a custom Send As identity whose `verificationStatus` is `accepted`.

A missing, pending, or unverified identity causes the node to fail before calling `users.messages.send`. The node never silently falls back to the primary address.

## Operations

### Send

Creates a new Gmail message. Required fields are:

- **From / Send As**
- **To**
- **Subject**
- **Email Format** and the corresponding body field(s)

### Reply

Replies inside an existing Gmail conversation using the selected Send As identity.

Choose a **Reply Target**:

- **Message ID**: reply using that exact Gmail message as the reference.
- **Thread ID**: fetch the Gmail thread and use its newest message as the reference.

The node derives the existing subject, Gmail thread ID, RFC `Message-ID`, `In-Reply-To`, and `References` values needed to keep the response in the conversation. It sends the reply through `users.messages.send` with the original Gmail `threadId`.

By default Reply behaves like Reply All for visible recipients. Enable **Reply to Sender Only** under Options to address only the original `Reply-To` header, or the original `From` address when no `Reply-To` exists.

When building Reply All recipients, the node excludes all addresses currently configured as Send As identities for the authenticated Gmail account. This prevents common cases such as a Google Group Send As address being copied back to itself.

## Options

Version 2 groups optional fields under **Options → Add option**, following the layout of n8n's native Gmail node:

| Option | Purpose |
|---|---|
| Append n8n Attribution | Optionally append an n8n attribution footer; default is `false` for backward compatibility |
| Attachments | Attach binary properties from the current n8n item |
| BCC | Blind-copy recipients |
| CC | Copy recipients; on Reply these are additional to any CC recipients derived from Reply All |
| Sender Name | Override the display name for the selected Send As identity |
| Send Replies To | Set the RFC `Reply-To` address for Send |
| Reply to Sender Only | Reply only to the sender/Reply-To instead of Reply All |

## Install or update in n8n

On a self-hosted n8n instance:

1. Open **Settings → Community nodes**.
2. Install or update the package:

```text
n8n-nodes-gmail-send-as
```

3. Restart n8n if the instance requests it.

The node intentionally reuses existing built-in Gmail OAuth2 credentials, so an existing `gmailOAuth2` credential can be selected directly.

## Node version compatibility

Package `0.2.0` introduces node version 2 while retaining node version 1.

- Existing workflows that already contain `Gmail Send As` v1 remain Send-only and keep their original parameter layout.
- New nodes default to v2 and expose Send + Reply with the Options collection.
- This avoids silently changing the behavior or parameter schema of workflows created with package `0.1.0`.

## Development

```bash
npm install
npm run lint
npm test
```

Run a local development instance with:

```bash
npm run dev
```

Build the distributable node with:

```bash
npm run build
```

Create an installable package archive with:

```bash
mkdir -p artifacts
npm pack --pack-destination artifacts
```

Every GitHub CI run also creates a `.tgz` package artifact.

## npm publication with Trusted Publishing

The repository publishes through GitHub Actions using npm Trusted Publishing (OIDC). No long-lived npm publish token is required by `.github/workflows/publish.yml`.

The npm package has a Trusted Publisher relationship configured for:

| Setting | Value |
|---|---|
| Provider | GitHub Actions |
| Organization or user | `pabloapico` |
| Repository | `n8n-nodes-gmail-send-as` |
| Workflow filename | `publish.yml` |
| Environment | empty / not configured |
| Allowed actions | `npm publish` |

The workflow uses a GitHub-hosted runner, grants `id-token: write`, runs Node.js 24 with npm 11, validates lint/tests, and then executes:

```bash
npm publish --access public
```

npm automatically generates provenance for public packages published from public GitHub repositories through Trusted Publishing.

### Release procedure

1. Update the version in `package.json` according to semantic versioning.
2. Commit the release changes to `main`.
3. Create and push a matching tag, for example `v0.2.0` for package version `0.2.0`.
4. GitHub Actions runs **Publish npm**.
5. The workflow rejects a tag whose version does not match `package.json`.

The workflow can also be started manually through `workflow_dispatch`; the version in `package.json` must still be unpublished on npm.

## Pre-release package artifact

For testing before an npm publication, install the exact `.tgz` artifact generated by GitHub Actions. This provides a deterministic rollback target.

```bash
cd /home/node/.n8n/nodes
npm install /path/to/n8n-nodes-gmail-send-as-<version>.tgz --omit=dev --no-audit --no-fund
```

Restart n8n afterward so it reloads node types.

## Uninstall / rollback

The node does not add database tables or modify existing credentials. To remove it from the n8n Community Nodes UI, use **Settings → Community nodes → Uninstall**.

Command-line fallback:

```bash
cd /home/node/.n8n/nodes
npm uninstall n8n-nodes-gmail-send-as
```

Restart n8n afterward. Existing workflows that reference the node remain stored but display the node as unavailable until the same or a compatible package version is installed again.

## Testing coverage

Automated tests cover:

- Text, HTML, and text+HTML MIME generation.
- Reply-To, CC, BCC, attachments, and UTF-8 content.
- RFC `In-Reply-To` and `References` headers.
- Primary, verified, invalid, and pending Send As identity resolution.
- Selection of the newest message for Thread ID replies.
- Reply-To preference over From.
- Reply All recipient generation and exclusion of all own Send As identities.
- Reply to Sender Only behavior.
- Cumulative References construction and missing Message-ID rejection.

## Security notes

- OAuth secrets are managed only through n8n credentials.
- npm releases use short-lived OIDC credentials instead of a long-lived publish token.
- Runtime Send As validation prevents a stale or expression-supplied value from bypassing the dropdown.
- Header fields reject CR/LF characters to reduce header-injection risk.
- Reply recipient derivation excludes all known Send As identities for the authenticated Gmail account.
- The node output contains Gmail message identifiers and the selected Send As address, not raw MIME or credential data.
- Raw MIME bodies and attachment contents are not logged.

## Technical references

- Gmail API: `users.settings.sendAs.list`
- Gmail API: `users.messages.get`
- Gmail API: `users.threads.get`
- Gmail API: `users.messages.send`
- Public official n8n Gmail node source used as a design reference

See [NOTICE.md](NOTICE.md) for attribution and [LICENSE.md](LICENSE.md) for licensing.
