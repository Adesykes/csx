import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { getDatabase } from './lib/mongodb.js';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { sendBookingConfirmationEmail } from './api/send-confirmation-email';

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON parsing
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? [
          'https://www.csxnaillounge.co.uk',
          'https://csxnaillounge.co.uk',
          'https://csx-nail-lounge.vercel.app'
        ]
      : [
          'http://localhost:5173',
          'http://localhost:5174', 
          'http://localhost:5175',
          'http://localhost:5176',
          'http://localhost:5177',
          'http://localhost:5178'
        ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept'],
  preflightContinue: false,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Auth middleware
const authMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Ping endpoint to keep server alive
app.get('/ping', (req, res) => {
  res.status(200).json({ 
    message: 'pong',
    timestamp: new Date().toISOString()
  });
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check against environment variables
    if (email !== process.env.ADMIN_EMAIL || password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({
      userId: 'admin',
      email: process.env.ADMIN_EMAIL,
      role: 'admin'
    }, process.env.JWT_SECRET || 'default_secret', { expiresIn: '24h' });

    return res.status(200).json({
      token,
      user: {
        id: 'admin',
        email: process.env.ADMIN_EMAIL,
        role: 'admin'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Services endpoints
app.get('/api/services', async (req, res) => {
  try {
    const db = await getDatabase();
    const services = await db.collection('services').find().toArray();
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
    res.json(transformedServices);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/services', authMiddleware, async (req, res) => {
  try {
    const db = await getDatabase();
    const newService = {
      ...req.body,
      price: parseFloat(req.body.price),
      duration: parseInt(req.body.duration),
      active: req.body.active !== false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const result = await db.collection('services').insertOne(newService);
    res.status(201).json({
      id: result.insertedId.toString(),
      ...newService,
      created_at: newService.createdAt,
      updated_at: newService.updatedAt
    });
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/services/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Service ID is required' });
    }

    const db = await getDatabase();
    const updatedService = {
      ...req.body,
      price: parseFloat(req.body.price),
      duration: parseInt(req.body.duration),
      updatedAt: new Date()
    };
    
    const result = await db.collection('services').updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedService }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json({
      id,
      ...updatedService,
      created_at: updatedService.createdAt,
      updated_at: updatedService.updatedAt
    });
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/services/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Service ID is required' });
    }

    const db = await getDatabase();
    const result = await db.collection('services').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Business hours endpoints
app.get('/api/business-hours', async (req, res) => {
  try {
    const db = await getDatabase();
    const hours = await db.collection('businessHours').findOne({ active: true });
    
    // If no hours are set, return default business hours
    if (!hours?.schedule) {
      const defaultSchedule = [
        { day: 'Monday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
        { day: 'Tuesday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
        { day: 'Wednesday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
        { day: 'Thursday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
        { day: 'Friday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
        { day: 'Saturday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
        { day: 'Sunday', isOpen: false, openTime: '09:00', closeTime: '17:00' }
      ];
      
      // Save default schedule
      await db.collection('businessHours').insertOne({
        active: true,
        schedule: defaultSchedule,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      return res.json(defaultSchedule);
    }
    
    // Ensure days are properly ordered and all days are present
    const orderedSchedule = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
      const daySchedule = hours.schedule.find((s: any) => s.day === day);
      if (!daySchedule) {
        return {
          day,
          isOpen: day !== 'Sunday',
          openTime: '09:00',
          closeTime: '17:00'
        };
      }
      return daySchedule;
    });
    
    res.json(orderedSchedule);
  } catch (error) {
    console.error('Error fetching business hours:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/business-hours', authMiddleware, async (req, res) => {
  try {
    const { schedule } = req.body;
    
    // Validate schedule
    if (!Array.isArray(schedule) || schedule.length !== 7) {
      return res.status(400).json({ error: 'Invalid schedule format' });
    }

    // Validate each day's schedule
    for (const day of schedule) {
      if (!day.day || typeof day.isOpen !== 'boolean' || !day.openTime || !day.closeTime) {
        return res.status(400).json({ error: `Invalid schedule for ${day.day || 'unknown day'}` });
      }

      // Validate time format (HH:mm)
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(day.openTime) || !timeRegex.test(day.closeTime)) {
        return res.status(400).json({ error: `Invalid time format for ${day.day}` });
      }

      // If day is open, ensure close time is after open time
      if (day.isOpen) {
        const [openHour, openMinute] = day.openTime.split(':').map(Number);
        const [closeHour, closeMinute] = day.closeTime.split(':').map(Number);
        const openMinutes = openHour * 60 + openMinute;
        const closeMinutes = closeHour * 60 + closeMinute;

        if (closeMinutes <= openMinutes) {
          return res.status(400).json({ error: `Invalid hours for ${day.day}: closing time must be after opening time` });
        }
      }
    }

    const db = await getDatabase();
    await db.collection('businessHours').updateOne(
      { active: true },
      { 
        $set: { 
          schedule,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    res.status(200).json({ message: 'Business hours updated successfully', schedule });
  } catch (error) {
    console.error('Error updating business hours:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Closure dates endpoints
app.get('/api/closure-dates', async (req, res) => {
  try {
    const db = await getDatabase();
    const closureDates = await db.collection('closureDates')
      .find({})
      .sort({ date: 1 })
      .toArray();
    
    res.json(closureDates);
  } catch (error) {
    console.error('Error fetching closure dates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/closure-dates', authMiddleware, async (req, res) => {
  try {
    const { date, reason } = req.body;
    
    if (!date || !reason) {
      return res.status(400).json({ error: 'Date and reason are required' });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    // Check if date is in the future
    const selectedDate = new Date(date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      return res.status(400).json({ error: 'Cannot add closure dates in the past' });
    }

    const db = await getDatabase();
    
    // Check if closure date already exists
    const existingClosure = await db.collection('closureDates').findOne({ date });
    if (existingClosure) {
      return res.status(409).json({ error: 'Closure date already exists' });
    }

    const newClosure = {
      date,
      reason: reason.trim(),
      createdAt: new Date()
    };

    const result = await db.collection('closureDates').insertOne(newClosure);
    
    res.status(201).json({
      _id: result.insertedId,
      ...newClosure
    });
  } catch (error) {
    console.error('Error adding closure date:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/closure-dates/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || id.length !== 24) {
      return res.status(400).json({ error: 'Invalid closure date ID' });
    }

    const db = await getDatabase();
    const { ObjectId } = await import('mongodb');
    
    const result = await db.collection('closureDates').deleteOne({ 
      _id: new ObjectId(id) 
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Closure date not found' });
    }

    res.json({ message: 'Closure date removed successfully' });
  } catch (error) {
    console.error('Error removing closure date:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Appointments endpoints
app.get('/api/appointments', authMiddleware, async (req, res) => {
  try {
    const db = await getDatabase();
    const appointments = await db.collection('appointments')
      .find({})
      .sort({ date: 1, time: 1 })
      .toArray();
    
    res.json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to normalize phone numbers
const normalizePhoneNumber = (phone: string): string => {
  if (!phone) return '';
  return phone.replace(/\D/g, ''); // Remove all non-digit characters
};

app.post('/api/appointments', async (req, res) => {
  try {
    const db = await getDatabase();
    const appointmentsCollection = db.collection('appointments');
    
    const newAppointment = {
      ...req.body,
      customerPhone: normalizePhoneNumber(req.body.customerPhone), // Normalize phone number
      servicePrice: parseFloat(req.body.servicePrice),
      status: req.body.status || 'pending',
      paymentStatus: req.body.paymentStatus || 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await appointmentsCollection.insertOne(newAppointment);
    res.status(201).json({ id: result.insertedId, ...newAppointment });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Email confirmation endpoint
app.post('/api/send-confirmation-email', sendBookingConfirmationEmail);

// Public endpoint for checking appointment availability (no auth required)
app.get('/api/appointments/availability', async (req, res) => {
  try {
    const db = await getDatabase();
    const appointments = await db.collection('appointments')
      .find({ 
        status: { $in: ['pending', 'confirmed'] } // Only get active appointments
      })
      .sort({ date: 1, time: 1 })
      .toArray();
    
    // Return only the fields needed for availability checking
    const availability = appointments.map(apt => ({
      date: apt.date,
      time: apt.time,
      service: apt.service,
      duration: apt.serviceDuration || apt.duration // Include duration from appointment data
    }));
    
    res.json(availability);
  } catch (error) {
    console.error('Error fetching appointment availability:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/appointments/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDatabase();
    const appointmentsCollection = db.collection('appointments');
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid appointment ID' });
    }
    
    const updatedAppointment = {
      ...req.body,
      updatedAt: new Date()
    };
    
    const result = await appointmentsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedAppointment }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    res.json({ id, ...updatedAppointment });
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark cash payment as received
app.patch('/api/appointments/:id/payment', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;
    const db = await getDatabase();
    const appointmentsCollection = db.collection('appointments');
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid appointment ID' });
    }

    if (!['pending', 'paid', 'refunded'].includes(paymentStatus)) {
      return res.status(400).json({ error: 'Invalid payment status' });
    }
    
    const result = await appointmentsCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          paymentStatus,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    res.json({ message: 'Payment status updated successfully' });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Customer appointment lookup (no auth required)
app.get('/api/appointments/customer', async (req, res) => {
  try {
    const { email, phone } = req.query;

    if (!email && !phone) {
      return res.status(400).json({ error: 'Either email or phone number is required' });
    }

    const db = await getDatabase();
    const appointmentsCollection = db.collection('appointments');
    
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
    
    const appointments = await appointmentsCollection
      .find(query)
      .sort({ date: 1, time: 1 })
      .toArray();
    
    res.json(appointments);
  } catch (error) {
    console.error('Error finding customer appointments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel appointment (no auth required for customers, optional auth for admin)
app.patch('/api/appointments/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDatabase();
    const appointmentsCollection = db.collection('appointments');
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid appointment ID' });
    }

    // Check if this is an admin request (has auth token)
    const authHeader = req.headers.authorization;
    const isAdminRequest = authHeader?.startsWith('Bearer ');

    // First check if appointment exists and is cancellable
    const appointment = await appointmentsCollection.findOne({ _id: new ObjectId(id) });
    
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    if (appointment.status === 'cancelled') {
      return res.status(400).json({ error: 'Appointment is already cancelled' });
    }

    // Only apply business logic restrictions for customer requests (non-admin)
    if (!isAdminRequest) {
      if (appointment.status === 'completed') {
        return res.status(400).json({ error: 'Cannot cancel a completed appointment' });
      }

      // Check if appointment is in the past
      const appointmentDateTime = new Date(`${appointment.date}T${appointment.time}`);
      const now = new Date();
      
      if (appointmentDateTime < now) {
        return res.status(400).json({ error: 'Cannot cancel appointments in the past' });
      }
    }
    
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
    
    res.json({ message: 'Appointment cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/appointments/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDatabase();
    const appointmentsCollection = db.collection('appointments');
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid appointment ID' });
    }
    
    const result = await appointmentsCollection.deleteOne({ 
      _id: new ObjectId(id) 
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Debug endpoint to check appointment statuses
app.get('/api/debug/appointments', async (req, res) => {
  try {
    const db = await getDatabase();
    const appointmentsCollection = db.collection('appointments');
    
    const appointments = await appointmentsCollection.find({}).toArray();
    
    const summary = {
      total: appointments.length,
      byStatus: {},
      byPaymentStatus: {},
      completedAndPaid: 0,
      recentAppointments: appointments.slice(-5).map(apt => ({
        _id: apt._id,
        customerName: apt.customerName,
        service: apt.service,
        date: apt.date,
        status: apt.status,
        paymentStatus: apt.paymentStatus,
        paymentMethod: apt.paymentMethod,
        servicePrice: apt.servicePrice
      }))
    };
    
    appointments.forEach(apt => {
      // Count by status
      summary.byStatus[apt.status] = (summary.byStatus[apt.status] || 0) + 1;
      
      // Count by payment status
      summary.byPaymentStatus[apt.paymentStatus] = (summary.byPaymentStatus[apt.paymentStatus] || 0) + 1;
      
      // Count completed and paid
      if (apt.status === 'completed' && apt.paymentStatus === 'paid') {
        summary.completedAndPaid++;
      }
    });
    
    res.json(summary);
  } catch (error) {
    console.error('Debug appointments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Revenue endpoint
app.get('/api/revenue', authMiddleware, async (req, res) => {
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

    res.json(processedData);
  } catch (error) {
    console.error('Error fetching revenue:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reviews endpoint
app.get('/api/reviews', async (req, res) => {
  try {
    console.log('Reviews endpoint hit');
    const db = await getDatabase();
    
    // Get limit from query parameter
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    
    // Fetch reviews from database, sorted by creation date (newest first)
    let query = db.collection('reviews').find({}).sort({ createdAt: -1 });
    
    if (limit) {
      query = query.limit(limit);
    }
    
    const reviews = await query.toArray();
    res.json(reviews);
  } catch (error) {
    console.error('Error in reviews endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create review endpoint
app.post('/api/reviews', async (req, res) => {
  try {
    console.log('Create review endpoint hit', req.body);
    const { customerName, customerEmail, rating, comment, service, appointmentId } = req.body;
    
    // Basic validation
    if (!customerName || !rating || !comment) {
      return res.status(400).json({ error: 'Customer name, rating, and comment are required' });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    
    const db = await getDatabase();
    const reviewData = {
      customerName,
      customerEmail,
      rating: Number(rating),
      comment,
      service,
      appointmentId,
      status: 'pending', // Reviews start as pending for moderation
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const result = await db.collection('reviews').insertOne(reviewData);
    
    res.status(201).json({
      _id: result.insertedId,
      message: 'Review submitted successfully'
    });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`API Server running on port ${PORT}`);
});
