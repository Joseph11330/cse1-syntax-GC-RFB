import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { isAxiosError } from 'axios'
import api from '../api'
import logo from '../assets/logo-login.png'
function Login() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/api/admin/login', { email, password, remember })
      ;(remember ? localStorage : sessionStorage).setItem('gc_token', data.token)
      localStorage.setItem('gc_admin', JSON.stringify(data.admin))
      nav('/dashboard')
    } catch (err) {
      setError((isAxiosError(err) && err.response?.data?.error) || 'Unable to sign in. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_1fr]">
      {/* Left brand panel */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-b from-gc-800 via-gc-700 to-gc-500 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -right-32 -top-32 size-96 rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-24 size-[28rem] rounded-full bg-black/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <img src={logo} alt="Gordon College seal" className="size-12 rounded-full ring-2 ring-white/30" />
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-wide">GORDON COLLEGE</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-yellow-300">Room &amp; Facility Booking</p>
          </div>
        </div>
        <div className="relative max-w-md">
          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight xl:text-5xl">Run every room approval from one screen.</h1>
          <p className="mt-5 text-sm leading-relaxed text-white/75">
            Review pending requests, resolve scheduling conflicts, and keep every building's status current for the whole campus.
          </p>
        </div>
        <div className="relative border-t border-white/20 pt-5 text-xs text-white/60">
          © {/* @__PURE__ */ new Date().getFullYear()} Gordon College · Olongapo City
        </div>
      </aside>

      {/* Form */}
      <main className="flex items-center justify-center px-6 py-12">
        <form onSubmit={submit} className="w-full max-w-sm">
          <img src={logo} alt="" className="mb-6 size-14 rounded-full shadow-lg shadow-gc-900/20 lg:hidden" />
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gc-600">Administrator access</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">Welcome Back</h2>
          <p className="mt-1 text-sm text-slate-500">Log in to manage bookings and facilities.</p>

          <label className="mt-8 block text-xs font-semibold text-slate-700">Email Address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@gordoncollege.edu.ph"
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm outline-none transition focus:border-gc-600 focus:bg-white focus:ring-4 focus:ring-gc-600/10"
          />

          <label className="mt-4 block text-xs font-semibold text-slate-700">Password</label>
          <div className="relative mt-1.5">
            <input
              type={show ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 pr-10 text-sm outline-none transition focus:border-gc-600 focus:bg-white focus:ring-4 focus:ring-gc-600/10"
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Toggle password"
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 text-slate-600">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="size-3.5 accent-gc-700"
              />{' '}
              Remember me
            </label>
            <a href="#" className="font-semibold text-gc-700 hover:underline">
              Forgot password?
            </a>
          </div>

          {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{error}</p>}

          <button
            disabled={loading}
            className="mt-6 w-full rounded-full bg-gc-900 py-3 text-sm font-semibold text-white shadow-lg shadow-gc-900/25 transition hover:bg-gc-800 active:scale-[.99] disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Login'}
          </button>

          <div className="my-5 flex items-center gap-3 text-[11px] text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            or continue with
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-slate-700">
            {['Google', 'Microsoft'].map((p) => (
              <button type="button" key={p} className="rounded-lg border border-slate-200 py-2.5 transition hover:bg-slate-50">
                {p}
              </button>
            ))}
          </div>
        </form>
      </main>
    </div>
  )
}
export { Login as default }
