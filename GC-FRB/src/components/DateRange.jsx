import { useEffect, useRef, useState } from 'react'
import { Calendar } from 'lucide-react'
import { fmtDate } from '../data/bookings'
function DateRange({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const close = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  const { from, to } = value
  const label =
    from && to ? `${fmtDate(from, false)} - ${fmtDate(to)}` : from ? `From ${fmtDate(from)}` : to ? `Until ${fmtDate(to)}` : 'All dates'
  const inp = 'w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-gc-600'
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2 text-[11px] font-medium text-slate-700 shadow-sm hover:border-gc-600"
      >
        <Calendar size={13} className="text-gc-500" /> {label}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-60 space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
          <label className="block text-[11px] font-semibold text-slate-600">
            From
            <input
              type="date"
              value={from}
              max={to || void 0}
              onChange={(e) => onChange({ ...value, from: e.target.value })}
              className={`${inp} mt-1`}
            />
          </label>
          <label className="block text-[11px] font-semibold text-slate-600">
            To
            <input
              type="date"
              value={to}
              min={from || void 0}
              onChange={(e) => onChange({ ...value, to: e.target.value })}
              className={`${inp} mt-1`}
            />
          </label>
          <button
            onClick={() => {
              onChange({ from: '', to: '' })
              setOpen(false)
            }}
            className="w-full rounded-lg border border-slate-200 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  )
}
export { DateRange as default }
