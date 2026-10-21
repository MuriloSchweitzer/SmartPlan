import { useCallback, useEffect, useState } from 'react';
import AuthScreen from './components/AuthScreen.jsx';
import Layout from './components/Layout.jsx';
import { Toasts } from './components/PageParts.jsx';
import { addDays, startOfWeek } from './lib/format.js';
import { routeTitles } from './lib/routes.js';
import Agenda from './pages/Agenda.jsx';
import Availability from './pages/Availability.jsx';
import Dashboard from './pages/Dashboard.jsx';
import History from './pages/History.jsx';
import Priorities from './pages/Priorities.jsx';
import Settings from './pages/Settings.jsx';
import Tasks from './pages/Tasks.jsx';
import { api, clearToken, getToken, setToken } from './services/api.js';

const validRoute = (value) => routeTitles[value] ? value : 'dashboard';

export default function App() {
  const [profile, setProfile] = useState(null);
  const [route, setRoute] = useState(() => validRoute(location.hash.slice(1)));
  const [loading, setLoading] = useState(Boolean(getToken()));
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [taskEditor, setTaskEditor] = useState(undefined);
  const [week, setWeek] = useState(() => startOfWeek(new Date()));
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, error = false) => {
    const id = crypto.randomUUID();
    setToasts((items) => [...items, { id, message, error }]);
    setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 3300);
  }, []);

  useEffect(() => {
    let active = true;
    async function boot() {
      if (!getToken()) return setLoading(false);
      try {
        const data = await api('/profile');
        if (active) setProfile(data.profile);
      } catch {
        clearToken();
      } finally {
        if (active) setLoading(false);
      }
    }
    boot();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const update = () => setRoute(validRoute(location.hash.slice(1)));
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);

  function navigate(nextRoute) {
    const safeRoute = validRoute(nextRoute);
    location.hash = safeRoute;
    setRoute(safeRoute);
    setMenuOpen(false);
    if (safeRoute !== 'tasks') setTaskEditor(undefined);
  }

  async function authenticate(type, credentials) {
    const data = await api(`/auth/${type}`, { method: 'POST', body: JSON.stringify(credentials) });
    setToken(data.token);
    setProfile(data.profile);
    navigate('dashboard');
  }

  function logout() {
    clearToken();
    setProfile(null);
    location.hash = '';
  }

  async function mutate(path, options, successMessage) {
    setBusy(true);
    try {
      const data = await api(path, options);
      if (data.profile) setProfile(data.profile);
      if (successMessage) toast(successMessage);
      return data;
    } catch (error) {
      if (error.status === 401 && path !== '/profile/password') logout();
      toast(error.message, true);
      throw error;
    } finally {
      setBusy(false);
    }
  }

  function openTask(task = null) {
    if (!profile.categories.length) {
      toast('Crie uma categoria antes de cadastrar tarefas.', true);
      navigate('settings');
      return;
    }
    location.hash = 'tasks';
    setRoute('tasks');
    setTaskEditor(task);
  }

  async function saveTask(id, task) {
    await mutate(id ? `/profile/tasks/${id}` : '/profile/tasks', { method: id ? 'PUT' : 'POST', body: JSON.stringify(task) }, id ? 'Tarefa atualizada.' : 'Tarefa criada.');
    setTaskEditor(undefined);
  }

  if (loading) return <div className="boot-screen"><strong>SmartPlan</strong></div>;
  if (!profile) return <><AuthScreen onAuthenticate={authenticate} /><Toasts items={toasts} /></>;

  const pageProps = { profile, onNavigate: navigate, onNewTask: openTask };
  const pages = {
    dashboard: <Dashboard {...pageProps} />,
    tasks: <Tasks {...pageProps} editorTask={taskEditor} onCloseEditor={() => setTaskEditor(undefined)} onEdit={openTask} onSave={saveTask} onComplete={(task) => mutate(`/profile/tasks/${task.id}/complete`, { method: 'POST' }, 'Tarefa concluída.')} onCancel={(task) => mutate(`/profile/tasks/${task.id}/cancel`, { method: 'POST' }, 'Tarefa cancelada.')} onDelete={(task) => { if (confirm(`Excluir permanentemente "${task.title}" e todo o histórico relacionado?`)) mutate(`/profile/tasks/${task.id}`, { method: 'DELETE' }, 'Tarefa excluída.'); }} />,
    agenda: <Agenda profile={profile} week={week} onWeek={(direction) => setWeek((value) => addDays(value, direction * 7))} onSelectWeek={(value) => setWeek(startOfWeek(value))} onMove={(block, start) => mutate(`/profile/agenda/${block.id}/move`, { method: 'PUT', body: JSON.stringify({ start: start.toISOString() }) }, 'Bloco reagendado manualmente.')} onRecalculate={async () => { const data = await mutate('/profile/agenda/recalculate', { method: 'POST', body: JSON.stringify({ weekStart: week.toISOString() }) }); toast(data.unallocatedCount ? `Agenda recalculada. ${data.unallocatedCount} tarefa(s) ficaram sem espaço.` : 'Agenda recalculada.'); }} />,
    availability: <Availability profile={profile} onAdd={(value) => mutate('/profile/availability', { method: 'POST', body: JSON.stringify(value) }, 'Disponibilidade salva.')} onDelete={(item) => mutate(`/profile/availability/${item.id}`, { method: 'DELETE' }, 'Disponibilidade removida.')} />,
    priorities: <Priorities profile={profile} />,
    history: <History profile={profile} onAdd={(value) => mutate('/profile/history', { method: 'POST', body: JSON.stringify(value) }, 'Execução registrada.')} />,
    settings: <Settings profile={profile} onProfile={(value) => mutate('/profile', { method: 'PUT', body: JSON.stringify(value) }, 'Alterações salvas.')} onAddCategory={(value) => mutate('/profile/categories', { method: 'POST', body: JSON.stringify(value) }, 'Categoria adicionada.')} onUpdateCategory={(category, value) => mutate(`/profile/categories/${category.id}`, { method: 'PUT', body: JSON.stringify(value) }, 'Categoria atualizada.')} onDeleteCategory={(category) => mutate(`/profile/categories/${category.id}`, { method: 'DELETE' }, 'Categoria removida.')} />,
  };

  return <div className={busy ? 'loading' : ''}>
    <Layout profile={profile} route={route} menuOpen={menuOpen} onMenu={setMenuOpen} onNavigate={navigate} onLogout={logout}>{pages[route]}</Layout>
    <Toasts items={toasts} />
  </div>;
}
