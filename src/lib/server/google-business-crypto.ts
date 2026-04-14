import 'server-only';

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

type EncryptedPayload = {
  iv: string;
  tag: string;
  ciphertext: string;
};

export function encryptGoogleBusinessSecret(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error('Cannot encrypt an empty Google Business secret.');
  }

  const key = resolveEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(normalized, 'utf-8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  const payload: EncryptedPayload = {
    iv: iv.toString('base64url'),
    tag: tag.toString('base64url'),
    ciphertext: ciphertext.toString('base64url'),
  };

  return Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
}

export function decryptGoogleBusinessSecret(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error('Cannot decrypt an empty Google Business secret.');
  }

  let payload: EncryptedPayload;
  try {
    payload = JSON.parse(
      Buffer.from(normalized, 'base64url').toString('utf-8'),
    ) as EncryptedPayload;
  } catch {
    throw new Error('Stored Google Business token is invalid.');
  }

  if (!payload.iv || !payload.tag || !payload.ciphertext) {
    throw new Error('Stored Google Business token payload is incomplete.');
  }

  const key = resolveEncryptionKey();
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(payload.iv, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64url'));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf-8');

  if (!plaintext.trim()) {
    throw new Error('Stored Google Business token decrypted to an empty value.');
  }

  return plaintext;
}

function resolveEncryptionKey() {
  const secret =
    (process.env.GOOGLE_BUSINESS_TOKEN_SECRET || '').trim() ||
    (process.env.HASURA_ADMIN_SECRET || '').trim() ||
    (process.env.HASURA_GRAPHQL_ADMIN_SECRET || '').trim();

  if (!secret) {
    throw new Error(
      'GOOGLE_BUSINESS_TOKEN_SECRET (or HASURA admin secret fallback) is not configured.',
    );
  }

  return createHash('sha256').update(secret).digest();
}
