import { EmptyState, PageHead } from '../components/PageParts.jsx';
import { formatDate, priority, priorityLabel } from '../lib/format.js';

export default function Priorities({ profile, onNewTask }) {
  const tasks = profile.tasks.filter((task) => !['completed', 'cancelled'].includes(task.status)).sort((first, second) => priority(second) - priority(first));
  const categoryFor = (task) => profile.categories.find((category) => category.id === task.categoryId) || { name: 'Sem categoria' };
  return <>
    <PageHead title="Prioridades" description="Pontuação: 40% criticidade, 40% urgência e 20% impacto." />
    <div className="panel"><header className="panel-head"><h2>Ordem recomendada</h2><span className="tag">{tasks.length} tarefas</span></header>{tasks.length ? <div className="priority-list">{tasks.map((task, index) => { const score = priority(task); const color = score >= 4 ? '#EF705C' : score >= 3 ? '#DCA927' : '#168E9B'; return <article className="priority-item" style={{ '--score': `${score / 5 * 100}%`, '--score-color': color }} key={task.id}><span className="rank">{String(index + 1).padStart(2, '0')}</span><div><strong>{task.title}</strong><small>{categoryFor(task).name} · vence {formatDate(task.deadline, { day: '2-digit', month: 'short' })} · {priorityLabel(score)}</small></div><div className="priority-meter"><i /></div><span className="score-number">{score}</span></article>; })}</div> : <EmptyState title="Sem prioridades para calcular" description="Adicione tarefas com prazo, criticidade e impacto."><button className="button primary compact" onClick={() => onNewTask(null)}>Nova tarefa</button></EmptyState>}</div>
  </>;
}
