import axios from 'axios';
import type { AxiosInstance } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: any) => {
        if (error.response?.status === 401) {
          // Unauthorized - clear token and redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        } else if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
          // Network error - API might not be running
          console.error('Network error: Make sure the backend server is running on http://localhost:3001');
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', { email, password });
    if (response.data.data.token) {
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
    }
    return response.data;
  }

  async signup(name: string, email: string, password: string, role: string) {
    const response = await this.client.post('/auth/signup', {
      name,
      email,
      password,
      role,
    });
    if (response.data.data.token) {
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
    }
    return response.data;
  }

  async forgotPassword(email: string) {
    return this.client.post('/auth/forgot-password', { email });
  }

  async resetPassword(email: string, otp: string, newPassword: string) {
    return this.client.post('/auth/reset-password', {
      email,
      otp,
      newPassword,
    });
  }

  async getMe() {
    return this.client.get('/auth/me');
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  // Products
  async getProducts() {
    return this.client.get('/products');
  }

  async getProduct(id: string) {
    return this.client.get(`/products/${id}`);
  }

  async createProduct(data: any) {
    return this.client.post('/products', data);
  }

  async updateProduct(id: string, data: any) {
    return this.client.put(`/products/${id}`, data);
  }

  async deleteProduct(id: string) {
    return this.client.delete(`/products/${id}`);
  }

  async getProductStock(productId: string, warehouseId: string) {
    return this.client.get(`/products/stock/${productId}/${warehouseId}`);
  }

  async getAllStock() {
    return this.client.get('/products/stock');
  }

  // Stock Management (new dedicated endpoints)
  async getStock(productId: string, warehouseId: string) {
    return this.client.get(`/stock/${productId}/${warehouseId}`);
  }

  async getAllStockWithFilters(filters?: {
    productId?: string;
    warehouseId?: string;
    category?: string;
    lowStock?: boolean;
    outOfStock?: boolean;
  }) {
    return this.client.get('/stock', { params: filters });
  }

  async getStockByWarehouse(warehouseId: string) {
    return this.client.get(`/stock/warehouse/${warehouseId}`);
  }

  async getStockByProduct(productId: string) {
    return this.client.get(`/stock/product/${productId}`);
  }

  async initializeStock(data: {
    productId: string;
    warehouseId: string;
    quantity: number;
    reason?: string;
  }) {
    return this.client.post('/stock/initialize', data);
  }

  async bulkInitializeStock(data: {
    warehouseId: string;
    items: Array<{ productId: string; quantity: number }>;
    reason?: string;
  }) {
    return this.client.post('/stock/initialize/bulk', data);
  }

  async getLowStockAlerts(warehouseId?: string) {
    return this.client.get('/stock/alerts/low-stock', {
      params: warehouseId ? { warehouseId } : {},
    });
  }

  // Warehouses
  async getWarehouses() {
    return this.client.get('/warehouses');
  }

  async getWarehouse(id: string) {
    return this.client.get(`/warehouses/${id}`);
  }

  async createWarehouse(data: any) {
    return this.client.post('/warehouses', data);
  }

  async updateWarehouse(id: string, data: any) {
    return this.client.put(`/warehouses/${id}`, data);
  }

  // Receipts
  async getReceipts() {
    return this.client.get('/receipts');
  }

  async getReceipt(id: string) {
    return this.client.get(`/receipts/${id}`);
  }

  async createReceipt(data: any) {
    return this.client.post('/receipts', data);
  }

  async updateReceipt(id: string, data: any) {
    return this.client.put(`/receipts/${id}`, data);
  }

  async validateReceipt(id: string) {
    return this.client.post(`/receipts/${id}/validate`);
  }

  // Deliveries
  async getDeliveries() {
    return this.client.get('/deliveries');
  }

  async getDelivery(id: string) {
    return this.client.get(`/deliveries/${id}`);
  }

  async createDelivery(data: any) {
    return this.client.post('/deliveries', data);
  }

  async updateDelivery(id: string, data: any) {
    return this.client.put(`/deliveries/${id}`, data);
  }

  async validateDelivery(id: string) {
    return this.client.post(`/deliveries/${id}/validate`);
  }

  // Transfers
  async getTransfers() {
    return this.client.get('/transfers');
  }

  async getTransfer(id: string) {
    return this.client.get(`/transfers/${id}`);
  }

  async createTransfer(data: any) {
    return this.client.post('/transfers', data);
  }

  async updateTransfer(id: string, data: any) {
    return this.client.put(`/transfers/${id}`, data);
  }

  async validateTransfer(id: string) {
    return this.client.post(`/transfers/${id}/validate`);
  }

  // Adjustments
  async getAdjustments() {
    return this.client.get('/adjustments');
  }

  async getAdjustment(id: string) {
    return this.client.get(`/adjustments/${id}`);
  }

  async createAdjustment(data: any) {
    return this.client.post('/adjustments', data);
  }

  async updateAdjustment(id: string, data: any) {
    return this.client.put(`/adjustments/${id}`, data);
  }

  async validateAdjustment(id: string) {
    return this.client.post(`/adjustments/${id}/validate`);
  }

  // History
  async getHistory(filters?: any) {
    return this.client.get('/history', { params: filters });
  }

  // Dashboard
  async getKPIs() {
    return this.client.get('/dashboard/kpis');
  }

  async getDashboardData() {
    return this.client.get('/dashboard/data');
  }
}

export const api = new ApiClient();

