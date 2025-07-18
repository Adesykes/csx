import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDatabase } from '../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const db = await getDatabase();
  const servicesCollection = db.collection('services');

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (req.method) {
      case 'GET':
        const services = await servicesCollection.find({ active: true }).toArray();
        return res.status(200).json(services);

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
        const { id, ...updateData } = req.body;
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ error: 'Invalid service ID' });
        }
        
        const updatedService = {
          ...updateData,
          price: parseFloat(updateData.price),
          duration: parseInt(updateData.duration),
          updatedAt: new Date()
        };
        
        await servicesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedService }
        );
        return res.status(200).json({ id, ...updatedService });

      case 'DELETE':
        const serviceId = req.query.id as string;
        if (!ObjectId.isValid(serviceId)) {
          return res.status(400).json({ error: 'Invalid service ID' });
        }
        
        await servicesCollection.deleteOne({ _id: new ObjectId(serviceId) });
        return res.status(200).json({ message: 'Service deleted successfully' });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Services API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}