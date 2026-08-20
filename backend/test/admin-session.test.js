const test = require('node:test');
const assert = require('node:assert/strict');
const { createAdminSessionToken, verifyAdminSessionToken } = require('../src/adminSession');

test('verifyAdminSessionToken accepts token created with the default fallback secret', () => {
  const previousSecret = process.env.ADMIN_SESSION_SECRET;
  delete process.env.ADMIN_SESSION_SECRET;

  try {
    const token = createAdminSessionToken({
      userId: 1,
      email: 'admin@example.com',
      role: 'admin',
      exp: Math.floor(Date.now() / 1000) + 60,
    });

    const payload = verifyAdminSessionToken(token);
    assert.ok(payload);
    assert.equal(payload.email, 'admin@example.com');
    assert.equal(payload.role, 'admin');
  } finally {
    if (previousSecret === undefined) {
      delete process.env.ADMIN_SESSION_SECRET;
    } else {
      process.env.ADMIN_SESSION_SECRET = previousSecret;
    }
  }
});
