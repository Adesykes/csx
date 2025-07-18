export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number; // in minutes
  category: string;
  active: boolean;
  created_at: string;
  updated_at: string;
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
  paymentStatus: 'pending' | 'paid' | 'refunded';
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

export interface BusinessHours {
  id: string;
  day_of_week: number; // 0-6 (Sunday-Saturday)
  open_time: string;
  close_time: string;
  is_open: boolean;
}

export interface Revenue {
  date: string;
  totalRevenue: number;
  appointmentCount: number;
  services: Record<string, { count: number; revenue: number }>;
}