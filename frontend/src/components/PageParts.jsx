import Icon from './Icon.jsx';

export function PageHead({ title, description, children }) {
  return <header className="page-head"><div><h1>{title}</h1><p>{description}</p></div>{children ? <div className="page-actions">{children}</div> : null}</header>;
}

export function EmptyState({ title, description, children }) {
  return <div className="empty-state"><div className="empty-icon"><Icon name="calendar" /></div><strong>{title}</strong><p>{description}</p>{children}</div>;
}

export function Toasts({ items }) {
  return <div className="toast-region" aria-live="polite">{items.map((item) => <div key={item.id} className={`toast${item.error ? ' error' : ''}`}>{item.message}</div>)}</div>;
}
