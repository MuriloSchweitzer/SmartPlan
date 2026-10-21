import { useState } from 'react';
import { addDays, formatDate, formatMinutes, formatTime, priority, sameDay, startOfWeek } from '../lib/format.js';
import { EmptyState } from '../components/PageParts.jsx';

function StatCard({ label, value, caption, color }) {
  return <article className="stat-card" style={{ '--stat-color': color }}><div className="stat-label"><i className="stat-dot" />{label}</div><strong className="stat-value">{value}</strong><div className="stat-caption">{caption}</div></article>;
}

export default function Dashboard({ profile, onNavigate, onNewTask }) {
  const [now] = useState(() => new Date());
  const tasks = profile.tasks.filter((task) => !['completed', 'cancelled'].includes(task.status));
  const todayDue = tasks.filter((task) => sameDay(task.deadline, now)).length;
  const weekEnd = addDays(startOfWeek(now), 7);
  const completed = profile.tasks.filter((task) => task.status === 'completed' && new Date(task.completedAt) >= startOfWeek(now) && new Date(task.completedAt) < weekEnd).length;
  const hours = profile.availability.reduce((sum, item) => {
    const [startHour, startMinute] = item.start.split(':').map(Number);
    const [endHour, endMinute] = item.end.split(':').map(Number);
    return sum + (endHour * 60 + endMinute - startHour * 60 - startMinute) / 60;
  }, 0);
  const focus = [...tasks].sort((first, second) => priority(second) - priority(first)).slice(0, 4);
  const todayBlocks = profile.agenda.filter((block) => sameDay(block.start, now)).sort((first, second) => new Date(first.start) - new Date(second.start));
  const categoryFor = (task) => profile.categories.find((category) => category.id === task.categoryId) || { name: 'Sem categoria', color: '#8B8FA4' };
  const taskFor = (id) => profile.tasks.find((task) => task.id === id);

  return <>
    <section className="dashboard-greeting"><div><h1>Olá, {profile.user.name.split(' ')[0]}.</h1><p>{tasks.length ? 'Seu plano está pronto para ganhar movimento.' : 'Vamos montar uma semana que funciona para você.'}</p></div><div className="date-chip">{formatDate(now, { weekday: 'long', day: '2-digit', month: 'long' })}</div></section>
    <section className="stats-grid">
      <StatCard label="Tarefas ativas" value={tasks.length} caption="na sua fila" color="#6558E8" />
      <StatCard label="Vencem hoje" value={todayDue} caption={todayDue ? 'pedem atenção' : 'agenda tranquila'} color="#EF705C" />
      <StatCard label="Horas disponíveis" value={hours.toFixed(hours % 1 ? 1 : 0)} caption="por semana" color="#168E9B" />
      <StatCard label="Concluídas" value={completed} caption="nesta semana" color="#DCA927" />
    </section>
    <section className="dashboard-grid">
      <div className="panel"><header className="panel-head"><h2>Foco agora</h2><button className="panel-link" onClick={() => onNavigate('priorities')}>Ver prioridades</button></header>
        {focus.length ? <div className="focus-list">{focus.map((task) => { const category = categoryFor(task); const score = priority(task); return <article className="focus-item" key={task.id}><i className="focus-bar" style={{ '--task-color': category.color }} /><div><strong>{task.title}</strong><div className="focus-meta"><span>{category.name}</span><span>{formatDate(task.deadline, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span><span>{formatMinutes(task.duration)}</span></div></div><span className="priority-score">{score}</span></article>; })}</div> : <EmptyState title="Nenhuma tarefa na fila" description="Crie sua primeira tarefa para começar a priorizar."><button className="button primary compact" onClick={() => onNewTask(null)}>Nova tarefa</button></EmptyState>}
      </div>
      <div className="panel"><header className="panel-head"><h2>Hoje</h2><button className="panel-link" onClick={() => onNavigate('agenda')}>Abrir agenda</button></header>
        {todayBlocks.length ? <div className="day-plan"><div className="plan-track">{todayBlocks.map((block) => { const task = taskFor(block.taskId); if (!task) return null; const category = categoryFor(task); return <article className="plan-item" style={{ '--task-color': category.color }} key={block.id}><div className="plan-time">{formatTime(block.start)}–{formatTime(block.end)}</div><div className="plan-title">{task.title}</div></article>; })}</div></div> : <EmptyState title="Dia aberto" description="Recalcule a agenda para preencher seus horários disponíveis."><button className="button ghost compact" onClick={() => onNavigate('agenda')}>Planejar agenda</button></EmptyState>}
      </div>
    </section>
  </>;
}
