import { useState } from 'react';
import { PageHead } from '../components/PageParts.jsx';

export default function Settings({ profile, onProfile, onAddCategory, onUpdateCategory, onDeleteCategory }) {
  const [panel, setPanel] = useState('account');
  const [selected, setSelected] = useState(null);
  const [categoryError, setCategoryError] = useState('');

  async function saveProfile(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    await onProfile({ name: data.name.trim(), newPassword: data.newPassword });
    event.currentTarget.elements.newPassword.value = '';
  }

  async function saveCategory(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (selected) await onUpdateCategory(selected, data); else await onAddCategory(data);
      setSelected(null); setCategoryError(''); event.currentTarget.reset();
    } catch (exception) { setCategoryError(exception.message); }
  }

  return <div className="settings-page"><PageHead title="Configurações" description="Personalize seus dados e a organização do SmartPlan." />
    <div className="settings-layout"><aside className="settings-menu"><button className={panel === 'account' ? 'active' : ''} onClick={() => setPanel('account')}><span><strong>Preferências da conta</strong><small>Nome, e-mail e senha</small></span><b>›</b></button><button className={panel === 'categories' ? 'active' : ''} onClick={() => setPanel('categories')}><span><strong>Categorias de tarefas</strong><small>Organize seus compromissos</small></span><b>›</b></button></aside>
      <section className="card settings-content">{panel === 'account' ? <div className="profile-panel"><h2>Meu perfil</h2><p>Atualize seus dados de acesso.</p><form className="inner-form" onSubmit={saveProfile}><label>Nome<input name="name" defaultValue={profile.user.name} required /></label><label>E-mail<input value={profile.user.email} readOnly /></label><label>Nova senha (deixe em branco para manter)<input type="password" name="newPassword" minLength="6" /></label><button className="wpf-button primary" type="submit">Salvar alterações</button></form><span className="settings-note">Seus dados ficam salvos com segurança no banco PostgreSQL.</span></div> : <div className="categories-panel"><h2>Categorias</h2><p>Use categorias para organizar seus diferentes compromissos.</p><form key={selected?.id || 'new'} className="category-form" onSubmit={saveCategory}><label>Nome da categoria<input name="name" defaultValue={selected?.name} required /></label><input name="color" type="color" defaultValue={selected?.color || '#7B5BF2'} aria-label="Cor da categoria" /><button className="wpf-button primary" type="submit">Salvar</button><button className="wpf-button" type="button" onClick={() => setSelected(null)}>Nova</button><span className="form-error">{categoryError}</span></form><div className="category-table"><header><span>Categoria</span><span /></header>{profile.categories.map((category) => <div key={category.id} onClick={() => setSelected(category)}><span><i style={{ background: category.color }} />{category.name}</span><button className="wpf-button danger small" type="button" onClick={(event) => { event.stopPropagation(); onDeleteCategory(category); }}>Excluir</button></div>)}</div></div>}</section>
    </div>
  </div>;
}
