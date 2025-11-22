// User and Authentication Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'inventory_manager' | 'warehouse_staff';
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
}

// Product Types
export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unitOfMeasure: string;
  initialStock?: number;
  reorderLevel?: number;
  reorderQuantity?: number;
}

export interface ProductStock {
  productId: string;
  warehouseId: string;
  quantity: number;
}

// Warehouse Types
export interface Warehouse {
  id: string;
  name: string;
  location: string;
  description?: string;
}

// Document Types
export type DocumentType = 'receipt' | 'delivery' | 'transfer' | 'adjustment';
export type DocumentStatus = 'draft' | 'waiting' | 'ready' | 'done' | 'canceled';

export interface Document {
  id: string;
  type: DocumentType;
  status: DocumentStatus;
  warehouseId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  scheduledDate?: Date;
}

// Receipt (Incoming Stock)
export interface Receipt extends Document {
  type: 'receipt';
  supplier: string;
  items: ReceiptItem[];
}

export interface ReceiptItem {
  productId: string;
  quantity: number;
  unitPrice?: number;
}

// Delivery Order (Outgoing Stock)
export interface DeliveryOrder extends Document {
  type: 'delivery';
  customer: string;
  items: DeliveryItem[];
}

export interface DeliveryItem {
  productId: string;
  quantity: number;
}

// Internal Transfer
export interface InternalTransfer extends Document {
  type: 'transfer';
  fromWarehouseId: string;
  toWarehouseId: string;
  items: TransferItem[];
}

export interface TransferItem {
  productId: string;
  quantity: number;
}

// Stock Adjustment
export interface StockAdjustment extends Document {
  type: 'adjustment';
  reason: string;
  items: AdjustmentItem[];
}

export interface AdjustmentItem {
  productId: string;
  countedQuantity: number;
  recordedQuantity: number;
  difference: number;
}

// Move History / Ledger Entry
export interface MoveHistory {
  id: string;
  productId: string;
  warehouseId: string;
  documentId: string;
  documentType: DocumentType;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  movementType: 'in' | 'out' | 'transfer';
  timestamp: Date;
  userId: string;
}

// Dashboard KPIs
export interface DashboardKPIs {
  totalProducts: number;
  lowStockItems: number;
  outOfStockItems: number;
  pendingReceipts: number;
  pendingDeliveries: number;
  scheduledTransfers: number;
}

// Filter Types
export interface DocumentFilters {
  type?: DocumentType[];
  status?: DocumentStatus[];
  warehouseId?: string;
  category?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

