import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Card, Field, inputCls } from '../components/ui'
import { useBookings } from '../context/BookingsContext'
import { useFacilities } from '../context/FacilitiesContext'

const fmtDate = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
const fmtTime = (t) => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}` }
const mins = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
const parse12 = (s) => { const [, h, m, ap] = s.match(/(\d+):(\d+) (AM|PM)/); return (Number(h) % 12) * 60 + Number(m) + (ap === 'PM' ? 720 : 0) }

const Section = ({ children }) => <p className="col-span-2 mt-3 border-b border-slate-200 pb-2 text-[13px] font-bold text-slate-900">{children}</p>
const init = { who: '', dept: '', email: '', room: '', date: '', start: '', end: '', purpose: '', speakers: '', description: '', equipment: '', guests: '', remarks: '' }

export default function AddBooking() {
  const nav = useNavigate()
  const { bookings, addBooking } = useBookings()
  const { facilities } = useFacilities()
  const [f, setF] = useState(init)
  const [error, setError] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const bookable = facilities.filter((x) => x.status !== 'Under Maintenance')

  const submit = (e) => {
    e.preventDefault()
    if (!f.who.trim() || !f.room || !f.date || !f.start || !f.end || !f.purpose.trim()) return setError('Please fill in the booker, facility, date, time, and event title.')
    if (mins(f.end) <= mins(f.start)) return setError('End time must be later than the start time.')
    const date = fmtDate(f.date)
    const clash = bookings.find((b) => b.room === f.room && b.date === date && b.status !== 'Cancelled' && (() => {
      const [s, en] = b.time.split(' - ').map(parse12)
      return mins(f.start) < en && mins(f.end) > s
    })())
    if (clash) return setError(`${f.room} is already booked on ${date} (${clash.time}) by ${clash.who}. Pick another time or room.`)
    addBooking({
      who: f.who.trim(), dept: f.dept.trim() || '-', email: f.email.trim() || '-', room: f.room, date,
      time: `${fmtTime(f.start)} - ${fmtTime(f.end)}`, purpose: f.purpose.trim(), status: 'Pending',
      guests: Number(f.guests) || 0, equipment: f.equipment.trim() || 'None', speakers: f.speakers.trim() || '-',
      description: f.description.trim() || '-', remarks: f.remarks.trim() || 'None',
    })
    nav('/bookings')
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-gc-700"><ArrowLeft size={14} /> Back to dashboard</Link>
      <Card className="p-8 !border-slate-300">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gc-600">New booking</p>
        <h1 className="mt-1 text-xl font-extrabold tracking-tight text-slate-900">Add Booking</h1>
        <p className="text-[11px] text-slate-500">Create a request on behalf of a booker. It will be saved as Pending.</p>

        <form onSubmit={submit} className="mt-6 grid grid-cols-2 gap-x-5 gap-y-4">
          <Section>Booker information</Section>
          <Field label="Full name"><input value={f.who} onChange={set('who')} placeholder="e.g. Jasmine Marcado" className={inputCls} /></Field>
          <Field label="Department / Organization"><input value={f.dept} onChange={set('dept')} placeholder="e.g. Student Council" className={inputCls} /></Field>
          <Field label="Email" className="col-span-2"><input type="email" value={f.email} onChange={set('email')} placeholder="name@gordoncollege.edu.ph" className={inputCls} /></Field>

          <Section>Schedule</Section>
          <Field label="Facility" className="col-span-2">
            <select value={f.room} onChange={set('room')} className={inputCls}>
              <option value="">Select a facility</option>
              {bookable.map((x) => <option key={x.id} value={x.name}>{x.name} · {x.capacity} pax</option>)}
            </select>
          </Field>
          <Field label="Date" className="col-span-2"><input type="date" value={f.date} onChange={set('date')} className={inputCls} /></Field>
          <Field label="Start time"><input type="time" value={f.start} onChange={set('start')} className={inputCls} /></Field>
          <Field label="End time"><input type="time" value={f.end} onChange={set('end')} className={inputCls} /></Field>

          <Section>Event Information</Section>
          <Field label="Title" className="col-span-2"><input value={f.purpose} onChange={set('purpose')} placeholder="e.g. Officer Meeting" className={inputCls} /></Field>
          <Field label="Speaker(s)" className="col-span-2"><input value={f.speakers} onChange={set('speakers')} placeholder="Optional" className={inputCls} /></Field>
          <Field label="Description" className="col-span-2"><textarea rows={3} value={f.description} onChange={set('description')} className={`${inputCls} resize-none`} /></Field>

          <Section>Add-on services</Section>
          <Field label="Equipment"><input value={f.equipment} onChange={set('equipment')} placeholder="e.g. Projector" className={inputCls} /></Field>
          <Field label="Expected guests"><input type="number" min="0" value={f.guests} onChange={set('guests')} className={inputCls} /></Field>
          <Field label="Remarks" className="col-span-2"><textarea rows={2} value={f.remarks} onChange={set('remarks')} className={`${inputCls} resize-none`} /></Field>

          {error && <p className="col-span-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{error}</p>}
          <div className="col-span-2 mt-3 flex gap-3 border-t border-slate-200 pt-5">
            <button type="button" onClick={() => nav(-1)} className="flex-1 rounded-lg border border-slate-300 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">Cancel</button>
            <button className="flex-1 rounded-lg bg-gc-900 py-2.5 text-xs font-semibold text-white shadow-md shadow-gc-900/25 transition hover:bg-gc-800">Submit Booking</button>
          </div>
        </form>
      </Card>
    </div>
  )
}
