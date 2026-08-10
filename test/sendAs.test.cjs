const test = require('node:test');
const assert = require('node:assert/strict');

const {
  formatSendAsOption,
  resolveSendAsIdentity,
  sortSendAsIdentities,
} = require('../dist/nodes/GmailSendAs/helpers/sendAs.js');

const primary = {
  sendAsEmail: 'owner@example.com',
  displayName: 'Owner',
  isPrimary: true,
  isDefault: true,
};

const verifiedAlias = {
  sendAsEmail: 'support@example.com',
  displayName: 'Support',
  verificationStatus: 'accepted',
};

const pendingAlias = {
  sendAsEmail: 'pending@example.com',
  displayName: 'Pending',
  verificationStatus: 'pending',
};

test('3. accepts the primary Gmail address', () => {
  const result = resolveSendAsIdentity([primary, verifiedAlias], 'OWNER@example.com');
  assert.equal(result.ok, true);
  assert.equal(result.identity.sendAsEmail, primary.sendAsEmail);
});

test('4. accepts a verified Gmail Send As alias', () => {
  const result = resolveSendAsIdentity([primary, verifiedAlias], verifiedAlias.sendAsEmail);
  assert.equal(result.ok, true);
  assert.equal(result.identity.displayName, 'Support');
});

test('5. rejects invalid and pending aliases', () => {
  const missing = resolveSendAsIdentity([primary, verifiedAlias], 'missing@example.com');
  const pending = resolveSendAsIdentity([primary, pendingAlias], pendingAlias.sendAsEmail);

  assert.deepEqual(missing, { ok: false, reason: 'missing' });
  assert.deepEqual(pending, { ok: false, reason: 'pending' });
  assert.equal(formatSendAsOption(pendingAlias).disabled, true);
});

test('orders primary and default identities first', () => {
  const sorted = sortSendAsIdentities([verifiedAlias, pendingAlias, primary]);
  assert.equal(sorted[0].sendAsEmail, primary.sendAsEmail);
});
