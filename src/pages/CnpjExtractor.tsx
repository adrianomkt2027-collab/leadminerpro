import { useState, useMemo } from "react";
import { useCnpjExtractor } from "@/hooks/useCnpjExtractor";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Search, Download, Building2, Phone, Mail, MapPin, X, Save } from "lucide-react";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

const CnpjExtractor = () => {
  const { session } = useAuth();
  const extractor = useCnpjExtractor();

  const [uf, setUf] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [cnaeSearch, setCnaeSearch] = useState("");
  const [cnaeCode, setCnaeCode] = useState("");
  const [bairro, setBairro] = useState("");
  const [maxPages, setMaxPages] = useState("5");
  const [comTelefone, setComTelefone] = useState(true);
  const [somenteCelular, setSomenteCelular] = useState(true);
  const [mei, setMei] = useState(false);
  const [excluirMei, setExcluirMei] = useState(false);
  const [savingLeads, setSavingLeads] = useState(false);

  // Filter CNAEs based on search
  const filteredCnaes = useMemo(() => {
    if (!cnaeSearch.trim()) return extractor.cnaes.slice(0, 100);
    const search = cnaeSearch.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return extractor.cnaes
      .filter((c) => {
        const name = c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return name.includes(search) || c.code.includes(search);
      })
      .slice(0, 50);
  }, [cnaeSearch, extractor.cnaes]);

  // Filter municipios based on search (no separate search field needed, Select handles it)
  const sortedMunicipios = useMemo(() => {
    return [...extractor.municipios].sort((a, b) => a.name.localeCompare(b.name));
  }, [extractor.municipios]);

  const handleUfChange = (value: string) => {
    setUf(value);
    setMunicipio("");
    if (value) {
      extractor.loadMunicipios(value);
    }
  };

  const handleSearch = () => {
    if (!uf) {
      toast({ title: "UF obrigatório", description: "Selecione um estado.", variant: "destructive" });
      return;
    }
    extractor.search({
      uf,
      municipio: municipio || undefined,
      bairro: bairro.trim().toUpperCase() || undefined,
      cnae: cnaeCode || undefined,
      com_telefone: comTelefone,
      somente_celular: somenteCelular,
      mei,
      excluir_mei: excluirMei,
      maxPages: parseInt(maxPages) || 5,
    });
  };

  const handleSaveToDb = async () => {
    if (!session?.user?.id || extractor.companies.length === 0) return;
    setSavingLeads(true);

    try {
      const cnaeLabel = cnaeCode || "Geral";
      const cidadeLabel = municipio ? `${municipio} - ${uf}` : uf || "Brasil";

      const { data: mineracao, error: minError } = await supabase
        .from("mineracoes")
        .insert({
          user_id: session.user.id,
          palavra_chave: `CNPJ - ${cnaeLabel}`,
          cidade: cidadeLabel,
          total_leads: extractor.companies.length,
        })
        .select()
        .single();

      if (minError) throw minError;

      const leadsData = extractor.companies.map((c) => ({
        user_id: session.user.id,
        mineracao_id: mineracao.id,
        nome: c.razao_social || c.nome_fantasia || "",
        telefone: c.telefone1 || c.telefone2 || "",
        email: c.email || "",
        endereco: [c.logradouro, c.numero, c.bairro, c.municipio, c.uf, c.cep].filter(Boolean).join(", "),
        site: "",
        nicho: c.cnae_principal || "",
      }));

      const batchSize = 50;
      for (let i = 0; i < leadsData.length; i += batchSize) {
        const batch = leadsData.slice(i, i + batchSize);
        const { error } = await supabase.from("leads").insert(batch);
        if (error) throw error;
      }

      toast({ title: "Leads salvos!", description: `${leadsData.length} leads salvos no banco.` });
    } catch (err: unknown) {
      toast({
        title: "Erro ao salvar",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSavingLeads(false);
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
        {/* Header */}
        <motion.div variants={staggerItem}>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Extrator de CNPJ</h1>
              <p className="text-sm text-muted-foreground">Pesquisa avançada via Casa dos Dados</p>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div variants={staggerItem}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Search className="h-5 w-5 text-primary" />
                Pesquisa Avançada
              </CardTitle>
              <CardDescription>Configure os filtros para extrair leads via Casa dos Dados</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* CNAE */}
              <div className="space-y-2">
                <Label>Atividade Principal (CNAE)</Label>
                <Input
                  placeholder={extractor.loadingCnaes ? "Carregando CNAEs..." : "Digite para buscar CNAE..."}
                  value={cnaeSearch}
                  onChange={(e) => setCnaeSearch(e.target.value)}
                  disabled={extractor.loadingCnaes}
                />
                <Select value={cnaeCode} onValueChange={(value) => setCnaeCode(value === "__none__" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={extractor.loadingCnaes ? "Carregando CNAEs..." : "Selecione o CNAE"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="__none__">Nenhum (todos)</SelectItem>
                    {filteredCnaes.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.code} - {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* UF */}
                <div className="space-y-2">
                  <Label>Estado (UF) *</Label>
                  <Select value={uf} onValueChange={handleUfChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={extractor.loadingUfs ? "Carregando..." : "Selecione"} />
                    </SelectTrigger>
                    <SelectContent>
                      {extractor.ufs.map((u) => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Município */}
                <div className="space-y-2">
                  <Label>Município</Label>
                  <Select value={municipio} onValueChange={(value) => setMunicipio(value === "__none__" ? "" : value)} disabled={!uf || extractor.loadingMunicipios}>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          !uf ? "Selecione UF primeiro" :
                          extractor.loadingMunicipios ? "Carregando..." :
                          `${sortedMunicipios.length} municípios`
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem value="__none__">Todos</SelectItem>
                      {sortedMunicipios.map((m) => (
                        <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Bairro */}
                <div className="space-y-2">
                  <Label>Bairro</Label>
                  <Input
                    placeholder="Ex: CENTRO"
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                  />
                </div>

                {/* Max Pages */}
                <div className="space-y-2">
                  <Label>Máx. Páginas</Label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={maxPages}
                    onChange={(e) => setMaxPages(e.target.value)}
                  />
                </div>
              </div>

              {/* Checkboxes */}
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox id="com-tel" checked={comTelefone} onCheckedChange={(v) => setComTelefone(v === true)} />
                  <Label htmlFor="com-tel" className="text-sm cursor-pointer">📞 Com telefone</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="cel-only" checked={somenteCelular} onCheckedChange={(v) => setSomenteCelular(v === true)} />
                  <Label htmlFor="cel-only" className="text-sm cursor-pointer">📱 Somente celular</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="mei" checked={mei} onCheckedChange={(v) => setMei(v === true)} />
                  <Label htmlFor="mei" className="text-sm cursor-pointer">Somente MEI</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="excl-mei" checked={excluirMei} onCheckedChange={(v) => setExcluirMei(v === true)} />
                  <Label htmlFor="excl-mei" className="text-sm cursor-pointer">Excluir MEI</Label>
                </div>
              </div>

              {/* Action button - full width like Maps Extrator */}
              {extractor.loading ? (
                <Button variant="destructive" onClick={extractor.cancel} className="w-full">
                  <X className="h-4 w-4" /> Cancelar Mineração
                </Button>
              ) : (
                <Button onClick={handleSearch} disabled={!uf} className="w-full">
                  <Search className="h-4 w-4" />
                  Iniciar Mineração
                </Button>
              )}

              {extractor.companies.length > 0 && (
                <div className="flex gap-3">
                  <Button variant="outline" onClick={extractor.exportCsv} className="flex-1">
                    <Download className="h-4 w-4 mr-2" /> Exportar CSV
                  </Button>
                  <Button variant="secondary" onClick={handleSaveToDb} disabled={savingLeads} className="flex-1">
                    {savingLeads ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Salvar no Banco
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Progress */}
        {extractor.loading && (
          <motion.div variants={staggerItem}>
            <Card>
              <CardContent className="py-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    Extraindo página {extractor.currentPage}...
                  </span>
                  <span className="text-sm text-muted-foreground">{extractor.progress}%</span>
                </div>
                <Progress value={extractor.progress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {extractor.companies.length} empresas coletadas • {extractor.total} resultados totais
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Stats */}
        {extractor.companies.length > 0 && (
          <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-4" variants={staggerItem}>
            <Card>
              <CardContent className="pt-5 text-center">
                <p className="text-2xl font-bold">{extractor.companies.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Extraídos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 text-center">
                <p className="text-2xl font-bold">{extractor.total}</p>
                <p className="text-xs text-muted-foreground mt-1">Total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 text-center">
                <p className="text-2xl font-bold">{extractor.companies.filter((c) => c.telefone1).length}</p>
                <p className="text-xs text-muted-foreground mt-1">Com Telefone</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 text-center">
                <p className="text-2xl font-bold">{extractor.companies.filter((c) => c.email).length}</p>
                <p className="text-xs text-muted-foreground mt-1">Com Email</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Results Table */}
        {extractor.companies.length > 0 && (
          <motion.div variants={staggerItem}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">📊 Resultados</CardTitle>
                <CardDescription>{extractor.companies.length} empresas encontradas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto rounded-lg border border-border max-h-[500px]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className="border-b bg-muted">
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">CNPJ</th>
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">🏢 Empresa</th>
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">CNAE</th>
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">📍 Cidade</th>
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">📱 Contato</th>
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">⭐ Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {extractor.companies.map((c, i) => (
                        <tr key={`${c.cnpj}-${i}`} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                          <td className="px-3 py-2.5 whitespace-nowrap font-mono text-xs">{c.cnpj}</td>
                          <td className="px-3 py-2.5">
                            <div className="max-w-[200px]">
                              <p className="font-medium truncate">{c.nome_fantasia || c.razao_social}</p>
                              {c.nome_fantasia && (
                                <p className="text-xs text-muted-foreground truncate">{c.razao_social}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <p className="text-xs max-w-[180px] truncate">{c.cnae_principal}</p>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                              <span className="text-xs">{c.municipio}/{c.uf}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="space-y-0.5">
                              {c.telefone1 && (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                                  <span className="text-xs">{c.telefone1}</span>
                                </div>
                              )}
                              {c.email && (
                                <div className="flex items-center gap-1">
                                  <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                                  <span className="text-xs truncate max-w-[150px]">{c.email}</span>
                                </div>
                              )}
                              {!c.telefone1 && !c.email && (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <Badge
                              variant={c.situacao_cadastral === "ATIVA" ? "default" : "secondary"}
                              className="text-[10px]"
                            >
                              {c.situacao_cadastral || "—"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Error */}
        {extractor.error && (
          <motion.div variants={staggerItem}>
            <Card className="border-destructive">
              <CardContent className="py-5">
                <p className="text-sm text-destructive">{extractor.error}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.main>
    </div>
  );
};

export default CnpjExtractor;
