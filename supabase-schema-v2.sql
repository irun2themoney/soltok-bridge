-- SolTok Bridge Schema v2 - Security Hardening
-- Run this in Supabase SQL Editor to add missing constraints and policies

-- 1. Add DELETE policy (was missing)
CREATE POLICY "Allow public delete access" ON orders
  FOR DELETE USING (true);

-- 2. Add CHECK constraints for positive values
ALTER TABLE orders 
ADD CONSTRAINT check_positive_price 
CHECK (product_price >= 0);

ALTER TABLE orders 
ADD CONSTRAINT check_positive_escrow 
CHECK (escrow_amount >= 0);

-- 3. Clean up test data from stress tests
DELETE FROM orders WHERE id LIKE 'STRESS-%';
DELETE FROM orders WHERE id LIKE 'MASS-%';
DELETE FROM orders WHERE id LIKE 'DUPE-%';
DELETE FROM orders WHERE id LIKE 'XSS-%';
DELETE FROM orders WHERE id LIKE 'INJECT-%';

-- 4. Verify schema
SELECT 'Policies:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'orders';

SELECT 'Constraints:' as info;
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass;

SELECT 'Order count:' as info, count(*) as total FROM orders;
