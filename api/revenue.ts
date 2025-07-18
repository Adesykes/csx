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

    const pipeline = [
      {
        $match: {
          appointmentDate: {
            $gte: startDate,
            $lte: endDate
          },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$appointmentDate',
          totalRevenue: { $sum: '$servicePrice' },
          appointmentCount: { $sum: 1 },
          services: {
            $push: {
              name: '$serviceName',
              price: '$servicePrice'
            }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ];

    const revenueData = await appointmentsCollection.aggregate(pipeline).toArray();

    // Process services data for each day
    const processedData = revenueData.map(day => {
      const servicesMap: { [key: string]: { count: number; revenue: number } } = {};
      
      day.services.forEach((service: any) => {
        if (!servicesMap[service.name]) {
          servicesMap[service.name] = { count: 0, revenue: 0 };
        }
        servicesMap[service.name].count += 1;
        servicesMap[service.name].revenue += service.price;
      });

      return {
        date: day._id,
        totalRevenue: day.totalRevenue,
        appointmentCount: day.appointmentCount,
        services: servicesMap
      };
    });

    return res.status(200).json(processedData);
  } catch (error) {
    console.error('Revenue API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}