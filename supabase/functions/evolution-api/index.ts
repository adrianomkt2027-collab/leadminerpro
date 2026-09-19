import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's Evolution API settings
    const { data: settings } = await supabase
      .from("user_settings")
      .select("evolution_api_url, evolution_api_key")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!settings?.evolution_api_url || !settings?.evolution_api_key) {
      return new Response(
        JSON.stringify({ error: "Configure a URL e API Key da Evolution API nas configurações." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseUrl = settings.evolution_api_url.replace(/\/+$/, "");
    const apiKey = settings.evolution_api_key;

    const { action, instanceName, data } = await req.json();

    let endpoint = "";
    let method = "GET";
    let body: string | undefined;

    switch (action) {
      case "fetchInstances":
        endpoint = `/instance/fetchInstances`;
        break;
      case "createInstance":
        endpoint = `/instance/create`;
        method = "POST";
        body = JSON.stringify({
          instanceName: data?.instanceName || "default",
          integration: "WHATSAPP-BAILEYS",
          qrcode: true,
        });
        break;
      case "connectionState":
        endpoint = `/instance/connectionState/${instanceName}`;
        break;
      case "getQrcode":
        endpoint = `/instance/connect/${instanceName}`;
        break;
      case "logout":
        endpoint = `/instance/logout/${instanceName}`;
        method = "DELETE";
        break;
      case "deleteInstance":
        endpoint = `/instance/delete/${instanceName}`;
        method = "DELETE";
        break;
      case "sendText": {
        endpoint = `/message/sendText/${instanceName}`;
        method = "POST";
        let sendNumber = (data?.number || "").replace(/\D/g, "").replace(/^0+/, "");
        if (!sendNumber.startsWith("55")) sendNumber = "55" + sendNumber;
        body = JSON.stringify({
          number: sendNumber,
          text: data?.text,
        });
        break;
      }
      case "sendMedia": {
        endpoint = `/message/sendMedia/${instanceName}`;
        method = "POST";
        let mediaNumber = (data?.number || "").replace(/\D/g, "").replace(/^0+/, "");
        if (!mediaNumber.startsWith("55")) mediaNumber = "55" + mediaNumber;
        body = JSON.stringify({
          number: mediaNumber,
          mediatype: data?.mediatype || "image",
          media: data?.media,
          caption: data?.caption || "",
          fileName: data?.fileName || "",
        });
        break;
      }
      case "fetchContacts":
        endpoint = `/chat/findContacts/${instanceName}`;
        method = "POST";
        body = JSON.stringify({ where: {} });
        break;
      case "fetchGroups":
        endpoint = `/group/fetchAllGroups/${instanceName}?getParticipants=false`;
        break;
      case "groupParticipants":
        endpoint = `/group/participants/${instanceName}?groupJid=${data?.groupJid}`;
        break;
      case "checkWhatsappNumbers":
        endpoint = `/chat/whatsappNumbers/${instanceName}`;
        method = "POST";
        body = JSON.stringify({
          numbers: data?.numbers || [],
        });
        break;
      default:
        return new Response(JSON.stringify({ error: `Ação desconhecida: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      ...(body ? { body } : {}),
    });

    const result = await response.json();
    console.log(`[${action}] Response:`, JSON.stringify(result).substring(0, 500));
    return new Response(JSON.stringify(result), {
      status: response.ok ? 200 : response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Evolution API proxy error:", err);
    const msg = err instanceof Error ? err.message : "Erro interno";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
