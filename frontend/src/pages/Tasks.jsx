import TaskEditor from '../components/TaskEditor.jsx';
import { PageHead } from '../components/PageParts.jsx';
import { formatDate, formatMinutes, priority, priorityLabel } from '../lib/format.js';

const statusLabel = { pending: 'Pendente', ongoing: 'Em andamento', completed: 'Concluída', cancelled: 'Cancelada' };

export default function Tasks({ profile, editorTask, onNewTask, onCloseEditor, onEdit, onSave, onComplete, onCancel, onDelete }) {
  if (editorTask !== undefined) return <TaskEditor key={editorTask?.id || 'new'} task={editorTask} categories={profile.categories} onClose={onCloseEditor} onSave={onSave} onComplete={onComplete} onCancel={onCancel} />;
  const categoryFor = (task) => profile.categories.find((category) => category.id === task.categoryId)?.name || 'Sem categoria';
  const tasks = [...profile.tasks].sort((first, second) => new Date(first.deadline) - new Date(second.deadline));
  return <div className="tasks-page">
    <PageHead title="Minhas tarefas" description="Organize e acompanhe todas as suas atividades."><button className="wpf-button primary" onClick={() => onNewTask(null)}>＋&nbsp; Nova tarefa</button></PageHead>
    <div className="task-card-list">{tasks.length ? tasks.map((task) => <article className="card task-card" key={task.id}>
      <div><h2>{task.title}</h2><p>{categoryFor(task)}</p><div className="task-meta"><span>Prioridade: <strong>{priorityLabel(priority(task))}</strong></span><span>Duração: <b>{formatMinutes(task.duration)}</b></span><span>Prazo: <b>{formatDate(task.deadline, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</b></span></div></div>
      <div className="task-card-actions"><span className="status-pill">{statusLabel[task.status]}</span><div>{!['completed', 'cancelled'].includes(task.status) ? <button className="wpf-button small" onClick={() => onEdit(task)}>Editar</button> : null}<button className="wpf-button danger small" onClick={() => onDelete(task)}>Excluir</button></div></div>
    </article>) : <div className="card empty-card">Nenhuma tarefa cadastrada.</div>}</div>
  </div>;
}
