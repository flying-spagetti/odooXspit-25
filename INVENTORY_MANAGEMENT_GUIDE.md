# Inventory Management System - Architecture & Operations Guide

## Overview

This inventory management system digitizes and streamlines all stock-related operations by replacing manual registers, Excel sheets, and scattered tracking methods with a centralized, real-time, database-driven application.

## System Architecture

### 1. **Three-Tier Architecture**

```
Frontend (TypeScript/Vite) → API Layer (Express/Node.js) → Database (PostgreSQL)
```

- **Frontend**: React-based UI components (`odooxspit/src/components/`)
- **API Layer**: RESTful API with controllers (`server/src/controllers/`)
- **Database**: PostgreSQL with normalized schema (`server/migrations/`)

### 2. **Core Database Schema**

The system uses a normalized database structure:

#### **Core Tables:**
- `products` - Product master data (SKU, category, reorder levels)
- `warehouses` - Warehouse/location management
- `product_stocks` - Current stock levels (product_id + warehouse_id = unique)
- `move_history` - Complete audit trail of all stock movements

#### **Document Tables:**
- `receipts` + `receipt_items` - Incoming stock from suppliers
- `deliveries` + `delivery_items` - Outgoing stock to customers
- `transfers` + `transfer_items` - Internal transfers between warehouses
- `adjustments` + `adjustment_items` - Stock count adjustments

## Stock Management Flow

### **Central Stock Service** (`server/src/services/stock.service.ts`)

All stock updates flow through a single service function `updateStock()` that ensures:

1. **Atomic Transactions**: Uses database transactions (BEGIN/COMMIT/ROLLBACK)
2. **Real-time Updates**: Immediately updates `product_stocks` table
3. **Complete Audit Trail**: Records every movement in `move_history`
4. **Movement Types**: Supports 'in', 'out', and 'transfer' operations

```typescript
updateStock({
  productId: string,
  warehouseId: string,
  quantity: number,
  documentId: string,      // Links to receipt/delivery/transfer/adjustment
  documentType: string,    // 'receipt', 'delivery', 'transfer', 'adjustment'
  movementType: 'in' | 'out' | 'transfer',
  userId: string          // For audit trail
})
```

### **Stock Update Logic:**

```typescript
// For 'in' movements (receipts, adjustments with positive difference)
quantityAfter = quantityBefore + quantity

// For 'out' movements (deliveries, adjustments with negative difference)
quantityAfter = Math.max(0, quantityBefore - quantity)

// For 'transfer' movements
// Decrease from source warehouse (out)
// Increase at destination warehouse (in)
```

## Document-Based Workflow

The system uses a **document-based workflow** where stock changes only occur when documents are validated (status = 'done').

### **Document Lifecycle:**

```
draft → waiting → ready → done (stock updated) → canceled
```

### **1. Receipts (Incoming Stock)**

**Purpose**: Record goods received from suppliers

**Flow**:
1. Create receipt with status 'draft' or 'waiting'
2. Add items (product, quantity, unit price)
3. Validate receipt → status becomes 'done'
4. **Stock automatically increases** for each item

**Implementation** (`server/src/controllers/receipts.controller.ts`):
- `createReceipt()` - Creates receipt document
- `updateReceipt()` - Updates receipt (handles status changes)
- `validateReceipt()` - Validates and updates stock

**Stock Update Trigger**:
```typescript
if (status === 'done') {
  for (const item of items) {
    await updateStock({
      productId: item.productId,
      warehouseId,
      quantity: item.quantity,
      documentId: receipt.id,
      documentType: 'receipt',
      movementType: 'in',  // Increases stock
      userId: req.user!.id,
    });
  }
}
```

### **2. Deliveries (Outgoing Stock)**

**Purpose**: Record goods shipped to customers

**Flow**:
1. Create delivery order with status 'draft'
2. Add items (product, quantity)
3. Validate delivery → status becomes 'done'
4. **Stock automatically decreases** for each item

**Stock Update Trigger**:
```typescript
movementType: 'out'  // Decreases stock
```

### **3. Internal Transfers**

**Purpose**: Move stock between warehouses

**Flow**:
1. Create transfer from Warehouse A to Warehouse B
2. Add items to transfer
3. Validate transfer → status becomes 'done'
4. **Stock decreases at source, increases at destination**

**Stock Update Trigger**:
```typescript
// Decrease from source
await updateStock({
  warehouseId: fromWarehouseId,
  movementType: 'out',
  ...
});

// Increase at destination
await updateStock({
  warehouseId: toWarehouseId,
  movementType: 'in',
  ...
});
```

### **4. Stock Adjustments**

**Purpose**: Correct discrepancies found during physical inventory counts

**Flow**:
1. Create adjustment document
2. For each product, enter counted quantity
3. System calculates difference: `countedQuantity - recordedQuantity`
4. Validate adjustment → status becomes 'done'
5. **Stock adjusts based on difference** (positive = increase, negative = decrease)

**Stock Update Trigger**:
```typescript
const difference = countedQuantity - recordedQuantity;

if (difference !== 0) {
  await updateStock({
    quantity: Math.abs(difference),
    movementType: difference > 0 ? 'in' : 'out',
    ...
  });
}
```

## Real-Time Stock Tracking

### **Current Stock Levels**

Stock is stored in `product_stocks` table:
```sql
product_stocks (
  product_id UUID,
  warehouse_id UUID,
  quantity INTEGER,
  updated_at TIMESTAMP,
  UNIQUE(product_id, warehouse_id)
)
```

**Key Features**:
- One record per product per warehouse
- Real-time quantity updates
- Automatic timestamp tracking

### **Stock Queries**

**Get stock for specific product/warehouse**:
```typescript
GET /api/products/stock/:productId/:warehouseId
```

**Get all stock levels**:
```typescript
GET /api/products/stock
```

## Complete Audit Trail

### **Move History Table**

Every stock movement is recorded in `move_history`:

```sql
move_history (
  product_id UUID,
  warehouse_id UUID,
  document_id UUID,           -- Links to receipt/delivery/transfer/adjustment
  document_type VARCHAR,      -- 'receipt', 'delivery', 'transfer', 'adjustment'
  quantity INTEGER,           -- Positive for 'in', negative for 'out'
  quantity_before INTEGER,    -- Stock before movement
  quantity_after INTEGER,     -- Stock after movement
  movement_type VARCHAR,      -- 'in', 'out', 'transfer'
  user_id UUID,              -- Who made the change
  timestamp TIMESTAMP         -- When it happened
)
```

**Benefits**:
- Complete traceability
- Can reconstruct stock at any point in time
- User accountability
- Document linkage

### **History Queries**

```typescript
GET /api/history?productId=xxx&warehouseId=yyy&dateFrom=...
```

## Dashboard & KPIs

### **Real-Time Metrics** (`server/src/controllers/dashboard.controller.ts`)

The dashboard provides real-time KPIs:

1. **Total Products**: Count of all products in system
2. **Low Stock Items**: Products at or below reorder level
3. **Out of Stock Items**: Products with zero quantity
4. **Pending Receipts**: Receipts not yet validated
5. **Pending Deliveries**: Deliveries not yet validated
6. **Scheduled Transfers**: Transfers not yet completed

**Query Example**:
```sql
-- Low stock detection
SELECT COUNT(DISTINCT CASE 
  WHEN ps.quantity > 0 AND ps.quantity <= p.reorder_level 
  THEN p.id 
END) as low_stock
FROM products p
LEFT JOIN product_stocks ps ON p.id = ps.product_id
WHERE p.reorder_level IS NOT NULL
```

## Key Features

### **1. Multi-Warehouse Support**

- Products can exist in multiple warehouses
- Stock tracked separately per warehouse
- Transfers between warehouses with full audit trail

### **2. Reorder Management**

- Products have `reorder_level` and `reorder_quantity`
- Dashboard alerts when stock is low
- Automatic detection of out-of-stock items

### **3. Document Status Management**

- Draft documents don't affect stock
- Only validated ('done') documents update stock
- Status transitions are tracked
- Can cancel documents before validation

### **4. Transaction Safety**

- All stock updates use database transactions
- Rollback on errors prevents inconsistent state
- Atomic operations ensure data integrity

### **5. User Accountability**

- Every stock movement records `user_id`
- Complete audit trail with timestamps
- Role-based access control (inventory_manager, warehouse_staff)

## Frontend Integration

### **API Store** (`odooxspit/src/store/api-store.ts`)

The frontend uses an API-based store that:
- Makes HTTP requests to backend API
- Maps database responses to frontend types
- Handles authentication tokens
- Provides type-safe methods for all operations

### **Component Structure**

- `Products.ts` - Product management
- `Receipts.ts` - Receipt creation and validation
- `Deliveries.ts` - Delivery order management
- `Transfers.ts` - Internal transfer management
- `Adjustments.ts` - Stock adjustment management
- `History.ts` - View move history
- `Dashboard.ts` - Real-time KPIs and overview

## Data Flow Example: Receiving Stock

```
1. User creates Receipt document
   → POST /api/receipts
   → Status: 'draft'
   → No stock change yet

2. User adds items to receipt
   → Receipt items stored in receipt_items table

3. User validates receipt
   → POST /api/receipts/:id/validate
   → Status changes to 'done'
   → For each item:
     → updateStock() called with movementType: 'in'
     → product_stocks.quantity increases
     → move_history entry created
   → Transaction committed

4. Stock is now updated in real-time
   → GET /api/products/stock/:productId/:warehouseId
   → Returns new quantity
```

## Benefits Over Manual Systems

1. **Real-Time Accuracy**: Stock levels update immediately upon validation
2. **No Manual Errors**: Automated calculations prevent human mistakes
3. **Complete Traceability**: Every movement is logged and auditable
4. **Multi-User Access**: Multiple users can work simultaneously
5. **Centralized Data**: Single source of truth replaces scattered Excel files
6. **Automated Alerts**: Low stock detection without manual checking
7. **Historical Analysis**: Complete history enables trend analysis
8. **Document Control**: Status-based workflow prevents premature stock updates

## Security & Access Control

- JWT-based authentication
- Role-based permissions (inventory_manager, warehouse_staff)
- All operations require valid authentication token
- User ID tracked in all stock movements

## Summary

This inventory management system provides:

✅ **Centralized stock tracking** across multiple warehouses  
✅ **Document-based workflow** with validation gates  
✅ **Real-time stock updates** upon document validation  
✅ **Complete audit trail** of all movements  
✅ **Automated reorder alerts** based on product settings  
✅ **Transaction-safe operations** preventing data corruption  
✅ **Multi-user support** with role-based access  
✅ **Historical tracking** for analysis and reporting  

The system replaces manual processes with an automated, reliable, and auditable inventory management solution.

