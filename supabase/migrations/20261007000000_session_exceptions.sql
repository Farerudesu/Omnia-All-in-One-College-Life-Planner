-- Migration: 20261007000000_session_exceptions.sql
-- Adds session_exceptions table for scheduling single-day exceptions

CREATE TABLE IF NOT EXISTS session_exceptions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_session_id TEXT NOT NULL,
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  types JSONB,
  is_online BOOLEAN,
  new_start_time TEXT,
  new_end_time TEXT,
  new_room TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, class_session_id, date)
);

ALTER TABLE session_exceptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'session_exceptions' AND policyname = 'Users can manage their own session exceptions'
  ) THEN
    CREATE POLICY "Users can manage their own session exceptions"
      ON session_exceptions
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
