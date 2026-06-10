# ☕ Drip & Brew: Modern Church Cafe Storefront & POS

A premium, high-performance coffee shop management system built with **Nuxt 3**, **Supabase**, and **Tailwind CSS**. This project features a sleek customer-facing storefront and a real-time, authenticated POS dashboard for baristas.

---

## 🚀 Getting Started (Docker & Local Dev)

It is highly recommended to run the project locally using **Docker** for the Nuxt app and the **Supabase CLI** for the backend. This guarantees you have the exact database schemas, auth, and API that the project expects, contained cleanly in Docker.

### 1. Prerequisites
- **Git** (To clone the repository)
- **Docker Desktop** (Make sure the Docker daemon is running)
- **Node.js & npm** (Required for the Supabase CLI)

---

### 2. Clone & Start the Backend

First, clone the repository and start the Supabase backend. The Supabase CLI uses Docker under the hood to spin up PostgreSQL, GoTrue (Auth), PostgREST (API), and Studio.

```bash
# 1. Clone the repository
git clone https://github.com/your-username/drip-n-brew.git
cd drip-n-brew

# 2. Start the local Supabase stack
npx supabase start
```
*Note: The first time you run `supabase start`, it will download the necessary Docker images. Once it finishes, it will print your local `API URL`, `anon key`, and `service_role key`.*

---

### 3. Environment Variables

Create a new `.env` file in the root directory and fill in the local Supabase credentials printed from the previous step:

```bash
# Supabase Configuration (Local Development)
NUXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NUXT_PUBLIC_SUPABASE_KEY=your_local_anon_key
NUXT_SUPABASE_SERVICE_ROLE_KEY=your_local_service_role_key

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

### 4. Run the Nuxt Application

With the backend running and your `.env` configured, you can now start the frontend application. We use Docker to containerize the Nuxt app for a seamless, "works-on-my-machine" experience.

```bash
# Build and start the Nuxt app container in the background
docker-compose up --build -d
```

🎉 **That's it!**
- 🛒 **Storefront:** http://localhost:3000
- 👨‍💻 **Barista POS:** http://localhost:3000/pos/login
- 🗄️ **Supabase Studio (Local DB Admin):** http:/localhost:54323

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
