import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase';
import { JWT_SECRET } from '../config/jwt';

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

function authenticationServiceError(error: { message?: string }, context: string) {
    console.error(`${context}:`, error);
    return error.message === 'Invalid API key'
        ? 'Supabase rejected the backend API key. Check SUPABASE_SERVICE_KEY in Gcfrb_backend/.env.'
        : 'Unable to authenticate right now';
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

        // users.username is a separate column; derive one from the email and keep it unique
        const baseUsername = String(email).split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '') || 'student';
        let username = baseUsername;
        const { data: takenName } = await supabase
            .from('users')
            .select('user_id')
            .eq('username', username)
            .maybeSingle();
        if (takenName) username = `${baseUsername}${Math.floor(1000 + Math.random() * 9000)}`;

        const { data, error } = await supabase
            .from('users')
            .insert({
                username,
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
        const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
        const password = typeof req.body?.password === 'string' ? req.body.password : '';
        const remember = req.body?.remember === true;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .maybeSingle();

        if (error) {
            return res.status(503).json({ error: authenticationServiceError(error, 'studentLogin query error') });
        }

        if (!data || !data.password_hash) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const match = await bcrypt.compare(password, data.password_hash);
        if (!match) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = signToken(
            { user_id: data.user_id, role: 'student' },
            remember
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

export const studentGoogleLogin = async (req: Request, res: Response) => {
    try {
        const accessToken = typeof req.body?.access_token === 'string' ? req.body.access_token : '';
        if (!accessToken) return res.status(400).json({ error: 'Google access token is required' });

        const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
        if (authError) {
            if (authError.message === 'Invalid API key') {
                return res.status(503).json({
                    error: 'Supabase rejected the backend API key. Check SUPABASE_SERVICE_KEY in Gcfrb_backend/.env.',
                });
            }
            console.error('studentGoogleLogin token verification error:', authError.message);
            return res.status(401).json({ error: 'Google sign-in could not be verified. Please try again.' });
        }

        const googleUser = authData.user;
        const providers: unknown[] = googleUser.app_metadata?.providers ?? [];
        if (
            !googleUser.email ||
            !googleUser.email_confirmed_at ||
            (googleUser.app_metadata?.provider !== 'google' && !providers.includes('google'))
        ) {
            return res.status(401).json({ error: 'A verified Google account is required' });
        }

        const email = googleUser.email.trim().toLowerCase();
        const { data: student, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .maybeSingle();

        if (error) {
            return res.status(503).json({ error: authenticationServiceError(error, 'studentGoogleLogin query error') });
        }
        if (!student) {
            return res.status(403).json({
                error: 'No existing student account matches this Google email. Sign in with your registered email or contact the facilities office.',
            });
        }

        const token = signToken({ user_id: student.user_id, role: 'student' }, true);
        return res.json({
            message: 'Login successful',
            token,
            user: publicStudent(student),
        });
    } catch (err) {
        console.error('studentGoogleLogin error:', err);
        return res.status(500).json({ error: 'Google sign-in failed. Please try again.' });
    }
};

export const studentMe = async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', req.user.id)
        .maybeSingle();

    if (error) {
        return res.status(503).json({ error: authenticationServiceError(error, 'studentMe query error') });
    }
    if (!data) return res.status(404).json({ error: 'Student not found' });
    return res.json({ user: publicStudent(data) });
};

export const studentLogout = async (_req: Request, res: Response) => {
    return res.json({ message: 'Logged out' });
};