export function formatDate(value, options = { day: '2-digit', month: 'short' }) {
  return new Intl.DateTimeFormat('pt-BR', options).format(new Date(value));
}

export function formatTime(value) {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export function formatMinutes(minutes) {
  const safe = Math.max(0, Math.round(minutes || 0));
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  return hours ? `${hours}h${rest ? ` ${rest}min` : ''}` : `${rest}min`;
}

export function toInputDate(value) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function startOfWeek(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
}

export function addDays(value, amount) {
  const date = new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
}

export function sameDay(firstValue, secondValue) {
  const first = new Date(firstValue);
  const second = new Date(secondValue);
  return first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate();
}

export function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

export function urgency(task, now = new Date()) {
  const hours = (new Date(task.deadline) - now) / 3_600_000;
  if (hours <= 24) return 5;
  if (hours <= 72) return 4;
  if (hours <= 168) return 3;
  if (hours <= 336) return 2;
  return 1;
}

export function priority(task, now = new Date()) {
  return Math.round((0.4 * Number(task.criticality) + 0.4 * urgency(task, now) + 0.2 * Number(task.impact)) * 10) / 10;
}

export function priorityLabel(score) {
  return score >= 4 ? 'Alta' : score >= 3 ? 'Média' : 'Baixa';
}
