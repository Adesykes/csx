import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDatabase } from '../lib/mongodb';
import { verifyToken } from '../lib/auth';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only require authentication for PUT requests
  if (req.method === 'PUT') {
    try {
      await verifyToken(req);
    } catch (error) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
  const db = await getDatabase();
  const businessHoursCollection = db.collection('businessHours');

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
        const hours = await businessHoursCollection.findOne({ active: true });
        console.log('Retrieved hours from DB:', hours);

        // Define days in correct order
        const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        if (!hours?.schedule) {
          // Create default schedule
          const defaultSchedule = DAYS.map(day => ({
            day,
            isOpen: true,
            openTime: '08:00',
            closeTime: '20:00'
          }));

          await businessHoursCollection.updateOne(
            { active: true },
            { $set: { schedule: defaultSchedule, updatedAt: new Date() }},
            { upsert: true }
          );
          return res.status(200).json(defaultSchedule);
        }

        // Ensure schedule is properly ordered and contains all days
        const orderedSchedule = DAYS.map(day => {
          const daySchedule = hours.schedule.find(s => s.day === day);
          return daySchedule || {
            day,
            isOpen: false,
            openTime: '08:00',
            closeTime: '20:00'
          };
        });

        console.log('Sending ordered schedule:', orderedSchedule);
        return res.status(200).json(orderedSchedule);

      case 'PUT':
        const { schedule } = req.body;
        console.log('Received schedule update:', schedule);
        
        // Validate schedule
        if (!Array.isArray(schedule) || schedule.length !== 7) {
          console.log('Invalid schedule format:', { isArray: Array.isArray(schedule), length: schedule?.length });
          return res.status(400).json({ error: 'Invalid schedule format' });
        }

        // Validate and normalize the schedule
        const normalizedSchedule = DAYS_OF_WEEK.map(day => {
          const daySchedule = schedule.find(s => s.day === day);
          if (!daySchedule) {
            console.log(`Missing schedule for ${day}`);
            return {
              day,
              isOpen: false,
              openTime: '08:00',
              closeTime: '20:00'
            };
          }
          return {
            ...daySchedule,
            day // Ensure day name is exactly correct
          };
        });

        console.log('Saving normalized schedule:', normalizedSchedule);

        // Update or insert business hours
        await businessHoursCollection.updateOne(
          { active: true },
          { 
            $set: { 
              schedule: normalizedSchedule,
              updatedAt: new Date()
            }
          },
          { upsert: true }
        );

        return res.status(200).json({ message: 'Business hours updated successfully' });

      default:
        res.setHeader('Allow', ['GET', 'PUT']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error handling business hours:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
