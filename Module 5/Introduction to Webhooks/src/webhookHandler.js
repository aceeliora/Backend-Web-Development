'use strict';

const crypto = require('node:crypto');
const { handleEvent } = require('./eventHandlers');

const _processedIds = new Set();

function invalidSignature(res) {
  return res.status(401).json({ error: 'Invalid signature' });
}

function handleWebhook(req, res) {
  const signature = req.headers['x-webhook-signature'];
  const secret = process.env.WEBHOOK_SECRET;

  // Reject malformed headers before decoding so the comparison always uses
  // two complete SHA-256 digests of equal length.
  const signatureMatch = typeof signature === 'string'
    ? /^sha256=([a-f0-9]{64})$/i.exec(signature)
    : null;

  if (!secret || !Buffer.isBuffer(req.body) || !signatureMatch) {
    return invalidSignature(res);
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(req.body)
    .digest();
  const received = Buffer.from(signatureMatch[1], 'hex');

  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    return invalidSignature(res);
  }

  let event;
  try {
    event = JSON.parse(req.body);
  } catch (error) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  if (_processedIds.has(event.id)) {
    return res.status(200).json({ status: 'already_processed' });
  }

  // Record the id before acknowledging so concurrent/retried deliveries
  // cannot schedule the same event more than once.
  _processedIds.add(event.id);
  res.status(200).json({ status: 'received' });

  setImmediate(() => {
    try {
      Promise.resolve(handleEvent(event)).catch((error) => {
        console.error('Webhook event processing failed:', error);
      });
    } catch (error) {
      console.error('Webhook event processing failed:', error);
    }
  });
}

module.exports = { handleWebhook, _processedIds };
