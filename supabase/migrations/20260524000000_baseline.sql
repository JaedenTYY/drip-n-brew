-- Drip & Brew Consolidated Baseline Schema
-- Targets: Postgres 17 (Supabase)
-- This file merges all previous migrations into a single, clean initialization script.

-- 1. Setup Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Products Table
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  image_url TEXT,
  categories TEXT[] DEFAULT '{}', -- Optimized: TEXT[] used directly
  allowed_temperatures TEXT[], 
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Sequence Metadata (Tracker for daily order number resets)
CREATE TABLE sequence_metadata (
    key TEXT PRIMARY KEY,
    last_reset_date DATE NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Initialize the tracker for the order sequence
INSERT INTO sequence_metadata (key, last_reset_date)
VALUES ('order_seq', '1970-01-01')
ON CONFLICT (key) DO NOTHING;

-- 4. Create Orders Table
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  promo_code TEXT,
  order_number TEXT,
  order_type TEXT DEFAULT 'Dine In' CHECK (order_type IN ('Dine In', 'Takeaway', 'BYO Flask')), -- Added: Required by App
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'completed')),
  total_price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4.1 Daily Resetting Order Number Logic (Final Robust Version)
CREATE SEQUENCE IF NOT EXISTS order_seq START 1;

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
    new_val INTEGER;
    today DATE;
    last_reset DATE;
BEGIN
    -- Pin to shop's local timezone (Kuala Lumpur)
    today := (timezone('Asia/Kuala Lumpur', now()))::date;

    -- Row-level lock on metadata to prevent race conditions at midnight
    SELECT last_reset_date INTO last_reset
    FROM sequence_metadata
    WHERE key = 'order_seq'
    FOR UPDATE;

    -- If the recorded reset date is older than today, restart the sequence
    IF last_reset < today THEN
        ALTER SEQUENCE order_seq RESTART WITH 1;
        
        UPDATE sequence_metadata
        SET last_reset_date = today,
            updated_at = now()
        WHERE key = 'order_seq';
    END IF;

    -- Assign the next sequence value
    SELECT nextval('order_seq') INTO new_val;
    NEW.order_number := LPAD(new_val::text, 3, '0');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_generate_order_number
BEFORE INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION generate_order_number();

-- 5. Create Order Items Table
CREATE TABLE order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  customizations JSONB DEFAULT '{}'
);

-- 6. Create Promo Codes Table
CREATE TABLE promo_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT DEFAULT 'percent',
  discount_value INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  requires_survey BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Create Inventory System Tables
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    unopened_count NUMERIC(10, 2) NOT NULL DEFAULT 0,
    opened_state_notes TEXT,
    nearest_expiry_date DATE,
    unit TEXT NOT NULL DEFAULT 'units',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE inventory_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
    adjustment_amount NUMERIC(10, 2) NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- 8. Performance Optimization: Foreign Key Indexing
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- 9. Setup Table Row-Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;

-- Product Policies
CREATE POLICY "Public products are viewable by everyone" ON products FOR SELECT USING (true);
CREATE POLICY "Baristas can manage products" ON products FOR ALL TO authenticated USING (true);

-- Order & Item Policies
CREATE POLICY "Allow public to insert orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow baristas to manage orders" ON orders FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow baristas to view all orders" ON orders FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow public to insert order items" ON order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow baristas to manage order items" ON order_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow baristas to view all order items" ON order_items FOR SELECT TO authenticated USING (true);

-- Inventory Policies
CREATE POLICY "Baristas can manage inventory" ON inventory_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Baristas can view inventory logs" ON inventory_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Baristas can insert inventory logs" ON inventory_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Promo Code Policies
CREATE POLICY "Anyone can view active promo codes" ON promo_codes FOR SELECT USING (is_active = true);
CREATE POLICY "Baristas can manage promo codes" ON promo_codes FOR ALL TO authenticated USING (true);

-- 10. Analytical RPC Functions
-- Used by POS Dashboard (reports.vue) for performance tracking

-- 10.1 Daily Analytics
CREATE OR REPLACE FUNCTION get_daily_analytics(days_limit int DEFAULT 30)
RETURNS TABLE (
  date date,
  gross_sales numeric,
  net_sales numeric,
  total_orders_count bigint,
  total_cups_sold bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.created_at::date as date,
    SUM(o.total_price)::numeric as gross_sales,
    SUM(o.total_price)::numeric as net_sales,
    COUNT(DISTINCT o.id) as total_orders_count,
    COALESCE(SUM(oi.quantity), 0) as total_cups_sold
  FROM orders o
  LEFT JOIN order_items oi ON o.id = oi.order_id
  WHERE o.created_at >= NOW() - (days_limit || ' days')::interval
    AND o.status = 'completed'
  GROUP BY o.created_at::date
  ORDER BY o.created_at::date DESC;
END;
$$ LANGUAGE plpgsql;

-- 10.2 Weekly Analytics
CREATE OR REPLACE FUNCTION get_weekly_analytics()
RETURNS TABLE (
  date date,
  gross_sales numeric,
  net_sales numeric,
  total_orders_count bigint,
  total_cups_sold bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    date_trunc('week', o.created_at)::date as date,
    SUM(o.total_price)::numeric as gross_sales,
    SUM(o.total_price)::numeric as net_sales,
    COUNT(DISTINCT o.id) as total_orders_count,
    COALESCE(SUM(oi.quantity), 0) as total_cups_sold
  FROM orders o
  LEFT JOIN order_items oi ON o.id = oi.order_id
  WHERE o.status = 'completed'
  GROUP BY date_trunc('week', o.created_at)::date
  ORDER BY date_trunc('week', o.created_at)::date DESC;
END;
$$ LANGUAGE plpgsql;

-- 10.3 Monthly Analytics
CREATE OR REPLACE FUNCTION get_monthly_analytics()
RETURNS TABLE (
  date date,
  gross_sales numeric,
  net_sales numeric,
  total_orders_count bigint,
  total_cups_sold bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    date_trunc('month', o.created_at)::date as date,
    SUM(o.total_price)::numeric as gross_sales,
    SUM(o.total_price)::numeric as net_sales,
    COUNT(DISTINCT o.id) as total_orders_count,
    COALESCE(SUM(oi.quantity), 0) as total_cups_sold
  FROM orders o
  LEFT JOIN order_items oi ON o.id = oi.order_id
  WHERE o.status = 'completed'
  GROUP BY date_trunc('month', o.created_at)::date
  ORDER BY date_trunc('month', o.created_at)::date DESC;
END;
$$ LANGUAGE plpgsql;
