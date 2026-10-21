import { useState } from 'react';
import { formatDate, initials } from '../lib/format.js';
import { routeTitles } from '../lib/routes.js';
import Icon from './Icon.jsx';

const navigation = [
  ['dashboard', 'home'], ['tasks', 'check'], ['agenda', 'calendar'], ['availability', 'clock'],
  ['priorities', 'bars'], ['history', 'history'], ['settings', 'settings'],
];

export default function Layout({ profile, route, menuOpen, onMenu, onNavigate, onLogout, onNewTask, children }) {
  const [today] = useState(() => new Date());
  return (
    <div className={`app-shell${menuOpen ? ' menu-open' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-head">
          <a className="brand brand-light" href="#dashboard" onClick={(event) => { event.preventDefault(); onNavigate('dashboard'); }}>Smart<span>Plan</span></a>
          <button className="icon-button sidebar-close" onClick={() => onMenu(false)} aria-label="Fechar menu"><Icon name="close" /></button>
        </div>
        <nav className="nav-list" aria-label="Navegação principal">
          {navigation.map(([name, iconName]) => (
            <a key={name} href={`#${name}`} className={route === name ? 'active' : ''} onClick={(event) => { event.preventDefault(); onNavigate(name); }}>
              <Icon name={iconName} />{routeTitles[name]}
            </a>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="avatar">{initials(profile.user.name)}</div>
          <div><strong>{profile.user.name}</strong><span>{profile.user.email}</span></div>
          <button className="icon-button" onClick={onLogout} title="Sair" aria-label="Sair"><Icon name="logout" /></button>
        </div>
      </aside>
      <button className="menu-scrim" onClick={() => onMenu(false)} aria-label="Fechar menu" />
      <main className="workspace">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => onMenu(true)} aria-label="Abrir menu"><Icon name="menu" /></button>
          <div className="topbar-title"><span>{routeTitles[route]}</span><small>{formatDate(today, { day: '2-digit', month: 'short' })}</small></div>
          <button className="button primary compact" onClick={() => onNewTask(null)}><Icon name="plus" /><span>Nova tarefa</span></button>
        </header>
        <div className="page" tabIndex="-1">{children}</div>
      </main>
    </div>
  );
}
