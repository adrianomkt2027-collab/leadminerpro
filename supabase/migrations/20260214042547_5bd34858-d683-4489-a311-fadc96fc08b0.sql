
-- Add user_id to mineracoes
ALTER TABLE public.mineracoes ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to leads  
ALTER TABLE public.leads ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop old permissive policies
DROP POLICY "Allow all access to mineracoes" ON public.mineracoes;
DROP POLICY "Allow all access to leads" ON public.leads;

-- User-scoped policies for mineracoes
CREATE POLICY "Users can view own mineracoes" ON public.mineracoes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own mineracoes" ON public.mineracoes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own mineracoes" ON public.mineracoes FOR DELETE USING (auth.uid() = user_id);

-- User-scoped policies for leads
CREATE POLICY "Users can view own leads" ON public.leads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own leads" ON public.leads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own leads" ON public.leads FOR DELETE USING (auth.uid() = user_id);
