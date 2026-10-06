import LinkButton from '../ui/LinkButton'
import StatCounter from '../ui/StatCounter'
import { STATS } from '../../data/landing'
function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-gc-50 via-white to-white pt-32 pb-16 sm:pt-40">
      <div
        aria-hidden
        className="hero-orb absolute -right-32 -top-24 h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-gc-500 to-gc-900 opacity-25 blur-3xl"
      />
      <div className="relative mx-auto max-w-6xl px-5">
        <h1
          className="hero-line max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-gc-950 sm:text-6xl"
          style={{ ['--d']: '0ms' }}
        >
          Book a campus room without the sign-up sheet.
        </h1>
        <p className="hero-line mt-5 max-w-xl text-lg leading-relaxed text-slate-600" style={{ ['--d']: '140ms' }}>
          Check what is free, request your slot and track the decision, all in one place built for Gordon College.
        </p>
        <div className="hero-line mt-8 flex flex-wrap gap-3" style={{ ['--d']: '280ms' }}>
          <LinkButton href="#facilities">Find a room</LinkButton>
          <LinkButton href="#how" variant="outline">
            See how booking works
          </LinkButton>
        </div>
        <div className="hero-line mt-14 grid max-w-xl grid-cols-3 gap-6 border-t border-gc-100 pt-8" style={{ ['--d']: '420ms' }}>
          {STATS.map((s) => (
            <StatCounter key={s.label} {...s} />
          ))}
        </div>
      </div>
    </section>
  )
}
export { Hero as default }
