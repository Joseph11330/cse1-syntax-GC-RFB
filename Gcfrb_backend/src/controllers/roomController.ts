import { Request, Response } from 'express';
import { supabase } from '../config/supabase';


// GET ALL ROOMS
export const getRooms = async (req: Request, res: Response) => {
  try {
    const { available } = req.query;

    let query = supabase
      .from('rooms')
      .select('*')
      .order('room_id', { ascending: true });

    if (available === 'true') {
      query = query.eq('is_available', true);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({
        error: error.message
      });
    }

    return res.json({
      rooms: data
    });

  } catch (err: any) {
    return res.status(500).json({
      error: err.message
    });
  }
};


// GET ONE ROOM
export const getRoomById = async (req: Request, res: Response) => {
  try {
    const roomId = Number(req.params.id);

    if (isNaN(roomId)) {
      return res.status(400).json({
        error: 'Invalid room ID'
      });
    }

    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('room_id', roomId)
      .single();

    if (error || !data) {
      return res.status(404).json({
        error: 'Room not found'
      });
    }

    return res.json({
      room: data
    });

  } catch (err: any) {
    return res.status(500).json({
      error: err.message
    });
  }
};


// CREATE ROOM - ADMIN
export const createRoom = async (req: Request, res: Response) => {
  try {
    const {
      room_number,
      room_name,
      building,
      floor,
      room_type,
      has_tv,
      has_computers,
      has_whiteboard,
      description,
      is_available
    } = req.body;

    if (!room_number || !room_name || !building) {
      return res.status(400).json({
        error: 'room_number, room_name, and building are required'
      });
    }

    const { data, error } = await supabase
      .from('rooms')
      .insert({
        room_number,
        room_name,
        building,
        floor,
        room_type,
        has_tv: has_tv ?? false,
        has_computers: has_computers ?? false,
        has_whiteboard: has_whiteboard ?? false,
        description: description ?? null,
        is_available: is_available ?? true
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        error: error.message
      });
    }

    return res.status(201).json({
      message: 'Room created successfully',
      room: data
    });

  } catch (err: any) {
    return res.status(500).json({
      error: err.message
    });
  }
};


// UPDATE ROOM - ADMIN
export const updateRoom = async (req: Request, res: Response) => {
  try {
    const roomId = Number(req.params.id);

    if (isNaN(roomId)) {
      return res.status(400).json({
        error: 'Invalid room ID'
      });
    }

    const allowedFields = [
      'room_number',
      'room_name',
      'building',
      'floor',
      'room_type',
      'has_tv',
      'has_computers',
      'has_whiteboard',
      'description',
      'is_available'
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
      .from('rooms')
      .update(updates)
      .eq('room_id', roomId)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({
        error: 'Room not found or update failed'
      });
    }

    return res.json({
      message: 'Room updated successfully',
      room: data
    });

  } catch (err: any) {
    return res.status(500).json({
      error: err.message
    });
  }
};


// DEACTIVATE ROOM - ADMIN
export const deactivateRoom = async (req: Request, res: Response) => {
  try {
    const roomId = Number(req.params.id);

    if (isNaN(roomId)) {
      return res.status(400).json({
        error: 'Invalid room ID'
      });
    }

    const { data, error } = await supabase
      .from('rooms')
      .update({
        is_available: false
      })
      .eq('room_id', roomId)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({
        error: 'Room not found'
      });
    }

    return res.json({
      message: 'Room deactivated successfully',
      room: data
    });

  } catch (err: any) {
    return res.status(500).json({
      error: err.message
    });
  }
};