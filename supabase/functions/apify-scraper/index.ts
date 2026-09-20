import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

async function getUserAndClient(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Não autorizado");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Usuário não autenticado");

  const { data: settings, error: settingsError } = await supabase
    .from("user_settings")
    .select("apify_api_key")
    .eq("user_id", user.id)
    .maybeSingle();

  if (settingsError) throw new Error("Não foi possível carregar a configuração da Apify");
  if (!settings?.apify_api_key) {
    throw new Error("Configure sua chave da API Apify nas configurações (⚙️)");
  }

  return { supabase, token: settings.apify_api_key as string };
}

function buildActorInput(body: Record<string, unknown>) {
  const {
    estado, cidade, bairro, cep, palavraChave,
    maxResults = 0,
  } = body;

  if (!palavraChave) throw new Error("Palavra-chave é obrigatória");
  if (!cidade && !estado && !bairro && !cep) {
    throw new Error("Informe pelo menos uma localização (estado, cidade, bairro ou CEP)");
  }

  const locationParts = [bairro, cidade, estado, cep].filter(Boolean).map(String);
  const searchQuery = String(palavraChave);
  const requestedMax = Number(maxResults);

  const actorInput: Record<string, unknown> = {
    searchStringsArray: [searchQuery],
    locationQuery: locationParts.join(", "),
    language: "pt-BR",
    includeWebResults: false,
    searchMatching: "all",
    placeMinimumStars: "",
    website: "allPlaces",
    skipClosedPlaces: false,
    scrapePlaceDetailPage: false,
    scrapeTableReservationProvider: false,
    scrapeDirectories: false,
    maxQuestions: 0,
    scrapeContacts: false,
    scrapeSocialMediaProfiles: {
      facebooks: false, instagrams: false, youtubes: false,
      tiktoks: false, twitters: false,
    },
    maximumLeadsEnrichmentRecords: 0,
    maxReviews: 0,
    reviewsSort: "newest",
    reviewsFilterString: "",
    reviewsOrigin: "all",
    scrapeReviewsPersonalData: true,
    scrapeImageAuthors: false,
  };

  // The actor documents this field as "per search term". Omit it for
  // unlimited mode so the actor can exhaust the available search results.
  if (Number.isFinite(requestedMax) && requestedMax > 0) {
    actorInput.maxCrawledPlacesPerSearch = Math.min(Math.floor(requestedMax), 10000);
  }

  return { actorInput, requestedMax };
}

async function startRun(token: string, actorInput: Record<string, unknown>) {
  const r = await fetch(
    `https://api.apify.com/v2/acts/compass~crawler-google-places/runs?token=${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(actorInput),
      signal: AbortSignal.timeout(30000),
    },
  );
  const text = await r.text();
  if (!r.ok) throw new Error(`Apify não iniciou a mineração [${r.status}]: ${text}`);
  const data = JSON.parse(text);
  return data.data || data;
}

async function getRun(token: string, runId: string) {
  const r = await fetch(
    `https://api.apify.com/v2/actor-runs/${encodeURIComponent(runId)}?token=${encodeURIComponent(token)}`,
    { signal: AbortSignal.timeout(15000) },
  );
  const text = await r.text();
  if (!r.ok) throw new Error(`Erro ao consultar mineração [${r.status}]: ${text}`);
  return JSON.parse(text).data;
}

async function getDatasetItems(token: string, datasetId: string, limit: number) {
  const url =
    `https://api.apify.com/v2/datasets/${encodeURIComponent(datasetId)}/items` +
    `?token=${encodeURIComponent(token)}&format=json&clean=true&offset=0&limit=${Math.min(Math.max(limit, 1), 10000)}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
  const text = await r.text();
  if (!r.ok) throw new Error(`Erro ao ler resultados da Apify [${r.status}]: ${text}`);
  const data = JSON.parse(text);
  return Array.isArray(data) ? data : [];
}

function safeDomain(url: string): string {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return ""; }
}

function calcPain(nota: number, av: number, hasSite: boolean): number {
  let s = 0;
  if (!hasSite) s += 30;
  if (nota < 4) s += 25;
  if (nota < 3) s += 15;
  if (av < 10) s += 20;
  if (av < 50) s += 10;
  return Math.min(s, 100);
}

function calcOpp(nota: number, av: number, hasSite: boolean, nicho: string): number {
  let s = 50;
  if (!hasSite) s += 20;
  if (nota >= 4) s += 10;
  if (av > 20) s += 10;
  if (nicho) s += 10;
  return Math.min(s, 100);
}

function formatHours(hours: unknown): string {
  if (!hours || !Array.isArray(hours)) return "N/A";
  try {
    const today = new Date().toLocaleDateString("pt-BR", { weekday: "long" });
    const h = hours.find((item: Record<string, string>) =>
      item.day?.toLowerCase().includes(today.toLowerCase())
    );
    return h ? h.hours || "N/A" : "N/A";
  } catch { return "N/A"; }
}

function transform(raw: Record<string, unknown>[], body: Record<string, unknown>) {
  const apenasComTelefone = body.apenasComTelefone !== false;
  const apenasSemSite = body.apenasSemSite === true;
  const notaMinima = body.notaMinima ? Number(body.notaMinima) : 0;

  const filtered = raw.filter((item) => {
    const phone = String(item.phone || "");
    if (apenasComTelefone && !phone.trim()) return false;
    if (notaMinima && Number(item.totalScore || 0) < notaMinima) return false;
    return true;
  });

  const leads = filtered.map((item) => {
    const nota = Number(item.totalScore || 0);
    const avaliacoes = Number(item.reviewsCount || 0);
    const site = String(item.website || "");
    const temSite = Boolean(site);
    const nicho = String(item.categoryName || "");

    return {
      nome: String(item.title || ""),
      email: String(item.email || (site ? `contato@${safeDomain(site)}` : "")),
      telefone: String(item.phone || ""),
      site,
      endereco: String(item.address || ""),
      nicho,
      nota,
      instagram: "",
      instagram_username: "",
      facebook: "",
      avaliacoes,
      tem_site_proprio: temSite,
      potencial_trafego: temSite ? "Verificar" : "Sem site",
      pain_score: calcPain(nota, avaliacoes, temSite),
      pico_funcionamento: formatHours(item.openingHours),
      ticket_medio: String(item.priceLevel || "N/A"),
      opportunity_score: calcOpp(nota, avaliacoes, temSite, nicho),
    };
  });

  return apenasSemSite ? leads.filter((lead) => !lead.tem_site_proprio) : leads;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { token } = await getUserAndClient(req);
    const body = await req.json();
    const action = body.action || "start";

    if (action === "start") {
      const { actorInput, requestedMax } = buildActorInput(body);
      const run = await startRun(token, actorInput);

      return json({
        success: true,
        status: run.status || "READY",
        runId: run.id,
        datasetId: run.defaultDatasetId,
        requested: requestedMax > 0 ? Math.min(Math.floor(requestedMax), 10000) : null,
        unlimited: !(requestedMax > 0),
      });
    }

    if (action === "status") {
      const runId = String(body.runId || "");
      if (!runId) throw new Error("runId é obrigatório");

      const run = await getRun(token, runId);
      const status = String(run.status || "UNKNOWN");

      if (status !== "SUCCEEDED") {
        return json({
          success: true,
          status,
          runId,
          progress: Number(run.stats?.runTimeSecs || 0),
          error: status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT"
            ? (run.statusMessage || "A mineração foi encerrada sem sucesso.")
            : undefined,
        });
      }

      const requestedMax = Number(body.maxResults || 0);
      const items = await getDatasetItems(token, String(run.defaultDatasetId), requestedMax > 0 ? requestedMax : 10000);
      const leads = transform(items as Record<string, unknown>[], body);

      return json({
        success: true,
        status,
        runId,
        data: leads,
        count: leads.length,
        requested: requestedMax > 0 ? Math.min(Math.floor(requestedMax), 10000) : null,
        unlimited: !(requestedMax > 0),
      });
    }

    throw new Error("Ação inválida");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Scraper error:", error);
    return json({ success: false, error: message }, message === "Não autorizado" || message === "Usuário não autenticado" ? 401 : 500);
  }
});
