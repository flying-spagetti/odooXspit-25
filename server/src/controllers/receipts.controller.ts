import { Response } from 'express';
import pool from '../config/database.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { updateStock } from '../services/stock.service.js';

export const getReceipts = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const result = await pool.query(
      `SELECT r.*, w.name as warehouse_name, u.name as created_by_name
       FROM receipts r
       LEFT JOIN warehouses w ON r.warehouse_id = w.id
       LEFT JOIN users u ON r.created_by = u.id
       ORDER BY r.created_at DESC`
    );

    // Get items for each receipt
    const receipts = await Promise.all(
      result.rows.map(async (receipt) => {
        const itemsResult = await pool.query(
          `SELECT ri.*, p.name as product_name, p.sku
           FROM receipt_items ri
           JOIN products p ON ri.product_id = p.id
           WHERE ri.receipt_id = $1`,
          [receipt.id]
        );
        return { ...receipt, items: itemsResult.rows };
      })
    );

    res.json({
      status: 'success',
      data: receipts,
    });
  }
);

export const getReceipt = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const receiptResult = await pool.query(
      `SELECT r.*, w.name as warehouse_name, u.name as created_by_name
       FROM receipts r
       LEFT JOIN warehouses w ON r.warehouse_id = w.id
       LEFT JOIN users u ON r.created_by = u.id
       WHERE r.id = $1`,
      [id]
    );

    if (receiptResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Receipt not found',
      });
    }

    const itemsResult = await pool.query(
      `SELECT ri.*, p.name as product_name, p.sku
       FROM receipt_items ri
       JOIN products p ON ri.product_id = p.id
       WHERE ri.receipt_id = $1`,
      [id]
    );

    res.json({
      status: 'success',
      data: {
        ...receiptResult.rows[0],
        items: itemsResult.rows,
      },
    });
  }
);

export const createReceipt = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { supplier, warehouseId, status, items, scheduledDate } = req.body;

    if (!supplier || !warehouseId || !items || !Array.isArray(items)) {
      return res.status(400).json({
        status: 'error',
        message: 'Supplier, warehouseId, and items are required',
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Create receipt
      const receiptResult = await client.query(
        `INSERT INTO receipts (supplier, warehouse_id, status, created_by, scheduled_date)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [supplier, warehouseId, status || 'draft', req.user!.id, scheduledDate || null]
      );

      const receipt = receiptResult.rows[0];

      // Insert items
      for (const item of items) {
        await client.query(
          `INSERT INTO receipt_items (receipt_id, product_id, quantity, unit_price)
           VALUES ($1, $2, $3, $4)`,
          [receipt.id, item.productId, item.quantity, item.unitPrice || null]
        );
      }

      // Update stock if status is 'done'
      if (status === 'done') {
        for (const item of items) {
          await updateStock({
            productId: item.productId,
            warehouseId,
            quantity: item.quantity,
            documentId: receipt.id,
            documentType: 'receipt',
            movementType: 'in',
            userId: req.user!.id,
          });
        }
      }

      await client.query('COMMIT');

      // Fetch complete receipt with items
      const itemsResult = await client.query(
        `SELECT ri.*, p.name as product_name, p.sku
         FROM receipt_items ri
         JOIN products p ON ri.product_id = p.id
         WHERE ri.receipt_id = $1`,
        [receipt.id]
      );

      res.status(201).json({
        status: 'success',
        data: {
          ...receipt,
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

export const updateReceipt = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { supplier, warehouseId, status, items, scheduledDate } = req.body;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get current receipt
      const currentResult = await client.query(
        'SELECT * FROM receipts WHERE id = $1',
        [id]
      );

      if (currentResult.rows.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Receipt not found',
        });
      }

      const currentReceipt = currentResult.rows[0];
      const oldStatus = currentReceipt.status;
      const newStatus = status || currentReceipt.status;

      // Update receipt
      const updateResult = await client.query(
        `UPDATE receipts
         SET supplier = COALESCE($1, supplier),
             warehouse_id = COALESCE($2, warehouse_id),
             status = COALESCE($3, status),
             scheduled_date = COALESCE($4, scheduled_date),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5
         RETURNING *`,
        [supplier, warehouseId, newStatus, scheduledDate, id]
      );

      // Update items if provided
      if (items && Array.isArray(items)) {
        // Delete old items
        await client.query('DELETE FROM receipt_items WHERE receipt_id = $1', [
          id,
        ]);

        // Insert new items
        for (const item of items) {
          await client.query(
            `INSERT INTO receipt_items (receipt_id, product_id, quantity, unit_price)
             VALUES ($1, $2, $3, $4)`,
            [id, item.productId, item.quantity, item.unitPrice || null]
          );
        }
      }

      // Handle stock updates if status changed to/from 'done'
      if (oldStatus !== 'done' && newStatus === 'done') {
        // Validate receipt - update stock
        const itemsResult = await client.query(
          'SELECT * FROM receipt_items WHERE receipt_id = $1',
          [id]
        );
        for (const item of itemsResult.rows) {
          await updateStock({
            productId: item.product_id,
            warehouseId: updateResult.rows[0].warehouse_id,
            quantity: item.quantity,
            documentId: id,
            documentType: 'receipt',
            movementType: 'in',
            userId: req.user!.id,
          });
        }
      }

      await client.query('COMMIT');

      // Fetch complete receipt
      const itemsResult = await client.query(
        `SELECT ri.*, p.name as product_name, p.sku
         FROM receipt_items ri
         JOIN products p ON ri.product_id = p.id
         WHERE ri.receipt_id = $1`,
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

export const validateReceipt = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const receiptResult = await client.query(
        'SELECT * FROM receipts WHERE id = $1',
        [id]
      );

      if (receiptResult.rows.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Receipt not found',
        });
      }

      const receipt = receiptResult.rows[0];

      if (receipt.status === 'done') {
        return res.status(400).json({
          status: 'error',
          message: 'Receipt already validated',
        });
      }

      // Update status
      await client.query(
        'UPDATE receipts SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['done', id]
      );

      // Get items and update stock
      const itemsResult = await client.query(
        'SELECT * FROM receipt_items WHERE receipt_id = $1',
        [id]
      );

      for (const item of itemsResult.rows) {
        await updateStock({
          productId: item.product_id,
          warehouseId: receipt.warehouse_id,
          quantity: item.quantity,
          documentId: id,
          documentType: 'receipt',
          movementType: 'in',
          userId: req.user!.id,
        });
      }

      await client.query('COMMIT');

      res.json({
        status: 'success',
        message: 'Receipt validated successfully',
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
);

