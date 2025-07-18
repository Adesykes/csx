const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-vercel-app.vercel.app/api' 
  : '/api';

export interface Appointment {
  _id: string;
  customerName: string;
  service: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}

interface Service {
  _id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
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

class ApiClient {
  private baseUrl: string;
  private token: string | null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem('authToken');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const requestHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (this.token) {
      requestHeaders.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers: requestHeaders,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
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

  // Payment methods
  async createPaymentIntent(amount: number, appointmentId: string) {
    return this.request<{ clientSecret: string }>('/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ amount, appointmentId }),
    });
  }

  // Revenue methods
  async getRevenue(startDate: string, endDate: string) {
    return this.request<Revenue>(`/revenue?startDate=${startDate}&endDate=${endDate}`);
  }
}

export const api = new ApiClient(API_BASE_URL);
export const getAppointments = () => api.getAppointments();

export const apiClient = new ApiClient(API_BASE_URL);