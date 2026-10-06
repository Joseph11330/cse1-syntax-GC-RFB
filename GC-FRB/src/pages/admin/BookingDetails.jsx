import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Badge, Card, Field, inputCls } from '../../components/ui/index'
import { useBookingActions } from '../../hooks/admin/useBookingActions'
import { STATUS_TONE, detailWhen, getBooking } from '../../data/admin/bookings'
function BookingDetails() {
  const { id } = useParams()
  const nav = useNavigate()
  const [, force] = useState(0)
  const { accept, reject, modals } = useBookingActions(() => force((n) => n + 1))
  const b = getBooking(id)
  if (!b) return <Navigate to="/admin/bookings" replace />
  const ro = `${inputCls} cursor-default bg-white shadow-sm`
  const v = (d) => <input readOnly value={d} className={ro} />
  const area = (d, rows) => <textarea readOnly rows={rows} value={d} className={ro} />
  const h = (t) => <p className="col-span-2 mt-2 text-sm font-bold text-gc-950">{t}</p>
  return (
    <Card className="mx-auto max-w-3xl p-7">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gc-900">Submitted request</p>
          <h1 className="text-xl font-extrabold text-gc-950">{b.purpose}</h1>
        </div>
        <Badge tone={STATUS_TONE[b.status]}>{b.status}</Badge>
      </div>
      <hr className="mt-4 border-slate-200" />

      <div className="mt-5 grid grid-cols-2 gap-4">
        <Field label="Facility Name">{v(b.room)}</Field>
        <Field label="Date & Time">{v(detailWhen(b))}</Field>
        {h('Event Information')}
        <Field label="Title">{v(b.purpose)}</Field>
        <Field label="Department">{v(b.dept)}</Field>
        <Field label="Requested by">{v(b.who)}</Field>
        <Field label="Speaker(s)">{v(b.speaker || '-')}</Field>
        <Field label="Description" className="col-span-2">
          {area(b.description, 3)}
        </Field>
        {h('Add-on services')}
        <Field label="Equipment">{v(b.equipment || '-')}</Field>
        <Field label="Expected guests">{v(String(b.guests))}</Field>
        <Field label="Remarks" className="col-span-2">
          {area(b.remarks || 'None', 3)}
        </Field>
      </div>

      <hr className="mt-6 border-slate-200" />
      <div className="mt-5 flex gap-3">
        {b.status === 'Pending' ? (
          <>
            <button
              onClick={() => reject(b)}
              className="w-36 rounded-lg border border-slate-200 bg-white py-2.5 text-xs font-semibold text-red-600 shadow-sm hover:bg-red-50"
            >
              Reject
            </button>
            <button
              onClick={() => accept(b)}
              className="w-44 rounded-lg bg-gc-900 py-2.5 text-xs font-semibold text-white shadow-md shadow-gc-900/25 hover:bg-gc-800"
            >
              Accept
            </button>
          </>
        ) : null}
        <button
          onClick={() => nav(-1)}
          className="ml-auto rounded-lg border border-slate-200 px-6 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          Back
        </button>
      </div>
      {modals}
    </Card>
  )
}
export { BookingDetails as default }
