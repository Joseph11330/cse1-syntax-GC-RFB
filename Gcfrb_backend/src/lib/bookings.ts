/* ------------------------------------------------------------------ *
 * Shared helpers for everything that touches the `bookings` and `rooms` tables.
 *
 *   bookings (booking_id uuid, user_id uuid, room_id, booking_date date,
 *             start_time text, end_time text, purpose, event_type, booking_status, created_at)
 *   rooms    (room_id, room_number, room_name, building, floor int, room_type,
 *             capacity, is_available, created_at)
 * ------------------------------------------------------------------ */

// Campus runs on Philippine time (UTC+8, no DST). The server may run in UTC,
// so dates/hours are computed explicitly instead of from server-local time.
export const APP_TZ = 'Asia/Manila';
export const APP_TZ_OFFSET = '+08:00';

// booking_status values used by the app: pending, approved, rejected, cancelled.
// 'confirmed' / 'declined' / 'completed' are accepted as aliases.
export const ACTIVE_STATUSES = ['pending', 'approved', 'confirmed'];
export const APPROVED_STATUSES = ['approved', 'confirmed'];
export const CANCELLED_STATUSES = ['cancelled', 'rejected', 'declined'];

export const norm = (s: unknown) => String(s ?? '').toLowerCase();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);
export const isDateStr = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

/* ---------- time ---------- */

/** 'YYYY-MM-DD' for the given instant in Manila time. */
export function manilaDate(d: Date): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: APP_TZ,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(d);
}

/** Minutes after midnight (Manila time) for the given instant. */
export function manilaMinutes(d: Date): number {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: APP_TZ,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).formatToParts(d);
    const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0) % 24;
    const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
    return h * 60 + m;
}

/**
 * start_time / end_time are stored as text. The terminal app writes "09:00 AM",
 * but "13:00", "9:00" and "09:00:00" are accepted too. Returns minutes after midnight, or null.
 */
export function parseClock(value: unknown): number | null {
    const m = String(value ?? '').trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
    if (!m) return null;
    let h = Number(m[1]);
    const min = Number(m[2]);
    const mer = m[3]?.toUpperCase();
    if (mer === 'PM' && h < 12) h += 12;
    if (mer === 'AM' && h === 12) h = 0;
    if (h > 24 || min > 59) return null;
    return h * 60 + min;
}

/** Minutes -> "09:00 AM" (the format already stored by the terminal app). */
export function formatClock(minutes: number): string {
    const h24 = Math.floor(minutes / 60) % 24;
    const m = minutes % 60;
    const mer = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${mer}`;
}

/** Minutes -> "13:00" (24-hour, what the web UI uses). */
export function clock24(minutes: number): string {
    return `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** booking_date + clock minutes -> epoch ms in Manila time. */
export function toMs(date: string, minutes: number): number {
    return new Date(`${date}T${clock24(minutes)}:00${APP_TZ_OFFSET}`).getTime();
}

export const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) =>
    aStart < bEnd && bStart < aEnd;

/* ---------- display names ---------- */

/** "main" / "Main" / "main building" -> "Main Building" (matches the building list in the UI). */
export function displayBuilding(b: unknown): string {
    const t = String(b ?? '').trim().replace(/\s+/g, ' ');
    if (!t) return '';
    const title = t.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    return /building$/i.test(title) ? title : `${title} Building`;
}

/** 3 -> "3rd floor" */
export function ordinalFloor(n: unknown): string {
    const v = Number(n);
    if (!Number.isInteger(v) || n === null || n === '') return '';
    const mod100 = v % 100;
    const suffix = mod100 >= 11 && mod100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[v % 10] ?? 'th';
    return `${v}${suffix} floor`;
}

/** Map free-text room_type onto the three chips in the UI (Meeting room / Lab / Hall). */
export function displayRoomType(t: unknown): string | null {
    const raw = String(t ?? '').trim();
    if (!raw) return null;
    const k = raw.toLowerCase();
    if (/lab/.test(k)) return 'Lab';
    if (/hall|gym|auditorium|function/.test(k)) return 'Hall';
    if (/meeting|conference|avr|seminar/.test(k)) return 'Meeting room';
    return raw.replace(/\b\w/g, (c) => c.toUpperCase());
}

export const roomName = (r: any) => String(r?.room_name ?? r?.room_number ?? 'Room').trim();

/** booking_id (uuid) -> short human reference, e.g. GC-4F2A9B */
export const bookingReference = (id: unknown) =>
    `GC-${String(id).replace(/-/g, '').slice(0, 6).toUpperCase()}`;

/* ---------- booking rows ---------- */

export const BOOKING_SELECT = `
    booking_id,
    user_id,
    room_id,
    booking_date,
    start_time,
    end_time,
    purpose,
    event_type,
    booking_status,
    rooms ( room_name, room_number, building )
`;

export interface Shaped {
    id: string;
    reference: string;
    facility: string;
    building: string;
    date: string;
    start: string;
    end: string;
    startTime: string;
    endTime: string;
    purpose: string;
    eventType: string | null;
    status: string;
    who?: string;
    email?: string;
    startMs: number;
    endMs: number;
}

export function shapeBooking(r: any, now: number): Shaped {
    const date = String(r.booking_date ?? '').slice(0, 10);
    const sMin = parseClock(r.start_time) ?? 0;
    const eMin = parseClock(r.end_time) ?? 24 * 60 - 1;
    const startMs = toMs(date, sMin);
    const endMs = toMs(date, eMin);

    // Nothing flips approved bookings to 'completed', so an approved booking
    // whose end time has passed is reported as completed.
    let status = norm(r.booking_status);
    if (APPROVED_STATUSES.includes(status) && endMs < now) status = 'completed';

    const shaped: Shaped = {
        id: r.booking_id,
        reference: bookingReference(r.booking_id),
        facility: r.rooms ? roomName(r.rooms) : 'Unknown',
        building: displayBuilding(r.rooms?.building),
        date,
        start: clock24(sMin),
        end: clock24(eMin),
        startTime: new Date(startMs).toISOString(),
        endTime: new Date(endMs).toISOString(),
        purpose: r.purpose ?? '',
        eventType: r.event_type ?? null,
        status,
        startMs,
        endMs,
    };
    if (r.users) {
        shaped.who = r.users.full_name ?? 'Unknown';
        shaped.email = r.users.email ?? '';
    }
    return shaped;
}

/** Strip internal fields before sending to the client. */
export const publicBooking = ({ startMs, endMs, ...rest }: Shaped) => rest;
