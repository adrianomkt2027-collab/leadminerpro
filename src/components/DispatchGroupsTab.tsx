import { useState, useEffect, useCallback } from "react";
import { Users, Plus, Trash2, Loader2, RefreshCw, Phone, Download, Search, UserPlus, FolderPlus, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Instance {
  instanceName: string;
  instanceId?: string;
  status?: string;
  owner?: string;
}

interface DispatchGroup {
  id: string;
  name: string;
  description: string;
  created_at: string;
  contactCount?: number;
}

interface GroupContact {
  id: string;
  name: string;
  phone: string;
  source: string;
}

interface WhatsAppContact {
  id: string;
  pushName?: string;
  name?: string;
  profilePictureUrl?: string;
}

interface WhatsAppGroup {
  id: string;
  subject: string;
  size: number;
}

interface DispatchGroupsTabProps {
  savedInstances: Instance[];
  callEvolution: (action: string, instanceName?: string, data?: Record<string, unknown>) => Promise<unknown>;
}

const DispatchGroupsTab = ({ savedInstances, callEvolution }: DispatchGroupsTabProps) => {
  // Groups state
  const [groups, setGroups] = useState<DispatchGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [groupContacts, setGroupContacts] = useState<Record<string, GroupContact[]>>({});
  const [loadingContacts, setLoadingContacts] = useState<string | null>(null);

  // Create group state
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // Import contacts state
  const [importInstance, setImportInstance] = useState<string>("");
  const [importingFrom, setImportingFrom] = useState<"contacts" | "groups" | null>(null);
  const [whatsappContacts, setWhatsappContacts] = useState<WhatsAppContact[]>([]);
  const [whatsappGroups, setWhatsappGroups] = useState<WhatsAppGroup[]>([]);
  const [selectedImports, setSelectedImports] = useState<Set<string>>(new Set());
  const [importTargetGroup, setImportTargetGroup] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [savingImport, setSavingImport] = useState(false);

  // Load groups
  const loadGroups = useCallback(async () => {
    setLoadingGroups(true);
    const { data } = await supabase
      .from("dispatch_groups")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      // Get contact counts
      const groupsWithCounts: DispatchGroup[] = [];
      for (const g of data) {
        const { count } = await supabase
          .from("dispatch_group_contacts")
          .select("*", { count: "exact", head: true })
          .eq("group_id", g.id);
        groupsWithCounts.push({ ...g, description: g.description || "", contactCount: count || 0 });
      }
      setGroups(groupsWithCounts);
    }
    setLoadingGroups(false);
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // Load contacts for a group
  const loadGroupContacts = async (groupId: string) => {
    setLoadingContacts(groupId);
    const { data } = await supabase
      .from("dispatch_group_contacts")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });
    if (data) {
      setGroupContacts((prev) => ({ ...prev, [groupId]: data.map(c => ({ ...c, name: c.name || "", phone: c.phone, source: c.source || "manual" })) }));
    }
    setLoadingContacts(null);
  };

  const toggleGroup = (groupId: string) => {
    if (expandedGroup === groupId) {
      setExpandedGroup(null);
    } else {
      setExpandedGroup(groupId);
      if (!groupContacts[groupId]) {
        loadGroupContacts(groupId);
      }
    }
  };

  // Create group
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast({ title: "Erro", description: "Nome do grupo é obrigatório", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase.from("dispatch_groups").insert({
        user_id: user.id,
        name: newGroupName.trim(),
        description: newGroupDesc.trim(),
      });
      if (error) throw error;
      toast({ title: "Criado!", description: `Grupo "${newGroupName}" criado com sucesso.` });
      setNewGroupName("");
      setNewGroupDesc("");
      loadGroups();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao criar grupo";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    }
    setCreating(false);
  };

  // Delete group
  const handleDeleteGroup = async (groupId: string) => {
    try {
      const { error } = await supabase.from("dispatch_groups").delete().eq("id", groupId);
      if (error) throw error;
      toast({ title: "Removido!", description: "Grupo removido com sucesso." });
      setExpandedGroup(null);
      loadGroups();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao remover";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    }
  };

  // Delete contact from group
  const handleDeleteContact = async (contactId: string, groupId: string) => {
    try {
      await supabase.from("dispatch_group_contacts").delete().eq("id", contactId);
      loadGroupContacts(groupId);
      loadGroups();
    } catch {
      toast({ title: "Erro", description: "Erro ao remover contato", variant: "destructive" });
    }
  };

  // Fetch WhatsApp contacts from Evolution
  const fetchWhatsAppContacts = async () => {
    if (!importInstance) {
      toast({ title: "Erro", description: "Selecione uma instância", variant: "destructive" });
      return;
    }
    setImportingFrom("contacts");
    setWhatsappContacts([]);
    setWhatsappGroups([]);
    setSelectedImports(new Set());
    try {
      const result = await callEvolution("fetchContacts", importInstance) as WhatsAppContact[];
      const contacts = Array.isArray(result) ? result.filter((c: WhatsAppContact) => c.id && !c.id.includes("@g.us")) : [];
      setWhatsappContacts(contacts);
      if (contacts.length === 0) {
        toast({ title: "Nenhum contato encontrado", description: "Nenhum contato retornado pela API" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao buscar contatos";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    }
  };

  // Fetch WhatsApp groups from Evolution
  const fetchWhatsAppGroups = async () => {
    if (!importInstance) {
      toast({ title: "Erro", description: "Selecione uma instância", variant: "destructive" });
      return;
    }
    setImportingFrom("groups");
    setWhatsappContacts([]);
    setWhatsappGroups([]);
    setSelectedImports(new Set());
    try {
      const result = await callEvolution("fetchGroups", importInstance) as WhatsAppGroup[];
      const groupsList = Array.isArray(result) ? result : [];
      setWhatsappGroups(groupsList);
      if (groupsList.length === 0) {
        toast({ title: "Nenhum grupo encontrado", description: "Nenhum grupo retornado pela API" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao buscar grupos";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    }
  };

  const toggleImportItem = (id: string) => {
    setSelectedImports((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllImports = () => {
    const items = importingFrom === "contacts" ? filteredContacts : filteredGroups;
    const ids = items.map((i) => importingFrom === "contacts" ? (i as WhatsAppContact).id : (i as WhatsAppGroup).id);
    if (selectedImports.size === ids.length) {
      setSelectedImports(new Set());
    } else {
      setSelectedImports(new Set(ids));
    }
  };

  // Save selected contacts/groups to dispatch group
  const handleSaveImports = async () => {
    if (!importTargetGroup) {
      toast({ title: "Erro", description: "Selecione o grupo de destino", variant: "destructive" });
      return;
    }
    if (selectedImports.size === 0) {
      toast({ title: "Erro", description: "Selecione ao menos um item", variant: "destructive" });
      return;
    }

    setSavingImport(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const contacts: { group_id: string; user_id: string; name: string; phone: string; source: string }[] = [];

      if (importingFrom === "contacts") {
        for (const id of selectedImports) {
          const contact = whatsappContacts.find((c) => c.id === id);
          if (contact) {
            const phone = contact.id.replace("@s.whatsapp.net", "").replace("@c.us", "");
            contacts.push({
              group_id: importTargetGroup,
              user_id: user.id,
              name: contact.pushName || contact.name || phone,
              phone,
              source: "whatsapp_contact",
            });
          }
        }
      } else if (importingFrom === "groups") {
        // For groups, we just add the group JID as a "contact" to dispatch to
        for (const id of selectedImports) {
          const group = whatsappGroups.find((g) => g.id === id);
          if (group) {
            contacts.push({
              group_id: importTargetGroup,
              user_id: user.id,
              name: group.subject,
              phone: group.id,
              source: "whatsapp_group",
            });
          }
        }
      }

      if (contacts.length > 0) {
        const { error } = await supabase.from("dispatch_group_contacts").insert(contacts);
        if (error) throw error;
      }

      toast({ title: "Importado!", description: `${contacts.length} contato(s) adicionados ao grupo.` });
      setSelectedImports(new Set());
      setWhatsappContacts([]);
      setWhatsappGroups([]);
      setImportingFrom(null);
      loadGroups();
      if (expandedGroup === importTargetGroup) {
        loadGroupContacts(importTargetGroup);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao importar";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    }
    setSavingImport(false);
  };

  const filteredContacts = whatsappContacts.filter((c) => {
    const name = c.pushName || c.name || c.id;
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredGroups = whatsappGroups.filter((g) =>
    g.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Create group */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5" /> Criar Grupo de Disparo
          </CardTitle>
          <CardDescription>Crie grupos para organizar contatos e disparar mensagens</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome do grupo</Label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Ex: Leads restaurantes SP"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
                placeholder="Ex: Leads de restaurantes em São Paulo"
              />
            </div>
          </div>
          <Button onClick={handleCreateGroup} disabled={creating || !newGroupName.trim()}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Criar Grupo
          </Button>
        </CardContent>
      </Card>

      {/* Groups list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" /> Meus Grupos
              </CardTitle>
              <CardDescription>{groups.length} grupo(s) criado(s)</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadGroups} disabled={loadingGroups}>
              <RefreshCw className={`h-4 w-4 ${loadingGroups ? "animate-spin" : ""}`} /> Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingGroups ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : groups.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum grupo criado ainda.</p>
          ) : (
            <div className="space-y-2">
              {groups.map((group) => (
                <div key={group.id} className="border rounded-lg overflow-hidden">
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleGroup(group.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{group.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {group.contactCount} contato(s) {group.description ? `• ${group.description}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                      {expandedGroup === group.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>

                  {expandedGroup === group.id && (
                    <div className="border-t p-3 bg-muted/20">
                      {loadingContacts === group.id ? (
                        <div className="flex items-center gap-2 text-muted-foreground py-2 justify-center">
                          <Loader2 className="h-4 w-4 animate-spin" /> Carregando contatos...
                        </div>
                      ) : (groupContacts[group.id] || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">Nenhum contato neste grupo.</p>
                      ) : (
                        <div className="max-h-48 overflow-y-auto divide-y">
                          {(groupContacts[group.id] || []).map((contact) => (
                            <div key={contact.id} className="flex items-center justify-between py-2 px-1">
                              <div>
                                <p className="text-sm font-medium">{contact.name}</p>
                                <p className="text-xs text-muted-foreground">{contact.phone} • {contact.source}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleDeleteContact(contact.id, group.id)}
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import contacts from WhatsApp */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" /> Importar Contatos do WhatsApp
          </CardTitle>
          <CardDescription>Puxe contatos ou grupos do WhatsApp via Evolution API e adicione a um grupo de disparo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Instância</Label>
              <select
                value={importInstance}
                onChange={(e) => setImportInstance(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Selecione uma instância...</option>
                {savedInstances.map((inst) => (
                  <option key={inst.instanceName} value={inst.instanceName}>
                    {inst.instanceName} {inst.owner ? `(+${inst.owner})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Grupo de destino</Label>
              <select
                value={importTargetGroup}
                onChange={(e) => setImportTargetGroup(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Selecione um grupo...</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name} ({g.contactCount} contatos)</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={fetchWhatsAppContacts}
              disabled={!importInstance || importingFrom === "contacts"}
            >
              {importingFrom === "contacts" && whatsappContacts.length === 0 ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Puxar Contatos
            </Button>
            <Button
              variant="outline"
              onClick={fetchWhatsAppGroups}
              disabled={!importInstance || importingFrom === "groups"}
            >
              {importingFrom === "groups" && whatsappGroups.length === 0 ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Users className="h-4 w-4" />
              )}
              Puxar Grupos
            </Button>
          </div>

          {/* Contacts/Groups list */}
          {importingFrom && (whatsappContacts.length > 0 || whatsappGroups.length > 0) && (
            <div className="space-y-3 border rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar..."
                  className="h-8"
                />
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {importingFrom === "contacts"
                    ? `${filteredContacts.length} contatos`
                    : `${filteredGroups.length} grupos`}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={toggleAllImports}>
                    {selectedImports.size === (importingFrom === "contacts" ? filteredContacts.length : filteredGroups.length)
                      ? "Desmarcar todos"
                      : "Selecionar todos"}
                  </Button>
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto divide-y">
                {importingFrom === "contacts" &&
                  filteredContacts.map((contact) => {
                    const phone = contact.id.replace("@s.whatsapp.net", "").replace("@c.us", "");
                    return (
                      <label key={contact.id} className="flex items-center gap-3 p-2 cursor-pointer hover:bg-muted/50 transition-colors">
                        <Checkbox
                          checked={selectedImports.has(contact.id)}
                          onCheckedChange={() => toggleImportItem(contact.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{contact.pushName || contact.name || phone}</p>
                          <p className="text-xs text-muted-foreground">{phone}</p>
                        </div>
                      </label>
                    );
                  })}

                {importingFrom === "groups" &&
                  filteredGroups.map((group) => (
                    <label key={group.id} className="flex items-center gap-3 p-2 cursor-pointer hover:bg-muted/50 transition-colors">
                      <Checkbox
                        checked={selectedImports.has(group.id)}
                        onCheckedChange={() => toggleImportItem(group.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{group.subject}</p>
                        <p className="text-xs text-muted-foreground">{group.size} participantes • {group.id}</p>
                      </div>
                    </label>
                  ))}
              </div>

              <Button
                onClick={handleSaveImports}
                disabled={savingImport || selectedImports.size === 0 || !importTargetGroup}
                className="w-full"
              >
                {savingImport ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</>
                ) : (
                  <><Download className="h-4 w-4" /> Importar {selectedImports.size} selecionado(s)</>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DispatchGroupsTab;
