import { calculatePriority } from './profile.js';

const DAY_MS = 86_400_000;

function timeToMinutes(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function atLocalMinutes(day, minutes) {
  return new Date(day.getTime() + minutes * 60_000);
}

function overlaps(start, end, block) {
  return new Date(block.starts_at) < end && new Date(block.ends_at) > start;
}

export async function recalculateAgenda(client, userId, weekStart) {
  const start = new Date(weekStart);
  const end = new Date(start.getTime() + 7 * DAY_MS);

  await client.query(`
    DELETE FROM agenda_blocks
    WHERE user_id = $1 AND manual = FALSE AND starts_at >= $2 AND starts_at < $3
  `, [userId, start, end]);

  const [tasksResult, availabilityResult, historyResult, manualResult] = await Promise.all([
    client.query(`
      SELECT id, title, deadline, mode, duration_minutes, criticality, impact, fixed_start, fixed_end
      FROM tasks
      WHERE user_id = $1 AND status IN ('pending', 'ongoing') AND deadline >= $2
    `, [userId, start]),
    client.query(`
      SELECT weekday, to_char(start_time, 'HH24:MI') AS start_time,
             to_char(end_time, 'HH24:MI') AS end_time
      FROM availability WHERE user_id = $1 ORDER BY weekday, start_time
    `, [userId]),
    client.query(`
      SELECT task_id, COALESCE(SUM(duration_minutes), 0)::integer AS executed
      FROM task_history WHERE user_id = $1 GROUP BY task_id
    `, [userId]),
    client.query(`
      SELECT id, task_id, starts_at, ends_at, status, manual
      FROM agenda_blocks
      WHERE user_id = $1 AND manual = TRUE AND starts_at >= $2 AND starts_at < $3
    `, [userId, start, end]),
  ]);

  const executedByTask = new Map(historyResult.rows.map((row) => [row.task_id, row.executed]));
  const blocks = [...manualResult.rows];
  const fixedTasks = tasksResult.rows.filter((task) => task.mode === 'fixed');

  for (const task of fixedTasks) {
    const fixedStart = new Date(task.fixed_start);
    const fixedEnd = new Date(task.fixed_end);
    if (fixedStart < start || fixedStart >= end) continue;
    const result = await client.query(`
      INSERT INTO agenda_blocks(user_id, task_id, starts_at, ends_at, status, manual)
      VALUES ($1, $2, $3, $4, 'planned', FALSE)
      RETURNING id, task_id, starts_at, ends_at, status, manual
    `, [userId, task.id, fixedStart, fixedEnd]);
    blocks.push(result.rows[0]);
  }

  const flexibleTasks = tasksResult.rows
    .filter((task) => task.mode === 'flexible')
    .map((task) => ({ ...task, deadline: task.deadline, criticality: task.criticality, impact: task.impact }))
    .sort((first, second) => calculatePriority(second) - calculatePriority(first));

  let unallocatedCount = 0;
  for (const task of flexibleTasks) {
    let remaining = Math.max(0, task.duration_minutes - (executedByTask.get(task.id) || 0));

    for (let dayIndex = 0; dayIndex < 7 && remaining > 0; dayIndex += 1) {
      const day = new Date(start.getTime() + dayIndex * DAY_MS);
      if (day > new Date(task.deadline)) break;
      const weekday = dayIndex + 1;
      const windows = availabilityResult.rows.filter((window) => window.weekday === weekday);

      for (const window of windows) {
        let cursor = atLocalMinutes(day, timeToMinutes(window.start_time));
        const windowEnd = atLocalMinutes(day, timeToMinutes(window.end_time));
        const occupied = blocks.filter((block) => overlaps(cursor, windowEnd, block)).sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));

        for (const busy of [...occupied, { starts_at: windowEnd, ends_at: windowEnd }]) {
          const busyStart = new Date(busy.starts_at);
          if (busyStart > cursor && remaining > 0) {
            const available = Math.floor((busyStart - cursor) / 60_000);
            const amount = Math.min(remaining, available);
            if (amount >= 15) {
              const blockEnd = new Date(cursor.getTime() + amount * 60_000);
              if (blockEnd <= new Date(task.deadline)) {
                const result = await client.query(`
                  INSERT INTO agenda_blocks(user_id, task_id, starts_at, ends_at, status, manual)
                  VALUES ($1, $2, $3, $4, 'planned', FALSE)
                  RETURNING id, task_id, starts_at, ends_at, status, manual
                `, [userId, task.id, cursor, blockEnd]);
                blocks.push(result.rows[0]);
                remaining -= amount;
                cursor = blockEnd;
              }
            }
          }
          const busyEnd = new Date(busy.ends_at);
          if (busyEnd > cursor) cursor = busyEnd;
        }
      }
    }
    if (remaining > 0) unallocatedCount += 1;
  }

  return { unallocatedCount };
}
