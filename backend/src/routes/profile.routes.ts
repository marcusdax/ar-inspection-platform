import express, { Router } from 'express';
import multer from 'multer';
import path from 'path';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  })
});

// Get user profile
router.get('/', async (req: any, res: express.Response) => {
  try {
    const result = await req.app.locals.db.query(
      `SELECT u.id, u.email, u.user_type, u.created_at,
              up.name, up.phone, up.bio, up.avatar_url
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE u.id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const profile = result.rows[0];
    
    res.json({
      id: profile.id,
      email: profile.email,
      user_type: profile.user_type,
      created_at: profile.created_at,
      profile: {
        name: profile.name,
        phone: profile.phone,
        bio: profile.bio,
        avatar_url: profile.avatar_url
      }
    });

  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update user profile
router.put('/', async (req: any, res: express.Response) => {
  try {
    const { name, phone, bio } = req.body;
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex++;
    }

    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex}`);
      values.push(phone);
      paramIndex++;
    }

    if (bio !== undefined) {
      updates.push(`bio = $${paramIndex}`);
      values.push(bio);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Check if profile exists
    const existingProfile = await req.app.locals.db.query(
      'SELECT user_id FROM user_profiles WHERE user_id = $1',
      [req.user.userId]
    );

    if (existingProfile.rows.length === 0) {
      // Create new profile
      const sql = `INSERT INTO user_profiles (user_id, ${updates.join(', ')}) 
                   VALUES ($1, ${values.map((_, i) => `$${i + 1}`).join(', ')})`;
      await req.app.locals.db.query(sql, [req.user.userId, ...values]);
    } else {
      // Update existing profile
      const sql = `UPDATE user_profiles SET ${updates.join(', ')}, updated_at = NOW() 
                   WHERE user_id = $${updates.length + 2}`;
      await req.app.locals.db.query(sql, [req.user.userId, ...values]);
    }

    // Get updated profile
    const result = await req.app.locals.db.query(
      `SELECT u.id, u.email, u.user_type, u.created_at,
              up.name, up.phone, up.bio, up.avatar_url
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE u.id = $1`,
      [req.user.userId]
    );

    const profile = result.rows[0];
    
    res.json({
      id: profile.id,
      email: profile.email,
      user_type: profile.user_type,
      created_at: profile.created_at,
      profile: {
        name: profile.name,
        phone: profile.phone,
        bio: profile.bio,
        avatar_url: profile.avatar_url
      }
    });

  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Upload avatar
router.post('/avatar', upload.single('avatar'), async (req: any, res: express.Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const avatarUrl = `/uploads/${req.file.filename}`;

    // Update profile with avatar URL
    await req.app.locals.db.query(
      'UPDATE user_profiles SET avatar_url = $1, updated_at = NOW() WHERE user_id = $2',
      [avatarUrl, req.user.userId]
    );

    res.json({
      message: 'Avatar uploaded successfully',
      avatar_url: avatarUrl
    });

  } catch (error: any) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

export default router;