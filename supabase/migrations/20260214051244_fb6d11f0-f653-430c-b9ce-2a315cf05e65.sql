
-- Create dispatch groups table
CREATE TABLE public.dispatch_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.dispatch_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dispatch groups" ON public.dispatch_groups FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own dispatch groups" ON public.dispatch_groups FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own dispatch groups" ON public.dispatch_groups FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own dispatch groups" ON public.dispatch_groups FOR DELETE USING (auth.uid() = user_id);

-- Create dispatch group contacts table
CREATE TABLE public.dispatch_group_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.dispatch_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.dispatch_group_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own group contacts" ON public.dispatch_group_contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own group contacts" ON public.dispatch_group_contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own group contacts" ON public.dispatch_group_contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own group contacts" ON public.dispatch_group_contacts FOR DELETE USING (auth.uid() = user_id);
