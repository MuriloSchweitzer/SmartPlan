import { useState } from 'react';
import { addDays, toInputDate } from '../lib/format.js';
import { PageHead } from './PageParts.jsx';

function datePart(value) { return toInputDate(value).slice(0, 10); }
function timePart(value) { return toInputDate(value).slice(11, 16); }

export default function TaskEditor({ task, categories, onClose, onSave, onComplete, onCancel }) {
  const [mode, setMode] = useState(task?.mode || 'flexible');
  const [error, setError] = useState('');
  const [now] = useState(() => new Date());
  const [unit, setUnit] = useState(task?.duration && task.duration % 60 === 0 ? 'hours' : 'minutes');
  const deadline = task?.deadline || addDays(now, 1);
  const fixedStart = task?.fixedStart || now;
  const fixedEnd = task?.fixedEnd || new Date(now.getTime() + 3_600_000);

  async function submit(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const deadlineValue = new Date(`${data.deadlineDate}T${data.deadlineTime}`);
    const start = mode === 'fixed' ? new Date(`${data.fixedDate}T${data.fixedStart}`) : null;
    const end = mode === 'fixed' ? new Date(`${data.fixedDate}T${data.fixedEnd}`) : null;
    const duration = mode === 'fixed' ? Math.round((end - start) / 60_000) : Number(data.duration) * (unit === 'hours' ? 60 : 1);
    if (duration <= 0) return setError('A duração precisa ser maior que zero.');
    if (mode === 'fixed' && end > deadlineValue) return setError('O horário fixo precisa terminar até o prazo.');
    try {
      await onSave(task?.id, {
        title: data.title.trim(), description: data.description.trim(), categoryId: data.categoryId,
        context: data.context, deadline: deadlineValue.toISOString(), mode, duration,
        criticality: Number(data.criticality), impact: Number(data.impact),
        fixedStart: start?.toISOString() || null, fixedEnd: end?.toISOString() || null,
      });
    } catch (exception) {
      setError(exception.message);
    }
  }

  async function finish(action) {
    try { await action(task); onClose(); } catch (exception) { setError(exception.message); }
  }

  return <div className="task-editor">
    <PageHead title={task ? 'Editar tarefa' : 'Nova tarefa'} description="Preencha os dados para que o SmartPlan organize sua agenda.">
      <button className="wpf-button" type="button" onClick={onClose}>Voltar para tarefas</button>
    </PageHead>
    <form className="card task-form" onSubmit={submit}>
      <label>Título da tarefa<input name="title" required maxLength="160" defaultValue={task?.title} /></label>
      <label>Descrição<textarea name="description" rows="4" maxLength="1000" defaultValue={task?.description} /></label>
      <div className="form-row two">
        <label>Categoria<select name="categoryId" required defaultValue={task?.categoryId || categories[0]?.id}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label>Prazo<div className="input-pair"><input name="deadlineDate" type="date" required defaultValue={datePart(deadline)} /><input name="deadlineTime" type="time" required defaultValue={timePart(deadline)} /></div></label>
      </div>
      <div className="form-row two">
        <label>Duração estimada<div className="input-pair"><input name="duration" type="number" min="1" required defaultValue={unit === 'hours' ? task?.duration / 60 || 1 : task?.duration || 60} /><select value={unit} onChange={(event) => setUnit(event.target.value)}><option value="minutes">Minutos</option><option value="hours">Horas</option></select></div></label>
        <div className="form-row three compact-fields">
          <label>Criticidade<select name="criticality" defaultValue={task?.criticality || 3}>{[1,2,3,4,5].map((value) => <option key={value}>{value}</option>)}</select></label>
          <label>Impacto<select name="impact" defaultValue={task?.impact || 3}>{[1,2,3,4,5].map((value) => <option key={value}>{value}</option>)}</select></label>
          <label>Contexto<select name="context" defaultValue={task?.context || 'Estudo'}><option>Estudo</option><option>Trabalho</option><option>Pessoal</option></select></label>
        </div>
      </div>
      <label>Tipo da tarefa<select name="mode" value={mode} onChange={(event) => setMode(event.target.value)}><option value="flexible">Flexível</option><option value="fixed">Fixa</option></select></label>
      {mode === 'fixed' ? <div className="fixed-fields"><strong>Horário fixo</strong><div className="form-row three"><label>Data<input name="fixedDate" type="date" defaultValue={datePart(fixedStart)} required /></label><label>Início<input name="fixedStart" type="time" defaultValue={timePart(fixedStart)} required /></label><label>Fim<input name="fixedEnd" type="time" defaultValue={timePart(fixedEnd)} required /></label></div></div> : null}
      <span className="form-error">{error}</span>
      <footer className="task-form-actions">
        <div>{task && !['completed', 'cancelled'].includes(task.status) ? <><button className="wpf-button" type="button" onClick={() => finish(onComplete)}>Concluir tarefa</button><button className="wpf-button danger" type="button" onClick={() => finish(onCancel)}>Cancelar tarefa</button></> : null}</div>
        <div><button className="wpf-button" type="button" onClick={onClose}>Cancelar</button><button className="wpf-button primary" type="submit">Salvar tarefa</button></div>
      </footer>
    </form>
  </div>;
}
