-- Seed initial data

-- Insert default warehouse
INSERT INTO warehouses (id, name, location, description)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Main Warehouse', 'Headquarters', 'Primary storage facility')
ON CONFLICT DO NOTHING;

-- Insert sample products
INSERT INTO products (id, name, sku, category, unit_of_measure, reorder_level, reorder_quantity)
VALUES 
    ('00000000-0000-0000-0000-000000000010', 'Steel Rods', 'STEEL-001', 'Raw Materials', 'kg', 50, 100),
    ('00000000-0000-0000-0000-000000000011', 'Chairs', 'CHAIR-001', 'Furniture', 'units', 20, 50)
ON CONFLICT DO NOTHING;

-- Initialize stock (optional - can be set to 0)
INSERT INTO product_stocks (product_id, warehouse_id, quantity)
VALUES 
    ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 0),
    ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 0)
ON CONFLICT (product_id, warehouse_id) DO NOTHING;

