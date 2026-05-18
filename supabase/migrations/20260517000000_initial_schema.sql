-- 1. Create Products Table
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  image_url TEXT,
  category TEXT NOT NULL,
  allowed_temperatures TEXT[], 
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT, -- Added for digital receipts
  promo_code TEXT,
  order_number TEXT, -- New: Human-readable daily ID (e.g., #001)
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'completed')),
  total_price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.1 Daily Resetting Order Number Logic
CREATE SEQUENCE IF NOT EXISTS order_seq START 1;

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
    new_val INTEGER;
BEGIN
    -- Reset sequence daily
    IF NOT EXISTS (
        SELECT 1 FROM orders 
        WHERE created_at::date = CURRENT_DATE 
        LIMIT 1
    ) THEN
        ALTER SEQUENCE order_seq RESTART WITH 1;
    END IF;

    SELECT nextval('order_seq') INTO new_val;
    NEW.order_number := LPAD(new_val::text, 3, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_generate_order_number ON orders;
CREATE TRIGGER tr_generate_order_number
BEFORE INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION generate_order_number();

-- 3. Create Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  customizations JSONB DEFAULT '{}'
);

-- 4. Create Promo Codes Table
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT DEFAULT 'percent',
  discount_value INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  requires_survey BOOLEAN DEFAULT false, -- New: Triggers Newcomer Survey
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create Inventory System Tables
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    unopened_count INTEGER NOT NULL DEFAULT 0,
    opened_state_notes TEXT,
    nearest_expiry_date DATE,
    unit TEXT NOT NULL DEFAULT 'units',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
    adjustment_amount INTEGER NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- 6. Setup Table Row-Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;

-- Product Policies
DROP POLICY IF EXISTS "Public products are viewable by everyone" ON products;
CREATE POLICY "Public products are viewable by everyone" ON products FOR SELECT USING (true);
DROP POLICY IF EXISTS "Baristas can manage products" ON products;
CREATE POLICY "Baristas can manage products" ON products FOR ALL TO authenticated USING (true);

-- Order & Item Policies
DROP POLICY IF EXISTS "Allow public to insert orders" ON orders;
CREATE POLICY "Allow public to insert orders" ON orders FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow baristas to manage orders" ON orders;
CREATE POLICY "Allow baristas to manage orders" ON orders FOR ALL TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow baristas to view all orders" ON orders;
CREATE POLICY "Allow baristas to view all orders" ON orders FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow public to insert order items" ON order_items;
CREATE POLICY "Allow public to insert order items" ON order_items FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow baristas to manage order items" ON order_items;
CREATE POLICY "Allow baristas to manage order items" ON order_items FOR ALL TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow baristas to view all order items" ON order_items;
CREATE POLICY "Allow baristas to view all order items" ON order_items FOR SELECT TO authenticated USING (true);

-- Inventory Policies
DROP POLICY IF EXISTS "Baristas can manage inventory" ON inventory_items;
CREATE POLICY "Baristas can manage inventory" ON inventory_items FOR ALL TO authenticated USING (true);
DROP POLICY IF EXISTS "Baristas can view inventory logs" ON inventory_logs;
CREATE POLICY "Baristas can view inventory logs" ON inventory_logs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Baristas can insert inventory logs" ON inventory_logs;
CREATE POLICY "Baristas can insert inventory logs" ON inventory_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Promo Code Policies
DROP POLICY IF EXISTS "Anyone can view active promo codes" ON promo_codes;
CREATE POLICY "Anyone can view active promo codes" ON promo_codes FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Baristas can manage promo codes" ON promo_codes;
CREATE POLICY "Baristas can manage promo codes" ON promo_codes FOR ALL TO authenticated USING (true);
