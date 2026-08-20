const test = require('node:test');
const assert = require('node:assert/strict');

const {
  appendN8nAttribution,
} = require('../dist/nodes/GmailSendAs/helpers/attribution.js');

test('attribution appends to text body', () => {
  const result = appendN8nAttribution('text', 'Original text', undefined);
  assert.match(result.text, /^Original text/u);
  assert.match(result.text, /This email was sent automatically with n8n/u);
  assert.match(result.text, /https:\/\/n8n\.io/u);
  assert.equal(result.html, undefined);
});

test('attribution appends to both text and HTML alternatives', () => {
  const result = appendN8nAttribution('both', 'Plain', '<p>Rich</p>');
  assert.match(result.text, /This email was sent automatically with n8n/u);
  assert.match(result.html, /This email was sent automatically with/u);
  assert.match(result.html, /https:\/\/n8n\.io/u);
});
