import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

/* ------------------------------------------------------------------ *
 * Student dashboard — written against the real Supabase tables:
 *   bookings (booking_id, user_id, room_id, booking_date, start_time, end_time,
 *             purpose, event_type, booking_status, created_at)
 *   rooms    (room_id, room_number, room_name, building, floor, room_type,
 *             capacity, is_available, created_at)
 *
 * Response shapes match GC-FRB/src/booker/BookerApp.jsx:
 *
 *   GET /api/student/dashboard
 *     { stats:            { upcomingBookings, pendingApproval, completedBookings, cancelled },
 *       upcomingBookings: [{ id, reference, facility, building, startTime, endTime, purpose, status }],
 *       roomStatus:       { available, reserved, maintenance },
 *       schedule:         [{ room, building, maintenance, busy: [[startHour, endHour, label], ...] }] }
 *
 *   GET    /api/student/bookings       -> { bookings: [...] }
 *   DELETE /api/student/bookings/:id   -> { message, booking }
 * ------------------------------------------------------------------ */

import {
    ACTIVE_STATUSES,
    APPROVED_STATUSES,
    BOOKING_SELECT,
    CANCELLED_STATUSES,
    Shaped,
    displayBuilding,
    isUuid,
    manilaDate,
    norm,
    parseClock,
    publicBooking,
    roomName,
    shapeBooking,
    toMs,
} from '../lib/bookings';

// Must match SCHEDULE_HOURS in BookerApp.jsx (8 AM … 5 PM columns => 8..18 window).
const SCHEDULE_START_HOUR = 8;
const SCHEDULE_END_HOUR = 18;

export const getStudentDashboard = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const now = Date.now();
        const today = manilaDate(new Date(now));

        const [myRes, roomsRes, todayRes] = await Promise.all([
            // everything this student has booked — small per-user set, counted in one pass
            supabase.from('bookings').select(BOOKING_SELECT).eq('user_id', userId),
            supabase
                .from('rooms')
                .select('room_id, room_name, room_number, building, is_available')
                .order('building', { ascending: true })
                .order('room_name', { ascending: true }),
            // every active booking today, for all users (room status + schedule grid)
            supabase
                .from('bookings')
                .select('room_id, user_id, start_time, end_time, purpose, booking_status')
                .eq('booking_date', today)
                .in('booking_status', ACTIVE_STATUSES),
        ]);

        const failed = myRes.error ?? roomsRes.error ?? todayRes.error;
        if (failed) {
            console.error('getStudentDashboard query error:', failed);
            return res.status(500).json({ error: 'Failed to load dashboard' });
        }

        /* ---- stats + upcoming list ---- */
        const mine: Shaped[] = ((myRes.data ?? []) as any[]).map((r) => shapeBooking(r, now));
        const stats = { upcomingBookings: 0, pendingApproval: 0, completedBookings: 0, cancelled: 0 };
        const upcoming: Shaped[] = [];

        for (const b of mine) {
            if (CANCELLED_STATUSES.includes(b.status)) {
                stats.cancelled++;
            } else if (b.status === 'completed') {
                stats.completedBookings++;
            } else if (ACTIVE_STATUSES.includes(b.status) && b.endMs >= now) {
                stats.upcomingBookings++;
                if (b.status === 'pending') stats.pendingApproval++;
                upcoming.push(b);
            }
        }

        upcoming.sort((a, b) => a.startMs - b.startMs);
        const upcomingBookings = upcoming.slice(0, 5).map(publicBooking);

        /* ---- room status + today's schedule ---- */
        const todays = (todayRes.data ?? []) as any[];
        const byRoom = new Map<unknown, any[]>();
        for (const b of todays) {
            const list = byRoom.get(b.room_id) ?? [];
            list.push(b);
            byRoom.set(b.room_id, list);
        }

        const roomStatus = { available: 0, reserved: 0, maintenance: 0 };
        const schedule: {
            room: string;
            building: string;
            maintenance: boolean;
            busy: [number, number, string][];
        }[] = [];

        for (const room of (roomsRes.data ?? []) as any[]) {
            // rooms has no maintenance flag — is_available = false means "not bookable"
            const maintenance = room.is_available === false;
            const bookings = byRoom.get(room.room_id) ?? [];

            const busy: [number, number, string][] = [];
            let inUse = false;

            for (const b of bookings) {
                const sMin = parseClock(b.start_time);
                const eMin = parseClock(b.end_time);
                if (sMin === null || eMin === null) continue;

                // "Reserved" = an approved booking is running right now (pending ones don't lock a room)
                if (APPROVED_STATUSES.includes(norm(b.booking_status))) {
                    if (toMs(today, sMin) <= now && toMs(today, eMin) > now) inUse = true;
                }

                // floor/ceil so partial hours still paint the cell, clipped to the grid
                const s = Math.max(SCHEDULE_START_HOUR, Math.floor(sMin / 60));
                const e = Math.min(SCHEDULE_END_HOUR, Math.ceil(eMin / 60));
                if (e <= s) continue;

                // other students' booking details stay private
                const mineToo = String(b.user_id) === String(userId);
                busy.push([s, e, mineToo ? (b.purpose || 'Your booking') : 'Reserved']);
            }
            busy.sort((a, b) => a[0] - b[0]);

            if (maintenance) roomStatus.maintenance++;
            else if (inUse) roomStatus.reserved++;
            else roomStatus.available++;

            schedule.push({
                room: roomName(room),
                building: displayBuilding(room.building),
                maintenance,
                busy: maintenance ? [] : busy,
            });
        }

        return res.json({ stats, upcomingBookings, roomStatus, schedule });
    } catch (err) {
        console.error('getStudentDashboard error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const listMyBookings = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { data, error } = await supabase
            .from('bookings')
            .select(BOOKING_SELECT)
            .eq('user_id', userId);

        if (error) {
            console.error('listMyBookings error:', error);
            return res.status(500).json({ error: 'Failed to load bookings' });
        }

        const now = Date.now();
        let shaped: Shaped[] = ((data ?? []) as any[]).map((r) => shapeBooking(r, now));

        // optional ?status= filter, applied to the same status the UI shows
        const wanted = norm(req.query.status);
        if (wanted) {
            const accept =
                wanted === 'approved' || wanted === 'confirmed'
                    ? APPROVED_STATUSES
                    : wanted === 'cancelled'
                        ? CANCELLED_STATUSES
                        : [wanted];
            shaped = shaped.filter((b) => accept.includes(b.status));
        }

        shaped.sort((a, b) => b.startMs - a.startMs);
        return res.json({ bookings: shaped.map(publicBooking) });
    } catch (err) {
        console.error('listMyBookings error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const cancelMyBooking = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const id = req.params.id;
        if (!isUuid(id)) return res.status(400).json({ error: 'Invalid booking id' });

        const { data: existing, error: fetchErr } = await supabase
            .from('bookings')
            .select('booking_id, user_id, booking_status, booking_date, start_time')
            .eq('booking_id', id)
            .single();

        if (fetchErr || !existing) {
            return res.status(404).json({ error: 'Reservation not found' });
        }

        if (String(existing.user_id) !== String(userId)) {
            return res.status(403).json({ error: 'You can only cancel your own reservations' });
        }

        // pending or approved bookings can be cancelled until they start
        if (!ACTIVE_STATUSES.includes(norm(existing.booking_status))) {
            return res.status(409).json({ error: 'This booking can no longer be cancelled' });
        }
        const startsAt = toMs(String(existing.booking_date).slice(0, 10), parseClock(existing.start_time) ?? 0);
        if (startsAt <= Date.now()) {
            return res.status(409).json({ error: 'This booking has already started' });
        }

        const { data, error } = await supabase
            .from('bookings')
            .update({ booking_status: 'cancelled' })
            .eq('booking_id', id)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) {
            console.error('cancelMyBooking error:', error);
            return res.status(500).json({ error: 'Failed to cancel reservation' });
        }

        return res.json({ message: 'Reservation cancelled', booking: data });
    } catch (err) {
        console.error('cancelMyBooking error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
