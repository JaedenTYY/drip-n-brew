-- Performance Optimization: Foreign Key Indexing
-- By default, PostgreSQL does not create indexes on foreign key columns.
-- Adding these indexes makes the deep joins used in the POS Dashboard (Orders -> Items -> Products)
-- significantly faster, especially as the database grows.

-- 1. Index for looking up items belonging to an order
-- Speed up: orders.id <-> order_items.order_id
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- 2. Index for looking up product details for an item
-- Speed up: order_items.product_id <-> products.id
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- 3. Index for filtering active orders by status
-- Speed up: fetchActiveOrders queries
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
