import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function LoginPage() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/dashboard';
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const set = (k: 'email' | 'password') => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email address.';
    if (!form.password) next.password = 'Enter your password.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try { await login(form); nav(from, { replace: true }); }
    catch (err: any) { setErrors({ form: err.message }); }
    finally { setBusy(false); }
  }

  return (
    <div className="login">
      <div className="login__panel">
        <p className="login__brand">GC-FRB</p>
        <h1>Keep every record in one place.</h1>
        <p>Log in to review entries, track what is pending, and see what your team finished today.</p>
      </div>
      <form className="login__form" onSubmit={submit} noValidate>
        <h2>Log in</h2>
        {errors.form && <p className="alert" role="alert">{errors.form}</p>}
        <Input label="Email" type="email" autoComplete="username" value={form.email} onChange={set('email')} error={errors.email} />
        <Input label="Password" type="password" autoComplete="current-password" value={form.password} onChange={set('password')} error={errors.password} />
        <Button type="submit" block loading={busy}>Log in</Button>
      </form>
    </div>
  );
}
