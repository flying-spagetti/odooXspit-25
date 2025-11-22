import { Response } from 'express';
import pool from '../config/database.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { updateStock } from '../services/stock.service.js';

export const getTransfers = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const result = await pool.query(
      `SELECT t.*, 
       w1.name as from_warehouse_name,
       w2.name as to_warehouse_name,
       u.name as created_by_name
       FROM transfers t
       LEFT JOIN warehouses w1 ON t.from_warehouse_id = w1.id
       LEFT JOIN warehouses w2 ON t.to_warehouse_id = w2.id
       LEFT JOIN users u ON t.created_by = u.id
       ORDER BY t.created_at DESC`
    );

    const transfers = await Promise.all(
      result.rows.map(async (transfer) => {
        const itemsResult = await pool.query(
          `SELECT ti.*, p.name as product_name, p.sku
           FROM transfer_items ti
           JOIN products p ON ti.product_id = p.id
           WHERE ti.transfer_id = $1`,
          [transfer.id]
        );
        return { ...transfer, items: itemsResult.rows };
      })
    );

    res.json({
      status: 'success',
      data: transfers,
    });
  }
);

export const getTransfer = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const transferResult = await pool.query(
      `SELECT t.*, 
       w1.name as from_warehouse_name,
       w2.name as to_warehouse_name,
       u.name as created_by_name
       FROM transfers t
       LEFT JOIN warehouses w1 ON t.from_warehouse_id = w1.id
       LEFT JOIN warehouses w2 ON t.to_warehouse_id = w2.id
       LEFT JOIN users u ON t.created_by = u.id
       WHERE t.id = $1`,
      [id]
    );

    if (transferResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Transfer not found',
      });
    }

    const itemsResult = await pool.query(
      `SELECT ti.*, p.name as product_name, p.sku
       FROM transfer_items ti
       JOIN products p ON ti.product_id = p.id
       WHERE ti.transfer_id = $1`,
      [id]
    );

    res.json({
      status: 'success',
      data: {
        ...transferResult.rows[0],
        items: itemsResult.rows,
      },
    });
  }
);

export const createTransfer = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { fromWarehouseId, toWarehouseId, status, items, scheduledDate } = req.body;

    if (!fromWarehouseId || !toWarehouseId || !items || !Array.isArray(items)) {
      return res.status(400).json({
        status: 'error',
        message: 'fromWarehouseId, toWarehouseId, and items are required',
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const transferResult = await client.query(
        `INSERT INTO transfers (from_warehouse_id, to_warehouse_id, warehouse_id, status, created_by, scheduled_date)
         VALUES ($1, $2, $1, $3, $4, $5)
         RETURNING *`,
        [fromWarehouseId, toWarehouseId, status || 'draft', req.user!.id, scheduledDate || null]
      );

      const transfer = transferResult.rows[0];

      for (const item of items) {
        await client.query(
          `INSERT INTO transfer_items (transfer_id, product_id, quantity)
           VALUES ($1, $2, $3)`,
          [transfer.id, item.productId, item.quantity]
        );
      }

      if (status === 'done') {
        for (const item of items) {
          // Decrease from source
          await updateStock({
            productId: item.productId,
            warehouseId: fromWarehouseId,
            quantity: item.quantity,
            documentId: transfer.id,
            documentType: 'transfer',
            movementType: 'out',
            userId: req.user!.id,
          });
          // Increase at destination
          await updateStock({
            productId: item.productId,
            warehouseId: toWarehouseId,
            quantity: item.quantity,
            documentId: transfer.id,
            documentType: 'transfer',
            movementType: 'in',
            userId: req.user!.id,
          });
        }
      }

      await client.query('COMMIT');

      const itemsResult = await client.query(
        `SELECT ti.*, p.name as product_name, p.sku
         FROM transfer_items ti
         JOIN products p ON ti.product_id = p.id
         WHERE ti.transfer_id = $1`,
        [transfer.id]
      );

      res.status(201).json({
        status: 'success',
        data: {
          ...transfer,
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

export const updateTransfer = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { fromWarehouseId, toWarehouseId, status, items, scheduledDate } = req.body;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const currentResult = await client.query(
        'SELECT * FROM transfers WHERE id = $1',
        [id]
      );

      if (currentResult.rows.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Transfer not found',
        });
      }

      const currentTransfer = currentResult.rows[0];
      const oldStatus = currentTransfer.status;
      const newStatus = status || currentTransfer.status;

      const updateResult = await client.query(
        `UPDATE transfers
         SET from_warehouse_id = COALESCE($1, from_warehouse_id),
             to_warehouse_id = COALESCE($2, to_warehouse_id),
             warehouse_id = COALESCE($1, warehouse_id),
             status = COALESCE($3, status),
             scheduled_date = COALESCE($4, scheduled_date),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5
         RETURNING *`,
        [fromWarehouseId, toWarehouseId, newStatus, scheduledDate, id]
      );

      if (items && Array.isArray(items)) {
        await client.query('DELETE FROM transfer_items WHERE transfer_id = $1', [
          id,
        ]);

        for (const item of items) {
          await client.query(
            `INSERT INTO transfer_items (transfer_id, product_id, quantity)
             VALUES ($1, $2, $3)`,
            [id, item.productId, item.quantity]
          );
        }
      }

      if (oldStatus !== 'done' && newStatus === 'done') {
        const itemsResult = await client.query(
          'SELECT * FROM transfer_items WHERE transfer_id = $1',
          [id]
        );
        for (const item of itemsResult.rows) {
          await updateStock({
            productId: item.product_id,
            warehouseId: updateResult.rows[0].from_warehouse_id,
            quantity: item.quantity,
            documentId: id,
            documentType: 'transfer',
            movementType: 'out',
            userId: req.user!.id,
          });
          await updateStock({
            productId: item.product_id,
            warehouseId: updateResult.rows[0].to_warehouse_id,
            quantity: item.quantity,
            documentId: id,
            documentType: 'transfer',
            movementType: 'in',
            userId: req.user!.id,
          });
        }
      }

      await client.query('COMMIT');

      const itemsResult = await client.query(
        `SELECT ti.*, p.name as product_name, p.sku
         FROM transfer_items ti
         JOIN products p ON ti.product_id = p.id
         WHERE ti.transfer_id = $1`,
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

export const validateTransfer = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const transferResult = await client.query(
        'SELECT * FROM transfers WHERE id = $1',
        [id]
      );

      if (transferResult.rows.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Transfer not found',
        });
      }

      const transfer = transferResult.rows[0];

      if (transfer.status === 'done') {
        return res.status(400).json({
          status: 'error',
          message: 'Transfer already validated',
        });
      }

      await client.query(
        'UPDATE transfers SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['done', id]
      );

      const itemsResult = await client.query(
        'SELECT * FROM transfer_items WHERE transfer_id = $1',
        [id]
      );

      for (const item of itemsResult.rows) {
        await updateStock({
          productId: item.product_id,
          warehouseId: transfer.from_warehouse_id,
          quantity: item.quantity,
          documentId: id,
          documentType: 'transfer',
          movementType: 'out',
          userId: req.user!.id,
        });
        await updateStock({
          productId: item.product_id,
          warehouseId: transfer.to_warehouse_id,
          quantity: item.quantity,
          documentId: id,
          documentType: 'transfer',
          movementType: 'in',
          userId: req.user!.id,
        });
      }

      await client.query('COMMIT');

      res.json({
        status: 'success',
        message: 'Transfer validated successfully',
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
);

