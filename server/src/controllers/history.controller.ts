import { Response } from 'express';
import pool from '../config/database.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';

export const getHistory = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { productId, warehouseId, documentType, dateFrom, dateTo } = req.query;

    let query = `
      SELECT mh.*, 
             p.name as product_name, p.sku,
             w.name as warehouse_name,
             u.name as user_name
      FROM move_history mh
      JOIN products p ON mh.product_id = p.id
      JOIN warehouses w ON mh.warehouse_id = w.id
      JOIN users u ON mh.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (productId) {
      query += ` AND mh.product_id = $${paramCount}`;
      params.push(productId);
      paramCount++;
    }

    if (warehouseId) {
      query += ` AND mh.warehouse_id = $${paramCount}`;
      params.push(warehouseId);
      paramCount++;
    }

    if (documentType) {
      query += ` AND mh.document_type = $${paramCount}`;
      params.push(documentType);
      paramCount++;
    }

    if (dateFrom) {
      query += ` AND mh.timestamp >= $${paramCount}`;
      params.push(dateFrom);
      paramCount++;
    }

    if (dateTo) {
      query += ` AND mh.timestamp <= $${paramCount}`;
      params.push(dateTo);
      paramCount++;
    }

    query += ` ORDER BY mh.timestamp DESC LIMIT 1000`;

    const result = await pool.query(query, params);

    res.json({
      status: 'success',
      data: result.rows,
    });
  }
);

