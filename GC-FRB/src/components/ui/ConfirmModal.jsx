import { useEffect } from 'react'
import { createPortal } from 'react-dom'
const tones = {
  red: { ring: 'bg-red-50 ring-red-50/60', icon: 'text-red-500', btn: 'bg-red-500 shadow-red-500/30 hover:bg-red-600' },
  green: { ring: 'bg-gc-100 ring-gc-100/60', icon: 'text-gc-700', btn: 'bg-gc-800 shadow-gc-800/30 hover:bg-gc-900' },
  amber: { ring: 'bg-amber-50 ring-amber-50/60', icon: 'text-amber-500', btn: 'bg-amber-500 shadow-amber-500/30 hover:bg-amber-600' },
}
function ConfirmModal({
  icon: Icon,
  tone = 'red',
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  hideCancel,
  onConfirm,
  onCancel,
}) {
  const t = tones[tone]
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onCancel()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])
  return createPortal(
    <div
      className="no-print modal-backdrop fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onMouseDown={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="modal-pop w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-2xl shadow-black/30"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {Icon && (
          <div className={`mx-auto grid size-16 place-items-center rounded-full ring-8 ${t.ring}`}>
            <Icon size={26} className={t.icon} />
          </div>
        )}
        <h2 className="mt-5 text-lg font-extrabold text-slate-900">{title}</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">{message}</p>
        <div className={`mt-6 grid gap-3 ${hideCancel ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {!hideCancel && (
            <button
              autoFocus
              onClick={onCancel}
              className="rounded-xl border border-slate-200 bg-white py-2.5 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {cancelLabel}
            </button>
          )}
          <button
            autoFocus={hideCancel}
            onClick={onConfirm}
            className={`rounded-xl py-2.5 text-[13px] font-semibold text-white shadow-md transition ${t.btn}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
export { ConfirmModal as default }
