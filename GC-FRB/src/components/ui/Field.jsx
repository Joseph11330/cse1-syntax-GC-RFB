export default function Field({ label, className = '', children }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[11px] font-semibold text-slate-600">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}
