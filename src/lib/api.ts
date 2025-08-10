// Smart environment detection for production deployment
const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3000' 
    : 'https://csx-nail-lounge-backend.onrender.com');
console.log('🔧 API_BASE_URL:', API_BASE_URL); // Debug log
console.log('🔧 VITE_API_URL env var:', import.meta.env.VITE_API_URL); // Debug log
console.log('🔧 Current hostname:', window.location.hostname); // Debug log
console.log('🔧 Development mode:', import.meta.env.DEV); // Debug log
console.log('🔧 Production mode:', import.meta.env.PROD); // Debug log

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
  paymentMethod: 'cash' | 'bank_transfer';
  notes?: string;
}

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

interface Revenue {
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

    console.log('🌐 Making API request:', { 
      url, 
      method: options.method || 'GET',
      hasToken: !!token,
      headers: Object.keys(requestHeaders)
    });

    try {
      const response = await fetch(url, {
        ...options,
        headers: requestHeaders,
        credentials: 'include'
      });

      console.log('🌐 API response:', { 
        status: response.status, 
        statusText: response.statusText,
        ok: response.ok,
        url: response.url
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('🌐 API error data:', errorData);
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
    const response = await this.request<AuthResponse>('/api/auth', {
      method: 'POST',
      body: JSON.stringify({ action: 'admin-login', email, password, type: 'admin' }),
    });
    
    if (response.token) {
      this.token = response.token;
      localStorage.setItem('authToken', response.token);
    }
    
    return response;
  }

  async clientLogin(email: string, password: string): Promise<AuthResponse> {
    const normalizedEmail = email.toLowerCase().trim();
    console.log('🔐 Client login attempt:', { email: normalizedEmail, baseUrl: this.baseUrl });
    
    const response = await this.request<AuthResponse>('/api/auth', {
      method: 'POST',
      body: JSON.stringify({ action: 'client-login', email: normalizedEmail, password }),
    });
    
    console.log('🔐 Login response received:', { hasToken: !!response.token, hasUser: !!response.user });
    
    if (response.token) {
      this.token = response.token;
      localStorage.setItem('authToken', response.token);
      console.log('🔐 Token stored in localStorage');
      
      // Store user information if available
      if (response.user) {
        localStorage.setItem('userInfo', JSON.stringify(response.user));
        console.log('🔐 User info stored:', response.user);
      }
    }
    
    return response;
  }

  async clientSignup(name: string, email: string, password: string): Promise<AuthResponse> {
    const normalizedEmail = email.toLowerCase().trim();
    const trimmedName = name.trim();
    
    const response = await this.request<AuthResponse>('/api/auth', {
      method: 'POST',
      body: JSON.stringify({ action: 'client-signup', name: trimmedName, email: normalizedEmail, password }),
    });
    
    if (response.token) {
      this.token = response.token;
      localStorage.setItem('authToken', response.token);
      // Store user information if available
      if (response.user) {
        localStorage.setItem('userInfo', JSON.stringify(response.user));
      }
    }
    
    return response;
  }

  logout(): void {
    this.token = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('userInfo');
    // Redirect to home page on logout
    window.location.href = '/';
  }

  // Services methods
  async getServices() {
    return this.request<Service[]>('/api/services');
  }

  async createService(serviceData: Omit<Service, '_id'>) {
    return this.request<Service>('/api/services', {
      method: 'POST',
      body: JSON.stringify(serviceData),
    });
  }

  async updateService(serviceId: string, serviceData: Partial<Omit<Service, '_id'>>) {
    return this.request<Service>(`/api/services/${serviceId}`, {
      method: 'PUT',
      body: JSON.stringify(serviceData),
    });
  }

  async deleteService(serviceId: string) {
    return this.request<void>(`/api/services/${serviceId}`, {
      method: 'DELETE',
    });
  }

  // Appointments methods
  async getAppointments() {
    return this.request<Appointment[]>('/api/appointments');
  }

  // Public method for checking availability (no auth required)
  async getAppointmentAvailability() {
    return this.request<Array<{
      date: string;
      time: string;
      service: string;
      duration?: number;
    }>>('/api/appointments/availability');
  }

  async createAppointment(appointmentData: Omit<Appointment, '_id'>) {
    return this.request<Appointment>('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(appointmentData),
    });
  }

  async updateAppointment(appointmentId: string, status: Appointment['status']) {
    return this.request<Appointment>(`/api/appointments/${appointmentId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async markPaymentReceived(appointmentId: string, paymentStatus: 'paid' | 'pending' | 'refunded') {
    return this.request<{ message: string }>(`/api/appointments/${appointmentId}/payment`, {
      method: 'PATCH',
      body: JSON.stringify({ paymentStatus }),
    });
  }

  async findAppointmentsByCustomer(customerEmail: string, customerPhone: string) {
    return this.request<Appointment[]>(`/api/appointments/customer?email=${encodeURIComponent(customerEmail)}&phone=${encodeURIComponent(customerPhone)}`);
  }

  async getMyAppointments() {
    // Get appointments for the currently logged-in client
    return this.request<Appointment[]>('/api/appointments/my-appointments');
  }

  async cancelAppointment(appointmentId: string) {
    return this.request<{ message: string }>(`/api/appointments/${appointmentId}/cancel`, {
      method: 'PATCH',
    });
  }

  async changeAppointment(appointmentId: string, newAppointmentData: {
    appointmentDate: string;
    startTime: string;
    endTime: string;
    serviceId?: string;
    serviceName?: string;
    servicePrice?: number;
  }) {
    return this.request<{ 
      message: string; 
      newAppointment: Appointment;
      cancelledAppointment: Appointment;
    }>(`/api/appointments/${appointmentId}/change`, {
      method: 'PATCH',
      body: JSON.stringify(newAppointmentData),
    });
  }

  async deleteAppointment(appointmentId: string) {
    return this.request<{ message: string }>(`/api/appointments/${appointmentId}`, {
      method: 'DELETE',
    });
  }

  // Payment methods
  async createPaymentIntent(amount: number, appointmentId: string) {
    return this.request<{ clientSecret: string }>('/api/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ amount, appointmentId }),
    });
  }

  // Revenue methods
  async getRevenue(startDate: string, endDate: string) {
    return this.request<Revenue[]>(`/api/revenue?startDate=${startDate}&endDate=${endDate}`);
  }

  // Business Hours methods
  async getBusinessHours() {
    return this.request<DaySchedule[]>('/api/business-hours');
  }

  async updateBusinessHours(schedule: DaySchedule[]) {
    if (!this.token) {
      throw new Error('Authentication required');
    }
    return this.request<{ message: string }>('/api/business-hours', {
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
    }>>('/api/closure-dates');
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
    }>('/api/closure-dates', {
      method: 'POST',
      body: JSON.stringify(closure)
    });
  }

  async removeClosureDate(id: string) {
    if (!this.token) {
      throw new Error('Authentication required');
    }
    return this.request<{ message: string }>(`/api/closure-dates/${id}`, {
      method: 'DELETE'
    });
  }

  // Email methods
  async sendConfirmationEmail(emailData: {
    customerName: string;
    customerEmail: string;
    services: any[];
    serviceQuantities: { [key: string]: number };
    date: string;
    time: string;
    totalPrice: number;
    paymentMethod: string;
  }) {
    return this.request<{
      success: boolean;
      customerEmailSent: boolean;
      adminEmailSent: boolean;
      message: string;
    }>('/api/send-confirmation-email', {
      method: 'POST',
      body: JSON.stringify(emailData)
    });
  }

  // Reviews methods
  async getReviews(limit?: number) {
    const query = limit ? `?limit=${limit}` : '';
    return this.request<Array<{
      _id: string;
      customerName: string;
      rating: number;
      comment: string;
      service?: string;
      status: 'pending' | 'approved' | 'rejected';
      createdAt: string;
      updatedAt: string;
    }>>(`/api/reviews${query}`);
  }

  async createReview(reviewData: {
    customerName: string;
    customerEmail?: string;
    rating: number;
    comment: string;
    service?: string;
    appointmentId?: string;
  }) {
    return this.request<{
      _id: string;
      message: string;
    }>('/api/reviews', {
      method: 'POST',
      body: JSON.stringify(reviewData)
    });
  }

  async updateReviewStatus(reviewId: string, status: 'approved' | 'rejected') {
    if (!this.token) {
      throw new Error('Authentication required');
    }
    return this.request<{ message: string }>(`/api/reviews/${reviewId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  async deleteReview(reviewId: string) {
    if (!this.token) {
      throw new Error('Authentication required');
    }
    return this.request<{ message: string }>(`/api/reviews/${reviewId}`, {
      method: 'DELETE'
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);