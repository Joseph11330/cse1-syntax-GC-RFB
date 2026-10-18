import { supabase } from '../config/supabase';
import {
    APPROVED_STATUSES,
    isDateStr,
    norm,
    overlaps,
    parseClock,
    formatClock,
    toMs,
    bookingReference,
} from './bookings';

/* ------------------------------------------------------------------ *
 * Booking rules shared by the website API and the terminal apps, so a booking
 * made (or approved) in one place obeys exactly the same checks as the other.
 * ------------------------------------------------------------------ */

export type Result<T> = { ok: true; data: T } | { ok: false; status: number; error: string };
const fail = (status: number, error: string): Result<never> => ({ ok: false, status, error });

export const EVENT_TYPES = ['class', 'meeting', 'exam', 'event', 'other'];

/** First booking on that room/date that overlaps the given minutes, or null. */
export async function findConflict(
    roomId: number,
    date: string,
    startMin: number,
    endMin: number,
    statuses: string[],
    excludeId?: string
): Promise<Result<any | null>> {
    const { data, error } = await supabase
        .from('bookings')
        .select('booking_id, start_time, end_time, booking_status')
        .eq('room_id', roomId)
        .eq('booking_date', date)
        .in('booking_status', statuses);

    if (error) {
        console.error('findConflict error:', error);
        return fail(500, 'Could not check room availability');
    }

    for (const b of (data ?? []) as any[]) {
        if (excludeId && b.booking_id === excludeId) continue;
        const s = parseClock(b.start_time);
        const e = parseClock(b.end_time);
        if (s === null || e === null) continue;
        if (overlaps(startMin, endMin, s, e)) return { ok: true, data: b };
    }
    return { ok: true, data: null };
}

export interface NewBooking {
    userId: string;
    roomId: number;
    date: string; // YYYY-MM-DD (Manila)
    startMin: number;
    endMin: number;
    purpose: string;
    eventType?: string;
    attendees?: number | null;
    /** Extra columns (description, department, ...). Used only if the table has them. */
    extras?: Record<string, unknown>;
}

export async function createBooking(input: NewBooking): Promise<Result<{ booking: any; room: any }>> {
    const { userId, roomId, date, startMin, endMin } = input;

    if (!isDateStr(date)) return fail(400, 'Invalid date');
    if (!(endMin > startMin)) return fail(400, 'End time must be after the start time');
    if (toMs(date, startMin) < Date.now()) return fail(400, 'That time has already passed');
    if (!input.purpose?.trim()) return fail(400, 'Purpose is required');

    const { data: room, error: roomErr } = await supabase
        .from('rooms')
        .select('*')
        .eq('room_id', roomId)
        .maybeSingle();

    if (roomErr) {
        console.error('createBooking room error:', roomErr);
        return fail(500, 'Could not load the room');
    }
    if (!room) return fail(404, 'Room not found');
    if (room.is_available === false) return fail(409, 'This room is not available for booking');
    if (input.attendees && room.capacity && input.attendees > room.capacity) {
        return fail(400, `This room holds up to ${room.capacity} people`);
    }

    // pending requests hold the slot too, so two students can't request the same time
    const conflict = await findConflict(roomId, date, startMin, endMin, ['pending', 'approved', 'confirmed']);
    if (!conflict.ok) return conflict;
    if (conflict.data) return fail(409, 'That time slot is already booked for this room');

    const eventType = EVENT_TYPES.includes(norm(input.eventType)) ? norm(input.eventType) : 'event';
    const core = {
        user_id: userId,
        room_id: roomId,
        booking_date: date,
        start_time: formatClock(startMin),
        end_time: formatClock(endMin),
        purpose: input.purpose.trim(),
        event_type: eventType,
        booking_status: 'pending',
    };

    // Try with the optional detail columns first; if the table doesn't have them, save the core row.
    let result: any = null;
    if (input.extras && Object.keys(input.extras).length) {
        result = await supabase.from('bookings').insert({ ...core, ...input.extras }).select().single();
        if (result.error && !['PGRST204', '42703'].includes(String(result.error.code))) {
            console.error('createBooking insert error:', result.error);
            return fail(500, 'Could not save your booking');
        }
        if (result.error) result = null;
    }
    if (!result) {
        result = await supabase.from('bookings').insert(core).select().single();
        if (result.error) {
            console.error('createBooking insert error:', result.error);
            const fk = String(result.error.code) === '23503';
            return fail(fk ? 400 : 500, fk ? 'Your account is not linked to the bookings table' : 'Could not save your booking');
        }
    }

    return { ok: true, data: { booking: result.data, room } };
}

export type Decision = 'approved' | 'rejected' | 'cancelled' | 'pending';

/**
 * Admin decision on a booking. Approving checks for overlaps with other approved bookings,
 * records the decision in booking_approvals and notifies the student.
 */
export async function decideBooking(input: {
    bookingId: string;
    adminId: string;
    decision: Decision;
    note?: string | null;
}): Promise<Result<any>> {
    const { bookingId, adminId, decision } = input;

    const { data: b, error } = await supabase
        .from('bookings')
        .select('booking_id, user_id, room_id, booking_date, start_time, end_time, purpose, booking_status')
        .eq('booking_id', bookingId)
        .maybeSingle();

    if (error) {
        console.error('decideBooking fetch error:', error);
        return fail(500, 'Could not load the booking');
    }
    if (!b) return fail(404, 'Booking not found');

    const current = norm(b.booking_status);
    if (current === decision || (decision === 'approved' && current === 'confirmed')) {
        return fail(409, `Booking is already ${decision}`);
    }

    if (decision === 'approved') {
        const s = parseClock(b.start_time);
        const e = parseClock(b.end_time);
        if (s !== null && e !== null) {
            const conflict = await findConflict(b.room_id, String(b.booking_date).slice(0, 10), s, e, APPROVED_STATUSES, bookingId);
            if (!conflict.ok) return conflict;
            if (conflict.data) {
                return fail(409, `Time slot already approved for another booking (${conflict.data.start_time} – ${conflict.data.end_time})`);
            }
        }
    }

    const { data: updated, error: updErr } = await supabase
        .from('bookings')
        .update({ booking_status: decision })
        .eq('booking_id', bookingId)
        .select()
        .single();

    if (updErr) {
        console.error('decideBooking update error:', updErr);
        return fail(500, 'Could not update the booking');
    }

    // The status change above is what matters; the audit row and the notification are best-effort.
    if (decision === 'approved' || decision === 'rejected') {
        const { error: apprErr } = await supabase.from('booking_approvals').insert({
            booking_id: bookingId,
            approver_id: adminId,
            approval_status: decision,
            comments: input.note ?? null,
            approved_at: new Date().toISOString(),
        });
        if (apprErr) console.error('booking_approvals insert error:', apprErr);
    }

    if (decision !== 'pending' && b.user_id) {
        const ref = bookingReference(bookingId);
        const verb = { approved: 'approved', rejected: 'rejected', cancelled: 'cancelled' }[decision];
        const { error: noteErr } = await supabase.from('notifications').insert({
            user_id: b.user_id,
            title: `Booking ${verb}`,
            message: `Your booking ${ref} for ${String(b.booking_date).slice(0, 10)} (${b.start_time} – ${b.end_time}) was ${verb}.${input.note ? ` Note: ${input.note}` : ''}`,
            notification_type: 'booking',
        });
        if (noteErr) console.error('notification insert error:', noteErr);
    }

    return { ok: true, data: updated };
}

/** How many bookings would be wiped if this room were deleted (bookings.room_id is ON DELETE CASCADE). */
export async function countRoomBookings(roomId: number): Promise<number> {
    const { count, error } = await supabase
        .from('bookings')
        .select('booking_id', { count: 'exact', head: true })
        .eq('room_id', roomId);
    if (error) {
        console.error('countRoomBookings error:', error);
        return -1;
    }
    return count ?? 0;
}
