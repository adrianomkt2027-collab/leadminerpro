import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, MapPin, Send, TrendingUp, Clock, Building2, Globe, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface Stats {
  totalLeads: number;
  totalMineracoes: number;
  totalCnpjLeads: number;
  totalDispatches: number;
  completedDispatches: number;
  cancelledDispatches: number;
  pendingDispatches: number;
  totalMessagesSent: number;
  avgOpportunityScore: number;
  recentMineracoes: { cidade: string; palavra_chave: string; total_leads: number; created_at: string }[];
  recentCnpj: { razao_social: string; municipio: string | null; cnae_principal: string | null; created_at: string }[];
  topCidades: { name: string; leads: number }[];
}

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--muted-foreground))",
  "hsl(var(--destructive))",
];

export default function DashboardStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [leadsRes, mineracoesRes, dispatchesRes, cnpjRes, cnpjRecentRes] = await Promise.all([
        supabase.from("leads").select("opportunity_score, pain_score", { count: "exact" }).eq("user_id", user.id),
        supabase.from("mineracoes").select("cidade, palavra_chave, total_leads, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(3),
        supabase.from("scheduled_dispatches").select("status, sent_count, results").eq("user_id", user.id),
        supabase.from("cnpj_leads").select("id", { count: "exact" }).eq("user_id", user.id),
        supabase.from("cnpj_leads").select("razao_social, municipio, cnae_principal, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(3),
      ]);

      const leads = leadsRes.data || [];
      const mineracoes = mineracoesRes.data || [];
      const dispatches = dispatchesRes.data || [];

      const totalLeads = leadsRes.count || 0;
      const totalCnpjLeads = cnpjRes.count || 0;
      const avgOpp = leads.length > 0
        ? Math.round(leads.reduce((sum, l) => sum + (l.opportunity_score || 0), 0) / leads.length)
        : 0;

      const completed = dispatches.filter(d => d.status === "completed").length;
      const cancelled = dispatches.filter(d => d.status === "cancelled").length;
      const pending = dispatches.filter(d => d.status === "pending" || d.status === "processing").length;
      const totalSent = dispatches.reduce((sum, d) => sum + (d.sent_count || 0), 0);

      const allMineracoes = await supabase
        .from("mineracoes")
        .select("cidade, total_leads")
        .eq("user_id", user.id);

      const cidadeMap: Record<string, number> = {};
      (allMineracoes.data || []).forEach(m => {
        cidadeMap[m.cidade] = (cidadeMap[m.cidade] || 0) + m.total_leads;
      });
      const topCidades = Object.entries(cidadeMap)
        .map(([name, leads]) => ({ name, leads }))
        .sort((a, b) => b.leads - a.leads)
        .slice(0, 6);

      setStats({
        totalLeads,
        totalMineracoes: (allMineracoes.data || []).length,
        totalCnpjLeads,
        totalDispatches: dispatches.length,
        completedDispatches: completed,
        cancelledDispatches: cancelled,
        pendingDispatches: pending,
        totalMessagesSent: totalSent,
        avgOpportunityScore: avgOpp,
        recentMineracoes: mineracoes,
        recentCnpj: cnpjRecentRes.data || [],
        topCidades,
      });
      setLoading(false);
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6 h-24" />
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    { label: "Leads Google Maps", value: stats.totalLeads, icon: Globe, color: "text-blue-500" },
    { label: "Leads CNPJ", value: stats.totalCnpjLeads, icon: Building2, color: "text-emerald-500" },
    { label: "Mensagens Enviadas", value: stats.totalMessagesSent, icon: Send, color: "text-violet-500" },
    { label: "Score Médio", value: `${stats.avgOpportunityScore}%`, icon: TrendingUp, color: "text-amber-500" },
  ];

  const dispatchPieData = [
    { name: "Concluídos", value: stats.completedDispatches },
    { name: "Pendentes", value: stats.pendingDispatches },
    { name: "Cancelados", value: stats.cancelledDispatches },
  ].filter(d => d.value > 0);

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <motion.div key={label} variants={staggerItem}>
            <Card className="relative overflow-hidden">
              <CardContent className="pt-5 pb-4 px-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <p className="text-2xl font-bold">{value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div variants={staggerItem}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                Extrator Google Maps
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-bold">{stats.totalMineracoes}</span>
                <span className="text-sm text-muted-foreground">minerações realizadas</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.totalLeads} leads extraídos • Score médio {stats.avgOpportunityScore}%
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={staggerItem}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Extrator CNPJ
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-bold">{stats.totalCnpjLeads}</span>
                <span className="text-sm text-muted-foreground">empresas extraídas</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Dados completos com CNAE, sócios e contatos
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        <motion.div variants={staggerItem} className="h-full">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Leads por Cidade</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {stats.topCidades.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.topCidades} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="leads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[200px]">
                  <p className="text-sm text-muted-foreground">Nenhuma mineração realizada ainda</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {dispatchPieData.length > 0 ? (
          <motion.div variants={staggerItem} className="h-full">
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Status dos Disparos</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 flex items-center justify-center">
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width={140} height={140}>
                    <PieChart>
                      <Pie data={dispatchPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                        {dispatchPieData.map((_, index) => (
                          <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {dispatchPieData.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-xs text-muted-foreground">
                          {d.name}: <strong className="text-foreground">{d.value}</strong>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div variants={staggerItem} className="h-full">
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Status dos Disparos</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 flex items-center justify-center h-[200px]">
                <p className="text-sm text-muted-foreground">Nenhum disparo registrado</p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Recent activity - two columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        {/* Recent Maps */}
        <motion.div variants={staggerItem} className="h-full">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Minerações Recentes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {stats.recentMineracoes.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentMineracoes.map((m, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <MapPin className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{m.palavra_chave}</p>
                          <p className="text-xs text-muted-foreground">{m.cidade}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="text-xs">{m.total_leads} leads</Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(m.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma mineração ainda</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent CNPJ */}
        <motion.div variants={staggerItem} className="h-full">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Extrações CNPJ Recentes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {stats.recentCnpj.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentCnpj.map((c, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{c.razao_social}</p>
                          <p className="text-xs text-muted-foreground">{c.municipio || "—"}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end gap-1">
                        {c.cnae_principal && (
                          <p className="text-xs text-muted-foreground whitespace-nowrap">{c.cnae_principal}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(c.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma extração ainda</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}