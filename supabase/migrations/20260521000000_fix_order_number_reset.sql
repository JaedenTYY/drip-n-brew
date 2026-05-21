-- Fix Order Number Reset Logic
-- The previous logic relied on the 'orders' table to determine if a sequence reset was needed.
-- If all orders for the day were deleted, the sequence would reset to 001.
-- This migration introduces a dedicated 'sequence_metadata' table to track resets independently.

-- 1. Create a metadata table to track sequence resets independently of order data
CREATE TABLE IF NOT EXISTS sequence_metadata (
    key TEXT PRIMARY KEY,
    last_reset_date DATE NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Initialize the tracker for the order sequence
INSERT INTO sequence_metadata (key, last_reset_date)
VALUES ('order_seq', '1970-01-01')
ON CONFLICT (key) DO NOTHING;

-- 3. Update the trigger function with robust logic
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
    new_val INTEGER;
    today DATE;
    last_reset DATE;
BEGIN
    -- Pin to shop's local timezone
    today := (timezone('Asia/Kuala Lumpur', now()))::date;

    -- BIG-TECH RELIABILITY: Use a row-level lock on the metadata table
    -- This prevents race conditions without locking the entire 'orders' table.
    -- The lock is held until the transaction (INSERT) completes.
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
