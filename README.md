# ☕ Drip & Brew: Modern Church Cafe Storefront & POS

A premium, high-performance coffee shop management system built with **Nuxt 3**, **Supabase**, and **Tailwind CSS**. This project features a sleek customer-facing storefront and a real-time, authenticated POS dashboard for baristas.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18.x or higher)
- **Docker & Docker Compose** (For local database/app containerization)
- **Supabase CLI** (Optional, for local Supabase emulation)

---

### 2. Database & Backend Setup

You can choose between using a hosted Supabase project or a local Docker-based setup.

#### Option A: Supabase Cloud (Managed)
1. Create a new project at [supabase.com](https://supabase.com).
2. Run the initial schema migration located in `supabase/migrations/20260517000000_initial_schema.sql` using the **Supabase SQL Editor**.
3. Enable **Authentication** and create a barista user. Disable "Confirm email" in Auth Settings.
4. Create a public storage bucket named `product-images`.

#### Option B: Local Docker Database
If you prefer to run only the PostgreSQL database locally:
```bash
# Start the database container
docker compose up -d db
```
*The database will be available at `localhost:54322` and will automatically run migrations from the `supabase/migrations` folder on first start.*

#### Option C: Local Supabase CLI
For a full local Supabase environment (Auth, Storage, Functions):
```bash
# Initialize and start Supabase
supabase start
```

---

### 3. Environment Variables

Create a `.env` file in the root directory:

```bash
# Supabase Configuration
NUXT_PUBLIC_SUPABASE_URL=your_supabase_url
NUXT_PUBLIC_SUPABASE_KEY=your_supabase_anon_key
NUXT_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# PCO Integration (Optional)
PCO_APP_ID=your_pco_application_id
PCO_SECRET=your_pco_secret
PCO_FIELD_INVITED_BY=...
PCO_FIELD_LOOKING_FOR_CHURCH=...
PCO_FIELD_INTERESTED_IN_JESUS=...

# Email Configuration (Nodemailer)
NUXT_GMAIL_USER=your_email@gmail.com
NUXT_GMAIL_APP_PASSWORD=your_app_password
```

---

### 4. Installation & Running

#### Standard Development
```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

#### Full Stack Docker Setup
To run both the Nuxt application and the database in containers:
```bash
# Build and start all services
docker compose up --build
```
*The application will be accessible at `http://localhost:3000`.*

---

## 🛠 Project Structure

- `pages/index.vue`: Customer storefront (Zero-scroll checkout).
- `pages/pos/`: Barista dashboard (Auth protected).
- `pages/pos/inventory.vue`: Hybrid inventory management system.
- `pages/pos/history.vue`: Order history and completed transactions.
- `pages/pos/reports.vue`: Performance analytics with monthly and weekly breakdowns.
- `stores/`: Pinia stores for cart, orders, and inventory audit trails.
- `composables/`: Platform-aware logic, theme switching, and Supabase hooks.

---

## ⚡ Key Features

- **Hybrid Inventory Model:** Track unopened units precisely while allowing flexible notes for opened items.
- **Enhanced Reporting:** Weekly and monthly performance breakdowns with automated "Sales" and "Gross Orders" calculations.
- **Short Order ID System:** Daily-resetting IDs (e.g., #001) for faster order identification on the barista board.
- **Live Order Editing:** Baristas can swap drinks, adjust customizations, or apply promo codes after an order is placed.
- **Real-time Pipeline:** Orders appear on the POS instantly via Supabase replication.
- **HCI Optimized Checkout:** Single-view, no-scroll checkout information page for rapid mobile ordering.

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
