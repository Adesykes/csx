import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDatabase } from '../lib/mongodb-simple';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract and verify JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No valid authorization token provided' });
    }

    const token = authHeader.substring(7);
    let decodedToken;
    
    try {
      decodedToken = jwt.verify(token, JWT_SECRET) as any;
    } catch (error) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Ensure this is a client (not admin)
    if (decodedToken.role === 'admin') {
      return res.status(403).json({ error: 'Access denied. This endpoint is for clients only.' });
    }

    // Get user's email from token
    const userEmail = decodedToken.email;
    if (!userEmail) {
      return res.status(400).json({ error: 'No email found in token' });
    }

    // Connect to database and get user's appointments
    const db = await getDatabase();
    const appointments = await db.collection('appointments')
      .find({ 
        customerEmail: userEmail.toLowerCase() 
      })
      .sort({ 
        date: -1, // Most recent first
        time: -1 
      })
      .toArray();

    console.log(`📅 Found ${appointments.length} appointments for user: ${userEmail}`);

    return res.status(200).json(appointments);

  } catch (error) {
    console.error('Error fetching user appointments:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
