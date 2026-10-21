import { useState } from 'react';
import { PageHead } from '../components/PageParts.jsx';
import { addDays, formatDate, formatMinutes, formatTime, sameDay } from '../lib/format.js';

export default function Agenda({ profile, week, onWeek, onRecalculate }) {
  const [today] = useState(() => new Date());
  const taskFor = (id) => profile.tasks.find((task) => task.id === id);
  const categoryFor = (task) => profile.categories.find((category) => category.id === task.categoryId) || { name: 'Sem categoria', color: '#8B8FA4' };
  const weekEnd = addDays(week, 6);
  return <>
    <PageHead title="Agenda semanal" description="Tarefas fixas primeiro; tarefas flexíveis ocupam os melhores espaços."><div className="agenda-toolbar"><button className="icon-button" onClick={() => onWeek(-1)} aria-label="Semana anterior">‹</button><span className="week-label">{formatDate(week, { day: '2-digit', month: 'short' })} — {formatDate(weekEnd, { day: '2-digit', month: 'short' })}</span><button className="icon-button" onClick={() => onWeek(1)} aria-label="Próxima semana">›</button><button className="button primary compact" onClick={onRecalculate}>Recalcular</button></div></PageHead>
    <div className="week-board"><div className="week-grid">{Array.from({ length: 7 }, (_, index) => {
      const date = addDays(week, index); const weekday = index + 1;
      const windows = profile.availability.filter((item) => item.day === weekday);
      const blocks = profile.agenda.filter((block) => sameDay(block.start, date)).sort((first, second) => new Date(first.start) - new Date(second.start));
      return <section className={`day-column${sameDay(date, today) ? ' today' : ''}`} key={date.toISOString()}><header className="day-head"><span>{formatDate(date, { weekday: 'short' }).replace('.', '').toUpperCase()}</span><strong>{date.getDate()}</strong></header><div className="day-blocks">{windows.map((window) => <div className="availability-window" key={window.id}>Livre {window.start}–{window.end}</div>)}{blocks.map((block) => { const task = taskFor(block.taskId); if (!task) return null; const category = categoryFor(task); return <article className="agenda-block" style={{ '--task-color': category.color }} key={block.id}><time>{formatTime(block.start)}–{formatTime(block.end)}</time><strong>{task.title}</strong><small>{category.name} · {formatMinutes((new Date(block.end) - new Date(block.start)) / 60_000)}</small></article>; })}</div></section>;
    })}</div></div>
  </>;
}
