export default function Badge({ tone = 'yellow', children }) {
  const t = {
    yellow: 'bg-[#fdf6c6] text-[#d3a52c]',
    amber: 'bg-[#fdf6c6] text-[#d3a52c]',
    green: 'bg-[#cdeccb] text-[#2f8a3a]',
    red: 'bg-[#fdd3d3] text-[#e0525a]',
    blue: 'bg-sky-100 text-sky-700',
  }[tone]
  return <span className={`inline-block min-w-[5.5rem] rounded-full px-3 py-1 text-center text-[11px] font-medium ${t}`}>{children}</span>
}
