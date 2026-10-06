import { ChevronDown } from 'lucide-react'

export default function Select({ value, onChange, options }) {
  return (
  <div className="relative">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="appearance-none rounded-full border border-slate-300 bg-white py-2 pl-5 pr-9 text-[11px] font-medium text-slate-700 shadow-sm outline-none hover:border-gc-600"
    >
      {options.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
    <ChevronDown size={11} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
  </div>
)
}
