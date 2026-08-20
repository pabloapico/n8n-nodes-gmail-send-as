const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildReplyRecipientLists,
  buildReplyThreadHeaders,
  getHeaderValue,
  selectLatestThreadMessage,
} = require('../dist/nodes/GmailSendAs/helpers/reply.js');

function message({ id = 'm1', threadId = 't1', internalDate = '1000', headers = [] } = {}) {
  return {
    id,
    threadId,
    internalDate,
    payload: { headers },
  };
}

function header(name, value) {
  return { name, value };
}

test('selects newest message from a thread by internalDate', () => {
  const newest = message({ id: 'newest', internalDate: '3000' });
  const selected = selectLatestThreadMessage({
    id: 'thread-1',
    messages: [
      message({ id: 'oldest', internalDate: '1000' }),
      newest,
      message({ id: 'middle', internalDate: '2000' }),
    ],
  });

  assert.equal(selected.id, 'newest');
});

test('thread selection rejects an empty thread', () => {
  assert.throws(
    () => selectLatestThreadMessage({ id: 'thread-1', messages: [] }),
    /contains no messages/u,
  );
});

test('header lookup is case-insensitive', () => {
  const value = getHeaderValue(
    message({ headers: [header('mEsSaGe-Id', '<one@example.com>')] }),
    'Message-ID',
  );
  assert.equal(value, '<one@example.com>');
});

test('reply prefers Reply-To over From', () => {
  const recipients = buildReplyRecipientLists(
    message({
      headers: [
        header('From', 'Author <author@example.com>'),
        header('Reply-To', 'Helpdesk <reply@example.com>'),
        header('To', 'support@example.com'),
      ],
    }),
    ['support@example.com'],
    true,
  );

  assert.equal(recipients.to, 'reply@example.com');
  assert.equal(recipients.cc, '');
});

test('reply-all preserves external To and Cc while excluding all own Send As identities', () => {
  const recipients = buildReplyRecipientLists(
    message({
      headers: [
        header('From', 'Customer <customer@example.net>'),
        header('To', 'support@example.com, Primary <primary@example.com>, colleague@example.net'),
        header('Cc', 'sales@example.com, observer@example.net'),
      ],
    }),
    ['primary@example.com', 'support@example.com', 'sales@example.com'],
    false,
  );

  assert.equal(recipients.to, 'customer@example.net, colleague@example.net');
  assert.equal(recipients.cc, 'observer@example.net');
});

test('reply to sender only excludes original To and Cc', () => {
  const recipients = buildReplyRecipientLists(
    message({
      headers: [
        header('From', 'customer@example.net'),
        header('To', 'colleague@example.net'),
        header('Cc', 'observer@example.net'),
      ],
    }),
    ['support@example.com'],
    true,
  );

  assert.equal(recipients.to, 'customer@example.net');
  assert.equal(recipients.cc, '');
});

test('builds reply subject, In-Reply-To and cumulative References', () => {
  const reply = buildReplyThreadHeaders(
    message({
      headers: [
        header('Subject', 'Existing conversation'),
        header('Message-ID', '<current@example.com>'),
        header('References', '<first@example.com> <second@example.com>'),
      ],
    }),
  );

  assert.deepEqual(reply, {
    subject: 'Existing conversation',
    inReplyTo: '<current@example.com>',
    references: '<first@example.com> <second@example.com> <current@example.com>',
  });
});

test('rejects reply reference without RFC Message-ID', () => {
  assert.throws(
    () => buildReplyThreadHeaders(message({ headers: [header('Subject', 'No id')] })),
    /does not contain an RFC Message-ID/u,
  );
});
