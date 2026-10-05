-- Migration: 20261005000001_payment_methods.sql
-- Adds payment_methods table and user_settings column

-- 1. Ensure user_settings has payment_methods column (jsonb array)
ALTER TABLE IF EXISTS user_settings
ADD COLUMN IF NOT EXISTS payment_methods JSONB DEFAULT '["QRIS", "Debit", "Cash", "Transfer"]'::jsonb;

-- 2. Create payment_methods table if desired for discrete relational management
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'payment_methods' AND policyname = 'Users can manage their own payment methods'
  ) THEN
    CREATE POLICY "Users can manage their own payment methods"
      ON payment_methods
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
