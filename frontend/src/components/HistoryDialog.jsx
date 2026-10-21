import { useState } from 'react';
import { toInputDate } from '../lib/format.js';
import Icon from './Icon.jsx';

export default function HistoryDialog({ task, onClose, onSave }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [period] = useState(() => {
    const end = new Date();
    return { end, start: new Date(end.getTime() - 3_600_000) };
  });

  async function submit(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    if (new Date(data.end) <= new Date(data.start)) return setError('O fim deve ser posterior ao início.');
    setBusy(true);
    try {
      await onSave({ taskId: task.id, start: new Date(data.start).toISOString(), end: new Date(data.end).toISOString() });
      onClose();
    } catch (exception) {
      setError(exception.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="dialog small-dialog" role="dialog" aria-modal="true">
        <form onSubmit={submit}>
          <header><div><p className="dialog-kicker">Tempo real</p><h2>Registrar execução</h2></div><button className="icon-button" type="button" onClick={onClose}><Icon name="close" /></button></header>
          <div className="form-stack dialog-stack">
            <label>Tarefa<input value={task.title} readOnly /></label>
            <label>Início<input name="start" type="datetime-local" defaultValue={toInputDate(period.start)} required /></label>
            <label>Fim<input name="end" type="datetime-local" defaultValue={toInputDate(period.end)} required /></label>
          </div>
          <p className="form-error">{error}</p>
          <footer><button className="button ghost" type="button" onClick={onClose}>Cancelar</button><button className="button primary" type="submit" disabled={busy}>Registrar tempo</button></footer>
        </form>
      </section>
    </div>
  );
}
