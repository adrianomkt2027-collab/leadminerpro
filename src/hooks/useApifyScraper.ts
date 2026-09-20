import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Lead {
  nome: string; email: string; telefone: string; site: string; endereco: string; nicho: string;
  nota: number; instagram: string; instagram_username: string; facebook: string; avaliacoes: number;
  tem_site_proprio: boolean; potencial_trafego: string; pain_score: number; pico_funcionamento: string;
  ticket_medio: string; opportunity_score: number;
}
export interface ScrapeResult { success: boolean; data: Lead[]; count: number; error?: string; }
export interface ScraperFilters {
  estado?: string; cidade?: string; bairro?: string; cep?: string; palavraChave: string;
  maxResults?: number; notaMinima?: string; apenasComTelefone?: boolean; apenasSemSite?: boolean;
}

export function useApifyScraper() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ScrapeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runScraper = async (filters: ScraperFilters): Promise<ScrapeResult | null> => {
    setLoading(true); setError(null); setResults(null);

    try {
      const { data: started, error: startError } = await supabase.functions.invoke("apify-scraper", {
        body: { ...filters, action: "start" },
      });
      if (startError) throw startError;
      if (!started?.success || !started.runId) throw new Error(started?.error || "Não foi possível iniciar a mineração.");

      // Poll the Apify run instead of keeping one Supabase request open.
      // This avoids the Edge Function wall-clock/idle timeout for large jobs.
      for (;;) {
        await new Promise((resolve) => setTimeout(resolve, 2500));

        const { data, error: statusError } = await supabase.functions.invoke("apify-scraper", {
          body: { ...filters, action: "status", runId: started.runId },
        });
        if (statusError) throw statusError;
        if (!data?.success) throw new Error(data?.error || "Erro ao consultar a mineração.");

        if (data.status === "SUCCEEDED") {
          setResults(data);
          return data;
        }

        if (["FAILED", "ABORTED", "TIMED-OUT"].includes(data.status)) {
          throw new Error(data.error || `A Apify encerrou a mineração com status ${data.status}.`);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao executar mineração";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { loading, results, error, runScraper };
}
