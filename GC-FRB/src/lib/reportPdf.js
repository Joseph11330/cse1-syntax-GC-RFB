import logo from '../assets/logo-sidebar.png'

const GREEN = [10, 74, 18]
const GOLD = [232, 184, 61]
const GRAY = [110, 118, 110]

const loadLogo = (src) =>
  new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = c.height = 240
      c.getContext('2d').drawImage(img, 0, 0, 240, 240)
      resolve(c.toDataURL('image/png'))
    }
    img.onerror = () => resolve(null)
    img.src = src
  })

// Builds an A4 (210 x 297 mm) PDF with a header on top
export async function downloadReportPdf(report) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const M = 15
  const W = 210 - M * 2

  // ---- Header ----
  const img = await loadLogo(logo)
  if (img) doc.addImage(img, 'PNG', M, 12, 18, 18)
  doc.setTextColor(...GREEN).setFont('helvetica', 'bold').setFontSize(15).text('GORDON COLLEGE', M + 22, 19)
  doc.setTextColor(...GOLD).setFontSize(8).text('ROOM BOOKING', M + 22, 24)
  doc.setTextColor(...GRAY).setFont('helvetica', 'normal').setFontSize(8).text('Olongapo City, Philippines', M + 22, 28.5)
  doc.setTextColor(...GREEN).setFont('helvetica', 'bold').setFontSize(13).text(report.title, 210 - M, 19, { align: 'right' })
  doc.setTextColor(...GRAY).setFont('helvetica', 'normal').setFontSize(8)
  doc.text(`Period: ${report.range}`, 210 - M, 24, { align: 'right' })
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`, 210 - M, 28.5, { align: 'right' })
  doc.setDrawColor(...GREEN).setLineWidth(0.8).line(M, 33, M + W, 33)

  // ---- Bookings this week ----
  let y = 44
  const section = (t, yy) => doc.setTextColor(...GREEN).setFont('helvetica', 'bold').setFontSize(10).text(t, M, yy)
  section('BOOKINGS THIS WEEK', y)
  const chartTop = y + 6, chartH = 55, base = chartTop + chartH
  const max = Math.max(...report.week.map(([, v]) => v))
  const slot = W / report.week.length
  report.week.forEach(([day, v], i) => {
    const h = (v / max) * (chartH - 8)
    const x = M + i * slot + slot * 0.2
    doc.setFillColor(...(i >= 5 ? GOLD : GREEN)).rect(x, base - h, slot * 0.6, h, 'F')
    doc.setTextColor(...GREEN).setFont('helvetica', 'bold').setFontSize(8).text(String(v), x + slot * 0.3, base - h - 1.5, { align: 'center' })
    doc.setTextColor(...GRAY).setFont('helvetica', 'normal').setFontSize(7.5).text(day, x + slot * 0.3, base + 5, { align: 'center' })
  })
  doc.setDrawColor(200).setLineWidth(0.2).line(M, base, M + W, base)

  // ---- Utilization ----
  y = base + 16
  section('UTILIZATION BY FACILITY TYPE', y)
  y += 8
  report.utilization.forEach(([label, pct]) => {
    doc.setTextColor(60).setFont('helvetica', 'normal').setFontSize(9).text(label, M, y + 3)
    doc.setFillColor(225).roundedRect(M + 40, y, W - 55, 4, 2, 2, 'F')
    doc.setFillColor(...GREEN).roundedRect(M + 40, y, ((W - 55) * pct) / 100, 4, 2, 2, 'F')
    doc.setTextColor(60).setFont('helvetica', 'bold').text(`${pct}%`, M + W, y + 3, { align: 'right' })
    y += 10
  })

  // ---- Most requested facilities ----
  y += 8
  section('MOST REQUESTED FACILITIES', y)
  y += 5
  const cols = [M + 3, M + 62, M + 110, M + 148]
  doc.setFillColor(...GREEN).rect(M, y, W, 8, 'F')
  doc.setTextColor(255).setFont('helvetica', 'bold').setFontSize(8)
  ;['FACILITY', 'REQUESTED THIS MONTH', 'APPROVAL RATE %', 'AVG. DURATION'].forEach((h, i) => doc.text(h, cols[i], y + 5.3))
  y += 8
  report.top.forEach((row, r) => {
    if (r % 2 === 0) doc.setFillColor(247, 250, 246).rect(M, y, W, 9, 'F')
    doc.setTextColor(40).setFont('helvetica', 'normal').setFontSize(9)
    row.forEach((c, i) => doc.text(String(c), cols[i], y + 6))
    y += 9
  })
  doc.setDrawColor(200).setLineWidth(0.2).line(M, y, M + W, y)

  // ---- Footer ----
  doc.setTextColor(...GRAY).setFontSize(7.5).text('Gordon College Room Booking - Confidential admin report', M, 289)
  doc.text('Page 1 of 1', 210 - M, 289, { align: 'right' })

  doc.save(`GC-Booking-Report-${new Date().toISOString().slice(0, 10)}.pdf`)
}
