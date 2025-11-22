import { v4 as uuidv4 } from 'uuid';
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

// Simple in-memory state management
class Store {
  private users: User[] = [];
  private products: Product[] = [];
  private warehouses: Warehouse[] = [];
  private receipts: Receipt[] = [];
  private deliveries: DeliveryOrder[] = [];
  private transfers: InternalTransfer[] = [];
  private adjustments: StockAdjustment[] = [];
  private productStocks: ProductStock[] = [];
  private moveHistory: MoveHistory[] = [];
  private currentUser: User | null = null;

  // Initialize with sample data
  init() {
    // Create default warehouse
    const defaultWarehouse: Warehouse = {
      id: uuidv4(),
      name: 'Main Warehouse',
      location: 'Headquarters',
      description: 'Primary storage facility',
    };
    this.warehouses.push(defaultWarehouse);

    // Create sample products
    const sampleProducts: Product[] = [
      {
        id: uuidv4(),
        name: 'Steel Rods',
        sku: 'STEEL-001',
        category: 'Raw Materials',
        unitOfMeasure: 'kg',
        reorderLevel: 50,
        reorderQuantity: 100,
      },
      {
        id: uuidv4(),
        name: 'Chairs',
        sku: 'CHAIR-001',
        category: 'Furniture',
        unitOfMeasure: 'units',
        reorderLevel: 20,
        reorderQuantity: 50,
      },
    ];
    this.products.push(...sampleProducts);

    // Initialize stock
    sampleProducts.forEach((product) => {
      this.productStocks.push({
        productId: product.id,
        warehouseId: defaultWarehouse.id,
        quantity: 0,
      });
    });
  }

  // User Management
  setCurrentUser(user: User | null) {
    this.currentUser = user;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  createUser(user: Omit<User, 'id'>): User {
    const newUser: User = {
      ...user,
      id: uuidv4(),
    };
    this.users.push(newUser);
    return newUser;
  }

  findUserByEmail(email: string): User | undefined {
    return this.users.find((u) => u.email === email);
  }

  // Product Management
  getProducts(): Product[] {
    return this.products;
  }

  getProduct(id: string): Product | undefined {
    return this.products.find((p) => p.id === id);
  }

  createProduct(product: Omit<Product, 'id'>): Product {
    const newProduct: Product = {
      ...product,
      id: uuidv4(),
    };
    this.products.push(newProduct);
    return newProduct;
  }

  updateProduct(id: string, updates: Partial<Product>): Product | null {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) return null;
    this.products[index] = { ...this.products[index], ...updates };
    return this.products[index];
  }

  // Warehouse Management
  getWarehouses(): Warehouse[] {
    return this.warehouses;
  }

  getWarehouse(id: string): Warehouse | undefined {
    return this.warehouses.find((w) => w.id === id);
  }

  createWarehouse(warehouse: Omit<Warehouse, 'id'>): Warehouse {
    const newWarehouse: Warehouse = {
      ...warehouse,
      id: uuidv4(),
    };
    this.warehouses.push(newWarehouse);
    return newWarehouse;
  }

  // Stock Management
  getProductStock(productId: string, warehouseId: string): number {
    const stock = this.productStocks.find(
      (s) => s.productId === productId && s.warehouseId === warehouseId
    );
    return stock?.quantity || 0;
  }

  updateStock(
    productId: string,
    warehouseId: string,
    quantity: number,
    documentId: string,
    documentType: string,
    movementType: 'in' | 'out' | 'transfer'
  ) {
    let stock = this.productStocks.find(
      (s) => s.productId === productId && s.warehouseId === warehouseId
    );

    const quantityBefore = stock?.quantity || 0;

    if (!stock) {
      stock = {
        productId,
        warehouseId,
        quantity: 0,
      };
      this.productStocks.push(stock);
    }

    if (movementType === 'in') {
      stock.quantity += quantity;
    } else if (movementType === 'out') {
      stock.quantity = Math.max(0, stock.quantity - quantity);
    }

    // Record in move history
    const historyEntry: MoveHistory = {
      id: uuidv4(),
      productId,
      warehouseId,
      documentId,
      documentType: documentType as any,
      quantity: movementType === 'in' ? quantity : -quantity,
      quantityBefore,
      quantityAfter: stock.quantity,
      movementType,
      timestamp: new Date(),
      userId: this.currentUser?.id || '',
    };
    this.moveHistory.push(historyEntry);
  }

  // Receipt Management
  getReceipts(): Receipt[] {
    return this.receipts;
  }

  createReceipt(receipt: Omit<Receipt, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Receipt {
    const newReceipt: Receipt = {
      ...receipt,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: this.currentUser?.id || '',
    };
    this.receipts.push(newReceipt);

    // Update stock when receipt is validated
    if (receipt.status === 'done') {
      receipt.items.forEach((item) => {
        this.updateStock(
          item.productId,
          receipt.warehouseId,
          item.quantity,
          newReceipt.id,
          'receipt',
          'in'
        );
      });
    }

    return newReceipt;
  }

  // Delivery Management
  getDeliveries(): DeliveryOrder[] {
    return this.deliveries;
  }

  createDelivery(
    delivery: Omit<DeliveryOrder, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>
  ): DeliveryOrder {
    const newDelivery: DeliveryOrder = {
      ...delivery,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: this.currentUser?.id || '',
    };
    this.deliveries.push(newDelivery);

    // Update stock when delivery is validated
    if (delivery.status === 'done') {
      delivery.items.forEach((item) => {
        this.updateStock(
          item.productId,
          delivery.warehouseId,
          item.quantity,
          newDelivery.id,
          'delivery',
          'out'
        );
      });
    }

    return newDelivery;
  }

  // Transfer Management
  getTransfers(): InternalTransfer[] {
    return this.transfers;
  }

  createTransfer(
    transfer: Omit<InternalTransfer, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>
  ): InternalTransfer {
    const newTransfer: InternalTransfer = {
      ...transfer,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: this.currentUser?.id || '',
    };
    this.transfers.push(newTransfer);

    // Update stock when transfer is validated
    if (transfer.status === 'done') {
      transfer.items.forEach((item) => {
        // Decrease from source
        this.updateStock(
          item.productId,
          transfer.fromWarehouseId,
          item.quantity,
          newTransfer.id,
          'transfer',
          'out'
        );
        // Increase at destination
        this.updateStock(
          item.productId,
          transfer.toWarehouseId,
          item.quantity,
          newTransfer.id,
          'transfer',
          'in'
        );
      });
    }

    return newTransfer;
  }

  // Adjustment Management
  getAdjustments(): StockAdjustment[] {
    return this.adjustments;
  }

  createAdjustment(
    adjustment: Omit<StockAdjustment, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>
  ): StockAdjustment {
    const newAdjustment: StockAdjustment = {
      ...adjustment,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: this.currentUser?.id || '',
    };
    this.adjustments.push(newAdjustment);

    // Update stock when adjustment is validated
    if (adjustment.status === 'done') {
      adjustment.items.forEach((item) => {
        const difference = item.countedQuantity - item.recordedQuantity;
        if (difference !== 0) {
          this.updateStock(
            item.productId,
            adjustment.warehouseId,
            Math.abs(difference),
            newAdjustment.id,
            'adjustment',
            difference > 0 ? 'in' : 'out'
          );
        }
      });
    }

    return newAdjustment;
  }

  // Move History
  getMoveHistory(): MoveHistory[] {
    return this.moveHistory;
  }

  // Dashboard KPIs
  getDashboardKPIs(): DashboardKPIs {
    const totalProducts = this.products.length;
    let lowStockItems = 0;
    let outOfStockItems = 0;

    this.products.forEach((product) => {
      if (product.reorderLevel !== undefined) {
        const totalStock = this.productStocks
          .filter((s) => s.productId === product.id)
          .reduce((sum, s) => sum + s.quantity, 0);

        if (totalStock === 0) {
          outOfStockItems++;
        } else if (totalStock <= product.reorderLevel) {
          lowStockItems++;
        }
      }
    });

    const pendingReceipts = this.receipts.filter(
      (r) => r.status !== 'done' && r.status !== 'canceled'
    ).length;

    const pendingDeliveries = this.deliveries.filter(
      (d) => d.status !== 'done' && d.status !== 'canceled'
    ).length;

    const scheduledTransfers = this.transfers.filter(
      (t) => t.status !== 'done' && t.status !== 'canceled'
    ).length;

    return {
      totalProducts,
      lowStockItems,
      outOfStockItems,
      pendingReceipts,
      pendingDeliveries,
      scheduledTransfers,
    };
  }
}

export const store = new Store();
store.init();

