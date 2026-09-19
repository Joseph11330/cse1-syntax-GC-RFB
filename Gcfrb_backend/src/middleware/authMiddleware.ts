import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../types';

const JWT_SECRET = process.env.JWT_SECRET as string;

interface TokenPayload {
    user_id?: string;
    admin_id?: string;
    role?: UserRole;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;
        const id = payload.admin_id ?? payload.user_id;
        const role = payload.role ?? (payload.admin_id ? 'admin' : 'student');

        if (!id) return res.status(401).json({ error: 'Invalid token' });

        req.user = { id, role, email: '' };
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

export function requireRole(...roles: UserRole[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
        next();
    };
}