import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase';

const JWT_SECRET = process.env.JWT_SECRET as string;
const ACCESS_TTL = '8h';
const REMEMBER_TTL = '30d';

//Booker login, remember me, logout functions
function publicStudent(row: any) {
    return {
        id: row.user_id,
        email: row.email,
        full_name: row.full_name,
        student_id: row.student_id ?? null,
        role: 'student',
    };
}

function signToken(payload: Record<string, unknown>, remember: boolean) {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: remember ? REMEMBER_TTL : ACCESS_TTL,
    });
}

//Booker sign in page
export const studentSignup = async (req: Request, res: Response) => {
    try {
        const { full_name, email, password, student_id } = req.body;

        if (!full_name || !email || !password) {
            return res.status(400).json({ error: 'Full name, email, and password are required' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        const { data: existing, error: findErr } = await supabase
            .from('users')
            .select('user_id')
            .eq('email', email)
            .maybeSingle();

        if (findErr) {
            console.error('studentSignup findErr:', findErr);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (existing) {
            return res.status(409).json({ error: 'Email is already registered' });
        }

        if (student_id) {
            const { data: existingId } = await supabase
                .from('users')
                .select('user_id')
                .eq('student_id', student_id)
                .maybeSingle();

            if (existingId) {
                return res.status(409).json({ error: 'Student ID is already registered' });
            }
        }

        const password_hash = await bcrypt.hash(password, 12);

        const { data, error } = await supabase
            .from('users')
            .insert({
                full_name,
                email,
                password_hash,
                student_id: student_id ?? null,
                user_type: 'student',
            })
            .select()
            .single();

        if (error || !data) {
            console.error('studentSignup insert error:', error);
            return res.status(500).json({ error: 'Failed to create account' });
        }

        const token = signToken({ user_id: data.user_id, role: 'student' }, false);

        return res.status(201).json({
            message: 'Account created successfully',
            token,
            user: publicStudent(data),
        });
    } catch (err) {
        console.error('studentSignup error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const studentLogin = async (req: Request, res: Response) => {
    try {
        const { email, password, remember = false } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !data || !data.password_hash) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const match = await bcrypt.compare(password, data.password_hash);
        if (!match) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = signToken(
            { user_id: data.user_id, role: 'student' },
            Boolean(remember)
        );

        return res.json({
            message: 'Login successful',
            token,
            user: publicStudent(data),
        });
    } catch (err) {
        console.error('studentLogin error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const studentMe = async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', req.user.id)
        .single();

    if (error || !data) return res.status(404).json({ error: 'Student not found' });
    return res.json({ user: publicStudent(data) });
};

export const studentLogout = async (_req: Request, res: Response) => {
    return res.json({ message: 'Logged out' });
};