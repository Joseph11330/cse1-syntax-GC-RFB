export default function Card({ className = '', children }) {
  return <div className={`rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-900/[0.03] ${className}`}>{children}</div>
}
