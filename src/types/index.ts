export interface Service {
  _id?: string;  // MongoDB ID
  id?: string;   // Transformed ID
  name: string;
  description: string;
  price: number;
  duration: number; // in minutes
  category: string;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  created_at?: string;
  updated_at?: string;
}

export interface Appointment {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'cancelled';
  paymentIntentId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimeSlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  available: boolean;
  service_id?: string;
}

export interface DaySchedule {
  day: string;
  openTime: string;
  closeTime: string;
  isOpen: boolean;
}

export interface Review {
  _id?: string;
  id?: string;
  customerName: string;
  customerEmail?: string;
  rating: number; // 1-5 stars
  comment: string;
  service?: string; // Optional: which service they reviewed
  appointmentId?: string; // Optional: link to appointment
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface Revenue {
  date: string;
  totalRevenue: number;
  appointmentCount: number;
  onlinePayments: number;
  cashPayments: number;
  services: Record<string, { 
    count: number; 
    revenue: number; 
    onlineRevenue: number; 
    cashRevenue: number; 
  }>;
}