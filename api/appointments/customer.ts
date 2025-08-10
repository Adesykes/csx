import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDatabase } from '../../lib/mongodb-simple';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, phone } = req.query;

    if (!email && !phone) {
      return res.status(400).json({ error: 'Either email or phone number is required' });
    }

    const db = await getDatabase();
    const appointmentsCollection = db.collection('appointments');
    
    // Normalize phone number by removing all non-digit characters
    const normalizePhoneNumber = (phoneNumber: string): string => {
      return phoneNumber.replace(/\D/g, '');
    };
    
    // Build query - search by either email or phone (or both)
    const query: any = {
      status: { $in: ['pending', 'confirmed'] } // Only show non-cancelled, non-completed appointments
    };

    const normalizedPhone = phone ? normalizePhoneNumber(phone as string) : '';
    const originalPhone = phone as string;
    // Also try with leading zero for UK numbers
    const phoneWithZero = normalizedPhone ? '0' + normalizedPhone : '';

    if (email && phone) {
      // If both provided, use OR logic with multiple phone formats
      query.$or = [
        { customerEmail: email },
        { customerPhone: normalizedPhone },
        { customerPhone: originalPhone },
        { customerPhone: phoneWithZero }
      ];
    } else if (email) {
      query.customerEmail = email;
    } else if (phone) {
      // Try multiple phone formats: normalized, original, and with leading zero
      query.$or = [
        { customerPhone: normalizedPhone },
        { customerPhone: originalPhone },
        { customerPhone: phoneWithZero }
      ];
    }
    
    console.log('🔍 Customer appointment query:', query);
    
    const appointments = await appointmentsCollection
      .find(query)
      .sort({ date: 1, time: 1 })
      .toArray();
    
    console.log('📋 Found appointments:', appointments.length);
    console.log('📝 Sample appointment data:', appointments[0]);
    
    return res.status(200).json(appointments);
  } catch (error) {
    console.error('Error finding customer appointments:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
