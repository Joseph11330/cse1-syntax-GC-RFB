import { http, USE_MOCK } from './api';
import { isoDate, toMin } from '../utils/format';
import type { Analytics, Booking, BookingInput, BookingStatus, Facility, FacilityInput } from '../types';

const wait = (ms = 350) => new Promise((r) => setTimeout(r, ms));
const fail = (m: string): never => { throw new Error(m); };
const apiErr = (e: any) => new Error(e?.response?.data?.message ?? 'Something went wrong. Try again.');

// ---------- mock data (in memory, resets on refresh) ----------
let facilities: Facility[] = [
  { id: 'F1', name: 'Covered Court', type: 'Court', capacity: 200, location: 'Main campus', status: 'Available' },
  { id: 'F2', name: 'Function Hall', type: 'Hall', capacity: 150, location: 'Admin building, 2F', status: 'Available' },
  { id: 'F3', name: 'Conference Room A', type: 'Room', capacity: 20, location: 'Admin building, 1F', status: 'Available' },
  { id: 'F4', name: 'Football Field', type: 'Field', capacity: 60, location: 'Back gate', status: 'Available' },
  { id: 'F5', name: 'Computer Lab', type: 'Room', capacity: 40, location: 'IT building', status: 'Maintenance' },
];
const people = ['Maria Santos', 'Jun Dela Cruz', 'Ana Lim', 'Paolo Cruz', 'Liza Ramos'];
const purposes = ['Team meeting', 'Training session', 'Sports practice', 'Student orientation', 'Seminar'];
let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
let bookings: Booking[] = Array.from({ length: 70 }, (_, i) => {
  const f = facilities[Math.floor(rnd() * 4)];
  const day = new Date(); day.setDate(day.getDate() - 45 + Math.floor(rnd() * 56));
  const sh = 8 + Math.floor(rnd() * 8), len = 1 + Math.floor(rnd() * 3);
  const past = day < new Date();
  const r = rnd();
  const status: BookingStatus = past ? (r < 0.72 ? 'Approved' : r < 0.86 ? 'Rejected' : 'Cancelled') : (r < 0.5 ? 'Pending' : 'Approved');
  return { id: `B-${1000 + i}`, facilityId: f.id, facilityName: f.name, requester: people[Math.floor(rnd() * 5)], purpose: purposes[Math.floor(rnd() * 5)],
    date: isoDate(day), start: `${String(sh).padStart(2, '0')}:00`, end: `${String(sh + len).padStart(2, '0')}:00`, status };
}).sort((a, b) => b.date.localeCompare(a.date));

const overlaps = (a: { start: string; end: string }, b: { start: string; end: string }) => toMin(a.start) < toMin(b.end) && toMin(b.start) < toMin(a.end);

function compute(days: number): Analytics {
  const from = new Date(); from.setDate(from.getDate() - days);
  const rows = bookings.filter((b) => b.date >= isoDate(from));
  const approved = rows.filter((b) => b.status === 'Approved');
  const decided = rows.filter((b) => b.status === 'Approved' || b.status === 'Rejected').length;
  const hrs = (b: Booking) => (toMin(b.end) - toMin(b.start)) / 60;
  const byFacility = facilities.map((f) => {
    const mine = approved.filter((b) => b.facilityId === f.id);
    return { label: f.name, value: mine.length, hours: mine.reduce((s, b) => s + hrs(b), 0) };
  }).sort((a, b) => b.value - a.value);
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return {
    total: rows.length, approvalRate: decided ? Math.round((approved.length / decided) * 100) : 0,
    hours: approved.reduce((s, b) => s + hrs(b), 0), topFacility: byFacility[0]?.value ? byFacility[0].label : '—',
    byFacility,
    byStatus: (['Approved', 'Pending', 'Rejected', 'Cancelled'] as const).map((s) => ({ label: s, value: rows.filter((b) => b.status === s).length })),
    byWeekday: wd.map((label, i) => ({ label, value: approved.filter((b) => new Date(b.date + 'T00:00:00').getDay() === i).length })),
  };
}

// ---------- API (backend routes assumed: /facilities, /bookings, /bookings/:id/status, /analytics) ----------
export const facilitiesApi = {
  async list(): Promise<Facility[]> {
    if (USE_MOCK) { await wait(); return [...facilities]; }
    return (await http.get('/facilities')).data;
  },
  async save(input: FacilityInput, id?: string): Promise<void> {
    if (USE_MOCK) {
      await wait();
      if (facilities.some((f) => f.id !== id && f.name.toLowerCase() === input.name.toLowerCase())) fail('A facility with this name already exists.');
      if (id) facilities = facilities.map((f) => (f.id === id ? { ...f, ...input } : f));
      else facilities = [...facilities, { ...input, id: `F${Date.now()}` }];
      return;
    }
    try { id ? await http.put(`/facilities/${id}`, input) : await http.post('/facilities', input); } catch (e) { throw apiErr(e); }
  },
  async remove(id: string): Promise<void> {
    if (USE_MOCK) { await wait(); facilities = facilities.filter((f) => f.id !== id); return; }
    try { await http.delete(`/facilities/${id}`); } catch (e) { throw apiErr(e); }
  },
};

export const bookingsApi = {
  async list(): Promise<Booking[]> {
    if (USE_MOCK) { await wait(); return [...bookings]; }
    return (await http.get('/bookings')).data;
  },
  async create(input: BookingInput): Promise<void> {
    if (USE_MOCK) {
      await wait();
      const f = facilities.find((x) => x.id === input.facilityId) ?? fail('Choose a facility.');
      const clash = bookings.find((b) => b.facilityId === input.facilityId && b.date === input.date && (b.status === 'Approved' || b.status === 'Pending') && overlaps(b, input));
      if (clash) fail(`${f.name} is already booked on that date (${clash.start}–${clash.end}, ${clash.status}). Pick another time.`);
      bookings = [{ ...input, id: `B-${Date.now()}`, facilityName: f.name, status: 'Pending' }, ...bookings];
      return;
    }
    try { await http.post('/bookings', input); } catch (e) { throw apiErr(e); }
  },
  async setStatus(id: string, status: BookingStatus): Promise<void> {
    if (USE_MOCK) { await wait(200); bookings = bookings.map((b) => (b.id === id ? { ...b, status } : b)); return; }
    try { await http.patch(`/bookings/${id}/status`, { status }); } catch (e) { throw apiErr(e); }
  },
};

export const analyticsApi = {
  async summary(days: number): Promise<Analytics> {
    if (USE_MOCK) { await wait(); return compute(days); }
    return (await http.get('/analytics', { params: { days } })).data;
  },
};
