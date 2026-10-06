import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
function Accordion({ items }) {
  const [open, setOpen] = useState(0)
  return (
    <div className="divide-y divide-gc-100 rounded-2xl border border-gc-100 bg-white">
      {items.map((it, i) => {
        const on = open === i
        return (
          <div key={it.q}>
            <button
              aria-expanded={on}
              onClick={() => setOpen(on ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-medium text-gc-950 hover:bg-gc-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gc-500"
            >
              {it.q}
              <ChevronDown className={`h-5 w-5 shrink-0 text-gc-600 transition-transform duration-300 ${on ? 'rotate-180' : ''}`} />
            </button>
            <div className={`grid transition-[grid-template-rows] duration-300 ${on ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
              <p className="overflow-hidden px-5 text-slate-600">
                <span className="block pb-5">{it.a}</span>
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
export { Accordion as default }
