import { useState } from "react";
import { Search, Loader2, MapPin, Tag, Hash, Building2, MapPinned, Navigation, Star, ChevronDown, ChevronUp, Filter } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export interface SearchFilters {
  estado: string;
  cidade: string;
  bairro: string;
  cep: string;
  palavraChave: string;
  maxResults: number;
  notaMinima: string;
  apenasComTelefone: boolean;
  apenasSemSite: boolean;
}

interface Props {
  loading: boolean;
  onSearch: (filters: SearchFilters) => void;
}

const LeadSearchForm = ({ loading, onSearch }: Props) => {
  const [estado, setEstado] = useState("");
  const [cidade, setCidade] = useState("");
  const [bairro, setBairro] = useState("");
  const [cep, setCep] = useState("");
  const [palavraChave, setPalavraChave] = useState("");
  const [maxResults, setMaxResults] = useState(30);
  const [notaMinima, setNotaMinima] = useState("");
  const [apenasComTelefone, setApenasComTelefone] = useState(true);
  const [apenasSemSite, setApenasSemSite] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!palavraChave.trim()) return;
    if (!cidade.trim() && !estado.trim() && !bairro.trim() && !cep.trim()) return;
    onSearch({
      estado: estado.trim(),
      cidade: cidade.trim(),
      bairro: bairro.trim(),
      cep: cep.trim(),
      palavraChave: palavraChave.trim(),
      maxResults,
      notaMinima,
      apenasComTelefone,
      apenasSemSite,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Search className="h-5 w-5 text-primary" />
          Mineração de Leads
        </CardTitle>
        <CardDescription>
          Defina a localização e o nicho para encontrar leads qualificados
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Location filters */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="estado" className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                Estado
              </Label>
              <Input
                id="estado"
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                placeholder="Ex: SP, PR, RJ..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cidade" className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                Cidade
              </Label>
              <Input
                id="cidade"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                placeholder="Ex: São Paulo, Curitiba..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bairro" className="flex items-center gap-1.5">
                <MapPinned className="h-3.5 w-3.5 text-muted-foreground" />
                Bairro
              </Label>
              <Input
                id="bairro"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                placeholder="Ex: Centro, Jardins..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cep" className="flex items-center gap-1.5">
                <Navigation className="h-3.5 w-3.5 text-muted-foreground" />
                CEP
              </Label>
              <Input
                id="cep"
                value={cep}
                onChange={(e) => setCep(e.target.value)}
                placeholder="Ex: 01001-000"
              />
            </div>
          </div>

          {/* Keyword */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="palavraChave" className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                Palavra-chave / Nicho
              </Label>
              <Input
                id="palavraChave"
                value={palavraChave}
                onChange={(e) => setPalavraChave(e.target.value)}
                placeholder="Ex: Restaurante, Dentista, Academia..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxResults" className="flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                Quantidade de resultados
              </Label>
              <select
                id="maxResults"
                value={maxResults}
                onChange={(e) => setMaxResults(Number(e.target.value))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value={10}>10 resultados</option>
                <option value={20}>20 resultados</option>
                <option value={30}>30 resultados</option>
                <option value={50}>50 resultados</option>
                <option value={100}>100 resultados</option>
                <option value={200}>200 resultados</option>
              </select>
            </div>
          </div>

          {/* Advanced filters */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                <Filter className="h-3.5 w-3.5" />
                Filtros avançados
                {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="notaMinima" className="flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 text-muted-foreground" />
                    Nota mínima
                  </Label>
                  <select
                    id="notaMinima"
                    value={notaMinima}
                    onChange={(e) => setNotaMinima(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">Qualquer nota</option>
                    <option value="1">⭐ 1+</option>
                    <option value="2">⭐ 2+</option>
                    <option value="3">⭐ 3+</option>
                    <option value="4">⭐ 4+</option>
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-2 cursor-pointer rounded-md border border-input bg-background px-3 h-10 text-sm w-full">
                    <input
                      type="checkbox"
                      checked={apenasComTelefone}
                      onChange={(e) => setApenasComTelefone(e.target.checked)}
                      className="rounded"
                    />
                    Apenas com telefone
                  </label>
                </div>
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-2 cursor-pointer rounded-md border border-input bg-background px-3 h-10 text-sm w-full">
                    <input
                      type="checkbox"
                      checked={apenasSemSite}
                      onChange={(e) => setApenasSemSite(e.target.checked)}
                      className="rounded"
                    />
                    Apenas sem site
                  </label>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Minerando leads...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Iniciar Mineração
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default LeadSearchForm;
