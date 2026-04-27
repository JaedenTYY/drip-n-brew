# ☕ Drip & Brew: Modern Church Cafe Storefront & POS

A premium, high-performance coffee shop management system built with **Nuxt 3**, **Supabase**, and **Tailwind CSS**. This project features a sleek customer-facing storefront and a real-time, authenticated POS dashboard for baristas.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18.x or higher)
- **A Supabase Project** (Free tier works perfectly)

### 2. Setup your Database
The application relies on a robust PostgreSQL schema. Run the following in your **Supabase SQL Editor**:

```sql
-- 1. Create Products Table
CREATE TABLE products (
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
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT, -- Added for digital receipts
  promo_code TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'completed')),
  total_price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Order Items Table
CREATE TABLE order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  customizations JSONB DEFAULT '{}'
);

-- 4. Create Promo Codes Table
CREATE TABLE promo_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT DEFAULT 'percent',
  discount_value INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  requires_survey BOOLEAN DEFAULT false, -- New: Triggers Newcomer Survey
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create Inventory System Tables
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    unopened_count INTEGER NOT NULL DEFAULT 0,
    opened_state_notes TEXT,
    nearest_expiry_date DATE,
    unit TEXT NOT NULL DEFAULT 'units',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE inventory_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
    adjustment_amount INTEGER NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 6. Setup Table Row-Level Security (RLS)
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

-- 7. Setup Storage (For Product Images)
-- Go to Storage > New Bucket > Create a bucket named 'product-images' and set it to PUBLIC.
-- Then run these policies to allow Baristas to upload:

CREATE POLICY "Public Read Access" ON storage.objects FOR SELECT USING ( bucket_id = 'product-images' );
CREATE POLICY "Baristas can upload product images" ON storage.objects FOR INSERT TO authenticated WITH CHECK ( bucket_id = 'product-images' );
CREATE POLICY "Baristas can update product images" ON storage.objects FOR UPDATE TO authenticated USING ( bucket_id = 'product-images' );
CREATE POLICY "Baristas can delete product images" ON storage.objects FOR DELETE TO authenticated USING ( bucket_id = 'product-images' );
```

### 3. Configure Authentication
1. Go to **Authentication > Users** in your Supabase dashboard.
2. Click **Add User > Create new user**.
3. Create a user (e.g., `barista@boltcoffee.com`).
4. **Important:** Disable "Confirm email" in **Auth > Settings** to bypass verification.

### 4. Local Installation
```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Add your SUPABASE_URL and SUPABASE_KEY to .env

# Run development server
npm run dev
```

---

## 🛠 Project Structure

- `pages/index.vue`: Customer storefront (Zero-scroll checkout).
- `pages/pos/`: Barista dashboard (Auth protected).
- `pages/pos/inventory.vue`: Hybrid inventory management system.
- `pages/pos/history.vue`: Order history and completed transactions.
- `stores/`: Pinia stores for cart, orders, and inventory audit trails.
- `composables/`: Platform-aware logic, theme switching, and Supabase hooks.

---

## ⚡ Key Features

- **Hybrid Inventory Model:** Track unopened units precisely while allowing flexible notes for opened items.
- **Predictive Expiry Tracking:** Dashboard automatically flags items expiring within 7 days.
- **Real-time Pipeline:** Orders appear on the POS instantly via Supabase replication.
- **HCI Optimized Checkout:** Single-view, no-scroll checkout information page for rapid mobile ordering.
- **Platform-Aware Flow:** Seamlessly switches between app deep-linking (Mobile) and new-tab verification (PC).

---

## 👨‍💻 Barista Dashboard
- **URL:** `/pos/login`
- **Features:** Order management, Stock adjustments, History, Dark Mode.

---

## ⛪ Planning Center Online (PCO) Integration
The storefront includes a "Newcomer Flow" that syncs customer data and survey results to PCO People.

**Required Environment Variables (.env):**
```bash
PCO_APP_ID=your_pco_application_id
PCO_SECRET=your_pco_secret
# Custom Field Definition IDs (Find these by inspecting PCO Settings)
PCO_FIELD_INVITED_BY=123456
PCO_FIELD_LOOKING_FOR_CHURCH=123457
PCO_FIELD_INTERESTED_IN_JESUS=123458
```

**Workflow:**
- If a promo code has `requires_survey = true`, the checkout process will branch to capture newcomer information.
- Data is synced asynchronously via a server-side proxy (`/server/api/checkout.post.ts`) to ensure coffee orders are never blocked by external API latency.
- Person creation follows JSON:API standards (Sequential: Person -> Email -> Phone -> FieldData).
