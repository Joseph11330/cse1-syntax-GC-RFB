import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

function startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

function endOfToday() {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
}

function startOfWeek() {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
}

function endOfWeek() {
    const d = startOfWeek();
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
}

export const getAdminDashboard = async (req: Request, res: Response) => {
    try {
        const todayStart = startOfToday().toISOString();
        const todayEnd = endOfToday().toISOString();
        const weekStart = startOfWeek().toISOString();
        const weekEnd = endOfWeek().toISOString();

        const [
            facilitiesRes,
            activeRoomsRes,
            todaysBookingsRes,
            pendingRes,
            roomStatusRes,
            weekBookingsRes,
        ] = await Promise.all([
            supabase
                .from('rooms')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true),
            supabase
                .from('rooms')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true)
                .eq('status', 'available'),
            supabase
                .from('reservations')
                .select('*', { count: 'exact', head: true })
                .gte('start_time', todayStart)
                .lte('start_time', todayEnd)
                .in('status', ['approved', 'pending']),
            supabase
                .from('reservations')
                .select(`
            reservation_id,
            reference_no,
            purpose,
            start_time,
            end_time,
            attendees,
            status,
            users:user_id ( full_name ),
            rooms:room_id ( name, building )
        `)
                .eq('status', 'pending')
                .order('start_time', { ascending: true })
                .limit(10),
            supabase
                .from('rooms')
                .select('status'),
            supabase
                .from('reservations')
                .select('room_id, start_time, end_time')
                .gte('start_time', weekStart)
                .lte('start_time', weekEnd)
                .eq('status', 'approved'),
        ]);

        const facilities = facilitiesRes.count ?? 0;
        const activeRooms = activeRoomsRes.count ?? 0;
        const todaysBookings = todaysBookingsRes.count ?? 0;

        const roomStatusCounts = { available: 0, reserved: 0, maintenance: 0 };
        (roomStatusRes.data ?? []).forEach((r: any) => {
            const s = String(r.status ?? '').toLowerCase();
            if (s === 'available') roomStatusCounts.available++;
            else if (s === 'reserved') roomStatusCounts.reserved++;
            else if (s === 'maintenance' || s === 'under_maintenance') roomStatusCounts.maintenance++;
        });

        const weekBookings = weekBookingsRes.data ?? [];
        const bookedHours = weekBookings.reduce((sum: number, b: any) => {
            const ms = new Date(b.end_time).getTime() - new Date(b.start_time).getTime();
            return sum + ms / (1000 * 60 * 60);
        }, 0);

        const openHours = 8;
        const workDays = 5;
        const totalAvailableHours = activeRooms * openHours * workDays;
        const utilizationPct = totalAvailableHours > 0
            ? Math.round((bookedHours / totalAvailableHours) * 100)
            : 0;

        const pendingApprovals = (pendingRes.data ?? []).map((r: any) => ({
            id: r.reservation_id,
            reference: r.reference_no,
            name: r.users?.full_name ?? 'Unknown',
            facility: r.rooms?.name ?? 'Unknown',
            building: r.rooms?.building ?? '',
            dateTime: `${r.start_time} – ${r.end_time}`,
            purpose: r.purpose,
            attendees: r.attendees,
            status: r.status,
        }));

        return res.json({
            stats: {
                facilities,
                activeRooms,
                todaysBookings,
                utilizationPct,
            },
            pendingApprovals,
            roomStatus: roomStatusCounts,
            utilizationWeek: {
                bookedHours: Math.round(bookedHours),
                availableHours: totalAvailableHours,
                percentage: utilizationPct,
            },
        });
    } catch (err) {
        console.error('getAdminDashboard error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const listPendingReservations = async (_req: Request, res: Response) => {
    try {
        const { data, error } = await supabase
            .from('reservations')
            .select(`
        reservation_id,
        reference_no,
        purpose,/
        start_time,
        end_time,
        attendees,
        status,
        users:user_id ( full_name, email ),
        rooms:room_id ( name, building )
    `)
            .eq('status', 'pending')
            .order('start_time', { ascending: true });

        if (error) {
            console.error('listPendingReservations error:', error);
            return res.status(500).json({ error: 'Failed to load pending reservations' });
        }

        return res.json({ reservations: data ?? [] });
    } catch (err) {
        console.error('listPendingReservations error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const approveReservation = async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        const adminId = req.user?.id;
        const note = req.body?.note ?? null;

        if (!adminId) return res.status(401).json({ error: 'Unauthorized' });

        const { data: conflict } = await supabase
            .from('reservations')
            .select('reservation_id')
            .eq('room_id', req.body.room_id)
            .eq('status', 'approved')
            .lt('start_time', req.body.end_time)
            .gt('end_time', req.body.start_time);

        if (conflict && conflict.length > 0) {
            return res.status(409).json({ error: 'Time slot already booked for this room' });
        }

        const { data, error } = await supabase
            .from('reservations')
            .update({
                status: 'approved',
                decided_by: adminId,
                decided_at: new Date().toISOString(),
                decision_note: note,
            })
            .eq('reservation_id', id)
            .select()
            .single();

        if (error) {
            console.error('approveReservation error:', error);
            return res.status(500).json({ error: 'Failed to approve reservation' });
        }

        return res.json({ message: 'Reservation approved', reservation: data });
    } catch (err) {
        console.error('approveReservation error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const rejectReservation = async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        const adminId = req.user?.id;
        const note = req.body?.note ?? null;

        if (!adminId) return res.status(401).json({ error: 'Unauthorized' });

        const { data, error } = await supabase
            .from('reservations')
            .update({
                status: 'rejected',
                decided_by: adminId,
                decided_at: new Date().toISOString(),
                decision_note: note,
            })
            .eq('reservation_id', id)
            .select()
            .single();

        if (error) {
            console.error('rejectReservation error:', error);
            return res.status(500).json({ error: 'Failed to reject reservation' });
        }

        return res.json({ message: 'Reservation rejected', reservation: data });
    } catch (err) {
        console.error('rejectReservation error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};