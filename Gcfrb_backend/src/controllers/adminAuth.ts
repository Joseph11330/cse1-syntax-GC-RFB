import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase';
import { JWT_SECRET } from '../config/jwt';

const ACCESS_TTL = '8h';
const REMEMBER_TTL = '30d';

function authenticationServiceError(error: { message?: string }, context: string) {
    console.error(`${context}:`, error);
    return error.message === 'Invalid API key'
        ? 'Supabase rejected the backend API key. Check SUPABASE_SERVICE_KEY in Gcfrb_backend/.env.'
        : 'Unable to authenticate right now';
}

function publicAdmin(row: any) {
    return {
        id: row.admin_id,
        email: row.email,
        full_name: row.full_name ?? row.name ?? null,
        role: row.role ?? 'admin',
    };
}

function signToken(payload: Record<string, unknown>, remember: boolean) {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: remember ? REMEMBER_TTL : ACCESS_TTL,
    });
}

export const adminLogin = async (req: Request, res: Response) => {
    try {
        const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
        const password = typeof req.body?.password === 'string' ? req.body.password : '';
        const remember = req.body?.remember === true;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const { data, error } = await supabase
            .from('admins')
            .select('*')
            .eq('email', email)
            .eq('is_active', true)
            .maybeSingle();

        if (error) {
            return res.status(503).json({ error: authenticationServiceError(error, 'adminLogin query error') });
        }

        if (!data || !data.password_hash) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const match = await bcrypt.compare(password, data.password_hash);
        if (!match) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = signToken(
            { admin_id: data.admin_id, role: data.role ?? 'admin' },
            remember
        );

        return res.json({ message: 'Login successful', token, admin: publicAdmin(data) });
    } catch (err) {
        console.error('adminLogin error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const adminMe = async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('admin_id', req.user.id)
        .maybeSingle();

    if (error) {
        return res.status(503).json({ error: authenticationServiceError(error, 'adminMe query error') });
    }
    if (!data) return res.status(404).json({ error: 'Admin not found' });
    return res.json({ admin: publicAdmin(data) });
};

export const adminLogout = async (_req: Request, res: Response) => {
    return res.json({ message: 'Logged out' });
};