import { useState } from 'react';
import { PageHead } from '../components/PageParts.jsx';
import { formatDate, formatMinutes, toInputDate } from '../lib/format.js';

export default function History({ profile, onAdd }) {
  const [error, setError] = useState('');
  const [formKey, setFormKey] = useState(0);
  const activeTasks = profile.tasks.filter((task) => !['completed', 'cancelled'].includes(task.status));
  const taskFor = (id) => profile.tasks.find((task) => task.id === id);
  const [today] = useState(() => toInputDate(new Date()).slice(0, 10));

  async function submit(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const start = new Date(`${data.startDate}T${data.startTime}`);
    const end = new Date(`${data.endDate}T${data.endTime}`);
    if (end <= start) return setError('O fim deve ser posterior ao início.');
    try { await onAdd({ taskId: data.taskId, start: start.toISOString(), end: end.toISOString(), complete: data.complete === 'on' }); setError(''); setFormKey((value) => value + 1); }
    catch (exception) { setError(exception.message); }
  }

  return <div className="history-page"><PageHead title="Histórico" description="Registre uma execução e compare o tempo planejado com o tempo utilizado." />
    <form key={formKey} className="card history-form" onSubmit={submit}><div className="history-form-top"><label>Tarefa<select name="taskId" required defaultValue=""><option value="" disabled>Selecione uma tarefa</option>{activeTasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label><label className="check-line"><input type="checkbox" name="complete" />Concluir a tarefa após este registro</label></div><div className="history-form-row"><label>Data inicial<input type="date" name="startDate" defaultValue={today} required /></label><label>Hora inicial<input type="time" name="startTime" defaultValue="09:00" required /></label><label>Data final<input type="date" name="endDate" defaultValue={today} required /></label><label>Hora final<input type="time" name="endTime" defaultValue="10:00" required /></label><button className="wpf-button primary" type="submit">Registrar</button></div><span className="form-error">{error}</span></form>
    <section className="history-list">{profile.history.map((item) => { const task = taskFor(item.taskId); if (!task) return null; const progress = Math.min(100, item.duration / task.duration * 100); return <article className="card history-card" key={item.id}><div><small>Tarefa</small><strong>{task.title}</strong><span>{formatDate(item.start, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></div><div><small>Tempo estimado</small><strong>{formatMinutes(task.duration)}</strong></div><div><small>Tempo real</small><strong className="purple">{formatMinutes(item.duration)}</strong></div><div><small>Progresso</small><div className="progress-track"><i style={{ width: `${progress}%` }} /></div></div></article>; })}</section>
  </div>;
}
