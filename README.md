# ☕ Drip & Brew: Church Cafe Storefront & POS

A modern, high-performance coffee shop management system built with **Nuxt 3**, **Supabase**, and **Tailwind CSS**. This project features a sleek customer-facing storefront and a real-time, authenticated POS dashboard for baristas.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18.x or higher)
- **A Supabase Project** (Free tier works perfectly)

### 2. Setup your Database
The application relies on three specific tables in your Supabase project. You can create them by running the following SQL in your **Supabase SQL Editor**:

```sql
-- 1. Create Products Table
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  image_url TEXT,
  category TEXT NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Orders Table
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
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
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Enable Realtime for the 'orders' table
-- Go to Database > Replication > Source: public > Select 'orders', 'order_items', 'promo_codes'

-- 6. Setup Row-Level Security (RLS)
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active promo codes" ON promo_codes FOR SELECT USING (is_active = true);
CREATE POLICY "Baristas can manage promo codes" ON promo_codes FOR ALL TO authenticated USING (true);
```
-- Allow ANYONE (including public customers) to READ products
CREATE POLICY "Public products are viewable by everyone" 
ON products FOR SELECT 
USING (true);

-- Allow AUTHENTICATED users (baristas) to INSERT/UPDATE/DELETE products
CREATE POLICY "Baristas can manage products" 
ON products FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Also add policies for orders to allow customers to place them:
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public to insert orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public to insert order items" ON order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow baristas to manage orders" ON orders FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow baristas to manage order items" ON order_items FOR ALL TO authenticated USING (true);
```

### 3. Configure Authentication
1. Go to **Authentication > Users** in your Supabase dashboard.
2. Click **Add User > Create new user**.
3. Create a user (e.g., `barista@boltcoffee.com`).
4. **Important:** Disable "Confirm email" in **Auth > Settings** or manually confirm the user to bypass email verification for testing.

### 4. Local Installation
```bash
# Clone the repository and install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env and add your Supabase URL and Anon Key

# Run development server
npm run dev
```

---

## 🛠 Project Structure

- `pages/index.vue`: The customer storefront. Browse products and place orders.
- `pages/pos/`: The barista-only dashboard (Auth protected).
- `stores/`: **Pinia** stores for managing the cart and real-time order state.
- `composables/`: Logic for Supabase interactions, checkout, and order synchronization.
- `components/`: Modular UI components (Storefront, POS board, etc.).

---

## ⚡ Key Features

- **Real-time Pipeline:** Orders placed on the storefront appear instantly on the POS board without refreshing.
- **Optimistic Updates:** Baristas can update order status (Preparing → Ready → Complete) with immediate UI feedback.
- **Auth Guard:** The POS system is protected by Supabase Auth middleware.
- **Responsive Design:** Fully adaptive for tablets (common in cafes) and desktops.

---

## 👨‍💻 Barista Login Hint
- **URL:** `http://localhost:3000/pos/login`
- **Email:** (The one you created in Supabase Auth)
- **Password:** (The one you created in Supabase Auth)
