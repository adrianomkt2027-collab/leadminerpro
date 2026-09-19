
CREATE TABLE public.cnpj_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cnpj TEXT NOT NULL,
  razao_social TEXT NOT NULL DEFAULT '',
  nome_fantasia TEXT DEFAULT '',
  situacao_cadastral TEXT DEFAULT '',
  data_abertura TEXT DEFAULT '',
  cnae_principal TEXT DEFAULT '',
  cnae_codigo TEXT DEFAULT '',
  logradouro TEXT DEFAULT '',
  numero TEXT DEFAULT '',
  bairro TEXT DEFAULT '',
  municipio TEXT DEFAULT '',
  uf TEXT DEFAULT '',
  cep TEXT DEFAULT '',
  telefone1 TEXT DEFAULT '',
  telefone2 TEXT DEFAULT '',
  email TEXT DEFAULT '',
  capital_social NUMERIC DEFAULT 0,
  porte TEXT DEFAULT '',
  natureza_juridica TEXT DEFAULT '',
  socios TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cnpj_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cnpj_leads" ON public.cnpj_leads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cnpj_leads" ON public.cnpj_leads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cnpj_leads" ON public.cnpj_leads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own cnpj_leads" ON public.cnpj_leads FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_cnpj_leads_user_id ON public.cnpj_leads(user_id);
CREATE INDEX idx_cnpj_leads_cnpj ON public.cnpj_leads(cnpj);
