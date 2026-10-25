import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import {
    ACTIVE_STATUSES,
    BOOKING_SELECT,
    formatClock,
    isDateStr,
    parseClock,
    toMs,
} from '../lib/bookings';
import { findConflict } from '../lib/bookingService';

const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';

function locationFields(value: unknown): { floor: number | null; building: string } {
    const location = text(value);
    const match = location.match(/^\s*(\d+)(?:st|nd|rd|th)?\s+floor(?:\s*-\s*(.+))?\s*$/i);
    if (match) {
        return {
            floor: Number(match[1]),
            building: match[2]?.trim() || 'Unspecified',
        };
    }
    return { floor: null, building: location || 'Unspecified' };
}

function validateRoom(body: any) {
    const roomName = text(body?.room_name ?? body?.name);
    const roomNumber = text(body?.room_number ?? body?.code);
    const roomType = text(body?.room_type ?? body?.type);
    const capacity = Number(body?.capacity);
    if (!roomName || !roomNumber) return { error: 'Facility name and room code are required' };
    if (!roomType) return { error: 'Facility type is required' };
    if (!Number.isInteger(capacity) || capacity < 0) return { error: 'Capacity must be a non-negative whole number' };
    if (body?.status === 'Occupied') return { error: 'Occupied status is derived from active bookings' };
    const location = locationFields(body?.location);
    return {
        values: {
            room_name: roomName,
            room_number: roomNumber,
            room_type: roomType,
            capacity,
            ...location,
            is_available: body?.status !== 'Under Maintenance',
        },
    };
}

export const createAdminRoom = async (req: Request, res: Response) => {
    try {
        const validated = validateRoom(req.body);
        if ('error' in validated) return res.status(400).json({ error: validated.error });

        const { data: duplicate, error: lookupError } = await supabase
            .from('rooms')
            .select('room_id')
            .eq('room_number', validated.values.room_number)
            .maybeSingle();
        if (lookupError) {
            console.error('createAdminRoom lookup error:', lookupError);
            return res.status(500).json({ error: 'Could not validate room code' });
        }
        if (duplicate) return res.status(409).json({ error: 'Room code already exists' });

        const { data, error } = await supabase.from('rooms').insert(validated.values).select().single();
        if (error) {
            console.error('createAdminRoom error:', error);
            return res.status(500).json({ error: 'Could not save facility' });
        }
        return res.status(201).json({ room: data });
    } catch (error) {
        console.error('createAdminRoom error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateAdminRoom = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid room id' });

        const validated = validateRoom(req.body);
        if ('error' in validated) return res.status(400).json({ error: validated.error });

        const { data: duplicate, error: lookupError } = await supabase
            .from('rooms')
            .select('room_id')
            .eq('room_number', validated.values.room_number)
            .neq('room_id', id)
            .maybeSingle();
        if (lookupError) {
            console.error('updateAdminRoom lookup error:', lookupError);
            return res.status(500).json({ error: 'Could not validate room code' });
        }
        if (duplicate) return res.status(409).json({ error: 'Room code already exists' });

        const { data, error } = await supabase
            .from('rooms')
            .update(validated.values)
            .eq('room_id', id)
            .select()
            .maybeSingle();
        if (error) {
            console.error('updateAdminRoom error:', error);
            return res.status(500).json({ error: 'Could not save facility changes' });
        }
        if (!data) return res.status(404).json({ error: 'Facility not found' });
        return res.json({ room: data });
    } catch (error) {
        console.error('updateAdminRoom error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const removeAdminRoom = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid room id' });

        const { data, error } = await supabase
            .from('rooms')
            .update({ is_available: false })
            .eq('room_id', id)
            .select('room_id')
            .maybeSingle();
        if (error) {
            console.error('removeAdminRoom error:', error);
            return res.status(500).json({ error: 'Could not make facility unavailable' });
        }
        if (!data) return res.status(404).json({ error: 'Facility not found' });
        return res.json({ message: 'Facility is no longer bookable' });
    } catch (error) {
        console.error('removeAdminRoom error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const createAdminBooking = async (req: Request, res: Response) => {
    try {
        if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });
        const roomId = Number(req.body?.room_id);
        const requester = text(req.body?.requester);
        const purpose = text(req.body?.purpose);
        const date = req.body?.date;
        const startMin = parseClock(req.body?.start_time);
        const endMin = parseClock(req.body?.end_time);
        const attendees = req.body?.attendees === '' || req.body?.attendees == null ? null : Number(req.body.attendees);

        if (!Number.isInteger(roomId) || roomId < 1) return res.status(400).json({ error: 'Choose a valid facility' });
        if (!requester) return res.status(400).json({ error: 'Requester name is required' });
        if (!purpose) return res.status(400).json({ error: 'Booking title is required' });
        if (!isDateStr(date)) return res.status(400).json({ error: 'Invalid date' });
        if (startMin === null || endMin === null || endMin <= startMin) {
            return res.status(400).json({ error: 'End time must be after the start time' });
        }
        if (toMs(date, startMin) < Date.now()) return res.status(400).json({ error: 'That time has already passed' });
        if (attendees !== null && (!Number.isInteger(attendees) || attendees < 0)) {
            return res.status(400).json({ error: 'Expected guests must be a non-negative whole number' });
        }

        const { data: users, error: userError } = await supabase
            .from('users')
            .select('user_id')
            .eq('full_name', requester)
            .limit(2);
        if (userError) {
            console.error('createAdminBooking user lookup error:', userError);
            return res.status(500).json({ error: 'Could not look up requester account' });
        }
        if (!users?.length) return res.status(404).json({ error: 'Requester must match an existing account name' });
        if (users.length > 1) return res.status(409).json({ error: 'More than one account has that name; use a unique requester name' });

        const { data: room, error: roomError } = await supabase
            .from('rooms')
            .select('room_id, capacity, is_available')
            .eq('room_id', roomId)
            .maybeSingle();
        if (roomError) {
            console.error('createAdminBooking room lookup error:', roomError);
            return res.status(500).json({ error: 'Could not validate facility' });
        }
        if (!room) return res.status(404).json({ error: 'Facility not found' });
        if (room.is_available === false) return res.status(409).json({ error: 'This facility is under maintenance' });
        if (attendees !== null && room.capacity && attendees > room.capacity) {
            return res.status(400).json({ error: `This facility holds up to ${room.capacity} people` });
        }

        const conflict = await findConflict(roomId, date, startMin, endMin, ACTIVE_STATUSES);
        if (!conflict.ok) return res.status(conflict.status).json({ error: conflict.error });
        if (conflict.data) return res.status(409).json({ error: 'That time slot is already booked for this facility' });

        const { data: inserted, error: insertError } = await supabase
            .from('bookings')
            .insert({
                user_id: users[0].user_id,
                room_id: roomId,
                booking_date: date,
                start_time: formatClock(startMin),
                end_time: formatClock(endMin),
                purpose,
                event_type: 'event',
                booking_status: 'approved',
            })
            .select('booking_id')
            .single();
        if (insertError) {
            console.error('createAdminBooking insert error:', insertError);
            return res.status(500).json({ error: 'Could not save booking' });
        }

        const { data: booking, error: fetchError } = await supabase
            .from('bookings')
            .select(`${BOOKING_SELECT.trimEnd()}, users ( full_name, email )`)
            .eq('booking_id', inserted.booking_id)
            .single();
        if (fetchError) {
            console.error('createAdminBooking response lookup error:', fetchError);
            return res.status(500).json({ error: 'Booking was saved but could not be loaded; refresh the bookings page' });
        }
        return res.status(201).json({ booking });
    } catch (error) {
        console.error('createAdminBooking error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
