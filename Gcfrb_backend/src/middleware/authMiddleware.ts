import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET as string;

export interface AuthenticatedRequest extends Request {
    user?: any;
}

export const authenticateToken = (
    req: AuthenticatedRequest, 
    res: Response, 
    next: NextFunction
) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(401).json({ error: 'Authorization token required' });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Invalid authorization format' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }

    catch {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};

export const requireAdmin = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }
  
    // Admin JWT contains admin_id and role
    if (!req.user.admin_id) {
      return res.status(403).json({
        error: 'Admin access required'
      });
    }
  
    if (req.user.role !== 'admin' && req.user.role !== 'officer') {
      return res.status(403).json({
        error: 'Insufficient permissions'
      });
    }
  
    next();
  };