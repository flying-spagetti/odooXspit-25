import { Response } from 'express';
import pool from '../config/database.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';

export const getWarehouses = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const result = await pool.query(
      'SELECT * FROM warehouses ORDER BY created_at DESC'
    );

    res.json({
      status: 'success',
      data: result.rows,
    });
  }
);

export const getWarehouse = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const result = await pool.query('SELECT * FROM warehouses WHERE id = $1', [
      id,
    ]);

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

export const createWarehouse = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { name, location, description, shortCode } = req.body;

    if (!name || !location) {
      return res.status(400).json({
        status: 'error',
        message: 'Name and location are required',
      });
    }

    const result = await pool.query(
      `INSERT INTO warehouses (name, location, description, short_code)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, location, description || null, shortCode || null]
    );

    res.status(201).json({
      status: 'success',
      data: result.rows[0],
    });
  }
);

export const updateWarehouse = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { name, location, description, shortCode } = req.body;

    const result = await pool.query(
      `UPDATE warehouses
       SET name = COALESCE($1, name),
           location = COALESCE($2, location),
           description = COALESCE($3, description),
           short_code = COALESCE($4, short_code),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [name, location, description, shortCode, id]
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

