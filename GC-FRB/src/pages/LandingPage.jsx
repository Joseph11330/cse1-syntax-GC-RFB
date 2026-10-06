import Navbar from '../components/landing/Navbar'
import Hero from '../components/landing/Hero'
import About from '../components/landing/About'
import FacilityCard from '../components/landing/FacilityCard'
import FeatureCard from '../components/landing/FeatureCard'
import Steps from '../components/landing/Steps'
import Footer from '../components/landing/Footer'
import Accordion from '../components/ui/Accordion'
import Reveal from '../components/ui/Reveal'
import SectionHeading from '../components/ui/SectionHeading'
import { FACILITIES, FEATURES, FAQ } from '../data/landing'
import '../landing.css'
function LandingPage() {
  return (
    <div className="bg-white text-slate-800">
      <Navbar />
      <main>
        <Hero />
        <About />
        <section id="facilities" className="scroll-mt-20 bg-gc-50 py-20">
          <div className="mx-auto max-w-6xl px-5">
            <SectionHeading title="Every bookable space, one directory" lead="Capacity, equipment and availability at a glance." />
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FACILITIES.map((f, i) => (
                <Reveal key={f.name} delay={i * 100}>
                  <FacilityCard {...f} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
        <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
          <SectionHeading title="Everything a booking needs, nothing it doesn't" />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 90}>
                <FeatureCard {...f} />
              </Reveal>
            ))}
          </div>
        </section>
        <Steps />
        <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-5 pb-24 pt-8">
          <SectionHeading title="Common questions" />
          <div className="mt-8">
            <Accordion items={FAQ} />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
export { LandingPage as default }
