const test = require('node:test');
const assert = require('node:assert/strict');
const { simpleParser } = require('mailparser');

const {
  buildRawMessage,
  decodeRawMessage,
} = require('../dist/nodes/GmailSendAs/helpers/mime.js');

async function parseMessage(overrides = {}) {
  const raw = await buildRawMessage({
    fromEmail: 'support@example.com',
    senderName: 'Support',
    to: 'recipient@example.com',
    subject: 'Test subject',
    text: 'Test body',
    ...overrides,
  });

  assert.doesNotMatch(raw, /[+/=]/u, 'Gmail raw payload must be base64url without padding');
  return simpleParser(decodeRawMessage(raw));
}

test('1. builds a simple text email', async () => {
  const parsed = await parseMessage();
  assert.equal(parsed.subject, 'Test subject');
  assert.equal(parsed.text.trim(), 'Test body');
  assert.equal(parsed.html, false);
});

test('2. builds an HTML email', async () => {
  const parsed = await parseMessage({ text: undefined, html: '<h1>Hello</h1><p>HTML body</p>' });
  assert.match(parsed.html, /<h1>Hello<\/h1>/u);
});

test('supports text and HTML alternatives', async () => {
  const parsed = await parseMessage({ text: 'Plain fallback', html: '<p>Rich body</p>' });
  assert.match(parsed.text, /Plain fallback/u);
  assert.match(parsed.html, /Rich body/u);
});

test('6. includes Reply-To', async () => {
  const parsed = await parseMessage({ replyTo: 'replies@example.com' });
  assert.equal(parsed.replyTo.value[0].address, 'replies@example.com');
});

test('7. includes CC and BCC recipients', async () => {
  const parsed = await parseMessage({
    cc: 'copy@example.com',
    bcc: 'blind@example.com',
  });
  assert.equal(parsed.cc.value[0].address, 'copy@example.com');
  assert.equal(parsed.bcc.value[0].address, 'blind@example.com');
});

test('8. includes one attachment with filename and MIME type', async () => {
  const parsed = await parseMessage({
    attachments: [
      {
        filename: 'report.txt',
        content: Buffer.from('attachment one'),
        contentType: 'text/plain',
      },
    ],
  });

  assert.equal(parsed.attachments.length, 1);
  assert.equal(parsed.attachments[0].filename, 'report.txt');
  assert.equal(parsed.attachments[0].contentType, 'text/plain');
  assert.equal(parsed.attachments[0].content.toString(), 'attachment one');
});

test('9. includes multiple attachments', async () => {
  const parsed = await parseMessage({
    attachments: [
      {
        filename: 'first.txt',
        content: Buffer.from('first'),
        contentType: 'text/plain',
      },
      {
        filename: 'second.json',
        content: Buffer.from('{"ok":true}'),
        contentType: 'application/json',
      },
    ],
  });

  assert.deepEqual(
    parsed.attachments.map((attachment) => attachment.filename),
    ['first.txt', 'second.json'],
  );
});

test('10. preserves UTF-8 subject, body, sender name, and attachment filename', async () => {
  const parsed = await parseMessage({
    senderName: 'Soporte Ingeniería Ñ',
    subject: 'Confirmación número 123 — Bogotá',
    text: 'Hola, acción completada correctamente. áéíóú ñ',
    attachments: [
      {
        filename: 'información-ñ.txt',
        content: Buffer.from('contenido UTF-8', 'utf8'),
        contentType: 'text/plain',
      },
    ],
  });

  assert.equal(parsed.from.value[0].name, 'Soporte Ingeniería Ñ');
  assert.equal(parsed.subject, 'Confirmación número 123 — Bogotá');
  assert.match(parsed.text, /áéíóú ñ/u);
  assert.equal(parsed.attachments[0].filename, 'información-ñ.txt');
});

test('11. includes RFC reply threading headers', async () => {
  const parsed = await parseMessage({
    inReplyTo: '<original-message@example.com>',
    references: '<older-message@example.com> <original-message@example.com>',
  });

  assert.equal(parsed.inReplyTo, '<original-message@example.com>');
  assert.deepEqual(parsed.references, [
    '<older-message@example.com>',
    '<original-message@example.com>',
  ]);
});
