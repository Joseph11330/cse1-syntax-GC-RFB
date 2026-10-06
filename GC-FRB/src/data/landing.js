const NAV = [
  { label: 'Facilities', href: '#facilities' },
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how' },
  { label: 'FAQ', href: '#faq' },
]
const STATS = [
  { value: 34, suffix: '', label: 'Rooms listed' },
  { value: 1, suffix: '', label: 'Booking window' },
  { value: 1, suffix: ' hr', label: 'Typical response' },
]
const FACILITIES = [
  { name: 'Gordon College Auditorium', capacity: 500, tags: ['Stage', 'Projector', 'Sound'], status: 'Available' },
  { name: 'Gordon College AV Hall', capacity: 120, tags: ['Projector', 'Air-con'], status: 'Available' },
  { name: 'Gordon College Gym Hall', capacity: 300, tags: ['Open floor', 'Bleachers'], status: 'Pending' },
]
const FEATURES = [
  { title: 'Live availability', body: 'See which rooms are open for your date and time before you ask.' },
  { title: 'One request form', body: 'Pick a room, add your purpose and headcount. No paper sign-up sheet.' },
  { title: 'Clash protection', body: 'Overlapping bookings are flagged so two groups never get the same room.' },
  { title: 'Status you can track', body: 'Pending, approved or rejected. You always know where your request stands.' },
  { title: 'Equipment included', body: 'Request projectors, chairs and sound with the room, in the same booking.' },
  { title: 'Admin review', body: 'Facility staff approve, reschedule or decline from one dashboard.' },
]
const STEPS = [
  { title: 'Find a room', body: 'Browse the directory and filter by capacity or equipment.' },
  { title: 'Request a slot', body: 'Choose a date and time, then tell us what the room is for.' },
  { title: 'Get your answer', body: 'Staff review your request and you see the decision in the app.' },
]
const FAQ = [
  { q: 'How far ahead can I book?', a: 'Pick any open slot inside the booking window. Rooms outside it show as unavailable.' },
  {
    q: 'What happens after I submit a request?',
    a: 'It goes to facility staff as Pending. Most requests are answered within about an hour.',
  },
  {
    q: 'Can I cancel or change a booking?',
    a: 'Yes. Open the booking from your list and cancel or request a new time while it is still pending or approved.',
  },
  {
    q: 'Who approves bookings for my organization?',
    a: 'The facility office reviews every request. Organization-specific rules appear on the request form.',
  },
]
const FOOTER = [
  { head: 'Booking', links: ['Find a room', 'Book a room', 'My bookings'] },
  { head: 'Campus', links: ['Facilities', 'Student organizations', 'Events'] },
  { head: 'Support', links: ['FAQ', 'Contact the office', 'Facility rules'] },
]
export { FACILITIES, FAQ, FEATURES, FOOTER, NAV, STATS, STEPS }
