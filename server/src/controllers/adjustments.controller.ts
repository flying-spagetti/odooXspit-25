import { Response } from 'express';
import pool from '../config/database.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { updateStock } from '../services/stock.service.js';

export const getAdjustments = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const result = await pool.query(
      `SELECT a.*, w.name as warehouse_name, u.name as created_by_name
       FROM adjustments a
       LEFT JOIN warehouses w ON a.warehouse_id = w.id
       LEFT JOIN users u ON a.created_by = u.id
       ORDER BY a.created_at DESC`
    );

    const adjustments = await Promise.all(
      result.rows.map(async (adjustment) => {
        const itemsResult = await pool.query(
          `SELECT ai.*, p.name as product_name, p.sku
           FROM adjustment_items ai
           JOIN products p ON ai.product_id = p.id
           WHERE ai.adjustment_id = $1`,
          [adjustment.id]
        );
        return { ...adjustment, items: itemsResult.rows };
      })
    );

    res.json({
      status: 'success',
      data: adjustments,
    });
  }
);

export const getAdjustment = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const adjustmentResult = await pool.query(
      `SELECT a.*, w.name as warehouse_name, u.name as created_by_name
       FROM adjustments a
       LEFT JOIN warehouses w ON a.warehouse_id = w.id
       LEFT JOIN users u ON a.created_by = u.id
       WHERE a.id = $1`,
      [id]
    );

    if (adjustmentResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Adjustment not found',
      });
    }

    const itemsResult = await pool.query(
      `SELECT ai.*, p.name as product_name, p.sku
       FROM adjustment_items ai
       JOIN products p ON ai.product_id = p.id
       WHERE ai.adjustment_id = $1`,
      [id]
    );

    res.json({
      status: 'success',
      data: {
        ...adjustmentResult.rows[0],
        items: itemsResult.rows,
      },
    });
  }
);

export const createAdjustment = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { warehouseId, reason, status, items } = req.body;

    if (!warehouseId || !reason || !items || !Array.isArray(items)) {
      return res.status(400).json({
        status: 'error',
        message: 'WarehouseId, reason, and items are required',
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const adjustmentResult = await client.query(
        `INSERT INTO adjustments (warehouse_id, reason, status, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [warehouseId, reason, status || 'draft', req.user!.id]
      );

      const adjustment = adjustmentResult.rows[0];

      // Get current stock for each item and calculate differences
      for (const item of items) {
        const stockResult = await client.query(
          `SELECT quantity FROM product_stocks
           WHERE product_id = $1 AND warehouse_id = $2`,
          [item.productId, warehouseId]
        );

        const recordedQuantity = stockResult.rows[0]?.quantity || 0;
        const countedQuantity = item.countedQuantity;
        const difference = countedQuantity - recordedQuantity;

        await client.query(
          `INSERT INTO adjustment_items (
            adjustment_id, product_id, counted_quantity, recorded_quantity, difference
          ) VALUES ($1, $2, $3, $4, $5)`,
          [adjustment.id, item.productId, countedQuantity, recordedQuantity, difference]
        );
      }

      // Update stock if status is 'done'
      if (status === 'done') {
        for (const item of items) {
          const stockResult = await client.query(
            `SELECT quantity FROM product_stocks
             WHERE product_id = $1 AND warehouse_id = $2`,
            [item.productId, warehouseId]
          );
          const recordedQuantity = stockResult.rows[0]?.quantity || 0;
          const difference = item.countedQuantity - recordedQuantity;

          if (difference !== 0) {
            await updateStock({
              productId: item.productId,
              warehouseId,
              quantity: Math.abs(difference),
              documentId: adjustment.id,
              documentType: 'adjustment',
              movementType: difference > 0 ? 'in' : 'out',
              userId: req.user!.id,
            });
          }
        }
      }

      await client.query('COMMIT');

      const itemsResult = await client.query(
        `SELECT ai.*, p.name as product_name, p.sku
         FROM adjustment_items ai
         JOIN products p ON ai.product_id = p.id
         WHERE ai.adjustment_id = $1`,
        [adjustment.id]
      );

      res.status(201).json({
        status: 'success',
        data: {
          ...adjustment,
          items: itemsResult.rows,
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

export const updateAdjustment = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { warehouseId, reason, status, items } = req.body;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const currentResult = await client.query(
        'SELECT * FROM adjustments WHERE id = $1',
        [id]
      );

      if (currentResult.rows.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Adjustment not found',
        });
      }

      const currentAdjustment = currentResult.rows[0];
      const oldStatus = currentAdjustment.status;
      const newStatus = status || currentAdjustment.status;

      const updateResult = await client.query(
        `UPDATE adjustments
         SET warehouse_id = COALESCE($1, warehouse_id),
             reason = COALESCE($2, reason),
             status = COALESCE($3, status),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [warehouseId, reason, newStatus, id]
      );

      if (items && Array.isArray(items)) {
        await client.query('DELETE FROM adjustment_items WHERE adjustment_id = $1', [
          id,
        ]);

        const finalWarehouseId = warehouseId || updateResult.rows[0].warehouse_id;

        for (const item of items) {
          const stockResult = await client.query(
            `SELECT quantity FROM product_stocks
             WHERE product_id = $1 AND warehouse_id = $2`,
            [item.productId, finalWarehouseId]
          );
          const recordedQuantity = stockResult.rows[0]?.quantity || 0;
          const countedQuantity = item.countedQuantity;
          const difference = countedQuantity - recordedQuantity;

          await client.query(
            `INSERT INTO adjustment_items (
              adjustment_id, product_id, counted_quantity, recorded_quantity, difference
            ) VALUES ($1, $2, $3, $4, $5)`,
            [id, item.productId, countedQuantity, recordedQuantity, difference]
          );
        }
      }

      if (oldStatus !== 'done' && newStatus === 'done') {
        const itemsResult = await client.query(
          'SELECT * FROM adjustment_items WHERE adjustment_id = $1',
          [id]
        );
        for (const item of itemsResult.rows) {
          if (item.difference !== 0) {
            await updateStock({
              productId: item.product_id,
              warehouseId: updateResult.rows[0].warehouse_id,
              quantity: Math.abs(item.difference),
              documentId: id,
              documentType: 'adjustment',
              movementType: item.difference > 0 ? 'in' : 'out',
              userId: req.user!.id,
            });
          }
        }
      }

      await client.query('COMMIT');

      const itemsResult = await client.query(
        `SELECT ai.*, p.name as product_name, p.sku
         FROM adjustment_items ai
         JOIN products p ON ai.product_id = p.id
         WHERE ai.adjustment_id = $1`,
        [id]
      );

      res.json({
        status: 'success',
        data: {
          ...updateResult.rows[0],
          items: itemsResult.rows,
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

export const validateAdjustment = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const adjustmentResult = await client.query(
        'SELECT * FROM adjustments WHERE id = $1',
        [id]
      );

      if (adjustmentResult.rows.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Adjustment not found',
        });
      }

      const adjustment = adjustmentResult.rows[0];

      if (adjustment.status === 'done') {
        return res.status(400).json({
          status: 'error',
          message: 'Adjustment already validated',
        });
      }

      await client.query(
        'UPDATE adjustments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['done', id]
      );

      const itemsResult = await client.query(
        'SELECT * FROM adjustment_items WHERE adjustment_id = $1',
        [id]
      );

      for (const item of itemsResult.rows) {
        if (item.difference !== 0) {
          await updateStock({
            productId: item.product_id,
            warehouseId: adjustment.warehouse_id,
            quantity: Math.abs(item.difference),
            documentId: id,
            documentType: 'adjustment',
            movementType: item.difference > 0 ? 'in' : 'out',
            userId: req.user!.id,
          });
        }
      }

      await client.query('COMMIT');

      res.json({
        status: 'success',
        message: 'Adjustment validated successfully',
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
);

