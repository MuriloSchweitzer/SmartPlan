import { routeTitles } from '../lib/routes.js';
import Icon from './Icon.jsx';

const navigation = [
  ['dashboard', 'home'], ['tasks', 'check'], ['agenda', 'calendar'], ['availability', 'clock'],
  ['priorities', 'bars'], ['history', 'history'], ['settings', 'settings'],
];

export default function Layout({ profile, route, menuOpen, onMenu, onNavigate, onLogout, children }) {
  return <div className={`app-shell${menuOpen ? ' menu-open' : ''}`}>
    <aside className="sidebar">
      <button className="sidebar-close" type="button" onClick={() => onMenu(false)} aria-label="Fechar menu">×</button>
      <button className="sidebar-brand" type="button" onClick={() => onNavigate('dashboard')}>SmartPlan</button>
      <nav className="nav-list" aria-label="Navegação principal">
        {navigation.map(([name, iconName]) => <button key={name} type="button" className={route === name ? 'active' : ''} onClick={() => onNavigate(name)}>
          <Icon name={iconName} /><span>{routeTitles[name]}</span>
        </button>)}
      </nav>
      <div className="sidebar-user">
        <strong>{profile.user.name}</strong>
        <span>{profile.user.email}</span>
        <button type="button" onClick={onLogout}>Sair</button>
      </div>
    </aside>
    <button className="menu-scrim" type="button" onClick={() => onMenu(false)} aria-label="Fechar menu" />
    <button className="mobile-menu" type="button" onClick={() => onMenu(true)} aria-label="Abrir menu">☰</button>
    <main className="workspace"><div className="page">{children}</div></main>
  </div>;
}
