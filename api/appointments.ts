import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDatabase } from '../lib/mongodb-simple';
import { ObjectId } from 'mongodb';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const db = await getDatabase();
  const appointmentsCollection = db.collection('appointments');

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (req.method) {
      case 'GET':
        const appointments = await appointmentsCollection
          .find({})
          .sort({ appointmentDate: 1, startTime: 1 })
          .toArray();
        return res.status(200).json(appointments);

      case 'POST':
        const newAppointment = {
          ...req.body,
          servicePrice: parseFloat(req.body.servicePrice),
          status: req.body.status || 'pending',
          paymentStatus: req.body.paymentStatus || 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const result = await appointmentsCollection.insertOne(newAppointment);
        return res.status(201).json({ id: result.insertedId, ...newAppointment });

      case 'PUT':
        const { id, ...updateData } = req.body;
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ error: 'Invalid appointment ID' });
        }
        
        const updatedAppointment = {
          ...updateData,
          updatedAt: new Date()
        };
        
        await appointmentsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedAppointment }
        );
        return res.status(200).json({ id, ...updatedAppointment });

      case 'DELETE':
        const appointmentId = req.query.id as string;
        if (!ObjectId.isValid(appointmentId)) {
          return res.status(400).json({ error: 'Invalid appointment ID' });
        }
        
        await appointmentsCollection.deleteOne({ _id: new ObjectId(appointmentId) });
        return res.status(200).json({ message: 'Appointment deleted successfully' });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Appointments API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}