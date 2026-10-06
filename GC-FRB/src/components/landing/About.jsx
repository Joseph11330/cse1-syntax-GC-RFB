import { CalendarCheck, ShieldCheck, Clock } from 'lucide-react'
import Reveal from '../ui/Reveal'
import SectionHeading from '../ui/SectionHeading'
const POINTS = [
  { Icon: CalendarCheck, t: 'Real campus rooms', d: 'Every space listed is one you can actually request.' },
  { Icon: ShieldCheck, t: 'Fair scheduling', d: 'Clashes are caught before staff ever see the request.' },
  { Icon: Clock, t: 'Quick decisions', d: 'Requests land in one queue and are answered fast.' },
]
function About() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 md:grid-cols-2">
      <Reveal>
        <div className="aspect-[4/3] rounded-3xl bg-gradient-to-br from-gc-500 via-gc-700 to-gc-950 shadow-2xl shadow-gc-900/25" />
      </Reveal>
      <Reveal delay={120}>
        <SectionHeading title="Built for how Gordon College actually books rooms" />
        <ul className="mt-8 space-y-5">
          {POINTS.map(({ Icon, t, d }) => (
            <li key={t} className="flex gap-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gc-100 text-gc-700">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-medium text-gc-950">{t}</p>
                <p className="text-sm text-slate-600">{d}</p>
              </div>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  )
}
export { About as default }
