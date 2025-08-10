import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDatabase } from '../lib/mongodb-simple';
import { ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function verifyToken(req: VercelRequest) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return false;
  }
  const token = authHeader.split(' ')[1];
  try {
    jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
    return true;
  } catch {
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const db = await getDatabase();
  const servicesCollection = db.collection('services');

  // Verify authentication for all methods except GET
  if (req.method !== 'GET' && !(await verifyToken(req))) {
    return res.status(401).json({ error: 'Unauthorized' });
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
    console.log('Handling service request:', {
      method: req.method,
      body: req.body,
      headers: req.headers
    });

    switch (req.method) {
      case 'GET':
        // Check if user is authenticated (admin)
        const isAdmin = await verifyToken(req);
        
        // For admin users, return all services; for customers, only return active services
        const query = isAdmin ? {} : { active: true };
        const services = await servicesCollection.find(query).toArray();
        
        const transformedServices = services.map(service => ({
          id: service._id.toString(),
          name: service.name,
          description: service.description,
          price: service.price,
          duration: service.duration,
          category: service.category,
          active: service.active,
          created_at: service.createdAt,
          updated_at: service.updatedAt
        }));
        return res.status(200).json(transformedServices);

      case 'POST':
        const newService = {
          ...req.body,
          price: parseFloat(req.body.price),
          duration: parseInt(req.body.duration),
          active: req.body.active !== false,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        const result = await servicesCollection.insertOne(newService);
        return res.status(201).json({ id: result.insertedId, ...newService });

      case 'PUT':
        const serviceId = req.query.id as string;
        if (!ObjectId.isValid(serviceId)) {
          return res.status(400).json({ error: 'Invalid service ID' });
        }
        
        const updatedService = {
          ...req.body,
          price: parseFloat(req.body.price),
          duration: parseInt(req.body.duration),
          updatedAt: new Date()
        };
        
        await servicesCollection.updateOne(
          { _id: new ObjectId(serviceId) },
          { $set: updatedService }
        );
        
        const updated = {
          id: serviceId,
          ...updatedService,
          created_at: updatedService.createdAt,
          updated_at: updatedService.updatedAt
        };
        
        return res.status(200).json(updated);

      case 'DELETE':
        const deleteId = req.query.id as string;
        if (!ObjectId.isValid(deleteId)) {
          return res.status(400).json({ error: 'Invalid service ID' });
        }
        
        await servicesCollection.deleteOne({ _id: new ObjectId(deleteId) });
        return res.status(200).json({ message: 'Service deleted successfully' });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Services API error:', {
      error,
      method: req.method,
      body: req.body,
      path: req.path,
      headers: req.headers
    });
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}