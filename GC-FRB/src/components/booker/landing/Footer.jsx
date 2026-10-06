import { FOOTER } from '../../../data/booker/landing'
function Footer() {
  return (
    <footer className="bg-gc-950 text-gc-100">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-semibold text-white">Gordon College</p>
          <p className="mt-2 max-w-xs text-sm text-gc-100/70">Facility booking for classrooms, halls and shared campus spaces.</p>
        </div>
        {FOOTER.map((c) => (
          <div key={c.head}>
            <p className="font-medium text-white">{c.head}</p>
            <ul className="mt-3 space-y-2 text-sm text-gc-100/70">
              {c.links.map((l) => (
                <li key={l}>
                  <a href="#" className="hover:text-white">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="border-t border-white/10 py-5 text-center text-xs text-gc-100/60">
        © {/* @__PURE__ */ new Date().getFullYear()} Gordon College. All rights reserved.
      </p>
    </footer>
  )
}
export { Footer as default }
