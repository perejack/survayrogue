-- Fix RLS policies for profiles table
-- Run this in your Supabase SQL Editor

-- Enable RLS (if not already enabled)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for new user registration" ON profiles;

-- Policy 1: Allow users to view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Policy 2: Allow users to update their own profile  
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 3: Allow new profile creation during signup (also needed for upsert)
CREATE POLICY "Enable insert for new user registration"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Also add RLS policies for mpesa_payments table
DROP POLICY IF EXISTS "Users can insert own payments" ON mpesa_payments;
DROP POLICY IF EXISTS "Users can view own payments" ON mpesa_payments;

CREATE POLICY "Users can insert own payments"
  ON mpesa_payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own payments"
  ON mpesa_payments FOR SELECT
  USING (auth.uid() = user_id);

-- Verify the policies are created
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'profiles';
