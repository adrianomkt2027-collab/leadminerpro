
CREATE TABLE public.scheduled_dispatches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  dispatch_type TEXT NOT NULL DEFAULT 'text',
  message_text TEXT NOT NULL DEFAULT '',
  media_url TEXT,
  instance_name TEXT,
  dispatch_mode TEXT NOT NULL DEFAULT 'specific',
  contacts JSONB NOT NULL DEFAULT '[]',
  min_delay INTEGER NOT NULL DEFAULT 5,
  max_delay INTEGER NOT NULL DEFAULT 15,
  batch_size INTEGER NOT NULL DEFAULT 10,
  batch_pause INTEGER NOT NULL DEFAULT 60,
  variation_enabled BOOLEAN NOT NULL DEFAULT true,
  variation_emojis TEXT DEFAULT '',
  results JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.scheduled_dispatches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own schedules" ON public.scheduled_dispatches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own schedules" ON public.scheduled_dispatches FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own schedules" ON public.scheduled_dispatches FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own schedules" ON public.scheduled_dispatches FOR DELETE USING (auth.uid() = user_id);
