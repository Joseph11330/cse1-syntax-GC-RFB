import { Users } from 'lucide-react'
function FacilityCard({ name, capacity, tags, status }) {
  const ok = status === 'Available'
  return (
    <article className="group overflow-hidden rounded-2xl border border-gc-100 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-gc-900/10">
      <div className="h-40 overflow-hidden bg-gradient-to-br from-gc-500 to-gc-900">
        <div className="h-full w-full transition duration-500 group-hover:scale-110 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,.25),transparent_55%)]" />
      </div>
      <div className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-gc-950">{name}</h3>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ok ? 'bg-gc-100 text-gc-800' : 'bg-amber-100 text-amber-800'}`}
          >
            {status}
          </span>
        </div>
        <p className="flex items-center gap-1.5 text-sm text-slate-500">
          <Users className="h-4 w-4" />
          Up to {capacity} people
        </p>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span key={t} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {t}
            </span>
          ))}
        </div>
      </div>
    </article>
  )
}
export { FacilityCard as default }
