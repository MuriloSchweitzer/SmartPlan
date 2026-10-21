import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import { EmptyState, PageHead } from '../components/PageParts.jsx';
import { formatMinutes } from '../lib/format.js';

const dayNames = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const dayBadges = dayNames.map((day) => day.toUpperCase());
const minutes = (time) => { const [hours, value] = time.split(':').map(Number); return hours * 60 + value; };

export default function Availability({ profile, onAdd, onDelete }) {
  const [error, setError] = useState('');
  const ordered = [...profile.availability].sort((first, second) => first.day - second.day || first.start.localeCompare(second.start));

  async function submit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const days = data.getAll('days').map(Number);
    if (!days.length) return setError('Escolha ao menos um dia.');
    if (minutes(data.get('end')) <= minutes(data.get('start'))) return setError('O horário final deve ser posterior ao inicial.');
    try { await onAdd({ days, start: data.get('start'), end: data.get('end') }); setError(''); }
    catch (exception) { setError(exception.message); }
  }

  return <>
    <PageHead title="Disponibilidade" description="Defina os horários que podem receber tarefas toda semana." />
    <section className="split-layout"><div className="panel form-panel"><h2>Novo horário recorrente</h2><p>Escolha os dias e informe o período livre. Você pode cadastrar mais de uma faixa no mesmo dia.</p>
      <form className="form-stack" onSubmit={submit}><label>Dias da semana<div className="day-picker">{dayNames.map((day, index) => <label key={day}>{day}<input type="checkbox" name="days" value={index + 1} defaultChecked={index < 5} /></label>)}</div></label><div className="time-pair"><label>Início<input type="time" name="start" defaultValue="08:00" required /></label><label>Fim<input type="time" name="end" defaultValue="18:00" required /></label></div><p className="form-error">{error}</p><button className="button primary" type="submit">Adicionar disponibilidade</button></form>
    </div><div className="panel"><header className="panel-head"><h2>Rotina semanal</h2><span className="tag">{ordered.length} períodos</span></header>{ordered.length ? <div className="availability-list">{ordered.map((item) => <article className="availability-item" key={item.id}><div className="day-badge">{dayBadges[item.day - 1]}</div><div><strong>{item.start} às {item.end}</strong><small>{formatMinutes(minutes(item.end) - minutes(item.start))} disponíveis</small></div><button className="icon-button danger-icon" onClick={() => onDelete(item)} title="Excluir"><Icon name="trash" /></button></article>)}</div> : <EmptyState title="Rotina ainda vazia" description="Adicione ao menos um período para gerar a agenda automaticamente." />}</div></section>
  </>;
}
