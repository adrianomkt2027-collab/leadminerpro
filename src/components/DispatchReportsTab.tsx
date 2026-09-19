import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, Clock, Pause, BarChart3, TrendingUp, Send, AlertTriangle, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem, fadeInUp } from "@/lib/motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { Json } from "@/integrations/supabase/types";

interface Dispatch {
  id: string;
  scheduled_at: string;
  status: string;
  message_text: string;
  contacts: Json;
  dispatch_type: string;
  instance_name: string | null;
  created_at: string;
  results: Json | null;
  processed_at: string | null;
  sent_count: number;
  min_delay: number;
  max_delay: number;
  batch_size: number;
  batch_pause: number;
}

const ITEMS_PER_PAGE = 15;

const DispatchReportsTab = () => {
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [clearing, setClearing] = useState(false);

  const fetchDispatches = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("scheduled_dispatches")
      .select("id, scheduled_at, status, message_text, contacts, dispatch_type, instance_name, created_at, results, processed_at, sent_count, min_delay, max_delay, batch_size, batch_pause")
      .order("created_at", { ascending: false })
      .limit(500);

    if (data) setDispatches(data as unknown as Dispatch[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchDispatches();
  }, []);

  const handleClearHistory = async () => {
    setClearing(true);
    const { error } = await supabase
      .from("scheduled_dispatches")
      .delete()
      .in("status", ["completed", "cancelled", "error"]);

    if (error) {
      toast({ title: "Erro ao limpar histórico", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Histórico limpo", description: "Disparos finalizados foram removidos." });
      setCurrentPage(1);
      fetchDispatches();
    }
    setClearing(false);
  };

  const getContactCount = (contacts: Json): number => {
    if (Array.isArray(contacts)) return contacts.length;
    return 0;
  };

  const getResults = (results: Json | null) => {
    if (!results || typeof results !== "object" || Array.isArray(results)) return { success: 0, errors: 0, total: 0 };
    const r = results as Record<string, unknown>;
    return {
      success: Number(r.success ?? 0),
      errors: Number(r.errors ?? 0),
      total: Number(r.total ?? 0),
    };
  };

  // Stats
  const stats = useMemo(() => {
    const completed = dispatches.filter((d) => d.status === "completed");
    const cancelled = dispatches.filter((d) => d.status === "cancelled");
    const totalSent = completed.reduce((sum, d) => sum + getResults(d.results).success, 0);
    const totalErrors = completed.reduce((sum, d) => sum + getResults(d.results).errors, 0);
    const totalContacts = dispatches.reduce((sum, d) => sum + getContactCount(d.contacts), 0);
    return { completed: completed.length, cancelled: cancelled.length, totalSent, totalErrors, totalContacts, total: dispatches.length };
  }, [dispatches]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(dispatches.length / ITEMS_PER_PAGE));
  const paginatedDispatches = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return dispatches.slice(start, start + ITEMS_PER_PAGE);
  }, [dispatches, currentPage]);

  // Daily chart data
  const dailyData = useMemo(() => {
    const map = new Map<string, { day: string; enviados: number; erros: number }>();
    dispatches.filter(d => d.status === "completed").forEach((d) => {
      const day = new Date(d.scheduled_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const r = getResults(d.results);
      const existing = map.get(day) || { day, enviados: 0, erros: 0 };
      existing.enviados += r.success;
      existing.erros += r.errors;
      map.set(day, existing);
    });
    return Array.from(map.values()).reverse().slice(-14);
  }, [dispatches]);

  // Status pie data
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    dispatches.forEach((d) => {
      counts[d.status] = (counts[d.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name: statusLabel(name), value }));
  }, [dispatches]);

  const COLORS = ["hsl(var(--primary))", "hsl(var(--destructive))", "hsl(var(--muted-foreground))", "hsl(142, 76%, 36%)"];

  const statusBadge = (status: string) => {
    switch (status) {
      case "completed": return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"><CheckCircle className="h-3 w-3 mr-1" /> Concluído</Badge>;
      case "cancelled": return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Cancelado</Badge>;
      case "pending": return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/20"><Clock className="h-3 w-3 mr-1" /> Pendente</Badge>;
      case "processing": return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/20"><Send className="h-3 w-3 mr-1" /> Processando</Badge>;
      case "paused": return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/20"><Pause className="h-3 w-3 mr-1" /> Pausado</Badge>;
      case "error": return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" /> Erro</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="visible">
      {/* Summary cards */}
      <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-4" variants={staggerItem}>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground mt-1">Total de disparos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-emerald-400">{stats.totalSent}</p>
            <p className="text-xs text-muted-foreground mt-1">Mensagens enviadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-destructive">{stats.totalErrors}</p>
            <p className="text-xs text-muted-foreground mt-1">Erros</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">
              {stats.totalSent + stats.totalErrors > 0 ? Math.round((stats.totalSent / (stats.totalSent + stats.totalErrors)) * 100) : 0}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">Taxa de sucesso</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Charts */}
      <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-6" variants={staggerItem}>
        {/* Daily bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Disparos por dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dailyData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados ainda</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="enviados" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="erros" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Status dos disparos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados ainda</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* History table */}
      <motion.div variants={staggerItem}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm">Histórico de Disparos</CardTitle>
            <CardDescription>Todos os disparos agendados</CardDescription>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={clearing || dispatches.filter(d => ["completed", "cancelled", "error"].includes(d.status)).length === 0}>
                <Trash2 className="h-4 w-4 mr-1" />
                Limpar histórico
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Limpar histórico?</AlertDialogTitle>
                <AlertDialogDescription>
                  Isso removerá todos os disparos concluídos, cancelados e com erro. Disparos pendentes ou em processamento não serão afetados.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearHistory}>
                  {clearing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Confirmar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardHeader>
        <CardContent>
          {dispatches.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum disparo realizado ainda.</p>
          ) : (
            <>
              <div className="overflow-auto rounded-lg border border-border max-h-[500px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b bg-muted">
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Data</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Status</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Instância</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Contatos</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Enviados</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Erros</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedDispatches.map((d) => {
                      const r = getResults(d.results);
                      const contactCount = getContactCount(d.contacts);
                      return (
                        <tr key={d.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                          <td className="px-3 py-2 whitespace-nowrap text-xs">
                            {new Date(d.scheduled_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                            {" "}
                            {new Date(d.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">{statusBadge(d.status)}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs">{d.instance_name || "—"}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs font-medium">{contactCount}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-emerald-400">{r.success || d.sent_count || 0}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-destructive">{r.errors || 0}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <Badge variant="outline" className="text-[10px]">{d.dispatch_type === "media" ? "Mídia" : "Texto"}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-xs text-muted-foreground">
                    Página {currentPage} de {totalPages} ({dispatches.length} registros)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      </motion.div>
    </motion.div>
  );
};

function statusLabel(s: string): string {
  switch (s) {
    case "completed": return "Concluído";
    case "cancelled": return "Cancelado";
    case "pending": return "Pendente";
    case "processing": return "Processando";
    case "paused": return "Pausado";
    case "error": return "Erro";
    default: return s;
  }
}

export default DispatchReportsTab;
