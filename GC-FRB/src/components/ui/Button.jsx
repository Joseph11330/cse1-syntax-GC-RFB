const styles = {
  primary: 'bg-gc-900 text-white shadow-md shadow-gc-900/25 hover:bg-gc-800',
  soft: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
  danger: 'bg-red-500 text-white hover:bg-red-600',
}

export default function Button({ variant = 'primary', className = '', type = 'button', children, ...rest }) {
  return (
    <button type={type} {...rest} className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-5 py-2.5 text-xs font-semibold transition disabled:opacity-50 ${styles[variant]} ${className}`}>
      {children}
    </button>
  )
}
