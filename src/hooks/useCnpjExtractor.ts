import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface CnpjCompany {
  cnpj: string; razao_social: string; nome_fantasia: string; situacao_cadastral: string; data_abertura: string;
  cnae_principal: string; cnae_codigo: string; logradouro: string; numero: string; bairro: string; municipio: string; uf: string; cep: string;
  telefone1: string; telefone2: string; email: string; capital_social: number; porte: string; natureza_juridica: string; socios: string;
}
export interface CnaeItem { code: string; name: string; }
export interface MunicipioItem { name: string; }

interface ExtractorState { companies: CnpjCompany[]; loading: boolean; progress: number; total: number; currentPage: number; error: string | null; }

export function useCnpjExtractor() {
  const [state, setState] = useState<ExtractorState>({ companies: [], loading: false, progress: 0, total: 0, currentPage: 0, error: null });
  const [ufs, setUfs] = useState<string[]>([]);
  const [cnaes, setCnaes] = useState<CnaeItem[]>([]);
  const [municipios, setMunicipios] = useState<MunicipioItem[]>([]);
  const [loadingUfs, setLoadingUfs] = useState(true);
  const [loadingCnaes, setLoadingCnaes] = useState(true);
  const [loadingMunicipios, setLoadingMunicipios] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  useEffect(() => {
    const loadInitial = async () => {
      try {
        const [ufsRes, cnaesRes] = await Promise.all([
          supabase.functions.invoke("cnpj-extractor", { body: { action: "load-ufs" } }),
          supabase.functions.invoke("cnpj-extractor", { body: { action: "load-cnaes" } }),
        ]);
        if (ufsRes.data?.ufs) setUfs(ufsRes.data.ufs);
        else if (ufsRes.data?.error) console.error("UFs error:", ufsRes.data.error);
        if (cnaesRes.data?.cnaes) setCnaes(cnaesRes.data.cnaes);
        else if (cnaesRes.data?.error) console.error("CNAEs error:", cnaesRes.data.error);
      } catch (err) { console.error("Failed to load initial data:", err); }
      finally { setLoadingUfs(false); setLoadingCnaes(false); }
    };
    loadInitial();
  }, []);

  const loadMunicipios = useCallback(async (uf: string) => {
    if (!uf) { setMunicipios([]); return; }
    setLoadingMunicipios(true);
    try {
      const { data } = await supabase.functions.invoke("cnpj-extractor", { body: { action: "load-municipios", uf } });
      if (data?.municipios) setMunicipios(data.municipios);
    } catch (err) { console.error("Failed to load municipios:", err); }
    finally { setLoadingMunicipios(false); }
  }, []);

  const search = useCallback(async (params: {
    uf: string; municipio?: string; bairro?: string; cnae?: string; com_telefone?: boolean; somente_celular?: boolean;
    mei?: boolean; excluir_mei?: boolean; maxPages?: number;
  }) => {
    const controller = new AbortController();
    setAbortController(controller);
    setState({ companies: [], loading: true, progress: 0, total: 0, currentPage: 0, error: null });

    const maxPages = Number.isFinite(params.maxPages) ? Math.max(0, Math.floor(params.maxPages!)) : 0;
    const unlimited = maxPages === 0;
    let allCompanies: CnpjCompany[] = [];
    let page = 1;
    let hasMore = true;

    try {
      while ((unlimited || page <= maxPages) && hasMore) {
        if (controller.signal.aborted) break;

        // Process a few pages in parallel. Each Edge Function invocation
        // still limits Brasil API detail calls internally, preventing one
        // giant request from hitting the function timeout.
        const pageBatch: number[] = [];
        for (let n = 0; n < 3 && (unlimited || page + n <= maxPages); n++) {
          pageBatch.push(page + n);
        }

        const responses = await Promise.all(
          pageBatch.map(async (pageNumber) => {
            const { data, error } = await supabase.functions.invoke("cnpj-extractor", {
              body: {
                action: "search",
                uf: params.uf,
                municipio: params.municipio || "",
                bairro: params.bairro || "",
                cnae: params.cnae || "",
                com_telefone: params.com_telefone ?? true,
                somente_celular: params.somente_celular ?? false,
                mei: params.mei ?? false,
                excluir_mei: params.excluir_mei ?? false,
                page: pageNumber,
              },
            });
            if (error) throw new Error(error.message);
            if (data?.error) throw new Error(data.error);
            return {
              page: pageNumber,
              companies: (data?.companies || []) as CnpjCompany[],
              total: Number(data?.total || 0),
              hasMore: Boolean(data?.hasMore),
            };
          }),
        );

        responses.sort((a, b) => a.page - b.page);
        for (const response of responses) {
          if (controller.signal.aborted) break;
          allCompanies = [...allCompanies, ...response.companies];
          hasMore = response.hasMore;
          setState((s) => ({
            ...s,
            companies: allCompanies,
            progress: response.total > 0
              ? Math.min(99, Math.round((allCompanies.length / response.total) * 100))
              : (unlimited ? 0 : Math.min(99, Math.round((response.page / maxPages) * 100))),
            total: response.total,
            currentPage: response.page,
          }));
        }

        page += pageBatch.length;
        if (!controller.signal.aborted && hasMore) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }

      setState((s) => ({ ...s, progress: 100 }));
      toast({ title: "Extração concluída!", description: `${allCompanies.length} empresas encontradas.` });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      if (!controller.signal.aborted) {
        setState((s) => ({ ...s, error: message }));
        toast({ title: "Erro na extração", description: message, variant: "destructive" });
      }
    } finally {
      setState((s) => ({ ...s, loading: false }));
      setAbortController(null);
    }
  }, []);

  const cancel = useCallback(() => {
    abortController?.abort();
    setState((s) => ({ ...s, loading: false }));
    toast({ title: "Extração cancelada" });
  }, [abortController]);

  const exportCsv = useCallback(() => {
    if (state.companies.length === 0) return;
    const headers = ["CNPJ", "Razão Social", "Nome Fantasia", "Situação", "Data Abertura", "CNAE", "Código CNAE", "Logradouro", "Número", "Bairro", "Município", "UF", "CEP", "Telefone 1", "Telefone 2", "Email", "Capital Social", "Porte", "Natureza Jurídica", "Sócios"];
    const rows = state.companies.map((c) => [c.cnpj, c.razao_social, c.nome_fantasia, c.situacao_cadastral, c.data_abertura, c.cnae_principal, c.cnae_codigo, c.logradouro, c.numero, c.bairro, c.municipio, c.uf, c.cep, c.telefone1, c.telefone2, c.email, c.capital_social, c.porte, c.natureza_juridica, c.socios]);
    const csv = [headers, ...rows].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `cnpj_extrator_${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
    toast({ title: "CSV exportado!", description: `${state.companies.length} registros.` });
  }, [state.companies]);

  return { ...state, ufs, cnaes, municipios, loadingUfs, loadingCnaes, loadingMunicipios, loadMunicipios, search, cancel, exportCsv };
}
