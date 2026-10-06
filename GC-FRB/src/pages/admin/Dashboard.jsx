import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Clock, CalendarDays, TrendingUp, Plus, Bell, ChevronRight } from 'lucide-react'
import api from '../../api'
import { Card, Badge, Select } from '../../components/ui/index'
import DateRange from '../../components/admin/DateRange'
import { BookingMenu } from '../../components/admin/BookingActions'
import { STATUSES, STATUS_TONE, getBookings, inRange, initials, whenLabel } from '../../data/admin/bookings'
const mock = {
  stats: [34, 24, 8, 68],
  rooms: [
    ['Available', 'Ready to book', 18, 'bg-green-500'],
    ['Reserved', 'Currently booked', 4, 'bg-blue-500'],
    ['Under maintenance', 'Not bookable', 2, 'bg-red-500'],
  ],
  today: [
    ['9:00 - 11:00 AM', 'Faculty meeting', 'Conference Room B'],
    ['9:00 - 11:00 AM', 'Thesis defense', 'Lecture Hall 102'],
    ['9:00 - 11:00 AM', 'Org orientation', 'Function Hall'],
  ],
}
function Dashboard() {
  const [d] = useState(mock)
  const [, force] = useState(0)
  const [status, setStatus] = useState('All Status')
  const [facility, setFacility] = useState('All Facility')
  const [range, setRange] = useState({ from: '', to: '' })
  const admin = JSON.parse(localStorage.getItem('gc_admin') || '{}')
  useEffect(() => {
    api.get('/api/admin/dashboard').catch(() => {})
  }, [])
  const all = getBookings()
  const facilities = ['All Facility', ...new Set(all.map((r) => r.room))]
  const rows = all
    .filter(
      (r) =>
        (status === 'All Status' || r.status === status) && (facility === 'All Facility' || r.room === facility) && inRange(r.date, range),
    )
    .slice(0, 5)
  const stat = [
    { label: 'Total facilities', v: d.stats[0], icon: Building2, c: 'bg-green-100 text-green-700' },
    { label: 'Pending approvals', v: d.stats[1], icon: Clock, c: 'bg-amber-100 text-amber-700' },
    { label: "Today's bookings", v: d.stats[2], icon: CalendarDays, c: 'bg-sky-100 text-sky-700' },
    { label: 'Utilization rate', v: `${d.stats[3]}%`, icon: TrendingUp, c: 'bg-violet-100 text-violet-700' },
  ]
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Welcome back, {admin.full_name?.split(' ')[0] || 'Admin'}
          </h1>
          <p className="text-sm text-slate-500">Here's what needs your attention today.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="relative grid size-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-600">
            <Bell size={16} />
            <span className="absolute right-2 top-2 size-2 rounded-full bg-red-500" />
          </button>
          <Link
            to="/admin/bookings/new"
            className="flex items-center gap-1.5 rounded-full bg-gc-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-gc-500/30 hover:bg-gc-600"
          >
            <Plus size={14} /> New Booking
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stat.map(({ label, v, icon: Icon, c }) => (
          <Card key={label} className="p-5">
            <span className={`grid size-9 place-items-center rounded-xl ${c}`}>
              <Icon size={17} />
            </span>
            <p className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">{v}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </Card>
        ))}
      </section>

      {/* Pending approval requests */}
      <Card className="!border-slate-300">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Pending approval requests</h2>
            <p className="text-[11px] text-slate-500">Approve or reject before the requested time slot begins</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <DateRange value={range} onChange={setRange} />
            <Select value={status} onChange={setStatus} options={['All Status', ...STATUSES]} />
            <Select value={facility} onChange={setFacility} options={facilities} />
            <Link
              to="/admin/bookings"
              className="flex items-center gap-1 rounded-md border border-gc-600/40 px-3 py-1.5 text-[11px] font-medium text-gc-700 hover:bg-gc-50"
            >
              View Full Booking <ChevronRight size={13} />
            </Link>
          </div>
        </div>
        <table className="w-full text-left text-[11px]">
          <thead className="border-y border-slate-300 bg-slate-50/70 text-[10px] uppercase tracking-wider text-slate-600">
            <tr>
              {['Name', 'Facility', 'Date & Time', 'Purpose'].map((h) => (
                <th key={h} className="px-6 py-3.5 font-semibold">
                  {h}
                </th>
              ))}
              <th className="px-6 py-3.5 text-center font-semibold">Status</th>
              <th className="px-6 py-3.5 text-center font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300 bg-white">
            {rows.map((r) => (
              <tr key={r.id} className="transition hover:bg-slate-50">
                <td className="px-6 py-4">
                  <Link to={`/admin/bookings/${r.id}`} className="flex items-center gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gc-900 text-[10px] font-bold text-white">
                      {initials(r.who)}
                    </span>
                    <span>
                      <span className="block font-semibold text-slate-900">{r.who}</span>
                      <span className="text-[9px] text-slate-500">{r.dept}</span>
                    </span>
                  </Link>
                </td>
                <td className="px-6 py-4 font-medium text-slate-800">{r.room}</td>
                <td className="px-6 py-4 font-medium text-slate-800">{whenLabel(r)}</td>
                <td className="px-6 py-4 font-medium text-slate-800">{r.purpose}</td>
                <td className="px-6 py-4 text-center">
                  <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                </td>
                <td className="px-6 py-4 text-center">
                  <BookingMenu b={r} onChange={() => force((n) => n + 1)} />
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                  No requests match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <section className="flex flex-wrap gap-4">
        {/* Room status */}
        <Card className="w-full max-w-sm overflow-hidden !border-slate-300 !shadow-md">
          <div className="border-b border-slate-300 px-7 pb-3 pt-5">
            <h2 className="text-sm font-semibold text-slate-900">Room Status</h2>
            <p className="text-[11px] text-slate-500">Live across all buildings</p>
          </div>
          <ul className="px-7 pb-4 pt-1">
            {d.rooms.map(([name, sub, count, dot], i) => (
              <li
                key={name}
                className={`flex items-center justify-between py-4 ${i < d.rooms.length - 1 ? 'border-b border-slate-300' : ''}`}
              >
                <div>
                  <p className="text-[13px] font-semibold text-slate-900">{name}</p>
                  <p className="mt-1 text-[10px] text-slate-500">{sub}</p>
                </div>
                <span className="flex items-center gap-2 pr-2 text-[11px] font-semibold text-slate-900">
                  <span className={`size-2 rounded-full ${dot}`} />
                  {count}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Today's schedule */}
        <Card className="w-full max-w-sm overflow-hidden !border-slate-300 !shadow-md">
          <div className="border-b border-slate-300 px-7 pb-3 pt-5">
            <h2 className="text-sm font-semibold text-slate-900">Today's schedule</h2>
            <p className="text-[11px] text-slate-500">Approved bookings</p>
          </div>
          <ul className="px-7 pb-4 pt-1">
            {d.today.map(([time, title, room], i) => (
              <li key={title} className={`flex items-center gap-4 py-3.5 ${i < d.today.length - 1 ? 'border-b border-slate-300' : ''}`}>
                <span className="w-24 shrink-0 text-[10px] text-slate-500">{time}</span>
                <span className="h-9 w-0.5 shrink-0 rounded bg-gc-800" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-slate-900">{title}</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">{room}</p>
                </div>
                <Badge tone="green">Confirmed</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  )
}
export { Dashboard as default }
