import { Outlet, useLocation } from 'react-router-dom';
import Sidebar, { NAV_ITEMS } from './Sidebar';
import Topbar from './Topbar';

export default function AppLayout() {
  const { pathname } = useLocation();
  const title = NAV_ITEMS.find((n) => pathname.startsWith(n.to))?.label ?? '';
  return (
    <div className="shell">
      <Sidebar />
      <div className="shell__main">
        <Topbar title={title} />
        <main className="content"><Outlet /></main>
      </div>
    </div>
  );
}
