/* ============================================================================
 * BookerApp.jsx
 * The public "Booker" side (students / organizations) as ONE single-page-app file,
 * fully separate from the admin portal. Mounted by App.jsx at /*.
 *
 *   /       → Landing page
 *   /book   → Booking flow (placeholder – build the request form here)
 * ========================================================================== */
import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { CalendarCheck, ChevronDown, Clock, Menu, ShieldCheck, Users, X } from 'lucide-react'
import logo from '../assets/logo-login.png'
import './booker.css'

/* ───────────── content ───────────── */
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

/* ───────────── small building blocks ───────────── */
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

/* ───────────── landing sections ───────────── */
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
          <img src={logo} alt="" className="h-8 w-8" />
          <span className="text-sm leading-tight">Gordon College<br /><span className="font-normal text-slate-500">Facility Booking</span></span>
        </Link>
        <ul className="hidden items-center gap-8 text-sm text-slate-700 md:flex">
          {NAV.map((n) => <li key={n.href}><a href={n.href} className="transition hover:text-gc-600">{n.label}</a></li>)}
        </ul>
        <div className="hidden items-center gap-3 md:flex"><LinkButton to="/book" className="!py-2">Book now</LinkButton></div>
        <button className="md:hidden" aria-label="Toggle menu" onClick={() => setOpen((o) => !o)}>{open ? <X /> : <Menu />}</button>
      </nav>
      {open && (
        <div className="space-y-1 border-t border-gc-100 bg-white px-5 pb-5 pt-2 md:hidden">
          {NAV.map((n) => <a key={n.href} href={n.href} onClick={() => setOpen(false)} className="block py-2.5 text-slate-700">{n.label}</a>)}
          <LinkButton to="/book" className="mt-2 w-full">Book now</LinkButton>
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
      <p className="border-t border-white/10 py-5 text-center text-xs text-gc-100/60">© {new Date().getFullYear()} Gordon College. All rights reserved.</p>
    </footer>
  )
}

/* ───────────── pages ───────────── */
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

// Placeholder: the booking request flow gets built here ("Book now" buttons point to /book)
function BookPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-gc-50 px-5 text-center">
      <div>
        <h1 className="text-3xl font-semibold text-gc-950">Booking form coming soon</h1>
        <p className="mt-2 text-slate-600">The Booker flow will live on this page.</p>
        <Link to="/" className="mt-6 inline-block text-sm font-semibold text-gc-700 hover:underline">← Back to home</Link>
      </div>
    </div>
  )
}

export default function BookerApp() {
  return (
    <Routes>
      <Route index element={<LandingPage />} />
      <Route path="book" element={<BookPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
