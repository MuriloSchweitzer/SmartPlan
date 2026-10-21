import { useState } from 'react';
import { PageHead } from '../components/PageParts.jsx';
import { formatMinutes } from '../lib/format.js';

const days = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];
const minutes = (time) => { const [hours, value] = time.split(':').map(Number); return hours * 60 + value; };

export default function Availability({ profile, onAdd, onDelete }) {
  const [formKey, setFormKey] = useState(0);
  const [error, setError] = useState('');
  const ordered = [...profile.availability].sort((first, second) => first.day - second.day || first.start.localeCompare(second.start));

  async function submit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const selectedDays = data.getAll('days').map(Number);
    if (!selectedDays.length) return setError('Escolha ao menos um dia.');
    if (minutes(data.get('end')) <= minutes(data.get('start'))) return setError('O horário final deve ser posterior ao inicial.');
    try { await onAdd({ days: selectedDays, start: data.get('start'), end: data.get('end') }); setError(''); setFormKey((value) => value + 1); }
    catch (exception) { setError(exception.message); }
  }

  return <div className="availability-page">
    <PageHead title="Disponibilidade semanal" description="Escolha os dias e horários que se repetem em todas as semanas." />
    <form key={formKey} className="card availability-form" onSubmit={submit}>
      <strong>Dias da semana</strong><div className="weekday-checks">{days.map((day, index) => <label key={day}><input type="checkbox" name="days" value={index + 1} />{day}</label>)}</div>
      <div className="availability-form-row"><label>Horário inicial<input name="start" type="time" defaultValue="08:00" required /></label><label>Horário final<input name="end" type="time" defaultValue="15:00" required /></label><span className="form-error">{error}</span><div><button className="wpf-button" type="reset" onClick={() => setError('')}>Limpar</button><button className="wpf-button primary" type="submit">Salvar disponibilidade</button></div></div>
    </form>
    <section className="availability-cards">{ordered.map((item) => <article className="card availability-card" key={item.id}><h2>{days[item.day - 1]}</h2><strong>{item.start} – {item.end}</strong><footer><span>{formatMinutes(minutes(item.end) - minutes(item.start))}</span><button className="wpf-button danger small" onClick={() => onDelete(item)}>Excluir</button></footer></article>)}</section>
  </div>;
}
