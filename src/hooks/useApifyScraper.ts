import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Lead {
  nome: string;
  email: string;
  telefone: string;
  site: string;
  endereco: string;
  nicho: string;
  nota: number;
  instagram: string;
  instagram_username: string;
  facebook: string;
  avaliacoes: number;
  tem_site_proprio: boolean;
  potencial_trafego: string;
  pain_score: number;
  pico_funcionamento: string;
  ticket_medio: string;
  opportunity_score: number;
}

export interface ScrapeResult {
  success: boolean;
  data: Lead[];
  count: number;
  error?: string;
}

export interface ScraperFilters {
  estado?: string;
  cidade?: string;
  bairro?: string;
  cep?: string;
  palavraChave: string;
  maxResults?: number;
  notaMinima?: string;
  apenasComTelefone?: boolean;
  apenasSemSite?: boolean;
}

export function useApifyScraper() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ScrapeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runScraper = async (filters: ScraperFilters): Promise<ScrapeResult | null> => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("apify-scraper", {
        body: filters,
      });

      if (fnError) throw fnError;
      if (!data.success) throw new Error(data.error);

      setResults(data);\n      return data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao executar mineração";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return { loading, results, error, runScraper };
}
