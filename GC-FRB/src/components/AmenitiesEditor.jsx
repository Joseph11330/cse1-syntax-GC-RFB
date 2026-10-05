import { useState } from 'react'
import { X } from 'lucide-react'
import { facInputCls } from './ui'
import { amenityOptions } from '../data/facilities'

// Included amenities: type a custom one (and optionally pick from a list), then Add
export default function AmenitiesEditor({ value, onChange, showList = true, placeholder = 'Type a custom amenities' }) {
  const [custom, setCustom] = useState('')
  const [pick, setPick] = useState('')
  const add = (v) => {
    const t = v.trim()
    if (t && !value.some((x) => x.toLowerCase() === t.toLowerCase())) onChange([...value, t])
  }
  const btn = 'rounded-lg bg-gc-900 px-6 text-xs font-bold text-white shadow-[0_2px_4px_rgba(0,0,0,0.25)] transition hover:bg-gc-800'
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder={placeholder}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(custom); setCustom('') } }} className={facInputCls} />
        <button type="button" onClick={() => { add(custom); setCustom('') }} className={btn}>Add</button>
      </div>
      {showList && (
        <div className="flex gap-3">
          <select value={pick} onChange={(e) => setPick(e.target.value)} className={facInputCls}>
            <option value="">Choose from list</option>
            {amenityOptions.map((o) => <option key={o}>{o}</option>)}
          </select>
          <button type="button" onClick={() => { add(pick); setPick('') }} className={btn}>Add</button>
        </div>
      )}
      {!!value.length && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((a) => (
            <span key={a} className="inline-flex items-center gap-1 rounded-full bg-gc-50 px-2.5 py-1 text-[11px] font-medium text-gc-800 ring-1 ring-inset ring-gc-100">
              {a}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== a))} aria-label={`Remove ${a}`} className="text-gc-600 hover:text-red-600"><X size={11} /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
