
CREATE TABLE public.saved_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  instance_name TEXT NOT NULL,
  instance_id TEXT DEFAULT '',
  status TEXT DEFAULT '',
  owner TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own instances" ON public.saved_instances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own instances" ON public.saved_instances FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own instances" ON public.saved_instances FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own instances" ON public.saved_instances FOR DELETE USING (auth.uid() = user_id);

CREATE UNIQUE INDEX idx_saved_instances_user_name ON public.saved_instances (user_id, instance_name);
