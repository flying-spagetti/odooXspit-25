import { api } from '../services/api';
import type {
  User,
  Product,
  Warehouse,
  Receipt,
  DeliveryOrder,
  InternalTransfer,
  StockAdjustment,
  ProductStock,
  MoveHistory,
  DashboardKPIs,
} from '../types';

// API-based store to replace in-memory store
class ApiStore {
  // User Management
  setCurrentUser(user: User | null) {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  // Product Management
  async getProducts(): Promise<Product[]> {
    const response = await api.getProducts();
    return response.data.data || [];
  }

  async getProduct(id: string): Promise<Product | null> {
    try {
      const response = await api.getProduct(id);
      return response.data.data || null;
    } catch (error) {
      return null;
    }
  }

  async createProduct(product: Omit<Product, 'id'>): Promise<Product> {
    const response = await api.createProduct(product);
    return response.data.data;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
    try {
      const response = await api.updateProduct(id, updates);
      return response.data.data || null;
    } catch (error) {
      return null;
    }
  }

  async deleteProduct(id: string): Promise<boolean> {
    try {
      await api.deleteProduct(id);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Warehouse Management
  async getWarehouses(): Promise<Warehouse[]> {
    const response = await api.getWarehouses();
    return response.data.data || [];
  }

  async getWarehouse(id: string): Promise<Warehouse | null> {
    try {
      const response = await api.getWarehouse(id);
      return response.data.data || null;
    } catch (error) {
      return null;
    }
  }

  async createWarehouse(warehouse: Omit<Warehouse, 'id'>): Promise<Warehouse> {
    const response = await api.createWarehouse(warehouse);
    return response.data.data;
  }

  async updateWarehouse(id: string, updates: Partial<Warehouse>): Promise<Warehouse | null> {
    try {
      const response = await api.updateWarehouse(id, updates);
      return response.data.data || null;
    } catch (error) {
      return null;
    }
  }

  // Stock Management
  async getProductStock(productId: string, warehouseId: string): Promise<number> {
    try {
      const response = await api.getProductStock(productId, warehouseId);
      return response.data.data?.quantity || 0;
    } catch (error) {
      return 0;
    }
  }

  async getAllStockWithFilters(filters?: {
    productId?: string;
    warehouseId?: string;
    category?: string;
    lowStock?: boolean;
    outOfStock?: boolean;
  }) {
    const response = await api.getAllStockWithFilters(filters);
    return response.data.data || [];
  }

  async getStockByWarehouse(warehouseId: string) {
    const response = await api.getStockByWarehouse(warehouseId);
    return response.data.data;
  }

  async getStockByProduct(productId: string) {
    const response = await api.getStockByProduct(productId);
    return response.data.data;
  }

  async initializeStock(data: {
    productId: string;
    warehouseId: string;
    quantity: number;
    reason?: string;
  }) {
    const response = await api.initializeStock(data);
    return response.data.data;
  }

  async bulkInitializeStock(data: {
    warehouseId: string;
    items: Array<{ productId: string; quantity: number }>;
    reason?: string;
  }) {
    const response = await api.bulkInitializeStock(data);
    return response.data.data;
  }

  async getLowStockAlerts(warehouseId?: string) {
    const response = await api.getLowStockAlerts(warehouseId);
    return response.data.data || [];
  }

  // Receipt Management
  async getReceipts(): Promise<Receipt[]> {
    const response = await api.getReceipts();
    const receipts = response.data.data || [];
    return receipts.map(this.mapReceipt);
  }

  async createReceipt(receipt: Omit<Receipt, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<Receipt> {
    const response = await api.createReceipt({
      supplier: receipt.supplier,
      warehouseId: receipt.warehouseId,
      status: receipt.status,
      items: receipt.items,
    });
    return this.mapReceipt(response.data.data);
  }

  // Delivery Management
  async getDeliveries(): Promise<DeliveryOrder[]> {
    const response = await api.getDeliveries();
    const deliveries = response.data.data || [];
    return deliveries.map(this.mapDelivery);
  }

  async createDelivery(
    delivery: Omit<DeliveryOrder, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>
  ): Promise<DeliveryOrder> {
    const response = await api.createDelivery({
      customer: delivery.customer,
      warehouseId: delivery.warehouseId,
      status: delivery.status,
      items: delivery.items,
    });
    return this.mapDelivery(response.data.data);
  }

  // Transfer Management
  async getTransfers(): Promise<InternalTransfer[]> {
    const response = await api.getTransfers();
    const transfers = response.data.data || [];
    return transfers.map(this.mapTransfer);
  }

  async createTransfer(
    transfer: Omit<InternalTransfer, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>
  ): Promise<InternalTransfer> {
    const response = await api.createTransfer({
      fromWarehouseId: transfer.fromWarehouseId,
      toWarehouseId: transfer.toWarehouseId,
      warehouseId: transfer.warehouseId,
      status: transfer.status,
      items: transfer.items,
    });
    return this.mapTransfer(response.data.data);
  }

  // Adjustment Management
  async getAdjustments(): Promise<StockAdjustment[]> {
    const response = await api.getAdjustments();
    const adjustments = response.data.data || [];
    return adjustments.map(this.mapAdjustment);
  }

  async createAdjustment(
    adjustment: Omit<StockAdjustment, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>
  ): Promise<StockAdjustment> {
    const response = await api.createAdjustment({
      warehouseId: adjustment.warehouseId,
      reason: adjustment.reason,
      status: adjustment.status,
      items: adjustment.items.map(item => ({
        productId: item.productId,
        countedQuantity: item.countedQuantity,
      })),
    });
    return this.mapAdjustment(response.data.data);
  }

  // Move History
  async getMoveHistory(): Promise<MoveHistory[]> {
    const response = await api.getHistory();
    const history = response.data.data || [];
    return history.map((item: any) => ({
      id: item.id,
      productId: item.product_id,
      warehouseId: item.warehouse_id,
      documentId: item.document_id,
      documentType: item.document_type,
      quantity: item.quantity,
      quantityBefore: item.quantity_before,
      quantityAfter: item.quantity_after,
      movementType: item.movement_type,
      timestamp: new Date(item.timestamp),
      userId: item.user_id,
    }));
  }

  // Dashboard KPIs
  async getDashboardKPIs(): Promise<DashboardKPIs> {
    const response = await api.getKPIs();
    return response.data.data;
  }

  async getDashboardData() {
    const response = await api.getDashboardData();
    return response.data.data;
  }

  // Helper methods to map database responses to frontend types
  private mapReceipt(data: any): Receipt {
    return {
      id: data.id,
      type: 'receipt',
      supplier: data.supplier,
      warehouseId: data.warehouse_id,
      status: data.status,
      items: data.items || [],
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      createdBy: data.created_by,
      scheduledDate: data.scheduled_date ? new Date(data.scheduled_date) : undefined,
    };
  }

  private mapDelivery(data: any): DeliveryOrder {
    return {
      id: data.id,
      type: 'delivery',
      customer: data.customer,
      warehouseId: data.warehouse_id,
      status: data.status,
      items: data.items || [],
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      createdBy: data.created_by,
      scheduledDate: data.scheduled_date ? new Date(data.scheduled_date) : undefined,
    };
  }

  private mapTransfer(data: any): InternalTransfer {
    return {
      id: data.id,
      type: 'transfer',
      fromWarehouseId: data.from_warehouse_id,
      toWarehouseId: data.to_warehouse_id,
      warehouseId: data.warehouse_id,
      status: data.status,
      items: data.items || [],
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      createdBy: data.created_by,
      scheduledDate: data.scheduled_date ? new Date(data.scheduled_date) : undefined,
    };
  }

  private mapAdjustment(data: any): StockAdjustment {
    return {
      id: data.id,
      type: 'adjustment',
      warehouseId: data.warehouse_id,
      reason: data.reason,
      status: data.status,
      items: (data.items || []).map((item: any) => ({
        productId: item.product_id,
        countedQuantity: item.counted_quantity,
        recordedQuantity: item.recorded_quantity,
        difference: item.difference,
      })),
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      createdBy: data.created_by,
    };
  }
}

export const store = new ApiStore();

