import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Find pending dispatches that are due
    const { data: dispatches, error: fetchErr } = await supabase
      .from("scheduled_dispatches")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .limit(10);

    if (fetchErr) throw fetchErr;
    if (!dispatches || dispatches.length === 0) {
      return new Response(JSON.stringify({ message: "No pending dispatches" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];

    for (const dispatch of dispatches) {
      // Mark as processing, reset sent_count
      await supabase.from("scheduled_dispatches").update({ 
        status: "processing",
        sent_count: dispatch.sent_count || 0,
      }).eq("id", dispatch.id);

      // Get user's Evolution API settings
      const { data: settings } = await supabase
        .from("user_settings")
        .select("evolution_api_url, evolution_api_key")
        .eq("user_id", dispatch.user_id)
        .maybeSingle();

      if (!settings?.evolution_api_url || !settings?.evolution_api_key) {
        await supabase.from("scheduled_dispatches").update({
          status: "error",
          results: { error: "Evolution API não configurada" },
          processed_at: new Date().toISOString(),
        }).eq("id", dispatch.id);
        continue;
      }

      const baseUrl = settings.evolution_api_url.replace(/\/+$/, "");
      const apiKey = settings.evolution_api_key;
      const contacts = dispatch.contacts as { nome: string; telefone: string; nicho?: string }[];

      let successCount = 0;
      let errorCount = 0;
      const startFrom = dispatch.sent_count || 0;

      for (let i = startFrom; i < contacts.length; i++) {
        // Check if dispatch was paused or cancelled
        const { data: currentState } = await supabase
          .from("scheduled_dispatches")
          .select("status")
          .eq("id", dispatch.id)
          .single();

        if (currentState?.status === "paused" || currentState?.status === "cancelled") {
          break;
        }

        const contact = contacts[i];
        const number = contact.telefone.replace(/\D/g, "");

        let message = dispatch.message_text
          .replace(/\{nome\}/gi, contact.nome)
          .replace(/\{nicho\}/gi, contact.nicho || "");

        // Add random emoji variation
        if (dispatch.variation_enabled && dispatch.variation_emojis) {
          const emojis = dispatch.variation_emojis.split(/[,\s]+/).filter(Boolean);
          if (emojis.length > 0) {
            message = `${message} ${emojis[Math.floor(Math.random() * emojis.length)]}`;
          }
        }

        try {
          if (dispatch.dispatch_type === "media" && dispatch.media_url) {
            const ext = dispatch.media_url.split(".").pop()?.toLowerCase() || "";
            let mediatype = "image";
            if (["mp4", "avi", "mov"].includes(ext)) mediatype = "video";
            else if (["mp3", "ogg", "wav"].includes(ext)) mediatype = "audio";
            else if (["pdf", "doc", "docx"].includes(ext)) mediatype = "document";

            await fetch(`${baseUrl}/message/sendMedia/${dispatch.instance_name}`, {
              method: "POST",
              headers: { "Content-Type": "application/json", apikey: apiKey },
              body: JSON.stringify({
                number,
                mediatype,
                media: dispatch.media_url,
                caption: message,
                fileName: `media.${ext}`,
              }),
            });
          } else {
            await fetch(`${baseUrl}/message/sendText/${dispatch.instance_name}`, {
              method: "POST",
              headers: { "Content-Type": "application/json", apikey: apiKey },
              body: JSON.stringify({ number, text: message }),
            });
          }
          successCount++;
        } catch {
          errorCount++;
        }

        // Update progress in DB after each message
        await supabase.from("scheduled_dispatches").update({
          sent_count: i + 1,
        }).eq("id", dispatch.id);

        // Delay between messages
        if (i + 1 < contacts.length) {
          const delay = Math.random() * (dispatch.max_delay - dispatch.min_delay) + dispatch.min_delay;
          await new Promise((r) => setTimeout(r, delay * 1000));

          // Batch pause
          if ((i + 1) % dispatch.batch_size === 0) {
            await new Promise((r) => setTimeout(r, dispatch.batch_pause * 1000));
          }
        }
      }

      // Check final status
      const { data: finalState } = await supabase
        .from("scheduled_dispatches")
        .select("status")
        .eq("id", dispatch.id)
        .single();

      if (finalState?.status === "cancelled") {
        // Already cancelled, don't override
      } else if (finalState?.status === "paused") {
        // Keep paused, will resume later
      } else {
        await supabase.from("scheduled_dispatches").update({
          status: "completed",
          results: { success: successCount, errors: errorCount, total: contacts.length },
          processed_at: new Date().toISOString(),
        }).eq("id", dispatch.id);
      }

      results.push({ id: dispatch.id, success: successCount, errors: errorCount });
    }

    return new Response(JSON.stringify({ processed: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Process scheduled dispatches error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
