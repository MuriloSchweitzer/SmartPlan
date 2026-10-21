import { Router } from 'express';
import { pool, transaction } from '../database.js';
import { asyncRoute, httpError } from '../errors.js';
import { recalculateAgenda } from '../planner.js';
import { loadProfile } from '../profile.js';
import { hashPassword, verifyPassword } from '../security.js';
import {
  availabilitySchema,
  categorySchema,
  historySchema,
  parse,
  passwordSchema,
  profileSchema,
  recalculateSchema,
  taskSchema,
} from '../validation.js';

const router = Router();

async function respondWithProfile(response, userId, status = 200, extra = {}) {
  await pool.query('UPDATE users SET updated_at = NOW() WHERE id = $1', [userId]);
  response.status(status).json({ ...extra, profile: await loadProfile(userId) });
}

async function assertOwnedCategory(executor, userId, categoryId) {
  const result = await executor.query('SELECT 1 FROM categories WHERE id = $1 AND user_id = $2', [categoryId, userId]);
  if (!result.rowCount) throw httpError(400, 'Categoria inválida.');
}

async function assertOwnedTask(executor, userId, taskId) {
  const result = await executor.query('SELECT * FROM tasks WHERE id = $1 AND user_id = $2', [taskId, userId]);
  if (!result.rowCount) throw httpError(404, 'Tarefa não encontrada.');
  return result.rows[0];
}

router.get('/', asyncRoute(async (request, response) => {
  const profile = await loadProfile(request.userId);
  if (!profile) throw httpError(404, 'Conta não encontrada.');
  response.json({ profile });
}));

router.put('/', asyncRoute(async (request, response) => {
  const input = parse(profileSchema, request.body);
  await pool.query('UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2', [input.name, request.userId]);
  await respondWithProfile(response, request.userId);
}));

router.post('/password', asyncRoute(async (request, response) => {
  const input = parse(passwordSchema, request.body);
  const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [request.userId]);
  if (!result.rowCount) throw httpError(404, 'Conta não encontrada.');
  if (!verifyPassword(input.currentPassword, result.rows[0].password_hash)) throw httpError(401, 'A senha atual está incorreta.');
  await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hashPassword(input.newPassword), request.userId]);
  response.json({ ok: true });
}));

router.post('/categories', asyncRoute(async (request, response) => {
  const input = parse(categorySchema, request.body);
  await pool.query('INSERT INTO categories(user_id, name, color) VALUES ($1, $2, $3)', [request.userId, input.name, input.color]);
  await respondWithProfile(response, request.userId, 201);
}));

router.delete('/categories/:id', asyncRoute(async (request, response) => {
  const count = await pool.query('SELECT COUNT(*)::integer AS total FROM categories WHERE user_id = $1', [request.userId]);
  if (count.rows[0].total <= 1) throw httpError(400, 'Mantenha ao menos uma categoria.');
  const result = await pool.query('DELETE FROM categories WHERE id = $1 AND user_id = $2', [request.params.id, request.userId]);
  if (!result.rowCount) throw httpError(404, 'Categoria não encontrada.');
  await respondWithProfile(response, request.userId);
}));

router.post('/tasks', asyncRoute(async (request, response) => {
  const input = parse(taskSchema, request.body);
  await assertOwnedCategory(pool, request.userId, input.categoryId);
  await pool.query(`
    INSERT INTO tasks(
      user_id, category_id, title, description, context, deadline, mode,
      duration_minutes, criticality, impact, fixed_start, fixed_end
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
  `, [request.userId, input.categoryId, input.title, input.description || null, input.context, input.deadline,
    input.mode, input.duration, input.criticality, input.impact,
    input.mode === 'fixed' ? input.fixedStart : null, input.mode === 'fixed' ? input.fixedEnd : null]);
  await respondWithProfile(response, request.userId, 201);
}));

router.put('/tasks/:id', asyncRoute(async (request, response) => {
  const input = parse(taskSchema, request.body);
  await assertOwnedCategory(pool, request.userId, input.categoryId);
  const result = await pool.query(`
    UPDATE tasks SET category_id=$1, title=$2, description=$3, context=$4, deadline=$5,
      mode=$6, duration_minutes=$7, criticality=$8, impact=$9, fixed_start=$10, fixed_end=$11
    WHERE id=$12 AND user_id=$13 AND status IN ('pending','ongoing')
  `, [input.categoryId, input.title, input.description || null, input.context, input.deadline,
    input.mode, input.duration, input.criticality, input.impact,
    input.mode === 'fixed' ? input.fixedStart : null, input.mode === 'fixed' ? input.fixedEnd : null,
    request.params.id, request.userId]);
  if (!result.rowCount) throw httpError(404, 'Tarefa ativa não encontrada.');
  await respondWithProfile(response, request.userId);
}));

router.post('/tasks/:id/complete', asyncRoute(async (request, response) => {
  await transaction(async (client) => {
    const task = await assertOwnedTask(client, request.userId, request.params.id);
    if (['completed', 'cancelled'].includes(task.status)) throw httpError(400, 'A tarefa já foi finalizada.');
    await client.query("UPDATE tasks SET status='completed', completed_at=NOW() WHERE id=$1", [task.id]);
    await client.query('DELETE FROM agenda_blocks WHERE task_id=$1 AND starts_at >= NOW()', [task.id]);
  });
  await respondWithProfile(response, request.userId);
}));

router.delete('/tasks/:id', asyncRoute(async (request, response) => {
  const result = await pool.query('DELETE FROM tasks WHERE id=$1 AND user_id=$2', [request.params.id, request.userId]);
  if (!result.rowCount) throw httpError(404, 'Tarefa não encontrada.');
  await respondWithProfile(response, request.userId);
}));

router.post('/availability', asyncRoute(async (request, response) => {
  const input = parse(availabilitySchema, request.body);
  await transaction(async (client) => {
    for (const day of input.days) {
      await client.query(`
        INSERT INTO availability(user_id, weekday, start_time, end_time)
        VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING
      `, [request.userId, day, input.start, input.end]);
    }
  });
  await respondWithProfile(response, request.userId, 201);
}));

router.delete('/availability/:id', asyncRoute(async (request, response) => {
  const result = await pool.query('DELETE FROM availability WHERE id=$1 AND user_id=$2', [request.params.id, request.userId]);
  if (!result.rowCount) throw httpError(404, 'Disponibilidade não encontrada.');
  await respondWithProfile(response, request.userId);
}));

router.post('/history', asyncRoute(async (request, response) => {
  const input = parse(historySchema, request.body);
  const duration = Math.ceil((new Date(input.end) - new Date(input.start)) / 60_000);
  await transaction(async (client) => {
    const task = await assertOwnedTask(client, request.userId, input.taskId);
    await client.query(`
      INSERT INTO task_history(user_id, task_id, started_at, ended_at, duration_minutes)
      VALUES ($1,$2,$3,$4,$5)
    `, [request.userId, task.id, input.start, input.end, duration]);
    if (task.status === 'pending') await client.query("UPDATE tasks SET status='ongoing' WHERE id=$1", [task.id]);
  });
  await respondWithProfile(response, request.userId, 201);
}));

router.delete('/history/:id', asyncRoute(async (request, response) => {
  const result = await pool.query('DELETE FROM task_history WHERE id=$1 AND user_id=$2', [request.params.id, request.userId]);
  if (!result.rowCount) throw httpError(404, 'Registro não encontrado.');
  await respondWithProfile(response, request.userId);
}));

router.post('/agenda/recalculate', asyncRoute(async (request, response) => {
  const input = parse(recalculateSchema, request.body);
  const result = await transaction((client) => recalculateAgenda(client, request.userId, input.weekStart));
  await respondWithProfile(response, request.userId, 200, result);
}));

export default router;
