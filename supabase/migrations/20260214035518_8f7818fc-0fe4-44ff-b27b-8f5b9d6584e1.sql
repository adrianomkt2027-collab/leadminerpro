
-- Table to store search/mining sessions
CREATE TABLE public.mineracoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cidade TEXT NOT NULL,
  palavra_chave TEXT NOT NULL,
  total_leads INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table to store leads
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mineracao_id UUID NOT NULL REFERENCES public.mineracoes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT DEFAULT '',
  telefone TEXT DEFAULT '',
  site TEXT DEFAULT '',
  endereco TEXT DEFAULT '',
  nicho TEXT DEFAULT '',
  nota NUMERIC DEFAULT 0,
  tem_site_proprio BOOLEAN DEFAULT false,
  potencial_trafego TEXT DEFAULT '',
  pain_score INTEGER DEFAULT 0,
  opportunity_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mineracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (no auth required for this app)
CREATE POLICY "Allow all access to mineracoes" ON public.mineracoes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to leads" ON public.leads FOR ALL USING (true) WITH CHECK (true);

-- Index for faster lead lookups
CREATE INDEX idx_leads_mineracao_id ON public.leads(mineracao_id);
