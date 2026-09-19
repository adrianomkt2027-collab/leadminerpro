-- Add sent_count to track real-time progress of dispatches
ALTER TABLE public.scheduled_dispatches ADD COLUMN IF NOT EXISTS sent_count integer NOT NULL DEFAULT 0;