import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Link, NavLink, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { getSupabaseClient } from '../lib/supabase'
import {
  ArrowLeft, ArrowRight, Building2, CalendarCheck, CalendarClock, CalendarPlus, Check, CheckCircle2, ChevronDown, ChevronRight,
  ClipboardList, Clock, DoorOpen, Download, Eye, EyeOff, FlaskConical, Hourglass, Inbox, Info, LayoutDashboard,
  LayoutGrid, Lock, LogOut, Mail, MapPin, Menu, Mic, MousePointerClick, Plug, Plus, Presentation, Projector, QrCode, Search,
  ShieldCheck, Sparkles, Speaker, Tv, Users, Video, Wifi, Wrench, X, XCircle, Zap,
} from 'lucide-react'
import api from '../api'
import ConfirmModal from '../components/ConfirmModal'
import { Req, RequiredNote } from '../components/Req'
import { ToastProvider } from '../components/Toast'
import { useToast } from '../components/toastContext'
import { displayName, firstNameOf } from '../lib/name'
import RegisterPage from './RegisterPage'
import { GHOST, INPUT, LABEL, PRIMARY } from './ui'
import logoSidebar from '../assets/logo-sidebar.png'
import './booker.css'

/* ───────────── 1. landing content ───────────── */
const NAV = [
  { label: 'Facilities', href: '#facilities' },
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how' },
  { label: 'FAQ', href: '#faq' },
]
const STATS = [
  { value: 34, suffix: '', label: 'Rooms listed' },
  { value: 1, suffix: '', label: 'Booking window' },
  { value: 1, suffix: ' hr', label: 'Typical response' },
]
const FACILITIES = [
  { name: 'Gordon College Auditorium', capacity: 500, tags: ['Stage', 'Projector', 'Sound'], status: 'Available' },
  { name: 'Gordon College AV Hall', capacity: 120, tags: ['Projector', 'Air-con'], status: 'Available' },
  { name: 'Gordon College Gym Hall', capacity: 300, tags: ['Open floor', 'Bleachers'], status: 'Pending' },
]
const FEATURES = [
  { title: 'Live availability', body: 'See which rooms are open for your date and time before you ask.' },
  { title: 'One request form', body: 'Pick a room, add your purpose and headcount. No paper sign-up sheet.' },
  { title: 'Clash protection', body: 'Overlapping bookings are flagged so two groups never get the same room.' },
  { title: 'Status you can track', body: 'Pending, approved or rejected. You always know where your request stands.' },
  { title: 'Equipment included', body: 'Request projectors, chairs and sound with the room, in the same booking.' },
  { title: 'Admin review', body: 'Facility staff approve, reschedule or decline from one dashboard.' },
]
const STEPS = [
  { title: 'Find a room', body: 'Browse the directory and filter by capacity or equipment.' },
  { title: 'Request a slot', body: 'Choose a date and time, then tell us what the room is for.' },
  { title: 'Get your answer', body: 'Staff review your request and you see the decision in the app.' },
]
const FAQ = [
  { q: 'How far ahead can I book?', a: 'Pick any open slot inside the booking window. Rooms outside it show as unavailable.' },
  { q: 'What happens after I submit a request?', a: 'It goes to facility staff as Pending. Most requests are answered within about an hour.' },
  { q: 'Can I cancel or change a booking?', a: 'Yes. Open the booking from your list and cancel or request a new time while it is still pending or approved.' },
  { q: 'Who approves bookings for my organization?', a: 'The facility office reviews every request. Organization-specific rules appear on the request form.' },
]
const FOOTER = [
  { head: 'Booking', links: ['Find a room', 'Book a room', 'My bookings'] },
  { head: 'Campus', links: ['Facilities', 'Student organizations', 'Events'] },
  { head: 'Support', links: ['FAQ', 'Contact the office', 'Facility rules'] },
]
const POINTS = [
  { Icon: CalendarCheck, t: 'Real campus rooms', d: 'Every space listed is one you can actually request.' },
  { Icon: ShieldCheck, t: 'Fair scheduling', d: 'Clashes are caught before staff ever see the request.' },
  { Icon: Clock, t: 'Quick decisions', d: 'Requests land in one queue and are answered fast.' },
]

/* ───────────── 2. building blocks ───────────── */
function useInView(threshold = 0.2) {
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect() } }, { threshold })
    io.observe(el)
    return () => io.disconnect()
  }, [seen, threshold])
  return [ref, seen]
}

function Reveal({ children, delay = 0, className = '' }) {
  const [ref, seen] = useInView(0.15)
  return <div ref={ref} style={{ transitionDelay: `${delay}ms` }} data-seen={seen} className={`reveal ${className}`}>{children}</div>
}

function SectionHeading({ title, lead, center = false }) {
  return (
    <div className={`max-w-2xl ${center ? 'mx-auto text-center' : ''}`}>
      <h2 className="text-3xl font-semibold tracking-tight text-gc-950 sm:text-4xl">{title}</h2>
      {lead && <p className="mt-3 text-base leading-relaxed text-slate-600">{lead}</p>}
    </div>
  )
}

const BTN = {
  solid: 'bg-gc-600 text-white hover:bg-gc-700 shadow-lg shadow-gc-950/20',
  outline: 'border border-gc-600/40 text-gc-800 hover:bg-gc-50',
}
// `to` = in-app (SPA) navigation, `href` = #anchors / external
function LinkButton({ variant = 'solid', className = '', to, ...rest }) {
  const Tag = to ? Link : 'a'
  return (
    <Tag {...(to ? { to } : {})} {...rest}
      className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gc-500 ${BTN[variant]} ${className}`} />
  )
}

function StatCounter({ value, suffix = '', label }) {
  const [ref, seen] = useInView(0.6)
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!seen) return
    const dur = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1200
    const t0 = performance.now()
    let raf = 0
    const tick = (t) => {
      const p = dur ? Math.min((t - t0) / dur, 1) : 1
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [seen, value])
  return (
    <div ref={ref}>
      <div className="text-4xl font-semibold tabular-nums text-gc-950">{n}{suffix}</div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </div>
  )
}

function Accordion({ items }) {
  const [open, setOpen] = useState(0)
  return (
    <div className="divide-y divide-gc-100 rounded-2xl border border-gc-100 bg-white">
      {items.map((it, i) => {
        const on = open === i
        return (
          <div key={it.q}>
            <button aria-expanded={on} onClick={() => setOpen(on ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-medium text-gc-950 hover:bg-gc-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gc-500">
              {it.q}
              <ChevronDown className={`h-5 w-5 shrink-0 text-gc-600 transition-transform duration-300 ${on ? 'rotate-180' : ''}`} />
            </button>
            <div className={`grid transition-[grid-template-rows] duration-300 ${on ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
              <p className="overflow-hidden px-5 text-slate-600"><span className="block pb-5">{it.a}</span></p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ───────────── 3. landing sections ───────────── */
function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition duration-300 ${scrolled || open ? 'bg-white/85 shadow-sm backdrop-blur-lg' : 'bg-transparent'}`}>
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link to="/" className="flex items-center gap-2.5 font-semibold text-gc-950">
          <img src={logoSidebar} alt="" className="h-9 w-9" />
          <span className="text-sm leading-tight">Gordon College<br /><span className="font-normal text-slate-500">Facility Booking</span></span>
        </Link>
        <ul className="hidden items-center gap-8 text-sm text-slate-700 md:flex">
          {NAV.map((n) => <li key={n.href}><a href={n.href} className="transition hover:text-gc-600">{n.label}</a></li>)}
        </ul>
        <div className="hidden items-center gap-3 md:flex">
          <Link to="/register" className="text-sm font-semibold text-gc-800 transition hover:text-gc-600">Register</Link>
          <LinkButton to="/login" className="!py-2">Log in</LinkButton>
        </div>
        <button className="md:hidden" aria-label="Toggle menu" onClick={() => setOpen((o) => !o)}>{open ? <X /> : <Menu />}</button>
      </nav>
      {open && (
        <div className="space-y-1 border-t border-gc-100 bg-white px-5 pb-5 pt-2 md:hidden">
          {NAV.map((n) => <a key={n.href} href={n.href} onClick={() => setOpen(false)} className="block py-2.5 text-slate-700">{n.label}</a>)}
          <Link to="/register" onClick={() => setOpen(false)} className="block py-2.5 font-semibold text-gc-800">Register</Link>
          <LinkButton to="/login" className="mt-2 w-full">Log in</LinkButton>
        </div>
      )}
    </header>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-gc-50 via-white to-white pb-16 pt-32 sm:pt-40">
      <div aria-hidden className="hero-orb absolute -right-32 -top-24 h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-gc-500 to-gc-900 opacity-25 blur-3xl" />
      <div className="relative mx-auto max-w-6xl px-5">
        <h1 className="hero-line max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-gc-950 sm:text-6xl" style={{ '--d': '0ms' }}>
          Book a campus room without the sign-up sheet.
        </h1>
        <p className="hero-line mt-5 max-w-xl text-lg leading-relaxed text-slate-600" style={{ '--d': '140ms' }}>
          Check what is free, request your slot and track the decision, all in one place built for Gordon College.
        </p>
        <div className="hero-line mt-8 flex flex-wrap gap-3" style={{ '--d': '280ms' }}>
          <LinkButton href="#facilities">Find a room</LinkButton>
          <LinkButton href="#how" variant="outline">See how booking works</LinkButton>
        </div>
        <div className="hero-line mt-14 grid max-w-xl grid-cols-3 gap-6 border-t border-gc-100 pt-8" style={{ '--d': '420ms' }}>
          {STATS.map((s) => <StatCounter key={s.label} {...s} />)}
        </div>
      </div>
    </section>
  )
}

function About() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 md:grid-cols-2">
      <Reveal><div className="aspect-[4/3] rounded-3xl bg-gradient-to-br from-gc-500 via-gc-700 to-gc-950 shadow-2xl shadow-gc-900/25" /></Reveal>
      <Reveal delay={120}>
        <SectionHeading title="Built for how Gordon College actually books rooms" />
        <ul className="mt-8 space-y-5">
          {POINTS.map(({ Icon, t, d }) => (
            <li key={t} className="flex gap-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gc-100 text-gc-700"><Icon className="h-5 w-5" /></span>
              <div><p className="font-medium text-gc-950">{t}</p><p className="text-sm text-slate-600">{d}</p></div>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  )
}

function FacilityCard({ name, capacity, tags, status }) {
  const ok = status === 'Available'
  return (
    <article className="group overflow-hidden rounded-2xl border border-gc-100 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-gc-900/10">
      <div className="h-40 overflow-hidden bg-gradient-to-br from-gc-500 to-gc-900">
        <div className="h-full w-full bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,.25),transparent_55%)] transition duration-500 group-hover:scale-110" />
      </div>
      <div className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-gc-950">{name}</h3>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ok ? 'bg-gc-100 text-gc-800' : 'bg-amber-100 text-amber-800'}`}>{status}</span>
        </div>
        <p className="flex items-center gap-1.5 text-sm text-slate-500"><Users className="h-4 w-4" />Up to {capacity} people</p>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => <span key={t} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{t}</span>)}
        </div>
      </div>
    </article>
  )
}

function Steps() {
  return (
    <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
      <SectionHeading title="Reserve a space in three steps" lead="From browsing to a confirmed room in minutes." />
      <ol className="relative mt-12 grid gap-8 md:grid-cols-3">
        <span aria-hidden className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-gc-500 to-gc-100 md:block" />
        {STEPS.map((s, i) => (
          <Reveal key={s.title} delay={i * 120}>
            <li className="relative list-none">
              <span className="relative z-10 grid h-12 w-12 place-items-center rounded-full bg-gc-600 text-lg font-semibold text-white ring-8 ring-white">{i + 1}</span>
              <h3 className="mt-4 text-lg font-semibold text-gc-950">{s.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{s.body}</p>
            </li>
          </Reveal>
        ))}
      </ol>
    </section>
  )
}

function Footer() {
  const nav = useNavigate()
  return (
    <footer className="bg-gc-950 text-gc-100">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-semibold text-white">Gordon College</p>
          <p className="mt-2 max-w-xs text-sm text-gc-100/70">Facility booking for classrooms, halls and shared campus spaces.</p>
        </div>
        {FOOTER.map((c) => (
          <div key={c.head}>
            <p className="font-medium text-white">{c.head}</p>
            <ul className="mt-3 space-y-2 text-sm text-gc-100/70">
              {c.links.map((l) => <li key={l}><a href="#" className="hover:text-white">{l}</a></li>)}
            </ul>
          </div>
        ))}
      </div>
      <p className="border-t border-white/10 py-5 text-center text-xs text-gc-100/60">© <span onDoubleClick={() => nav('/admin/login', { state: { showLogin: true } })} className="select-none">{new Date().getFullYear()}</span> Gordon College. All rights reserved.</p>
    </footer>
  )
}

function LandingPage() {
  return (
    <div className="bg-white text-slate-800">
      <Navbar />
      <main>
        <Hero />
        <About />
        <section id="facilities" className="scroll-mt-20 bg-gc-50 py-20">
          <div className="mx-auto max-w-6xl px-5">
            <SectionHeading title="Every bookable space, one directory" lead="Capacity, equipment and availability at a glance." />
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FACILITIES.map((f, i) => <Reveal key={f.name} delay={i * 100}><FacilityCard {...f} /></Reveal>)}
            </div>
          </div>
        </section>
        <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
          <SectionHeading title="Everything a booking needs, nothing it doesn't" />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 90}>
                <div className="h-full rounded-2xl border border-gc-100 bg-white p-6 transition duration-300 hover:border-gc-500/50">
                  <h3 className="font-semibold text-gc-950">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
        <Steps />
        <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-5 pb-24 pt-8">
          <SectionHeading title="Common questions" />
          <div className="mt-8"><Accordion items={FAQ} /></div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

/* ───────────── 4. student data + session ───────────── */
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
// Separate keys from the admin portal (gc_token / gc_admin) so the two logins never mix.
const TOKEN_KEY = 'gc_student_token'
const USER_KEY = 'gc_student'
const readStudent = () => { try { return JSON.parse(localStorage.getItem(USER_KEY) || '{}') } catch { return {} } }
const hasStudentToken = () => !!(localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY))
const clearStudent = () => { [TOKEN_KEY, USER_KEY].forEach((k) => { localStorage.removeItem(k); sessionStorage.removeItem(k) }) }
const authCfg = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY)}` } })

/* tiny reactive store so Dashboard, My Bookings and the booking flow always agree (mock mode) */
const createStore = (initial) => {
  let state = initial
  const subs = new Set()
  return { get: () => state, set(fn) { state = fn(state); subs.forEach((f) => f()) }, sub(f) { subs.add(f); return () => subs.delete(f) } }
}

const pad2 = (n) => String(n).padStart(2, '0')
const toISO = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
const todayISO = () => toISO(new Date())
const dayOffset = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return toISO(d) }
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
const clock12 = (t) => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${pad2(m)}` }
const meridiem = (t) => (toMin(t) >= 720 ? 'PM' : 'AM')
const fmtClock = (t) => `${clock12(t)} ${meridiem(t)}`
const slotLabel = (s, e) => (meridiem(s) === meridiem(e) ? `${clock12(s)} - ${clock12(e)} ${meridiem(e)}` : `${fmtClock(s)} - ${fmtClock(e)}`)
const fmtDay = (iso, year = true) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(year && { year: 'numeric' }) })
const fmtLong = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
const titleCase = (s = '') => s.replace(/\b\w/g, (c) => c.toUpperCase())
const fromIso = (iso) => { const d = new Date(iso); return { date: toISO(d), time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}` } }
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening' }

const normStatus = (s = '') => {
  const k = String(s).toLowerCase()
  if (k === 'approved' || k === 'confirmed') return 'Confirmed'
  if (k === 'cancelled' || k === 'rejected' || k === 'declined') return 'Cancelled'
  return titleCase(k) || 'Pending'
}
// one shape for every booking row: { id, facility, date, start, end, purpose, reference, status }
const apiBooking = (b) => ({
  id: b.id ?? b.reservation_id,
  facility: b.facility ?? b.rooms?.name ?? 'Unknown',
  date: fromIso(b.startTime ?? b.start_time).date,
  start: fromIso(b.startTime ?? b.start_time).time,
  end: fromIso(b.endTime ?? b.end_time).time,
  purpose: b.purpose ?? b.title ?? '—',
  reference: b.reference ?? b.reference_no ?? '—',
  status: normStatus(b.status),
})

/* ---- mock data (VITE_USE_MOCK=true). Real endpoints: /api/student/dashboard · /api/rooms · /api/student/bookings · /api/reservations ---- */
const mkB = (id, facility, off, start, end, purpose, reference, status) => ({ id, facility, date: dayOffset(off), start, end, purpose, reference, status })
const bookingStore = createStore([
  mkB(1, 'Function Hall', 3, '13:00', '15:00', 'Org Orientation', 'GC-2091', 'Pending'),
  mkB(2, 'Computer Lab 2', 6, '09:00', '11:00', 'Thesis Defense', 'GC-2074', 'Confirmed'),
  mkB(3, 'AVR Room', 8, '15:00', '17:00', 'CS Dept Meeting', 'GC-2056', 'Confirmed'),
  mkB(4, 'Conference Room A', -14, '13:00', '15:00', 'Officer Meeting', 'GC-1985', 'Completed'),
  mkB(5, 'Function Hall', -45, '08:00', '11:00', 'General Assembly', 'GC-1940', 'Cancelled'),
])
const useBookingStore = () => useSyncExternalStore(bookingStore.sub, bookingStore.get)

const OVERVIEW = 'A bright function hall facing the atrium, built for cross-team planning sessions and client-facing calls. Sound-dampened walls keep discussions private.'
const MOCK_ROOMS = [
  { id: 1, name: 'Gordon College Function Hall', building: 'Main Building', floor: '3rd floor', capacity: 100, types: ['Meeting room', 'Hall'], amenities: ['Projector', 'Sound System', 'TV', 'Wi-Fi'], status: 'Available', overview: OVERVIEW },
  { id: 2, name: 'Gordon College AVR Room 1', building: 'Main Building', floor: '4th floor', capacity: 50, types: ['Meeting room'], amenities: ['Projector', 'Whiteboard', 'TV'], status: 'Available' },
  { id: 3, name: 'Gordon College PE Hall', building: 'Main Building', floor: '5th floor', capacity: 100, types: ['Hall'], amenities: ['Sound System'], status: 'Occupied' },
  { id: 4, name: 'Gordon College Computer Lab 2', building: 'Tech Building', floor: '2nd floor', capacity: 40, types: ['Lab'], amenities: ['Projector', 'Whiteboard', 'Wi-Fi'], status: 'Available' },
  { id: 5, name: 'Gordon College Conference Room A', building: 'Main Building', floor: '3rd floor', capacity: 50, types: ['Meeting room'], amenities: ['Projector', 'VC equipment'], status: 'Under maintenance' },
  { id: 6, name: 'Gordon College Lecture Hall 102', building: 'Main Building', floor: '1st floor', capacity: 80, types: ['Hall'], amenities: ['Projector', 'Sound System', 'Whiteboard'], status: 'Available' },
]
// pretend this slot is already taken so the date/time filter has something to react to (mock only)
const MOCK_TAKEN = [{ roomId: 2, start: '09:00', end: '11:00' }]
const MOCK_ROOM_STATUS = { available: 18, reserved: 4, maintenance: 2 }
const SCHEDULE_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17]
// Today's room schedule for the dashboard table. Needs a backend endpoint (returns [] / null → table hidden).
const MOCK_SCHEDULE = [
  { room: 'Function Hall', building: 'Main Building', busy: [[9, 11, 'Org Orientation'], [13, 15, 'General Assembly']] },
  { room: 'Computer Lab 2', building: 'Tech Building', busy: [[9, 11, 'Thesis Defense'], [14, 16, 'Coding Workshop']] },
  { room: 'AVR Room 1', building: 'Main Building', busy: [[10, 12, 'Leadership Seminar']] },
  { room: 'Lecture Hall 102', building: 'Main Building', busy: [[8, 10, 'Class'], [15, 17, 'Faculty Meeting']] },
  { room: 'Conference Room A', building: 'Main Building', maintenance: true, busy: [] },
]

const BUILDINGS = ['All Buildings', 'Main Building', 'Tech Building', 'Annex Building']
const ROOM_TYPES = [{ label: 'Meeting room', Icon: Users }, { label: 'Lab', Icon: FlaskConical }, { label: 'Hall', Icon: Building2 }]
const AMENITIES = ['Projector', 'Sound System', 'TV', 'Whiteboard', 'VC equipment']
const AMENITY_ICON = { Projector, 'Sound System': Speaker, TV: Tv, Whiteboard: Presentation, 'VC equipment': Video, 'Wi-Fi': Wifi }
const DEPARTMENTS = ['College of Computer Studies', 'College of Education, Arts and Sciences', 'College of Hospitality and Tourism Management', 'College of Business and Accountancy', 'Supreme Student Government', 'Student Affairs Office']
const DEFAULT_RULES = [
  'Cancel at least 2 hours before your slot to avoid a no-show mark.',
  'Leave the room in the layout you found it, or as booked.',
  "Exceeding your booked time is subject to the next reservation's priority.",
]
const ADDON_ICON = { 'Presentation clicker': MousePointerClick, 'Extension cords': Plug, 'Extra microphones': Mic }
// Everything on this site is free, so add-ons are just names (no prices).
const ADDONS = [{ name: 'Presentation clicker' }, { name: 'Extension cords' }, { name: 'Extra microphones' }]

/* ---- shared look ---- */
const CARD = 'rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,40,15,.04),0_14px_34px_-18px_rgba(15,60,20,.22)]'

const PILL = {
  Pending: 'bg-amber-50 text-amber-700 ring-amber-200', Confirmed: 'bg-gc-100 text-gc-700 ring-gc-500/30',
  Completed: 'bg-slate-100 text-slate-600 ring-slate-200', Cancelled: 'bg-red-50 text-red-600 ring-red-200',
}
const PILL_DOT = { Pending: 'bg-amber-500', Confirmed: 'bg-gc-500', Completed: 'bg-slate-400', Cancelled: 'bg-red-500' }
const StatusPill = ({ status }) => (
  <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-medium ring-1 ring-inset ${PILL[status] || PILL.Completed}`}>
    <span className={`size-1.5 rounded-full ${PILL_DOT[status] || PILL_DOT.Completed}`} />{status}
  </span>
)
const TH = 'px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[.14em] text-slate-500'

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="modal-backdrop fixed inset-0 z-[60] grid place-items-center bg-gc-950/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} className="modal-pop w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h3 className="text-lg font-semibold text-gc-950">{title}</h3>
          <button aria-label="Close" onClick={onClose} className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"><X className="size-5" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

/* ───────────── 5. login ───────────── */
const GoogleG = () => (
  <svg viewBox="0 0 24 24" className="size-4"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" /><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" /></svg>
)
const MicrosoftLogo = () => (
  <svg viewBox="0 0 24 24" className="size-4"><path fill="#F25022" d="M2 2h9.5v9.5H2z" /><path fill="#7FBA00" d="M12.5 2H22v9.5h-9.5z" /><path fill="#00A4EF" d="M2 12.5h9.5V22H2z" /><path fill="#FFB900" d="M12.5 12.5H22V22h-9.5z" /></svg>
)

function LoginPage() {
  const nav = useNavigate()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  if (hasStudentToken()) return <Navigate to="/dashboard" replace />

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
        data = { token: 'mock-token', user: { full_name: name || 'Student', email } }
      } else {
        data = (await api.post('/api/student/login', { email, password, remember })).data
      }
      ;(remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, data.token)
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))
      toast(`Logged in. Welcome, ${firstNameOf(data.user) || 'student'}!`)
      nav('/dashboard')
    } catch (err) {
      const msg = (isAxiosError(err) && err.response?.data?.error) || err.message || 'Unable to sign in. Please try again.'
      setError(msg)
      toast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  const signInWithGoogle = async () => {
    setError('')
    if (USE_MOCK) {
      setError('Google sign-in requires VITE_USE_MOCK=false.')
      return
    }
    setGoogleLoading(true)
    try {
      const supabase = getSupabaseClient()
      sessionStorage.setItem('gc_student_oauth_remember', String(remember))
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (oauthError) throw oauthError
    } catch (err) {
      sessionStorage.removeItem('gc_student_oauth_remember')
      setError(err.message || 'Could not start Google sign-in. Please try again.')
      setGoogleLoading(false)
    }
  }

  const field = `${INPUT} !mt-1.5 !py-3 pl-10`
  return (
    <div className="grid min-h-dvh bg-white lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-gc-950 via-gc-800 to-gc-600 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 opacity-[.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="hero-orb pointer-events-none absolute -right-32 -top-32 size-96 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <img src={logoSidebar} alt="Gordon College seal" className="size-16 drop-shadow-lg" />
          <div>
            <p className="text-lg font-semibold tracking-wide">GORDON COLLEGE</p>
            <p className="text-xs font-medium tracking-wide text-gold-400">ROOM &amp; FACILITY BOOKING</p>
          </div>
        </div>
        <div className="relative max-w-sm">
          <h1 className="text-5xl font-semibold leading-[1.08] tracking-tight">Find a room, book it, done</h1>
          <p className="mt-5 text-sm leading-relaxed text-white/85">Check live availability across campus and get instant confirmation — no more chasing the facilities office.</p>
          <ul className="mt-8 space-y-3 text-sm text-white/90">
            {[[CalendarCheck, 'Live availability across every building'], [ShieldCheck, 'Clash-free scheduling'], [Zap, 'Request in minutes, track the decision']].map(([Icon, t]) => (
              <li key={t} className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-lg bg-white/12 ring-1 ring-white/20"><Icon className="size-4" /></span>{t}</li>
            ))}
          </ul>
        </div>
        <div className="relative border-t border-white/25 pt-6">
          <p className="text-3xl font-semibold">34</p>
          <p className="text-sm text-white/85">Bookable rooms</p>
        </div>
      </aside>

      <main className="grid place-items-center px-6 py-12">
        <div className="w-full max-w-md anim-fade-up">
          <Link to="/" className="mb-8 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-gc-700"><ArrowLeft className="size-3.5" />Back to home</Link>
          <p className="text-[11px] font-semibold tracking-[.2em] text-gc-600">STUDENT ACCESS</p>
          <h2 className="mt-1 text-4xl font-semibold tracking-tight text-gc-900">Welcome Back</h2>
          <p className="mt-2 text-sm text-slate-600">Log in to view availability and book rooms and facilities.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <label className={LABEL}>Email address
              <span className="relative block">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 mt-0.5 size-4 -translate-y-1/2 text-slate-400" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gordoncollege.edu.ph" autoComplete="email" className={field} />
              </span>
            </label>
            <label className={LABEL}>Password
              <span className="relative block">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 mt-0.5 size-4 -translate-y-1/2 text-slate-400" />
                <input type={show ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" autoComplete="current-password" className={`${field} pr-11`} />
                <button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 mt-0.5 -translate-y-1/2 text-slate-400 transition hover:text-slate-600">
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </span>
            </label>
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 font-medium text-slate-700">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-4 accent-gc-700" /> Remember me
              </label>
              <button type="button" onClick={() => setError('Password reset is not available yet. Please contact the facilities office.')} className="font-semibold text-gc-800 hover:underline">Forget Password?</button>
            </div>
            {error && <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-xs text-red-600">{error}</p>}
            <button disabled={loading} className={`${PRIMARY} w-full !rounded-full !py-3.5 text-sm`}>{loading ? 'Signing in…' : 'Login'}</button>
          </form>

          <div className="my-6 flex items-center gap-3 text-[11px] text-slate-400"><span className="h-px flex-1 bg-slate-200" />or continue with<span className="h-px flex-1 bg-slate-200" /></div>
          <div className="grid grid-cols-2 gap-4">
            <button type="button" onClick={signInWithGoogle} disabled={googleLoading}
              className={`${GHOST} !py-2.5 disabled:opacity-60`}><GoogleG />{googleLoading ? 'Connecting…' : 'Google'}</button>
            <button type="button" onClick={() => setError('Microsoft sign-in is coming soon.')} className={`${GHOST} !py-2.5`}><MicrosoftLogo />Microsoft</button>
          </div>
          <p className="mt-6 text-center text-xs text-slate-600">No account yet? <Link to="/register" className="font-semibold text-gc-800 hover:underline">Register</Link></p>
          {USE_MOCK && <p className="mt-3 text-center text-[11px] text-slate-400">Dev mode: any email + 4 character password works.</p>}
        </div>
      </main>
    </div>
  )
}

function GoogleAuthCallback() {
  const nav = useNavigate()
  const toast = useToast()
  const started = useRef(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (started.current) return undefined
    started.current = true
    let active = true

    const completeSignIn = async () => {
      try {
        const supabase = getSupabaseClient()
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError
        if (!session?.access_token) throw new Error('Google sign-in did not complete. Please try again.')

        const { data } = await api.post('/api/student/google-login', {
          access_token: session.access_token,
        })
        if (!active) return

        const remember = sessionStorage.getItem('gc_student_oauth_remember') !== 'false'
        sessionStorage.removeItem('gc_student_oauth_remember')
        ;[localStorage, sessionStorage].forEach((storage) => storage.removeItem(TOKEN_KEY))
        ;(remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, data.token)
        localStorage.setItem(USER_KEY, JSON.stringify(data.user))
        const { error: signOutError } = await supabase.auth.signOut()
        if (signOutError) console.error('Could not clear temporary Google session:', signOutError.message)
        toast(`Logged in. Welcome, ${firstNameOf(data.user) || 'student'}!`)
        nav('/dashboard', { replace: true })
      } catch (authError) {
        if (!active) return
        sessionStorage.removeItem('gc_student_oauth_remember')
        const msg = (isAxiosError(authError) && authError.response?.data?.error) || authError.message || 'Google sign-in failed. Please try again.'
        setError(msg)
        toast(msg, 'error')
      }
    }

    completeSignIn()
    return () => { active = false }
  }, [nav, toast])

  return (
    <main className="grid min-h-dvh place-items-center bg-white px-6">
      <div className="w-full max-w-md text-center">
        {error ? (
          <>
            <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-600">{error}</p>
            <Link to="/login" className="mt-5 inline-block text-sm font-semibold text-gc-800 hover:underline">Return to sign in</Link>
          </>
        ) : (
          <>
            <div className="mx-auto size-8 animate-spin rounded-full border-4 border-gc-100 border-t-gc-600" role="status" aria-label="Signing in" />
            <p className="mt-4 text-sm text-slate-600">Completing Google sign-in…</p>
          </>
        )}
      </div>
    </main>
  )
}

/* ───────────── 6. portal shell (sidebar) ───────────── */
const SIDE_NAV = [
  { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/book', label: 'Book a Facility', Icon: CalendarPlus },
  { to: '/my-bookings', label: 'My Bookings', Icon: ClipboardList },
]

function PortalShell() {
  const nav = useNavigate()
  const toast = useToast()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [about, setAbout] = useState(false)
  const [confirmOut, setConfirmOut] = useState(false)
  const [sessionStatus, setSessionStatus] = useState(() => USE_MOCK ? 'ready' : hasStudentToken() ? 'checking' : 'unauthenticated')
  const [sessionError, setSessionError] = useState('')
  const [sessionAttempt, setSessionAttempt] = useState(0)

  useEffect(() => {
    if (USE_MOCK) return
    if (!hasStudentToken()) return

    let active = true
    api.get('/api/student/me', authCfg()).then(({ data }) => {
      if (!active) return
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))
      setSessionStatus('ready')
    }).catch((error) => {
      if (!active) return
      if (isAxiosError(error) && [401, 403, 404].includes(error.response?.status)) {
        clearStudent()
        setSessionStatus('unauthenticated')
        return
      }
      setSessionError((isAxiosError(error) && error.response?.data?.error) || 'Unable to connect to the booking service.')
      setSessionStatus('error')
    })

    return () => { active = false }
  }, [sessionAttempt])

  if (!hasStudentToken()) return <Navigate to="/login" replace />
  if (sessionStatus === 'checking') {
    return <div className="grid min-h-dvh place-items-center bg-white"><div className="size-8 animate-spin rounded-full border-4 border-gc-100 border-t-gc-600" role="status" aria-label="Checking session" /></div>
  }
  if (sessionStatus === 'error') {
    return <div className="grid min-h-dvh place-items-center bg-white p-6"><div className="max-w-md text-center">
      <p className="font-semibold text-slate-900">Could not load your student pages</p>
      <p role="alert" className="mt-2 text-sm text-slate-600">{sessionError}</p>
      <button className="mt-4 rounded-full bg-gc-900 px-5 py-2 text-sm font-semibold text-white" onClick={() => { setSessionError(''); setSessionStatus('checking'); setSessionAttempt((n) => n + 1) }}>Retry</button>
    </div></div>
  }

  const logout = () => { clearStudent(); setConfirmOut(false); nav('/login'); toast('You have been logged out.') }
  const link = ({ isActive }) =>
    `relative flex items-center gap-3 rounded-xl px-3.5 py-3 text-xs font-semibold transition ${isActive ? 'bg-white/12 text-white shadow-inner ring-1 ring-white/10' : 'text-white/80 hover:bg-white/8 hover:text-white'}`

  return (
    <div className="flex h-dvh bg-gradient-to-b from-gc-900 to-gc-950">
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col px-4 py-6 text-white transition-transform lg:static lg:w-60 lg:translate-x-0 ${open ? 'translate-x-0 bg-gc-900' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 px-1">
          <img src={logoSidebar} alt="" className="size-11 drop-shadow" />
          <div className="leading-tight">
            <p className="text-xs font-bold tracking-wide">GORDON COLLEGE</p>
            <p className="text-[10px] text-white/70">Room &amp; Facility Booking</p>
            <p className="mt-0.5 text-[10px] font-bold tracking-wider text-gold-400">STUDENT PORTAL</p>
          </div>
        </div>
        <div className="my-6 h-px bg-gradient-to-r from-white/30 to-transparent" />
        <p className="mb-2 px-3.5 text-[10px] font-bold tracking-[.2em] text-white/60">MAIN</p>
        <nav className="space-y-1">
          {SIDE_NAV.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)} className={link}>
              {({ isActive }) => (<>
                {isActive && <span className="absolute -left-4 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gold-400" />}
                <Icon className="size-[18px]" />{label}
              </>)}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-1">
          <button onClick={() => setConfirmOut(true)} className={`${link({ isActive: false })} w-full`}><LogOut className="size-[18px]" />Log Out</button>
          <button onClick={() => setAbout(true)} className={`${link({ isActive: false })} w-full`}><Info className="size-[18px]" />About</button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 items-center bg-gc-900 px-4 text-white lg:hidden">
          <button aria-label="Open menu" onClick={() => setOpen(true)}><Menu className="size-5" /></button>
        </div>
        <main id="portal-main" className="min-h-0 flex-1 overflow-y-auto bg-[#fafbfa] p-5 sm:p-8 lg:rounded-l-[2.5rem] lg:p-10" style={{ scrollbarWidth: 'thin' }}>
          <div key={pathname} className="anim-fade-up"><Outlet /></div>
        </main>
      </div>

      {confirmOut && (
        <ConfirmModal icon={LogOut} tone="red" title="Log out?" confirmLabel="Yes, log out" onCancel={() => setConfirmOut(false)} onConfirm={logout}
          message="You're about to sign out of the student portal. You'll need to log in again to book a room." />
      )}
      {about && (
        <Modal title="About Booker" onClose={() => setAbout(false)}>
          <p className="text-sm leading-relaxed text-slate-600">Gordon College Room &amp; Facility Booking. Check live availability, request a slot and track the decision, all from one place.</p>
        </Modal>
      )}
    </div>
  )
}

/* ───────────── 7. dashboard ───────────── */
const STAT_CARDS = [
  { key: 'upcomingBookings', label: 'Upcoming Bookings', Icon: CalendarClock, tint: 'bg-green-100 text-green-700' },
  { key: 'pendingApproval', label: 'Pending Approval', Icon: Hourglass, tint: 'bg-sky-100 text-sky-700' },
  { key: 'completedBookings', label: 'Completed Bookings', Icon: CheckCircle2, tint: 'bg-green-100 text-green-700' },
  { key: 'cancelled', label: 'Cancelled', Icon: XCircle, tint: 'bg-red-100 text-red-600' },
]
const ROOM_STATUS_ROWS = [
  { key: 'available', label: 'Available', sub: 'Ready to book', dot: 'bg-green-600', Icon: DoorOpen },
  { key: 'reserved', label: 'Reserved', sub: 'Currently booked', dot: 'bg-blue-600', Icon: Lock },
  { key: 'maintenance', label: 'Under maintenance', sub: 'Not bookable', dot: 'bg-red-600', Icon: Wrench },
]

function useDashboard() {
  const nav = useNavigate()
  const store = useBookingStore()
  const [live, setLive] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (USE_MOCK) return
    api.get('/api/student/dashboard', authCfg())
      .then((r) => setLive({ stats: r.data.stats, upcoming: r.data.upcomingBookings.map(apiBooking), roomStatus: r.data.roomStatus, schedule: r.data.schedule ?? null }))
      .catch((e) => {
        if (isAxiosError(e) && e.response?.status === 401) { clearStudent(); nav('/login') }
        else setError('Could not load your dashboard.')
      })
  }, [nav])
  const mock = useMemo(() => {
    const today = todayISO()
    const key = (b) => `${b.date} ${b.start}`
    const upcoming = store.filter((b) => b.date >= today && ['Pending', 'Confirmed'].includes(b.status)).sort((a, b) => key(a).localeCompare(key(b)))
    const count = (s) => store.filter((b) => b.status === s).length
    return {
      stats: { upcomingBookings: upcoming.length, pendingApproval: count('Pending'), completedBookings: count('Completed'), cancelled: count('Cancelled') },
      upcoming: upcoming.slice(0, 5), roomStatus: MOCK_ROOM_STATUS, schedule: MOCK_SCHEDULE,
    }
  }, [store])
  return { data: USE_MOCK ? mock : live, error }
}

function ScheduleTable({ rows }) {
  const now = new Date().getHours()
  const cellState = (r, h) => (r.maintenance ? 'maint' : r.busy.find(([s, e]) => h >= s && h < e) ? 'busy' : 'free')
  const hourLabel = (h) => `${h % 12 || 12}${h >= 12 ? 'PM' : 'AM'}`
  return (
    <section className={`${CARD} overflow-hidden`}>
      <div className="flex flex-wrap items-start justify-between gap-3 p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-gc-100 text-gc-700"><LayoutGrid className="size-5" /></span>
          <div>
            <h2 className="text-sm font-bold text-slate-950">Today's Room Schedule</h2>
            <p className="text-[11px] text-slate-500">See which rooms are free hour by hour before you book</p>
          </div>
        </div>
        <ul className="flex items-center gap-4 text-[10px] text-slate-600">
          {[['bg-gc-100 ring-gc-500/40', 'Free'], ['bg-gc-700', 'Booked'], ['bg-slate-300', 'Maintenance']].map(([c, l]) => (
            <li key={l} className="flex items-center gap-1.5"><span className={`size-3 rounded ring-1 ring-inset ring-black/5 ${c}`} />{l}</li>
          ))}
        </ul>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-t border-slate-200 text-left text-[11px]">
          <thead className="bg-orange-50/50">
            <tr>
              <th className={`${TH} w-48`}>Room</th>
              {SCHEDULE_HOURS.map((h) => (
                <th key={h} className={`px-1 py-3.5 text-center text-[10px] font-semibold ${h === now ? 'text-gc-700' : 'text-slate-500'}`}>
                  {hourLabel(h)}{h === now && <span className="mx-auto mt-1 block size-1 rounded-full bg-gc-500" />}
                </th>
              ))}
              <th className={`${TH} text-right`}>Free hrs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => {
              const free = SCHEDULE_HOURS.filter((h) => cellState(r, h) === 'free').length
              return (
                <tr key={r.room} className="transition hover:bg-gc-50/50">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-slate-950">{r.room}</p>
                    <p className="flex items-center gap-1 text-[10px] text-slate-500"><MapPin className="size-3" />{r.building}</p>
                  </td>
                  {SCHEDULE_HOURS.map((h) => {
                    const st = cellState(r, h)
                    const hit = r.busy.find(([s, e]) => h >= s && h < e)
                    return (
                      <td key={h} className="px-0.5 py-3">
                        <span title={st === 'busy' ? hit[2] : st === 'maint' ? 'Under maintenance' : 'Free'}
                          className={`block h-7 rounded-md ring-1 ring-inset ring-black/5 ${st === 'free' ? 'bg-gc-100 hover:bg-gc-500/30' : st === 'busy' ? 'bg-gc-700' : 'bg-slate-300'}`} />
                      </td>
                    )
                  })}
                  <td className="px-5 py-3 text-right font-semibold text-slate-800">{r.maintenance ? '—' : `${free}h`}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function DashboardPage() {
  const nav = useNavigate()
  const { data, error } = useDashboard()
  const [q, setQ] = useState('')
  const user = readStudent()
  const firstName = firstNameOf(user) || 'there'
  const search = (e) => { e.preventDefault(); nav(`/book${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`) }

  return (
    <div className="mx-auto max-w-6xl">
      <form onSubmit={search} className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search rooms or facilities" aria-label="Search rooms or facilities"
          className="w-full rounded-full border border-slate-200 bg-white py-3 pl-11 pr-4 text-xs shadow-sm outline-none transition focus:border-gc-600 focus:ring-4 focus:ring-gc-500/15" />
      </form>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-gc-600">{greeting()} · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Welcome back, {firstName}</h1>
        </div>
        <Link to="/book" className={`${PRIMARY} !rounded-full !bg-none bg-gc-600 hover:bg-gc-700`}><Plus className="size-4" />Book a Room</Link>
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-600">{error}</p>}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map(({ key, label, Icon, tint }, i) => (
          <div key={key} className={`${CARD} anim-fade-up group p-5 transition duration-300 hover:-translate-y-1`} style={{ animationDelay: `${i * 70}ms` }}>
            <span className={`grid size-11 place-items-center rounded-xl transition group-hover:scale-110 ${tint}`}><Icon className="size-5" /></span>
            <p className="mt-5 text-4xl font-bold tabular-nums text-slate-950">{data ? data.stats[key] : '–'}</p>
            <p className="mt-1 text-xs text-slate-600">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-3">
        <section className={`${CARD} overflow-hidden lg:col-span-2`}>
          <div className="flex items-start justify-between gap-3 p-5">
            <div>
              <h2 className="text-sm font-bold text-slate-950">My Upcoming Bookings</h2>
              <p className="text-[11px] text-slate-500">Track status and check in when your slot begins</p>
            </div>
            <Link to="/my-bookings" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50">View all bookings<ChevronRight className="size-3" /></Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-t border-slate-200 text-left text-[11px]">
              <thead className="bg-orange-50/50"><tr>{['Facility', 'Date & Time', 'Purpose', 'Reference', 'Status'].map((h) => <th key={h} className={TH}>{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.upcoming ?? []).map((b) => (
                  <tr key={b.id} className="transition hover:bg-gc-50/50">
                    <td className="px-5 py-4 font-semibold text-slate-950">{b.facility}</td>
                    <td className="px-5 py-4 text-slate-800"><span className="block font-medium">{fmtDay(b.date)}</span><span className="text-slate-500">{slotLabel(b.start, b.end)}</span></td>
                    <td className="px-5 py-4 font-medium text-slate-800">{b.purpose}</td>
                    <td className="px-5 py-4 font-mono text-slate-500">{b.reference}</td>
                    <td className="px-5 py-4"><StatusPill status={b.status} /></td>
                  </tr>
                ))}
                {data && data.upcoming.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">No upcoming bookings yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`${CARD} overflow-hidden bg-orange-50/30`}>
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-bold text-slate-950">Room Status</h2>
            <p className="text-[11px] text-slate-500">Live across all buildings</p>
          </div>
          <ul className="divide-y divide-slate-200 px-5">
            {ROOM_STATUS_ROWS.map(({ key, label, sub, dot, Icon }) => (
              <li key={key} className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-lg bg-white text-slate-600 shadow-sm ring-1 ring-slate-200"><Icon className="size-4" /></span>
                  <div><p className="text-xs font-semibold text-slate-950">{label}</p><p className="text-[10px] text-slate-500">{sub}</p></div>
                </div>
                <span className="flex items-center gap-2 text-sm font-bold tabular-nums"><span className={`size-2 rounded-full ${dot}`} />{data ? data.roomStatus[key] : '–'}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {data?.schedule?.length > 0 && <div className="mt-6"><ScheduleTable rows={data.schedule} /></div>}
    </div>
  )
}

/* ───────────── 8. book flow (steps 1–5) ───────────── */
const BOOK_STEPS = ['Find a space', 'Details', 'Reservation', 'Review', 'Confirmation']
const ROOM_BADGE = {
  Available: 'bg-white/95 text-gc-800', Occupied: 'bg-white/95 text-red-600', 'Under maintenance': 'bg-white/95 text-amber-700',
}
const BADGE_DOT = { Available: 'bg-gc-500', Occupied: 'bg-red-500', 'Under maintenance': 'bg-amber-500' }
const apiStatus = (s) => ({ available: 'Available', reserved: 'Occupied', maintenance: 'Under maintenance', under_maintenance: 'Under maintenance' }[String(s).toLowerCase()] || 'Available')

function Stepper({ step }) {
  return (
    <ol className="mx-auto grid max-w-xl grid-cols-5">
      {BOOK_STEPS.map((s, i) => {
        const done = i + 1 < step, current = i + 1 === step
        return (
          <li key={s} className="relative flex flex-col items-center">
            {i < BOOK_STEPS.length - 1 && (
              <span className="absolute left-1/2 top-4 h-0.5 w-full -translate-y-1/2 overflow-hidden bg-slate-200">
                <span className={`block h-full bg-gc-800 transition-all duration-700 ${done ? 'w-full' : 'w-0'}`} />
              </span>
            )}
            <span aria-current={current ? 'step' : undefined}
              className={`relative z-10 grid size-8 place-items-center rounded-full text-xs font-bold ring-4 ring-white transition-colors duration-300 ${done ? 'bg-gc-900 text-white' : current ? 'bg-gc-500 text-white shadow-lg shadow-gc-500/40' : 'bg-slate-200 text-slate-500'}`}>
              {done ? <Check className="size-4" /> : i + 1}
            </span>
            <span className={`mt-2 text-center text-[10px] leading-tight ${current ? 'font-semibold text-gc-800' : 'text-slate-500'}`}>{s}</span>
          </li>
        )
      })}
    </ol>
  )
}

function AmenityChips({ items, check = false }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((a) => {
        const Icon = AMENITY_ICON[a] || Sparkles
        return (
          <span key={a} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm">
            {check ? <Check className="size-3.5 text-gc-600" /> : <Icon className="size-3.5 text-gc-600" />}{a}
          </span>
        )
      })}
    </div>
  )
}

const roomPhotos = (room) => (room.photos?.length ? room.photos : room.image ? [room.image] : [])

function RoomCard({ room, onDetails, onBook }) {
  const bookable = room.status === 'Available'
  const [broken, setBroken] = useState(false)
  const photo = !broken && roomPhotos(room)[0]
  return (
    <article className={`${CARD} anim-fade-up group overflow-hidden transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_48px_-20px_rgba(15,60,20,.35)]`}>
      <div className="relative h-40 overflow-hidden bg-gradient-to-b from-gc-500 to-gc-950">
        {photo ? (
          <img src={photo} alt={room.name} loading="lazy" onError={() => setBroken(true)} className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (<>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(255,255,255,.28),transparent_55%)] transition duration-500 group-hover:scale-125" />
          <Building2 className="absolute -bottom-4 -right-3 size-28 text-white/10" strokeWidth={1.25} />
        </>)}
        <span className={`absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold shadow ${ROOM_BADGE[room.status]}`}>
          <span className={`size-1.5 rounded-full ${BADGE_DOT[room.status]}`} />{room.status}
        </span>
      </div>
      <div className="p-5">
        <h3 className="text-sm font-bold leading-snug text-slate-950">{room.name}</h3>
        <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-600">
          <span className="flex items-center gap-1.5"><MapPin className="size-3.5 text-gc-600" />{room.building} - {titleCase(room.floor)}</span>
          <span className="flex items-center gap-1.5 font-semibold text-slate-950"><Users className="size-3.5 text-gc-600" />{room.capacity} pax</span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-1.5">
            {room.amenities.slice(0, 4).map((a) => { const Icon = AMENITY_ICON[a] || Sparkles; return <span key={a} title={a} className="grid size-7 place-items-center rounded-lg bg-gc-50 text-gc-700"><Icon className="size-3.5" /></span> })}
          </div>
          <div className="text-right text-[10px] font-semibold text-gc-800"><span className="block text-xs font-bold">Free</span>{room.types.join(' · ')}</div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button onClick={() => onDetails(room)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50"><Eye className="size-3.5" />View Details</button>
          <button disabled={!bookable} onClick={() => onBook(room)} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gc-900 py-2 text-[11px] font-semibold text-white transition hover:bg-gc-800 disabled:cursor-not-allowed disabled:bg-gc-900/40">Book now<ArrowRight className="size-3.5" /></button>
        </div>
      </div>
    </article>
  )
}

/* frame shared by steps 2–5 */
function FlowFrame({ step, title, sub, narrow = false, children }) {
  return (
    <div className={`${CARD} mx-auto p-6 sm:p-8 ${narrow ? 'max-w-3xl' : 'max-w-5xl'}`}>
      {title && <><h1 className="text-lg font-bold text-slate-950">{title}</h1><p className="text-[11px] text-slate-500">{sub}</p></>}
      <div className={title ? 'mt-5' : ''}><Stepper step={step} /></div>
      <div className="mt-7">{children}</div>
    </div>
  )
}
const BackLink = ({ onClick, children }) => (
  <button onClick={onClick} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 transition hover:text-gc-700"><ArrowLeft className="size-3.5" />{children}</button>
)
const SummaryRow = ({ k, v, strong }) => (
  <div className="flex items-center justify-between gap-4 py-2.5 text-xs"><dt className="text-slate-500">{k}</dt><dd className={`text-right ${strong ? 'text-sm font-bold text-gc-800' : 'font-semibold text-slate-950'}`}>{v}</dd></div>
)
const hoursOf = (d) => (toMin(d.end) - toMin(d.start)) / 60
const fmtHrs = (h) => `${Number.isInteger(h) ? h : h.toFixed(1)} hr${h === 1 ? '' : 's'}`

/* step 2 — details */
function DetailsStep({ d, set, go, back }) {
  const [slide, setSlide] = useState(0)
  const [more, setMore] = useState({})
  const room = { ...d.room, ...more }
  const bad = toMin(d.end) <= toMin(d.start)
  useEffect(() => {
    if (USE_MOCK) return
    api.get(`/api/rooms/${d.room.id}`, authCfg()).then((r) => setMore({ overview: r.data.room.overview, rules: r.data.room.rules, amenities: r.data.room.amenities?.length ? r.data.room.amenities : d.room.amenities, image: r.data.room.image_url ?? r.data.room.photo_url ?? d.room.image, photos: r.data.room.photos ?? d.room.photos })).catch(() => {})
  }, [d.room])
  const shades = ['from-gc-500 to-gc-950', 'from-gc-600 to-gc-900', 'from-gc-700 to-gc-950']
  const photos = roomPhotos(room)
  const slides = photos.length || 3
  return (
    <FlowFrame step={2}>
      <BackLink onClick={back}>Back to results</BackLink>
      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div className={`relative h-72 overflow-hidden rounded-2xl bg-gradient-to-b ${shades[slide % 3]} transition-colors duration-500 sm:h-80`}>
            {photos.length ? (
              <img key={photos[slide % slides]} src={photos[slide % slides]} alt={`${room.name} photo ${(slide % slides) + 1}`} className="absolute inset-0 size-full object-cover" />
            ) : (<>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_15%,rgba(255,255,255,.28),transparent_55%)]" />
              <Building2 className="absolute -bottom-6 -right-4 size-48 text-white/10" strokeWidth={1.1} />
              <span className="absolute bottom-3 left-3 rounded-full bg-black/25 px-3 py-1 text-[10px] font-medium text-white/90 backdrop-blur">Photo coming soon</span>
            </>)}
            <button aria-label="Previous photo" onClick={() => setSlide((s) => (s + slides - 1) % slides)} className="absolute left-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-white/25 text-white backdrop-blur transition hover:bg-white/40"><ArrowLeft className="size-4" /></button>
            <button aria-label="Next photo" onClick={() => setSlide((s) => (s + 1) % slides)} className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-white/25 text-white backdrop-blur transition hover:bg-white/40"><ArrowRight className="size-4" /></button>
          </div>
          <div className="mt-3 flex justify-center gap-1.5">{Array.from({ length: slides }, (_, i) => i).map((i) => <button key={i} aria-label={`Photo ${i + 1}`} onClick={() => setSlide(i)} className={`h-1.5 rounded-full transition-all ${slide === i ? 'w-5 bg-gc-900' : 'w-1.5 bg-slate-300'}`} />)}</div>

          <h2 className="mt-5 text-xl font-bold text-slate-950">{room.name}</h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500"><MapPin className="size-3.5" />{room.building} - {titleCase(room.floor)}</p>

          <h3 className="mt-6 text-xs font-bold text-slate-950">Overview</h3>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{room.overview || OVERVIEW}</p>

          <dl className={`${CARD} mt-5 divide-y divide-slate-100 px-5`}>
            <div className="py-3 text-xs font-bold text-slate-950">Specification</div>
            <SummaryRow k="Floor level" v={titleCase(room.floor)} />
            <SummaryRow k="Max occupancy" v={`${room.capacity} pax`} />
            <SummaryRow k="Layout entry" v={room.types[0] || '—'} />
          </dl>

          <h3 className="mt-6 text-xs font-bold text-slate-950">Included Amenities</h3>
          <div className="mt-2.5"><AmenityChips items={room.amenities} check /></div>

          <h3 className="mt-6 text-xs font-bold text-slate-950">House Rules &amp; Policies</h3>
          <ul className="mt-2.5 space-y-2">{(room.rules || DEFAULT_RULES).map((r) => <li key={r} className="flex gap-2.5 text-[11px] text-slate-600"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-gc-500" />{r}</li>)}</ul>
        </div>

        <aside className={`${CARD} h-fit p-5 lg:sticky lg:top-0`}>
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-500">Book this space</p>
          <RequiredNote className="mt-1" />
          <label className={`${LABEL} mt-4`}>Date<Req /><input type="date" min={todayISO()} value={d.date} onChange={(e) => set({ date: e.target.value })} className={INPUT} /></label>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className={LABEL}>Start Time<Req /><input type="time" value={d.start} onChange={(e) => set({ start: e.target.value })} className={INPUT} /></label>
            <label className={LABEL}>End Time<Req /><input type="time" value={d.end} onChange={(e) => set({ end: e.target.value })} className={INPUT} /></label>
          </div>
          {bad && <p role="alert" className="mt-2 text-[11px] text-red-600">End time must be after the start time.</p>}
          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="text-[11px] text-slate-500">Cost{!bad && ` (${fmtHrs(hoursOf(d))})`}</span>
            <span className="text-lg font-extrabold text-gc-800">FREE</span>
          </div>
          <button disabled={bad || !d.date} onClick={go} className={`${PRIMARY} mt-4 w-full`}>Proceed to reservation<ChevronRight className="size-4" /></button>
        </aside>
      </div>
    </FlowFrame>
  )
}

/* step 3 — reservation details */
function ReservationStep({ d, set, go, back, addons }) {
  const [tried, setTried] = useState(false)
  const errs = {
    title: !d.title.trim() && 'Give your event a title.',
    department: !d.department && 'Choose your department.',
    guests: !d.guests ? 'Enter the expected guest count.' : Number(d.guests) > d.room.capacity ? `This room fits up to ${d.room.capacity} people.` : '',
  }
  const invalid = Object.values(errs).some(Boolean)
  const toggle = (n) => set({ equipment: d.equipment.includes(n) ? d.equipment.filter((x) => x !== n) : [...d.equipment, n] })
  const err = (k) => tried && errs[k] && <span className="mt-1 block text-[10px] font-medium text-red-600">{errs[k]}</span>
  const next = () => { setTried(true); if (!invalid) go() }
  return (
    <FlowFrame step={3} title="Reservation details" sub="Tell us what the space is for, who's joining, and what you'll need in the room.">
      <BackLink onClick={back}>Back to details</BackLink>
      <RequiredNote className="mt-3" />
      <div className="mt-4 grid items-start gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className={`${CARD} p-5`}>
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-950"><ClipboardList className="size-4 text-gc-600" />Event Information</h2>
            <div className="mt-4 space-y-4">
              <label className={LABEL}>Meeting / event title<Req /><input value={d.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Cybersecurity & Privacy Seminar" className={INPUT} />{err('title')}</label>
              <label className={LABEL}>Event description<textarea rows={4} value={d.description} onChange={(e) => set({ description: e.target.value })} placeholder="What will happen in the room?" className={`${INPUT} resize-none`} /></label>
              <label className={LABEL}>Department<Req />
                <span className="relative block">
                  <select value={d.department} onChange={(e) => set({ department: e.target.value })} className={`${INPUT} appearance-none pr-9`}>
                    <option value="">Select department</option>{DEPARTMENTS.map((x) => <option key={x}>{x}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 mt-0.5 size-4 -translate-y-1/2 text-slate-500" />
                </span>{err('department')}
              </label>
              <label className={LABEL}>Invite speakers <span className="font-normal text-slate-400">(optional)</span>
                <span className="relative block"><Mail className="pointer-events-none absolute left-3.5 top-1/2 mt-0.5 size-4 -translate-y-1/2 text-slate-400" />
                  <input type="email" value={d.invitees} onChange={(e) => set({ invitees: e.target.value })} placeholder="Type an email" className={`${INPUT} pl-10`} /></span>
              </label>
            </div>
          </section>

          <section className={`${CARD} p-5`}>
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-950"><Plus className="size-4 text-gc-600" />Add-on Services <span className="font-normal text-slate-400">(optional, free)</span></h2>
            <p className="mt-4 text-[11px] font-semibold text-slate-800">Equipment request</p>
            <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
              {addons.map(({ name }) => {
                const on = d.equipment.includes(name), Icon = ADDON_ICON[name] || Plug
                return (
                  <label key={name} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${on ? 'border-gc-600 bg-gc-50 ring-2 ring-gc-500/15' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <input type="checkbox" checked={on} onChange={() => toggle(name)} className="size-4 accent-gc-700" />
                    <span className="grid size-8 place-items-center rounded-lg bg-white text-gc-700 shadow-sm ring-1 ring-slate-200"><Icon className="size-4" /></span>
                    <span className="flex-1 text-xs font-medium text-slate-800">{name}</span>
                  </label>
                )
              })}
            </div>
            <label className={`${LABEL} mt-4 max-w-[10rem]`}>Expected guest count<Req /><input type="number" min={1} value={d.guests} onChange={(e) => set({ guests: e.target.value })} className={INPUT} />{err('guests')}</label>
            <label className={`${LABEL} mt-4`}>Special instruction / remarks<textarea rows={3} value={d.remarks} onChange={(e) => set({ remarks: e.target.value })} placeholder="Anything in the room that admin should know" className={`${INPUT} resize-none`} /></label>
          </section>
        </div>

        <aside className={`${CARD} p-5 lg:sticky lg:top-0`}>
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-500">Book this space</p>
          <dl className="mt-3 divide-y divide-slate-100">
            <SummaryRow k="Space" v={d.room.name} /><SummaryRow k="Date" v={fmtDay(d.date)} />
            <SummaryRow k="Time" v={slotLabel(d.start, d.end)} /><SummaryRow k="Duration" v={fmtHrs(hoursOf(d))} />
          </dl>
          <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="text-[11px] text-slate-500">Cost</span>
            <span className="text-base font-extrabold text-gc-800">FREE</span>
          </div>
          <p className="mt-1 text-[10px] italic text-slate-400">Room use and add-ons are free of charge.</p>
          <button onClick={next} className={`${PRIMARY} mt-4 w-full`}>Proceed to review<ChevronRight className="size-4" /></button>
        </aside>
      </div>
    </FlowFrame>
  )
}

/* step 4 — review & submit (no payment: everything is free) */
function ReviewStep({ d, set, back, submitting, submitError, onSubmit }) {
  const [tried, setTried] = useState(false)
  const agreeErr = tried && !d.agree && 'Please accept the Facility Use Terms & Conditions.'
  const submit = () => { setTried(true); if (d.agree) onSubmit() }
  return (
    <FlowFrame step={4} narrow title="Review & submit" sub="Check your request before sending it. Room use and equipment are free of charge.">
      <section className={`${CARD} px-5`}>
        <h2 className="py-4 text-sm font-bold text-slate-950">Booking Summary</h2>
        <dl className="divide-y divide-slate-100 border-t border-slate-100">
          <SummaryRow k="Facility" v={`${d.room.name} - ${titleCase(d.room.floor)}`} />
          <SummaryRow k="Schedule" v={`${fmtDay(d.date)}, ${slotLabel(d.start, d.end)}`} />
          <SummaryRow k="Event" v={d.title} />
          <SummaryRow k="Add-ons" v={d.equipment.length ? d.equipment.join(', ') : 'None'} />
          <SummaryRow k="Cost" v="FREE" strong />
        </dl>
      </section>

      <section className={`${CARD} mt-6 p-5`}>
        <RequiredNote />
        <label className="mt-3 flex items-center gap-2.5 text-[11px] text-slate-700">
          <input type="checkbox" checked={d.agree} onChange={(e) => set({ agree: e.target.checked })} className="size-4 accent-gc-700" />I agree to the Facility Use Terms &amp; Conditions<Req />
        </label>
        {agreeErr && <span role="alert" className="mt-1 block text-[10px] font-medium text-red-600">{agreeErr}</span>}
        {submitError && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3.5 py-2.5 text-xs text-red-600">{submitError}</p>}
      </section>

      <div className="mt-6 flex items-center justify-between">
        <BackLink onClick={back}>Back to reservation</BackLink>
        <button disabled={submitting} onClick={submit} className={PRIMARY}>{submitting ? 'Sending…' : 'Submit request'}<ChevronRight className="size-4" /></button>
      </div>
    </FlowFrame>
  )
}

/* step 5 — confirmation */
async function downloadReceipt({ done, d, user, qr }) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a5' })
  doc.setFillColor(10, 74, 18); doc.rect(0, 0, 148, 28, 'F')
  doc.setTextColor(255); doc.setFontSize(15); doc.text('Gordon College', 12, 13); doc.setFontSize(9); doc.text('Room & Facility Booking · Booking request receipt', 12, 20)
  doc.setTextColor(30); doc.setFontSize(11); doc.text(`Reference: ${done.ref}`, 12, 40)
  const rows = [['Facility', d.room.name], ['Date', fmtLong(d.date)], ['Time', slotLabel(d.start, d.end)], ['Purpose', d.title], ['Requested by', displayName(user) || '—'], ['Organization', d.department || '—'], ['Add-ons', d.equipment.join(', ') || 'None'], ['Status', 'Pending approval']]
  doc.setFontSize(9.5)
  rows.forEach(([k, v], i) => { doc.setTextColor(120); doc.text(k, 12, 52 + i * 8); doc.setTextColor(20); doc.text(String(v), 60, 52 + i * 8, { maxWidth: 76 }) })
  if (qr) doc.addImage(qr, 'PNG', 49, 128, 50, 50)
  doc.setTextColor(120); doc.setFontSize(8); doc.text('Show this code at the door on arrival', 74, 184, { align: 'center' })
  doc.save(`receipt-${done.ref}.pdf`)
}

function ConfirmationStep({ d, done }) {
  const user = readStudent()
  const [qr, setQr] = useState('')
  useEffect(() => {
    import('qrcode').then((m) => (m.default || m).toDataURL(done.qr, { margin: 1, width: 220, color: { dark: '#06330c', light: '#ffffff' } })).then(setQr).catch(() => {})
  }, [done.qr])
  return (
    <div className="mx-auto max-w-md rounded-3xl bg-orange-50/50 p-5 sm:p-7">
      <Stepper step={5} />
      <div className={`${CARD} anim-fade-up mt-7 px-7 py-8 text-center`}>
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-gc-100 text-gc-600 ring-8 ring-gc-50"><Check className="size-8" strokeWidth={3} /></span>
        <h1 className="mt-5 text-lg font-bold text-slate-950">Booking Request Sent</h1>
        <p className="mx-auto mt-1 max-w-xs text-[11px] leading-relaxed text-slate-500">Your reservation is waiting on officer approval. You'll be notified once it's confirmed.</p>
        <span className="mt-4 inline-block rounded-full bg-orange-100 px-4 py-1.5 font-mono text-[11px] font-bold text-orange-700">REF: {done.ref}</span>
        <dl className="mt-6 divide-y divide-slate-100 border-t border-slate-100 text-left">
          <SummaryRow k="Facility" v={d.room.name.replace('Gordon College ', '')} />
          <SummaryRow k="Date" v={fmtLong(d.date)} />
          <SummaryRow k="Time" v={slotLabel(d.start, d.end)} />
          <SummaryRow k="Purpose" v={d.title} />
          <SummaryRow k="Requested by" v={displayName(user) || '—'} />
          <SummaryRow k="Organization" v={d.department || '—'} />
        </dl>
        <div className="mt-5 border-t border-slate-100 pt-5">
          {qr ? <img src={qr} alt={`QR code for booking ${done.ref}`} className="mx-auto size-36 rounded-lg ring-1 ring-slate-200" /> : <div className="mx-auto grid size-36 place-items-center rounded-lg bg-slate-100 text-slate-400"><QrCode className="size-10" /></div>}
          <p className="mt-2 text-[10px] text-slate-400">Show this code at the door on arrival</p>
        </div>
        <button onClick={() => downloadReceipt({ done, d, user, qr })} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gc-500 py-3 text-xs font-semibold text-white shadow-lg shadow-gc-500/30 transition hover:bg-gc-600"><Download className="size-4" />Download Receipt</button>
        <Link to="/dashboard" className={`${GHOST} mt-3 w-full`}>Back to Dashboard</Link>
      </div>
    </div>
  )
}

/* the flow container: owns the draft so every step shares it */
function BookPage() {
  const toast = useToast()
  const [askSubmit, setAskSubmit] = useState(false)
  const [params] = useSearchParams()
  const [f, setF] = useState({ building: 'All Buildings', date: todayISO(), start: '09:00', end: '11:00', headcount: 50, types: [], amenities: [] })
  const [rooms, setRooms] = useState(USE_MOCK ? MOCK_ROOMS : [])
  const [loading, setLoading] = useState(!USE_MOCK)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1)
  const [d, setD] = useState(null)
  const [done, setDone] = useState(null)
  const [details, setDetails] = useState(null)
  const [addons, setAddons] = useState(ADDONS)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const q = (params.get('q') || '').toLowerCase()

  const set = (patch) => setF((p) => ({ ...p, ...patch }))
  const setDraft = (patch) => setD((p) => ({ ...p, ...patch }))
  const toggle = (key, v) => set({ [key]: f[key].includes(v) ? f[key].filter((x) => x !== v) : [...f[key], v] })
  const badTime = toMin(f.end) <= toMin(f.start)

  useEffect(() => { document.getElementById('portal-main')?.scrollTo({ top: 0, behavior: 'smooth' }) }, [step])

  // add-on names from the backend (mock mode keeps the local list)
  useEffect(() => {
    if (USE_MOCK) return
    api.get('/api/addons', authCfg()).then((r) => r.data.addons?.length && setAddons(r.data.addons.map((a) => ({ name: a.name })))).catch(() => {})
  }, [])

  // live rooms from the backend (skipped in mock mode)
  useEffect(() => {
    if (USE_MOCK || badTime) return
    const t = setTimeout(() => {
      setLoading(true)
      api.get('/api/rooms', {
        ...authCfg(),
        params: { building: f.building, date: f.date, start_time: f.start, end_time: f.end, headcount: f.headcount || undefined, amenities: f.amenities.join(',') || undefined },
      }).then((r) => {
        setRooms(r.data.rooms.map((x) => ({
          id: x.id, name: x.name, building: x.building, floor: x.floor || '', capacity: x.capacity,
          types: x.layout ? [x.layout] : [], amenities: x.amenities ?? [], status: apiStatus(x.status),
          image: x.image_url ?? x.photo_url ?? null, photos: x.photos ?? [],
        })))
        setError('')
      }).catch(() => setError('Could not load rooms. Please try again.')).finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(t)
  }, [f.building, f.date, f.start, f.end, f.headcount, f.amenities, badTime])

  const results = useMemo(() => rooms
    .map((r) => {
      // mock only: mark a room Occupied if the chosen slot overlaps one that's taken
      const taken = USE_MOCK && MOCK_TAKEN.some((t) => t.roomId === r.id && toMin(f.start) < toMin(t.end) && toMin(t.start) < toMin(f.end))
      return taken && r.status === 'Available' ? { ...r, status: 'Occupied' } : r
    })
    .filter((r) =>
      (f.building === 'All Buildings' || r.building === f.building) &&
      (!f.headcount || r.capacity >= Number(f.headcount)) &&
      (!f.types.length || f.types.some((t) => r.types.includes(t))) &&
      f.amenities.every((a) => r.amenities.includes(a)) &&
      (!q || `${r.name} ${r.building} ${r.types.join(' ')}`.toLowerCase().includes(q))),
  [rooms, f, q])

  const startBooking = (room) => {
    setD({ room, date: f.date, start: f.start, end: f.end, title: '', description: '', department: '', invitees: '', equipment: [], guests: String(Math.min(Number(f.headcount) || '', room.capacity) || ''), remarks: '', agree: false })
    setDetails(null)
    setStep(2)
  }

  const submit = async () => {
    setSubmitting(true); setSubmitError('')
    try {
      let ref, qrPayload
      if (USE_MOCK) {
        ref = `GC-${Math.floor(1000 + Math.random() * 9000)}`
        qrPayload = `GC-BOOK|${ref}`
        bookingStore.set((l) => [{ id: Date.now(), facility: d.room.name.replace('Gordon College ', ''), date: d.date, start: d.start, end: d.end, purpose: d.title, reference: ref, status: 'Pending' }, ...l])
      } else {
        const { data } = await api.post('/api/reservations', {
          room_id: d.room.id, title: d.title, description: d.description, department: d.department,
          start_time: new Date(`${d.date}T${d.start}`).toISOString(), end_time: new Date(`${d.date}T${d.end}`).toISOString(),
          attendees: Number(d.guests), invitees: d.invitees || null, equipment_requested: d.equipment,
          special_instructions: d.remarks || null, agree_terms: d.agree,
        }, authCfg())
        ref = data.reservation.reference_no
        qrPayload = data.qr?.payload || `GC-BOOK|${ref}`
      }
      setDone({ ref, qr: qrPayload })
      setStep(5)
      toast('Booking request sent. Waiting for approval.')
    } catch (e) {
      const msg = (isAxiosError(e) && e.response?.data?.error) || 'Could not send your request. Please try again.'
      setSubmitError(msg)
      toast(msg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const Chip = ({ label, group, Icon }) => {
    const on = f[group].includes(label)
    return (
      <button type="button" aria-pressed={on} onClick={() => toggle(group, label)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[11px] font-medium transition ${on ? 'border-gc-700 bg-gc-700 text-white shadow-md shadow-gc-700/25' : 'border-slate-200 bg-white text-slate-700 hover:border-gc-500/60 hover:bg-gc-50'}`}>
        {on ? <Check className="size-3.5" /> : <Icon className="size-3.5 text-gc-600" />}{label}
      </button>
    )
  }

  if (step === 2 && d) return <DetailsStep d={d} set={setDraft} go={() => setStep(3)} back={() => setStep(1)} />
  if (step === 3 && d) return <ReservationStep d={d} set={setDraft} go={() => setStep(4)} back={() => setStep(2)} addons={addons} />
  if (step === 4 && d) return (
    <>
      <ReviewStep d={d} set={setDraft} back={() => setStep(3)} submitting={submitting} submitError={submitError} onSubmit={() => setAskSubmit(true)} />
      {askSubmit && (
        <ConfirmModal icon={CalendarCheck} tone="green" title="Send this booking request?" confirmLabel="Yes" cancelLabel="No" busy={submitting}
          message={`${d.room.name} on ${fmtDay(d.date)}, ${slotLabel(d.start, d.end)}.`}
          onCancel={() => setAskSubmit(false)} onConfirm={() => { setAskSubmit(false); submit() }} />
      )}
    </>
  )
  if (step === 5 && d && done) return <ConfirmationStep d={d} done={done} />

  return (
    <div className={`${CARD} mx-auto max-w-5xl p-5 sm:p-8`}>
      <h1 className="text-lg font-bold text-slate-950">Find a space</h1>
      <p className="text-[11px] text-slate-500">Filter by building, schedule and headcount to see what's open right now</p>
      <div className="mt-6"><Stepper step={1} /></div>

      <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className={LABEL}><span className="flex items-center gap-1.5"><Building2 className="size-3.5 text-gc-600" />Building</span>
            <span className="relative block">
              <select value={f.building} onChange={(e) => set({ building: e.target.value })} className={`${INPUT} appearance-none pr-9`}>{BUILDINGS.map((b) => <option key={b}>{b}</option>)}</select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 mt-0.5 size-4 -translate-y-1/2 text-slate-500" />
            </span>
          </label>
          <label className={LABEL}><span className="flex items-center gap-1.5"><CalendarClock className="size-3.5 text-gc-600" />Date</span><input type="date" min={todayISO()} value={f.date} onChange={(e) => set({ date: e.target.value })} className={INPUT} /></label>
          <label className={LABEL}><span className="flex items-center gap-1.5"><Clock className="size-3.5 text-gc-600" />Start Time</span><input type="time" value={f.start} onChange={(e) => set({ start: e.target.value })} className={INPUT} /></label>
          <label className={LABEL}><span className="flex items-center gap-1.5"><Clock className="size-3.5 text-gc-600" />End Time</span><input type="time" value={f.end} onChange={(e) => set({ end: e.target.value })} className={INPUT} /></label>
          <label className={LABEL}><span className="flex items-center gap-1.5"><Users className="size-3.5 text-gc-600" />Headcount</span><input type="number" min={1} value={f.headcount} onChange={(e) => set({ headcount: e.target.value })} className={INPUT} /></label>
        </div>
        {badTime && <p role="alert" className="mt-3 text-[11px] text-red-600">End time must be after the start time.</p>}
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-5">
          {ROOM_TYPES.map((t) => <Chip key={t.label} {...t} group="types" />)}
          <span className="mx-1 hidden h-6 w-px bg-slate-300 sm:block" />
          {AMENITIES.map((a) => <Chip key={a} label={a} group="amenities" Icon={AMENITY_ICON[a]} />)}
        </div>
      </div>

      <p className="mb-4 mt-6 text-[11px] font-medium text-slate-500" aria-live="polite">{loading ? 'Loading spaces…' : `${results.length} space${results.length === 1 ? '' : 's'} match your filters`}{q && ` · “${params.get('q')}”`}</p>
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-xs text-red-600">{error}</p>}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((r, i) => <div key={r.id} style={{ animationDelay: `${i * 50}ms` }} className="anim-fade-up"><RoomCard room={r} onDetails={setDetails} onBook={startBooking} /></div>)}
      </div>
      {!loading && results.length === 0 && <p className="py-14 text-center text-sm text-slate-500">No spaces match. Try a different time, building or fewer filters.</p>}

      {details && (
        <Modal title={details.name} onClose={() => setDetails(null)}>
          <dl className="divide-y divide-slate-100">
            <SummaryRow k="Location" v={`${details.building} - ${titleCase(details.floor)}`} />
            <SummaryRow k="Capacity" v={`${details.capacity} pax`} />
            <SummaryRow k="Type" v={details.types.join(', ') || '—'} />
            <SummaryRow k="Status" v={details.status} />
          </dl>
          <div className="mt-4"><AmenityChips items={details.amenities} /></div>
          {details.status === 'Available' && <button onClick={() => startBooking(details)} className={`${PRIMARY} mt-5 w-full`}>Book now<ArrowRight className="size-4" /></button>}
        </Modal>
      )}
    </div>
  )
}

/* ───────────── 9. my bookings ───────────── */
function MyBookingsPage() {
  const store = useBookingStore()
  const [live, setLive] = useState(null)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('All Status')
  const [facility, setFacility] = useState('All Facility')

  useEffect(() => {
    if (USE_MOCK) return
    api.get('/api/student/bookings', authCfg()).then((r) => setLive(r.data.bookings.map(apiBooking))).catch(() => setError('Could not load your bookings.'))
  }, [])

  const rows = USE_MOCK ? store : live
  const facilities = useMemo(() => ['All Facility', ...new Set((rows ?? []).map((b) => b.facility))], [rows])
  const shown = useMemo(() => (rows ?? [])
    .filter((b) => (status === 'All Status' || b.status === status) && (facility === 'All Facility' || b.facility === facility) &&
      (!q.trim() || `${b.facility} ${b.purpose} ${b.reference}`.toLowerCase().includes(q.trim().toLowerCase())))
    .sort((a, b) => `${b.date} ${b.start}`.localeCompare(`${a.date} ${a.start}`)), [rows, q, status, facility])

  const select = 'w-full appearance-none rounded-full border border-slate-200 bg-white py-3 pl-4 pr-9 text-xs font-medium text-slate-800 shadow-sm outline-none transition focus:border-gc-600 focus:ring-4 focus:ring-gc-500/15'
  return (
    <div className={`${CARD} mx-auto max-w-5xl p-5 sm:p-7`}>
      <h1 className="flex items-center gap-2.5 text-lg font-bold text-slate-950"><span className="grid size-9 place-items-center rounded-xl bg-gc-100 text-gc-700"><ClipboardList className="size-5" /></span>My Bookings</h1>
      <p className="mt-1 text-[11px] text-slate-500">Every request you've made, past and upcoming.</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_160px_160px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search my bookings" aria-label="Search my bookings" className="w-full rounded-full border border-slate-200 bg-white py-3 pl-11 pr-4 text-xs shadow-sm outline-none transition focus:border-gc-600 focus:ring-4 focus:ring-gc-500/15" />
        </div>
        {[[status, setStatus, ['All Status', 'Confirmed', 'Pending', 'Completed', 'Cancelled'], 'Filter by status'], [facility, setFacility, facilities, 'Filter by facility']].map(([v, fn, opts, label]) => (
          <div key={label} className="relative">
            <select value={v} onChange={(e) => fn(e.target.value)} aria-label={label} className={select}>{opts.map((o) => <option key={o}>{o}</option>)}</select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          </div>
        ))}
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-600">{error}</p>}
      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-orange-50/30 p-2">
        <div className="overflow-x-auto rounded-xl bg-white">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="bg-orange-50/60"><tr>{['Facility', 'Date & Time', 'Purpose', 'Reference', 'Status'].map((h) => <th key={h} className={TH}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {shown.map((b) => (
                <tr key={b.id} className="transition hover:bg-gc-50/50">
                  <td className="px-5 py-4 font-semibold text-slate-950">{b.facility}</td>
                  <td className="px-5 py-4"><span className="block font-semibold text-slate-900">{fmtDay(b.date)}</span><span className="text-slate-500">{slotLabel(b.start, b.end)}</span></td>
                  <td className="px-5 py-4 font-medium text-slate-800">{b.purpose}</td>
                  <td className="px-5 py-4 font-mono text-slate-500">{b.reference}</td>
                  <td className="px-5 py-4"><StatusPill status={b.status} /></td>
                </tr>
              ))}
              {rows && shown.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-500"><Inbox className="mx-auto mb-2 size-6 text-slate-300" />{rows.length ? 'No bookings match your filters.' : "You haven't booked anything yet."}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ───────────── 10. routes ───────────── */
export default function BookerApp() {
  return (
    <ToastProvider>
    <Routes>
      <Route index element={<LandingPage />} />
      <Route path="login" element={<LoginPage />} />
      <Route path="register" element={<RegisterPage />} />
      <Route path="auth/callback" element={<GoogleAuthCallback />} />
      <Route element={<PortalShell />}>
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="book" element={<BookPage />} />
        <Route path="my-bookings" element={<MyBookingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </ToastProvider>
  )
}
