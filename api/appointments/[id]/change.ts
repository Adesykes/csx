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
    const { appointmentDate, startTime, endTime, serviceId, serviceName, servicePrice } = req.body;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Appointment ID is required' });
    }

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid appointment ID' });
    }

    if (!appointmentDate || !startTime) {
      return res.status(400).json({ error: 'New appointment date and time are required' });
    }

    const db = await getDatabase();
    const appointmentsCollection = db.collection('appointments');

    // Find the original appointment
    const originalAppointment = await appointmentsCollection.findOne({ _id: new ObjectId(id) });
    
    if (!originalAppointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    if (originalAppointment.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot change a cancelled appointment' });
    }

    if (originalAppointment.status === 'completed') {
      return res.status(400).json({ error: 'Cannot change a completed appointment' });
    }

    // Check 48-hour rule - appointment must be at least 48 hours in the future
    const originalDateTime = new Date(`${originalAppointment.date}T${originalAppointment.time}`);
    const now = new Date();
    const fortyEightHoursFromNow = new Date(now.getTime() + (48 * 60 * 60 * 1000));
    
    if (originalDateTime < fortyEightHoursFromNow) {
      return res.status(400).json({ 
        error: 'Appointments can only be changed up to 48 hours before the scheduled time' 
      });
    }

    // Check if the new time slot is available
    const conflictingAppointment = await appointmentsCollection.findOne({
      _id: { $ne: new ObjectId(id) }, // Exclude the current appointment
      date: appointmentDate,
      time: startTime,
      status: { $in: ['pending', 'confirmed'] }
    });

    if (conflictingAppointment) {
      return res.status(400).json({ error: 'The selected time slot is not available' });
    }

    // Cancel the original appointment
    await appointmentsCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          status: 'cancelled',
          updatedAt: new Date(),
          cancellationReason: 'Changed to new appointment'
        }
      }
    );

    // Create a new appointment with the new details
    const newAppointment = {
      customerName: originalAppointment.customerName,
      customerEmail: originalAppointment.customerEmail,
      customerPhone: originalAppointment.customerPhone,
      serviceId: serviceId || originalAppointment.serviceId,
      service: serviceName || originalAppointment.service, // Use 'service' field to match the schema
      servicePrice: servicePrice || originalAppointment.servicePrice,
      date: appointmentDate,
      time: startTime,
      endTime: endTime,
      status: 'pending',
      paymentStatus: originalAppointment.paymentStatus,
      paymentIntentId: originalAppointment.paymentIntentId,
      notes: originalAppointment.notes,
      originalAppointmentId: originalAppointment._id, // Reference to original
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await appointmentsCollection.insertOne(newAppointment);
    
    // Get the complete new appointment object
    const completeNewAppointment = await appointmentsCollection.findOne({ _id: result.insertedId });
    const completeCancelledAppointment = await appointmentsCollection.findOne({ _id: new ObjectId(id) });

    console.log('New appointment created for:', originalAppointment.customerEmail);

    return res.status(200).json({ 
      message: 'Appointment changed successfully',
      newAppointment: completeNewAppointment,
      cancelledAppointment: completeCancelledAppointment
    });
  } catch (error) {
    console.error('Error changing appointment:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
