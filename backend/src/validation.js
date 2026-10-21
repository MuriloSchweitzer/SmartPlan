import { z } from 'zod';

const uuid = z.uuid('Identificador inválido.');
const dateTime = z.iso.datetime({ offset: true });
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário inválido.');

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(6).max(200),
});

export const loginSchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1).max(200),
});

export const profileSchema = z.object({ name: z.string().trim().min(2).max(120) });

export const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(6).max(200),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export const taskSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).optional().default(''),
  categoryId: uuid,
  context: z.enum(['Estudo', 'Trabalho', 'Pessoal']),
  deadline: dateTime,
  mode: z.enum(['flexible', 'fixed']),
  duration: z.number().int().min(1).max(100_000),
  criticality: z.number().int().min(1).max(5),
  impact: z.number().int().min(1).max(5),
  fixedStart: dateTime.nullable().optional(),
  fixedEnd: dateTime.nullable().optional(),
}).superRefine((task, context) => {
  if (task.mode === 'fixed') {
    if (!task.fixedStart || !task.fixedEnd) {
      context.addIssue({ code: 'custom', message: 'Informe início e fim da tarefa fixa.' });
      return;
    }
    if (new Date(task.fixedEnd) <= new Date(task.fixedStart)) context.addIssue({ code: 'custom', message: 'O fim fixo deve ser posterior ao início.' });
    if (new Date(task.fixedEnd) > new Date(task.deadline)) context.addIssue({ code: 'custom', message: 'A tarefa fixa precisa terminar até o prazo.' });
  }
});

export const availabilitySchema = z.object({
  days: z.array(z.number().int().min(1).max(7)).min(1),
  start: time,
  end: time,
}).refine((value) => value.end > value.start, { message: 'O horário final deve ser posterior ao inicial.' });

export const historySchema = z.object({ taskId: uuid, start: dateTime, end: dateTime })
  .refine((value) => new Date(value.end) > new Date(value.start), { message: 'O fim deve ser posterior ao início.' });

export const recalculateSchema = z.object({ weekStart: dateTime });

export function parse(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    const error = new Error(result.error.issues[0]?.message || 'Dados inválidos.');
    error.status = 400;
    throw error;
  }
  return result.data;
}
