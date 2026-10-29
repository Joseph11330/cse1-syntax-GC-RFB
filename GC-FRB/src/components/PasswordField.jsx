import { useState } from 'react'
import { Check, Circle, Eye, EyeOff, Lock } from 'lucide-react'
import { PASSWORD_RULES } from '../lib/password'
import { Req } from './Req'

// Password input with an eye icon to preview the text.
// showRules  -> live checklist (8+ chars, 1 capital, 1 number, 1 symbol)
// error      -> message under the field
export default function PasswordField({
  label = 'Password', value, onChange, placeholder = 'Your password', autoComplete = 'new-password',
  required = true, showRules = false, error, inputClass, labelClass, name,
}) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className={labelClass}>{label}{required && <Req />}
        <span className="relative block">
          <Lock className="pointer-events-none absolute left-3.5 top-1/2 mt-0.5 size-4 -translate-y-1/2 text-slate-400" />
          <input name={name} type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
            autoComplete={autoComplete} aria-invalid={!!error} className={`${inputClass} pl-10 pr-11`} />
          <button type="button" aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 mt-0.5 -translate-y-1/2 text-slate-400 transition hover:text-slate-600">
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </span>
      </label>
      {showRules && (
        <ul className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2" aria-label="Password requirements">
          {PASSWORD_RULES.map((r) => {
            const ok = r.test(value)
            return (
              <li key={r.id} className={`flex items-center gap-1.5 text-[11px] transition ${ok ? 'font-medium text-gc-700' : 'text-slate-500'}`}>
                {ok ? <Check className="size-3.5" /> : <Circle className="size-3" />}{r.label}
              </li>
            )
          })}
        </ul>
      )}
      {error && <span role="alert" className="mt-1 block text-[11px] font-medium text-red-600">{error}</span>}
    </div>
  )
}
