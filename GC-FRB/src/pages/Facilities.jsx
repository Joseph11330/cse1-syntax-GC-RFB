import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, MoreVertical, Plus, X } from 'lucide-react'
import { Card, Badge, Field, inputCls } from '../components/ui'
import { FACILITY_TYPES, addFacility, getFacilities, removeFacility } from '../data/facilities'

const tone = { Available: 'green', 'Under Maintenance': 'amber', Occupied: 'red' }

function RowMenu({ f, onChange }) {
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const item = 'block w-full px-4 py-2.5 text-left text-[13px] font-medium hover:bg-slate-50'
  return (
    <div ref={ref} className="relative inline-block">
      <button onClick={() => setOpen((o) => !o)} className="rounded-full p-1.5 text-gc-600 hover:bg-slate-100" aria-label="Actions">
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          <button className={`${item} text-slate-700`} onClick={() => nav(`/facilities/${f.id}`)}>View Details</button>
          <button
            className={`${item} text-red-600`}
            onClick={() => {
              setOpen(false)
              if (window.confirm(`Remove ${f.name}?`)) { removeFacility(f.id); onChange() }
            }}
          >
            Remove
          </button>
        </div>
      )}
    </div>
  )
}

const empty = { name: '', code: '', location: '', type: FACILITY_TYPES[3], capacity: 40, rate: 0 }

function AddFacility({ onClose, onAdded }) {
  const [f, setF] = useState(empty)
  const [amenities, setAmenities] = useState([])
  const [custom, setCustom] = useState('')
  const [error, setError] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const addAmenity = () => {
    const v = custom.trim()
    if (v && !amenities.includes(v)) setAmenities([...amenities, v])
    setCustom('')
  }
  const submit = () => {
    if (!f.name.trim() || !f.code.trim()) return setError('Facility name and room code are required.')
    const [floor, ...rest] = f.location.split(' - ')
    addFacility({
      name: f.name.trim(), code: f.code.trim(), type: f.type, amenities,
      capacity: Number(f.capacity) || 0, rate: Number(f.rate) || 0,
      floor: floor.trim(), building: rest.join(' - ').trim(),
    })
    onAdded()
  }

  return (
    <Card className="relative p-6">
      <button onClick={onClose} className="absolute right-4 top-4 rounded-full p-1 text-slate-500 hover:bg-slate-100" aria-label="Close"><X size={16} /></button>
      <h2 className="text-base font-extrabold text-slate-900">Add Facility</h2>
      <p className="text-xs text-slate-500">New spaces appear immediately in admin results.</p>

      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-5">
        <Field label="Facility name"><input value={f.name} onChange={set('name')} placeholder="e.g. Computer Lab" className={inputCls} /></Field>
        <Field label="Room code"><input value={f.code} onChange={set('code')} placeholder="e.g. CR - 123" className={inputCls} /></Field>
        <Field label="Location"><input value={f.location} onChange={set('location')} placeholder="e.g. 5th Floor - Main Building" className={inputCls} /></Field>
        <Field label="Type">
          <select value={f.type} onChange={set('type')} className={inputCls}>{FACILITY_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
        </Field>
        <Field label="Max capacity"><input type="number" min="0" value={f.capacity} onChange={set('capacity')} className={inputCls} /></Field>
        <Field label="Hourly rate (₱, 0 = free)"><input type="number" min="0" value={f.rate} onChange={set('rate')} className={inputCls} /></Field>
        <div className="col-span-2">
          <span className="text-[11px] font-semibold text-slate-600">Included amenities</span>
          <div className="mt-1 flex gap-2">
            <input value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addAmenity()} placeholder="Type a custom amenities" className={inputCls} />
            <button type="button" onClick={addAmenity} className="rounded-lg bg-gc-900 px-5 text-xs font-semibold text-white hover:bg-gc-800">Add</button>
          </div>
          {amenities.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {amenities.map((a) => (
                <span key={a} className="inline-flex items-center gap-1 rounded-full bg-gc-100 px-3 py-1 text-[11px] font-medium text-gc-800">
                  {a}<button type="button" onClick={() => setAmenities(amenities.filter((x) => x !== a))}><X size={12} /></button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && <p className="mt-3 text-xs font-medium text-red-600">{error}</p>}
      <div className="mt-5 flex justify-end">
        <button onClick={submit} className="flex items-center gap-1.5 rounded-lg bg-gc-900 px-6 py-2.5 text-xs font-semibold text-white shadow-md shadow-gc-900/25 hover:bg-gc-800"><Plus size={14} /> Add Facility</button>
      </div>
    </Card>
  )
}

export default function Facilities() {
  const [, force] = useState(0)
  const [adding, setAdding] = useState(false)
  const formRef = useRef(null)
  const refresh = () => force((n) => n + 1)
  const rows = getFacilities()

  useEffect(() => { if (adding) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, [adding])

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex items-center gap-4">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-gc-100 text-gc-800"><Building2 size={22} /></div>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Facility Management</h1>
          <p className="text-xs text-slate-500">Add, edit or take a space offline for maintenance.</p>
        </div>
      </div>

      <Card>
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-500">
            <tr>{['Name', 'Room code', 'Location', 'Type', 'Capacity', 'Status', 'Action'].map((h) => <th key={h} className="px-6 py-3 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((f) => (
              <tr key={f.id} className="hover:bg-slate-50/60">
                <td className="px-6 py-3 font-semibold text-slate-900">{f.name}</td>
                <td className="px-6 py-3 text-slate-600">{f.code}</td>
                <td className="px-6 py-3 text-slate-600">{f.floor}<div className="text-[11px] text-slate-400">{f.building}</div></td>
                <td className="px-6 py-3 text-slate-600">{f.type}</td>
                <td className="px-6 py-3 text-slate-600">{f.capacity} pax</td>
                <td className="px-6 py-3"><Badge tone={tone[f.status]}>{f.status}</Badge></td>
                <td className="px-6 py-3"><RowMenu f={f} onChange={refresh} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {!adding && (
        <div className="flex justify-end">
          <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 rounded-lg bg-gc-900 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-gc-900/25 hover:bg-gc-800"><Plus size={14} /> Add Facility</button>
        </div>
      )}
      <div ref={formRef}>
        {adding && <AddFacility onClose={() => setAdding(false)} onAdded={() => { setAdding(false); refresh() }} />}
      </div>
    </div>
  )
}
