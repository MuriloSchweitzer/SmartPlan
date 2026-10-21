import { useState } from 'react';
import { addDays, formatMinutes, formatTime, sameDay, startOfWeek } from '../lib/format.js';

export default function Dashboard({ profile, onNavigate, onNewTask }) {
  const [now] = useState(() => new Date());
  const week = startOfWeek(now);
  const weekEnd = addDays(week, 7);
  const pending = profile.tasks.filter((task) => !['completed', 'cancelled'].includes(task.status)).length;
  const completed = profile.tasks.filter((task) => task.status === 'completed').length;
  const availableMinutes = profile.availability.reduce((sum, item) => {
    const [startHour, startMinute] = item.start.split(':').map(Number);
    const [endHour, endMinute] = item.end.split(':').map(Number);
    return sum + endHour * 60 + endMinute - startHour * 60 - startMinute;
  }, 0);
  const planned = profile.agenda.filter((block) => new Date(block.start) >= week && new Date(block.start) < weekEnd)
    .reduce((sum, block) => sum + (new Date(block.end) - new Date(block.start)) / 60_000, 0);
  const deficit = planned - availableMinutes;
  const todayBlocks = profile.agenda.filter((block) => sameDay(block.start, now)).sort((first, second) => new Date(first.start) - new Date(second.start));
  const taskFor = (id) => profile.tasks.find((task) => task.id === id);

  return <div className="dashboard-page">
    <header className="dashboard-head"><div><h1>Olá, {profile.user.name.split(' ')[0]}!</h1><p>Veja como está seu planejamento.</p></div><div><button className="wpf-button" onClick={() => onNewTask(null)}>＋&nbsp; Nova tarefa</button><button className="wpf-button primary" onClick={() => onNavigate('agenda')}>▦&nbsp; Gerar agenda</button></div></header>
    <section className="stats-grid">
      <article className="card stat-card"><span>Tarefas pendentes</span><strong>{pending}</strong></article>
      <article className="card stat-card"><span>Tarefas concluídas</span><strong>{completed}</strong></article>
      <article className="card stat-card"><span>Horas disponíveis</span><strong>{formatMinutes(availableMinutes)}</strong></article>
      <article className="card stat-card"><span>Horas planejadas</span><strong>{formatMinutes(planned)}</strong></article>
    </section>
    <section className="card capacity-card"><div><h2>{deficit > 0 ? 'Seu planejamento está sobrecarregado' : 'Seu planejamento está equilibrado'}</h2><p>{deficit > 0 ? 'Reduza tarefas ou amplie sua disponibilidade semanal.' : 'As tarefas planejadas cabem nos horários disponíveis.'}</p></div><strong>{deficit > 0 ? `${formatMinutes(deficit)} acima` : 'Tudo certo'}</strong></section>
    <section className="card workflow-strip"><span>PLANEJA</span><i /><span>PRIORIZA</span><i /><span>ALERTA</span><i /><span>ENTREGA</span></section>
    <h2 className="section-title">Plano de hoje</h2>
    <div className="wpf-table"><div className="wpf-table-head"><span>Horário</span><span>Tarefa</span><span>Estado</span></div>{todayBlocks.length ? todayBlocks.map((block) => <div className="wpf-table-row" key={block.id}><span>{formatTime(block.start)}–{formatTime(block.end)}</span><span>{taskFor(block.taskId)?.title || 'Tarefa'}</span><span>{block.manual ? 'Manual' : 'Planejado'}</span></div>) : <div className="table-empty">Nenhum bloco planejado para hoje.</div>}</div>
  </div>;
}
