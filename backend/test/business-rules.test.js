import assert from 'node:assert/strict';
import test from 'node:test';

process.env.DATABASE_URL ||= 'postgresql://smartplan:smartplan_local@localhost:5432/smartplan';
process.env.JWT_SECRET ||= 'smartplan-test-secret-with-at-least-32-characters';

const { calculatePriority, calculateUrgency } = await import('../src/profile.js');
const { hashPassword, verifyPassword } = await import('../src/security.js');

test('prioridade aumenta conforme o prazo se aproxima', () => {
  const now = new Date('2026-10-20T08:00:00-03:00');
  const base = { criticality: 3, impact: 3 };
  const distant = { ...base, deadline: '2026-11-20T08:00:00-03:00' };
  const urgent = { ...base, deadline: '2026-10-21T07:00:00-03:00' };
  assert.ok(calculatePriority(urgent, now) > calculatePriority(distant, now));
  assert.equal(calculateUrgency(urgent, now), 5);
});

test('senha é derivada com salt e verificada sem texto aberto', () => {
  const encoded = hashPassword('segredo123');
  assert.equal(encoded.includes('segredo123'), false);
  assert.equal(verifyPassword('segredo123', encoded), true);
  assert.equal(verifyPassword('incorreta', encoded), false);
});
