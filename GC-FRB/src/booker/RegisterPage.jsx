import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { ArrowLeft, CalendarCheck, IdCard, Mail, ShieldCheck, UserPlus, Zap } from 'lucide-react'
import api from '../api'
import logoSidebar from '../assets/logo-sidebar.png'
import ConfirmModal from '../components/ConfirmModal'
import PasswordField from '../components/PasswordField'
import { Req, RequiredNote } from '../components/Req'
import { useToast } from '../components/toastContext'
import { NAME_PATTERN, NAME_SUFFIXES, buildFullName } from '../lib/name'
import { failedPasswordRules } from '../lib/password'
import { GHOST, INPUT, LABEL, PRIMARY } from './ui'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
const TOKEN_KEY = 'gc_student_token'
const hasStudentToken = () => !!(localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY))
const EMPTY = { lastName: '', firstName: '', middleName: '', suffix: '', studentId: '', email: '', password: '', confirm: '' }

export default function RegisterPage() {
  const nav = useNavigate()
  const toast = useToast()
  const [f, setF] = useState(EMPTY)
  const [tried, setTried] = useState(false)
  const [asking, setAsking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  if (hasStudentToken()) return <Navigate to="/dashboard" replace />

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))
  const setVal = (k) => (v) => setF((p) => ({ ...p, [k]: v }))

  const errs = {
    lastName: !f.lastName.trim() ? 'Enter your last name.' : !NAME_PATTERN.test(f.lastName.trim()) ? 'Use letters only.' : '',
    firstName: !f.firstName.trim() ? 'Enter your first name.' : !NAME_PATTERN.test(f.firstName.trim()) ? 'Use letters only.' : '',
    middleName: f.middleName.trim() && !NAME_PATTERN.test(f.middleName.trim()) ? 'Use letters only.' : '',
    email: !f.email.trim() ? 'Enter your email address.' : !/^\S+@\S+\.\S+$/.test(f.email.trim()) ? 'Enter a valid email address.' : '',
    password: !f.password ? 'Create a password.' : failedPasswordRules(f.password).length ? 'Password does not meet all the requirements below.' : '',
    confirm: !f.confirm ? 'Re-enter your password.' : f.confirm !== f.password ? 'Passwords do not match.' : '',
  }
  const invalid = Object.values(errs).some(Boolean)
  const err = (k) => tried && errs[k] && <span role="alert" className="mt-1 block text-[11px] font-medium text-red-600">{errs[k]}</span>
  const field = `${INPUT} !mt-1.5 !py-3`
  const fullName = buildFullName(f)

  const submit = (e) => {
    e.preventDefault()
    setTried(true)
    setError('')
    if (invalid) return toast('Please fix the highlighted fields.', 'error')
    setAsking(true)
  }

  const register = async () => {
    setSaving(true)
    try {
      // Name is sent as separate fields (and full_name for older backend code).
      const payload = {
        last_name: f.lastName.trim(), first_name: f.firstName.trim(),
        middle_name: f.middleName.trim() || null, suffix: f.suffix || null,
        full_name: fullName, email: f.email.trim(), password: f.password,
        student_id: f.studentId.trim() || undefined,
      }
      if (USE_MOCK) await new Promise((r) => setTimeout(r, 500))
      else await api.post('/api/student/register', payload)
      toast('Account created. You can now log in.')
      nav('/login')
    } catch (err) {
      const msg = (isAxiosError(err) && err.response?.data?.error) || 'Could not create your account. Please try again.'
      setError(msg)
      toast(msg, 'error')
    } finally {
      setSaving(false)
      setAsking(false)
    }
  }

  return (
    <div className="grid min-h-dvh bg-white lg:grid-cols-[1fr_1.25fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-gc-950 via-gc-800 to-gc-600 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 opacity-[.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="relative flex items-center gap-4">
          <img src={logoSidebar} alt="Gordon College seal" className="size-16 drop-shadow-lg" />
          <div>
            <p className="text-lg font-semibold tracking-wide">GORDON COLLEGE</p>
            <p className="text-xs font-medium tracking-wide text-gold-400">ROOM &amp; FACILITY BOOKING</p>
          </div>
        </div>
        <div className="relative max-w-sm">
          <h1 className="text-5xl font-semibold leading-[1.08] tracking-tight">Create your student account</h1>
          <p className="mt-5 text-sm leading-relaxed text-white/85">One account to check availability, request a room and track the decision.</p>
          <ul className="mt-8 space-y-3 text-sm text-white/90">
            {[[CalendarCheck, 'Live availability across every building'], [ShieldCheck, 'Clash-free scheduling'], [Zap, 'Request in minutes']].map(([Icon, t]) => (
              <li key={t} className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-lg bg-white/12 ring-1 ring-white/20"><Icon className="size-4" /></span>{t}</li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/60">© {new Date().getFullYear()} Gordon College</p>
      </aside>

      <main className="grid place-items-center px-6 py-12">
        <div className="anim-fade-up w-full max-w-xl">
          <Link to="/login" className="mb-8 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-gc-700"><ArrowLeft className="size-3.5" />Back to login</Link>
          <p className="text-[11px] font-semibold tracking-[.2em] text-gc-600">STUDENT ACCESS</p>
          <h2 className="mt-1 text-4xl font-semibold tracking-tight text-gc-900">Register</h2>
          <p className="mt-2 text-sm text-slate-600">Fill in your details to start booking rooms and facilities.</p>
          <RequiredNote className="mt-4" />

          <form onSubmit={submit} noValidate className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={LABEL}>Last name<Req /><input value={f.lastName} onChange={set('lastName')} autoComplete="family-name" placeholder="Dela Cruz" className={field} />{err('lastName')}</label>
              <label className={LABEL}>First name<Req /><input value={f.firstName} onChange={set('firstName')} autoComplete="given-name" placeholder="Juan" className={field} />{err('firstName')}</label>
              <label className={LABEL}>Middle name <span className="font-normal text-slate-400">(optional)</span><input value={f.middleName} onChange={set('middleName')} autoComplete="additional-name" placeholder="Santos" className={field} />{err('middleName')}</label>
              <label className={LABEL}>Suffix <span className="font-normal text-slate-400">(optional)</span>
                <select value={f.suffix} onChange={set('suffix')} className={`${field} appearance-none`}>
                  <option value="">None</option>{NAME_SUFFIXES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
            </div>

            <label className={LABEL}>Student ID <span className="font-normal text-slate-400">(optional)</span>
              <span className="relative block">
                <IdCard className="pointer-events-none absolute left-3.5 top-1/2 mt-0.5 size-4 -translate-y-1/2 text-slate-400" />
                <input value={f.studentId} onChange={set('studentId')} placeholder="e.g. 2024-00123" className={`${field} pl-10`} />
              </span>
            </label>
            <label className={LABEL}>Email address<Req />
              <span className="relative block">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 mt-0.5 size-4 -translate-y-1/2 text-slate-400" />
                <input type="email" value={f.email} onChange={set('email')} autoComplete="email" placeholder="you@gordoncollege.edu.ph" className={`${field} pl-10`} />
              </span>{err('email')}
            </label>

            <PasswordField label="Password" value={f.password} onChange={setVal('password')} placeholder="Create a password" showRules
              labelClass={LABEL} inputClass={field} error={tried && errs.password} />
            <PasswordField label="Confirm password" value={f.confirm} onChange={setVal('confirm')} placeholder="Re-enter your password"
              labelClass={LABEL} inputClass={field} error={tried && errs.confirm} />

            {error && <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-xs text-red-600">{error}</p>}
            <div className="grid gap-3 pt-2 sm:grid-cols-[1fr_auto]">
              <button disabled={saving} className={`${PRIMARY} !rounded-full !py-3.5 text-sm`}><UserPlus className="size-4" />{saving ? 'Creating account…' : 'Create account'}</button>
              <Link to="/login" className={`${GHOST} !rounded-full !py-3.5 text-sm`}>I already have an account</Link>
            </div>
          </form>
        </div>
      </main>

      {asking && (
        <ConfirmModal icon={UserPlus} tone="green" title="Create this account?" confirmLabel="Yes" cancelLabel="No" busy={saving}
          onCancel={() => !saving && setAsking(false)} onConfirm={register}
          message={`We'll create a student account for ${fullName} (${f.email.trim()}).`} />
      )}
    </div>
  )
}
