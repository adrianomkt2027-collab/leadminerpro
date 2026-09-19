import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email e senha são obrigatórios." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check if signups are enabled
    const { data: setting } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "signup_enabled")
      .single();

    if (setting?.value !== "true") {
      return new Response(JSON.stringify({ error: "Novos cadastros estão desabilitados no momento." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user via admin API
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      let friendlyMessage = "Erro ao criar conta. Tente novamente.";
      if (error.message.includes("already been registered")) {
        friendlyMessage = "Este email já está em uso. Tente fazer login.";
      } else if (error.message.includes("password")) {
        friendlyMessage = "A senha deve ter no mínimo 6 caracteres.";
      } else if (error.message.includes("email")) {
        friendlyMessage = "Por favor, insira um email válido.";
      }
      return new Response(JSON.stringify({ error: friendlyMessage }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if this is the first user — assign admin role
    const { count } = await supabase
      .from("user_roles")
      .select("*", { count: "exact", head: true });

    const assignedRole = (count === 0) ? "admin" : "user";

    await supabase.from("user_roles").insert({
      user_id: data.user.id,
      role: assignedRole,
    });

    return new Response(JSON.stringify({ user: data.user, role: assignedRole }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
