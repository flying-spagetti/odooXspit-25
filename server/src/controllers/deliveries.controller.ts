import { Response } from 'express';
import pool from '../config/database.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { updateStock } from '../services/stock.service.js';

export const getDeliveries = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const result = await pool.query(
      `SELECT d.*, w.name as warehouse_name, u.name as created_by_name
       FROM deliveries d
       LEFT JOIN warehouses w ON d.warehouse_id = w.id
       LEFT JOIN users u ON d.created_by = u.id
       ORDER BY d.created_at DESC`
    );

    const deliveries = await Promise.all(
      result.rows.map(async (delivery) => {
        const itemsResult = await pool.query(
          `SELECT di.*, p.name as product_name, p.sku
           FROM delivery_items di
           JOIN products p ON di.product_id = p.id
           WHERE di.delivery_id = $1`,
          [delivery.id]
        );
        return { ...delivery, items: itemsResult.rows };
      })
    );

    res.json({
      status: 'success',
      data: deliveries,
    });
  }
);

export const getDelivery = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const deliveryResult = await pool.query(
      `SELECT d.*, w.name as warehouse_name, u.name as created_by_name
       FROM deliveries d
       LEFT JOIN warehouses w ON d.warehouse_id = w.id
       LEFT JOIN users u ON d.created_by = u.id
       WHERE d.id = $1`,
      [id]
    );

    if (deliveryResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Delivery not found',
      });
    }

    const itemsResult = await pool.query(
      `SELECT di.*, p.name as product_name, p.sku
       FROM delivery_items di
       JOIN products p ON di.product_id = p.id
       WHERE di.delivery_id = $1`,
      [id]
    );

    res.json({
      status: 'success',
      data: {
        ...deliveryResult.rows[0],
        items: itemsResult.rows,
      },
    });
  }
);

export const createDelivery = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { customer, warehouseId, status, items, scheduledDate } = req.body;

    if (!customer || !warehouseId || !items || !Array.isArray(items)) {
      return res.status(400).json({
        status: 'error',
        message: 'Customer, warehouseId, and items are required',
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const deliveryResult = await client.query(
        `INSERT INTO deliveries (customer, warehouse_id, status, created_by, scheduled_date)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [customer, warehouseId, status || 'draft', req.user!.id, scheduledDate || null]
      );

      const delivery = deliveryResult.rows[0];

      for (const item of items) {
        await client.query(
          `INSERT INTO delivery_items (delivery_id, product_id, quantity)
           VALUES ($1, $2, $3)`,
          [delivery.id, item.productId, item.quantity]
        );
      }

      if (status === 'done') {
        for (const item of items) {
          await updateStock({
            productId: item.productId,
            warehouseId,
            quantity: item.quantity,
            documentId: delivery.id,
            documentType: 'delivery',
            movementType: 'out',
            userId: req.user!.id,
          });
        }
      }

      await client.query('COMMIT');

      const itemsResult = await client.query(
        `SELECT di.*, p.name as product_name, p.sku
         FROM delivery_items di
         JOIN products p ON di.product_id = p.id
         WHERE di.delivery_id = $1`,
        [delivery.id]
      );

      res.status(201).json({
        status: 'success',
        data: {
          ...delivery,
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

export const updateDelivery = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { customer, warehouseId, status, items, scheduledDate } = req.body;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const currentResult = await client.query(
        'SELECT * FROM deliveries WHERE id = $1',
        [id]
      );

      if (currentResult.rows.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Delivery not found',
        });
      }

      const currentDelivery = currentResult.rows[0];
      const oldStatus = currentDelivery.status;
      const newStatus = status || currentDelivery.status;

      const updateResult = await client.query(
        `UPDATE deliveries
         SET customer = COALESCE($1, customer),
             warehouse_id = COALESCE($2, warehouse_id),
             status = COALESCE($3, status),
             scheduled_date = COALESCE($4, scheduled_date),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5
         RETURNING *`,
        [customer, warehouseId, newStatus, scheduledDate, id]
      );

      if (items && Array.isArray(items)) {
        await client.query('DELETE FROM delivery_items WHERE delivery_id = $1', [
          id,
        ]);

        for (const item of items) {
          await client.query(
            `INSERT INTO delivery_items (delivery_id, product_id, quantity)
             VALUES ($1, $2, $3)`,
            [id, item.productId, item.quantity]
          );
        }
      }

      if (oldStatus !== 'done' && newStatus === 'done') {
        const itemsResult = await client.query(
          'SELECT * FROM delivery_items WHERE delivery_id = $1',
          [id]
        );
        for (const item of itemsResult.rows) {
          await updateStock({
            productId: item.product_id,
            warehouseId: updateResult.rows[0].warehouse_id,
            quantity: item.quantity,
            documentId: id,
            documentType: 'delivery',
            movementType: 'out',
            userId: req.user!.id,
          });
        }
      }

      await client.query('COMMIT');

      const itemsResult = await client.query(
        `SELECT di.*, p.name as product_name, p.sku
         FROM delivery_items di
         JOIN products p ON di.product_id = p.id
         WHERE di.delivery_id = $1`,
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

export const validateDelivery = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const deliveryResult = await client.query(
        'SELECT * FROM deliveries WHERE id = $1',
        [id]
      );

      if (deliveryResult.rows.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Delivery not found',
        });
      }

      const delivery = deliveryResult.rows[0];

      if (delivery.status === 'done') {
        return res.status(400).json({
          status: 'error',
          message: 'Delivery already validated',
        });
      }

      await client.query(
        'UPDATE deliveries SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['done', id]
      );

      const itemsResult = await client.query(
        'SELECT * FROM delivery_items WHERE delivery_id = $1',
        [id]
      );

      for (const item of itemsResult.rows) {
        await updateStock({
          productId: item.product_id,
          warehouseId: delivery.warehouse_id,
          quantity: item.quantity,
          documentId: id,
          documentType: 'delivery',
          movementType: 'out',
          userId: req.user!.id,
        });
      }

      await client.query('COMMIT');

      res.json({
        status: 'success',
        message: 'Delivery validated successfully',
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
);

