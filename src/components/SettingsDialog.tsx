import { useState, useEffect } from "react";
import { Settings, Eye, EyeOff, Loader2, Trash2, Save } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const SettingsDialog = ({ collapsed }: { collapsed?: boolean }) => {
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasKey, setHasKey] = useState(false);

  const loadSettings = async () => {
    const { data } = await supabase
      .from("user_settings")
      .select("apify_api_key")
      .maybeSingle();

    if (data?.apify_api_key) {
      setApiKey(data.apify_api_key);
      setHasKey(true);
    } else {
      setApiKey("");
      setHasKey(false);
    }
  };

  useEffect(() => {
    if (open) loadSettings();
  }, [open]);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast({ title: "Erro", description: "Informe a chave da API", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      if (hasKey) {
        const { error } = await supabase
          .from("user_settings")
          .update({ apify_api_key: apiKey.trim(), updated_at: new Date().toISOString() })
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_settings")
          .insert({ user_id: user.id, apify_api_key: apiKey.trim() });
        if (error) throw error;
      }

      setHasKey(true);
      toast({ title: "Salvo!", description: "Chave da API salva com sucesso." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase
        .from("user_settings")
        .delete()
        .eq("user_id", user.id);
      if (error) throw error;

      setApiKey("");
      setHasKey(false);
      toast({ title: "Removida!", description: "Chave da API foi removida." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao remover";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-accent hover:text-accent-foreground w-full text-left">
          <Settings className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Configurações</span>}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurações</DialogTitle>
          <DialogDescription>Gerencie sua chave de API da Apify</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="apify-key">Apify API Token</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="apify-key"
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="apify_api_..."
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Encontre sua chave em{" "}
              <button onClick={() => { navigator.clipboard.writeText("https://console.apify.com/account/integrations"); toast({ title: "Link copiado!" }); }} className="text-primary hover:underline bg-transparent border-none cursor-pointer p-0 text-xs">
                console.apify.com
              </button>
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={loading} className="flex-1">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {hasKey ? "Atualizar" : "Salvar"}
            </Button>
            {hasKey && (
              <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
