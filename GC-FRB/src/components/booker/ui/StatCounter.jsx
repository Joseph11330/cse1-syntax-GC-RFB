import { useEffect, useState } from 'react'
import { useInView } from '../../../hooks/booker/useInView'
function StatCounter({ value, suffix = '', label }) {
  const [ref, seen] = useInView(0.6)
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!seen) return
    const dur = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1200
    const t0 = performance.now()
    let raf = 0
    const tick = (t) => {
      const p = dur ? Math.min((t - t0) / dur, 1) : 1
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [seen, value])
  return (
    <div ref={ref}>
      <div className="text-4xl font-semibold tabular-nums text-gc-950">
        {n}
        {suffix}
      </div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </div>
  )
}
export { StatCounter as default }
