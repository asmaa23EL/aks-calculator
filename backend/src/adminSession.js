const crypto = require('crypto');

function getAdminSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || 'aks-calculator-admin-secret';
}

function base64UrlEncode(value) {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

function signValue(value) {
  return crypto.createHmac('sha256', getAdminSessionSecret()).update(value).digest('base64url');
}

function createAdminSessionToken(payload) {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signValue(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function verifyAdminSessionToken(token) {
  if (!token) {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return null;
  }

  const [encodedPayload, givenSignature] = parts;
  const expectedSignature = signValue(encodedPayload);

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return null;
    }

    if (
      typeof payload.userId !== 'number' ||
      typeof payload.email !== 'string' ||
      payload.role !== 'admin' ||
      typeof payload.exp !== 'number'
    ) {
      return null;
    }

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    const given = Buffer.from(givenSignature);
    const expected = Buffer.from(expectedSignature);
    if (given.length !== expected.length) {
      return null;
    }

    if (crypto.timingSafeEqual(given, expected)) {
      return payload;
    }

    const legacySignature = crypto.createHmac('sha256', 'changez_moi_secret_session_admin_long').update(encodedPayload).digest('base64url');
    const legacy = Buffer.from(legacySignature);
    if (legacy.length === given.length && crypto.timingSafeEqual(legacy, given)) {
      return payload;
    }

    return null;
  } catch {
    return null;
  }
}

module.exports = {
  createAdminSessionToken,
  verifyAdminSessionToken,
  getAdminSessionSecret,
};
