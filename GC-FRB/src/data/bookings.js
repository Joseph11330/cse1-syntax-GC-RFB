// Shared in-memory bookings (replace with API calls later)
export const STATUSES = ['Pending', 'Confirmed', 'Completed', 'Cancelled']
export const STATUS_TONE = { Pending: 'yellow', Confirmed: 'blue', Completed: 'green', Cancelled: 'red' }

let bookings = [
  { id: 1, who: 'Jasmine Marcado', dept: 'Student Council', room: 'Conference Room A', date: '2026-09-10', start: '13:00', end: '15:00', purpose: 'Officer Meeting', speaker: '-', description: 'Monthly officer meeting to review ongoing student council projects and upcoming events.', equipment: 'Extension chords', guests: 12, remarks: 'None', status: 'Pending' },
  { id: 2, who: 'Ronald Mendoza', dept: 'CS Department', room: 'Computer Lab 2', date: '2026-09-10', start: '15:30', end: '17:00', purpose: 'Coding Workshop', speaker: 'Prof. Reyes', description: 'Hands-on coding workshop for second-year students.', equipment: 'Projector', guests: 30, remarks: 'None', status: 'Cancelled' },
  { id: 3, who: 'Ana Lopez', dept: 'CEAS Department', room: 'Function Hall', date: '2026-09-11', start: '09:00', end: '11:00', purpose: 'General Assembly', speaker: '-', description: 'Department general assembly.', equipment: 'Sound system', guests: 150, remarks: 'None', status: 'Confirmed' },
  { id: 4, who: 'Dave Castillo', dept: 'CHTM Department', room: 'PE Hall', date: '2026-09-12', start: '13:00', end: '18:00', purpose: 'Recognition Night', speaker: '-', description: 'Annual recognition night for outstanding students.', equipment: 'Stage lights, microphones', guests: 400, remarks: 'Needs setup at noon', status: 'Pending' },
  { id: 5, who: 'Miguel Santos', dept: 'CHTM Department', room: 'Function Hall', date: '2026-09-12', start: '08:00', end: '12:00', purpose: 'General Assembly', speaker: '-', description: 'General assembly for CHTM students.', equipment: 'Sound system', guests: 120, remarks: 'None', status: 'Completed' },
  { id: 6, who: 'Kim Pineda', dept: 'CCS Department', room: 'Function Hall', date: '2026-09-08', start: '13:00', end: '18:00', purpose: 'Recognition Day', speaker: '-', description: 'Recognition day program.', equipment: 'None', guests: 100, remarks: 'None', status: 'Cancelled' },
]

const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
export const fmtTime = (t) => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}` }
export const fmtDate = (d, year = true) =>
  new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(year && { year: 'numeric' }) })
export const whenLabel = (b) => `${fmtDate(b.date)} ${fmtTime(b.start)} - ${fmtTime(b.end)}`
export const detailWhen = (b) => `${fmtDate(b.date, false)}, ${fmtTime(b.start)} - ${fmtTime(b.end)}`
export const initials = (name) => name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

export const getBookings = () => bookings
export const getBooking = (id) => bookings.find((b) => b.id === Number(id))

// A confirmed booking in the same room that overlaps the same time window
export const findConflict = (b, ignoreId) =>
  bookings.find((x) => x.id !== ignoreId && x.room === b.room && x.date === b.date && x.status === 'Confirmed'
    && toMin(b.start) < toMin(x.end) && toMin(x.start) < toMin(b.end))

const setStatus = (id, status) => { bookings = bookings.map((b) => (b.id === Number(id) ? { ...b, status } : b)) }

export const acceptBooking = (id) => {
  const conflict = findConflict(getBooking(id), Number(id))
  if (conflict) return { ok: false, conflict }
  setStatus(id, 'Confirmed')
  return { ok: true }
}
export const rejectBooking = (id) => setStatus(id, 'Cancelled')

export const addBooking = (b) => {
  const id = bookings.reduce((m, x) => Math.max(m, x.id), 0) + 1
  bookings = [{ id, status: 'Confirmed', ...b }, ...bookings]
  return id
}

export const inRange = (date, { from, to }) => (!from || date >= from) && (!to || date <= to)
