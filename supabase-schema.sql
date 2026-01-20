-- SolTok Bridge Orders Table
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Create the orders table
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  product_name TEXT NOT NULL,
  product_image TEXT,
  product_price DECIMAL(10, 2) NOT NULL,
  merchant TEXT,
  tiktok_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'locked', 'processing', 'shipped', 'delivered', 'refunded')),
  escrow_amount DECIMAL(10, 2) NOT NULL,
  escrow_tx_hash TEXT,
  shipping_name TEXT NOT NULL,
  shipping_street TEXT NOT NULL,
  shipping_city TEXT,
  shipping_state TEXT,
  shipping_zip TEXT,
  wallet_address TEXT,
  is_demo BOOLEAN DEFAULT false,
  fulfillment_steps JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_wallet ON orders(wallet_address);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to read all orders (for demo purposes)
-- In production, you'd want to restrict this to authenticated users
CREATE POLICY "Allow public read access" ON orders
  FOR SELECT USING (true);

-- Policy: Allow anyone to insert orders (for demo purposes)
CREATE POLICY "Allow public insert access" ON orders
  FOR INSERT WITH CHECK (true);

-- Policy: Allow anyone to update orders (for demo purposes)
CREATE POLICY "Allow public update access" ON orders
  FOR UPDATE USING (true);

-- Enable realtime for the orders table
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
