import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import logo from '../../../assets/logo-login.png'
import { NAV } from '../../../data/booker/landing'
import LinkButton from '../ui/LinkButton'
function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(scrollY > 12)
    on()
    addEventListener('scroll', on, { passive: true })
    return () => removeEventListener('scroll', on)
  }, [])
  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition duration-300 ${scrolled || open ? 'bg-white/85 shadow-sm backdrop-blur-lg' : 'bg-transparent'}`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link to="/" className="flex items-center gap-2.5 font-semibold text-gc-950">
          <img src={logo} alt="" className="h-8 w-8" />
          <span className="leading-tight text-sm">
            Gordon College
            <br />
            <span className="font-normal text-slate-500">Facility Booking</span>
          </span>
        </Link>
        <ul className="hidden items-center gap-8 text-sm text-slate-700 md:flex">
          {NAV.map((n) => (
            <li key={n.href}>
              <a href={n.href} className="transition hover:text-gc-600">
                {n.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="hidden items-center gap-3 md:flex">
          <LinkButton to="/book" className="!py-2">
            Book now
          </LinkButton>
        </div>
        <button className="md:hidden" aria-label="Toggle menu" onClick={() => setOpen((o) => !o)}>
          {open ? <X /> : <Menu />}
        </button>
      </nav>
      {open && (
        <div className="space-y-1 border-t border-gc-100 bg-white px-5 pb-5 pt-2 md:hidden">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} onClick={() => setOpen(false)} className="block py-2.5 text-slate-700">
              {n.label}
            </a>
          ))}
          <LinkButton to="/book" className="mt-2 w-full">
            Book now
          </LinkButton>
        </div>
      )}
    </header>
  )
}
export { Navbar as default }
