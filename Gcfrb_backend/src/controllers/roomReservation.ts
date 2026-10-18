import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import {
    ACTIVE_STATUSES,
    BOOKING_SELECT,
    displayBuilding,
    displayRoomType,
    isDateStr,
    isUuid,
    manilaDate,
    manilaMinutes,
    ordinalFloor,
    overlaps,
    parseClock,
    publicBooking,
    roomName,
    shapeBooking,
    bookingReference,
} from '../lib/bookings';
import { createBooking } from '../lib/bookingService';
import { cancelMyBooking } from './studentDashboard';

/* ------------------------------------------------------------------ *
 * Book-a-room flow — shapes match GC-FRB/src/booker/BookerApp.jsx
 *
 *   GET  /api/rooms?building&date&start_time&end_time&headcount&amenities
 *        -> { rooms: [{ id, name, code, building, floor, capacity, layout, amenities, status, is_free }] }
 *   GET  /api/rooms/:id      -> { room: { ...above, overview, rules, inclusions } }
 *   GET  /api/addons         -> { addons: [{ name, price }] }
 *   POST /api/reservations   -> { reservation: { id, reference_no, ... }, qr: { payload } }
 *   GET  /api/reservations   -> { reservations: [...] }
 *   GET  /api/reservations/:id, DELETE /api/reservations/:id
 * ------------------------------------------------------------------ */

// There is no add-ons table yet, so prices live here (same list the UI falls back to).
const ADDONS = [
    { name: 'Presentation clicker', price: 150 },
    { name: 'Extension cords', price: 100 },
    { name: 'Extra microphones', price: 250 },
];

const DEFAULT_RULES = [
    'Cancel at least 2 hours before your slot to avoid a no-show mark.',
    'Leave the room in the layout you found it, or as booked.',
    "Exceeding your booked time is subject to the next reservation's priority.",
];

/** rooms.amenities (text[]) is optional — the table doesn't have it yet, so default to none. */
const roomAmenities = (r: any): string[] => (Array.isArray(r.amenities) ? r.amenities.map(String) : []);

function shapeRoom(r: any, status: 'available' | 'reserved' | 'maintenance') {
    return {
        id: r.room_id,
        name: roomName(r),
        code: r.room_number ?? null,
        building: displayBuilding(r.building),
        floor: ordinalFloor(r.floor),
        capacity: r.capacity ?? 0,
        layout: displayRoomType(r.room_type),
        amenities: roomAmenities(r),
        status,
        is_free: status === 'available',
    };
}

/** "09:00" (24h from the UI) or "09:00 AM" -> minutes */
const clockQuery = (v: unknown): number | null => (typeof v === 'string' ? parseClock(v) : null);

export const listRooms = async (req: Request, res: Response) => {
    try {
        const building = String(req.query.building ?? '').trim();
        const date = req.query.date;
        const startMin = clockQuery(req.query.start_time);
        const endMin = clockQuery(req.query.end_time);
        const headcount = Number(req.query.headcount) || 0;
        const wantedAmenities = String(req.query.amenities ?? '')
            .split(',')
            .map((a) => a.trim().toLowerCase())
            .filter(Boolean);

        const { data: rooms, error } = await supabase
            .from('rooms')
            .select('*')
            .order('building', { ascending: true })
            .order('room_name', { ascending: true });

        if (error) {
            console.error('listRooms error:', error);
            return res.status(500).json({ error: 'Failed to load rooms' });
        }

        // which rooms are taken for the slot the student is looking at
        const busyRooms = new Set<number>();
        if (isDateStr(date) && startMin !== null && endMin !== null && endMin > startMin) {
            const { data: booked, error: bookedErr } = await supabase
                .from('bookings')
                .select('room_id, start_time, end_time')
                .eq('booking_date', date)
                .in('booking_status', ACTIVE_STATUSES);

            if (bookedErr) {
                console.error('listRooms bookings error:', bookedErr);
                return res.status(500).json({ error: 'Failed to check availability' });
            }
            for (const b of (booked ?? []) as any[]) {
                const s = parseClock(b.start_time);
                const e = parseClock(b.end_time);
                if (s !== null && e !== null && overlaps(startMin, endMin, s, e)) busyRooms.add(b.room_id);
            }
        }

        const wantBuilding = building && building !== 'All Buildings' ? displayBuilding(building).toLowerCase() : '';

        const result = ((rooms ?? []) as any[])
            .filter((r) => !wantBuilding || displayBuilding(r.building).toLowerCase() === wantBuilding)
            .filter((r) => !headcount || (r.capacity ?? 0) >= headcount)
            .filter((r) => {
                const have = roomAmenities(r).map((a) => a.toLowerCase());
                return wantedAmenities.every((a) => have.includes(a));
            })
            .map((r) =>
                shapeRoom(r, r.is_available === false ? 'maintenance' : busyRooms.has(r.room_id) ? 'reserved' : 'available')
            );

        return res.json({ rooms: result });
    } catch (err) {
        console.error('listRooms error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const getRoom = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid room id' });

        const { data: r, error } = await supabase.from('rooms').select('*').eq('room_id', id).maybeSingle();
        if (error) {
            console.error('getRoom error:', error);
            return res.status(500).json({ error: 'Failed to load room' });
        }
        if (!r) return res.status(404).json({ error: 'Room not found' });

        return res.json({
            room: {
                ...shapeRoom(r, r.is_available === false ? 'maintenance' : 'available'),
                overview: r.overview ?? r.description ?? '',
                rules: DEFAULT_RULES,
                inclusions: [],
            },
        });
    } catch (err) {
        console.error('getRoom error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const listAddons = async (_req: Request, res: Response) => res.json({ addons: ADDONS });

export const createReservation = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const b = req.body ?? {};
        const roomId = Number(b.room_id);
        const title = String(b.title ?? '').trim();
        const attendees = b.attendees === undefined || b.attendees === null || b.attendees === '' ? null : Number(b.attendees);

        if (!Number.isInteger(roomId)) return res.status(400).json({ error: 'Choose a room' });
        if (!title) return res.status(400).json({ error: 'Event title is required' });
        if (attendees !== null && (!Number.isInteger(attendees) || attendees < 1)) {
            return res.status(400).json({ error: 'Number of guests must be a whole number' });
        }
        if (b.agree_terms !== true) return res.status(400).json({ error: 'You must accept the terms to continue' });

        const start = new Date(b.start_time);
        const end = new Date(b.end_time);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            return res.status(400).json({ error: 'Invalid start or end time' });
        }

        // the bookings table keeps a date plus "09:00 AM" style times, in campus time
        const date = manilaDate(start);
        if (manilaDate(end) !== date) {
            return res.status(400).json({ error: 'A booking must start and end on the same day' });
        }

        // add-ons: only known ones count, price comes from the server
        const requested: string[] = Array.isArray(b.equipment_requested) ? b.equipment_requested.map(String) : [];
        const chosen = ADDONS.filter((a) => requested.includes(a.name));
        const addonsCost = chosen.reduce((sum, a) => sum + a.price, 0);
        const method = b.payment_method === 'gcash' ? 'gcash' : 'card';

        const created = await createBooking({
            userId,
            roomId,
            date,
            startMin: manilaMinutes(start),
            endMin: manilaMinutes(end) || 24 * 60,
            purpose: title,
            eventType: b.event_type,
            attendees,
            // saved only if these columns exist on `bookings` (see migration notes); otherwise ignored
            extras: {
                description: b.description ?? null,
                department: b.department ?? null,
                attendees,
                invitees: b.invitees ?? null,
                equipment_requested: chosen.map((a) => a.name),
                special_instructions: b.special_instructions ?? null,
                payment_method: method,
                gcash_number: method === 'gcash' ? String(b.gcash_number ?? '').replace(/\D/g, '') || null : null,
                addons_cost: addonsCost,
            },
        });

        if (!created.ok) return res.status(created.status).json({ error: created.error });

        const row = created.data.booking;
        const ref = bookingReference(row.booking_id);

        return res.status(201).json({
            reservation: {
                id: row.booking_id,
                reference_no: ref,
                room_id: roomId,
                room: roomName(created.data.room),
                title,
                start_time: start.toISOString(),
                end_time: end.toISOString(),
                attendees,
                status: 'pending',
                addons_cost: addonsCost,
                payment_method: method,
            },
            qr: { payload: `GC-BOOK|${ref}|${row.booking_id}` },
        });
    } catch (err) {
        console.error('createReservation error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const listMyReservations = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { data, error } = await supabase.from('bookings').select(BOOKING_SELECT).eq('user_id', userId);
        if (error) {
            console.error('listMyReservations error:', error);
            return res.status(500).json({ error: 'Failed to load reservations' });
        }

        const now = Date.now();
        const rows = ((data ?? []) as any[]).map((r) => shapeBooking(r, now)).sort((a, b) => b.startMs - a.startMs);
        return res.json({ reservations: rows.map(publicBooking) });
    } catch (err) {
        console.error('listMyReservations error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const getReservation = async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        if (!isUuid(id)) return res.status(400).json({ error: 'Invalid reservation id' });

        const { data, error } = await supabase
            .from('bookings')
            .select(BOOKING_SELECT)
            .eq('booking_id', id)
            .maybeSingle();

        if (error) {
            console.error('getReservation error:', error);
            return res.status(500).json({ error: 'Failed to load reservation' });
        }
        // students can only open their own bookings (a missing one and someone else's look the same)
        if (!data || (req.user?.role !== 'admin' && String((data as any).user_id) !== String(req.user?.id))) {
            return res.status(404).json({ error: 'Reservation not found' });
        }

        return res.json({ reservation: publicBooking(shapeBooking(data, Date.now())) });
    } catch (err) {
        console.error('getReservation error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const cancelReservation = cancelMyBooking;
