import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDatabase } from '../../lib/mongodb';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, type } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // If this is an admin login request or no type specified (backwards compatibility)
    if (!type || type === 'admin') {
      // Check against environment variables for admin
      if (email !== process.env.ADMIN_EMAIL || password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = {
        _id: 'admin',
        email: process.env.ADMIN_EMAIL,
        role: 'admin'
      };

      const token = jwt.sign({
        userId: user._id.toString(),
        email: user.email,
        role: user.role || 'user'
      }, JWT_SECRET, { expiresIn: '24h' });
      
      return res.status(200).json({
        token,
        user: {
          id: user._id,
          email: user.email,
          role: user.role
        }
      });
    } else {
      // For non-admin requests, this endpoint doesn't handle them
      return res.status(400).json({ error: 'Invalid login type for this endpoint' });
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}