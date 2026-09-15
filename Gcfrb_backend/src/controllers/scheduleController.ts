import { Request, Response } from 'express';
import { supabase } from '../config/supabase';


// GET ALL SCHEDULES
export const getSchedules = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('room_schedule')
      .select(`
        *,
        rooms (
          room_id,
          room_number,
          room_name,
          building
        )
      `)
      .order('schedule_id', { ascending: true });

    if (error) {
      return res.status(500).json({
        error: error.message
      });
    }

    return res.json({
      schedules: data
    });

  } catch (err: any) {
    return res.status(500).json({
      error: err.message
    });
  }
};


// GET ONE SCHEDULE
export const getScheduleById = async (
  req: Request,
  res: Response
) => {
  try {
    const scheduleId = Number(req.params.id);

    if (isNaN(scheduleId)) {
      return res.status(400).json({
        error: 'Invalid schedule ID'
      });
    }

    const { data, error } = await supabase
      .from('room_schedule')
      .select(`
        *,
        rooms (
          room_id,
          room_number,
          room_name,
          building
        )
      `)
      .eq('schedule_id', scheduleId)
      .single();

    if (error || !data) {
      return res.status(404).json({
        error: 'Schedule not found'
      });
    }

    return res.json({
      schedule: data
    });

  } catch (err: any) {
    return res.status(500).json({
      error: err.message
    });
  }
};


// GET SCHEDULES FOR A ROOM
export const getRoomSchedules = async (
  req: Request,
  res: Response
) => {
  try {
    const roomId = Number(req.params.roomId);

    if (isNaN(roomId)) {
      return res.status(400).json({
        error: 'Invalid room ID'
      });
    }

    const { data, error } = await supabase
      .from('room_schedule')
      .select('*')
      .eq('room_id', roomId)
      .order('start_time', { ascending: true });

    if (error) {
      return res.status(500).json({
        error: error.message
      });
    }

    return res.json({
      room_id: roomId,
      schedules: data
    });

  } catch (err: any) {
    return res.status(500).json({
      error: err.message
    });
  }
};


// CREATE SCHEDULE - ADMIN
export const createSchedule = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      room_id,
      day_of_week,
      start_time,
      end_time,
      is_lab_schedule,
      subject,
      teacher_name
    } = req.body;

    if (
      room_id === undefined ||
      !day_of_week ||
      !start_time ||
      !end_time
    ) {
      return res.status(400).json({
        error: 'room_id, day_of_week, start_time, and end_time are required'
      });
    }

    if (start_time >= end_time) {
      return res.status(400).json({
        error: 'start_time must be earlier than end_time'
      });
    }

    // Make sure the room exists
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('room_id')
      .eq('room_id', room_id)
      .single();

    if (roomError || !room) {
      return res.status(404).json({
        error: 'Room not found'
      });
    }

    const { data, error } = await supabase
      .from('room_schedule')
      .insert({
        room_id,
        day_of_week,
        start_time,
        end_time,
        is_lab_schedule: is_lab_schedule ?? false,
        subject: subject ?? null,
        teacher_name: teacher_name ?? null
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        error: error.message
      });
    }

    return res.status(201).json({
      message: 'Schedule created successfully',
      schedule: data
    });

  } catch (err: any) {
    return res.status(500).json({
      error: err.message
    });
  }
};


// UPDATE SCHEDULE - ADMIN
export const updateSchedule = async (
  req: Request,
  res: Response
) => {
  try {
    const scheduleId = Number(req.params.id);

    if (isNaN(scheduleId)) {
      return res.status(400).json({
        error: 'Invalid schedule ID'
      });
    }

    const allowedFields = [
      'room_id',
      'day_of_week',
      'start_time',
      'end_time',
      'is_lab_schedule',
      'subject',
      'teacher_name'
    ];

    const updates: any = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'No valid fields provided for update'
      });
    }

    const { data, error } = await supabase
      .from('room_schedule')
      .update(updates)
      .eq('schedule_id', scheduleId)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({
        error: 'Schedule not found or update failed'
      });
    }

    return res.json({
      message: 'Schedule updated successfully',
      schedule: data
    });

  } catch (err: any) {
    return res.status(500).json({
      error: err.message
    });
  }
};


// DELETE SCHEDULE - ADMIN
export const deleteSchedule = async (
  req: Request,
  res: Response
) => {
  try {
    const scheduleId = Number(req.params.id);

    if (isNaN(scheduleId)) {
      return res.status(400).json({
        error: 'Invalid schedule ID'
      });
    }

    const { data, error } = await supabase
      .from('room_schedule')
      .delete()
      .eq('schedule_id', scheduleId)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({
        error: 'Schedule not found'
      });
    }

    return res.json({
      message: 'Schedule deleted successfully',
      schedule: data
    });

  } catch (err: any) {
    return res.status(500).json({
      error: err.message
    });
  }
};