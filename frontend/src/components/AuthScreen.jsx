import { useState } from 'react';
import Icon from './Icon.jsx';

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
      event.currentTarget.reset();
    } catch (exception) {
      setError(exception.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <section className="auth-story" aria-label="Apresentação do SmartPlan">
        <a className="brand brand-light" href="#">Smart<span>Plan</span></a>
        <div className="story-copy">
          <p className="story-kicker">Seu tempo, com intenção.</p>
          <h1>Uma semana que cabe na vida real.</h1>
          <p>Reúna prazos, prioridades e horários disponíveis. O SmartPlan transforma tudo em um plano claro para você começar.</p>
        </div>
        <div className="mini-week" aria-hidden="true">
          <div><span>SEG</span><i style={{ height: '42%', '--c': '#8F82FF' }} /></div>
          <div><span>TER</span><i style={{ height: '68%', '--c': '#45C4C9' }} /></div>
          <div><span>QUA</span><i style={{ height: '51%', '--c': '#FF846E' }} /></div>
          <div className="today"><span>HOJE</span><i style={{ height: '84%', '--c': '#FFF' }} /></div>
          <div><span>SEX</span><i style={{ height: '60%', '--c': '#F7C85C' }} /></div>
        </div>
        <p className="story-note">Planejamento inteligente sem complicação.</p>
      </section>

      <main className="auth-main">
        <button className="mobile-brand brand" type="button">Smart<span>Plan</span></button>
        <div className="auth-card">
          {view === 'login' ? (
            <div>
              <h2>Que bom ver você.</h2>
              <p className="muted">Entre para continuar seu planejamento.</p>
              <form className="form-stack" onSubmit={submit}>
                <label>E-mail<input name="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" required /></label>
                <label>Senha<input name="password" type="password" autoComplete="current-password" placeholder="Sua senha" minLength="6" required /></label>
                <p className="form-error" role="alert">{error}</p>
                <button className="button primary wide" type="submit" disabled={busy}>Entrar <Icon name="arrow" /></button>
              </form>
              <p className="auth-switch">Ainda não tem conta? <button onClick={() => { setView('register'); setError(''); }}>Criar conta</button></p>
            </div>
          ) : (
            <div>
              <h2>Comece por aqui.</h2>
              <p className="muted">Crie seu espaço de planejamento em um minuto.</p>
              <form className="form-stack" onSubmit={submit}>
                <label>Nome<input name="name" autoComplete="name" placeholder="Seu nome" minLength="2" required /></label>
                <label>E-mail<input name="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" required /></label>
                <label>Senha<input name="password" type="password" autoComplete="new-password" placeholder="Mínimo de 6 caracteres" minLength="6" required /></label>
                <p className="form-error" role="alert">{error}</p>
                <button className="button primary wide" type="submit" disabled={busy}>Criar minha conta <Icon name="arrow" /></button>
              </form>
              <p className="auth-switch">Já tem conta? <button onClick={() => { setView('login'); setError(''); }}>Voltar para entrar</button></p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
