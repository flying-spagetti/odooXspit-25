import { Response } from 'express';
import pool from '../config/database.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';

export const getKPIs = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    // Total products
    const productsResult = await pool.query('SELECT COUNT(*) as count FROM products');
    const totalProducts = parseInt(productsResult.rows[0].count);

    // Low stock and out of stock items
    const stockResult = await pool.query(
      `SELECT 
        COUNT(DISTINCT CASE WHEN ps.quantity = 0 THEN p.id END) as out_of_stock,
        COUNT(DISTINCT CASE WHEN ps.quantity > 0 AND ps.quantity <= p.reorder_level THEN p.id END) as low_stock
       FROM products p
       LEFT JOIN product_stocks ps ON p.id = ps.product_id
       WHERE p.reorder_level IS NOT NULL`
    );

    const outOfStockItems = parseInt(stockResult.rows[0].out_of_stock || '0');
    const lowStockItems = parseInt(stockResult.rows[0].low_stock || '0');

    // Pending receipts
    const receiptsResult = await pool.query(
      `SELECT COUNT(*) as count FROM receipts 
       WHERE status NOT IN ('done', 'canceled')`
    );
    const pendingReceipts = parseInt(receiptsResult.rows[0].count);

    // Pending deliveries
    const deliveriesResult = await pool.query(
      `SELECT COUNT(*) as count FROM deliveries 
       WHERE status NOT IN ('done', 'canceled')`
    );
    const pendingDeliveries = parseInt(deliveriesResult.rows[0].count);

    // Scheduled transfers
    const transfersResult = await pool.query(
      `SELECT COUNT(*) as count FROM transfers 
       WHERE status NOT IN ('done', 'canceled')`
    );
    const scheduledTransfers = parseInt(transfersResult.rows[0].count);

    res.json({
      status: 'success',
      data: {
        totalProducts,
        lowStockItems,
        outOfStockItems,
        pendingReceipts,
        pendingDeliveries,
        scheduledTransfers,
      },
    });
  }
);

export const getDashboardData = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Get receipts with scheduled dates and items
    // Handle case where scheduled_date column might not exist yet
    let receiptsResult;
    try {
      receiptsResult = await pool.query(
        `SELECT r.*, 
                ri.product_id,
                p.name as product_name,
                p.sku
         FROM receipts r
         LEFT JOIN receipt_items ri ON r.id = ri.receipt_id
         LEFT JOIN products p ON ri.product_id = p.id
         WHERE r.status NOT IN ('done', 'canceled')
         ORDER BY COALESCE(r.scheduled_date, '9999-12-31'::date) ASC, r.created_at DESC`
      );
    } catch (error: any) {
      // If scheduled_date column doesn't exist, query without it
      if (error.message && error.message.includes('scheduled_date')) {
        receiptsResult = await pool.query(
          `SELECT r.*, 
                  ri.product_id,
                  p.name as product_name,
                  p.sku
           FROM receipts r
           LEFT JOIN receipt_items ri ON r.id = ri.receipt_id
           LEFT JOIN products p ON ri.product_id = p.id
           WHERE r.status NOT IN ('done', 'canceled')
           ORDER BY r.created_at DESC`
        );
        // Add null scheduled_date to all rows
        receiptsResult.rows.forEach((row: any) => {
          row.scheduled_date = null;
        });
      } else {
        throw error;
      }
    }

    // Group receipts and calculate metrics
    const receiptMap = new Map();
    receiptsResult.rows.forEach((row: any) => {
      if (!receiptMap.has(row.id)) {
        receiptMap.set(row.id, {
          id: row.id,
          supplier: row.supplier,
          status: row.status,
          scheduledDate: row.scheduled_date,
          warehouseId: row.warehouse_id,
          items: [],
        });
      }
      if (row.product_id) {
        receiptMap.get(row.id).items.push({
          productId: row.product_id,
          productName: row.product_name,
          sku: row.sku,
        });
      }
    });

    const receipts = Array.from(receiptMap.values());
    const receiptsToReceive = receipts.length;
    // Handle scheduledDate - it might be a Date object or string
    const receiptsLate = receipts.filter((r: any) => {
      if (!r.scheduledDate) return false;
      const scheduledDate = typeof r.scheduledDate === 'string' ? r.scheduledDate : r.scheduledDate.toISOString().split('T')[0];
      return scheduledDate < today;
    }).length;
    const receiptsOperations = receipts.filter((r: any) => {
      if (!r.scheduledDate) return false;
      const scheduledDate = typeof r.scheduledDate === 'string' ? r.scheduledDate : r.scheduledDate.toISOString().split('T')[0];
      return scheduledDate > today;
    }).length;
    const receiptsWaiting = receipts.filter((r: any) => r.status === 'waiting').length;

    // Get deliveries with scheduled dates and items
    // Handle case where scheduled_date column might not exist yet
    let deliveriesResult;
    try {
      deliveriesResult = await pool.query(
        `SELECT d.*, 
                di.product_id,
                p.name as product_name,
                p.sku
         FROM deliveries d
         LEFT JOIN delivery_items di ON d.id = di.delivery_id
         LEFT JOIN products p ON di.product_id = p.id
         WHERE d.status NOT IN ('done', 'canceled')
         ORDER BY COALESCE(d.scheduled_date, '9999-12-31'::date) ASC, d.created_at DESC`
      );
    } catch (error: any) {
      // If scheduled_date column doesn't exist, query without it
      if (error.message && error.message.includes('scheduled_date')) {
        deliveriesResult = await pool.query(
          `SELECT d.*, 
                  di.product_id,
                  p.name as product_name,
                  p.sku
           FROM deliveries d
           LEFT JOIN delivery_items di ON d.id = di.delivery_id
           LEFT JOIN products p ON di.product_id = p.id
           WHERE d.status NOT IN ('done', 'canceled')
           ORDER BY d.created_at DESC`
        );
        // Add null scheduled_date to all rows
        deliveriesResult.rows.forEach((row: any) => {
          row.scheduled_date = null;
        });
      } else {
        throw error;
      }
    }

    // Group deliveries and calculate metrics
    const deliveryMap = new Map();
    deliveriesResult.rows.forEach((row: any) => {
      if (!deliveryMap.has(row.id)) {
        deliveryMap.set(row.id, {
          id: row.id,
          customer: row.customer,
          status: row.status,
          scheduledDate: row.scheduled_date,
          warehouseId: row.warehouse_id,
          items: [],
        });
      }
      if (row.product_id) {
        deliveryMap.get(row.id).items.push({
          productId: row.product_id,
          productName: row.product_name,
          sku: row.sku,
        });
      }
    });

    const deliveries = Array.from(deliveryMap.values());
    const deliveriesToDeliver = deliveries.length;
    // Handle scheduledDate - it might be a Date object or string
    const deliveriesLate = deliveries.filter((d: any) => {
      if (!d.scheduledDate) return false;
      const scheduledDate = typeof d.scheduledDate === 'string' ? d.scheduledDate : d.scheduledDate.toISOString().split('T')[0];
      return scheduledDate < today;
    }).length;
    const deliveriesOperations = deliveries.filter((d: any) => {
      if (!d.scheduledDate) return false;
      const scheduledDate = typeof d.scheduledDate === 'string' ? d.scheduledDate : d.scheduledDate.toISOString().split('T')[0];
      return scheduledDate > today;
    }).length;
    const deliveriesWaiting = deliveries.filter((d: any) => d.status === 'waiting').length;

    // Get top products from pending receipts (for highlighting)
    const receiptProducts = receipts
      .flatMap((r: any) => r.items.map((item: any) => item.productName))
      .filter(Boolean)
      .slice(0, 5);

    res.json({
      status: 'success',
      data: {
        receipts: {
          toReceive: receiptsToReceive,
          late: receiptsLate,
          operations: receiptsOperations,
          waiting: receiptsWaiting,
          items: receipts.slice(0, 6), // Top 6 receipts
          topProducts: receiptProducts,
        },
        deliveries: {
          toDeliver: deliveriesToDeliver,
          late: deliveriesLate,
          operations: deliveriesOperations,
          waiting: deliveriesWaiting,
          items: deliveries.slice(0, 6), // Top 6 deliveries
        },
      },
    });
  }
);

