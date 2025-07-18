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
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  service_id: string;
  service_name: string;
  service_price: number;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'refunded';
  payment_intent_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
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
  total_revenue: number;
  appointment_count: number;
  services: Record<string, { count: number; revenue: number }>;
}