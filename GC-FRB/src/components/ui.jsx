import { ChevronDown } from 'lucide-react'

export const Card = ({ className = '', children }) => (
  <div className={`rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-900/[0.03] ${className}`}>{children}</div>
)
export const Field = ({ label, className = '', children }) => (
  <label className={`block ${className}`}>
    <span className="text-[11px] font-semibold text-slate-600">{label}</span>
    <div className="mt-1">{children}</div>
  </label>
)
export const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] outline-none transition focus:border-gc-600 focus:ring-4 focus:ring-gc-600/10'
export const Badge = ({ tone = 'yellow', children }) => {
  const t = {
    yellow: 'bg-[#fdf6c6] text-[#d3a52c]',
    amber: 'bg-[#fdf6c6] text-[#d3a52c]',
    green: 'bg-[#cdeccb] text-[#2f8a3a]',
    red: 'bg-[#fdd3d3] text-[#e0525a]',
    blue: 'bg-sky-100 text-sky-700',
  }[tone]
  return <span className={`inline-block min-w-[5.5rem] rounded-full px-3 py-1 text-center text-[11px] font-medium ${t}`}>{children}</span>
}
export const Select = ({ value, onChange, options }) => (
  <div className="relative">
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="appearance-none rounded-full border border-slate-300 bg-white py-2 pl-5 pr-9 text-[11px] font-medium text-slate-700 shadow-sm outline-none hover:border-gc-600">
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
    <ChevronDown size={11} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
  </div>
)
