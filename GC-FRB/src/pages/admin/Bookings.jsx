import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Card, Badge, Select } from '../../components/ui/index'
import DateRange from '../../components/admin/DateRange'
import { BookingMenu } from '../../components/admin/BookingActions'
import { STATUSES, STATUS_TONE, getBookings, inRange, initials, whenLabel } from '../../data/admin/bookings'
import { getFacilities } from '../../data/admin/facilities'
function Bookings() {
  const [, force] = useState(0)
  const [q, setQ] = useState('')
  const [range, setRange] = useState({ from: '', to: '' })
  const [status, setStatus] = useState('All Status')
  const [facility, setFacility] = useState('All Facility')
  const needle = q.trim().toLowerCase()
  const rows = getBookings().filter(
    (b) =>
      (status === 'All Status' || b.status === status) &&
      (facility === 'All Facility' || b.room === facility) &&
      inRange(b.date, range) &&
      (!needle || [b.who, b.dept, b.room, b.purpose].some((v) => v.toLowerCase().includes(needle))),
  )
  return (
    <div className="mx-auto max-w-6xl">
      <Card className="space-y-5 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-64 flex-1">
            <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search bookings, rooms, or facilities"
              className="w-full rounded-full border border-slate-300 bg-white py-3 pl-12 pr-5 text-xs shadow-sm outline-none focus:border-gc-600 focus:ring-4 focus:ring-gc-600/10"
            />
          </div>
          <DateRange value={range} onChange={setRange} />
          <Select value={status} onChange={setStatus} options={['All Status', ...STATUSES]} />
          <Select value={facility} onChange={setFacility} options={['All Facility', ...getFacilities().map((f) => f.name)]} />
        </div>

        <Card className="overflow-hidden !border-slate-300">
          <table className="w-full text-left text-[11px]">
            <thead className="border-b border-slate-300 bg-slate-50/70 text-[10px] uppercase tracking-wider text-slate-500">
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
              {rows.map((b) => (
                <tr key={b.id} className="transition hover:bg-slate-50">
                  <td className="px-6 py-3">
                    <Link to={`/admin/bookings/${b.id}`} className="flex items-center gap-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gc-900 text-[10px] font-bold text-white">
                        {initials(b.who)}
                      </span>
                      <span>
                        <span className="block font-semibold text-slate-900">{b.who}</span>
                        <span className="text-[9px] text-slate-500">{b.dept}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-6 py-3 font-medium text-slate-800">{b.room}</td>
                  <td className="px-6 py-3 font-medium text-slate-800">{whenLabel(b)}</td>
                  <td className="px-6 py-3 font-medium text-slate-800">{b.purpose}</td>
                  <td className="px-6 py-3 text-center">
                    <Badge tone={STATUS_TONE[b.status]}>{b.status}</Badge>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <BookingMenu b={b} onChange={() => force((n) => n + 1)} />
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                    No bookings match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </Card>
    </div>
  )
}
export { Bookings as default }
