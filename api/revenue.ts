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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const db = await getDatabase();
    const appointmentsCollection = db.collection('appointments');

    // Debug: Check what appointments exist in the date range
    const debugAppointments = await appointmentsCollection.find({
      date: {
        $gte: startDate,
        $lte: endDate
      }
    }).toArray();
    
    console.log('🔍 PRODUCTION API - All appointments in range:', JSON.stringify(debugAppointments.map(apt => ({
      date: apt.date,
      service: apt.service || apt.serviceName,
      paymentMethod: apt.paymentMethod,
      paymentStatus: apt.paymentStatus,
      status: apt.status,
      servicePrice: apt.servicePrice,
      // Include all fields to see structure
      allFields: Object.keys(apt)
    })), null, 2));

    const pipeline = [
      {
        $match: {
          date: {
            $gte: startDate,
            $lte: endDate
          },
          $or: [
            // Include completed appointments that are paid
            { status: 'completed', paymentStatus: 'paid' },
            // Include any appointment where payment is received (for cash payments)
            { paymentStatus: 'paid' }
          ]
        }
      },
      {
        $group: {
          _id: '$date',
          totalRevenue: { $sum: '$servicePrice' },
          appointmentCount: { $sum: 1 },
          onlinePayments: {
            $sum: {
              $cond: [{ $eq: ['$paymentMethod', 'bank_transfer'] }, '$servicePrice', 0]
            }
          },
          cashPayments: {
            $sum: {
              $cond: [{ $eq: ['$paymentMethod', 'cash'] }, '$servicePrice', 0]
            }
          },
          services: {
            $push: {
              name: '$service',
              price: '$servicePrice',
              paymentMethod: '$paymentMethod'
            }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ];

    const revenueData = await appointmentsCollection.aggregate(pipeline).toArray();
    
    console.log('🔍 PRODUCTION API - Raw aggregation result:', JSON.stringify(revenueData, null, 2));

    // Process services data for each day
    const processedData = revenueData.map(day => {
      const servicesMap: { [key: string]: { count: number; revenue: number; onlineRevenue: number; cashRevenue: number } } = {};
      
      day.services.forEach((service: any) => {
        if (!servicesMap[service.name]) {
          servicesMap[service.name] = { count: 0, revenue: 0, onlineRevenue: 0, cashRevenue: 0 };
        }
        servicesMap[service.name].count += 1;
        servicesMap[service.name].revenue += service.price;
        
        if (service.paymentMethod === 'bank_transfer') {
          servicesMap[service.name].onlineRevenue += service.price;
        } else if (service.paymentMethod === 'cash') {
          servicesMap[service.name].cashRevenue += service.price;
        }
      });

      return {
        date: day._id,
        totalRevenue: day.totalRevenue,
        appointmentCount: day.appointmentCount,
        onlinePayments: day.onlinePayments,
        cashPayments: day.cashPayments,
        services: servicesMap
      };
    });

    return res.status(200).json(processedData);
  } catch (error) {
    console.error('Revenue API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}