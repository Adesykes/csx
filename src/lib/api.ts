const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-vercel-app.vercel.app/api' 
  : '/api';

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem('authToken');
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  // Auth methods
  async login(email: string, password: string) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (response.token) {
      this.token = response.token;
      localStorage.setItem('authToken', response.token);
    }
    
    return response;
  }

  logout() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  // Services methods
  async getServices() {
    return this.request('/services');
  }

  async createService(serviceData: any) {
    return this.request('/services', {
      method: 'POST',
      body: JSON.stringify(serviceData),
    });
  }

  async updateService(serviceData: any) {
    return this.request('/services', {
      method: 'PUT',
      body: JSON.stringify(serviceData),
    });
  }

  async deleteService(serviceId: string) {
    return this.request(`/services?id=${serviceId}`, {
      method: 'DELETE',
    });
  }

  // Appointments methods
  async getAppointments() {
    return this.request('/appointments');
  }

  async createAppointment(appointmentData: any) {
    return this.request('/appointments', {
      method: 'POST',
      body: JSON.stringify(appointmentData),
    });
  }

  async updateAppointment(appointmentData: any) {
    return this.request('/appointments', {
      method: 'PUT',
      body: JSON.stringify(appointmentData),
    });
  }

  // Payment methods
  async createPaymentIntent(amount: number, appointmentId: string) {
    return this.request('/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ amount, appointmentId }),
    });
  }

  // Revenue methods
  async getRevenue(startDate: string, endDate: string) {
    return this.request(`/revenue?startDate=${startDate}&endDate=${endDate}`);
  }
}

export const apiClient = new ApiClient(API_BASE_URL);