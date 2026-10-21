import { Router } from 'express';
import { transaction, pool } from '../database.js';
import { asyncRoute, httpError } from '../errors.js';
import { loadProfile } from '../profile.js';
import { hashPassword, signToken, verifyPassword } from '../security.js';
import { loginSchema, parse, registerSchema } from '../validation.js';

const router = Router();

router.post('/register', asyncRoute(async (request, response) => {
  const input = parse(registerSchema, request.body);
  const result = await transaction(async (client) => {
    const existing = await client.query('SELECT 1 FROM users WHERE email = $1', [input.email]);
    if (existing.rowCount) throw httpError(409, 'Este e-mail já está cadastrado.');

    const userResult = await client.query(`
      INSERT INTO users(name, email, password_hash) VALUES ($1, $2, $3)
      RETURNING id
    `, [input.name, input.email, hashPassword(input.password)]);
    const userId = userResult.rows[0].id;
    await client.query(`
      INSERT INTO categories(user_id, name, color) VALUES
        ($1, 'Estudo', '#6558E8'),
        ($1, 'Trabalho', '#168E9B'),
        ($1, 'Pessoal', '#F1715B')
    `, [userId]);
    return { userId, profile: await loadProfile(userId, client) };
  });

  response.status(201).json({ token: signToken(result.userId), profile: result.profile });
}));

router.post('/login', asyncRoute(async (request, response) => {
  const input = parse(loginSchema, request.body);
  const account = await pool.query('SELECT id, password_hash FROM users WHERE email = $1', [input.email]);
  const user = account.rows[0];
  if (!user || !verifyPassword(input.password, user.password_hash)) throw httpError(401, 'E-mail ou senha incorretos.');
  response.json({ token: signToken(user.id), profile: await loadProfile(user.id) });
}));

export default router;
