import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthenticatedRequest } from '../middleware/authMiddleware';


// ============================================================
// CHECK ROOM AVAILABILITY
// ============================================================

export const checkAvailability = async (
  req: Request,
  res: Response
) => {
  try {
    const roomId = Number(req.query.room_id);
    const bookingDate = req.query.booking_date as string;
    const startTime = req.query.start_time as string;
    const endTime = req.query.end_time as string;

    if (
      isNaN(roomId) ||
      !bookingDate ||
      !startTime ||
      !endTime
    ) {
      return res.status(400).json({
        error: 'room_id, booking_date, start_time, and end_time are required'
      });
    }

    if (startTime >= endTime) {
      return res.status(400).json({
        error: 'start_time must be earlier than end_time'
      });
    }

    // Check if room exists and is available
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('room_id', roomId)
      .single();

    if (roomError || !room) {
      return res.status(404).json({
        error: 'Room not found'
      });
    }

    if (!room.is_available) {
      return res.status(409).json({
        available: false,
        error: 'Room is currently unavailable'
      });
    }


    // --------------------------------------------------------
    // CHECK FIXED ROOM SCHEDULE
    // --------------------------------------------------------

    const date = new Date(`${bookingDate}T00:00:00`);

    if (isNaN(date.getTime())) {
      return res.status(400).json({
        error: 'Invalid booking date'
      });
    }

    const dayOfWeek = date.toLocaleDateString('en-US', {
      weekday: 'long'
    });

    const { data: schedules, error: scheduleError } = await supabase
      .from('room_schedule')
      .select('*')
      .eq('room_id', roomId)
      .eq('day_of_week', dayOfWeek);

    if (scheduleError) {
      return res.status(500).json({
        error: scheduleError.message
      });
    }


    // Check whether requested time overlaps a fixed schedule
    const scheduleConflict = schedules?.some((schedule) => {
      return (
        schedule.start_time < endTime &&
        schedule.end_time > startTime
      );
    });

    if (scheduleConflict) {
      return res.status(409).json({
        available: false,
        reason: 'room_schedule',
        error: 'Room has a fixed schedule during this time'
      });
    }


    // --------------------------------------------------------
    // CHECK EXISTING BOOKINGS
    // --------------------------------------------------------

    const { data: bookings, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('room_id', roomId)
      .eq('booking_date', bookingDate)
      .in('booking_status', ['pending', 'approved']);

    if (bookingError) {
      return res.status(500).json({
        error: bookingError.message
      });
    }


    const bookingConflict = bookings?.some((booking) => {
      return (
        booking.start_time < endTime &&
        booking.end_time > startTime
      );
    });

    if (bookingConflict) {
      return res.status(409).json({
        available: false,
        reason: 'existing_booking',
        error: 'Room is already booked during this time'
      });
    }


    return res.json({
      available: true,
      room_id: roomId,
      booking_date: bookingDate,
      start_time: startTime,
      end_time: endTime
    });

  } catch (err: any) {
    return res.status(500).json({
      error: err.message
    });
  }
};


// ============================================================
// CREATE BOOKING
// ============================================================

export const createBooking = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user?.user_id) {
      return res.status(401).json({
        error: 'User authentication required'
      });
    }

    const userId = req.user.user_id;

    const {
      room_id,
      booking_date,
      start_time,
      end_time,
      purpose,
      event_type
    } = req.body;


    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (
      room_id === undefined ||
      !booking_date ||
      !start_time ||
      !end_time ||
      !purpose
    ) {
      return res.status(400).json({
        error: 'room_id, booking_date, start_time, end_time, and purpose are required'
      });
    }

    if (start_time >= end_time) {
      return res.status(400).json({
        error: 'start_time must be earlier than end_time'
      });
    }


    // --------------------------------------------------------
    // PREVENT PAST DATES
    // --------------------------------------------------------

    const requestedDate = new Date(`${booking_date}T00:00:00`);

    if (isNaN(requestedDate.getTime())) {
      return res.status(400).json({
        error: 'Invalid booking date'
      });
    }

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    if (requestedDate < today) {
      return res.status(400).json({
        error: 'Cannot book a past date'
      });
    }


    // --------------------------------------------------------
    // CHECK ROOM
    // --------------------------------------------------------

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('room_id', room_id)
      .single();

    if (roomError || !room) {
      return res.status(404).json({
        error: 'Room not found'
      });
    }

    if (!room.is_available) {
      return res.status(409).json({
        error: 'Room is currently unavailable'
      });
    }


    // --------------------------------------------------------
    // CHECK FIXED SCHEDULE
    // --------------------------------------------------------

    const dayOfWeek = requestedDate.toLocaleDateString('en-US', {
      weekday: 'long'
    });

    const { data: schedules, error: scheduleError } = await supabase
      .from('room_schedule')
      .select('*')
      .eq('room_id', room_id)
      .eq('day_of_week', dayOfWeek);

    if (scheduleError) {
      return res.status(500).json({
        error: scheduleError.message
      });
    }

    const scheduleConflict = schedules?.some((schedule) => {
      return (
        schedule.start_time < end_time &&
        schedule.end_time > start_time
      );
    });

    if (scheduleConflict) {
      return res.status(409).json({
        error: 'Room has a fixed schedule during this time'
      });
    }


    // --------------------------------------------------------
    // CHECK EXISTING BOOKINGS
    // --------------------------------------------------------

    const { data: existingBookings, error: bookingError } =
      await supabase
        .from('bookings')
        .select('*')
        .eq('room_id', room_id)
        .eq('booking_date', booking_date)
        .in('booking_status', ['pending', 'approved']);

    if (bookingError) {
      return res.status(500).json({
        error: bookingError.message
      });
    }


    const bookingConflict = existingBookings?.some((booking) => {
      return (
        booking.start_time < end_time &&
        booking.end_time > start_time
      );
    });

    if (bookingConflict) {
      return res.status(409).json({
        error: 'Room is already booked during this time'
      });
    }


    // --------------------------------------------------------
    // CREATE BOOKING
    // --------------------------------------------------------

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        user_id: userId,
        room_id,
        booking_date,
        start_time,
        end_time,
        purpose,
        event_type: event_type ?? null,
        booking_status: 'pending'
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        error: error.message
      });
    }


    // Generate a readable reference ID
    const referenceId =
      `BK-${booking_date.replace(/-/g, '')}-${data.booking_id}`;


    return res.status(201).json({
      message: 'Booking submitted successfully',
      reference_id: referenceId,
      booking: data
    });

  } catch (err: any) {
    return res.status(500).json({
      error: err.message
    });
  }
};


// ============================================================
// GET MY BOOKINGS
// ============================================================

export const getMyBookings = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user?.user_id) {
      return res.status(401).json({
        error: 'User authentication required'
      });
    }

    const userId = req.user.user_id;

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        rooms (
          room_id,
          room_number,
          room_name,
          building,
          floor
        )
      `)
      .eq('user_id', userId)
      .order('booking_date', { ascending: true })
      .order('start_time', { ascending: true });

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


// ============================================================
// GET ONE BOOKING
// ============================================================

export const getBookingById = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const bookingId = Number(req.params.id);

    if (isNaN(bookingId)) {
      return res.status(400).json({
        error: 'Invalid booking ID'
      });
    }

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        rooms (
          room_id,
          room_number,
          room_name,
          building,
          floor
        )
      `)
      .eq('booking_id', bookingId)
      .single();

    if (error || !data) {
      return res.status(404).json({
        error: 'Booking not found'
      });
    }

    // Students can only view their own bookings
    if (
      req.user?.user_id &&
      data.user_id !== req.user.user_id
    ) {
      return res.status(403).json({
        error: 'You are not allowed to view this booking'
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


// ============================================================
// CANCEL MY BOOKING
// ============================================================

export const cancelBooking = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user?.user_id) {
      return res.status(401).json({
        error: 'User authentication required'
      });
    }

    const bookingId = Number(req.params.id);

    if (isNaN(bookingId)) {
      return res.status(400).json({
        error: 'Invalid booking ID'
      });
    }

    const { data: booking, error: findError } = await supabase
      .from('bookings')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('user_id', req.user.user_id)
      .single();

    if (findError || !booking) {
      return res.status(404).json({
        error: 'Booking not found'
      });
    }

    if (
      booking.booking_status === 'cancelled' ||
      booking.booking_status === 'rejected'
    ) {
      return res.status(400).json({
        error: `Booking is already ${booking.booking_status}`
      });
    }

    const { data, error } = await supabase
      .from('bookings')
      .update({
        booking_status: 'cancelled'
      })
      .eq('booking_id', bookingId)
      .eq('user_id', req.user.user_id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        error: error.message
      });
    }

    return res.json({
      message: 'Booking cancelled successfully',
      booking: data
    });

  } catch (err: any) {
    return res.status(500).json({
      error: err.message
    });
  }
};