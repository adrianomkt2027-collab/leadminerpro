-- Add 'paused' as a valid status for scheduled_dispatches
-- No schema change needed since status is text, but let's add a 'started_at' column for tracking
ALTER TABLE public.scheduled_dispatches ADD COLUMN IF NOT EXISTS started_at timestamp with time zone DEFAULT NULL;