export function PageHead({ title, description, children }) {
  return <header className="page-head"><div><h1>{title}</h1><p>{description}</p></div>{children ? <div className="page-actions">{children}</div> : null}</header>;
}

export function EmptyState({ children }) {
  return <div className="empty-state">{children}</div>;
}

export function Toasts({ items }) {
  return <div className="toast-region" aria-live="polite">{items.map((item) => <div key={item.id} className={`toast${item.error ? ' error' : ''}`}>{item.message}</div>)}</div>;
}
