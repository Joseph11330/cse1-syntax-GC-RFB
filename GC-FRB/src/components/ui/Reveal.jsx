import { useInView } from '../../hooks/useInView'
function Reveal({ children, delay = 0, className = '' }) {
  const [ref, seen] = useInView(0.15)
  return (
    <div ref={ref} style={{ transitionDelay: `${delay}ms` }} data-seen={seen} className={`reveal ${className}`}>
      {children}
    </div>
  )
}
export { Reveal as default }
