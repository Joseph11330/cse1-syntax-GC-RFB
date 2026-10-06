import Reveal from '../ui/Reveal'
import SectionHeading from '../ui/SectionHeading'
import { STEPS } from '../../../data/booker/landing'
function Steps() {
  return (
    <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
      <SectionHeading title="Reserve a space in three steps" lead="From browsing to a confirmed room in minutes." />
      <ol className="relative mt-12 grid gap-8 md:grid-cols-3">
        <span aria-hidden className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-gc-500 to-gc-100 md:block" />
        {STEPS.map((s, i) => (
          <Reveal key={s.title} delay={i * 120}>
            <li className="relative list-none">
              <span className="relative z-10 grid h-12 w-12 place-items-center rounded-full bg-gc-600 text-lg font-semibold text-white ring-8 ring-white">
                {i + 1}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-gc-950">{s.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{s.body}</p>
            </li>
          </Reveal>
        ))}
      </ol>
    </section>
  )
}
export { Steps as default }
