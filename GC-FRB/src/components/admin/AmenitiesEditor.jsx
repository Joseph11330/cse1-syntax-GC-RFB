import { useState } from 'react'
import { X } from 'lucide-react'
import { inputCls, primaryBtnCls } from '../ui/index'
import { AMENITY_OPTIONS } from '../../data/admin/facilities'

// Chips + "type a custom one" + optional "choose from list". Used by Add Facility and Edit Facility.
export default function AmenitiesEditor({ value, onChange, showList = false, placeholder = 'Type a custom amenity' }) {
  const [custom, setCustom] = useState('')
  const [pick, setPick] = useState('')

  const add = (a) => {
    const v = a.trim()
    if (v && !value.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...value, v])
  }
  const row = (input, onAdd) => (
    <div className="flex max-w-md gap-2">
      {input}
      <button type="button" onClick={onAdd} className={primaryBtnCls}>Add</button>
    </div>
  )

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((a) => (
            <span key={a} className="inline-flex items-center gap-1 rounded-full bg-gc-100 px-3 py-1 text-[11px] font-medium text-gc-800">
              {a}
              <button type="button" aria-label={`Remove ${a}`} onClick={() => onChange(value.filter((x) => x !== a))}><X size={12} /></button>
            </span>
          ))}
        </div>
      )}
      {row(
        <input value={custom} placeholder={placeholder} className={inputCls} onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(custom); setCustom('') } }} />,
        () => { add(custom); setCustom('') },
      )}
      {showList && row(
        <select value={pick} onChange={(e) => setPick(e.target.value)} className={inputCls}>
          <option value="">Choose from list</option>
          {AMENITY_OPTIONS.map((a) => <option key={a}>{a}</option>)}
        </select>,
        () => { add(pick); setPick('') },
      )}
    </div>
  )
}
