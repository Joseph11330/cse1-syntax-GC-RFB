import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { AlertTriangle, ArrowLeft, ArrowRight, Check, KeyRound, Mail, MailCheck, ShieldCheck } from 'lucide-react'
import api from '../api'
import logoLogin from '../assets/logo-login.png'
import ConfirmModal from './ConfirmModal'
import PasswordField from './PasswordField'
import { Req } from './Req'
import { useToast } from './toastContext'
import { failedPasswordRules } from '../lib/password'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

// One flow, two audiences. Same screens; only the paths, endpoints and wording change.
const ROLES = {
  admin: {
    label: 'Administrator', login: '/admin/login', loginState: { showLogin: true }, forgotPath: '/admin/forgot-password', resetPath: '/admin/reset-password',
    forgotApi: '/api/admin/forgot-password', resetApi: '/api/admin/reset-password', placeholder: 'admin@gordoncollege.edu.ph',
  },
  student: {
    label: 'Student', login: '/login', loginState: undefined, forgotPath: '/forgot-password', resetPath: '/reset-password',
    forgotApi: '/api/student/forgot-password', resetApi: '/api/student/reset-password', placeholder: 'you@gordoncollege.edu.ph',
  },
}

const inputCls = 'w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-gc-600 focus:bg-white focus:ring-4 focus:ring-gc-600/10'
const labelCls = 'block text-xs font-semibold text-slate-700 [&>span]:mt-2'
const primaryCls = 'inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-gc-800 to-gc-950 py-3.5 text-sm font-semibold text-white shadow-lg shadow-gc-950/30 transition hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60'
const quietCls = 'inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'

const STEPS = ['Email', 'Inbox', 'New password']

// current: 0-2 = that step is active, 3 = everything finished
function Steps({ current }) {
  return (
    <ol className="mt-7 flex items-center" aria-label="Progress">
      {STEPS.map((label, i) => {
        const done = i < current, active = i === current
        return (
          <li key={label} aria-current={active ? 'step' : undefined} className={`flex items-center ${i < STEPS.length - 1 ? 'flex-1' : ''}`}>
            <span className={`grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold transition-all duration-500 ${done ? 'bg-gc-600 text-white' : active ? 'bg-gc-900 text-white ring-4 ring-gc-500/20' : 'bg-slate-100 text-slate-400'}`}>
              {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
            </span>
            {active && <span className="ml-2 whitespace-nowrap text-xs font-semibold text-slate-800">{label}</span>}
            {i < STEPS.length - 1 && <span className={`mx-3 h-px flex-1 transition-colors duration-500 ${done ? 'bg-gc-500' : 'bg-slate-200'}`} />}
          </li>
        )
      })}
    </ol>
  )
}

const TONES = {
  green: 'bg-gradient-to-br from-gc-50 to-gc-100 text-gc-700 ring-gc-500/20',
  amber: 'bg-gradient-to-br from-amber-50 to-amber-100 text-amber-600 ring-amber-500/20',
}
function Badge({ icon: Icon, tone = 'green', pulse, pop }) {
  return (
    <div className="relative mt-7 size-16">
      {pulse && <span className="anim-ring absolute inset-0 rounded-2xl bg-gc-500/30" />}
      <span className={`${pop ? 'anim-success' : ''} relative grid size-16 place-items-center rounded-2xl ring-1 ${TONES[tone]}`}><Icon className="size-7" strokeWidth={1.8} /></span>
    </div>
  )
}

function Frame({ R, step, children }) {
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-gradient-to-br from-gc-950 via-gc-800 to-gc-600 px-4 py-10">
      <div className="pointer-events-none absolute inset-0 opacity-[.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:44px_44px]" />
      <div className="hero-orb pointer-events-none absolute -right-32 -top-32 size-[28rem] rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-24 size-[28rem] rounded-full bg-black/25 blur-3xl" />
      <div className="anim-fade-up relative w-full max-w-[26.5rem]">
        <Link to="/" className="mb-5 inline-flex items-center gap-2 text-xs font-medium text-white/80 transition hover:text-white"><ArrowLeft className="size-3.5" />Back to home</Link>
        <div className="rounded-[2rem] bg-white p-8 shadow-[0_40px_80px_-30px_rgba(0,0,0,.6)] sm:p-9">
          <header className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img src={logoLogin} alt="" className="size-10 rounded-full shadow-md shadow-gc-900/20" />
              <p className="text-[13px] font-semibold leading-tight text-gc-950">Gordon College<br /><span className="font-normal text-slate-500">Facility Booking</span></p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gc-50 px-3 py-1 text-[11px] font-semibold text-gc-800 ring-1 ring-inset ring-gc-500/20"><ShieldCheck className="size-3.5" />{R.label}</span>
          </header>
          <Steps current={step} />
          {children}
        </div>
        <p className="mt-5 text-center text-[11px] text-white/60">© {new Date().getFullYear()} Gordon College · Olongapo City</p>
      </div>
    </div>
  )
}

const H1 = ({ children }) => <h1 className="mt-6 text-[1.65rem] font-semibold leading-tight tracking-tight text-slate-900">{children}</h1>
const Lead = ({ children }) => <p className="mt-2 text-sm leading-relaxed text-slate-500">{children}</p>
const Spinner = () => <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />

/* ───────── Step 1 + 2: ask for the email, then "check your inbox" ───────── */
export function ForgotPasswordFlow({ role }) {
  const R = ROLES[role]
  const toast = useToast()
  const nav = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState(location.state?.email || '')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [wait, setWait] = useState(0)

  useEffect(() => {
    if (wait <= 0) return undefined
    const t = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  const send = async (e) => {
    e?.preventDefault()
    if (!email.trim()) return setError('Enter your email address.')
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email address.')
    setError('')
    setSending(true)
    try {
      if (USE_MOCK) await new Promise((r) => setTimeout(r, 700))
      else await api.post(R.forgotApi, { email: email.trim(), redirect_url: `${window.location.origin}${R.resetPath}` })
      setSent(true)
      setWait(45)
      toast('Reset link sent. Check your email.')
    } catch (err) {
      const msg = (isAxiosError(err) && err.response?.data?.error) || 'Could not send the reset link. Please try again.'
      setError(msg)
      toast(msg, 'error')
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <Frame R={R} step={1}>
        <Badge icon={MailCheck} pulse pop />
        <H1>Check your inbox</H1>
        <Lead>We sent a password reset link to <span className="font-semibold text-slate-800">{email.trim()}</span>. The link expires in 1 hour.</Lead>
        {USE_MOCK && (
          <button onClick={() => nav(`${R.resetPath}?token=mock-token`)} className="mt-5 w-full rounded-2xl bg-gc-50 px-4 py-3 text-left text-xs text-gc-800 ring-1 ring-gc-500/20 transition hover:bg-gc-100">
            Dev mode: no email is sent. <span className="font-semibold underline">Open the reset page</span>
          </button>
        )}
        <div className="mt-6 space-y-3">
          <button onClick={send} disabled={sending || wait > 0} className={quietCls}>
            {sending ? 'Sending…' : wait > 0 ? `Resend link in 0:${String(wait).padStart(2, '0')}` : 'Resend link'}
          </button>
          <button onClick={() => { setSent(false); setWait(0) }} className="w-full py-1 text-xs font-semibold text-gc-700 hover:underline">Wrong email? Use a different one</button>
        </div>
        <p className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-[11px] leading-relaxed text-slate-500">Can't find it? Check your spam or junk folder, and make sure you used the email linked to your account.</p>
      </Frame>
    )
  }

  return (
    <Frame R={R} step={0}>
      <Badge icon={KeyRound} />
      <H1>Forgot your password?</H1>
      <Lead>No problem. Enter the email on your account and we'll send you a link to choose a new one.</Lead>
      <form onSubmit={send} noValidate className="mt-6">
        <label className={labelCls}>Email address<Req />
          <span className="relative block">
            <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus placeholder={R.placeholder} aria-invalid={!!error} className={`${inputCls} pl-11`} />
          </span>
        </label>
        {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-600">{error}</p>}
        <button disabled={sending} className={`${primaryCls} mt-6`}>{sending ? <><Spinner />Sending…</> : <>Send reset link<ArrowRight className="size-4" /></>}</button>
      </form>
      <p className="mt-5 text-center text-xs text-slate-500">Remembered it? <Link to={R.login} state={R.loginState} className="font-semibold text-gc-700 hover:underline">Back to login</Link></p>
    </Frame>
  )
}

/* ───────── Step 3: opened from the email link (?token=...) ───────── */
export function ResetPasswordFlow({ role }) {
  const R = ROLES[role]
  const toast = useToast()
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [tried, setTried] = useState(false)
  const [error, setError] = useState('')
  const [asking, setAsking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const errs = {
    password: !password ? 'Create a new password.' : failedPasswordRules(password).length ? 'Password does not meet all the requirements below.' : '',
    confirm: !confirm ? 'Re-enter your new password.' : confirm !== password ? 'Passwords do not match.' : '',
  }

  if (!token) {
    return (
      <Frame R={R} step={1}>
        <Badge icon={AlertTriangle} tone="amber" />
        <H1>This link isn't valid</H1>
        <Lead>The reset link is missing or incomplete. Request a new one, then open the link from the latest email.</Lead>
        <Link to={R.forgotPath} className={`${primaryCls} mt-6`}>Request a new link<ArrowRight className="size-4" /></Link>
      </Frame>
    )
  }

  if (done) {
    return (
      <Frame R={R} step={3}>
        <Badge icon={Check} pulse pop />
        <H1>Password updated</H1>
        <Lead>You're all set. Log in with your new password to continue.</Lead>
        <Link to={R.login} state={R.loginState} className={`${primaryCls} mt-6`}>Go to login<ArrowRight className="size-4" /></Link>
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
      if (USE_MOCK) await new Promise((r) => setTimeout(r, 700))
      else await api.post(R.resetApi, { token, password })
      toast('Password updated. You can now log in.')
      setDone(true)
    } catch (err) {
      const msg = (isAxiosError(err) && err.response?.data?.error) || 'Could not reset your password. The link may have expired.'
      setError(msg)
      toast(msg, 'error')
    } finally {
      setSaving(false)
      setAsking(false)
    }
  }

  return (
    <Frame R={R} step={2}>
      <Badge icon={KeyRound} />
      <H1>Set a new password</H1>
      <Lead>Choose a strong password you haven't used before.</Lead>
      <form onSubmit={validate} noValidate className="mt-6 space-y-5">
        <PasswordField label="New password" value={password} onChange={setPassword} placeholder="New password" showRules
          labelClass={labelCls} inputClass={inputCls} error={tried && errs.password} />
        <div>
          <PasswordField label="Confirm new password" value={confirm} onChange={setConfirm} placeholder="Re-enter new password"
            labelClass={labelCls} inputClass={inputCls} error={tried && errs.confirm} />
          {confirm && confirm === password && <span className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-gc-700"><Check className="size-3.5" />Passwords match</span>}
        </div>
        {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-600">{error}</p>}
        <button disabled={saving} className={primaryCls}>{saving ? <><Spinner />Saving…</> : <>Update password<ArrowRight className="size-4" /></>}</button>
      </form>
      {asking && (
        <ConfirmModal icon={KeyRound} tone="green" title="Update your password?" confirmLabel="Yes" cancelLabel="No" busy={saving}
          message="You'll use the new password the next time you log in." onCancel={() => !saving && setAsking(false)} onConfirm={save} />
      )}
    </Frame>
  )
}
