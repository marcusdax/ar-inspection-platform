import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    userType: string;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';

export const authMiddleware = (db: Pool) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const token = authHeader.split(' ')[1];
      
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // Verify user still exists and is active
      const result = await db.query(
        'SELECT id, email, user_type FROM users WHERE id = $1 AND is_active = TRUE',
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        userType: decoded.userType
      };

      next();
    } catch (error: any) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
};

export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!allowedRoles.includes(req.user.userType)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};