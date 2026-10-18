import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import {
    ACTIVE_STATUSES,
    APPROVED_STATUSES,
    BOOKING_SELECT,
    isUuid,
    manilaDate,
    norm,
    parseClock,
    publicBooking,
    shapeBooking,
    toMs,
} from '../lib/bookings';
import { decideBooking } from '../lib/bookingService';

/* ------------------------------------------------------------------ *
 * Admin dashboard — works on bookings / rooms / users / booking_approvals.
 *
 *   GET   /api/admin/dashboard
 *     { stats:            { facilities, activeRooms, todaysBookings, utilizationPct, pendingCount },
 *       pendingApprovals: [booking],         // oldest slot first, upcoming only
 *       roomStatus:       { available, reserved, maintenance },
 *       todaysSchedule:   [{ id, reference, facility, building, start, end, purpose, who }] }
 *   GET   /api/admin/bookings?status=&date=  -> { bookings: [booking] }
 *   GET   /api/admin/reservations/pending    -> { reservations: [booking] }
 *   PATCH /api/admin/reservations/:id/approve | /reject   body: { note? }
 *
 *   booking = { id, reference, who, email, facility, building, date, start, end,
 *               startTime, endTime, purpose, eventType, status }
 * ------------------------------------------------------------------ */

const ADMIN_BOOKING_SELECT = `${BOOKING_SELECT.trimEnd()},
    users ( full_name, email )`;

// Utilization = approved hours this week / (bookable rooms × 8 h × 5 days)
const HOURS_PER_DAY = 8;
const DAYS_PER_WEEK = 5;

/** Monday and Sunday (YYYY-MM-DD) of the week containing the given Manila date. */
function weekRange(today: string): [string, string] {
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    const monday = d.toISOString().slice(0, 10);
    d.setUTCDate(d.getUTCDate() + 6);
    return [monday, d.toISOString().slice(0, 10)];
}

export const getAdminDashboard = async (_req: Request, res: Response) => {
    try {
        const now = Date.now();
        const today = manilaDate(new Date(now));
        const [monday, sunday] = weekRange(today);

        const [roomsRes, pendingRes, todayRes, weekRes] = await Promise.all([
            supabase.from('rooms').select('room_id, room_name, room_number, building, is_available'),
            supabase
                .from('bookings')
                .select(ADMIN_BOOKING_SELECT)
                .eq('booking_status', 'pending')
                .gte('booking_date', today),
            supabase
                .from('bookings')
                .select(ADMIN_BOOKING_SELECT)
                .eq('booking_date', today)
                .in('booking_status', ACTIVE_STATUSES),
            supabase
                .from('bookings')
                .select('room_id, start_time, end_time')
                .in('booking_status', APPROVED_STATUSES)
                .gte('booking_date', monday)
                .lte('booking_date', sunday),
        ]);

        const failed = roomsRes.error ?? pendingRes.error ?? todayRes.error ?? weekRes.error;
        if (failed) {
            console.error('getAdminDashboard query error:', failed);
            return res.status(500).json({ error: 'Failed to load dashboard' });
        }

        const rooms = (roomsRes.data ?? []) as any[];
        const todays = ((todayRes.data ?? []) as any[]).map((r) => shapeBooking(r, now));

        /* ---- rooms ---- */
        const inUseNow = new Set<number>();
        for (const r of (todayRes.data ?? []) as any[]) {
            if (!APPROVED_STATUSES.includes(norm(r.booking_status))) continue;
            const s = parseClock(r.start_time);
            const e = parseClock(r.end_time);
            if (s !== null && e !== null && toMs(today, s) <= now && toMs(today, e) > now) inUseNow.add(r.room_id);
        }
        const roomStatus = { available: 0, reserved: 0, maintenance: 0 };
        for (const room of rooms) {
            if (room.is_available === false) roomStatus.maintenance++;
            else if (inUseNow.has(room.room_id)) roomStatus.reserved++;
            else roomStatus.available++;
        }
        const activeRooms = rooms.filter((r) => r.is_available !== false).length;

        /* ---- utilization this week ---- */
        let bookedHours = 0;
        for (const b of (weekRes.data ?? []) as any[]) {
            const s = parseClock(b.start_time);
            const e = parseClock(b.end_time);
            if (s !== null && e !== null && e > s) bookedHours += (e - s) / 60;
        }
        const capacityHours = activeRooms * HOURS_PER_DAY * DAYS_PER_WEEK;
        const utilizationPct = capacityHours ? Math.min(100, Math.round((bookedHours / capacityHours) * 100)) : 0;

        /* ---- pending list: only slots that haven't ended ---- */
        const pending = ((pendingRes.data ?? []) as any[])
            .map((r) => shapeBooking(r, now))
            .filter((b) => b.endMs >= now)
            .sort((a, b) => a.startMs - b.startMs);

        const todaysSchedule = todays
            .filter((b) => APPROVED_STATUSES.includes(b.status) || b.status === 'completed')
            .sort((a, b) => a.startMs - b.startMs)
            .map((b) => ({
                id: b.id,
                reference: b.reference,
                facility: b.facility,
                building: b.building,
                start: b.start,
                end: b.end,
                purpose: b.purpose,
                who: b.who ?? '',
            }));

        return res.json({
            stats: {
                facilities: rooms.length,
                activeRooms,
                todaysBookings: todays.length,
                utilizationPct,
                pendingCount: pending.length,
            },
            pendingApprovals: pending.slice(0, 10).map(publicBooking),
            roomStatus,
            todaysSchedule,
        });
    } catch (err) {
        console.error('getAdminDashboard error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const listAllBookings = async (req: Request, res: Response) => {
    try {
        let query = supabase.from('bookings').select(ADMIN_BOOKING_SELECT).limit(500);
        const date = req.query.date;
        if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) query = query.eq('booking_date', date);

        const { data, error } = await query;
        if (error) {
            console.error('listAllBookings error:', error);
            return res.status(500).json({ error: 'Failed to load bookings' });
        }

        const now = Date.now();
        let rows = ((data ?? []) as any[]).map((r) => shapeBooking(r, now));

        // filter on the status the UI shows (approved + past = completed)
        const wanted = norm(req.query.status);
        if (wanted) {
            const accept =
                wanted === 'approved' || wanted === 'confirmed'
                    ? APPROVED_STATUSES
                    : wanted === 'cancelled'
                        ? ['cancelled', 'rejected', 'declined']
                        : [wanted];
            rows = rows.filter((b) => accept.includes(b.status));
        }

        rows.sort((a, b) => b.startMs - a.startMs);
        return res.json({ bookings: rows.map(publicBooking) });
    } catch (err) {
        console.error('listAllBookings error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const listPendingReservations = async (_req: Request, res: Response) => {
    try {
        const { data, error } = await supabase
            .from('bookings')
            .select(ADMIN_BOOKING_SELECT)
            .eq('booking_status', 'pending');

        if (error) {
            console.error('listPendingReservations error:', error);
            return res.status(500).json({ error: 'Failed to load pending reservations' });
        }

        const now = Date.now();
        const rows = ((data ?? []) as any[]).map((r) => shapeBooking(r, now)).sort((a, b) => a.startMs - b.startMs);
        return res.json({ reservations: rows.map(publicBooking) });
    } catch (err) {
        console.error('listPendingReservations error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const decide = (decision: 'approved' | 'rejected') => async (req: Request, res: Response) => {
    try {
        const adminId = req.user?.id;
        if (!adminId) return res.status(401).json({ error: 'Unauthorized' });

        const id = req.params.id;
        if (!isUuid(id)) return res.status(400).json({ error: 'Invalid booking id' });

        const note = typeof req.body?.note === 'string' && req.body.note.trim() ? req.body.note.trim() : null;
        const result = await decideBooking({ bookingId: id, adminId, decision, note });
        if (!result.ok) return res.status(result.status).json({ error: result.error });

        return res.json({
            message: decision === 'approved' ? 'Reservation approved' : 'Reservation rejected',
            reservation: result.data,
        });
    } catch (err) {
        console.error(`${decision} reservation error:`, err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const approveReservation = decide('approved');
export const rejectReservation = decide('rejected');
