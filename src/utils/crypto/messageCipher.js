// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE CIPHER — AES-256-GCM with versioned payloads
//
// Every message body is encrypted with a per-message random IV and an
// authenticated cipher (GCM), then serialised as:
//
//     v1:<iv-b64>:<auth-tag-b64>:<ciphertext-b64>
//
// The `v1:` prefix enables future key/cipher rotation: a `v2` payload can
// be introduced without breaking decryption of existing messages.
//
// Key sourcing: `MESSAGE_ENCRYPTION_KEY` env var, 64 hex chars (32 bytes).
// Generate with:  openssl rand -hex 32
//
// Threat model: protects the `message.body` column against DB dumps,
// backup theft, and read-only SQL injection. Does NOT protect against a
// compromised server process (the key lives in memory). For end-to-end,
// you need a client-side key exchange — out of scope here by design.
// ─────────────────────────────────────────────────────────────────────────────

import crypto from 'node:crypto';
import { config } from '../../config/config.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;         // 96 bits — required by NIST SP 800-38D for GCM
const AUTH_TAG_LENGTH = 16;   // 128 bits
const VERSION = 'v1';

const getKey = () => {
  const raw = config.messageEncryptionKey;
  if (!raw) {
    throw new Error('MESSAGE_ENCRYPTION_KEY is not set');
  }
  const key = Buffer.from(raw, 'hex');
  if (key.length !== 32) {
    throw new Error('MESSAGE_ENCRYPTION_KEY must be 32 bytes (64 hex chars)');
  }
  return key;
};

/**
 * Encrypts a plaintext message body.
 *
 * @param {string} plaintext - 1–2000 chars, validated by the Joi schema.
 * @returns {string} A versioned, base64-encoded payload string.
 * @throws {Error} If `plaintext` is not a string, or the key is missing/malformed.
 */
export const encryptMessage = (plaintext) => {
  if (typeof plaintext !== 'string') {
    throw new Error('Message body must be a string');
  }
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString('base64'),
    authTag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':');
};

/**
 * Decrypts a versioned payload produced by {@link encryptMessage}.
 *
 * @param {string} payload - The stored `message.body` value.
 * @returns {string} The original plaintext.
 * @throws {Error} If the payload is malformed, unversioned, or fails
 *   authentication (wrong key / tampering).
 */
export const decryptMessage = (payload) => {
  if (typeof payload !== 'string') {
    throw new Error('Encrypted payload must be a string');
  }
  const parts = payload.split(':');
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error('Unsupported or malformed encrypted payload');
  }
  const [, ivB64, tagB64, ctB64] = parts;

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(ivB64, 'base64'),
    { authTagLength: AUTH_TAG_LENGTH },
  );
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ctB64, 'base64')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
};
