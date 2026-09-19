import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useUserRole = () => {
  const { session } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      if (!session?.user?.id) {
        setRole(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle();

      setRole(data?.role ?? "user");
      setLoading(false);
    };

    fetchRole();
  }, [session?.user?.id]);

  return { role, isAdmin: role === "admin", loading };
};
