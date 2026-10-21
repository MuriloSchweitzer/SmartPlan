import { useState } from 'react';
import { addDays, toInputDate } from '../lib/format.js';
import Icon from './Icon.jsx';

export default function TaskDialog({ task, categories, onClose, onSave }) {
  const [mode, setMode] = useState(task?.mode || 'flexible');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [now] = useState(() => new Date());

  async function submit(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const fixedStart = mode === 'fixed' ? new Date(data.fixedStart) : null;
    const fixedEnd = mode === 'fixed' ? new Date(data.fixedEnd) : null;
    const deadline = new Date(data.deadline);
    const duration = mode === 'fixed' ? Math.round((fixedEnd - fixedStart) / 60_000) : Number(data.duration);
    if (mode === 'fixed' && duration <= 0) return setError('O fim fixo deve ser posterior ao início.');
    if (mode === 'fixed' && fixedEnd > deadline) return setError('A tarefa fixa precisa terminar até o prazo.');
    setBusy(true);
    setError('');
    try {
      await onSave(task?.id, {
        title: data.title.trim(), description: data.description.trim(), categoryId: data.categoryId,
        context: data.context, deadline: deadline.toISOString(), mode, duration,
        criticality: Number(data.criticality), impact: Number(data.impact),
        fixedStart: fixedStart?.toISOString() || null, fixedEnd: fixedEnd?.toISOString() || null,
      });
      onClose();
    } catch (exception) {
      setError(exception.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="task-dialog-title">
        <form onSubmit={submit}>
          <header><div><p className="dialog-kicker">Planejamento</p><h2 id="task-dialog-title">{task ? 'Editar tarefa' : 'Nova tarefa'}</h2></div><button className="icon-button" type="button" onClick={onClose}><Icon name="close" /></button></header>
          <div className="form-grid">
            <label className="full">Título<input name="title" maxLength="160" required placeholder="O que precisa ser feito?" defaultValue={task?.title} /></label>
            <label>Categoria<select name="categoryId" required defaultValue={task?.categoryId || categories[0]?.id}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label>Contexto<select name="context" defaultValue={task?.context || 'Estudo'}><option>Estudo</option><option>Trabalho</option><option>Pessoal</option></select></label>
            <label>Prazo<input name="deadline" type="datetime-local" required defaultValue={toInputDate(task?.deadline || addDays(now, 1))} /></label>
            <label>Modalidade<select name="mode" value={mode} onChange={(event) => setMode(event.target.value)}><option value="flexible">Flexível</option><option value="fixed">Fixa</option></select></label>
            {mode === 'flexible' ? <label>Duração (minutos)<input name="duration" type="number" min="15" max="100000" step="15" defaultValue={task?.duration || 60} required /></label> : null}
            <label>Criticidade<select name="criticality" defaultValue={task?.criticality || 3}>{[1,2,3,4,5].map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Impacto<select name="impact" defaultValue={task?.impact || 3}>{[1,2,3,4,5].map((value) => <option key={value}>{value}</option>)}</select></label>
            {mode === 'fixed' ? <><label>Início fixo<input name="fixedStart" type="datetime-local" defaultValue={toInputDate(task?.fixedStart || now)} required /></label><label>Fim fixo<input name="fixedEnd" type="datetime-local" defaultValue={toInputDate(task?.fixedEnd || new Date(now.getTime() + 3_600_000))} required /></label></> : null}
            <label className="full">Descrição<textarea name="description" rows="3" maxLength="1000" placeholder="Detalhes importantes (opcional)" defaultValue={task?.description} /></label>
          </div>
          <p className="form-error">{error}</p>
          <footer><button className="button ghost" type="button" onClick={onClose}>Cancelar</button><button className="button primary" type="submit" disabled={busy}>Salvar tarefa</button></footer>
        </form>
      </section>
    </div>
  );
}
