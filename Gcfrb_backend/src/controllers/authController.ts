import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase';

const JWT_SECRET = process.env.JWT_SECRET as string;

export const userLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, data.password_hash);

    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { user_id: data.user_id, user_type: data.user_type },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    const users = {
      user_id: data.user_id,
      username: data.username,
      email: data.email,
      full_name: data.full_name,
      student_id: data.student_id,
      user_type: data.user_type,
    };

    return res.json({ message: 'Login successful', token, user: users });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const adminLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, data.password_hash);

    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { admin_id: data.admin_id, role: data.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    const admins = {
      admin_id: data.admin_id,
      username: data.username,
      email: data.email,
      full_name: data.full_name,
      role: data.role,
      is_active: data.is_active,
    }

    return res.json({ message: 'Login successful', token, admin: admins });
      
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};