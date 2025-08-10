import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDatabase } from '../../lib/mongodb-simple';
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
    const { action, email, password, name, type } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Action is required (login, signup, admin-login)' });
    }

    switch (action) {
      case 'admin-login':
        return await handleAdminLogin(req, res, email, password, type);
      case 'client-login':
        return await handleClientLogin(req, res, email, password);
      case 'client-signup':
        return await handleClientSignup(req, res, name, email, password);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleAdminLogin(req: VercelRequest, res: VercelResponse, email: string, password: string, type?: string) {
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

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
    role: user.role
  }, JWT_SECRET, { expiresIn: '24h' });
  
  return res.status(200).json({
    token,
    user: {
      id: user._id,
      email: user.email,
      role: user.role
    }
  });
}

async function handleClientLogin(req: VercelRequest, res: VercelResponse, email: string, password: string) {
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Connect to database and find user
  const db = await getDatabase();
  const user = await db.collection('users').findOne({ 
    email: email.toLowerCase(),
    role: { $ne: 'admin' } // Exclude admin users from client login
  });

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Check password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Generate JWT token
  const token = jwt.sign({
    userId: user._id.toString(),
    email: user.email,
    role: user.role || 'client'
  }, JWT_SECRET, { expiresIn: '7d' }); // Longer expiry for clients
  
  return res.status(200).json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role || 'client'
    }
  });
}

async function handleClientSignup(req: VercelRequest, res: VercelResponse, name: string, email: string, password: string) {
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }

  // Connect to database
  const db = await getDatabase();
  
  // Check if user already exists
  const existingUser = await db.collection('users').findOne({ 
    email: email.toLowerCase() 
  });
  
  if (existingUser) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  // Hash password
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Create new user
  const newUser = {
    name: name.trim(),
    email: email.toLowerCase(),
    password: hashedPassword,
    role: 'client',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const result = await db.collection('users').insertOne(newUser);

  // Generate JWT token
  const token = jwt.sign({
    userId: result.insertedId.toString(),
    email: newUser.email,
    role: 'client'
  }, JWT_SECRET, { expiresIn: '7d' });
  
  return res.status(201).json({
    token,
    user: {
      id: result.insertedId,
      name: newUser.name,
      email: newUser.email,
      role: 'client'
    }
  });
}
