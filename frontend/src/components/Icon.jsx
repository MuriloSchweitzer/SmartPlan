const paths = {
  home: <path d="M3 10.8 12 3l9 7.8v9.7a.5.5 0 0 1-.5.5H15v-7H9v7H3.5a.5.5 0 0 1-.5-.5z" />,
  check: <><path d="M5 4h14v16H5z" /><path d="M8 9l2 2 5-5M8 15h8" /></>,
  calendar: <><path d="M4 6h16v14H4z" /><path d="M8 3v6M16 3v6M4 10h16" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  bars: <path d="M5 18h3V9H5zM10.5 18h3V5h-3zM16 18h3v-6h-3z" />,
  history: <><path d="M4 12a8 8 0 1 0 2-5.3L4 9M4 4v5h5" /><path d="M12 7v5l3 2" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1A8 8 0 0 0 15 6l-.3-2.5h-4L10.5 6A8 8 0 0 0 9 7.1l-2.4-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1A8 8 0 0 0 10.5 18l.2 2.5h4L15 18a8 8 0 0 0 1.5-1.1l2.4 1 2-3.4-2-1.5a7 7 0 0 0 .1-1z" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  play: <path d="m8 5 11 7-11 7z" />,
  trash: <path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />,
  edit: <path d="m4 16-.5 4.5L8 20l11-11-4-4zM13.5 6.5l4 4" />,
  arrow: <path d="M5 12h14M14 7l5 5-5 5" />,
  logout: <path d="M10 5H5v14h5M13 8l4 4-4 4M17 12H9" />,
};

export default function Icon({ name }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24">{paths[name]}</svg>;
}
