import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import { PageHead } from '../components/PageParts.jsx';
import { formatDate } from '../lib/format.js';

export default function Settings({ profile, onProfile, onPassword, onAddCategory, onDeleteCategory }) {
  const [passwordError, setPasswordError] = useState('');

  async function saveProfile(event) {
    event.preventDefault();
    await onProfile({ name: new FormData(event.currentTarget).get('name').trim() });
  }

  async function changePassword(event) {
    event.preventDefault();
    const form = event.currentTarget;
    try { await onPassword(Object.fromEntries(new FormData(form))); form.reset(); setPasswordError(''); }
    catch (exception) { setPasswordError(exception.message); }
  }

  async function addCategory(event) {
    event.preventDefault();
    const form = event.currentTarget;
    await onAddCategory(Object.fromEntries(new FormData(form)));
    form.reset();
  }

  return <>
    <PageHead title="Configurações" description="Cuide do perfil, da segurança e das categorias do seu espaço." />
    <section className="settings-grid"><div className="settings-card"><h2>Perfil</h2><p>O nome aparece no painel e identifica seu espaço de planejamento.</p><form className="form-stack" onSubmit={saveProfile}><label>Nome<input name="name" defaultValue={profile.user.name} required maxLength="120" /></label><label>E-mail<input value={profile.user.email} readOnly /></label><button className="button primary" type="submit">Salvar perfil</button></form></div>
      <div className="settings-card"><h2>Segurança</h2><p>Use uma senha única com pelo menos seis caracteres.</p><form className="form-stack" onSubmit={changePassword}><label>Senha atual<input type="password" name="currentPassword" required /></label><label>Nova senha<input type="password" name="newPassword" minLength="6" required /></label><p className="form-error">{passwordError}</p><button className="button primary" type="submit">Alterar senha</button></form></div>
      <div className="settings-card"><h2>Categorias</h2><p>As cores ajudam a reconhecer rapidamente cada área na agenda.</p><div className="category-list">{profile.categories.map((category) => <div className="category-row" key={category.id}><i className="category-dot" style={{ '--category-color': category.color }} /><strong>{category.name}</strong><button className="icon-button danger-icon" onClick={() => onDeleteCategory(category)} title="Excluir"><Icon name="trash" /></button></div>)}</div><form className="category-new" onSubmit={addCategory}><input type="color" name="color" defaultValue="#6558e8" aria-label="Cor" /><input name="name" placeholder="Nova categoria" maxLength="80" required /><button className="button primary compact" type="submit">Adicionar</button></form></div>
      <div className="settings-card"><h2>Seus dados</h2><p>Todas as alterações são persistidas no PostgreSQL e ficam disponíveis em qualquer dispositivo.</p><div className="mini-stat"><span>Última sincronização</span><strong className="sync-time">{formatDate(profile.updatedAt, { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}</strong></div></div>
    </section>
  </>;
}
