import { PageHead } from '../components/PageParts.jsx';
import { formatDate, formatMinutes, priority } from '../lib/format.js';

const groups = [
  { name: 'Alta prioridade', color: '#E45B67', match: (score) => score >= 4 },
  { name: 'Média prioridade', color: '#7B5BF2', match: (score) => score >= 3 && score < 4 },
  { name: 'Baixa prioridade', color: '#8297BD', match: (score) => score < 3 },
];

export default function Priorities({ profile }) {
  const tasks = profile.tasks.filter((task) => !['completed', 'cancelled'].includes(task.status));
  const categoryFor = (task) => profile.categories.find((category) => category.id === task.categoryId)?.name || 'Sem categoria';
  return <div className="priorities-page"><PageHead title="Prioridades" description="Veja o que merece sua atenção primeiro." />
    {groups.map((group) => { const items = tasks.filter((task) => group.match(priority(task))).sort((first, second) => priority(second) - priority(first)); return <section className="card priority-group" key={group.name}><header><div><i style={{ background: group.color }} /><h2>{group.name}</h2></div><span>{items.length} {items.length === 1 ? 'tarefa' : 'tarefas'}</span></header>{items.length ? items.map((task) => <article className="priority-row" key={task.id}><div><small>Tarefa</small><strong>{task.title}</strong></div><div><small>Categoria</small><span>{categoryFor(task)}</span></div><div><small>Prazo</small><span>{formatDate(task.deadline, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></div><div><small>Duração</small><b>{formatMinutes(task.duration)}</b></div></article>) : <em>Nenhuma tarefa nesta prioridade.</em>}</section>; })}
  </div>;
}
