import { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, Info, XCircle } from 'lucide-react'
import { ToastCtx } from './toastContext'

const ICON = { success: CheckCircle2, error: XCircle, info: Info }
const COLOR = { success: 'text-emerald-500', error: 'text-rose-500', info: 'text-sky-500' }

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const dismiss = useCallback((id) => setItems((i) => i.filter((x) => x.id !== id)), [])
  const push = useCallback((message, tone = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setItems((i) => [...i, { id, message, tone }])
    setTimeout(() => dismiss(id), tone === 'error' ? 5200 : 3600)
  }, [dismiss])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      {createPortal(
        <div aria-live="polite" className="no-print fixed bottom-5 right-5 z-[80] flex w-[min(22rem,calc(100vw-2.5rem))] flex-col gap-2">
          {items.map(({ id, message, tone }) => {
            const Icon = ICON[tone] || ICON.info
            return (
              <button key={id} type="button" onClick={() => dismiss(id)} role={tone === 'error' ? 'alert' : 'status'}
                className="anim-toast flex items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-left text-[13px] font-medium text-white shadow-2xl shadow-black/30">
                <Icon size={18} className={`shrink-0 ${COLOR[tone] || COLOR.info}`} />
                {message}
              </button>
            )
          })}
        </div>,
        document.body,
      )}
    </ToastCtx.Provider>
  )
}
