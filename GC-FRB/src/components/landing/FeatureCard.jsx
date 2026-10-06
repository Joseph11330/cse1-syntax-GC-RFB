function FeatureCard({ title, body }) {
  return (
    <div className="h-full rounded-2xl border border-gc-100 bg-white p-6 transition duration-300 hover:border-gc-500/50">
      <h3 className="font-semibold text-gc-950">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
    </div>
  )
}
export { FeatureCard as default }
