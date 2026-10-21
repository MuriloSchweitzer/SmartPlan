import { pool } from './database.js';

export async function loadProfile(userId, executor = pool) {
  const [userResult, categoriesResult, tasksResult, availabilityResult, agendaResult, historyResult] = await Promise.all([
    executor.query('SELECT id, name, email, created_at, updated_at FROM users WHERE id = $1', [userId]),
    executor.query('SELECT id, name, color FROM categories WHERE user_id = $1 ORDER BY created_at, name', [userId]),
    executor.query(`
      SELECT id, category_id, title, description, context, deadline, mode, duration_minutes,
             criticality, impact, fixed_start, fixed_end, status, created_at, completed_at
      FROM tasks WHERE user_id = $1 ORDER BY created_at DESC
    `, [userId]),
    executor.query(`
      SELECT id, weekday, to_char(start_time, 'HH24:MI') AS start_time,
             to_char(end_time, 'HH24:MI') AS end_time
      FROM availability WHERE user_id = $1 ORDER BY weekday, start_time
    `, [userId]),
    executor.query(`
      SELECT id, task_id, starts_at, ends_at, status, manual
      FROM agenda_blocks WHERE user_id = $1 ORDER BY starts_at
    `, [userId]),
    executor.query(`
      SELECT id, task_id, agenda_block_id, started_at, ended_at, duration_minutes
      FROM task_history WHERE user_id = $1 ORDER BY started_at DESC
    `, [userId]),
  ]);

  const user = userResult.rows[0];
  if (!user) return null;

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.created_at,
    },
    categories: categoriesResult.rows.map((row) => ({ id: row.id, name: row.name, color: row.color })),
    tasks: tasksResult.rows.map((row) => ({
      id: row.id,
      categoryId: row.category_id,
      title: row.title,
      description: row.description || '',
      context: row.context,
      deadline: row.deadline,
      mode: row.mode,
      duration: row.duration_minutes,
      criticality: row.criticality,
      impact: row.impact,
      fixedStart: row.fixed_start,
      fixedEnd: row.fixed_end,
      status: row.status,
      createdAt: row.created_at,
      completedAt: row.completed_at,
    })),
    availability: availabilityResult.rows.map((row) => ({
      id: row.id,
      day: row.weekday,
      start: row.start_time,
      end: row.end_time,
    })),
    agenda: agendaResult.rows.map((row) => ({
      id: row.id,
      taskId: row.task_id,
      start: row.starts_at,
      end: row.ends_at,
      status: row.status,
      manual: row.manual,
    })),
    history: historyResult.rows.map((row) => ({
      id: row.id,
      taskId: row.task_id,
      agendaBlockId: row.agenda_block_id,
      start: row.started_at,
      end: row.ended_at,
      duration: row.duration_minutes,
    })),
    updatedAt: user.updated_at,
  };
}

export function calculateUrgency(task, now = new Date()) {
  const hours = (new Date(task.deadline) - now) / 3_600_000;
  if (hours <= 24) return 5;
  if (hours <= 72) return 4;
  if (hours <= 168) return 3;
  if (hours <= 336) return 2;
  return 1;
}

export function calculatePriority(task, now = new Date()) {
  return Math.round((0.4 * task.criticality + 0.4 * calculateUrgency(task, now) + 0.2 * task.impact) * 10) / 10;
}
