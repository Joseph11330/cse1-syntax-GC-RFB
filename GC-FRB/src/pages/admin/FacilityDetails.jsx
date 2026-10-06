import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Card, Field, inputCls } from '../../components/ui/index'
import AmenitiesEditor from '../../components/admin/AmenitiesEditor'
import { FACILITY_TYPES, getFacility, removeFacility, updateFacility } from '../../data/admin/facilities'
const STATUSES = ['Available', 'Under Maintenance', 'Occupied']
function FacilityDetails() {
  const { id } = useParams()
  const nav = useNavigate()
  const original = getFacility(id)
  const [f, setF] = useState(() => (original ? { ...original, location: `${original.floor} - ${original.building}` } : null))
  if (!f) return <Navigate to="/admin/facilities" replace />
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const save = () => {
    const [floor, ...rest] = f.location.split(' - ')
    updateFacility(id, {
      name: f.name,
      code: f.code,
      type: f.type,
      status: f.status,
      overview: f.overview,
      amenities: f.amenities,
      capacity: Number(f.capacity) || 0,
      rate: Number(f.rate) || 0,
      floor: floor.trim(),
      building: rest.join(' - ').trim(),
    })
    nav('/admin/facilities')
  }
  const remove = () => {
    if (!window.confirm(`Remove ${f.name}?`)) return
    removeFacility(id)
    nav('/admin/facilities')
  }
  return (
    <Card className="mx-auto max-w-3xl p-7">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gc-600">Edit facility</p>
      <h1 className="text-xl font-extrabold text-slate-900">{original?.name}</h1>
      <hr className="mt-4 border-slate-200" />

      <div className="mt-5 grid grid-cols-2 gap-4">
        <Field label="Facility name">
          <input value={f.name} onChange={set('name')} placeholder="e.g. Conference Room A" className={inputCls} />
        </Field>
        <Field label="Location">
          <input value={f.location} onChange={set('location')} placeholder="e.g. 3rd Floor - Main Building" className={inputCls} />
        </Field>
        <Field label="Room code">
          <input value={f.code} onChange={set('code')} placeholder="e.g. CR - 123" className={inputCls} />
        </Field>
        <Field label="Max capacity">
          <input type="number" min="0" value={f.capacity} onChange={set('capacity')} className={inputCls} />
        </Field>
        <Field label="Type of facility">
          <select value={f.type} onChange={set('type')} className={inputCls}>
            {FACILITY_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Hourly rate (₱, 0 = free)">
          <input type="number" min="0" value={f.rate} onChange={set('rate')} className={inputCls} />
        </Field>

        <div className="col-span-2">
          <span className="text-[11px] font-semibold text-slate-600">Included amenities</span>
          <div className="mt-1"><AmenitiesEditor showList value={f.amenities} onChange={(amenities) => setF({ ...f, amenities })} /></div>
        </div>

        <Field label="Facility overview" className="col-span-2">
          <textarea rows={4} value={f.overview} onChange={set('overview')} className={inputCls} />
        </Field>

        <div className="col-span-2">
          <span className="text-[11px] font-semibold text-slate-600">Status</span>
          <div className="mt-1 grid grid-cols-3 gap-3">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setF({ ...f, status: s })}
                className={`rounded-lg border py-3 text-xs font-semibold transition ${f.status === s ? 'border-gc-500 bg-gc-100 text-gc-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <hr className="mt-6 border-slate-200" />
      <div className="mt-5 flex justify-between">
        <button onClick={remove} className="rounded-lg border border-red-200 px-5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50">
          Remove Facility
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => nav('/admin/facilities')}
            className="rounded-lg border border-slate-200 px-5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Back
          </button>
          <button
            onClick={save}
            className="rounded-lg bg-gc-900 px-6 py-2 text-xs font-semibold text-white shadow-md shadow-gc-900/25 hover:bg-gc-800"
          >
            Save Changes
          </button>
        </div>
      </div>
    </Card>
  )
}
export { FacilityDetails as default }
