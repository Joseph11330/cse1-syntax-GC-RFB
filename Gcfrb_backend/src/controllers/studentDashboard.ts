import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

const UPCOMING_STATUSES = ['pending', 'approved'];

export const getStudentDashboard = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const nowIso = new Date().toISOString();

        const [
            upcomingCountRes,
            pendingCountRes,
            completedCountRes,
            cancelledCountRes,
            upcomingListRes,
            roomStatusRes,
        ] = await Promise.all([
            supabase
                .from('reservations')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .gte('start_time', nowIso)
                .in('status', UPCOMING_STATUSES),
            supabase
                .from('reservations')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('status', 'pending'),
            supabase
                .from('reservations')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('status', 'completed'),
            supabase
                .from('reservations')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('status', 'cancelled'),
            supabase
                .from('reservations')
                .select(`
          reservation_id,
          reference_no,
          purpose,
          start_time,
          end_time,
          status,
          rooms:room_id ( name, building )
        `)
                .eq('user_id', userId)
                .gte('start_time', nowIso)
                .in('status', UPCOMING_STATUSES)
                .order('start_time', { ascending: true })
                .limit(5),
            supabase
                .from('rooms')
                .select('status'),
        ]);

        const roomStatusCounts = { available: 0, reserved: 0, maintenance: 0 };
        (roomStatusRes.data ?? []).forEach((r: any) => {
            const s = String(r.status ?? '').toLowerCase();
            if (s === 'available') roomStatusCounts.available++;
            else if (s === 'reserved') roomStatusCounts.reserved++;
            else if (s === 'maintenance' || s === 'under_maintenance') roomStatusCounts.maintenance++;
        });

        const upcomingBookings = (upcomingListRes.data ?? []).map((r: any) => ({
            id: r.reservation_id,
            reference: r.reference_no,
            facility: r.rooms?.name ?? 'Unknown',
            building: r.rooms?.building ?? '',
            startTime: r.start_time,
            endTime: r.end_time,
            purpose: r.purpose,
            status: r.status,
        }));

        return res.json({
            stats: {
                upcomingBookings: upcomingCountRes.count ?? 0,
                pendingApproval: pendingCountRes.count ?? 0,
                completedBookings: completedCountRes.count ?? 0,
                cancelled: cancelledCountRes.count ?? 0,
            },
            upcomingBookings,
            roomStatus: roomStatusCounts,
        });
    } catch (err) {
        console.error('getStudentDashboard error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const listMyBookings = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const status = req.query.status as string | undefined;

        let query = supabase
            .from('reservations')
            .select(`
        reservation_id,
        reference_no,
        purpose,
        start_time,
        end_time,
        attendees,
        status,
        decision_note,
        rooms:room_id ( name, building )
      `)
            .eq('user_id', userId)
            .order('start_time', { ascending: false });

        if (status) query = query.eq('status', status);

        const { data, error } = await query;
        if (error) {
            console.error('listMyBookings error:', error);
            return res.status(500).json({ error: 'Failed to load bookings' });
        }

        return res.json({ bookings: data ?? [] });
    } catch (err) {
        console.error('listMyBookings error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const cancelMyBooking = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const id = req.params.id;
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
            console.error('cancelMyBooking error:', error);
            return res.status(500).json({ error: 'Failed to cancel reservation' });
        }

        return res.json({ message: 'Reservation cancelled', reservation: data });
    } catch (err) {
        console.error('cancelMyBooking error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};