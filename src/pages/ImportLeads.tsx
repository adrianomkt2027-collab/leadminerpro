import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem, fadeInUp } from "@/lib/motion";
import { FileUp, Upload, Trash2, Save } from "lucide-react";

interface ParsedLead {
  nome: string;
  categoria: string;
  nota: number;
  telefone: string;
  endereco: string;
}

function parseLeadsText(text: string): ParsedLead[] {
  const blocks = text.split(/-{5,}/).filter((b) => b.trim());
  const leads: ParsedLead[] = [];

  for (const block of blocks) {
    const lines = block.trim().split("\n").map((l) => l.trim()).filter(Boolean);
    const get = (prefix: string) => {
      const line = lines.find((l) => l.startsWith(prefix));
      return line ? line.substring(prefix.length).trim() : "";
    };

    const nome = get("NOME:");
    if (!nome) continue;

    const notaRaw = get("NOTA:").replace(",", ".");
    const nota = parseFloat(notaRaw) || 0;

    leads.push({
      nome,
      categoria: get("CATEGORIA:"),
      nota,
      telefone: get("TEL:"),
      endereco: get("END:").replace(/^·\s*/, ""),
    });
  }

  return leads;
}

const ImportLeads = () => {
  const [rawText, setRawText] = useState("");
  const [parsed, setParsed] = useState<ParsedLead[]>([]);
  const [saving, setSaving] = useState(false);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setRawText(content);
      const results = parseLeadsText(content);
      setParsed(results);
      if (results.length === 0) {
        toast({ title: "Nenhum lead encontrado", description: "Verifique o formato do arquivo.", variant: "destructive" });
      } else {
        toast({ title: `${results.length} leads detectados`, description: "Revise e salve abaixo." });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const handleParse = () => {
    const results = parseLeadsText(rawText);
    setParsed(results);
    if (results.length === 0) {
      toast({ title: "Nenhum lead encontrado", description: "Verifique o formato do texto.", variant: "destructive" });
    } else {
      toast({ title: `${results.length} leads detectados`, description: "Revise e salve abaixo." });
    }
  };

  const handleClear = () => {
    setRawText("");
    setParsed([]);
  };

  const handleSave = async () => {
    if (!parsed.length) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Extract cidade and palavra_chave from categoria (e.g. "Dentista anápolis")
      const firstCategoria = parsed[0].categoria;
      const parts = firstCategoria.split(/\s+/);
      const palavraChave = parts[0] || "Importado";
      const cidade = parts.slice(1).join(" ") || "Importação";

      const { data: mineracao, error: mErr } = await supabase
        .from("mineracoes")
        .insert({
          cidade,
          palavra_chave: palavraChave,
          total_leads: parsed.length,
          user_id: user.id,
        })
        .select("id")
        .single();

      if (mErr) throw mErr;

      const leadsToInsert = parsed.map((l) => ({
        mineracao_id: mineracao.id,
        user_id: user.id,
        nome: l.nome,
        telefone: l.telefone,
        endereco: l.endereco,
        nicho: l.categoria,
        nota: l.nota,
      }));

      const { error: lErr } = await supabase.from("leads").insert(leadsToInsert);
      if (lErr) throw lErr;

      toast({ title: "Importado!", description: `${parsed.length} leads salvos com sucesso.` });
      handleClear();
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
            <FileUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Importar Leads</h1>
            <p className="text-sm text-muted-foreground">Importe minerações de outros aplicativos</p>
          </div>
        </motion.div>

        <motion.div variants={staggerItem}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Arquivo ou Texto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file-upload">Carregar arquivo .txt</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".txt,.csv,.text"
                  onChange={handleFileUpload}
                  className="cursor-pointer"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center">
                  <div className="flex-1 border-t border-border" />
                  <span className="px-3 text-xs text-muted-foreground bg-card">ou cole o texto abaixo</span>
                  <div className="flex-1 border-t border-border" />
                </div>
                <div className="h-6" />
              </div>

              <Textarea
                placeholder={"LEAD #1\nNOME: ...\nCATEGORIA: ...\nNOTA: ...\nTEL: ...\nEND: ...\n----------------------------------------"}
                rows={10}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="font-mono text-xs"
              />

              <div className="flex gap-2">
                <Button onClick={handleParse} disabled={!rawText.trim()}>
                  <Upload className="h-4 w-4" />
                  Processar
                </Button>
                <Button variant="outline" onClick={handleClear} disabled={!rawText && !parsed.length}>
                  <Trash2 className="h-4 w-4" />
                  Limpar
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {parsed.length > 0 && (
          <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="space-y-4">
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold">
                  {parsed.length} leads encontrados
                </CardTitle>
                <Button onClick={handleSave} disabled={saving} size="sm">
                  <Save className="h-4 w-4" />
                  {saving ? "Salvando..." : "Salvar todos"}
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="rounded-md border overflow-auto max-h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="w-16">Nota</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Endereço</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsed.map((lead, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="font-medium max-w-[200px] truncate">{lead.nome}</TableCell>
                          <TableCell className="text-muted-foreground">{lead.categoria}</TableCell>
                          <TableCell>{lead.nota}</TableCell>
                          <TableCell>{lead.telefone}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{lead.endereco}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.main>
    </div>
  );
};

export default ImportLeads;
