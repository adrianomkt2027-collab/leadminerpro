import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
];

function getHeaders() {
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  return {
    "User-Agent": ua,
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "Origin": "https://casadosdados.com.br",
    "Referer": "https://casadosdados.com.br/solucao/cnpj/pesquisa-avancada",
    "Content-Type": "application/json",
    "Sec-Ch-Ua": '"Google Chrome";v="119", "Chromium";v="119", "Not?A_Brand";v="24"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-site",
  };
}

const API_BASE = "https://api.casadosdados.com.br";
const BRASIL_API = "https://brasilapi.com.br/api/cnpj/v1";

async function fetchBrasilApiDetail(cnpj: string): Promise<Record<string, unknown> | null> {
  try {
    const r = await fetch(`${BRASIL_API}/${cnpj}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (r.ok) {
      return await r.json();
    }
    if (r.status === 429) {
      console.log(`Brasil API rate limited for ${cnpj}`);
    }
    return null;
  } catch {
    return null;
  }
}

function parseBrasilApiDetail(detail: Record<string, unknown>, cnpjNum: string) {
  // Phone extraction - Brasil API uses ddd_telefone_1, ddd_telefone_2
  const phones: string[] = [];
  const ddd1 = String(detail.ddd_telefone_1 || "").replace(/\D/g, "");
  const ddd2 = String(detail.ddd_telefone_2 || "").replace(/\D/g, "");
  if (ddd1.length >= 10) phones.push(ddd1.startsWith("55") ? ddd1 : "55" + ddd1);
  if (ddd2.length >= 10) phones.push(ddd2.startsWith("55") ? ddd2 : "55" + ddd2);

  // Socios
  const qsa = (detail.qsa || []) as Array<Record<string, string>>;
  const socioNames = Array.isArray(qsa)
    ? qsa.filter(s => s?.nome_socio).map(s => {
        const qual = s.qualificacao_socio || "";
        return qual ? `${s.nome_socio} - ${qual}` : s.nome_socio;
      })
    : [];

  // CNAE principal
  const cnaeFiscalDesc = (detail.cnae_fiscal_descricao as string) || "";
  const cnaeFiscal = String(detail.cnae_fiscal || "");

  return {
    cnpj: cnpjNum,
    razao_social: (detail.razao_social as string) || "",
    nome_fantasia: (detail.nome_fantasia as string) || "",
    situacao_cadastral: (detail.descricao_situacao_cadastral as string) || "",
    data_abertura: (detail.data_inicio_atividade as string) || "",
    cnae_principal: cnaeFiscalDesc,
    cnae_codigo: cnaeFiscal,
    logradouro: (detail.logradouro as string) || "",
    numero: (detail.numero as string) || "",
    bairro: (detail.bairro as string) || "",
    municipio: (detail.municipio as string) || "",
    uf: (detail.uf as string) || "",
    cep: (detail.cep as string) || "",
    telefone1: phones[0] || "",
    telefone2: phones[1] || "",
    email: (detail.email as string) || "",
    capital_social: (detail.capital_social as number) || 0,
    porte: (detail.descricao_porte as string) || "",
    natureza_juridica: (detail.natureza_juridica as string) || "",
    socios: socioNames.join(" | "),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const body = await req.json();
    const action = body.action || "search";

    // ========== LOAD UFs ==========
    if (action === "load-ufs") {
      const r = await fetch(`${API_BASE}/v1/rf/public/cnpj/search/local`, {
        headers: getHeaders(),
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok) {
        const text = await r.text();
        return new Response(JSON.stringify({ error: `Erro ao carregar UFs: ${r.status}`, details: text }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const data = await r.json();
      const ufs = Array.isArray(data) ? data.map((u: Record<string, string>) => u.nome).filter(Boolean).sort() : [];
      return new Response(JSON.stringify({ ufs }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========== LOAD CNAEs ==========
    if (action === "load-cnaes") {
      const r = await fetch(`${API_BASE}/v4/public/cnpj/busca/cnae`, {
        headers: getHeaders(),
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok) {
        const text = await r.text();
        return new Response(JSON.stringify({ error: `Erro ao carregar CNAEs: ${r.status}`, details: text }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const data = await r.json();
      return new Response(JSON.stringify({ cnaes: data }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========== LOAD MUNICIPIOS ==========
    if (action === "load-municipios") {
      const uf = body.uf;
      if (!uf) {
        return new Response(JSON.stringify({ error: "UF é obrigatório" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const r = await fetch(`${API_BASE}/v4/public/cnpj/busca/municipio/${uf}`, {
        headers: getHeaders(),
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok) {
        const text = await r.text();
        return new Response(JSON.stringify({ error: `Erro ao carregar municípios: ${r.status}`, details: text }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const data = await r.json();
      return new Response(JSON.stringify({ municipios: data }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========== SEARCH ==========
    const {
      uf = "",
      municipio = "",
      bairro = "",
      cnae = "",
      com_telefone = true,
      somente_celular = false,
      mei = false,
      excluir_mei = false,
      page = 1,
    } = body;

    const payload = {
      cnpj: [],
      cnpj_raiz: [],
      situacao_cadastral: [],
      codigo_atividade_principal: cnae ? [cnae] : [],
      codigo_natureza_juridica: [],
      incluir_atividade_secundaria: false,
      uf: uf ? [uf] : [],
      municipio: municipio ? [municipio] : [],
      bairro: bairro ? [bairro] : [],
      cep: [],
      ddd: [],
      data_abertura: {},
      capital_social: { minimo: 0, maximo: 0 },
      mei: { optante: mei, excluir_optante: excluir_mei },
      simples: { optante: false, excluir_optante: false },
      mais_filtros: {
        somente_matriz: false,
        somente_filial: false,
        com_email: false,
        com_telefone: com_telefone,
        somente_fixo: false,
        somente_celular: somente_celular,
      },
      limite: 20,
      pagina: page,
    };

    console.log(`Searching page ${page}...`);

    const r = await fetch(`${API_BASE}/v5/public/cnpj/pesquisa`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000),
    });

    if (!r.ok) {
      const text = await r.text();
      console.error(`API error: ${r.status}`, text);
      return new Response(
        JSON.stringify({ error: `Erro na API Casa dos Dados: ${r.status}`, details: text }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await r.json();
    const cnpjs = data.cnpjs || [];
    const total = data.total || 0;

    console.log(`Found ${cnpjs.length} cnpjs, total: ${total}`);

    // Fetch Brasil API details with bounded concurrency. The previous sequential
    // implementation could take several minutes for one page and hit Edge Function
    // time limits. Five concurrent requests keeps latency bounded while avoiding
    // an aggressive burst against the public API.
    const companies: ReturnType<typeof parseBrasilApiDetail>[] = [];
    const isMobile = (d: string) => {
      if (!d) return false;
      const national = d.startsWith("55") ? d.slice(2) : d;
      return (
        (national.length === 11 && national[2] === "9") ||
        (national.length === 10 && national[2] === "9")
      );
    };

    for (let i = 0; i < cnpjs.length; i += 5) {
      const batch = cnpjs.slice(i, i + 5);
      const details = await Promise.all(
        batch.map(async (empresa) => {
          const cnpjNum = String(empresa.cnpj || "");
          if (!cnpjNum) return null;
          const detail = await fetchBrasilApiDetail(cnpjNum);
          return detail ? parseBrasilApiDetail(detail, cnpjNum) : null;
        })
      );

      for (const parsed of details) {
        if (!parsed) continue;

        if (com_telefone && !parsed.telefone1) {
          console.log(`⏭️ Sem telefone: ${parsed.razao_social.substring(0, 30)}`);
          continue;
        }

        if (somente_celular) {
          const digits1 = parsed.telefone1.replace(/\D/g, "");
          if (!isMobile(digits1)) {
            const digits2 = parsed.telefone2.replace(/\D/g, "");
            if (digits2 && isMobile(digits2)) {
              parsed.telefone1 = parsed.telefone2;
              parsed.telefone2 = digits1 ? `55${digits1}` : "";
            } else {
              console.log(`⏭️ Sem celular: ${parsed.razao_social.substring(0, 30)}`);
              continue;
            }
          }
        }

        companies.push(parsed);
        console.log(`✅ ${parsed.razao_social.substring(0, 30)} - Tel: ${parsed.telefone1 || "N/A"}`);
      }

      if (i + 5 < cnpjs.length) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }

    console.log(`Final: ${companies.length} companies, ${companies.filter(c => c.telefone1).length} with phone`);

    return new Response(
      JSON.stringify({ companies, total, page, hasMore: cnpjs.length >= 20 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("CNPJ extractor error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
