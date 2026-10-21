import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';
import { config } from './config.js';

const ITERATIONS = 210_000;
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

export function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const hash = pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha512').toString('hex');
  return `${ITERATIONS}$${salt}$${hash}`;
}

export function verifyPassword(password, encoded) {
  const [iterationsText, salt, storedHex] = String(encoded).split('$');
  const iterations = Number(iterationsText);
  if (!iterations || !salt || !storedHex) return false;
  const supplied = pbkdf2Sync(password, salt, iterations, 32, 'sha512');
  const stored = Buffer.from(storedHex, 'hex');
  return supplied.length === stored.length && timingSafeEqual(supplied, stored);
}

export function signToken(userId) {
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS })).toString('base64url');
  const signature = createHmac('sha256', config.jwtSecret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyToken(token) {
  const [payload, signature] = String(token || '').split('.');
  if (!payload || !signature) return null;
  const expected = createHmac('sha256', config.jwtSecret).update(payload).digest();
  const received = Buffer.from(signature, 'base64url');
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return parsed.exp > Date.now() / 1000 ? parsed.sub : null;
  } catch {
    return null;
  }
}

export function requireAuth(request, response, next) {
  const header = request.headers.authorization || '';
  const userId = verifyToken(header.startsWith('Bearer ') ? header.slice(7) : '');
  if (!userId) return response.status(401).json({ error: 'Sessão inválida ou expirada.' });
  request.userId = userId;
  return next();
}
