# Stock Management API Endpoints

This document describes all the new stock management endpoints that have been added to the inventory management system.

## Base URL
All endpoints are prefixed with `/api/stock`

## Authentication
All endpoints require authentication via Bearer token in the Authorization header.

---

## Endpoints

### 1. Get Stock for Specific Product and Warehouse
**GET** `/api/stock/:productId/:warehouseId`

Get current stock level for a specific product in a specific warehouse.

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "product_id": "uuid",
    "warehouse_id": "uuid",
    "quantity": 100,
    "updated_at": "2024-01-01T00:00:00Z",
    "product_name": "Steel Rods",
    "sku": "STEEL-001",
    "category": "Raw Materials",
    "warehouse_name": "Main Warehouse",
    "location": "Headquarters"
  }
}
```

---

### 2. Get All Stock with Filters
**GET** `/api/stock`

Get all stock levels with optional filtering.

**Query Parameters:**
- `productId` (optional) - Filter by product ID
- `warehouseId` (optional) - Filter by warehouse ID
- `category` (optional) - Filter by product category
- `lowStock` (optional) - Set to `true` to show only low stock items
- `outOfStock` (optional) - Set to `true` to show only out of stock items

**Example:**
```
GET /api/stock?warehouseId=xxx&lowStock=true
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "product_id": "uuid",
      "warehouse_id": "uuid",
      "quantity": 10,
      "product_name": "Steel Rods",
      "sku": "STEEL-001",
      "category": "Raw Materials",
      "reorder_level": 50,
      "reorder_quantity": 100,
      "warehouse_name": "Main Warehouse",
      "stock_status": "low_stock"
    }
  ]
}
```

---

### 3. Get Stock Summary by Warehouse
**GET** `/api/stock/warehouse/:warehouseId`

Get aggregated stock statistics for a specific warehouse.

**Response:**
```json
{
  "status": "success",
  "data": {
    "warehouse_id": "uuid",
    "warehouse_name": "Main Warehouse",
    "total_products": 50,
    "products_in_stock": 45,
    "products_out_of_stock": 3,
    "products_low_stock": 2,
    "total_quantity": 5000
  }
}
```

---

### 4. Get Stock Summary by Product
**GET** `/api/stock/product/:productId`

Get stock summary for a product across all warehouses.

**Response:**
```json
{
  "status": "success",
  "data": {
    "product_id": "uuid",
    "product_name": "Steel Rods",
    "sku": "STEEL-001",
    "category": "Raw Materials",
    "reorder_level": 50,
    "reorder_quantity": 100,
    "warehouse_count": 3,
    "total_quantity": 250,
    "min_quantity": 50,
    "max_quantity": 150,
    "avg_quantity": 83.33,
    "warehouses": [
      {
        "id": "uuid",
        "product_id": "uuid",
        "warehouse_id": "uuid",
        "quantity": 100,
        "warehouse_name": "Main Warehouse",
        "location": "Headquarters"
      }
    ]
  }
}
```

---

### 5. Initialize Stock
**POST** `/api/stock/initialize`

Initialize or set initial stock level for a product in a warehouse. This creates a stock record and logs it in the move history.

**Request Body:**
```json
{
  "productId": "uuid",
  "warehouseId": "uuid",
  "quantity": 100,
  "reason": "Initial stock setup" // Optional, required if stock already exists
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Stock initialized successfully",
  "data": {
    "id": "uuid",
    "product_id": "uuid",
    "warehouse_id": "uuid",
    "quantity": 100,
    "product_name": "Steel Rods",
    "warehouse_name": "Main Warehouse"
  }
}
```

**Notes:**
- If stock already exists and is greater than 0, a `reason` is required
- The operation is logged in move_history for audit trail
- Quantity cannot be negative

---

### 6. Bulk Initialize Stock
**POST** `/api/stock/initialize/bulk`

Initialize stock for multiple products in a warehouse at once.

**Request Body:**
```json
{
  "warehouseId": "uuid",
  "items": [
    {
      "productId": "uuid",
      "quantity": 100
    },
    {
      "productId": "uuid",
      "quantity": 50
    }
  ],
  "reason": "Initial stock setup" // Optional
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Processed 2 items",
  "data": {
    "successful": [
      {
        "productId": "uuid",
        "quantity": 100,
        "success": true
      }
    ],
    "errors": [
      {
        "productId": "uuid",
        "error": "Product not found"
      }
    ]
  }
}
```

**Notes:**
- Processes all items in a single transaction
- Returns both successful and failed items
- All operations are logged in move_history

---

### 7. Get Low Stock Alerts
**GET** `/api/stock/alerts/low-stock`

Get all products that are low stock or out of stock.

**Query Parameters:**
- `warehouseId` (optional) - Filter by warehouse

**Example:**
```
GET /api/stock/alerts/low-stock?warehouseId=xxx
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "product_id": "uuid",
      "warehouse_id": "uuid",
      "quantity": 0,
      "product_name": "Steel Rods",
      "sku": "STEEL-001",
      "category": "Raw Materials",
      "reorder_level": 50,
      "reorder_quantity": 100,
      "warehouse_name": "Main Warehouse",
      "location": "Headquarters",
      "alert_type": "out_of_stock"
    },
    {
      "id": "uuid",
      "product_id": "uuid",
      "warehouse_id": "uuid",
      "quantity": 25,
      "product_name": "Chairs",
      "sku": "CHAIR-001",
      "category": "Furniture",
      "reorder_level": 50,
      "reorder_quantity": 100,
      "warehouse_name": "Main Warehouse",
      "location": "Headquarters",
      "alert_type": "low_stock"
    }
  ]
}
```

**Notes:**
- Returns products where quantity is 0 (out of stock) or quantity <= reorder_level (low stock)
- Only includes products that have a reorder_level set
- Results are sorted by alert severity (out of stock first, then low stock)

---

## Frontend API Client Usage

The frontend API client (`odooxspit/src/services/api.ts`) has been updated with methods for all these endpoints:

```typescript
// Get stock for specific product/warehouse
await api.getStock(productId, warehouseId);

// Get all stock with filters
await api.getAllStockWithFilters({
  warehouseId: 'xxx',
  lowStock: true
});

// Get stock summary by warehouse
await api.getStockByWarehouse(warehouseId);

// Get stock summary by product
await api.getStockByProduct(productId);

// Initialize stock
await api.initializeStock({
  productId: 'xxx',
  warehouseId: 'yyy',
  quantity: 100,
  reason: 'Initial setup'
});

// Bulk initialize stock
await api.bulkInitializeStock({
  warehouseId: 'yyy',
  items: [
    { productId: 'xxx', quantity: 100 },
    { productId: 'zzz', quantity: 50 }
  ]
});

// Get low stock alerts
await api.getLowStockAlerts(warehouseId); // warehouseId is optional
```

---

## Integration with Existing System

These new endpoints complement the existing document-based workflow:

1. **Document-based updates** (Receipts, Deliveries, Transfers, Adjustments) - For regular operations
2. **Direct stock initialization** - For setting up initial stock levels
3. **Stock queries** - For viewing and monitoring stock levels

All stock updates (whether through documents or initialization) are:
- ✅ Logged in `move_history` for complete audit trail
- ✅ Executed within database transactions for data integrity
- ✅ Tracked with user ID for accountability

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "status": "error",
  "message": "Error description"
}
```

Common error scenarios:
- **400 Bad Request**: Missing required fields, invalid data
- **401 Unauthorized**: Missing or invalid authentication token
- **404 Not Found**: Product or warehouse not found
- **500 Internal Server Error**: Database or server errors

---

## Best Practices

1. **Use initialization endpoints** only for setting up initial stock or correcting major discrepancies
2. **Use document-based workflow** (receipts, deliveries, etc.) for regular operations
3. **Query stock levels** before creating documents to ensure sufficient stock
4. **Monitor low stock alerts** regularly to prevent stockouts
5. **Use bulk operations** when initializing multiple products to improve performance

