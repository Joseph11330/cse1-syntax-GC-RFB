function SectionHeading({ title, lead, center = false }) {
  return (
    <div className={`max-w-2xl ${center ? 'mx-auto text-center' : ''}`}>
      <h2 className="text-3xl font-semibold tracking-tight text-gc-950 sm:text-4xl">{title}</h2>
      {lead && <p className="mt-3 text-base leading-relaxed text-slate-600">{lead}</p>}
    </div>
  )
}
export { SectionHeading as default }
