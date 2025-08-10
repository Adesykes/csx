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
const PORT = process.env.PORT || 10000;

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

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

// Handle preflight requests explicitly
app.options('*', (req, res) => {
  const origin = req.headers.origin;
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
  
  if (!origin || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Origin, X-Requested-With, Accept');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    res.sendStatus(200);
  } else {
    console.log('OPTIONS request blocked for origin:', origin);
    res.sendStatus(403);
  }
});

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
    version: '1.0.2', // Updated version to test deployment
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    reviewsTest: 'Reviews should work now' // Test field
  });
});

// Ping endpoint to keep server alive and warm up database
app.get('/ping', async (req, res) => {
  try {
    // Warm up database connection
    const db = await getDatabase();
    await db.admin().ping();
    
    res.status(200).json({ 
      message: 'pong',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    console.error('Database ping failed:', error);
    res.status(200).json({ 
      message: 'pong',
      timestamp: new Date().toISOString(),
      database: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
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

// Simple in-memory cache for services
let servicesCache: any[] | null = null;
let servicesCacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Services endpoints
app.get('/api/services', async (req, res) => {
  try {
    // Check if cache is valid
    const now = Date.now();
    if (servicesCache && (now - servicesCacheTimestamp) < CACHE_DURATION) {
      return res.json(servicesCache);
    }

    const db = await getDatabase();
    const services = await db.collection('services').find({}).toArray();
    
    // Update cache
    servicesCache = services;
    servicesCacheTimestamp = now;
    
    res.json(services);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/services', authMiddleware, async (req, res) => {
  try {
    const { name, description, price, duration } = req.body;
    
    if (!name || !description || !price || !duration) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const db = await getDatabase();
    const result = await db.collection('services').insertOne({
      name,
      description,
      price: parseFloat(price),
      duration: parseInt(duration),
      createdAt: new Date()
    });

    // Invalidate cache
    servicesCache = null;

    res.status(201).json({ 
      id: result.insertedId,
      message: 'Service created successfully' 
    });
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/services/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, duration } = req.body;
    
    if (!name || !description || !price || !duration) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid service ID' });
    }

    const db = await getDatabase();
    const result = await db.collection('services').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: {
          name,
          description,
          price: parseFloat(price),
          duration: parseInt(duration),
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Invalidate cache
    servicesCache = null;

    res.json({ message: 'Service updated successfully' });
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/services/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid service ID' });
    }

    const db = await getDatabase();
    const result = await db.collection('services').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Invalidate cache
    servicesCache = null;

    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Simple reviews endpoint for testing
app.get('/api/reviews', async (req, res) => {
  try {
    console.log('Reviews endpoint hit');
    res.json({ message: 'Reviews endpoint working', reviews: [], timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Error in reviews endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Business hours endpoints
app.get('/api/business-hours', async (req, res) => {
  try {
    const db = await getDatabase();
    let businessHours = await db.collection('businessHours').findOne({});
    
    if (!businessHours) {
      // Create default business hours if none exist
      const defaultHours = {
        monday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
        tuesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
        wednesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
        thursday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
        friday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
        saturday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
        sunday: { isOpen: false, openTime: '09:00', closeTime: '17:00' },
      };
      
      const result = await db.collection('businessHours').insertOne(defaultHours);
      businessHours = { ...defaultHours, _id: result.insertedId };
    }
    
    res.json(businessHours);
  } catch (error) {
    console.error('Error fetching business hours:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/business-hours', authMiddleware, async (req, res) => {
  try {
    const hours = req.body;
    
    // Validate the structure
    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    for (const day of daysOfWeek) {
      if (!hours[day] || typeof hours[day].isOpen !== 'boolean') {
        return res.status(400).json({ error: `Invalid data for ${day}` });
      }
      if (hours[day].isOpen && (!hours[day].openTime || !hours[day].closeTime)) {
        return res.status(400).json({ error: `Open and close times required for ${day}` });
      }
    }

    const db = await getDatabase();
    
    // Update or insert business hours
    const result = await db.collection('businessHours').replaceOne(
      {},
      { ...hours, updatedAt: new Date() },
      { upsert: true }
    );

    res.json({ message: 'Business hours updated successfully' });
  } catch (error) {
    console.error('Error updating business hours:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Closure dates endpoints
app.get('/api/closure-dates', async (req, res) => {
  try {
    const db = await getDatabase();
    const closureDates = await db.collection('closureDates').find({}).toArray();
    res.json(closureDates);
  } catch (error) {
    console.error('Error fetching closure dates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/closure-dates', authMiddleware, async (req, res) => {
  try {
    const { date, reason } = req.body;
    
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const db = await getDatabase();
    
    // Check if the date is already a closure date
    const existingClosure = await db.collection('closureDates').findOne({ date });
    if (existingClosure) {
      return res.status(400).json({ error: 'This date is already marked as closed' });
    }

    // Check if there are any appointments on this date
    const appointmentsOnDate = await db.collection('appointments').find({ 
      date,
      status: { $ne: 'cancelled' }
    }).toArray();

    if (appointmentsOnDate.length > 0) {
      return res.status(400).json({ 
        error: `Cannot close this date. There are ${appointmentsOnDate.length} appointments scheduled.`,
        appointments: appointmentsOnDate.map(apt => ({
          id: apt._id,
          time: apt.time,
          customerName: apt.customerName,
          service: apt.service
        }))
      });
    }

    const result = await db.collection('closureDates').insertOne({
      date,
      reason: reason || 'Closed',
      createdAt: new Date()
    });

    res.status(201).json({ 
      id: result.insertedId,
      message: 'Closure date added successfully' 
    });
  } catch (error) {
    console.error('Error adding closure date:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/closure-dates/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid closure date ID' });
    }

    const db = await getDatabase();
    const result = await db.collection('closureDates').deleteOne({ _id: new ObjectId(id) });

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
    const { date } = req.query;
    
    const db = await getDatabase();
    let query = {};
    
    if (date) {
      query = { date };
    }
    
    const appointments = await db.collection('appointments').find(query).toArray();
    res.json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/appointments', async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone, date, time, service, servicePrice, extras, totalPrice, paymentMethod } = req.body;
    
    if (!customerName || !customerEmail || !customerPhone || !date || !time || !service) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    const db = await getDatabase();
    const result = await db.collection('appointments').insertOne({
      customerName,
      customerEmail,
      customerPhone,
      date,
      time,
      service,
      servicePrice: parseFloat(servicePrice || 0),
      extras: extras || [],
      totalPrice: parseFloat(totalPrice || servicePrice || 0),
      paymentMethod: paymentMethod || 'cash',
      paymentStatus: 'pending',
      status: 'confirmed',
      createdAt: new Date()
    });

    res.status(201).json({ 
      id: result.insertedId,
      message: 'Appointment booked successfully' 
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Email confirmation endpoint
app.post('/api/send-confirmation-email', sendBookingConfirmationEmail);

// Availability endpoint
app.get('/api/appointments/availability', async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const db = await getDatabase();
    const appointments = await db.collection('appointments').find({ 
      date,
      status: { $ne: 'cancelled' }
    }).toArray();
    
    const bookedTimes = appointments.map(apt => apt.time);
    res.json({ bookedTimes });
  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/appointments/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid appointment ID' });
    }

    // Remove any fields that shouldn't be updated directly
    const allowedUpdates = {
      ...updates,
      updatedAt: new Date()
    };

    const db = await getDatabase();
    const result = await db.collection('appointments').updateOne(
      { _id: new ObjectId(id) },
      { $set: allowedUpdates }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json({ message: 'Appointment updated successfully' });
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/appointments/customer', async (req, res) => {
  try {
    const { email, phone } = req.query;
    
    if (!email && !phone) {
      return res.status(400).json({ error: 'Email or phone is required' });
    }

    const db = await getDatabase();
    let query = {};
    
    if (email) {
      query = { customerEmail: email };
    } else if (phone) {
      query = { customerPhone: phone };
    }
    
    const appointments = await db.collection('appointments').find(query).toArray();
    res.json(appointments);
  } catch (error) {
    console.error('Error fetching customer appointments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/appointments/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid appointment ID' });
    }

    const db = await getDatabase();
    const result = await db.collection('appointments').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change appointment (48-hour rule applies)
app.patch('/api/appointments/:id/change', async (req, res) => {
  try {
    const { id } = req.params;
    const { appointmentDate, startTime, endTime, serviceId, serviceName, servicePrice } = req.body;
    const db = await getDatabase();
    const appointmentsCollection = db.collection('appointments');
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid appointment ID' });
    }

    // Validate required fields
    if (!appointmentDate || !startTime || !endTime) {
      return res.status(400).json({ error: 'Date, start time, and end time are required' });
    }

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
    const newDateTime = new Date(`${appointmentDate}T${startTime}`);
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
      service: serviceName || originalAppointment.service, // Fixed: use 'service' field instead of 'serviceName'
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

    // TODO: Send confirmation email for the new appointment
    // For now, we'll skip the email to avoid complexity - can be added later
    console.log('New appointment created for:', originalAppointment.customerEmail);

    res.json({ 
      message: 'Appointment changed successfully',
      newAppointment: completeNewAppointment,
      cancelledAppointment: completeCancelledAppointment
    });
  } catch (error) {
    console.error('Error changing appointment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Debug endpoint
app.get('/api/debug/appointments', async (req, res) => {
  try {
    const db = await getDatabase();
    const appointments = await db.collection('appointments').find({}).limit(10).toArray();
    
    const summary = {
      total: appointments.length,
      byStatus: {} as Record<string, number>,
      byPaymentStatus: {} as Record<string, number>,
      completedAndPaid: 0,
      paymentMethods: {} as Record<string, number>,
      rawAppointments: appointments.map(apt => ({
        _id: apt._id,
        date: apt.date,
        paymentMethod: apt.paymentMethod,
        paymentStatus: apt.paymentStatus,
        status: apt.status,
        servicePrice: apt.servicePrice,
        service: apt.service
      }))
    };
    
    appointments.forEach(apt => {
      // Count by status
      summary.byStatus[apt.status] = (summary.byStatus[apt.status] || 0) + 1;
      
      // Count by payment status
      summary.byPaymentStatus[apt.paymentStatus] = (summary.byPaymentStatus[apt.paymentStatus] || 0) + 1;
      
      // Count by payment method
      summary.paymentMethods[apt.paymentMethod || 'undefined'] = (summary.paymentMethods[apt.paymentMethod || 'undefined'] || 0) + 1;
      
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

// Revenue endpoint with correct bank_transfer logic
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
              $cond: [
                { $in: ['$paymentMethod', ['bank_transfer', 'online']] }, 
                '$servicePrice', 
                0
              ]
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
        
        if (service.paymentMethod === 'bank_transfer' || service.paymentMethod === 'online') {
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
