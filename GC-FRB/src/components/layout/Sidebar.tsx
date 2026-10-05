import { NavLink } from 'react-router-dom';

// Add new modules here and they show up in the nav automatically.
export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/bookings', label: 'Bookings' },
  { to: '/facilities', label: 'Facilities' },
  { to: '/analytics', label: 'Analytics' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">GC-FRB</div>
      <nav aria-label="Main">
        {NAV_ITEMS.map((n) => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}>{n.label}</NavLink>
        ))}
      </nav>
    </aside>
  );
}
