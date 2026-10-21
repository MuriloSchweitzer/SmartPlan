import { addDays, formatDate, formatMinutes, formatTime, sameDay, toInputDate } from '../lib/format.js';

const hourHeight = 60;
const hours = Array.from({ length: 24 }, (_, index) => index);

export default function Agenda({ profile, week, onWeek, onSelectWeek, onMove, onRecalculate }) {
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(week, index));
  const taskFor = (id) => profile.tasks.find((task) => task.id === id);
  const available = profile.availability.reduce((sum, item) => {
    const [startHour, startMinute] = item.start.split(':').map(Number);
    const [endHour, endMinute] = item.end.split(':').map(Number);
    return sum + endHour * 60 + endMinute - startHour * 60 - startMinute;
  }, 0);
  const planned = profile.agenda.filter((block) => weekDays.some((day) => sameDay(block.start, day)))
    .reduce((sum, block) => sum + (new Date(block.end) - new Date(block.start)) / 60_000, 0);

  function topFor(value) {
    const date = new Date(value);
    return (date.getHours() * 60 + date.getMinutes()) / 60 * hourHeight;
  }

  async function drop(event, day) {
    event.preventDefault();
    const block = profile.agenda.find((item) => item.id === event.dataTransfer.getData('text/plain'));
    if (!block) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const minutes = Math.max(0, Math.min(23 * 60 + 45, Math.round(((event.clientY - rect.top) / hourHeight * 60) / 15) * 15));
    const start = new Date(day);
    start.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    await onMove(block, start);
  }

  return <div className="agenda-page">
    <header className="agenda-head"><div><h1>Agenda semanal</h1><p>Semana de {formatDate(week, { day: '2-digit', month: '2-digit' })} a {formatDate(addDays(week, 6), { day: '2-digit', month: '2-digit', year: 'numeric' })}</p><span>Arraste uma tarefa para outro dia ou horário. Os blocos movidos manualmente serão preservados ao recalcular.</span></div><div className="agenda-controls"><button className="wpf-button small" onClick={() => onWeek(-1)}>‹</button><input type="date" value={toInputDate(week).slice(0, 10)} onChange={(event) => onSelectWeek(new Date(`${event.target.value}T12:00:00`))} /><button className="wpf-button small" onClick={() => onWeek(1)}>›</button><button className="wpf-button primary" onClick={onRecalculate}>Recalcular agenda</button></div></header>
    <div className="agenda-summary"><span>{formatMinutes(available)} disponíveis</span><span>{formatMinutes(planned)} planejadas</span><span className={planned > available ? 'overload' : ''}>{planned > available ? `${formatMinutes(planned - available)} acima da capacidade` : 'Tudo encaixado'}</span></div>
    <section className="card calendar-card">
      <div className="calendar-header"><span />{weekDays.map((day) => <div key={day.toISOString()}><strong>{formatDate(day, { weekday: 'long' })}</strong><span>{formatDate(day, { day: '2-digit', month: '2-digit' })}</span></div>)}</div>
      <div className="calendar-scroll"><div className="calendar-body">
        <div className="time-labels">{hours.map((hour) => <span style={{ top: hour * hourHeight + 11 }} key={hour}>{String(hour).padStart(2, '0')}:00</span>)}</div>
        <div className="calendar-days">{weekDays.map((day, index) => {
          const windows = profile.availability.filter((item) => item.day === index + 1);
          const blocks = profile.agenda.filter((block) => sameDay(block.start, day));
          return <div className="calendar-day" key={day.toISOString()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => drop(event, day)}>
            {windows.map((window) => { const [startHour, startMinute] = window.start.split(':').map(Number); const [endHour, endMinute] = window.end.split(':').map(Number); const start = startHour * 60 + startMinute; const end = endHour * 60 + endMinute; return <div className="availability-zone" key={window.id} style={{ top: start / 60 * hourHeight, height: (end - start) / 60 * hourHeight }} />; })}
            {blocks.map((block) => { const task = taskFor(block.taskId); if (!task) return null; const height = Math.max(28, (new Date(block.end) - new Date(block.start)) / 3_600_000 * hourHeight); return <article className="calendar-block" draggable onDragStart={(event) => event.dataTransfer.setData('text/plain', block.id)} style={{ top: topFor(block.start), height }} key={block.id}><strong>{task.title}</strong><span>{formatTime(block.start)}–{formatTime(block.end)}{block.manual ? ' · manual' : ''}</span></article>; })}
          </div>;
        })}</div>
      </div></div>
    </section>
  </div>;
}
