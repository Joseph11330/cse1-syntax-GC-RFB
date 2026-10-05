import { useAuth } from '../../context/AuthProvider';
import Button from '../ui/Button';

export default function Topbar({ title }: { title: string }) {
  const { user, logout } = useAuth();
  return (
    <header className="topbar">
      <h1>{title}</h1>
      <div className="topbar__user">
        <span>{user?.name}<small>{user?.role}</small></span>
        <Button variant="ghost" onClick={logout}>Log out</Button>
      </div>
    </header>
  );
}
