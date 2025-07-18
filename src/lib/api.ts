const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-vercel-app.vercel.app/api' 
  : 'http://localhost:3000/api';

import { Service } from '../types';

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface Appointment {
  _id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  service: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  paymentMethod: 'online' | 'cash';
  notes?: string;
}

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
}

interface Revenue {
  total: number;
  appointments: Array<{
    _id: string;
    customerName: string;
    service: string;
    amount: number;
    date: string;
  }>;
}

interface DaySchedule {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem('authToken');
  }

  private getToken(): string | null {
    // Always get the latest token from localStorage
    return localStorage.getItem('authToken');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getToken();

    const requestHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      (requestHeaders as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: requestHeaders,
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `API Error: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  // Auth methods
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (response.token) {
      this.token = response.token;
      localStorage.setItem('authToken', response.token);
    }
    
    return response;
  }

  logout(): void {
    this.token = null;
    localStorage.removeItem('authToken');
    // Redirect to home page on logout
    window.location.href = '/';
  }

  // Services methods
  async getServices() {
    return this.request<Service[]>('/services');
  }

  async createService(serviceData: Omit<Service, '_id'>) {
    return this.request<Service>('/services', {
      method: 'POST',
      body: JSON.stringify(serviceData),
    });
  }

  async updateService(serviceId: string, serviceData: Partial<Omit<Service, '_id'>>) {
    return this.request<Service>(`/services/${serviceId}`, {
      method: 'PUT',
      body: JSON.stringify(serviceData),
    });
  }

  async deleteService(serviceId: string) {
    return this.request<void>(`/services/${serviceId}`, {
      method: 'DELETE',
    });
  }

  // Appointments methods
  async getAppointments() {
    return this.request<Appointment[]>('/appointments');
  }

  async createAppointment(appointmentData: Omit<Appointment, '_id'>) {
    return this.request<Appointment>('/appointments', {
      method: 'POST',
      body: JSON.stringify(appointmentData),
    });
  }

  async updateAppointment(appointmentId: string, status: Appointment['status']) {
    return this.request<Appointment>(`/appointments/${appointmentId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async markPaymentReceived(appointmentId: string, paymentStatus: 'paid' | 'pending' | 'refunded') {
    return this.request<{ message: string }>(`/appointments/${appointmentId}/payment`, {
      method: 'PATCH',
      body: JSON.stringify({ paymentStatus }),
    });
  }

  async findAppointmentsByCustomer(customerEmail: string, customerPhone: string) {
    return this.request<Appointment[]>(`/appointments/customer?email=${encodeURIComponent(customerEmail)}&phone=${encodeURIComponent(customerPhone)}`);
  }

  async cancelAppointment(appointmentId: string) {
    return this.request<{ message: string }>(`/appointments/${appointmentId}/cancel`, {
      method: 'PATCH',
    });
  }

  async deleteAppointment(appointmentId: string) {
    return this.request<{ message: string }>(`/appointments/${appointmentId}`, {
      method: 'DELETE',
    });
  }

  // Payment methods
  async createPaymentIntent(amount: number, appointmentId: string) {
    return this.request<{ clientSecret: string }>('/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ amount, appointmentId }),
    });
  }

  // Revenue methods
  async getRevenue(startDate: string, endDate: string) {
    return this.request<Revenue[]>(`/revenue?startDate=${startDate}&endDate=${endDate}`);
  }

  // Business Hours methods
  async getBusinessHours() {
    return this.request<DaySchedule[]>('/business-hours');
  }

  async updateBusinessHours(schedule: DaySchedule[]) {
    if (!this.token) {
      throw new Error('Authentication required');
    }
    return this.request<{ message: string }>('/business-hours', {
      method: 'PUT',
      body: JSON.stringify({ schedule })
    });
  }

  // Closure dates methods
  async getClosureDates() {
    return this.request<Array<{
      _id: string;
      date: string;
      reason: string;
      createdAt: string;
    }>>('/closure-dates');
  }

  async addClosureDate(closure: { date: string; reason: string }) {
    if (!this.token) {
      throw new Error('Authentication required');
    }
    return this.request<{
      _id: string;
      date: string;
      reason: string;
      createdAt: string;
    }>('/closure-dates', {
      method: 'POST',
      body: JSON.stringify(closure)
    });
  }

  async removeClosureDate(id: string) {
    if (!this.token) {
      throw new Error('Authentication required');
    }
    return this.request<{ message: string }>(`/closure-dates/${id}`, {
      method: 'DELETE'
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);