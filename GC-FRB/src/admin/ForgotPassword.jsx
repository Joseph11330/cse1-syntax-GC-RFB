import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { ArrowLeft, KeyRound, Mail, MailCheck } from 'lucide-react'
import api from '../api'
import logoLogin from '../assets/logo-login.png'
import ConfirmModal from '../components/ConfirmModal'
import PasswordField from '../components/PasswordField'
import { Req, RequiredNote } from '../components/Req'
import { useToast } from '../components/toastContext'
import { failedPasswordRules } from '../lib/password'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[13px] text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-gc-600 focus:ring-4 focus:ring-gc-600/10 disabled:bg-slate-50'
const labelCls = 'block text-xs font-semibold text-slate-700 [&>span]:mt-1.5'
const btnCls = 'mt-6 w-full rounded-full bg-gc-900 py-3.5 text-sm font-semibold text-white shadow-lg shadow-gc-900/25 transition hover:bg-gc-800 active:scale-[.99] disabled:opacity-60'

function Frame({ icon: Icon, title, sub, children }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-gradient-to-b from-gc-50 to-white px-6 py-12">
      <div className="anim-fade-up w-full max-w-sm rounded-3xl bg-white p-8 shadow-[0_20px_50px_-20px_rgba(16,60,20,.3)] ring-1 ring-slate-900/[0.06]">
        <img src={logoLogin} alt="" className="size-12 rounded-full shadow-md shadow-gc-900/20" />
        <Link to="/admin/login" state={{ showLogin: true }} className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-gc-700"><ArrowLeft className="size-3.5" />Back to login</Link>
        <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-gc-600">Administrator access</p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight text-slate-900"><Icon className="size-6 text-gc-700" />{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{sub}</p>
        {children}
      </div>
    </div>
  )
}

/* Step 1: enter email → we send a reset link */
export function ForgotPasswordPage() {
  const toast = useToast()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [asking, setAsking] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const validate = (e) => {
    e.preventDefault()
    if (!email.trim()) return setError('Enter your admin email address.')
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email address.')
    setError('')
    setAsking(true)
  }

  const send = async () => {
    setSending(true)
    try {
      if (USE_MOCK) await new Promise((r) => setTimeout(r, 500))
      else await api.post('/api/admin/forgot-password', { email: email.trim(), redirect_url: `${window.location.origin}/admin/reset-password` })
      setSent(true)
      toast('Reset link sent. Check your email.')
    } catch (err) {
      const msg = (isAxiosError(err) && err.response?.data?.error) || 'Could not send the reset link. Please try again.'
      setError(msg)
      toast(msg, 'error')
    } finally {
      setSending(false)
      setAsking(false)
    }
  }

  if (sent) {
    return (
      <Frame icon={MailCheck} title="Check your email" sub={`If ${email.trim()} belongs to an admin account, a password reset link is on its way. The link expires in 1 hour.`}>
        {USE_MOCK && (
          <button onClick={() => nav('/admin/reset-password?token=mock-token')} className="mt-5 w-full rounded-xl bg-gc-50 px-3.5 py-2.5 text-left text-xs text-gc-800 ring-1 ring-gc-500/20 hover:bg-gc-100">
            Dev mode: no email is sent. <span className="font-semibold underline">Continue to reset page</span>
          </button>
        )}
        <button onClick={() => setSent(false)} className="mt-5 text-xs font-semibold text-gc-700 hover:underline">Use a different email</button>
      </Frame>
    )
  }

  return (
    <Frame icon={KeyRound} title="Forgot password?" sub="Enter your admin email and we'll send you a link to reset your password.">
      <form onSubmit={validate} noValidate className="mt-6">
        <RequiredNote className="mb-3" />
        <label className={labelCls}>Email address<Req />
          <span className="relative block">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" placeholder="admin@gordoncollege.edu.ph" className={`${inputCls} pl-10`} />
          </span>
        </label>
        {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-600">{error}</p>}
        <button disabled={sending} className={btnCls}>{sending ? 'Sending…' : 'Send reset link'}</button>
      </form>
      {asking && (
        <ConfirmModal icon={Mail} tone="green" title="Send reset link?" confirmLabel="Yes" cancelLabel="No" busy={sending}
          message={`We'll email a password reset link to ${email.trim()}.`} onCancel={() => !sending && setAsking(false)} onConfirm={send} />
      )}
    </Frame>
  )
}

/* Step 2: opened from the email link (?token=...) → choose a new password */
export function ResetPasswordPage() {
  const toast = useToast()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [tried, setTried] = useState(false)
  const [error, setError] = useState('')
  const [asking, setAsking] = useState(false)
  const [saving, setSaving] = useState(false)

  const errs = {
    password: !password ? 'Create a new password.' : failedPasswordRules(password).length ? 'Password does not meet all the requirements below.' : '',
    confirm: !confirm ? 'Re-enter your new password.' : confirm !== password ? 'Passwords do not match.' : '',
  }

  if (!token) {
    return (
      <Frame icon={KeyRound} title="Link not valid" sub="This reset link is missing or incomplete. Request a new one and open the link from the latest email.">
        <Link to="/admin/forgot-password" className={`${btnCls} block text-center`}>Request a new link</Link>
      </Frame>
    )
  }

  const validate = (e) => {
    e.preventDefault()
    setTried(true)
    if (errs.password || errs.confirm) return toast('Please fix the highlighted fields.', 'error')
    setError('')
    setAsking(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      if (USE_MOCK) await new Promise((r) => setTimeout(r, 500))
      else await api.post('/api/admin/reset-password', { token, password })
      toast('Password updated. You can now log in.')
      nav('/admin/login', { state: { showLogin: true } })
    } catch (err) {
      const msg = (isAxiosError(err) && err.response?.data?.error) || 'Could not reset your password. The link may have expired.'
      setError(msg)
      toast(msg, 'error')
      setAsking(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Frame icon={KeyRound} title="Set a new password" sub="Choose a strong password you haven't used before.">
      <form onSubmit={validate} noValidate className="mt-6 space-y-4">
        <RequiredNote />
        <PasswordField label="New password" value={password} onChange={setPassword} placeholder="New password" showRules
          labelClass={labelCls} inputClass={inputCls} error={tried && errs.password} />
        <PasswordField label="Confirm new password" value={confirm} onChange={setConfirm} placeholder="Re-enter new password"
          labelClass={labelCls} inputClass={inputCls} error={tried && errs.confirm} />
        {error && <p role="alert" className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-600">{error}</p>}
        <button disabled={saving} className={btnCls}>{saving ? 'Saving…' : 'Update password'}</button>
      </form>
      {asking && (
        <ConfirmModal icon={KeyRound} tone="green" title="Update your password?" confirmLabel="Yes" cancelLabel="No" busy={saving}
          message="You'll use the new password the next time you log in." onCancel={() => !saving && setAsking(false)} onConfirm={save} />
      )}
    </Frame>
  )
}
