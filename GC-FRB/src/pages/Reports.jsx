import { useState } from 'react'
import { BarChart3, Calendar, Download, Printer } from 'lucide-react'
import { Card } from '../components/ui'
import { REPORT } from '../data/report'
import { downloadReportPdf } from '../lib/reportPdf'
import logo from '../assets/logo-sidebar.png'

export default function Reports() {
  const [busy, setBusy] = useState(false)
  const max = Math.max(...REPORT.week.map(([, v]) => v))

  const download = async () => {
    setBusy(true)
    try { await downloadReportPdf(REPORT) } finally { setBusy(false) }
  }

  return (
    <div className="report-page mx-auto max-w-5xl space-y-5">
      {/* Letterhead: only visible when printing (A4) */}
      <div className="print-only items-center justify-between border-b-2 border-gc-900 pb-3">
        <div className="flex items-center gap-3">
          <img src={logo} alt="" className="size-14 rounded-full" />
          <div className="leading-tight">
            <p className="text-lg font-extrabold text-gc-900">GORDON COLLEGE</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#c9a227]">Room Booking</p>
            <p className="text-[10px] text-slate-500">Olongapo City, Philippines</p>
          </div>
        </div>
        <div className="text-right leading-tight">
          <p className="text-base font-extrabold text-gc-900">{REPORT.title}</p>
          <p className="text-[10px] text-slate-500">Period: {REPORT.range}</p>
          <p className="text-[10px] text-slate-500">Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="no-print grid h-12 w-12 place-items-center rounded-xl bg-gc-100 text-gc-800"><BarChart3 size={22} /></div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Report</h1>
            <p className="text-xs text-slate-500">Booking volume, top spaces and utilization across the building.</p>
          </div>
        </div>
        <div className="no-print flex gap-3">
          <button onClick={() => window.print()} className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50"><Printer size={14} /> Print</button>
          <button onClick={download} disabled={busy} className="flex items-center gap-2 rounded-lg bg-gc-900 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-gc-900/25 hover:bg-gc-800 disabled:opacity-60"><Download size={14} /> {busy ? 'Preparing…' : 'Download PDF'}</button>
        </div>
      </div>

      <Card className="space-y-4 p-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-1.5 text-[11px] font-medium text-slate-700"><Calendar size={13} className="text-gc-600" /> {REPORT.range}</div>

        <div className="grid grid-cols-2 gap-4">
          <Card className="p-5">
            <h2 className="text-[11px] font-extrabold uppercase tracking-wide text-gc-900">Bookings this week</h2>
            <div className="mt-4 flex h-44 items-end gap-3">
              {REPORT.week.map(([d, v], i) => (
                <div key={d} className="flex flex-1 flex-col items-center justify-end" title={`${d}: ${v} bookings`}>
                  <div className={`w-full ${i >= 5 ? 'bg-[#e8b93d]' : 'bg-gc-900'}`} style={{ height: `${(v / max) * 100}%` }} />
                  <span className="mt-1 text-[9px] font-medium text-slate-500">{d}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="text-[11px] font-extrabold uppercase tracking-wide text-gc-900">Utilization by facility type</h2>
            <div className="mt-5 space-y-5">
              {REPORT.utilization.map(([l, p]) => (
                <div key={l} className="flex items-center gap-3 text-[11px]">
                  <span className="w-24 shrink-0 text-slate-600">{l}</span>
                  <div className="h-1.5 flex-1 rounded-full bg-slate-200"><div className="h-full rounded-full bg-gc-900" style={{ width: `${p}%` }} /></div>
                  <span className="w-8 text-right font-semibold text-slate-700">{p}%</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <h2 className="px-5 pt-5 text-[11px] font-extrabold uppercase tracking-wide text-gc-900">Most requested facilities</h2>
          <table className="mt-3 w-full text-left text-xs">
            <thead className="text-[10px] uppercase tracking-wider text-slate-500">
              <tr>{['Facility', 'Requested this month', 'Approval rate %', 'Avg. duration'].map((h, i) => <th key={h} className={`px-5 py-2 font-semibold ${i ? 'text-center' : ''}`}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {REPORT.top.map((r) => (
                <tr key={r[0]} className="border-t border-slate-200 odd:bg-gc-50/60">
                  {r.map((c, i) => <td key={i} className={`px-5 py-3 ${i ? 'text-center' : 'font-medium'}`}>{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </Card>
    </div>
  )
}
