-- Migration to rename 'category' to 'categories' in products table
-- and convert it to a text array to support multiple categories per product.

DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'category'
    ) THEN
        -- 1. Rename the column
        ALTER TABLE products RENAME COLUMN category TO categories;
        
        -- 2. Convert from TEXT to TEXT[]
        -- We use a single-element array to preserve existing data
        ALTER TABLE products 
        ALTER COLUMN categories TYPE TEXT[] 
        USING ARRAY[categories];
    END IF;
END $$;
