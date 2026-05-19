-- Hardening Order Number Generation
-- This replaces the original trigger function with a version that:
-- 1. Uses an EXCLUSIVE LOCK to prevent race conditions at midnight (duplicate #001)
-- 2. Pins the "daily reset" logic to 'Asia/Kuala Lumpur' time

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
    new_val INTEGER;
    today DATE;
BEGIN
    -- BIG-TECH RELIABILITY: Ensure we use the shop's local timezone for 'today'
    today := (timezone('Asia/Kuala Lumpur', now()))::date;

    -- EXCLUSIVE LOCK: Prevent race conditions where two orders at 12:00:01am
    -- both try to reset the sequence simultaneously.
    LOCK TABLE orders IN EXCLUSIVE MODE;

    -- Reset sequence if this is the first order of the day
    IF NOT EXISTS (
        SELECT 1 FROM orders 
        WHERE (timezone('Asia/Kuala Lumpur', created_at))::date = today
        LIMIT 1
    ) THEN
        ALTER SEQUENCE order_seq RESTART WITH 1;
    END IF;

    SELECT nextval('order_seq') INTO new_val;
    NEW.order_number := LPAD(new_val::text, 3, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
