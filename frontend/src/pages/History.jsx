import Icon from '../components/Icon.jsx';
import { EmptyState, PageHead } from '../components/PageParts.jsx';
import { formatDate, formatMinutes } from '../lib/format.js';

export default function History({ profile, onDelete }) {
  const history = [...profile.history].sort((first, second) => new Date(second.start) - new Date(first.start));
  const total = history.reduce((sum, item) => sum + item.duration, 0);
  const average = history.length ? Math.round(total / history.length) : 0;
  const completed = profile.tasks.filter((task) => task.status === 'completed').length;
  const taskFor = (id) => profile.tasks.find((task) => task.id === id);
  const categoryFor = (task) => profile.categories.find((category) => category.id === task.categoryId) || { color: '#8B8FA4' };
  return <>
    <PageHead title="Histórico" description="Compare o tempo planejado com o tempo realmente usado." />
    <section className="history-summary"><div className="mini-stat"><span>Tempo registrado</span><strong>{formatMinutes(total)}</strong></div><div className="mini-stat"><span>Média por sessão</span><strong>{formatMinutes(average)}</strong></div><div className="mini-stat"><span>Tarefas concluídas</span><strong>{completed}</strong></div></section>
    <div className="table-card">{history.length ? <table className="data-table"><thead><tr><th>Tarefa</th><th>Data</th><th>Tempo real</th><th>Planejado</th><th /></tr></thead><tbody>{history.map((item) => { const task = taskFor(item.taskId); if (!task) return null; const ratio = Math.min(100, item.duration / task.duration * 100); return <tr key={item.id}><td><div className="task-title-cell"><i className="task-color" style={{ '--task-color': categoryFor(task).color }} /><strong>{task.title}</strong></div></td><td>{formatDate(item.start, { day: '2-digit', month: 'short', year: 'numeric' })}</td><td><div className="duration-compare"><strong>{formatMinutes(item.duration)}</strong><div className="duration-track"><i style={{ width: `${ratio}%` }} /></div></div></td><td>{formatMinutes(task.duration)}</td><td><div className="row-actions"><button className="icon-button danger-icon" onClick={() => onDelete(item)} title="Excluir"><Icon name="trash" /></button></div></td></tr>; })}</tbody></table> : <EmptyState title="Nenhum tempo registrado" description="Use o botão de iniciar nas tarefas para registrar uma sessão de trabalho." />}</div>
  </>;
}
