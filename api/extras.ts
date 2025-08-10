import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDatabase } from '../lib/mongodb-simple';
import { ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function verifyToken(req: VercelRequest) {
  const authHeader = req.headers.authorization;
  console.log('Auth header:', authHeader ? 'Present' : 'Missing');
  
  if (!authHeader?.startsWith('Bearer ')) {
    console.log('Invalid or missing Bearer token format');
    return false;
  }
  
  const token = authHeader.split(' ')[1];
  console.log('Token extracted:', token ? 'Yes' : 'No');
  
  try {
    const secret = process.env.JWT_SECRET || 'default_secret';
    console.log('Using JWT secret:', secret.substring(0, 5) + '...');
    jwt.verify(token, secret);
    console.log('Token verification successful');
    return true;
  } catch (error) {
    console.log('Token verification failed:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const db = await getDatabase();
  const extrasCollection = db.collection('extras');

  // Verify authentication for all methods except GET
  if (req.method !== 'GET') {
    const isAuthenticated = await verifyToken(req);
    console.log(`Authentication check for ${req.method}:`, isAuthenticated);
    if (!isAuthenticated) {
      console.log('Unauthorized request detected');
      return res.status(401).json({ 
        error: 'Unauthorized',
        details: 'Invalid or missing authentication token'
      });
    }
  }

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    return res.status(200).end();
  }

  // Set CORS headers for actual request
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  try {
    switch (req.method) {
      case 'GET':
        const { admin } = req.query;
        const isAdminRequest = admin === 'true' && await verifyToken(req);
        
        const query = isAdminRequest ? {} : { active: true };
        const extras = await extrasCollection
          .find(query)
          .sort({ category: 1, name: 1 })
          .toArray();
        
        // Transform the data to include both _id and id fields
        const transformedExtras = extras.map(extra => ({
          ...extra,
          id: extra._id.toString()
        }));
        
        return res.status(200).json(transformedExtras);

      case 'POST':
        // Validate required fields
        if (!req.body.name || !req.body.name.trim()) {
          return res.status(400).json({ error: 'Extra name is required' });
        }
        if (!req.body.price || isNaN(parseFloat(req.body.price)) || parseFloat(req.body.price) <= 0) {
          return res.status(400).json({ error: 'Valid price is required' });
        }
        if (!req.body.category || !req.body.category.trim()) {
          return res.status(400).json({ error: 'Category is required' });
        }

        const newExtra = {
          name: req.body.name.trim(),
          description: req.body.description?.trim() || '',
          price: parseFloat(req.body.price),
          category: req.body.category.trim(),
          active: req.body.active ?? true,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = await extrasCollection.insertOne(newExtra);
        const createdExtra = await extrasCollection.findOne({ _id: result.insertedId });
        
        return res.status(201).json({
          ...createdExtra,
          id: createdExtra?._id.toString()
        });

      case 'PUT':
        const { id } = req.query;
        if (!id || typeof id !== 'string') {
          return res.status(400).json({ error: 'Extra ID is required' });
        }

        const updateData = {
          name: req.body.name,
          description: req.body.description,
          price: parseFloat(req.body.price),
          category: req.body.category,
          active: req.body.active,
          updatedAt: new Date()
        };

        await extrasCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );

        const updatedExtra = await extrasCollection.findOne({ _id: new ObjectId(id) });
        return res.status(200).json({
          ...updatedExtra,
          id: updatedExtra?._id.toString()
        });

      case 'DELETE':
        const { id: deleteId } = req.query;
        if (!deleteId || typeof deleteId !== 'string') {
          return res.status(400).json({ error: 'Extra ID is required' });
        }

        await extrasCollection.updateOne(
          { _id: new ObjectId(deleteId) },
          { $set: { active: false, updatedAt: new Date() } }
        );

        return res.status(200).json({ message: 'Extra deleted successfully' });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error handling extras request:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      method: req.method,
      body: req.body,
      headers: req.headers
    });
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
