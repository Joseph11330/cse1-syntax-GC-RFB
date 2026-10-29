import { useEffect } from 'react'
import { createPortal } from 'react-dom'

const TONES = {
  red: { ring: 'bg-rose-50 ring-rose-50/60', icon: 'text-rose-500', btn: 'bg-rose-500 shadow-rose-500/30 hover:bg-rose-600' },
  green: { ring: 'bg-gc-100 ring-gc-100/60', icon: 'text-gc-700', btn: 'bg-gc-800 shadow-gc-800/30 hover:bg-gc-900' },
  amber: { ring: 'bg-amber-50 ring-amber-50/60', icon: 'text-amber-500', btn: 'bg-amber-500 shadow-amber-500/30 hover:bg-amber-600' },
}

// Shared by the student portal and the admin panel.
// For any "saving…" action use:  confirmLabel="Yes" cancelLabel="No"
export default function ConfirmModal({
  icon: Icon, tone = 'red', title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  hideCancel, busy, onConfirm, onCancel,
}) {
  const t = TONES[tone]
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onCancel()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])
  return createPortal(
    <div className="no-print modal-backdrop fixed inset-0 z-[70] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={onCancel}>
      <div role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}
        className="modal-pop w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-2xl shadow-black/30">
        {Icon && (
          <div className={`mx-auto grid size-16 place-items-center rounded-full ring-8 ${t.ring}`}>
            <Icon size={26} className={t.icon} />
          </div>
        )}
        <h2 className="mt-5 text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">{message}</p>
        <div className={`mt-6 grid gap-3 ${hideCancel ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {!hideCancel && (
            <button autoFocus disabled={busy} onClick={onCancel} className="rounded-xl py-2.5 text-[13px] font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 disabled:opacity-50">
              {cancelLabel}
            </button>
          )}
          <button autoFocus={hideCancel} disabled={busy} onClick={onConfirm} className={`rounded-xl py-2.5 text-[13px] font-semibold text-white shadow-md transition disabled:opacity-60 ${t.btn}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
