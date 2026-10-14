-- Migration: 20261014000000_chat_history.sql
-- Adds chat_history jsonb column to user_settings for cross-device chat synchronization

ALTER TABLE IF EXISTS public.user_settings
ADD COLUMN IF NOT EXISTS chat_history JSONB DEFAULT '[]'::jsonb;
