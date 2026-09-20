import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = claims.claims.sub;
    const { data: settings } = await supabase.from("user_settings").select("apify_api_key").eq("user_id", userId).maybeSingle();
    const APIFY_API_TOKEN = settings?.apify_api_key;

    if (!APIFY_API_TOKEN) {
      return new Response(JSON.stringify({ error: "Configure sua chave da API Apify nas configurações (⚙️)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const {
      estado, cidade, bairro, cep, palavraChave,
      maxResults = 0,
      notaMinima,
      apenasComTelefone = true,
      apenasSemSite = false,
    } = await req.json();

    if (!palavraChave) {
      return new Response(JSON.stringify({ error: "Palavra-chave é obrigatória" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!cidade && !estado && !bairro && !cep) {
      return new Response(JSON.stringify({ error: "Informe pelo menos uma localização (estado, cidade, bairro ou CEP)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const locationParts: string[] = [];
    if (bairro) locationParts.push(bairro);
    if (cidade) locationParts.push(cidade);
    if (estado) locationParts.push(estado);
    if (cep) locationParts.push(cep);

    const searchQuery = `${palavraChave} em ${locationParts.join(", ")}`;
    console.log("Searching:", searchQuery, "maxResults:", maxResults);

    const actorInput: Record<string, unknown> = {
      searchStringsArray: [searchQuery],
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
        facebooks: false,
        instagrams: false,
        youtubes: false,
        tiktoks: false,
        twitters: false,
      },
      maximumLeadsEnrichmentRecords: 0,
      maxReviews: 0,
      reviewsSort: "newest",
      reviewsFilterString: "",
      reviewsOrigin: "all",
      scrapeReviewsPersonalData: true,
      scrapeImageAuthors: false,
      allPlacesNoSearchAction: "",
    };

    // Apify supports an omitted maxCrawledPlacesPerSearch to keep scraping
    // until the available results are exhausted. Positive values allow
    // explicit targets such as 1k, 5k and 10k.
    const requestedMax = Number(maxResults);
    if (Number.isFinite(requestedMax) && requestedMax > 0) {
      actorInput.maxCrawledPlacesPerSearch = Math.min(requestedMax, 10000);
    }

    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/compass~crawler-google-places/run-sync-get-dataset-items?token=${APIFY_API_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(actorInput),
      }
    );

    if (!runResponse.ok) {
      const errorText = await runResponse.text();
      throw new Error(`Apify error [${runResponse.status}]: ${errorText}`);
    }

    const rawData = await runResponse.json();
    const places = Array.isArray(rawData) ? rawData : [];

    const filtered = places.filter((item: Record<string, unknown>) => {
      const phone = (item.phone as string) || "";
      if (apenasComTelefone && phone.trim().length === 0) return false;
      if (notaMinima) {
        const score = (item.totalScore as number) || 0;
        if (score < Number(notaMinima)) return false;
      }
      return true;
    });

    console.log(`Found ${places.length} places, ${filtered.length} after filters`);

    const leads = filtered.map((item: Record<string, unknown>) => {
      const reviews = (item.totalScore as number) || 0;
      const reviewsCount = (item.reviewsCount as number) || 0;
      const website = (item.website as string) || "";
      const hasSite = !!website;
      const categoryName = (item.categoryName as string) || "";

      return {
        nome: (item.title as string) || "",
        email: (item.email as string) || (website ? `contato@${safeDomain(website)}` : ""),
        telefone: (item.phone as string) || "",
        site: website,
        endereco: (item.address as string) || "",
        nicho: categoryName,
        nota: reviews,
        instagram: "",
        instagram_username: "",
        facebook: "",
        avaliacoes: reviewsCount,
        tem_site_proprio: hasSite,
        potencial_trafego: hasSite ? "Verificar" : "Sem site",
        pain_score: calcPain(reviews, reviewsCount, hasSite),
        pico_funcionamento: formatHours(item.openingHours),
        ticket_medio: (item.priceLevel as string) || "N/A",
        opportunity_score: calcOpp(reviews, reviewsCount, hasSite, categoryName),
      };
    });

    const finalLeads = apenasSemSite ? leads.filter((l: Record<string, unknown>) => !l.tem_site_proprio) : leads;

    return new Response(JSON.stringify({
      success: true,
      data: finalLeads,
      count: finalLeads.length,
      requested: requestedMax > 0 ? Math.min(requestedMax, 10000) : null,
      unlimited: !(requestedMax > 0),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    console.error("Scraper error:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ success: false, error: message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

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
    const h = hours.find((h: Record<string, string>) => h.day?.toLowerCase().includes(today.toLowerCase()));
    return h ? h.hours || "N/A" : "N/A";
  } catch { return "N/A"; }
}
