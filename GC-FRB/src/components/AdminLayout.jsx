import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, CalendarCheck, Building2, BarChart3, LogOut, HelpCircle } from 'lucide-react'
import logo from '../assets/logo-sidebar.png'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/bookings', label: 'Bookings', icon: CalendarCheck },
  { to: '/facilities', label: 'Facility Management', icon: Building2 },
  { to: '/reports', label: 'Analytics', icon: BarChart3 },
]

function LogoutModal({ onCancel, onConfirm }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onCancel()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="no-print modal-backdrop fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm" onMouseDown={onCancel}>
      <div role="dialog" aria-modal="true" aria-labelledby="logout-title"
        className="modal-pop w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-2xl shadow-black/30"
        onMouseDown={(e) => e.stopPropagation()}>
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-red-50 ring-8 ring-red-50/60">
          <LogOut size={26} className="text-red-500" />
        </div>
        <h2 id="logout-title" className="mt-5 text-lg font-extrabold text-slate-900">Log out?</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">
          You're about to sign out of the admin panel. You'll need to log in again to continue.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button autoFocus onClick={onCancel}
            className="rounded-xl border border-slate-200 bg-white py-2.5 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="rounded-xl bg-red-500 py-2.5 text-[13px] font-semibold text-white shadow-md shadow-red-500/30 transition hover:bg-red-600">
            Yes, log out
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminLayout() {
  const nav = useNavigate()
  const [confirmOut, setConfirmOut] = useState(false)
  const logout = () => {
    localStorage.removeItem('gc_token'); sessionStorage.removeItem('gc_token'); nav('/login')
  }
  return (
    <div className="app-shell flex h-screen bg-gc-900">
      <aside className="app-sidebar flex w-60 shrink-0 flex-col px-4 py-6 text-white">
        <div className="flex items-center gap-3 px-2">
          <img src={logo} alt="Gordon College" className="size-10 rounded-full" />
          <div className="leading-tight">
            <p className="text-[13px] font-bold">GORDON COLLEGE</p>
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-yellow-300">Room Booking</p>
          </div>
        </div>
        <p className="mt-9 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Menu</p>
        <nav className="mt-2 space-y-1">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition ${isActive ? 'bg-gc-600 text-white shadow-md shadow-black/20' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
              <Icon size={16} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-1 text-[13px] text-white/70">
          <button onClick={() => setConfirmOut(true)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/10"><LogOut size={15} /> Log out</button>
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/10"><HelpCircle size={15} /> Help</button>
        </div>
      </aside>
      <main className="app-main my-3 mr-3 flex-1 overflow-y-auto rounded-[2rem] bg-slate-50 p-8 shadow-2xl shadow-black/30">
        <Outlet />
      </main>
      {confirmOut && <LogoutModal onCancel={() => setConfirmOut(false)} onConfirm={logout} />}
    </div>
  )
}
