import { Response } from 'express';
import pool from '../config/database.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { updateStock } from '../services/stock.service.js';

/**
 * Get stock for a specific product and warehouse
 */
export const getStock = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { productId, warehouseId } = req.params;

    const result = await pool.query(
      `SELECT ps.*, 
              p.name as product_name, p.sku, p.category,
              w.name as warehouse_name, w.location
       FROM product_stocks ps
       JOIN products p ON ps.product_id = p.id
       JOIN warehouses w ON ps.warehouse_id = w.id
       WHERE ps.product_id = $1 AND ps.warehouse_id = $2`,
      [productId, warehouseId]
    );

    if (result.rows.length === 0) {
      return res.json({
        status: 'success',
        data: {
          productId,
          warehouseId,
          quantity: 0,
          product_name: null,
          warehouse_name: null,
        },
      });
    }

    res.json({
      status: 'success',
      data: result.rows[0],
    });
  }
);

/**
 * Get all stock levels with optional filters
 */
export const getAllStock = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { productId, warehouseId, category, lowStock, outOfStock } = req.query;

    let query = `
      SELECT ps.*, 
             p.name as product_name, p.sku, p.category, 
             p.reorder_level, p.reorder_quantity,
             w.name as warehouse_name, w.location,
             CASE 
               WHEN ps.quantity = 0 THEN 'out_of_stock'
               WHEN p.reorder_level IS NOT NULL AND ps.quantity <= p.reorder_level THEN 'low_stock'
               ELSE 'in_stock'
             END as stock_status
      FROM product_stocks ps
      JOIN products p ON ps.product_id = p.id
      JOIN warehouses w ON ps.warehouse_id = w.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (productId) {
      query += ` AND ps.product_id = $${paramCount}`;
      params.push(productId);
      paramCount++;
    }

    if (warehouseId) {
      query += ` AND ps.warehouse_id = $${paramCount}`;
      params.push(warehouseId);
      paramCount++;
    }

    if (category) {
      query += ` AND p.category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }

    if (lowStock === 'true') {
      query += ` AND p.reorder_level IS NOT NULL AND ps.quantity > 0 AND ps.quantity <= p.reorder_level`;
    }

    if (outOfStock === 'true') {
      query += ` AND ps.quantity = 0`;
    }

    query += ` ORDER BY p.name, w.name`;

    const result = await pool.query(query, params);

    res.json({
      status: 'success',
      data: result.rows,
    });
  }
);

/**
 * Get stock summary by warehouse
 */
export const getStockByWarehouse = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { warehouseId } = req.params;

    const result = await pool.query(
      `SELECT 
        w.id as warehouse_id,
        w.name as warehouse_name,
        COUNT(DISTINCT ps.product_id) as total_products,
        COUNT(DISTINCT CASE WHEN ps.quantity > 0 THEN ps.product_id END) as products_in_stock,
        COUNT(DISTINCT CASE WHEN ps.quantity = 0 THEN ps.product_id END) as products_out_of_stock,
        COUNT(DISTINCT CASE 
          WHEN p.reorder_level IS NOT NULL AND ps.quantity > 0 AND ps.quantity <= p.reorder_level 
          THEN ps.product_id 
        END) as products_low_stock,
        SUM(ps.quantity) as total_quantity
       FROM warehouses w
       LEFT JOIN product_stocks ps ON w.id = ps.warehouse_id
       LEFT JOIN products p ON ps.product_id = p.id
       WHERE w.id = $1
       GROUP BY w.id, w.name`,
      [warehouseId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Warehouse not found',
      });
    }

    res.json({
      status: 'success',
      data: result.rows[0],
    });
  }
);

/**
 * Get stock summary by product (across all warehouses)
 */
export const getStockByProduct = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { productId } = req.params;

    const result = await pool.query(
      `SELECT 
        p.id as product_id,
        p.name as product_name,
        p.sku,
        p.category,
        p.reorder_level,
        p.reorder_quantity,
        COUNT(DISTINCT ps.warehouse_id) as warehouse_count,
        SUM(ps.quantity) as total_quantity,
        MIN(ps.quantity) as min_quantity,
        MAX(ps.quantity) as max_quantity,
        AVG(ps.quantity) as avg_quantity
       FROM products p
       LEFT JOIN product_stocks ps ON p.id = ps.product_id
       WHERE p.id = $1
       GROUP BY p.id, p.name, p.sku, p.category, p.reorder_level, p.reorder_quantity`,
      [productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found',
      });
    }

    // Get warehouse breakdown
    const warehouseBreakdown = await pool.query(
      `SELECT ps.*, w.name as warehouse_name, w.location
       FROM product_stocks ps
       JOIN warehouses w ON ps.warehouse_id = w.id
       WHERE ps.product_id = $1
       ORDER BY w.name`,
      [productId]
    );

    res.json({
      status: 'success',
      data: {
        ...result.rows[0],
        warehouses: warehouseBreakdown.rows,
      },
    });
  }
);

/**
 * Initialize stock for a product in a warehouse
 * Creates an adjustment document to set initial stock (follows document workflow)
 */
export const initializeStock = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { productId, warehouseId, quantity, reason } = req.body;

    if (!productId || !warehouseId || quantity === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'ProductId, warehouseId, and quantity are required',
      });
    }

    if (quantity < 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Quantity cannot be negative',
      });
    }

    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        status: 'error',
        message: 'Reason is required for stock initialization',
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Verify product exists
      const productResult = await client.query(
        'SELECT id FROM products WHERE id = $1',
        [productId]
      );
      if (productResult.rows.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Product not found',
        });
      }

      // Verify warehouse exists
      const warehouseResult = await client.query(
        'SELECT id FROM warehouses WHERE id = $1',
        [warehouseId]
      );
      if (warehouseResult.rows.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Warehouse not found',
        });
      }

      // Get current stock
      const stockResult = await client.query(
        `SELECT quantity FROM product_stocks
         WHERE product_id = $1 AND warehouse_id = $2`,
        [productId, warehouseId]
      );

      const recordedQuantity = stockResult.rows[0]?.quantity || 0;
      const countedQuantity = quantity;
      const difference = countedQuantity - recordedQuantity;

      // Create adjustment document
      const adjustmentResult = await client.query(
        `INSERT INTO adjustments (warehouse_id, reason, status, created_by)
         VALUES ($1, $2, 'done', $3)
         RETURNING *`,
        [warehouseId, reason, req.user!.id]
      );

      const adjustment = adjustmentResult.rows[0];

      // Create adjustment item
      await client.query(
        `INSERT INTO adjustment_items (
          adjustment_id, product_id, counted_quantity, recorded_quantity, difference
        ) VALUES ($1, $2, $3, $4, $5)`,
        [adjustment.id, productId, countedQuantity, recordedQuantity, difference]
      );

      // Update stock using the stock service (follows document workflow)
      if (difference !== 0) {
        await updateStock({
          productId,
          warehouseId,
          quantity: Math.abs(difference),
          documentId: adjustment.id,
          documentType: 'adjustment',
          movementType: difference > 0 ? 'in' : 'out',
          userId: req.user!.id,
        });
      }

      await client.query('COMMIT');

      // Fetch the created adjustment with items
      const adjustmentWithItems = await client.query(
        `SELECT a.*, ai.*, p.name as product_name, p.sku, w.name as warehouse_name
         FROM adjustments a
         JOIN adjustment_items ai ON a.id = ai.adjustment_id
         JOIN products p ON ai.product_id = p.id
         JOIN warehouses w ON a.warehouse_id = w.id
         WHERE a.id = $1`,
        [adjustment.id]
      );

      res.status(201).json({
        status: 'success',
        message: 'Stock initialized via adjustment document',
        data: {
          adjustment: adjustment,
          items: adjustmentWithItems.rows,
        },
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
);

/**
 * Bulk initialize stock for multiple products
 * Creates a single adjustment document for all items (follows document workflow)
 */
export const bulkInitializeStock = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { warehouseId, items, reason } = req.body;

    if (!warehouseId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'WarehouseId and items array are required',
      });
    }

    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        status: 'error',
        message: 'Reason is required for bulk stock initialization',
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Verify warehouse exists
      const warehouseResult = await client.query(
        'SELECT id FROM warehouses WHERE id = $1',
        [warehouseId]
      );
      if (warehouseResult.rows.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Warehouse not found',
        });
      }

      // Create adjustment document
      const adjustmentResult = await client.query(
        `INSERT INTO adjustments (warehouse_id, reason, status, created_by)
         VALUES ($1, $2, 'done', $3)
         RETURNING *`,
        [warehouseId, reason, req.user!.id]
      );

      const adjustment = adjustmentResult.rows[0];
      const results = [];
      const errors = [];

      for (const item of items) {
        const { productId, quantity } = item;

        if (!productId || quantity === undefined) {
          errors.push({ productId, error: 'ProductId and quantity are required' });
          continue;
        }

        if (quantity < 0) {
          errors.push({ productId, error: 'Quantity cannot be negative' });
          continue;
        }

        try {
          // Verify product exists
          const productResult = await client.query(
            'SELECT id FROM products WHERE id = $1',
            [productId]
          );
          if (productResult.rows.length === 0) {
            errors.push({ productId, error: 'Product not found' });
            continue;
          }

          // Get current stock
          const stockResult = await client.query(
            `SELECT quantity FROM product_stocks
             WHERE product_id = $1 AND warehouse_id = $2`,
            [productId, warehouseId]
          );

          const recordedQuantity = stockResult.rows[0]?.quantity || 0;
          const countedQuantity = quantity;
          const difference = countedQuantity - recordedQuantity;

          // Create adjustment item
          await client.query(
            `INSERT INTO adjustment_items (
              adjustment_id, product_id, counted_quantity, recorded_quantity, difference
            ) VALUES ($1, $2, $3, $4, $5)`,
            [adjustment.id, productId, countedQuantity, recordedQuantity, difference]
          );

          // Update stock using the stock service (follows document workflow)
          if (difference !== 0) {
            await updateStock({
              productId,
              warehouseId,
              quantity: Math.abs(difference),
              documentId: adjustment.id,
              documentType: 'adjustment',
              movementType: difference > 0 ? 'in' : 'out',
              userId: req.user!.id,
            });
          }

          results.push({ productId, quantity, success: true });
        } catch (error: any) {
          errors.push({ productId, error: error.message });
        }
      }

      await client.query('COMMIT');

      res.status(201).json({
        status: 'success',
        message: `Created adjustment document with ${results.length} items${errors.length > 0 ? `, ${errors.length} errors` : ''}`,
        data: {
          adjustmentId: adjustment.id,
          successful: results,
          errors: errors.length > 0 ? errors : undefined,
        },
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
);

/**
 * Get low stock alerts
 */
export const getLowStockAlerts = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { warehouseId } = req.query;

    let query = `
      SELECT 
        ps.*,
        p.name as product_name,
        p.sku,
        p.category,
        p.reorder_level,
        p.reorder_quantity,
        w.name as warehouse_name,
        w.location,
        CASE 
          WHEN ps.quantity = 0 THEN 'out_of_stock'
          ELSE 'low_stock'
        END as alert_type
      FROM product_stocks ps
      JOIN products p ON ps.product_id = p.id
      JOIN warehouses w ON ps.warehouse_id = w.id
      WHERE p.reorder_level IS NOT NULL
        AND (
          ps.quantity = 0 
          OR ps.quantity <= p.reorder_level
        )
    `;

    const params: any[] = [];
    if (warehouseId) {
      query += ` AND ps.warehouse_id = $1`;
      params.push(warehouseId);
    }

    query += ` ORDER BY 
      CASE WHEN ps.quantity = 0 THEN 0 ELSE 1 END,
      ps.quantity ASC,
      p.name`;

    const result = await pool.query(query, params);

    res.json({
      status: 'success',
      data: result.rows,
    });
  }
);

