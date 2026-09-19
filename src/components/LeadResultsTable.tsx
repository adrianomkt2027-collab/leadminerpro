import { Download, Database, ExternalLink, CheckCircle2, XCircle, Copy, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import type { Lead, ScrapeResult } from "@/hooks/useApifyScraper";

interface Props {
  results: ScrapeResult;
  onSave: () => void;
  saving: boolean;
}

const columns: { key: keyof Lead; label: string }[] = [
  { key: "nome", label: "Nome" },
  { key: "telefone", label: "Telefone" },
  { key: "email", label: "Email" },
  { key: "site", label: "Site" },
  { key: "endereco", label: "Endereço" },
  { key: "nicho", label: "Nicho" },
  { key: "nota", label: "Nota" },
  
  { key: "tem_site_proprio", label: "Tem Site" },
  { key: "pain_score", label: "Pain Score" },
  { key: "opportunity_score", label: "Oportunidade" },
  { key: "potencial_trafego", label: "Tráfego" },
];

const LeadResultsTable = ({ results, onSave, saving }: Props) => {
  const handleDownloadJSON = () => {
    const blob = new Blob([JSON.stringify(results.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCSV = () => {
    if (results.data.length === 0) return;
    const headers = columns.map((c) => c.label);
    const csv = [
      headers.join(","),
      ...results.data.map((row) =>
        columns.map((c) => `"${String(row[c.key] ?? "").replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderCell = (lead: Lead, key: keyof Lead) => {
    const val = lead[key];
    if (key === "tem_site_proprio") {
      return val ? (
        <CheckCircle2 className="h-4 w-4 text-primary" />
      ) : (
        <XCircle className="h-4 w-4 text-destructive" />
      );
    }
    if (key === "pain_score" || key === "opportunity_score") {
      const num = val as number;
      const variant = num >= 70 ? "destructive" : num >= 40 ? "secondary" : "outline";
      return <Badge variant={variant}>{num}</Badge>;
    }
    if (key === "nota") {
      return <span className="font-medium">⭐ {val}</span>;
    }
    if (key === "site" && val) {
      const url = String(val);
      return (
        <button onClick={() => { navigator.clipboard.writeText(url); toast({ title: "URL copiada!", description: url }); }} className="text-primary hover:underline inline-flex items-center gap-1 bg-transparent border-none cursor-pointer p-0 text-sm">
          <Copy className="h-3 w-3" /> Copiar
        </button>
      );
    }
    if (key === "instagram") {
      if (!val) {
        return <span className="inline-flex items-center gap-1 text-muted-foreground"><XCircle className="h-3.5 w-3.5" /> Não</span>;
      }
      const url = String(val);
      return (
        <button onClick={() => { navigator.clipboard.writeText(url); toast({ title: "Instagram copiado!" }); }} className="text-primary hover:underline inline-flex items-center gap-1 bg-transparent border-none cursor-pointer p-0 text-sm">
          <CheckCircle2 className="h-3.5 w-3.5" /> Sim
        </button>
      );
    }
    if (key === "instagram_username") {
      return <span className="font-mono text-xs">{val ? String(val) : "—"}</span>;
    }
    if (key === "facebook") {
      if (!val) {
        return <span className="inline-flex items-center gap-1 text-muted-foreground"><XCircle className="h-3.5 w-3.5" /> Não</span>;
      }
      const url = String(val);
      return (
        <button onClick={() => { navigator.clipboard.writeText(url); toast({ title: "Facebook copiado!" }); }} className="text-primary hover:underline inline-flex items-center gap-1 bg-transparent border-none cursor-pointer p-0 text-sm">
          <CheckCircle2 className="h-3.5 w-3.5" /> Sim
        </button>
      );
    }
    return <span className="truncate max-w-[200px] block">{String(val ?? "—")}</span>;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-5 w-5 text-primary" />
              {results.count} Leads Encontrados
            </CardTitle>
            <CardDescription>Resultados da mineração</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={onSave} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              {saving ? "Salvando..." : "Salvar"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadJSON}>
              <Download className="h-3 w-3" /> JSON
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadCSV}>
              <Download className="h-3 w-3" /> CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="table">
          <TabsList>
            <TabsTrigger value="table">Tabela</TabsTrigger>
            <TabsTrigger value="json">JSON</TabsTrigger>
          </TabsList>
          <TabsContent value="table" className="mt-4">
            <div className="overflow-auto rounded-lg border border-border max-h-[600px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b bg-muted">
                    {columns.map((col) => (
                      <th key={col.key} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap text-xs">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.data.map((lead, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      {columns.map((col) => (
                        <td key={col.key} className="px-3 py-2 whitespace-nowrap">
                          {renderCell(lead, col.key)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
          <TabsContent value="json" className="mt-4">
            <pre className="max-h-[400px] overflow-auto rounded-lg bg-muted p-4 text-xs font-mono">
              {JSON.stringify(results.data, null, 2)}
            </pre>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default LeadResultsTable;
