import {
  createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore,
} from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { isAxiosError } from 'axios'
import {
  AlertTriangle, ArrowLeft, BarChart3, Bell, Building2, CalendarCheck, CalendarDays, Calendar, Check,
  CheckCircle2, ChevronDown, ChevronRight, DoorOpen, Download, Eye, EyeOff, HelpCircle, Info,
  LayoutDashboard, LogOut, Menu, MoreVertical, Plus, Printer, Search, Trash2, TrendingUp, X, XCircle, Inbox,
} from 'lucide-react'
import api from '../api'
import logoSidebar from '../assets/logo-sidebar.png'
import logoLogin from '../assets/logo-login.png'
import { downloadReportPdf } from '../lib/reportPdf'

/* ───────────────────────── 1. DATA STORE ───────────────────────── */

// Tiny reactive store: any component using useSyncExternalStore re-renders on change,
// so Dashboard / Bookings / Sidebar badge always agree (no more manual "force update").
const createStore = (initial) => {
  let state = initial
  const subs = new Set()
  return {
    get: () => state,
    set(fn) { state = fn(state); subs.forEach((f) => f()) },
    sub(f) { subs.add(f); return () => subs.delete(f) },
  }
}

const pad = (n) => String(n).padStart(2, '0')
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const dayOffset = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return toISO(d) }
const TODAY = dayOffset(0)

const BOOKING_STATUSES = ['Pending', 'Confirmed', 'Completed', 'Cancelled']
const FACILITY_STATUSES = ['Available', 'Under Maintenance', 'Occupied']
const FACILITY_TYPES = ['Meeting Room', 'Hall', 'Gymnasium', 'Laboratory', 'Lecture Room', 'Auditorium']
const AMENITY_OPTIONS = ['Projector', 'Air conditioning', 'Whiteboard', 'Sound system', 'Wi-Fi', 'Microphone', 'Podium', 'Computers']

const mk = (id, who, dept, room, off, start, end, purpose, status, extra = {}) => ({
  id, who, dept, room, date: dayOffset(off), start, end, purpose, status,
  speaker: '-', description: '', equipment: 'None', guests: 0, remarks: 'None', ...extra,
})

const bookingStore = createStore([
  mk(1, 'Jasmine Marcado', 'Student Council', 'Conference Room A', 1, '13:00', '15:00', 'Officer Meeting', 'Pending', {
    description: 'Monthly officer meeting to review ongoing student council projects and upcoming events.', equipment: 'Extension chords', guests: 12 }),
  mk(2, 'Ronald Mendoza', 'CS Department', 'Computer Lab 2', 1, '15:30', '17:00', 'Coding Workshop', 'Cancelled', {
    speaker: 'Prof. Reyes', description: 'Hands-on coding workshop for second-year students.', equipment: 'Projector', guests: 30 }),
  mk(3, 'Ana Lopez', 'CEAS Department', 'Function Hall', 2, '09:00', '11:00', 'General Assembly', 'Confirmed', {
    description: 'Department general assembly.', equipment: 'Sound system', guests: 150 }),
  mk(4, 'Dave Castillo', 'CHTM Department', 'PE Hall', 3, '13:00', '18:00', 'Recognition Night', 'Pending', {
    description: 'Annual recognition night for outstanding students.', equipment: 'Stage lights, microphones', guests: 400, remarks: 'Needs setup at noon' }),
  mk(5, 'Miguel Santos', 'CHTM Department', 'Function Hall', -2, '08:00', '12:00', 'General Assembly', 'Completed', {
    description: 'General assembly for CHTM students.', equipment: 'Sound system', guests: 120 }),
  mk(6, 'Kim Pineda', 'CCS Department', 'Function Hall', -5, '13:00', '18:00', 'Recognition Day', 'Cancelled', {
    description: 'Recognition day program.', guests: 100 }),
  mk(7, 'Dr. Santiago', 'Faculty Affairs', 'Conference Room B', 0, '09:00', '11:00', 'Faculty meeting', 'Confirmed', {
    description: 'Faculty planning meeting.', guests: 18 }),
  mk(8, 'Prof. Villanueva', 'CCS Department', 'Lecture Hall 102', 0, '09:00', '11:00', 'Thesis defense', 'Confirmed', {
    description: 'Final thesis defense panel.', guests: 25 }),
  mk(9, 'Student Affairs', 'Student Affairs Office', 'Function Hall', 0, '09:00', '11:00', 'Org orientation', 'Confirmed', {
    description: 'Orientation for newly recognized organizations.', equipment: 'Sound system', guests: 90 }),
  mk(10, 'Maria Cruz', 'Supreme Student Government', 'AVR Room 1', 4, '10:00', '12:00', 'Leadership Seminar', 'Pending', {
    speaker: 'Atty. Dela Peña', description: 'Leadership seminar for all org presidents.', equipment: 'Projector, microphones', guests: 45 }),
])

const mkF = (id, name, code, location, type, capacity, status, amenities = [], overview = '') =>
  ({ id, name, code, location, type, capacity, rate: 0, status, amenities, overview })

const facilityStore = createStore([
  mkF(1, 'Conference Room A', 'CR-123', '3rd Floor - Main Building', 'Meeting Room', 50, 'Under Maintenance', ['Projector', 'Air conditioning'],
    'A bright function hall facing the atrium, built for cross-team planning sessions and client-facing calls. Sound-dampened walls keep discussions private.'),
  mkF(2, 'Conference Room B', 'CR-456', '3rd Floor - Main Building', 'Meeting Room', 50, 'Occupied', ['Whiteboard']),
  mkF(3, 'Function Hall', 'FH-123', '2nd Floor - Annex Building', 'Hall', 100, 'Available', ['Sound system', 'Microphone']),
  mkF(4, 'PE Hall', 'PE-123', '5th Floor - Main Building', 'Hall', 100, 'Under Maintenance', ['Sound system']),
  mkF(5, 'AVR Room 1', 'AVR-123', '4th Floor - Main Building', 'Meeting Room', 50, 'Available', ['Projector', 'Air conditioning']),
  mkF(6, 'AVR Room 2', 'AVR-124', '4th Floor - Main Building', 'Meeting Room', 50, 'Occupied', ['Projector']),
  mkF(7, 'AVR Room 3', 'AVR-125', '4th Floor - Main Building', 'Meeting Room', 50, 'Available', ['Projector']),
  mkF(8, 'Computer Lab 2', 'CL-202', '2nd Floor - Tech Building', 'Laboratory', 40, 'Available', ['Computers', 'Wi-Fi']),
  mkF(9, 'Lecture Hall 102', 'LH-102', '1st Floor - Main Building', 'Lecture Room', 80, 'Available', ['Podium', 'Projector']),
])

const useBookings = () => useSyncExternalStore(bookingStore.sub, bookingStore.get)
const useFacilities = () => useSyncExternalStore(facilityStore.sub, facilityStore.get)

const nextId = (list) => list.reduce((m, x) => Math.max(m, x.id), 0) + 1
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }

const findConflict = (b, ignoreId) =>
  bookingStore.get().find(
    (x) => x.id !== ignoreId && x.room === b.room && x.date === b.date && x.status === 'Confirmed' &&
      toMin(b.start) < toMin(x.end) && toMin(x.start) < toMin(b.end),
  )
const setBookingStatus = (id, status) =>
  bookingStore.set((l) => l.map((b) => (b.id === Number(id) ? { ...b, status } : b)))
const acceptBooking = (id) => {
  const target = bookingStore.get().find((b) => b.id === Number(id))
  const conflict = target && findConflict(target, target.id)
  if (conflict) return { ok: false, conflict }
  setBookingStatus(id, 'Confirmed')
  return { ok: true }
}
const rejectBooking = (id) => setBookingStatus(id, 'Cancelled')
const addBooking = (b) => bookingStore.set((l) => [{ id: nextId(l), status: 'Confirmed', ...b }, ...l])
const addFacility = (f) => facilityStore.set((l) => [...l, { id: nextId(l), status: 'Available', overview: '', rate: 0, ...f }])
const updateFacility = (id, patch) => facilityStore.set((l) => l.map((f) => (f.id === Number(id) ? { ...f, ...patch } : f)))
const removeFacility = (id) => facilityStore.set((l) => l.filter((f) => f.id !== Number(id)))

// Mock report numbers (replace with GET /api/admin/reports once the endpoint exists)
const monday = (() => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d })()
const sunday = (() => { const d = new Date(monday); d.setDate(d.getDate() + 6); return d })()
const longDate = (d, y = false) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(y && { year: 'numeric' }) })
const REPORT = {
  title: 'Booking Report',
  range: `${longDate(monday)} - ${longDate(sunday, true)}`,
  week: [['MON', 14], ['TUE', 18], ['WED', 9], ['THU', 26], ['FRI', 16], ['SAT', 7], ['SUN', 3]],
  utilization: [['Meeting rooms', 90], ['Halls', 35], ['Labs', 50]],
  top: [
    ['Conference Room', 22, '95%', '2.30 hrs'],
    ['Function Hall', 9, '80%', '3 hrs'],
    ['PE Hall', 14, '92%', '5.30 hrs'],
    ['AVR Room', 31, '100%', '6.40 hrs'],
  ],
}

/* ───────────────────────── 2. HELPERS ───────────────────────── */

const fmtTime = (t) => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${pad(m)} ${h >= 12 ? 'PM' : 'AM'}` }
const fmtDate = (d, year = true) =>
  new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(year && { year: 'numeric' }) })
const whenLabel = (b) => `${fmtDate(b.date)} ${fmtTime(b.start)} - ${fmtTime(b.end)}`
const detailWhen = (b) => `${fmtDate(b.date, false)}, ${fmtTime(b.start)} - ${fmtTime(b.end)}`
const initials = (n) => n.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
const inRange = (date, { from, to }) => (!from || date >= from) && (!to || date <= to)

const readAdmin = () => { try { return JSON.parse(localStorage.getItem('gc_admin') || '{}') } catch { return {} } }
const hasToken = () => !!(localStorage.getItem('gc_token') || sessionStorage.getItem('gc_token'))
const clearSession = () => { ['gc_token', 'gc_admin'].forEach((k) => { localStorage.removeItem(k); sessionStorage.removeItem(k) }) }

function useCountUp(value, ms = 900) {
  const [n, setN] = useState(0)
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  useEffect(() => {
    if (reduce) return
    let raf = 0
    const t0 = performance.now()
    const tick = (t) => {
      const p = Math.min((t - t0) / ms, 1)
      setN(Math.round(value * (1 - (1 - p) ** 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, ms, reduce])
  return reduce ? value : n
}

/* ───────────────────────── 3. UI KIT ───────────────────────── */

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-gc-600 focus:ring-4 focus:ring-gc-600/10 disabled:bg-slate-50'

function Card({ className = '', children, ...rest }) {
  return (
    <div {...rest} className={`rounded-2xl bg-white ring-1 ring-slate-900/[0.06] shadow-[0_1px_2px_rgba(16,40,16,.04),0_12px_32px_-16px_rgba(16,40,16,.12)] ${className}`}>
      {children}
    </div>
  )
}

const TONES = {
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/15',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  red: 'bg-rose-50 text-rose-700 ring-rose-600/15',
  blue: 'bg-sky-50 text-sky-700 ring-sky-600/15',
}
const DOTS = { amber: 'bg-amber-500', green: 'bg-emerald-500', red: 'bg-rose-500', blue: 'bg-sky-500' }
const BOOKING_TONE = { Pending: 'amber', Confirmed: 'blue', Completed: 'green', Cancelled: 'red' }
const FACILITY_TONE = { Available: 'green', 'Under Maintenance': 'amber', Occupied: 'red' }

function Badge({ tone = 'amber', children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${TONES[tone]}`}>
      <span className={`size-1.5 rounded-full ${DOTS[tone]}`} />
      {children}
    </span>
  )
}

const BTN = {
  primary: 'bg-gc-900 text-white shadow-lg shadow-gc-900/25 hover:bg-gc-800 active:scale-[.98]',
  accent: 'bg-gc-500 text-white shadow-lg shadow-gc-500/30 hover:bg-gc-600 active:scale-[.98]',
  soft: 'bg-white text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 active:scale-[.98]',
  danger: 'bg-white text-rose-600 ring-1 ring-inset ring-rose-200 hover:bg-rose-50 active:scale-[.98]',
}
const btnCls = (variant = 'primary', extra = '') =>
  `inline-flex items-center justify-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-semibold transition disabled:pointer-events-none disabled:opacity-50 ${BTN[variant]} ${extra}`

function Button({ variant, className, type = 'button', ...rest }) {
  return <button type={type} {...rest} className={btnCls(variant, className)} />
}

function Field({ label, className = '', children }) {
  return (
    <div className={className}>
      <span className="text-[11px] font-semibold tracking-wide text-slate-600">{label}</span>
      <div className="mt-1.5">{children}</div>
    </div>
  )
}

function Select({ value, onChange, options, label }) {
  return (
    <div className="relative">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-full bg-white py-2.5 pl-4 pr-9 text-[11px] font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 outline-none transition hover:ring-gc-600/40 focus:ring-2 focus:ring-gc-600/40"
      >
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
    </div>
  )
}

function PageHeader({ icon: Icon, title, subtitle, children }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        {Icon && (
          <div className="no-print grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-gc-100 to-white text-gc-800 ring-1 ring-gc-600/10">
            <Icon size={22} />
          </div>
        )}
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="no-print flex flex-wrap items-center gap-3">{children}</div>}
    </header>
  )
}

function EmptyState({ icon: Icon = Inbox, children }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center text-sm text-slate-400">
      <span className="grid size-11 place-items-center rounded-full bg-slate-100"><Icon size={18} /></span>
      {children}
    </div>
  )
}

function Avatar({ name }) {
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gc-600 to-gc-900 text-[10px] font-bold tracking-wide text-white shadow-sm shadow-gc-900/30">
      {initials(name)}
    </span>
  )
}

/* Toasts */
const ToastCtx = createContext(() => {})
const useToast = () => useContext(ToastCtx)
const TOAST_ICON = { success: CheckCircle2, error: XCircle, info: Info }
const TOAST_COLOR = { success: 'text-emerald-500', error: 'text-rose-500', info: 'text-sky-500' }

function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const push = useCallback((message, tone = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setItems((i) => [...i, { id, message, tone }])
    setTimeout(() => setItems((i) => i.filter((x) => x.id !== id)), 3600)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      {createPortal(
        <div aria-live="polite" className="no-print fixed bottom-5 right-5 z-[60] flex w-[min(22rem,calc(100vw-2.5rem))] flex-col gap-2">
          {items.map(({ id, message, tone }) => {
            const Icon = TOAST_ICON[tone]
            return (
              <div key={id} className="anim-toast flex items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-[13px] font-medium text-white shadow-2xl shadow-black/30">
                <Icon size={18} className={TOAST_COLOR[tone]} />
                {message}
              </div>
            )
          })}
        </div>,
        document.body,
      )}
    </ToastCtx.Provider>
  )
}

/* Modal */
const MODAL_TONES = {
  red: { ring: 'bg-rose-50 ring-rose-50/60', icon: 'text-rose-500', btn: 'bg-rose-500 shadow-rose-500/30 hover:bg-rose-600' },
  green: { ring: 'bg-gc-100 ring-gc-100/60', icon: 'text-gc-700', btn: 'bg-gc-800 shadow-gc-800/30 hover:bg-gc-900' },
  amber: { ring: 'bg-amber-50 ring-amber-50/60', icon: 'text-amber-500', btn: 'bg-amber-500 shadow-amber-500/30 hover:bg-amber-600' },
}

function ConfirmModal({ icon: Icon, tone = 'red', title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', hideCancel, onConfirm, onCancel }) {
  const t = MODAL_TONES[tone]
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onCancel()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])
  return createPortal(
    <div className="no-print modal-backdrop fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={onCancel}>
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
            <button autoFocus onClick={onCancel} className="rounded-xl py-2.5 text-[13px] font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50">
              {cancelLabel}
            </button>
          )}
          <button autoFocus={hideCancel} onClick={onConfirm} className={`rounded-xl py-2.5 text-[13px] font-semibold text-white shadow-md transition ${t.btn}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/* Kebab menu rendered in a portal so table overflow never clips it */
function ActionMenu({ items }) {
  const [pos, setPos] = useState(null)
  const btn = useRef(null)
  const menu = useRef(null)
  useEffect(() => {
    if (!pos) return
    const close = () => setPos(null)
    const outside = (e) => { if (!menu.current?.contains(e.target) && !btn.current?.contains(e.target)) close() }
    const esc = (e) => e.key === 'Escape' && close()
    document.addEventListener('mousedown', outside)
    document.addEventListener('keydown', esc)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('mousedown', outside)
      document.removeEventListener('keydown', esc)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [pos])
  const toggle = () => {
    if (pos) return setPos(null)
    const r = btn.current.getBoundingClientRect()
    const h = items.length * 42 + 12
    setPos({ top: r.bottom + h > innerHeight ? r.top - h - 6 : r.bottom + 6, right: innerWidth - r.right })
  }
  return (
    <>
      <button ref={btn} onClick={toggle} aria-haspopup="menu" aria-expanded={!!pos} aria-label="Actions"
        className="rounded-full p-2 text-slate-400 transition hover:bg-gc-100 hover:text-gc-700">
        <MoreVertical size={16} />
      </button>
      {pos && createPortal(
        <div ref={menu} role="menu" style={{ top: pos.top, right: pos.right }}
          className="anim-pop fixed z-50 w-44 rounded-2xl bg-white p-1.5 text-left shadow-2xl shadow-black/15 ring-1 ring-slate-900/[0.07]">
          {items.map(({ label, icon: Icon, onClick, danger }) => (
            <button key={label} role="menuitem" onClick={() => { setPos(null); onClick() }}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[12px] font-semibold transition ${danger ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-700 hover:bg-gc-50 hover:text-gc-800'}`}>
              {Icon && <Icon size={14} />} {label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  )
}

/* ───────────────────────── 4. SHARED PARTS ───────────────────────── */

function DateRange({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  const { from, to } = value
  const label = from && to ? `${fmtDate(from, false)} - ${fmtDate(to)}` : from ? `From ${fmtDate(from)}` : to ? `Until ${fmtDate(to)}` : 'All dates'
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[11px] font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 transition hover:ring-gc-600/40">
        <Calendar size={13} className="text-gc-600" /> {label}
      </button>
      {open && (
        <div className="anim-pop absolute left-0 top-full z-30 mt-2 w-64 space-y-3 rounded-2xl bg-white p-4 shadow-2xl shadow-black/15 ring-1 ring-slate-900/[0.07]">
          <Field label="From">
            <input type="date" value={from} max={to || undefined} onChange={(e) => onChange({ ...value, from: e.target.value })} className={inputCls} />
          </Field>
          <Field label="To">
            <input type="date" value={to} min={from || undefined} onChange={(e) => onChange({ ...value, to: e.target.value })} className={inputCls} />
          </Field>
          <Button variant="soft" className="w-full !py-2" onClick={() => { onChange({ from: '', to: '' }); setOpen(false) }}>Clear</Button>
        </div>
      )}
    </div>
  )
}

function AmenitiesEditor({ value, onChange, showList = false }) {
  const [custom, setCustom] = useState('')
  const [pick, setPick] = useState('')
  const add = (a) => {
    const v = a.trim()
    if (v && !value.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...value, v])
  }
  const row = (input, onAdd) => (
    <div className="flex max-w-md gap-2">
      {input}
      <Button onClick={onAdd} className="!px-5">Add</Button>
    </div>
  )
  return (
    <div className="space-y-2.5">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((a) => (
            <span key={a} className="inline-flex items-center gap-1.5 rounded-full bg-gc-100 py-1 pl-3 pr-2 text-[11px] font-medium text-gc-800">
              {a}
              <button type="button" aria-label={`Remove ${a}`} onClick={() => onChange(value.filter((x) => x !== a))}
                className="rounded-full p-0.5 hover:bg-gc-600/15"><X size={11} /></button>
            </span>
          ))}
        </div>
      )}
      {row(
        <input value={custom} placeholder="Type a custom amenity" className={inputCls} onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(custom); setCustom('') } }} />,
        () => { add(custom); setCustom('') },
      )}
      {showList && row(
        <select value={pick} onChange={(e) => setPick(e.target.value)} className={inputCls}>
          <option value="">Choose from list</option>
          {AMENITY_OPTIONS.map((a) => <option key={a}>{a}</option>)}
        </select>,
        () => { add(pick); setPick('') },
      )}
    </div>
  )
}

// accept / reject with conflict detection + toasts. Render `modals` once next to the buttons that use it.
function useBookingActions() {
  const toast = useToast()
  const [dialog, setDialog] = useState(null)
  const accept = (b) => {
    const res = acceptBooking(b.id)
    if (res.ok) toast(`${b.purpose} accepted`)
    else setDialog({ type: 'conflict', b, conflict: res.conflict })
  }
  const reject = (b) => setDialog({ type: 'reject', b })
  const close = () => setDialog(null)
  const modals = dialog && (dialog.type === 'reject' ? (
    <ConfirmModal icon={XCircle} tone="red" title="Reject this request?" confirmLabel="Yes, reject" onCancel={close}
      message={`${dialog.b.who}'s request for ${dialog.b.room} (${whenLabel(dialog.b)}) will be marked as cancelled.`}
      onConfirm={() => { rejectBooking(dialog.b.id); close(); toast('Request rejected', 'info') }} />
  ) : (
    <ConfirmModal icon={AlertTriangle} tone="amber" title="Schedule conflict" hideCancel confirmLabel="Got it" onCancel={close} onConfirm={close}
      message={`${dialog.b.room} is already confirmed for ${dialog.conflict.who} (${whenLabel(dialog.conflict)}). Reject this request or ask the requester to pick another time.`} />
  ))
  return { accept, reject, modals }
}

const TH = 'px-6 py-3.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500'

// One table used by BOTH the dashboard and the full bookings page
function BookingsTable({ rows, emptyText = 'No bookings match these filters.' }) {
  const nav = useNavigate()
  const { accept, reject, modals } = useBookingActions()
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-[12px]">
        <thead className="border-y border-slate-200/70 bg-slate-50/80">
          <tr>
            {['Name', 'Facility', 'Date & Time', 'Purpose'].map((h) => <th key={h} className={TH}>{h}</th>)}
            <th className={`${TH} text-center`}>Status</th>
            <th className={`${TH} text-center`}>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => {
            const items = [{ label: 'View Details', icon: Eye, onClick: () => nav(`/admin/bookings/${b.id}`) }]
            if (b.status === 'Pending') {
              items.push({ label: 'Accept', icon: Check, onClick: () => accept(b) }, { label: 'Reject', icon: X, danger: true, onClick: () => reject(b) })
            }
            return (
              <tr key={b.id} className="border-b border-slate-100 transition last:border-0 hover:bg-gc-50/60">
                <td className="px-6 py-3.5">
                  <Link to={`/admin/bookings/${b.id}`} className="flex items-center gap-3">
                    <Avatar name={b.who} />
                    <span>
                      <span className="block font-semibold text-slate-900">{b.who}</span>
                      <span className="text-[10px] text-slate-500">{b.dept}</span>
                    </span>
                  </Link>
                </td>
                <td className="px-6 py-3.5 font-medium text-slate-800">{b.room}</td>
                <td className="px-6 py-3.5">
                  <span className="block font-medium text-slate-800">{fmtDate(b.date)}</span>
                  <span className="text-[10px] text-slate-500">{fmtTime(b.start)} - {fmtTime(b.end)}</span>
                </td>
                <td className="px-6 py-3.5 font-medium text-slate-800">{b.purpose}</td>
                <td className="px-6 py-3.5 text-center"><Badge tone={BOOKING_TONE[b.status]}>{b.status}</Badge></td>
                <td className="px-6 py-3.5 text-center"><ActionMenu items={items} /></td>
              </tr>
            )
          })}
          {!rows.length && <tr><td colSpan={6}><EmptyState icon={Search}>{emptyText}</EmptyState></td></tr>}
        </tbody>
      </table>
      {modals}
    </div>
  )
}

/* ───────────────────────── 5. SHELL + LOGIN ───────────────────────── */

const NAV_LINKS = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/bookings', label: 'Bookings', icon: CalendarCheck, badge: true },
  { to: '/admin/facilities', label: 'Facility Management', icon: Building2 },
  { to: '/admin/reports', label: 'Analytics', icon: BarChart3 },
]

function AdminShell() {
  const nav = useNavigate()
  const { pathname } = useLocation()
  const bookings = useBookings()
  const pending = bookings.filter((b) => b.status === 'Pending').length
  const [drawer, setDrawer] = useState(false)
  const [confirmOut, setConfirmOut] = useState(false)
  const logout = () => { clearSession(); nav('/admin/login') }

  return (
    <div className="app-shell relative flex h-dvh overflow-hidden bg-gc-950 bg-[radial-gradient(60rem_40rem_at_-10%_-10%,rgba(58,165,53,.28),transparent),radial-gradient(40rem_30rem_at_0%_110%,rgba(232,185,61,.10),transparent)]">
      {drawer && <div className="no-print fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setDrawer(false)} />}

      <aside className={`app-sidebar fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col px-4 py-6 text-white transition-transform duration-300 lg:static lg:translate-x-0 ${drawer ? 'translate-x-0' : '-translate-x-full'} bg-gc-950 lg:bg-transparent`}>
        <div className="flex items-center gap-3 px-2">
          <img src={logoSidebar} alt="Gordon College" className="size-10 rounded-full ring-2 ring-white/20" />
          <div className="leading-tight">
            <p className="text-[13px] font-bold tracking-wide">GORDON COLLEGE</p>
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-gold-400">Room Booking</p>
          </div>
        </div>

        <p className="mt-10 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">Menu</p>
        <nav className="mt-2 space-y-1">
          {NAV_LINKS.map(({ to, label, icon: Icon, badge }) => (
            <NavLink key={to} to={to} onClick={() => setDrawer(false)}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition ${isActive ? 'bg-white/[0.12] text-white shadow-inner shadow-white/5 ring-1 ring-white/10' : 'text-white/65 hover:bg-white/[0.07] hover:text-white'}`}>
              {({ isActive }) => (
                <>
                  <span className={`absolute -left-4 h-5 w-1 rounded-r-full bg-gold-400 transition ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                  <Icon size={16} /> {label}
                  {badge && pending > 0 && (
                    <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-gold-400 px-1.5 text-[10px] font-bold text-gc-950">{pending}</span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-1 text-[13px] text-white/65">
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-white/[0.07] hover:text-white"><HelpCircle size={15} /> Help</button>
          <button onClick={() => setConfirmOut(true)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-white/[0.07] hover:text-white"><LogOut size={15} /> Log out</button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="no-print flex items-center gap-3 px-4 py-3 text-white lg:hidden">
          <button onClick={() => setDrawer(true)} aria-label="Open menu" className="rounded-lg p-2 hover:bg-white/10"><Menu size={20} /></button>
          <span className="text-sm font-semibold">Gordon College · Admin</span>
        </div>
        <main className="app-main mb-3 mr-3 ml-3 flex-1 overflow-y-auto rounded-[28px] bg-[#f5f7f5] p-5 shadow-2xl shadow-black/40 sm:p-8 lg:ml-0 lg:mt-3">
          <div key={pathname} className="anim-fade-up">
            <Outlet />
          </div>
        </main>
      </div>

      {confirmOut && (
        <ConfirmModal icon={LogOut} tone="red" title="Log out?" confirmLabel="Yes, log out" onCancel={() => setConfirmOut(false)} onConfirm={logout}
          message="You're about to sign out of the admin panel. You'll need to log in again to continue." />
      )}
    </div>
  )
}

function RequireAuth() {
  return hasToken() ? <AdminShell /> : <Navigate to="/admin/login" replace />
}

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

function LoginPage() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  if (hasToken()) return <Navigate to="/admin/dashboard" replace />

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let data
      if (USE_MOCK) {
        // dev mode: any email + 4+ char password works, no backend needed
        if (password.length < 4) throw new Error('Password must be at least 4 characters.')
        const name = email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        data = { token: 'mock-token', admin: { full_name: name || 'Admin', email } }
      } else {
        data = (await api.post('/api/admin/login', { email, password, remember })).data
      }
      ;(remember ? localStorage : sessionStorage).setItem('gc_token', data.token)
      localStorage.setItem('gc_admin', JSON.stringify(data.admin))
      nav('/admin/dashboard')
    } catch (err) {
      setError((isAxiosError(err) && err.response?.data?.error) || err.message || 'Unable to sign in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-dvh bg-white lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-b from-gc-800 via-gc-700 to-gc-500 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 opacity-[.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="pointer-events-none absolute -right-32 -top-32 size-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-24 size-[28rem] rounded-full bg-black/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <img src={logoLogin} alt="Gordon College seal" className="size-12 rounded-full ring-2 ring-white/30" />
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-wide">GORDON COLLEGE</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-400">Room &amp; Facility Booking</p>
          </div>
        </div>
        <div className="relative max-w-md">
          <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight xl:text-5xl">Run every room approval from one screen.</h1>
          <p className="mt-5 text-sm leading-relaxed text-white/75">
            Review pending requests, resolve scheduling conflicts, and keep every building's status current for the whole campus.
          </p>
        </div>
        <div className="relative border-t border-white/20 pt-5 text-xs text-white/60">© {new Date().getFullYear()} Gordon College · Olongapo City</div>
      </aside>

      <main className="flex items-center justify-center px-6 py-12">
        <form onSubmit={submit} className="anim-fade-up w-full max-w-sm">
          <img src={logoLogin} alt="" className="mb-6 size-14 rounded-full shadow-lg shadow-gc-900/20 lg:hidden" />
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gc-600">Administrator access</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Welcome back</h2>
          <p className="mt-1 text-sm text-slate-500">Log in to manage bookings and facilities.</p>

          <label htmlFor="email" className="mt-8 block text-xs font-semibold text-slate-700">Email address</label>
          <input id="email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@gordoncollege.edu.ph" className={`${inputCls} mt-1.5 !py-3`} />

          <label htmlFor="password" className="mt-4 block text-xs font-semibold text-slate-700">Password</label>
          <div className="relative mt-1.5">
            <input id="password" type={show ? 'text' : 'password'} required autoComplete="current-password" value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className={`${inputCls} !py-3 pr-11`} />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 text-slate-600">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-3.5 accent-gc-700" /> Remember me
            </label>
            <a href="#" className="font-semibold text-gc-700 hover:underline">Forgot password?</a>
          </div>

          {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-600">{error}</p>}

          <button disabled={loading} className="mt-6 w-full rounded-full bg-gc-900 py-3.5 text-sm font-semibold text-white shadow-lg shadow-gc-900/25 transition hover:bg-gc-800 active:scale-[.99] disabled:opacity-60">
            {loading ? 'Signing in…' : 'Login'}
          </button>
          {USE_MOCK && <p className="mt-4 text-center text-[11px] text-slate-400">Dev mode: any email + 4 character password works.</p>}
        </form>
      </main>
    </div>
  )
}

/* ───────────────────────── 6. PAGES ───────────────────────── */

/* ---- Dashboard ---- */
function StatCard({ label, value, suffix = '', icon: Icon, tint, hint }) {
  const n = useCountUp(value)
  return (
    <Card className="group p-5 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-gc-900/10">
      <div className="flex items-start justify-between">
        <span className={`grid size-10 place-items-center rounded-xl ${tint}`}><Icon size={18} /></span>
        {hint && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">{hint}</span>}
      </div>
      <p className="mt-4 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">{n}{suffix}</p>
      <p className="mt-0.5 text-xs text-slate-500">{label}</p>
    </Card>
  )
}

function DashboardPage() {
  const bookings = useBookings()
  const facilities = useFacilities()
  const [status, setStatus] = useState('All Status')
  const [facility, setFacility] = useState('All Facility')
  const [range, setRange] = useState({ from: '', to: '' })
  const first = (readAdmin().full_name || 'Admin').split(' ')[0]

  const pending = bookings.filter((b) => b.status === 'Pending').length
  const todays = bookings.filter((b) => b.date === TODAY && b.status !== 'Cancelled')
  const schedule = bookings.filter((b) => b.date === TODAY && b.status === 'Confirmed').sort((a, b) => a.start.localeCompare(b.start))
  const count = (s) => facilities.filter((f) => f.status === s).length
  const rooms = [
    ['Available', 'Ready to book', count('Available'), 'bg-emerald-500'],
    ['Reserved', 'Currently booked', count('Occupied'), 'bg-sky-500'],
    ['Under maintenance', 'Not bookable', count('Under Maintenance'), 'bg-rose-500'],
  ]
  const totalRooms = Math.max(facilities.length, 1)

  const rows = bookings
    .filter((b) => (status === 'All Status' || b.status === status) && (facility === 'All Facility' || b.room === facility) && inRange(b.date, range))
    .sort((a, b) => (a.status === 'Pending' ? -1 : 0) - (b.status === 'Pending' ? -1 : 0))
    .slice(0, 5)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gc-600">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Welcome back, {first}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {pending ? <><b className="font-semibold text-slate-700">{pending} request{pending > 1 ? 's' : ''}</b> waiting for your decision.</> : "You're all caught up."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/admin/bookings" aria-label="Pending requests" className="relative grid size-10 place-items-center rounded-full bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:text-gc-700">
            <Bell size={16} />
            {pending > 0 && <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-rose-500 ring-2 ring-white" />}
          </Link>
          <Link to="/admin/facilities?add=1" className={btnCls('soft', '!rounded-full !px-4')}><Plus size={14} /> Add room</Link>
          <Link to="/admin/bookings/new" className={btnCls('accent', '!rounded-full !px-4')}><Plus size={14} /> New booking</Link>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Function halls & laboratories" value={facilities.length} icon={Building2} tint="bg-emerald-100 text-emerald-700" />
        <StatCard label="Active rooms" value={count('Available')} icon={DoorOpen} tint="bg-sky-100 text-sky-700" />
        <StatCard label="Today's bookings" value={todays.length} icon={CalendarDays} tint="bg-amber-100 text-amber-700" />
        <StatCard label="Utilization this week" value={68} suffix="%" icon={TrendingUp} tint="bg-violet-100 text-violet-700" hint="mock" />
      </section>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Pending approval requests</h2>
            <p className="text-[11px] text-slate-500">Approve or reject before the requested time slot begins</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <DateRange value={range} onChange={setRange} />
            <Select label="Status" value={status} onChange={setStatus} options={['All Status', ...BOOKING_STATUSES]} />
            <Select label="Facility" value={facility} onChange={setFacility} options={['All Facility', ...new Set(bookings.map((b) => b.room))]} />
            <Link to="/admin/bookings" className="flex items-center gap-1 rounded-full px-3.5 py-2 text-[11px] font-semibold text-gc-700 ring-1 ring-inset ring-gc-600/30 transition hover:bg-gc-50">
              View full booking <ChevronRight size={13} />
            </Link>
          </div>
        </div>
        <BookingsTable rows={rows} emptyText="No requests match these filters." />
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 px-7 pb-3 pt-5">
            <h2 className="text-sm font-semibold text-slate-900">Room status</h2>
            <p className="text-[11px] text-slate-500">Live across all buildings</p>
          </div>
          <div className="px-7 pt-5">
            <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
              {rooms.map(([name, , n, dot]) => <span key={name} className={`${dot} anim-grow-x origin-left`} style={{ width: `${(n / totalRooms) * 100}%` }} />)}
            </div>
          </div>
          <ul className="px-7 pb-3 pt-1">
            {rooms.map(([name, sub, n, dot], i) => (
              <li key={name} className={`flex items-center justify-between py-3.5 ${i < rooms.length - 1 ? 'border-b border-slate-100' : ''}`}>
                <div>
                  <p className="text-[13px] font-semibold text-slate-900">{name}</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">{sub}</p>
                </div>
                <span className="flex items-center gap-2 text-xs font-semibold tabular-nums text-slate-900"><span className={`size-2 rounded-full ${dot}`} />{n}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 px-7 pb-3 pt-5">
            <h2 className="text-sm font-semibold text-slate-900">Today's schedule</h2>
            <p className="text-[11px] text-slate-500">Approved bookings</p>
          </div>
          {schedule.length ? (
            <ul className="px-7 pb-3 pt-1">
              {schedule.map((b, i) => (
                <li key={b.id} className={`flex items-center gap-4 py-3.5 ${i < schedule.length - 1 ? 'border-b border-slate-100' : ''}`}>
                  <span className="w-28 shrink-0 text-[10px] font-medium text-slate-500">{fmtTime(b.start)} - {fmtTime(b.end)}</span>
                  <span className="h-9 w-0.5 shrink-0 rounded bg-gradient-to-b from-gc-500 to-gc-900" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-900">{b.purpose}</p>
                    <p className="mt-0.5 truncate text-[10px] text-slate-500">{b.room}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : <EmptyState icon={CalendarDays}>Nothing scheduled for today.</EmptyState>}
        </Card>
      </section>
    </div>
  )
}

/* ---- Bookings list ---- */
function BookingsPage() {
  const bookings = useBookings()
  const facilities = useFacilities()
  const [q, setQ] = useState('')
  const [range, setRange] = useState({ from: '', to: '' })
  const [status, setStatus] = useState('All Status')
  const [facility, setFacility] = useState('All Facility')
  const needle = q.trim().toLowerCase()
  const rows = bookings.filter(
    (b) => (status === 'All Status' || b.status === status) && (facility === 'All Facility' || b.room === facility) && inRange(b.date, range) &&
      (!needle || [b.who, b.dept, b.room, b.purpose].some((v) => v.toLowerCase().includes(needle))),
  )
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader icon={CalendarCheck} title="Bookings" subtitle={`${rows.length} of ${bookings.length} requests`}>
        <Link to="/admin/bookings/new" className={btnCls('primary')}><Plus size={14} /> New booking</Link>
      </PageHeader>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-5">
          <div className="relative min-w-64 flex-1">
            <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search bookings, rooms, or facilities"
              className="w-full rounded-full bg-white py-3 pl-12 pr-5 text-xs shadow-sm ring-1 ring-inset ring-slate-200 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-gc-600/40" />
          </div>
          <DateRange value={range} onChange={setRange} />
          <Select label="Status" value={status} onChange={setStatus} options={['All Status', ...BOOKING_STATUSES]} />
          <Select label="Facility" value={facility} onChange={setFacility} options={['All Facility', ...facilities.map((f) => f.name)]} />
        </div>
        <BookingsTable rows={rows} />
      </Card>
    </div>
  )
}

/* ---- Booking details ---- */
function BookingDetailsPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const bookings = useBookings()
  const { accept, reject, modals } = useBookingActions()
  const b = bookings.find((x) => x.id === Number(id))
  if (!b) return <Navigate to="/admin/bookings" replace />
  const ro = `${inputCls} cursor-default bg-slate-50/60`
  const view = (v) => <input readOnly value={v} className={ro} />
  const area = (v) => <textarea readOnly rows={3} value={v} className={ro} />
  const h = (t) => <p className="col-span-2 mt-3 text-sm font-semibold text-gc-950">{t}</p>
  return (
    <Card className="mx-auto max-w-3xl p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gc-600">Submitted request</p>
          <h1 className="mt-1 text-xl font-semibold text-gc-950">{b.purpose}</h1>
        </div>
        <Badge tone={BOOKING_TONE[b.status]}>{b.status}</Badge>
      </div>
      <hr className="mt-5 border-slate-100" />
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Facility name">{view(b.room)}</Field>
        <Field label="Date & time">{view(detailWhen(b))}</Field>
        {h('Event information')}
        <Field label="Title">{view(b.purpose)}</Field>
        <Field label="Department">{view(b.dept)}</Field>
        <Field label="Requested by">{view(b.who)}</Field>
        <Field label="Speaker(s)">{view(b.speaker || '-')}</Field>
        <Field label="Description" className="sm:col-span-2">{area(b.description)}</Field>
        {h('Add-on services')}
        <Field label="Equipment">{view(b.equipment || '-')}</Field>
        <Field label="Expected guests">{view(String(b.guests))}</Field>
        <Field label="Remarks" className="sm:col-span-2">{area(b.remarks || 'None')}</Field>
      </div>
      <hr className="mt-7 border-slate-100" />
      <div className="mt-5 flex flex-wrap gap-3">
        {b.status === 'Pending' && (
          <>
            <Button variant="danger" className="w-36" onClick={() => reject(b)}>Reject</Button>
            <Button className="w-44" onClick={() => accept(b)}>Accept</Button>
          </>
        )}
        <Button variant="soft" className="ml-auto" onClick={() => nav(-1)}><ArrowLeft size={13} /> Back</Button>
      </div>
      {modals}
    </Card>
  )
}

/* ---- New booking ---- */
const BLANK_BOOKING = { room: '', date: '', start: '', end: '', who: '', dept: '', purpose: '', speaker: '', description: '', equipment: '', guests: '', remarks: '' }

function NewBookingPage() {
  const nav = useNavigate()
  const toast = useToast()
  const facilities = useFacilities()
  const [f, setF] = useState(BLANK_BOOKING)
  const [error, setError] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const h = (t) => <p className="col-span-2 mt-3 text-sm font-semibold text-gc-950">{t}</p>

  const save = () => {
    const missing = ['room', 'date', 'start', 'end', 'who', 'purpose'].find((k) => !f[k].trim())
    if (missing) return setError('Please fill in facility, date, time, requester and title.')
    if (f.end <= f.start) return setError('End time must be later than the start time.')
    const fac = facilities.find((x) => x.name === f.room)
    if (fac?.status === 'Under Maintenance') return setError(`${f.room} is under maintenance.`)
    if (fac && Number(f.guests) > fac.capacity) return setError(`${f.room} only fits ${fac.capacity} people.`)
    const draft = { ...f, guests: Number(f.guests) || 0, who: f.who.trim(), purpose: f.purpose.trim() }
    const clash = findConflict(draft)
    if (clash) return setError(`Conflict: ${f.room} is already confirmed for ${clash.who} (${whenLabel(clash)}).`)
    addBooking({ ...draft, dept: f.dept.trim() || '-', speaker: f.speaker.trim() || '-', equipment: f.equipment.trim() || 'None', remarks: f.remarks.trim() || 'None' })
    toast('Booking created')
    nav('/admin/bookings')
  }

  return (
    <Card className="mx-auto max-w-3xl p-6 sm:p-8">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gc-600">New booking</p>
      <h1 className="mt-1 text-xl font-semibold text-gc-950">Create a reservation</h1>
      <p className="text-xs text-slate-500">Bookings created by an admin are confirmed right away.</p>
      <hr className="mt-5 border-slate-100" />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Facility name">
          <select value={f.room} onChange={set('room')} className={inputCls}>
            <option value="">Select a facility</option>
            {facilities.map((x) => (
              <option key={x.id} value={x.name} disabled={x.status === 'Under Maintenance'}>{x.name}{x.status === 'Under Maintenance' ? ' (under maintenance)' : ''}</option>
            ))}
          </select>
        </Field>
        <Field label="Date"><input type="date" value={f.date} onChange={set('date')} className={inputCls} /></Field>
        <Field label="Start time"><input type="time" value={f.start} onChange={set('start')} className={inputCls} /></Field>
        <Field label="End time"><input type="time" value={f.end} onChange={set('end')} className={inputCls} /></Field>
        {h('Event information')}
        <Field label="Title"><input value={f.purpose} onChange={set('purpose')} placeholder="e.g. Officer meeting" className={inputCls} /></Field>
        <Field label="Requested by"><input value={f.who} onChange={set('who')} placeholder="Full name" className={inputCls} /></Field>
        <Field label="Department"><input value={f.dept} onChange={set('dept')} placeholder="e.g. Student Council" className={inputCls} /></Field>
        <Field label="Speaker(s)"><input value={f.speaker} onChange={set('speaker')} className={inputCls} /></Field>
        <Field label="Description" className="sm:col-span-2"><textarea rows={3} value={f.description} onChange={set('description')} className={inputCls} /></Field>
        {h('Add-on services')}
        <Field label="Equipment"><input value={f.equipment} onChange={set('equipment')} placeholder="e.g. Projector" className={inputCls} /></Field>
        <Field label="Expected guests"><input type="number" min="0" value={f.guests} onChange={set('guests')} className={inputCls} /></Field>
        <Field label="Remarks" className="sm:col-span-2"><textarea rows={3} value={f.remarks} onChange={set('remarks')} className={inputCls} /></Field>
      </div>

      {error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-600">{error}</p>}
      <hr className="mt-6 border-slate-100" />
      <div className="mt-5 flex justify-end gap-3">
        <Button variant="soft" onClick={() => nav(-1)}>Cancel</Button>
        <Button className="px-8" onClick={save}>Create booking</Button>
      </div>
    </Card>
  )
}

/* ---- Facilities list + add form ---- */
const EMPTY_FACILITY = { name: '', code: '', location: '', type: 'Laboratory', capacity: 40, rate: 0 }

function AddFacilityForm({ onClose }) {
  const toast = useToast()
  const facilities = useFacilities()
  const [f, setF] = useState(EMPTY_FACILITY)
  const [amenities, setAmenities] = useState([])
  const [error, setError] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const submit = () => {
    if (!f.name.trim() || !f.code.trim()) return setError('Facility name and room code are required.')
    if (facilities.some((x) => x.code.toLowerCase() === f.code.trim().toLowerCase())) return setError(`Room code ${f.code.trim()} already exists.`)
    addFacility({ name: f.name.trim(), code: f.code.trim(), location: f.location.trim() || '-', type: f.type, amenities, capacity: Number(f.capacity) || 0, rate: Number(f.rate) || 0 })
    toast(`${f.name.trim()} added`)
    onClose()
  }
  return (
    <Card className="anim-fade-up relative p-6">
      <button onClick={onClose} className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close"><X size={16} /></button>
      <h2 className="text-base font-semibold text-slate-900">Add facility</h2>
      <p className="text-xs text-slate-500">New spaces appear immediately in search results.</p>
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Facility name"><input value={f.name} onChange={set('name')} placeholder="e.g. Computer Lab" className={inputCls} /></Field>
        <Field label="Room code"><input value={f.code} onChange={set('code')} placeholder="e.g. CL-123" className={inputCls} /></Field>
        <Field label="Location"><input value={f.location} onChange={set('location')} placeholder="e.g. 5th Floor - Main Building" className={inputCls} /></Field>
        <Field label="Type">
          <select value={f.type} onChange={set('type')} className={inputCls}>{FACILITY_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
        </Field>
        <Field label="Max capacity"><input type="number" min="0" value={f.capacity} onChange={set('capacity')} className={inputCls} /></Field>
        <Field label="Hourly rate (₱, 0 = free)"><input type="number" min="0" value={f.rate} onChange={set('rate')} className={inputCls} /></Field>
        <Field label="Included amenities" className="sm:col-span-2 lg:col-span-3"><AmenitiesEditor value={amenities} onChange={setAmenities} /></Field>
      </div>
      {error && <p role="alert" className="mt-4 text-xs font-medium text-rose-600">{error}</p>}
      <div className="mt-5 flex justify-end"><Button onClick={submit}><Plus size={14} /> Add facility</Button></div>
    </Card>
  )
}

function FacilitiesPage() {
  const nav = useNavigate()
  const toast = useToast()
  const facilities = useFacilities()
  const [params, setParams] = useSearchParams()
  const adding = params.get('add') === '1'
  const [removing, setRemoving] = useState(null)
  const formRef = useRef(null)
  const setAdding = (on) => setParams(on ? { add: '1' } : {}, { replace: true })
  useEffect(() => { if (adding) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, [adding])

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader icon={Building2} title="Facility management" subtitle="Add, edit or take a space offline for maintenance.">
        {!adding && <Button onClick={() => setAdding(true)}><Plus size={14} /> Add facility</Button>}
      </PageHeader>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-[12px]">
            <thead className="border-b border-slate-200/70 bg-slate-50/80">
              <tr>
                {['Name', 'Room code', 'Location', 'Type', 'Capacity'].map((h) => <th key={h} className={TH}>{h}</th>)}
                <th className={TH}>Status</th>
                <th className={`${TH} text-center`}>Action</th>
              </tr>
            </thead>
            <tbody>
              {facilities.map((f) => (
                <tr key={f.id} className="border-b border-slate-100 transition last:border-0 hover:bg-gc-50/60">
                  <td className="px-6 py-3.5 font-semibold text-slate-900">{f.name}</td>
                  <td className="px-6 py-3.5 font-mono text-[11px] text-slate-600">{f.code}</td>
                  <td className="px-6 py-3.5 text-slate-600">{f.location}</td>
                  <td className="px-6 py-3.5 text-slate-600">{f.type}</td>
                  <td className="px-6 py-3.5 tabular-nums text-slate-600">{f.capacity} pax</td>
                  <td className="px-6 py-3.5"><Badge tone={FACILITY_TONE[f.status]}>{f.status}</Badge></td>
                  <td className="px-6 py-3.5 text-center">
                    <ActionMenu items={[
                      { label: 'View Details', icon: Eye, onClick: () => nav(`/admin/facilities/${f.id}`) },
                      { label: 'Remove', icon: Trash2, danger: true, onClick: () => setRemoving(f) },
                    ]} />
                  </td>
                </tr>
              ))}
              {!facilities.length && <tr><td colSpan={7}><EmptyState icon={Building2}>No facilities yet. Add your first one.</EmptyState></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <div ref={formRef}>{adding && <AddFacilityForm onClose={() => setAdding(false)} />}</div>

      {removing && (
        <ConfirmModal icon={Trash2} tone="red" title={`Remove ${removing.name}?`} confirmLabel="Yes, remove" onCancel={() => setRemoving(null)}
          message="This space will no longer be bookable. Existing bookings keep their record."
          onConfirm={() => { removeFacility(removing.id); toast(`${removing.name} removed`, 'info'); setRemoving(null) }} />
      )}
    </div>
  )
}

/* ---- Facility details / edit ---- */
const STATUS_ACTIVE = {
  Available: 'border-emerald-500 bg-emerald-50 text-emerald-800',
  'Under Maintenance': 'border-amber-500 bg-amber-50 text-amber-800',
  Occupied: 'border-rose-500 bg-rose-50 text-rose-800',
}

function FacilityDetailsPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const facilities = useFacilities()
  const original = facilities.find((x) => x.id === Number(id))
  const [f, setF] = useState(() => (original ? { ...original } : null))
  const [confirm, setConfirm] = useState(false)
  if (!f) return <Navigate to="/admin/facilities" replace />
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const save = () => {
    updateFacility(id, { ...f, capacity: Number(f.capacity) || 0, rate: Number(f.rate) || 0 })
    toast('Changes saved')
    nav('/admin/facilities')
  }
  return (
    <Card className="mx-auto max-w-3xl p-6 sm:p-8">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gc-600">Edit facility</p>
      <h1 className="mt-1 text-xl font-semibold text-slate-900">{original?.name}</h1>
      <hr className="mt-5 border-slate-100" />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Facility name"><input value={f.name} onChange={set('name')} placeholder="e.g. Conference Room A" className={inputCls} /></Field>
        <Field label="Location"><input value={f.location} onChange={set('location')} placeholder="e.g. 3rd Floor - Main Building" className={inputCls} /></Field>
        <Field label="Room code"><input value={f.code} onChange={set('code')} placeholder="e.g. CR-123" className={inputCls} /></Field>
        <Field label="Max capacity"><input type="number" min="0" value={f.capacity} onChange={set('capacity')} className={inputCls} /></Field>
        <Field label="Type of facility">
          <select value={f.type} onChange={set('type')} className={inputCls}>{FACILITY_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
        </Field>
        <Field label="Hourly rate (₱, 0 = free)"><input type="number" min="0" value={f.rate} onChange={set('rate')} className={inputCls} /></Field>
        <Field label="Included amenities" className="sm:col-span-2"><AmenitiesEditor showList value={f.amenities} onChange={(amenities) => setF({ ...f, amenities })} /></Field>
        <Field label="Facility overview" className="sm:col-span-2"><textarea rows={4} value={f.overview} onChange={set('overview')} className={inputCls} /></Field>
        <Field label="Status" className="sm:col-span-2">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {FACILITY_STATUSES.map((s) => (
              <button key={s} type="button" onClick={() => setF({ ...f, status: s })} aria-pressed={f.status === s}
                className={`rounded-xl border py-3.5 text-xs font-semibold transition ${f.status === s ? STATUS_ACTIVE[s] : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                {s}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <hr className="mt-7 border-slate-100" />
      <div className="mt-5 flex flex-wrap justify-between gap-3">
        <Button variant="danger" onClick={() => setConfirm(true)}><Trash2 size={13} /> Remove facility</Button>
        <div className="flex gap-3">
          <Button variant="soft" onClick={() => nav('/admin/facilities')}>Back</Button>
          <Button className="px-7" onClick={save}>Save changes</Button>
        </div>
      </div>

      {confirm && (
        <ConfirmModal icon={Trash2} tone="red" title={`Remove ${f.name}?`} confirmLabel="Yes, remove" onCancel={() => setConfirm(false)}
          message="This space will no longer be bookable. Existing bookings keep their record."
          onConfirm={() => { removeFacility(id); toast(`${f.name} removed`, 'info'); nav('/admin/facilities') }} />
      )}
    </Card>
  )
}

/* ---- Reports ---- */
function ReportsPage() {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const max = Math.max(...REPORT.week.map(([, v]) => v))
  const total = REPORT.week.reduce((s, [, v]) => s + v, 0)
  const download = async () => {
    setBusy(true)
    try { await downloadReportPdf(REPORT) } catch { toast('Could not generate the PDF', 'error') } finally { setBusy(false) }
  }
  return (
    <div className="report-page mx-auto max-w-5xl space-y-5">
      {/* Letterhead: only visible when printing (A4) */}
      <div className="print-only items-center justify-between border-b-2 border-gc-900 pb-3">
        <div className="flex items-center gap-3">
          <img src={logoSidebar} alt="" className="size-14 rounded-full" />
          <div className="leading-tight">
            <p className="text-lg font-extrabold text-gc-900">GORDON COLLEGE</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#c9a227]">Room Booking</p>
            <p className="text-[10px] text-slate-500">Olongapo City, Philippines</p>
          </div>
        </div>
        <div className="text-right leading-tight">
          <p className="text-base font-extrabold text-gc-900">{REPORT.title}</p>
          <p className="text-[10px] text-slate-500">Period: {REPORT.range}</p>
          <p className="text-[10px] text-slate-500">Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
        </div>
      </div>

      <PageHeader icon={BarChart3} title="Report" subtitle="Booking volume, top spaces and utilization across the building.">
        <Button variant="soft" onClick={() => window.print()}><Printer size={14} /> Print</Button>
        <Button onClick={download} disabled={busy}><Download size={14} /> {busy ? 'Preparing…' : 'Download PDF'}</Button>
      </PageHeader>

      <Card className="space-y-5 p-5 sm:p-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-4 py-2 text-[11px] font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
          <Calendar size={13} className="text-gc-600" /> {REPORT.range}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-gc-900">Bookings this week</h2>
              <span className="text-[11px] text-slate-500"><b className="text-sm font-semibold tabular-nums text-slate-900">{total}</b> total</span>
            </div>
            <div className="mt-5 flex h-48 items-end gap-3">
              {REPORT.week.map(([d, v], i) => (
                <div key={d} className="group flex h-full flex-1 flex-col items-center justify-end" title={`${d}: ${v} bookings`}>
                  <span className="mb-1 text-[10px] font-semibold tabular-nums text-slate-700 opacity-0 transition group-hover:opacity-100">{v}</span>
                  <div className={`anim-grow-y w-full origin-bottom rounded-t-lg transition group-hover:brightness-110 ${i >= 5 ? 'bg-gradient-to-t from-gold-400 to-amber-300' : 'bg-gradient-to-t from-gc-900 to-gc-600'}`}
                    style={{ height: `${(v / max) * 100}%`, animationDelay: `${i * 60}ms` }} />
                  <span className="mt-2 text-[9px] font-semibold tracking-wide text-slate-500">{d}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-gc-900">Utilization by facility type</h2>
            <div className="mt-6 space-y-6">
              {REPORT.utilization.map(([l, p], i) => (
                <div key={l} className="flex items-center gap-3 text-[11px]">
                  <span className="w-24 shrink-0 text-slate-600">{l}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="anim-grow-x h-full origin-left rounded-full bg-gradient-to-r from-gc-600 to-gc-900" style={{ width: `${p}%`, animationDelay: `${i * 120}ms` }} />
                  </div>
                  <span className="w-9 text-right font-semibold tabular-nums text-slate-700">{p}%</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <h2 className="px-5 pt-5 text-[11px] font-bold uppercase tracking-wider text-gc-900">Most requested facilities</h2>
          <div className="overflow-x-auto">
            <table className="mt-3 w-full min-w-[520px] text-left text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  {['Facility', 'Requested this month', 'Approval rate %', 'Avg. duration'].map((h, i) => (
                    <th key={h} className={`px-5 py-2.5 font-semibold ${i ? 'text-center' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {REPORT.top.map(([name, req, rate, dur]) => (
                  <tr key={name} className="border-t border-slate-100 odd:bg-gc-50/50">
                    <td className="px-5 py-3.5 font-medium text-slate-900">{name}</td>
                    <td className="px-5 py-3.5 text-center tabular-nums">{req}</td>
                    <td className="px-5 py-3.5">
                      <div className="mx-auto flex w-32 items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gc-600" style={{ width: rate }} /></div>
                        <span className="w-9 text-right tabular-nums text-slate-700">{rate}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-center tabular-nums">{dur}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Card>
    </div>
  )
}

/* ───────────────────────── 7. ROUTER (default export) ───────────────────────── */
// Mounted by App.jsx at /admin/*  →  paths below are relative to /admin
export default function AdminDashboard() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="bookings/new" element={<NewBookingPage />} />
          <Route path="bookings/:id" element={<BookingDetailsPage />} />
          <Route path="facilities" element={<FacilitiesPage />} />
          <Route path="facilities/:id" element={<FacilityDetailsPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </ToastProvider>
  )
}
