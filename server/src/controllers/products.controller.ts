import { Response } from 'express';
import pool from '../config/database.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';

export const getProducts = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const result = await pool.query(
      'SELECT * FROM products ORDER BY created_at DESC'
    );

    res.json({
      status: 'success',
      data: result.rows,
    });
  }
);

export const getProduct = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const result = await pool.query('SELECT * FROM products WHERE id = $1', [
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found',
      });
    }

    res.json({
      status: 'success',
      data: result.rows[0],
    });
  }
);

export const createProduct = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { name, sku, category, unitOfMeasure, reorderLevel, reorderQuantity } =
      req.body;

    if (!name || !sku || !category || !unitOfMeasure) {
      return res.status(400).json({
        status: 'error',
        message: 'Name, SKU, category, and unit of measure are required',
      });
    }

    const result = await pool.query(
      `INSERT INTO products (name, sku, category, unit_of_measure, reorder_level, reorder_quantity)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, sku, category, unitOfMeasure, reorderLevel || null, reorderQuantity || null]
    );

    res.status(201).json({
      status: 'success',
      data: result.rows[0],
    });
  }
);

export const updateProduct = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { name, sku, category, unitOfMeasure, reorderLevel, reorderQuantity } =
      req.body;

    const result = await pool.query(
      `UPDATE products
       SET name = COALESCE($1, name),
           sku = COALESCE($2, sku),
           category = COALESCE($3, category),
           unit_of_measure = COALESCE($4, unit_of_measure),
           reorder_level = COALESCE($5, reorder_level),
           reorder_quantity = COALESCE($6, reorder_quantity),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [name, sku, category, unitOfMeasure, reorderLevel, reorderQuantity, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found',
      });
    }

    res.json({
      status: 'success',
      data: result.rows[0],
    });
  }
);

export const deleteProduct = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM products WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found',
      });
    }

    res.json({
      status: 'success',
      message: 'Product deleted successfully',
    });
  }
);

export const getProductStock = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { productId, warehouseId } = req.params;

    const result = await pool.query(
      `SELECT ps.*, p.name as product_name, w.name as warehouse_name
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
        },
      });
    }

    res.json({
      status: 'success',
      data: result.rows[0],
    });
  }
);

export const getAllStock = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const result = await pool.query(
      `SELECT ps.*, p.name as product_name, p.sku, w.name as warehouse_name
       FROM product_stocks ps
       JOIN products p ON ps.product_id = p.id
       JOIN warehouses w ON ps.warehouse_id = w.id
       ORDER BY p.name, w.name`
    );

    res.json({
      status: 'success',
      data: result.rows,
    });
  }
);

