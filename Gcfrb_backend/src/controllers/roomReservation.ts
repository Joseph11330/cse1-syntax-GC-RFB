import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

const DISCOVERABLE_STATUSES = ['available', 'reserved', 'maintenance'];

export const listRooms = async (req: Request, res: Response) => {
    try {
        const {
            building,
            date,
            start_time,
            end_time,
            headcount,
            amenities,
        } = req.query as Record<string, string | undefined>;

        let query = supabase
            .from('rooms')
            .select(`
        room_id, name, building, floor, capacity,
        layout, status, is_active, image_url,
        room_amenities ( amenity )
      `)
            .eq('is_active', true)
            .in('status', DISCOVERABLE_STATUSES);

        if (building && building !== 'All Buildings') {
            query = query.eq('building', building);
        }
        if (headcount) {
            query = query.gte('capacity', Number(headcount));
        }
        if (amenities) {
            const list = String(amenities).split(',').map((a) => a.trim()).filter(Boolean);
            if (list.length > 0) {
                query = query.contains('room_amenities.amenity', list);
            }
        }

        const { data: rooms, error } = await query;
        if (error) {
            console.error('listRooms error:', error);
            return res.status(500).json({ error: 'Failed to load rooms' });
        }

        let filtered = rooms ?? [];

        if (date && start_time && end_time) {
            const slotStart = new Date(`${date}T${start_time}:00`).toISOString();
            const slotEnd = new Date(`${date}T${end_time}:00`).toISOString();

            const { data: conflicts } = await supabase
                .from('reservations')
                .select('room_id')
                .in('status', ['approved', 'confirmed'])
                .lt('start_time', slotEnd)
                .gt('end_time', slotStart);

            const busy = new Set((conflicts ?? []).map((c: any) => c.room_id));
            filtered = filtered.filter((r: any) => !busy.has(r.room_id));
        }

        const shaped = filtered.map((r: any) => ({
            id: r.room_id,
            name: r.name,
            building: r.building,
            floor: r.floor,
            capacity: r.capacity,
            layout: r.layout,
            status: r.status,
            image_url: r.image_url,
            amenities: (r.room_amenities ?? []).map((a: any) => a.amenity),
            is_free: true,
        }));

        return res.json({ count: shaped.length, rooms: shaped });
    } catch (err) {
        console.error('listRooms error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const getRoom = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('rooms')
            .select(`
        room_id, name, building, floor, capacity,
        layout, overview, status, is_active, image_url,
        room_amenities ( amenity ),
        room_inclusions ( inclusion )
      `)
            .eq('room_id', id)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Room not found' });
        }

        return res.json({
            room: {
                id: data.room_id,
                name: data.name,
                building: data.building,
                floor: data.floor,
                capacity: data.capacity,
                layout: data.layout,
                overview: data.overview,
                status: data.status,
                image_url: data.image_url,
                amenities: (data.room_amenities ?? []).map((a: any) => a.amenity),
                inclusions: (data.room_inclusions ?? []).map((i: any) => i.inclusion),
                rules: [
                    'Cancel at least 2 hours before your slot to avoid a no-show mark.',
                    'Leave the room in the layout you found it, or as booked.',
                    'Exceeding your booked time is subject to the next reservation\'s priority.',
                ],
            },
        });
    } catch (err) {
        console.error('getRoom error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const listAddons = async (_req: Request, res: Response) => {
    try {
        const { data, error } = await supabase
            .from('reservation_addons')
            .select('addon_id, name, price')
            .eq('is_active', true);

        if (error) {
            console.error('listAddons error:', error);
            return res.status(500).json({ error: 'Failed to load add-ons' });
        }

        return res.json({
            addons: (data ?? []).map((a: any) => ({
                id: a.addon_id,
                name: a.name,
                price: Number(a.price),
            })),
        });
    } catch (err) {
        console.error('listAddons error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

function generateReferenceNo() {
    const n = Math.floor(1000 + Math.random() * 9000);
    return `GC-${n}`;
}

export const createReservation = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const {
            room_id,
            title,
            description,
            department,
            start_time,
            end_time,
            attendees,
            invitees,
            equipment_requested,
            special_instructions,
            payment_method,
            gcash_number,
            agree_terms,
        } = req.body;

        if (!room_id || !title || !start_time || !end_time || !attendees) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        if (!agree_terms) {
            return res.status(400).json({ error: 'You must agree to the terms and conditions' });
        }

        const start = new Date(start_time);
        const end = new Date(end_time);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
            return res.status(400).json({ error: 'Invalid time range' });
        }

        const { data: room, error: roomErr } = await supabase
            .from('rooms')
            .select('room_id, capacity, status')
            .eq('room_id', room_id)
            .single();

        if (roomErr || !room) {
            return res.status(404).json({ error: 'Room not found' });
        }
        if (room.status !== 'available') {
            return res.status(409).json({ error: 'Room is not available for booking' });
        }
        if (attendees > room.capacity) {
            return res.status(400).json({
                error: `Attendees exceed room capacity (${room.capacity})`,
            });
        }

        const { data: conflict } = await supabase
            .from('reservations')
            .select('reservation_id')
            .eq('room_id', room_id)
            .in('status', ['pending', 'approved', 'confirmed'])
            .lt('start_time', end.toISOString())
            .gt('end_time', start.toISOString());

        if (conflict && conflict.length > 0) {
            return res.status(409).json({ error: 'Room already booked for that time slot' });
        }

        let addonsCost = 0;
        let equipmentList: string[] = [];
        if (Array.isArray(equipment_requested) && equipment_requested.length > 0) {
            equipmentList = equipment_requested;

            const { data: addonRows } = await supabase
                .from('reservation_addons')
                .select('addon_id, name, price')
                .in('name', equipmentList)
                .eq('is_active', true);

            addonsCost = (addonRows ?? []).reduce(
                (sum: number, a: any) => sum + Number(a.price),
                0
            );
        }

        const durationHours = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60));

        const subtotal = 0;
        const total = subtotal + addonsCost;

        const reference_no = generateReferenceNo();

        const { data: reservation, error: insErr } = await supabase
            .from('reservations')
            .insert({
                user_id: userId,
                room_id,
                reference_no,
                title,
                description: description ?? null,
                department: department ?? null,
                start_time: start.toISOString(),
                end_time: end.toISOString(),
                duration_hours: durationHours,
                attendees,
                invitees: invitees ?? null,
                equipment_requested: equipmentList,
                special_instructions: special_instructions ?? null,
                subtotal,
                addons_cost: addonsCost,
                total_amount: total,
                payment_method: payment_method ?? null,
                gcash_number: gcash_number ?? null,
                status: 'pending',
                created_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (insErr || !reservation) {
            console.error('createReservation insert error:', insErr);
            return res.status(500).json({ error: 'Failed to create reservation' });
        }

        const qrPayload = `GC-BOOK|${reference_no}|${reservation.reservation_id}`;

        return res.status(201).json({
            message: 'Booking request sent',
            reservation: {
                id: reservation.reservation_id,
                reference_no,
                room_id,
                title,
                start_time: reservation.start_time,
                end_time: reservation.end_time,
                duration_hours: durationHours,
                attendees,
                status: reservation.status,
                subtotal,
                addons_cost: addonsCost,
                total_amount: total,
                payment_method: reservation.payment_method ?? null,
            },
            qr: {
                payload: qrPayload,
                hint: 'Show this code at the door on arrival',
            },
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

        const status = req.query.status as string | undefined;

        let query = supabase
            .from('reservations')
            .select(`
        reservation_id, reference_no, title, start_time, end_time,
        duration_hours, attendees, status,
        subtotal, addons_cost, total_amount, payment_method,
        rooms:room_id ( name, building, floor )
      `)
            .eq('user_id', userId)
            .order('start_time', { ascending: false });

        if (status) query = query.eq('status', status);

        const { data, error } = await query;
        if (error) {
            console.error('listMyReservations error:', error);
            return res.status(500).json({ error: 'Failed to load reservations' });
        }

        return res.json({ reservations: data ?? [] });
    } catch (err) {
        console.error('listMyReservations error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const getReservation = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { data, error } = await supabase
            .from('reservations')
            .select(`
        reservation_id, reference_no, title, description, department,
        start_time, end_time, duration_hours, attendees, invitees,
        equipment_requested, special_instructions,
        subtotal, addons_cost, total_amount,
        payment_method, gcash_number, status,
        created_at, decision_note, decided_at,
        rooms:room_id ( name, building, floor, image_url )
      `)
            .eq('reservation_id', id)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Reservation not found' });
        }

        return res.json({ reservation: data });
    } catch (err) {
        console.error('getReservation error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const cancelReservation = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { data: existing, error: fetchErr } = await supabase
            .from('reservations')
            .select('reservation_id, user_id, status')
            .eq('reservation_id', id)
            .single();

        if (fetchErr || !existing) {
            return res.status(404).json({ error: 'Reservation not found' });
        }
        if (existing.user_id !== userId) {
            return res.status(403).json({ error: 'You can only cancel your own reservations' });
        }
        if (existing.status !== 'pending') {
            return res.status(409).json({ error: 'Only pending reservations can be cancelled' });
        }

        const { data, error } = await supabase
            .from('reservations')
            .update({
                status: 'cancelled',
                decided_at: new Date().toISOString(),
            })
            .eq('reservation_id', id)
            .select()
            .single();

        if (error) {
            console.error('cancelReservation error:', error);
            return res.status(500).json({ error: 'Failed to cancel reservation' });
        }

        return res.json({ message: 'Reservation cancelled', reservation: data });
    } catch (err) {
        console.error('cancelReservation error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};