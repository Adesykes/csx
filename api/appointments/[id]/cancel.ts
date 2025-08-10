import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDatabase } from '../../../lib/mongodb-simple';
import { ObjectId } from 'mongodb';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Appointment ID is required' });
    }

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid appointment ID' });
    }

    const db = await getDatabase();
    const appointmentsCollection = db.collection('appointments');

    // Find the appointment to cancel
    const appointment = await appointmentsCollection.findOne({ _id: new ObjectId(id) });
    
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    if (appointment.status === 'cancelled') {
      return res.status(400).json({ error: 'Appointment is already cancelled' });
    }

    if (appointment.status === 'completed') {
      return res.status(400).json({ error: 'Cannot cancel a completed appointment' });
    }

    // Check if appointment is in the past (optional business rule)
    if (appointment.date && appointment.time) {
      const appointmentDateTime = new Date(`${appointment.date}T${appointment.time}`);
      const now = new Date();
      
      if (appointmentDateTime < now) {
        return res.status(400).json({ error: 'Cannot cancel appointments in the past' });
      }
    }
    
    // Update appointment status to cancelled
    const result = await appointmentsCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          status: 'cancelled',
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    return res.status(200).json({ message: 'Appointment cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
