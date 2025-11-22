-- Add scheduled_date to receipts and deliveries
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS scheduled_date DATE;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS scheduled_date DATE;
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS scheduled_date DATE;

-- Create indexes for scheduled dates
CREATE INDEX IF NOT EXISTS idx_receipts_scheduled_date ON receipts(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_deliveries_scheduled_date ON deliveries(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_transfers_scheduled_date ON transfers(scheduled_date);

