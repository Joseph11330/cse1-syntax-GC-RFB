// Red asterisk for required fields. Put it right after the label text: <label>Title<Req /></label>
export const Req = () => (
  <span className="ml-0.5 font-bold text-red-500">
    <span aria-hidden="true">*</span><span className="sr-only"> (required)</span>
  </span>
)

// Small legend to show once near the top of a form.
export const RequiredNote = ({ className = '' }) => (
  <p className={`text-[11px] text-slate-500 ${className}`}><span className="font-bold text-red-500" aria-hidden="true">*</span> Required field</p>
)
