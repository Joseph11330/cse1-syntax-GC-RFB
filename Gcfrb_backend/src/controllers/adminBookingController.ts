import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export const getAllBookings = async (req: Request, res: Response) => {
  try {
    const { status, room_id, date } = req.query;

    let query = supabase
      .from('bookings')
      .select(`
        *,
        rooms (
          room_id,
          room_number,
          room_name,
          building,
          floor
        ),
        users (
          user_id,
          username,
          email,
          full_name,
          student_id,
          user_type
        )
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('booking_status', status as string);
    }

    if (room_id) {
      query = query.eq('room_id', Number(room_id));
    }

    if (date) {
      query = query.eq('booking_date', date as string);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({
        error: error.message
      });
    }

    return res.json({
      bookings: data
    });

  } catch (err: any) {
    return res.status(500).json({
      error: err.message
    });
  }
};


export const getAdminBookingById = async (
  req: Request,
  res: Response
) => {
  try {
    const bookingId = Number(req.params.id);

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        rooms (
          room_id,
          room_number,
          room_name,
          building,
          floor,
          room_type,
          has_tv,
          has_computers,
          has_whiteboard
        ),
        users (
          user_id,
          username,
          email,
          full_name,
          student_id,
          user_type
        ),
        booking_approvals (
          approval_id,
          approver_id,
          approval_status,
          comments,
          approved_at,
          created_at
        )
      `)
      .eq('booking_id', bookingId)
      .single();

    if (error || !data) {
      return res.status(404).json({
        error: 'Booking not found'
      });
    }

    return res.json({
      booking: data
    });

  } catch (err: any) {
    return res.status(500).json({
      error: err.message
    });
  }
};


export const approveBooking = async (
  req: Request,
  res: Response
) => {
  try {
    const bookingId = Number(req.params.id);

    // Get admin ID from JWT
    const adminId = (req as any).user?.admin_id;

    if (!adminId) {
      return res.status(401).json({
        error: 'Invalid admin token'
      });
    }

    // Check booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('booking_id', bookingId)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({
        error: 'Booking not found'
      });
    }

    if (booking.booking_status !== 'pending') {
      return res.status(400).json({
        error: `Booking cannot be approved because its status is ${booking.booking_status}`
      });
    }

    // Check for conflicts one more time before approval
    const { data: conflicts, error: conflictError } = await supabase
      .from('bookings')
      .select('booking_id, start_time, end_time, booking_status')
      .eq('room_id', booking.room_id)
      .eq('booking_date', booking.booking_date)
      .in('booking_status', ['pending', 'approved'])
      .neq('booking_id', bookingId);

    if (conflictError) {
      return res.status(500).json({
        error: conflictError.message
      });
    }

    const hasConflict = (conflicts || []).some((existing: any) => {
      return (
        existing.start_time < booking.end_time &&
        existing.end_time > booking.start_time
      );
    });

    if (hasConflict) {
      return res.status(409).json({
        error: 'Cannot approve booking because the room is already booked during this time'
      });
    }

    // Update booking
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({
        booking_status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('booking_id', bookingId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({
        error: updateError.message
      });
    }

    // Record approval
    const { data: approval, error: approvalError } = await supabase
      .from('booking_approvals')
      .insert({
        booking_id: bookingId,
        approver_id: adminId,
        approval_status: 'approved',
        comments: req.body.comments || null,
        approved_at: new Date().toISOString()
      })
      .select()
      .single();

    if (approvalError) {
      return res.status(500).json({
        error: approvalError.message
      });
    }

    return res.json({
      message: 'Booking approved successfully',
      booking: updatedBooking,
      approval
    });

  } catch (err: any) {
    return res.status(500).json({
      error: err.message
    });
  }
};


export const rejectBooking = async (
  req: Request,
  res: Response
) => {
  try {
    const bookingId = Number(req.params.id);
    const adminId = (req as any).user?.admin_id;

    if (!adminId) {
      return res.status(401).json({
        error: 'Invalid admin token'
      });
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('booking_id', bookingId)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({
        error: 'Booking not found'
      });
    }

    if (booking.booking_status !== 'pending') {
      return res.status(400).json({
        error: `Booking cannot be rejected because its status is ${booking.booking_status}`
      });
    }

    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({
        booking_status: 'rejected',
        updated_at: new Date().toISOString()
      })
      .eq('booking_id', bookingId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({
        error: updateError.message
      });
    }

    const { data: approval, error: approvalError } = await supabase
      .from('booking_approvals')
      .insert({
        booking_id: bookingId,
        approver_id: adminId,
        approval_status: 'rejected',
        comments: req.body.comments || null,
        approved_at: new Date().toISOString()
      })
      .select()
      .single();

    if (approvalError) {
      return res.status(500).json({
        error: approvalError.message
      });
    }

    return res.json({
      message: 'Booking rejected successfully',
      booking: updatedBooking,
      approval
    });

  } catch (err: any) {
    return res.status(500).json({
      error: err.message
    });
  }
};


export const cancelBookingByAdmin = async (
  req: Request,
  res: Response
) => {
  try {
    const bookingId = Number(req.params.id);

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('booking_id', bookingId)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({
        error: 'Booking not found'
      });
    }

    if (booking.booking_status === 'cancelled') {
      return res.status(400).json({
        error: 'Booking is already cancelled'
      });
    }

    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({
        booking_status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('booking_id', bookingId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({
        error: updateError.message
      });
    }

    return res.json({
      message: 'Booking cancelled successfully by admin',
      booking: updatedBooking
    });

  } catch (err: any) {
    return res.status(500).json({
      error: err.message
    });
  }
};