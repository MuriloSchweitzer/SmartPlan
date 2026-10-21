import { useMemo, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { EmptyState, PageHead } from '../components/PageParts.jsx';
import { formatDate, formatMinutes } from '../lib/format.js';

function StatusTag({ task }) {
  const map = { pending: ['Pendente', '#6558E8'], completed: ['Concluída', '#2C9869'], cancelled: ['Cancelada', '#8B8FA4'], ongoing: ['Em andamento', '#DCA927'] };
  const [label, color] = map[task.status] || map.pending;
  return <span className="tag" style={{ '--tag-color': color }}>{label}</span>;
}

export default function Tasks({ profile, onNewTask, onEdit, onHistory, onComplete, onDelete }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('active');
  const [context, setContext] = useState('all');
  const categoryFor = (task) => profile.categories.find((category) => category.id === task.categoryId) || { name: 'Sem categoria', color: '#8B8FA4' };
  const tasks = useMemo(() => profile.tasks.filter((task) => {
    const matchesStatus = status === 'all' || (status === 'active' ? !['completed', 'cancelled'].includes(task.status) : task.status === status);
    return matchesStatus && (context === 'all' || task.context === context) && `${task.title} ${task.description || ''}`.toLowerCase().includes(query.toLowerCase());
  }).sort((first, second) => new Date(first.deadline) - new Date(second.deadline)), [profile.tasks, query, status, context]);

  return <>
    <PageHead title="Tarefas" description="Cadastre, acompanhe e conclua o que importa."><button className="button primary compact" onClick={() => onNewTask(null)}><Icon name="plus" />Nova tarefa</button></PageHead>
    <div className="toolbar"><div className="search-box"><Icon name="search" /><input placeholder="Buscar tarefa..." value={query} onChange={(event) => setQuery(event.target.value)} /></div><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="active">Ativas</option><option value="all">Todas</option><option value="completed">Concluídas</option><option value="cancelled">Canceladas</option></select><select value={context} onChange={(event) => setContext(event.target.value)}><option value="all">Todos os contextos</option><option>Estudo</option><option>Trabalho</option><option>Pessoal</option></select></div>
    <div className="table-card">{tasks.length ? <table className="data-table"><thead><tr><th>Tarefa</th><th>Categoria</th><th>Prazo</th><th>Status</th><th /></tr></thead><tbody>{tasks.map((task) => { const category = categoryFor(task); const active = !['completed', 'cancelled'].includes(task.status); return <tr key={task.id}><td><div className="task-title-cell"><i className="task-color" style={{ '--task-color': category.color }} /><div><strong>{task.title}</strong><small>{task.description || `${task.mode === 'fixed' ? 'Fixa' : 'Flexível'} · ${formatMinutes(task.duration)}`}</small></div></div></td><td><span className="tag" style={{ '--tag-color': category.color }}>{category.name}</span></td><td>{formatDate(task.deadline, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td><td><StatusTag task={task} /></td><td><div className="row-actions">{active ? <><button className="icon-button" onClick={() => onHistory(task)} title="Registrar tempo"><Icon name="play" /></button><button className="icon-button" onClick={() => onComplete(task)} title="Concluir"><Icon name="check" /></button><button className="icon-button" onClick={() => onEdit(task)} title="Editar"><Icon name="edit" /></button></> : null}<button className="icon-button danger-icon" onClick={() => onDelete(task)} title="Excluir"><Icon name="trash" /></button></div></td></tr>; })}</tbody></table> : <EmptyState title="Nenhuma tarefa encontrada" description="Ajuste os filtros ou adicione uma nova tarefa."><button className="button primary compact" onClick={() => onNewTask(null)}>Nova tarefa</button></EmptyState>}</div>
  </>;
}
