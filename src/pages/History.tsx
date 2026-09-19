import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History as HistoryIcon, Trash2, Eye, Loader2, Download, Phone, CheckCircle, XCircle, Send } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { useAuth } from "@/hooks/useAuth";

interface Mineracao {
  id: string;
  cidade: string;
  palavra_chave: string;
  total_leads: number;
  created_at: string;
}

interface LeadRow {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  site: string | null;
  endereco: string | null;
  nicho: string | null;
  nota: number | null;
  tem_site_proprio: boolean | null;
  pain_score: number | null;
  opportunity_score: number | null;
  potencial_trafego: string | null;
}

interface Instance {
  instanceName: string;
  instanceId?: string;
  status?: string;
  owner?: string;
}

type WhatsAppStatus = "pending" | "valid" | "invalid";

const History = () => {
  const { session } = useAuth();
  const [mineracoes, setMineracoes] = useState<Mineracao[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deletingLead, setDeletingLead] = useState<string | null>(null);

  // WhatsApp validation state
  const [instances, setInstances] = useState<Instance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<string>("");
  const [validating, setValidating] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<Record<string, WhatsAppStatus>>({});
  const [validationDone, setValidationDone] = useState(false);

  const callEvolutionApi = async (action: string, instanceName?: string, data?: Record<string, unknown>) => {
    const { data: result, error } = await supabase.functions.invoke("evolution-api", {
      body: { action, instanceName, data },
    });
    if (error) throw error;
    return result;
  };

  // Fetch instances on mount
  useEffect(() => {
    const fetchInstances = async () => {
      if (!session) return;
      const { data, error } = await supabase
        .from("saved_instances")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) {
        setInstances(data.filter((i) => i.instance_name).map((i) => ({
          instanceName: i.instance_name,
          status: i.status || "unknown",
        })));
      }
    };
    fetchInstances();
  }, [session]);

  const deleteLead = async (leadId: string) => {
    setDeletingLead(leadId);
    const { error } = await supabase.from("leads").delete().eq("id", leadId);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
      toast({ title: "Removido", description: "Lead removido com sucesso." });
    }
    setDeletingLead(null);
  };

  const fetchHistory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("mineracoes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setMineracoes(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchHistory(); }, []);

  const viewLeads = async (id: string) => {
    if (selectedId === id) { setSelectedId(null); setWhatsappStatus({}); setValidationDone(false); return; }
    setSelectedId(id);
    setLoadingLeads(true);
    setWhatsappStatus({});
    setValidationDone(false);
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("mineracao_id", id)
      .order("opportunity_score", { ascending: false });

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setLeads(data || []);
    }
    setLoadingLeads(false);
  };

  const deleteMineracao = async (id: string) => {
    setDeleting(id);
    const { error: lErr } = await supabase.from("leads").delete().eq("mineracao_id", id);
    if (lErr) { toast({ title: "Erro", description: lErr.message, variant: "destructive" }); setDeleting(null); return; }

    const { error: mErr } = await supabase.from("mineracoes").delete().eq("id", id);
    if (mErr) { toast({ title: "Erro", description: mErr.message, variant: "destructive" }); setDeleting(null); return; }

    toast({ title: "Excluído", description: "Mineração removida com sucesso." });
    setMineracoes((prev) => prev.filter((m) => m.id !== id));
    if (selectedId === id) setSelectedId(null);
    setDeleting(null);
  };

  const formatPhoneForValidation = (phone: string): string => {
    let cleaned = phone.replace(/\D/g, "").replace(/^0+/, "");
    // Add Brazil country code if not present
    if (!cleaned.startsWith("55")) {
      cleaned = "55" + cleaned;
    }
    return cleaned;
  };

  const validateWhatsappNumbers = async () => {
    if (!selectedInstance) {
      toast({ title: "Selecione uma instância", description: "Escolha uma instância conectada para validar.", variant: "destructive" });
      return;
    }

    const leadsWithPhone = leads.filter((l) => l.telefone && l.telefone.trim());
    if (leadsWithPhone.length === 0) {
      toast({ title: "Sem telefones", description: "Nenhum lead com telefone para validar.", variant: "destructive" });
      return;
    }

    setValidating(true);
    setWhatsappStatus({});

    try {
      const numbers = leadsWithPhone.map((l) => formatPhoneForValidation(l.telefone!));
      
      // Process in batches of 50
      const batchSize = 50;
      const allStatuses: Record<string, WhatsAppStatus> = {};

      for (let i = 0; i < numbers.length; i += batchSize) {
        const batchNumbers = numbers.slice(i, i + batchSize);
        const batchLeads = leadsWithPhone.slice(i, i + batchSize);

        try {
          const result = await callEvolutionApi("checkWhatsappNumbers", selectedInstance, {
            numbers: batchNumbers,
          });

          console.log("WhatsApp validation response:", JSON.stringify(result));
          
          // Process results - Evolution API returns array with exists/number fields
          const resultArray = Array.isArray(result) ? result : [];
          
          batchLeads.forEach((lead, idx) => {
            const cleanPhone = formatPhoneForValidation(lead.telefone!);
            
            // Try matching by number or jid
            const match = resultArray.find(
              (r: Record<string, unknown>) => {
                const jid = String(r.jid || "").replace(/\D/g, "");
                const num = String(r.number || "").replace(/\D/g, "");
                return jid.includes(cleanPhone) || cleanPhone.includes(jid) ||
                       num.includes(cleanPhone) || cleanPhone.includes(num) ||
                       jid.includes(cleanPhone.replace(/^55/, "")) ||
                       num === cleanPhone;
              }
            );
            
            if (match) {
              allStatuses[lead.id] = match.exists ? "valid" : "invalid";
            } else if (resultArray[idx]) {
              // Fallback: match by index position
              allStatuses[lead.id] = resultArray[idx].exists ? "valid" : "invalid";
            } else {
              allStatuses[lead.id] = "invalid";
            }
          });
        } catch (err) {
          console.error("Batch validation error:", err);
          batchLeads.forEach((lead) => {
            allStatuses[lead.id] = "invalid";
          });
        }
      }

      // Mark leads without phone as invalid
      leads.forEach((l) => {
        if (!l.telefone || !l.telefone.trim()) {
          allStatuses[l.id] = "invalid";
        }
      });

      setWhatsappStatus(allStatuses);
      setValidationDone(true);

      const validCount = Object.values(allStatuses).filter((s) => s === "valid").length;
      const invalidCount = Object.values(allStatuses).filter((s) => s === "invalid").length;

      toast({
        title: "Validação concluída",
        description: `${validCount} válidos, ${invalidCount} inválidos de ${leads.length} leads.`,
      });
    } catch (err) {
      console.error("Validation error:", err);
      toast({ title: "Erro na validação", description: "Não foi possível validar os números. Verifique a instância.", variant: "destructive" });
    }

    setValidating(false);
  };

  const removeInvalidLeads = () => {
    const validLeads = leads.filter((l) => whatsappStatus[l.id] === "valid");
    setLeads(validLeads);
    
    // Clean up status for removed leads
    const newStatus: Record<string, WhatsAppStatus> = {};
    validLeads.forEach((l) => { newStatus[l.id] = "valid"; });
    setWhatsappStatus(newStatus);
    
    toast({ title: "Lista limpa", description: `${validLeads.length} leads válidos mantidos. Lista pronta para disparo.` });
  };

  const exportLeads = async (mineracaoId: string, format: "csv" | "json", mineracao: Mineracao) => {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("mineracao_id", mineracaoId);

    if (error || !data?.length) {
      toast({ title: "Erro", description: error?.message || "Nenhum lead para exportar.", variant: "destructive" });
      return;
    }

    const filename = `${mineracao.palavra_chave}_${mineracao.cidade}`.replace(/\s+/g, "_");

    if (format === "json") {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      downloadBlob(blob, `${filename}.json`);
    } else {
      const headers = ["nome", "telefone", "email", "site", "endereco", "nicho", "nota", "pain_score", "opportunity_score"];
      const csvRows = [headers.join(",")];
      data.forEach((row: Record<string, unknown>) => {
        csvRows.push(headers.map(h => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(","));
      });
      const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      downloadBlob(blob, `${filename}.csv`);
    }

    toast({ title: "Exportado!", description: `Arquivo ${format.toUpperCase()} baixado com sucesso.` });
  };

  const downloadBlob = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const validCount = Object.values(whatsappStatus).filter((s) => s === "valid").length;
  const invalidCount = Object.values(whatsappStatus).filter((s) => s === "invalid").length;

  return (
    <div className="bg-background">
      <motion.main
        className="mx-auto max-w-6xl px-6 py-8 space-y-8"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={staggerItem} className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <HistoryIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Histórico</h1>
            <p className="text-sm text-muted-foreground">Minerações salvas e leads extraídos</p>
          </div>
        </motion.div>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : mineracoes.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              Nenhuma mineração salva ainda. Faça uma busca e salve os resultados.
            </CardContent>
          </Card>
        ) : (
          mineracoes.map((m) => (
            <Card key={m.id} className={selectedId === m.id ? "border-primary" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <HistoryIcon className="h-4 w-4 text-primary" />
                      {m.palavra_chave} — {m.cidade}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">{m.total_leads} leads</Badge>
                      <span>{new Date(m.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => viewLeads(m.id)}>
                      <Eye className="h-3 w-3" /> {selectedId === m.id ? "Ocultar" : "Ver leads"}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Download className="h-3 w-3" /> Exportar
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => exportLeads(m.id, "csv", m)}>
                          Exportar CSV
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => exportLeads(m.id, "json", m)}>
                          Exportar JSON
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button size="sm" variant="destructive" disabled={deleting === m.id} onClick={() => deleteMineracao(m.id)}>
                      {deleting === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      Excluir
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {selectedId === m.id && (
                <CardContent className="space-y-4">
                  {/* WhatsApp Validation Bar */}
                  {leads.length > 0 && (
                    <div className="flex items-center gap-3 flex-wrap rounded-lg border border-border bg-muted/30 p-3">
                      <Phone className="h-4 w-4 text-primary shrink-0" />
                      <Select value={selectedInstance} onValueChange={setSelectedInstance}>
                        <SelectTrigger className="w-[200px] h-8 text-xs">
                          <SelectValue placeholder="Selecione instância" />
                        </SelectTrigger>
                        <SelectContent>
                          {instances.filter((inst) => inst.instanceName).map((inst) => (
                            <SelectItem key={inst.instanceName} value={inst.instanceName}>
                              {inst.instanceName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={validateWhatsappNumbers}
                        disabled={validating || !selectedInstance}
                      >
                        {validating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Phone className="h-3 w-3" />}
                        {validating ? "Validando..." : "Validar WhatsApp"}
                      </Button>

                      {validationDone && (
                        <>
                          <div className="flex items-center gap-2 text-xs">
                            <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
                              <CheckCircle className="h-3 w-3 mr-1" /> {validCount} válidos
                            </Badge>
                            <Badge variant="secondary" className="bg-red-500/10 text-red-600 border-red-500/20">
                              <XCircle className="h-3 w-3 mr-1" /> {invalidCount} inválidos
                            </Badge>
                          </div>
                          {invalidCount > 0 && (
                            <Button size="sm" variant="destructive" onClick={removeInvalidLeads}>
                              <Trash2 className="h-3 w-3" /> Remover inválidos
                            </Button>
                          )}
                          {validCount > 0 && invalidCount === 0 && (
                            <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
                              <Send className="h-3 w-3 mr-1" /> Lista pronta para disparo!
                            </Badge>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {loadingLeads ? (
                    <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                  ) : leads.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum lead encontrado.</p>
                  ) : (
                    <div className="overflow-auto rounded-lg border border-border max-h-[500px]">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 z-10">
                          <tr className="border-b bg-muted">
                             <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Nome</th>
                             <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Telefone</th>
                             {validationDone && <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">WhatsApp</th>}
                             <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Email</th>
                             <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Nicho</th>
                             <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Nota</th>
                             <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Pain</th>
                             <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Oportunidade</th>
                             <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">Ações</th>
                           </tr>
                        </thead>
                        <tbody>
                          {leads.map((l) => (
                             <tr key={l.id} className={`border-b last:border-0 hover:bg-muted/50 transition-colors ${whatsappStatus[l.id] === "invalid" ? "opacity-50 bg-red-500/5" : ""}`}>
                               <td className="px-3 py-2 whitespace-nowrap">{l.nome}</td>
                               <td className="px-3 py-2 whitespace-nowrap">{l.telefone || "—"}</td>
                               {validationDone && (
                                 <td className="px-3 py-2 text-center">
                                   {whatsappStatus[l.id] === "valid" ? (
                                     <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                                   ) : whatsappStatus[l.id] === "invalid" ? (
                                     <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                                   ) : (
                                     <span className="text-muted-foreground">—</span>
                                   )}
                                 </td>
                               )}
                               <td className="px-3 py-2 whitespace-nowrap">{l.email || "—"}</td>
                               <td className="px-3 py-2 whitespace-nowrap">{l.nicho || "—"}</td>
                               <td className="px-3 py-2 whitespace-nowrap">⭐ {l.nota ?? 0}</td>
                               <td className="px-3 py-2 whitespace-nowrap"><Badge variant={l.pain_score && l.pain_score >= 70 ? "destructive" : "secondary"}>{l.pain_score ?? 0}</Badge></td>
                               <td className="px-3 py-2 whitespace-nowrap"><Badge variant={l.opportunity_score && l.opportunity_score >= 70 ? "destructive" : "secondary"}>{l.opportunity_score ?? 0}</Badge></td>
                               <td className="px-3 py-2 text-center">
                                 <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteLead(l.id)} disabled={deletingLead === l.id}>
                                   {deletingLead === l.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                 </Button>
                               </td>
                             </tr>
                           ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))
        )}
      </motion.main>
    </div>
  );
};

export default History;
