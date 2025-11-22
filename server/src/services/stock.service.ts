import pool from '../config/database.js';

export interface StockUpdateParams {
  productId: string;
  warehouseId: string;
  quantity: number;
  documentId: string;
  documentType: string;
  movementType: 'in' | 'out' | 'transfer';
  userId: string;
}

export const updateStock = async (params: StockUpdateParams): Promise<void> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get current stock
    const stockResult = await client.query(
      `SELECT quantity FROM product_stocks
       WHERE product_id = $1 AND warehouse_id = $2`,
      [params.productId, params.warehouseId]
    );

    const quantityBefore = stockResult.rows[0]?.quantity || 0;
    let quantityAfter = quantityBefore;

    // Update stock based on movement type
    if (params.movementType === 'in') {
      quantityAfter = quantityBefore + params.quantity;
    } else if (params.movementType === 'out') {
      quantityAfter = Math.max(0, quantityBefore - params.quantity);
    }

    // Upsert stock
    await client.query(
      `INSERT INTO product_stocks (product_id, warehouse_id, quantity, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (product_id, warehouse_id)
       DO UPDATE SET quantity = $3, updated_at = CURRENT_TIMESTAMP`,
      [params.productId, params.warehouseId, quantityAfter]
    );

    // Record in move history
    await client.query(
      `INSERT INTO move_history (
        product_id, warehouse_id, document_id, document_type,
        quantity, quantity_before, quantity_after, movement_type, user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        params.productId,
        params.warehouseId,
        params.documentId,
        params.documentType,
        params.movementType === 'in' ? params.quantity : -params.quantity,
        quantityBefore,
        quantityAfter,
        params.movementType,
        params.userId,
      ]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

