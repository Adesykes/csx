import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDatabase } from '../lib/mongodb';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const db = await getDatabase();
    const appointmentsCollection = db.collection('appointments');

    // Get recent appointments to see their structure
    const appointments = await appointmentsCollection.find({}).limit(10).toArray();
    
    const summary = {
      totalAppointments: appointments.length,
      sampleAppointments: appointments.map(apt => ({
        date: apt.date,
        service: apt.service || apt.serviceName,
        paymentMethod: apt.paymentMethod,
        paymentStatus: apt.paymentStatus,
        status: apt.status,
        servicePrice: apt.servicePrice,
        allFieldNames: Object.keys(apt)
      })),
      uniquePaymentMethods: [...new Set(appointments.map(apt => apt.paymentMethod))],
      uniquePaymentStatuses: [...new Set(appointments.map(apt => apt.paymentStatus))],
      uniqueStatuses: [...new Set(appointments.map(apt => apt.status))]
    };

    return res.status(200).json(summary);
  } catch (error) {
    console.error('Debug API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
