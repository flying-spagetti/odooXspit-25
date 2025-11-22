-- Add short_code to warehouses
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS short_code VARCHAR(50);

-- Create locations table (sub-entities of warehouses)
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    short_code VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for locations
CREATE INDEX IF NOT EXISTS idx_locations_warehouse_id ON locations(warehouse_id);

-- Add reference fields to documents
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS reference VARCHAR(100);
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS responsible VARCHAR(255);
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS receive_from VARCHAR(255);

ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS reference VARCHAR(100);
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS responsible VARCHAR(255);
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS operation_type VARCHAR(50);

ALTER TABLE transfers ADD COLUMN IF NOT EXISTS reference VARCHAR(100);
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS responsible VARCHAR(255);

ALTER TABLE adjustments ADD COLUMN IF NOT EXISTS reference VARCHAR(100);
ALTER TABLE adjustments ADD COLUMN IF NOT EXISTS responsible VARCHAR(255);

-- Create indexes for references
CREATE INDEX IF NOT EXISTS idx_receipts_reference ON receipts(reference);
CREATE INDEX IF NOT EXISTS idx_deliveries_reference ON deliveries(reference);
CREATE INDEX IF NOT EXISTS idx_transfers_reference ON transfers(reference);

-- Add unit_price to product_stocks for tracking per unit cost
ALTER TABLE product_stocks ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10, 2);
ALTER TABLE product_stocks ADD COLUMN IF NOT EXISTS reserved_quantity INTEGER DEFAULT 0;

