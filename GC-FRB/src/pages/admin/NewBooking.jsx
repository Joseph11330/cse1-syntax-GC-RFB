import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Field, inputCls } from '../../components/ui/index'
import { addBooking, findConflict, whenLabel } from '../../data/admin/bookings'
import { getFacilities } from '../../data/admin/facilities'
const blank = {
  room: '',
  date: '',
  start: '',
  end: '',
  who: '',
  dept: '',
  purpose: '',
  speaker: '',
  description: '',
  equipment: '',
  guests: '',
  remarks: '',
}
function NewBooking() {
  const nav = useNavigate()
  const facilities = getFacilities()
  const [f, setF] = useState(blank)
  const [error, setError] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const h = (t) => <p className="col-span-2 mt-2 text-sm font-bold text-gc-950">{t}</p>
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
    addBooking({
      ...draft,
      dept: f.dept.trim() || '-',
      speaker: f.speaker.trim() || '-',
      equipment: f.equipment.trim() || 'None',
      remarks: f.remarks.trim() || 'None',
    })
    nav('/admin/bookings')
  }
  return (
    <Card className="mx-auto max-w-3xl p-7">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gc-900">New booking</p>
      <h1 className="text-xl font-extrabold text-gc-950">Create a reservation</h1>
      <p className="text-xs text-slate-500">Bookings created by an admin are confirmed right away.</p>
      <hr className="mt-4 border-slate-200" />

      <div className="mt-5 grid grid-cols-2 gap-4">
        <Field label="Facility Name">
          <select value={f.room} onChange={set('room')} className={inputCls}>
            <option value="">Select a facility</option>
            {facilities.map((x) => (
              <option key={x.id} value={x.name} disabled={x.status === 'Under Maintenance'}>
                {x.name}
                {x.status === 'Under Maintenance' ? ' (under maintenance)' : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date">
          <input type="date" value={f.date} onChange={set('date')} className={inputCls} />
        </Field>
        <Field label="Start time">
          <input type="time" value={f.start} onChange={set('start')} className={inputCls} />
        </Field>
        <Field label="End time">
          <input type="time" value={f.end} onChange={set('end')} className={inputCls} />
        </Field>

        {h('Event Information')}
        <Field label="Title">
          <input value={f.purpose} onChange={set('purpose')} placeholder="e.g. Officer meeting" className={inputCls} />
        </Field>
        <Field label="Requested by">
          <input value={f.who} onChange={set('who')} placeholder="Full name" className={inputCls} />
        </Field>
        <Field label="Department">
          <input value={f.dept} onChange={set('dept')} placeholder="e.g. Student Council" className={inputCls} />
        </Field>
        <Field label="Speaker(s)">
          <input value={f.speaker} onChange={set('speaker')} className={inputCls} />
        </Field>
        <Field label="Description" className="col-span-2">
          <textarea rows={3} value={f.description} onChange={set('description')} className={inputCls} />
        </Field>

        {h('Add-on services')}
        <Field label="Equipment">
          <input value={f.equipment} onChange={set('equipment')} placeholder="e.g. Projector" className={inputCls} />
        </Field>
        <Field label="Expected guests">
          <input type="number" min="0" value={f.guests} onChange={set('guests')} className={inputCls} />
        </Field>
        <Field label="Remarks" className="col-span-2">
          <textarea rows={3} value={f.remarks} onChange={set('remarks')} className={inputCls} />
        </Field>
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-2.5 text-xs font-medium text-red-600">{error}</p>}
      <hr className="mt-6 border-slate-200" />
      <div className="mt-5 flex justify-end gap-3">
        <button
          onClick={() => nav(-1)}
          className="rounded-lg border border-slate-200 px-6 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          onClick={save}
          className="rounded-lg bg-gc-900 px-8 py-2.5 text-xs font-semibold text-white shadow-md shadow-gc-900/25 hover:bg-gc-800"
        >
          Create Booking
        </button>
      </div>
    </Card>
  )
}
export { NewBooking as default }
