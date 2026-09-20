import { useApifyScraper } from "@/hooks/useApifyScraper";
import { Card, CardContent } from "@/components/ui/card";
import LeadSearchForm, { type SearchFilters } from "@/components/LeadSearchForm";
import LeadResultsTable from "@/components/LeadResultsTable";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { motion } from "framer-motion";
import { fadeInUp, staggerContainer, staggerItem } from "@/lib/motion";
import { Map } from "lucide-react";

const MapsExtractor = () => {
  const { loading, results, error, runScraper } = useApifyScraper();
  const [saving, setSaving] = useState(false);
  const [searchParams, setSearchParams] = useState({ cidade: "", palavraChave: "" });

  const handleSearch = async (filters: SearchFilters) => {
    const locationLabel = [filters.bairro, filters.cidade, filters.estado].filter(Boolean).join(", ") || filters.cep;
    setSearchParams({ cidade: locationLabel, palavraChave: filters.palavraChave });
    const result = await runScraper(filters);
    if (result) {
      toast({ title: "Mineração concluída!", description: `${result.count} leads extraídos com sucesso.` });
    }
  };

  const handleSave = async () => {
    if (!results?.data?.length) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: mineracao, error: mErr } = await supabase
        .from("mineracoes")
        .insert({
          cidade: searchParams.cidade,
          palavra_chave: searchParams.palavraChave,
          total_leads: results.count,
          user_id: user.id,
        })
        .select("id")
        .single();

      if (mErr) throw mErr;

      const leadsToInsert = results.data.map((l) => ({
        mineracao_id: mineracao.id,
        user_id: user.id,
        nome: l.nome,
        email: l.email,
        telefone: l.telefone,
        site: l.site,
        endereco: l.endereco,
        nicho: l.nicho,
        nota: l.nota,
        tem_site_proprio: l.tem_site_proprio,
        potencial_trafego: l.potencial_trafego,
        pain_score: l.pain_score,
        opportunity_score: l.opportunity_score,
      }));

      const { error: lErr } = await supabase.from("leads").insert(leadsToInsert);
      if (lErr) throw lErr;

      toast({ title: "Salvo!", description: `${results.count} leads salvos no banco de dados.` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-background">
      <motion.main
        className="mx-auto max-w-6xl px-6 py-8 space-y-8"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={staggerItem} className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Map className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Maps Extrator</h1>
            <p className="text-sm text-muted-foreground">Extraia leads do Google Maps com Apify</p>
          </div>
        </motion.div>

        <motion.div variants={staggerItem}>
          <LeadSearchForm loading={loading} onSearch={handleSearch} />
        </motion.div>

        {error && (
          <motion.div variants={fadeInUp} initial="hidden" animate="visible">
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <p className="text-sm text-destructive font-medium">Erro: {error}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {results && results.data && results.data.length > 0 && (
          <motion.div variants={fadeInUp} initial="hidden" animate="visible">
            <LeadResultsTable results={results} onSave={handleSave} saving={saving} />
          </motion.div>
        )}

        {results && results.data && results.data.length === 0 && (
          <motion.div variants={fadeInUp} initial="hidden" animate="visible">
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                Nenhum lead encontrado para essa busca. Tente outra cidade ou palavra-chave.
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.main>
    </div>
  );
};

export default MapsExtractor;
