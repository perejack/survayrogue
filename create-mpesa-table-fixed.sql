-- Create mpesa_payments table for STK payments integration
CREATE TABLE IF NOT EXISTS mpesa_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  checkout_request_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id TEXT,
  phone_number TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  mpesa_receipt_number TEXT,
  external_reference TEXT,
  result_code INTEGER,
  result_desc TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE mpesa_payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own payments" ON mpesa_payments;
DROP POLICY IF EXISTS "Service role can manage payments" ON mpesa_payments;

-- Recreate policies
CREATE POLICY "Users can view own payments" 
  ON mpesa_payments FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage payments" 
  ON mpesa_payments FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Create indexes (will skip if already exist)
CREATE INDEX IF NOT EXISTS idx_mpesa_checkout_request_id ON mpesa_payments(checkout_request_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_user_id ON mpesa_payments(user_id);
