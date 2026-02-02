import express, { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';

interface RegisterRequest {
  email: string;
  password: string;
  user_type: 'client' | 'gig_user';
  name?: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

// Generate JWT token
const generateToken = (userId: string, email: string, userType: string) => {
  return jwt.sign(
    { userId, email, userType },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
};

// Register new user
router.post('/register', async (req: express.Request, res: express.Response) => {
  try {
    const { email, password, user_type, name }: RegisterRequest = req.body;

    if (!email || !password || !user_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['client', 'gig_user'].includes(user_type)) {
      return res.status(400).json({ error: 'Invalid user type' });
    }

    // Check if user already exists
    const existingUser = await req.app.locals.db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert user
    const result = await req.app.locals.db.query(
      `INSERT INTO users (email, password_hash, user_type) 
       VALUES ($1, $2, $3) 
       RETURNING id, email, user_type, created_at`,
      [email, passwordHash, user_type]
    );

    const user = result.rows[0];

    // Create profile if name provided
    if (name) {
      await req.app.locals.db.query(
        `INSERT INTO user_profiles (user_id, name) VALUES ($1, $2)`,
        [user.id, name]
      );
    }

    // Generate token
    const token = generateToken(user.id, user.email, user.user_type);

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        user_type: user.user_type,
        name
      },
      token
    });

  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login user
router.post('/login', async (req: express.Request, res: express.Response) => {
  try {
    const { email, password }: LoginRequest = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user
    const result = await req.app.locals.db.query(
      `SELECT u.id, u.email, u.password_hash, u.user_type, up.name
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE u.email = $1 AND u.is_active = TRUE`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user.id, user.email, user.user_type);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        user_type: user.user_type,
        name: user.name
      },
      token
    });

  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user (protected route)
router.get('/me', authMiddleware, async (req: any, res: express.Response) => {
  try {
    const result = await req.app.locals.db.query(
      `SELECT u.id, u.email, u.user_type, u.created_at, up.name, up.phone, up.bio, up.avatar_url
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE u.id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    
    res.json({
      id: user.id,
      email: user.email,
      user_type: user.user_type,
      name: user.name,
      phone: user.phone,
      bio: user.bio,
      avatar_url: user.avatar_url,
      created_at: user.created_at
    });

  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

export default router;