import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MoreVertical } from 'lucide-react'
import { useBookingActions } from '../../hooks/admin/useBookingActions'
function BookingMenu({ b, onChange }) {
  const nav = useNavigate()
  const { accept, reject, modals } = useBookingActions(onChange)
  const [pos, setPos] = useState(null)
  const btn = useRef(null)
  const menu = useRef(null)
  const pending = b.status === 'Pending'
  useEffect(() => {
    if (!pos) return
    const close = () => setPos(null)
    const outside = (e) => {
      const t = e.target
      if (!menu.current?.contains(t) && !btn.current?.contains(t)) close()
    }
    document.addEventListener('mousedown', outside)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('mousedown', outside)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [pos])
  const toggle = () => {
    if (pos) return setPos(null)
    if (!btn.current) return
    const r = btn.current.getBoundingClientRect()
    const h = (pending ? 3 : 1) * 40 + 8
    setPos({ top: r.bottom + h > window.innerHeight ? r.top - h - 4 : r.bottom + 4, right: window.innerWidth - r.right })
  }
  const item = 'block w-full px-4 py-2.5 text-left text-[12px] font-semibold hover:bg-slate-50'
  return (
    <>
      <button
        ref={btn}
        onClick={toggle}
        className="rounded-full p-1.5 text-gc-500 hover:bg-white/80 hover:text-gc-700"
        aria-label="Actions"
      >
        <MoreVertical size={16} />
      </button>
      {pos && (
        <div
          ref={menu}
          style={{ top: pos.top, right: pos.right }}
          className="fixed z-40 w-36 rounded-xl border border-slate-200 bg-white py-1 text-left shadow-lg"
        >
          <button className={`${item} text-gc-900`} onClick={() => nav(`/admin/bookings/${b.id}`)}>
            View Details
          </button>
          {pending && (
            <button
              className={`${item} text-gc-900`}
              onClick={() => {
                setPos(null)
                accept(b)
              }}
            >
              Accept
            </button>
          )}
          {pending && (
            <button
              className={`${item} text-red-600`}
              onClick={() => {
                setPos(null)
                reject(b)
              }}
            >
              Reject
            </button>
          )}
        </div>
      )}
      {modals}
    </>
  )
}
export { BookingMenu }
