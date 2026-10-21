import { useState } from 'react';

export default function AuthScreen({ onAuthenticate }) {
  const [view, setView] = useState('login');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onAuthenticate(view, Object.fromEntries(new FormData(event.currentTarget)));
    } catch (exception) {
      setError(exception.message);
    } finally {
      setBusy(false);
    }
  }

  return <main className="wpf-auth">
    <section className="wpf-auth-card">
      {view === 'login' ? <>
        <h1>SmartPlan</h1>
        <p>Organize seu tempo. Priorize o que importa.</p>
        <form onSubmit={submit}>
          <label>E-mail<input name="email" type="email" autoComplete="email" required /></label>
          <label>Senha<input name="password" type="password" autoComplete="current-password" minLength="6" required /></label>
          <span className="form-error">{error}</span>
          <button className="wpf-button primary wide" type="submit" disabled={busy}>Entrar</button>
        </form>
        <button className="link-button" type="button" onClick={() => { setView('register'); setError(''); }}>Criar uma conta</button>
      </> : <>
        <h1 className="register-title">Criar uma conta</h1>
        <p>Comece a organizar seu tempo.</p>
        <form onSubmit={submit}>
          <label>Nome<input name="name" autoComplete="name" minLength="2" required /></label>
          <label>E-mail<input name="email" type="email" autoComplete="email" required /></label>
          <label>Senha (mínimo de 6 caracteres)<input name="password" type="password" autoComplete="new-password" minLength="6" required /></label>
          <span className="form-error">{error}</span>
          <button className="wpf-button primary wide" type="submit" disabled={busy}>Criar conta</button>
        </form>
        <button className="link-button" type="button" onClick={() => { setView('login'); setError(''); }}>Voltar para entrar</button>
      </>}
    </section>
  </main>;
}
