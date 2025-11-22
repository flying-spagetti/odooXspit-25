import pool from '../config/database.js';

export async function generateReceiptReference(): Promise<string> {
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM receipts WHERE reference LIKE 'WH/IN/%'`
  );
  const count = parseInt(result.rows[0].count || '0');
  const nextNumber = (count + 1).toString().padStart(4, '0');
  return `WH/IN/${nextNumber}`;
}

export async function generateDeliveryReference(): Promise<string> {
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM deliveries WHERE reference LIKE 'WH/OUT/%'`
  );
  const count = parseInt(result.rows[0].count || '0');
  const nextNumber = (count + 1).toString().padStart(4, '0');
  return `WH/OUT/${nextNumber}`;
}

export async function generateTransferReference(): Promise<string> {
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM transfers WHERE reference LIKE 'WH/TR/%'`
  );
  const count = parseInt(result.rows[0].count || '0');
  const nextNumber = (count + 1).toString().padStart(4, '0');
  return `WH/TR/${nextNumber}`;
}

export async function generateAdjustmentReference(): Promise<string> {
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM adjustments WHERE reference LIKE 'WH/ADJ/%'`
  );
  const count = parseInt(result.rows[0].count || '0');
  const nextNumber = (count + 1).toString().padStart(4, '0');
  return `WH/ADJ/${nextNumber}`;
}

