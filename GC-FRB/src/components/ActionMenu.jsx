import { useEffect, useState } from 'react'
import { MoreVertical } from 'lucide-react'

// Kebab button + floating menu (View Details / Accept / Reject)
export default function ActionMenu({ onView, onAccept, onReject }) {
  const [pos, setPos] = useState(null)

  useEffect(() => {
    if (!pos) return
    const close = () => setPos(null)
    const esc = (e) => e.key === 'Escape' && close()
    window.addEventListener('click', close)
    window.addEventListener('keydown', esc)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('keydown', esc)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [pos])

  const toggle = (e) => {
    e.stopPropagation()
    const b = e.currentTarget.getBoundingClientRect()
    setPos(pos ? null : { x: b.right, y: b.bottom + 4 })
  }
  const run = (fn) => () => { setPos(null); fn() }

  return (
    <>
      <button onClick={toggle} className="rounded-full p-1 text-gc-500 transition hover:bg-gc-100 hover:text-gc-700" aria-label="Actions"><MoreVertical size={16} /></button>
      {pos && (
        <div onClick={(e) => e.stopPropagation()} style={{ position: 'fixed', top: pos.y, left: pos.x - 150 }}
          className="z-50 w-40 overflow-hidden rounded-xl border border-slate-100 bg-white py-2 text-left shadow-xl shadow-black/15">
          {[['View Details', onView], ['Accept', onAccept], ['Reject', onReject]].map(([label, fn]) => (
            <button key={label} onClick={run(fn)} className="block w-full px-6 py-2.5 text-left text-[13px] font-semibold text-slate-700 transition hover:bg-gc-50 hover:text-gc-800">{label}</button>
          ))}
        </div>
      )}
    </>
  )
}
