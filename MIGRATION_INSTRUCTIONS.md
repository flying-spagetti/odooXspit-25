# Database Migration Instructions

## Running Migrations

To add the `scheduled_date` column to receipts, deliveries, and transfers tables, run:

```bash
cd server
npm run migrate
```

This will run all migration files in the `server/migrations/` directory in order.

## Migration Files

1. `001_initial_schema.sql` - Initial database schema
2. `002_add_scheduled_dates.sql` - Adds scheduled_date columns

## Manual Migration (if needed)

If you need to run the migration manually, you can execute the SQL directly:

```sql
-- Add scheduled_date to receipts and deliveries
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS scheduled_date DATE;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS scheduled_date DATE;
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS scheduled_date DATE;

-- Create indexes for scheduled dates
CREATE INDEX IF NOT EXISTS idx_receipts_scheduled_date ON receipts(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_deliveries_scheduled_date ON deliveries(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_transfers_scheduled_date ON transfers(scheduled_date);
```

## Note

The dashboard will work even without the `scheduled_date` columns - it will just show 0 for Late and Operations counts until the migration is run.

