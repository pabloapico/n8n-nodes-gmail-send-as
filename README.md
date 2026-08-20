# n8n-nodes-gmail-send-as

An n8n community node that sends Gmail messages from a Gmail **Send As** identity instead of always using the authenticated account's primary address.

The node reuses n8n's built-in `gmailOAuth2` credential. It never asks for an access token, refresh token, client secret, or OAuth payload as a regular node parameter.

## Status

Initial public release: `0.1.0`.

The first version implements only **Send**. A possible **Send and Wait** operation will be evaluated separately after the Send operation is stable.

## Features

- Dynamically lists the primary Gmail address and configured Send As identities.
- Shows Gmail display name, primary/default status, and verification status.
- Clearly marks aliases that Gmail reports as pending verification and rejects them at execution time.
- Revalidates the selected identity at execution time.
- Supports sender display name override.
- Supports To, CC, BCC, Reply-To, and UTF-8 subjects.
- Supports plain text, HTML, or text-and-HTML alternatives.
- Supports one or more attachments from n8n binary properties.
- Uses Gmail API `users.messages.send` with an RFC-compatible MIME message encoded as base64url.
- Does not log or return OAuth secrets or raw credential payloads.

## Compatibility

- n8n self-hosted.
- Built and tested against `n8n-workflow 2.4.1`; the package declares the standard `n8n-workflow: *` peer dependency required by n8n community packages.
- Development source baseline: the official Gmail node in n8n tag `n8n@2.4.3`.
- Node.js 20.19 or newer for the package; the npm release workflow uses Node.js 24 and npm 11 for Trusted Publishing.

The initial deployment target is the project's n8nlabs test instance.

## Gmail requirements

The selected n8n Gmail OAuth2 credential must have permission to:

- list Gmail Send As settings;
- send Gmail messages.

The default scopes of n8n's built-in Gmail OAuth2 credential normally cover both operations. A credential configured with custom scopes must retain compatible Gmail scopes.

The address selected in **From / Send As** must be either:

- the primary Gmail address; or
- a custom Send As identity whose `verificationStatus` is `accepted`.

A missing, pending, or unverified identity causes the node to fail before calling `users.messages.send`. The node never silently falls back to the primary address.

## Node parameters

| Parameter | Purpose |
|---|---|
| From / Send As | Primary address or verified Gmail Send As identity |
| Sender Name | Optional display-name override |
| To | One or more comma-separated recipients |
| CC | Optional copy recipients |
| BCC | Optional blind-copy recipients |
| Reply-To | Optional single reply address |
| Subject | Message subject |
| Email Format | Text, HTML, or Text and HTML |
| Text Body | Plain-text body when applicable |
| HTML Body | HTML body when applicable |
| Attachments | Binary property names from the current n8n input item |

## Install in n8n

On a self-hosted n8n instance:

1. Open **Settings → Community nodes**.
2. Click **Install**.
3. Enter:

```text
n8n-nodes-gmail-send-as
```

4. Confirm the installation and restart n8n if the instance requests it.

The node intentionally reuses the existing built-in Gmail OAuth2 credentials, so an existing `gmailOAuth2` credential can be selected directly.

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

The npm package must have this Trusted Publisher relationship configured once in npmjs.com:

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
3. Create and push a matching tag, for example `v0.1.1` for package version `0.1.1`.
4. GitHub Actions runs **Publish npm**.
5. The workflow rejects a tag whose version does not match `package.json`.

The workflow can also be started manually through `workflow_dispatch`; the version in `package.json` must still be unpublished on npm.

After Trusted Publishing has been verified, any legacy `NPM_TOKEN` repository secret and npm publish token can be removed or revoked because the publish workflow no longer references them.

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

Automated tests currently cover:

1. Simple text email.
2. HTML email.
3. Primary Gmail address.
4. Verified alias.
5. Invalid and pending alias.
6. Reply-To.
7. CC and BCC.
8. Single attachment.
9. Multiple attachments.
10. UTF-8 subject, body, display name, and attachment filename.

## Security notes

- OAuth secrets are managed only through n8n credentials.
- npm releases use short-lived OIDC credentials instead of a long-lived publish token once Trusted Publishing is configured.
- Runtime alias validation prevents a stale or expression-supplied value from bypassing the dropdown.
- Header fields reject CR/LF characters to reduce header-injection risk.
- The node output contains Gmail message identifiers and the selected Send As address, not raw MIME or credential data.
- Raw MIME bodies and attachment contents are not logged.

## Technical references

- Gmail API: `users.settings.sendAs.list`
- Gmail API: `users.messages.send`
- Official n8n Gmail node source used as a design reference

See [NOTICE.md](NOTICE.md) for attribution and [LICENSE.md](LICENSE.md) for licensing.
