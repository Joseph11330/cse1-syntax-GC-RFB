import { Link } from 'react-router-dom'

const styles = {
  solid: 'bg-gc-600 text-white hover:bg-gc-700 shadow-lg shadow-gc-950/20',
  outline: 'border border-gc-600/40 text-gc-800 hover:bg-gc-50',
  light: 'bg-white text-gc-900 hover:bg-gc-50',
}
// Pass `to` for in-app (SPA) navigation, or `href` for #anchors and external links
function LinkButton({ variant = 'solid', className = '', to, ...rest }) {
  const Tag = to ? Link : 'a'
  return (
    <Tag
      {...(to ? { to } : {})}
      {...rest}
      className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gc-500 ${styles[variant]} ${className}`}
    />
  )
}
export { LinkButton as default }
