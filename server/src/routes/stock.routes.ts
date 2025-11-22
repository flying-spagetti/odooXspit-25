import express from 'express';
import {
  getStock,
  getAllStock,
  getStockByWarehouse,
  getStockByProduct,
  initializeStock,
  bulkInitializeStock,
  getLowStockAlerts,
} from '../controllers/stock.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

// Get stock for specific product and warehouse
router.get('/:productId/:warehouseId', getStock);

// Get all stock with optional filters
// Query params: productId, warehouseId, category, lowStock, outOfStock
router.get('/', getAllStock);

// Get stock summary by warehouse
router.get('/warehouse/:warehouseId', getStockByWarehouse);

// Get stock summary by product (across all warehouses)
router.get('/product/:productId', getStockByProduct);

// Initialize stock for a product
router.post('/initialize', initializeStock);

// Bulk initialize stock
router.post('/initialize/bulk', bulkInitializeStock);

// Get low stock alerts
// Query params: warehouseId (optional)
router.get('/alerts/low-stock', getLowStockAlerts);

export default router;

