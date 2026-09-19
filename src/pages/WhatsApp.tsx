import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { MessageSquare, Plug, Settings, RefreshCw, Trash2, Loader2, Check, X, QrCode, Send, Phone, Shield, Save, Database, Smile, Sparkles, RefreshCcw, Smartphone, Users, Pause, Play, StopCircle, Timer, Image, Type, Upload, FileText, Clock, BarChart3 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import DispatchGroupsTab from "@/components/DispatchGroupsTab";
import WhatsAppTextEditor from "@/components/WhatsAppTextEditor";
import MessageTemplatesTab from "@/components/MessageTemplatesTab";
import ScheduleDispatchDialog from "@/components/ScheduleDispatchDialog";
import ActiveSchedules from "@/components/ActiveSchedules";
import DispatchReportsTab from "@/components/DispatchReportsTab";

interface Instance {
  instanceName: string;
  instanceId?: string;
  status?: string;
  owner?: string;
  [key: string]: unknown;
}

interface Lead {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  nicho: string | null;
}

interface Mineracao {
  id: string;
  cidade: string;
  palavra_chave: string;
  total_leads: number;
  created_at: string;
}

const WhatsAppPage = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  // Settings state
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [hasSettings, setHasSettings] = useState(false);

  // Instances state
  const [instances, setInstances] = useState<Instance[]>([]); // from API
  const [savedInstances, setSavedInstances] = useState<Instance[]>([]); // from DB
  const [loadingInstances, setLoadingInstances] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);

  // Dispatcher state
  const [mineracoes, setMineracoes] = useState<Mineracao[]>([]);
  const [selectedMineracao, setSelectedMineracao] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [loadingLeads, setLoadingLeads] = useState(false);

  // Dispatch groups state
  const [dispatchGroups, setDispatchGroups] = useState<{ id: string; name: string; contactCount: number }[]>([]);
  const [selectedDispatchGroup, setSelectedDispatchGroup] = useState<string | null>(null);
  const [groupContactsList, setGroupContactsList] = useState<{ id: string; name: string; phone: string }[]>([]);
  const [selectedGroupContacts, setSelectedGroupContacts] = useState<Set<string>>(new Set());
  const [loadingGroupContacts, setLoadingGroupContacts] = useState(false);
  const [dispatchInstance, setDispatchInstance] = useState<string | null>(null);
  const [dispatchMode, setDispatchMode] = useState<"specific" | "roundrobin">("specific");
  const [dispatchType, setDispatchType] = useState<"text" | "media">("text");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ sent: 0, total: 0 });
  const [dispatchPaused, setDispatchPaused] = useState(false);
  const [nextDelay, setNextDelay] = useState(0); // countdown in seconds
  const cancelRef = useRef(false);
  const pauseRef = useRef(false);

  // Templates for quick load
  const [dispatchTemplates, setDispatchTemplates] = useState<{ id: string; name: string; content: string; type: string; media_url?: string | null }[]>([]);

  // Anti-ban settings
  const [minDelay, setMinDelay] = useState(5);
  const [maxDelay, setMaxDelay] = useState(15);
  const [batchSize, setBatchSize] = useState(10);
  const [batchPause, setBatchPause] = useState(60);
  const [dailyLimit, setDailyLimit] = useState(100);

  // Random variation settings
  const [variationEnabled, setVariationEnabled] = useState(true);
  const [variationEmojis, setVariationEmojis] = useState("🎯,🔥,✅,🚀,✨,⭐,💰,💡,💎,👊,😍");

  // AI variation settings
  const [aiVariationEnabled, setAiVariationEnabled] = useState(false);
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [openaiModel, setOpenaiModel] = useState("gpt-4o-mini");
  const [savingOpenaiKey, setSavingOpenaiKey] = useState(false);

  // Schedule state
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleRefreshKey, setScheduleRefreshKey] = useState(0);

  const callEvolution = useCallback(async (action: string, instanceName?: string, data?: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Não autenticado");

    const res = await supabase.functions.invoke("evolution-api", {
      body: { action, instanceName, data },
    });

    if (res.error) throw new Error(res.error.message);
    return res.data;
  }, []);

  // Load settings
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("user_settings")
        .select("evolution_api_url, evolution_api_key, openai_api_key")
        .maybeSingle();

      if (data) {
        if (data.evolution_api_url && data.evolution_api_key) {
          setApiUrl(data.evolution_api_url);
          setApiKey(data.evolution_api_key);
          setHasSettings(true);
        }
        if (data.openai_api_key) {
          setOpenaiApiKey(data.openai_api_key);
        }
      }
    };
    load();
  }, []);

  // Load saved instances from DB
  useEffect(() => {
    const loadSaved = async () => {
      setLoadingSaved(true);
      const { data } = await supabase
        .from("saved_instances")
        .select("instance_name, instance_id, status, owner")
        .order("created_at", { ascending: false });
      if (data) {
        setSavedInstances(data.map((d) => ({
          instanceName: d.instance_name,
          instanceId: d.instance_id || "",
          status: d.status || "",
          owner: d.owner || "",
        })));
      }
      setLoadingSaved(false);
    };
    loadSaved();
  }, []);

  // Load mineracoes for dispatcher
  useEffect(() => {
    const loadMineracoes = async () => {
      const { data } = await supabase
        .from("mineracoes")
        .select("id, cidade, palavra_chave, total_leads, created_at")
        .order("created_at", { ascending: false });
      if (data) setMineracoes(data);
    };
    loadMineracoes();
  }, []);

  // Load templates for dispatcher
  useEffect(() => {
    const loadDispatchTemplates = async () => {
      const { data } = await supabase
        .from("message_templates")
        .select("id, name, content, type, media_url")
        .order("created_at", { ascending: false });
      if (data) setDispatchTemplates(data);
    };
    loadDispatchTemplates();
  }, []);

  // Load dispatch groups
  useEffect(() => {
    const loadDispatchGroups = async () => {
      const { data } = await supabase
        .from("dispatch_groups")
        .select("id, name")
        .order("created_at", { ascending: false });
      if (data) {
        const withCounts = [];
        for (const g of data) {
          const { count } = await supabase
            .from("dispatch_group_contacts")
            .select("*", { count: "exact", head: true })
            .eq("group_id", g.id);
          withCounts.push({ ...g, contactCount: count || 0 });
        }
        setDispatchGroups(withCounts);
      }
    };
    loadDispatchGroups();
  }, []);

  const handleSelectDispatchGroup = async (groupId: string) => {
    setSelectedDispatchGroup(groupId);
    setLoadingGroupContacts(true);
    const { data } = await supabase
      .from("dispatch_group_contacts")
      .select("id, name, phone")
      .eq("group_id", groupId);
    if (data) {
      setGroupContactsList(data.map(c => ({ ...c, name: c.name || "" })));
      setSelectedGroupContacts(new Set(data.map((c) => c.id)));
    }
    setLoadingGroupContacts(false);
  };

  const toggleGroupContact = (id: string) => {
    setSelectedGroupContacts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllGroupContacts = () => {
    if (selectedGroupContacts.size === groupContactsList.length) {
      setSelectedGroupContacts(new Set());
    } else {
      setSelectedGroupContacts(new Set(groupContactsList.map((c) => c.id)));
    }
  };

  const handleSaveSettings = async () => {
    if (!apiUrl.trim() || !apiKey.trim()) {
      toast({ title: "Erro", description: "Preencha URL e API Key", variant: "destructive" });
      return;
    }
    setSavingSettings(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data: existing } = await supabase
        .from("user_settings")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("user_settings")
          .update({
            evolution_api_url: apiUrl.trim(),
            evolution_api_key: apiKey.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_settings")
          .insert({
            user_id: user.id,
            evolution_api_url: apiUrl.trim(),
            evolution_api_key: apiKey.trim(),
          });
        if (error) throw error;
      }

      setHasSettings(true);
      toast({ title: "Salvo!", description: "Configurações da Evolution API salvas." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setSavingSettings(false);
    }
  };

  const extractPhone = (ownerJid: unknown): string => {
    if (!ownerJid || typeof ownerJid !== "string") return "";
    return ownerJid.replace(/@.*$/, "");
  };

  const normalizeInstances = (raw: unknown): Instance[] => {
    const arr = Array.isArray(raw) ? raw : [];
    return arr.map((item: Record<string, unknown>) => {
      const inst = (item.instance as Record<string, unknown>) || item;
      const phone = extractPhone(inst.ownerJid);
      return {
        instanceName: String(inst.instanceName || inst.name || "unknown"),
        instanceId: String(inst.instanceId || inst.id || ""),
        status: String(inst.connectionStatus || inst.status || inst.state || ""),
        owner: phone || String(inst.profileName || inst.owner || ""),
      };
    });
  };

  const fetchInstances = async () => {
    setLoadingInstances(true);
    try {
      const result = await callEvolution("fetchInstances");
      setInstances(normalizeInstances(result));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao buscar instâncias";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setLoadingInstances(false);
    }
  };

  const saveInstanceToDB = async (inst: Instance) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase.from("saved_instances").upsert({
        user_id: user.id,
        instance_name: inst.instanceName,
        instance_id: inst.instanceId || "",
        status: inst.status || "",
        owner: inst.owner || "",
      }, { onConflict: "user_id,instance_name" });
      if (error) throw error;

      setSavedInstances((prev) => {
        const exists = prev.find((p) => p.instanceName === inst.instanceName);
        if (exists) return prev.map((p) => p.instanceName === inst.instanceName ? inst : p);
        return [inst, ...prev];
      });
      toast({ title: "Salva!", description: `Instância ${inst.instanceName} salva no banco.` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    }
  };

  const removeInstanceFromDB = async (instanceName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase
        .from("saved_instances")
        .delete()
        .eq("user_id", user.id)
        .eq("instance_name", instanceName);
      if (error) throw error;

      setSavedInstances((prev) => prev.filter((p) => p.instanceName !== instanceName));
      toast({ title: "Removida!", description: `Instância ${instanceName} removida do banco.` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao remover";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    }
  };

  const checkConnection = async (name: string) => {
    try {
      const result = await callEvolution("connectionState", name);
      setConnectionState(result?.instance?.state || result?.state || "unknown");
    } catch {
      setConnectionState("error");
    }
  };

  const getQrCode = async (name: string) => {
    setLoadingQr(true);
    setQrCode(null);
    try {
      const result = await callEvolution("getQrcode", name);
      const code = result?.base64 || result?.qrcode?.base64 || result?.code || null;
      setQrCode(code);
      if (!code) {
        toast({ title: "Info", description: "Instância já conectada ou QR não disponível." });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao gerar QR";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setLoadingQr(false);
    }
  };

  const handleSelectInstance = (name: string) => {
    setSelectedInstance(name);
    setQrCode(null);
    setConnectionState(null);
    checkConnection(name);
  };

  const handleLogout = async (name: string) => {
    try {
      await callEvolution("logout", name);
      toast({ title: "Desconectado", description: `Instância ${name} desconectada.` });
      setConnectionState("close");
      setQrCode(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao desconectar";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    }
  };

  // Dispatcher functions
  const loadLeads = async (mineracaoId: string) => {
    setLoadingLeads(true);
    setSelectedLeads(new Set());
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("id, nome, telefone, email, nicho")
        .eq("mineracao_id", mineracaoId)
        .not("telefone", "is", null);
      if (error) throw error;
      setLeads(data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar leads";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setLoadingLeads(false);
    }
  };

  const handleSelectMineracao = (id: string) => {
    setSelectedMineracao(id);
    loadLeads(id);
  };

  const toggleLead = (id: string) => {
    setSelectedLeads((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllLeads = () => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(leads.map((l) => l.id)));
    }
  };

  const cleanPhone = (phone: string): string => {
    return phone.replace(/\D/g, "");
  };

  const handleMediaUpload = async (file: File) => {
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
    setUploadingMedia(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("dispatch-media").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("dispatch-media").getPublicUrl(path);
      setMediaUrl(urlData.publicUrl);
      toast({ title: "Upload concluído", description: "Mídia pronta para envio." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro no upload";
      toast({ title: "Erro", description: msg, variant: "destructive" });
      setMediaFile(null);
      setMediaPreview(null);
      setMediaUrl(null);
    } finally {
      setUploadingMedia(false);
    }
  };

  const getMediaType = (file: File | null): string => {
    if (!file) return "image";
    const type = file.type;
    if (type.startsWith("video/")) return "video";
    if (type.startsWith("audio/")) return "audio";
    if (type === "application/pdf" || type.includes("document")) return "document";
    return "image";
  };

  const handleDispatch = async () => {
    if (dispatchMode === "specific" && !dispatchInstance) {
      toast({ title: "Erro", description: "Selecione uma instância para envio", variant: "destructive" });
      return;
    }
    if (dispatchMode === "roundrobin" && dispatchableInstances.length === 0) {
      toast({ title: "Erro", description: "Nenhuma instância salva para rodízio", variant: "destructive" });
      return;
    }
    const totalSelected = selectedLeads.size + selectedGroupContacts.size;
    if (totalSelected === 0) {
      toast({ title: "Erro", description: "Selecione ao menos um lead ou contato de grupo", variant: "destructive" });
      return;
    }
    if (!messageText.trim() && dispatchType === "text") {
      toast({ title: "Erro", description: "Digite a mensagem para enviar", variant: "destructive" });
      return;
    }
    if (dispatchType === "media" && !mediaUrl) {
      toast({ title: "Erro", description: "Faça upload de uma mídia antes de disparar", variant: "destructive" });
      return;
    }

    setSending(true);
    cancelRef.current = false;
    pauseRef.current = false;
    setDispatchPaused(false);
    setNextDelay(0);

    // Combine leads from mineração + group contacts into a unified list
    const fromMineracao = leads
      .filter((l) => selectedLeads.has(l.id) && l.telefone)
      .map((l) => ({ nome: l.nome, telefone: l.telefone!, nicho: l.nicho }));

    const fromGroup = groupContactsList
      .filter((c) => selectedGroupContacts.has(c.id))
      .map((c) => ({ nome: c.name, telefone: c.phone, nicho: null as string | null }));

    let allContacts = [...fromMineracao, ...fromGroup];

    // Apply daily limit
    if (allContacts.length > dailyLimit) {
      allContacts = allContacts.slice(0, dailyLimit);
      toast({ title: "Limite diário", description: `Enviando para ${dailyLimit} contatos (limite anti-ban).` });
    }

    setSendProgress({ sent: 0, total: allContacts.length });

    const waitWithCountdown = (seconds: number): Promise<boolean> => {
      return new Promise((resolve) => {
        let remaining = Math.ceil(seconds);
        setNextDelay(remaining);
        const tick = () => {
          if (cancelRef.current) { setNextDelay(0); resolve(false); return; }
          if (pauseRef.current) { setTimeout(tick, 200); return; }
          remaining--;
          setNextDelay(remaining);
          if (remaining <= 0) { resolve(true); return; }
          setTimeout(tick, 1000);
        };
        setTimeout(tick, 1000);
      });
    };

    const waitForResume = (): Promise<boolean> => {
      return new Promise((resolve) => {
        const check = () => {
          if (cancelRef.current) { resolve(false); return; }
          if (!pauseRef.current) { resolve(true); return; }
          setTimeout(check, 200);
        };
        check();
      });
    };

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < allContacts.length; i++) {
      // Check cancel
      if (cancelRef.current) break;
      // Check pause
      if (pauseRef.current) {
        const resumed = await waitForResume();
        if (!resumed) break;
      }

      const contact = allContacts[i];
      try {
        const number = cleanPhone(contact.telefone);
        let personalizedMsg = messageText
          .replace(/\{nome\}/gi, contact.nome)
          .replace(/\{nicho\}/gi, contact.nicho || "");

        // AI variation: rewrite message to be unique
        if (aiVariationEnabled) {
          try {
            const { data: aiData, error: aiError } = await supabase.functions.invoke("ai-rewrite", {
              body: { message: personalizedMsg, leadName: contact.nome, leadNicho: contact.nicho, model: openaiModel },
            });
            if (!aiError && aiData?.rewritten) {
              personalizedMsg = aiData.rewritten;
            }
          } catch {
            // fallback to original message if AI fails
          }
        }

        // Add random emoji variation to make each message unique
        if (variationEnabled && variationEmojis.trim()) {
          const emojis = variationEmojis.split(/[,\s]+/).filter(Boolean);
          if (emojis.length > 0) {
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
            personalizedMsg = `${personalizedMsg} ${randomEmoji}`;
          }
        }

        // Determine which instance to use
        const currentInstance = dispatchMode === "roundrobin"
          ? dispatchableInstances[i % dispatchableInstances.length].instanceName
          : dispatchInstance!;

        if (dispatchType === "media" && mediaUrl) {
          await callEvolution("sendMedia", currentInstance, {
            number,
            mediatype: getMediaType(mediaFile),
            media: mediaUrl,
            caption: personalizedMsg,
            fileName: mediaFile?.name || "media",
          });
        } else {
          await callEvolution("sendText", currentInstance, {
            number,
            text: personalizedMsg,
          });
        }
        successCount++;
      } catch {
        errorCount++;
      }
      setSendProgress((prev) => ({ ...prev, sent: prev.sent + 1 }));

      // Random delay between minDelay and maxDelay with countdown
      if (i + 1 < allContacts.length) {
        const delaySec = Math.random() * (maxDelay - minDelay) + minDelay;
        const continued = await waitWithCountdown(delaySec);
        if (!continued) break;

        // Batch pause: after every batchSize messages, pause for batchPause seconds
        if ((i + 1) % batchSize === 0) {
          toast({ title: "Pausa anti-ban", description: `Aguardando ${batchPause}s após ${i + 1} mensagens...` });
          const continued2 = await waitWithCountdown(batchPause);
          if (!continued2) break;
        }
      }
    }

    setNextDelay(0);
    setSending(false);
    setDispatchPaused(false);
    const wasCancelled = cancelRef.current;
    cancelRef.current = false;
    toast({
      title: wasCancelled ? "Disparo cancelado" : "Disparo concluído!",
      description: `${successCount} enviados, ${errorCount} erros de ${allContacts.length} total.`,
    });
  };

  const handlePauseResume = () => {
    const newState = !pauseRef.current;
    pauseRef.current = newState;
    setDispatchPaused(newState);
  };

  const handleCancel = () => {
    cancelRef.current = true;
    pauseRef.current = false;
    setDispatchPaused(false);
  };

  const handleScheduleDispatch = async (scheduledAt: Date) => {
    setScheduleDialogOpen(false);

    // Build contacts list
    const fromMineracao = leads
      .filter((l) => selectedLeads.has(l.id) && l.telefone)
      .map((l) => ({ nome: l.nome, telefone: l.telefone!, nicho: l.nicho }));
    const fromGroup = groupContactsList
      .filter((c) => selectedGroupContacts.has(c.id))
      .map((c) => ({ nome: c.name, telefone: c.phone, nicho: null as string | null }));
    const allContacts = [...fromMineracao, ...fromGroup];

    if (allContacts.length === 0) {
      toast({ title: "Erro", description: "Selecione ao menos um contato", variant: "destructive" });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase.from("scheduled_dispatches").insert([{
        user_id: user.id,
        scheduled_at: scheduledAt.toISOString(),
        dispatch_type: dispatchType,
        message_text: messageText,
        media_url: dispatchType === "media" ? mediaUrl : null,
        instance_name: dispatchMode === "specific" ? dispatchInstance : dispatchableInstances[0]?.instanceName,
        dispatch_mode: dispatchMode,
        contacts: allContacts,
        min_delay: minDelay,
        max_delay: maxDelay,
        batch_size: batchSize,
        batch_pause: batchPause,
        variation_enabled: variationEnabled,
        variation_emojis: variationEmojis,
      }]);
      if (error) throw error;

      setScheduleRefreshKey((k) => k + 1);
      toast({
        title: "Agendado! ⏰",
        description: `Disparo agendado para ${scheduledAt.toLocaleString("pt-BR")} — ${allContacts.length} contatos.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao agendar";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    }
  };

  const allInstances = [...savedInstances, ...instances.filter((i) => !savedInstances.some((s) => s.instanceName === i.instanceName))];
  // Dispatcher only shows saved instances
  const dispatchableInstances = savedInstances;

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
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">WhatsApp</h1>
            <p className="text-sm text-muted-foreground">Gerencie instâncias e disparos de mensagens</p>
          </div>
        </motion.div>

        <Tabs defaultValue={hasSettings ? "instances" : "settings"}>
          <TabsList className="mb-6 w-full">
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-1.5" /> Configurações
            </TabsTrigger>
            <TabsTrigger value="instances" disabled={!hasSettings}>
              <Plug className="h-4 w-4 mr-1.5" /> Instâncias
            </TabsTrigger>
            <TabsTrigger value="dispatcher" disabled={!hasSettings}>
              <Send className="h-4 w-4 mr-1.5" /> Disparador
            </TabsTrigger>
            <TabsTrigger value="templates" disabled={!hasSettings}>
              <FileText className="h-4 w-4 mr-1.5" /> Templates
            </TabsTrigger>
            <TabsTrigger value="groups" disabled={!hasSettings}>
              <Users className="h-4 w-4 mr-1.5" /> Grupos
            </TabsTrigger>
            <TabsTrigger value="reports" disabled={!hasSettings}>
              <BarChart3 className="h-4 w-4 mr-1.5" /> Relatórios
            </TabsTrigger>
          </TabsList>

          {/* ===== SETTINGS TAB ===== */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Configurações da Evolution API</CardTitle>
                <CardDescription>Informe a URL base e a API Key global do seu servidor</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="evo-url">URL Base</Label>
                  <Input
                    id="evo-url"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    placeholder="https://seu-servidor.com:8080"
                  />
                  <p className="text-xs text-muted-foreground">
                    URL do seu servidor Evolution API (sem barra no final)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="evo-key">API Key Global</Label>
                  <Input
                    id="evo-key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sua_chave_secreta"
                  />
                </div>
                <Button onClick={handleSaveSettings} disabled={savingSettings} className="w-full">
                  {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
                  {hasSettings ? "Atualizar" : "Salvar"} Configurações
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== INSTANCES TAB ===== */}
          <TabsContent value="instances" className="space-y-6">
            {/* Saved instances from DB */}
            <Card>
              <CardHeader>
                <div>
                  <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" /> Instâncias Salvas</CardTitle>
                  <CardDescription>Instâncias salvas no banco de dados</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {loadingSaved ? (
                  <div className="flex items-center gap-2 justify-center py-6 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                  </div>
                ) : savedInstances.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhuma instância salva.</p>
                    <p className="text-xs mt-1">Atualize da API e salve as instâncias desejadas.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {savedInstances.map((inst) => {
                      const name = inst.instanceName;
                      const isSelected = selectedInstance === name;
                      return (
                        <div
                          key={name}
                          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                            isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                          }`}
                          onClick={() => handleSelectInstance(name)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`h-2.5 w-2.5 rounded-full ${
                              inst.status === "open" ? "bg-green-500" : "bg-muted-foreground/30"
                            }`} />
                            <div>
                              <p className="font-medium text-sm">{name}</p>
                              <p className="text-xs text-muted-foreground">{inst.owner ? `📞 +${inst.owner}` : "Sem número"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {isSelected && <Check className="h-4 w-4 text-primary" />}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeInstanceFromDB(name);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Fetch from API */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><RefreshCw className="h-5 w-5" /> Buscar da API</CardTitle>
                  <CardDescription>Carregue instâncias do servidor e salve as desejadas</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchInstances} disabled={loadingInstances}>
                  {loadingInstances ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Atualizar
                </Button>
              </CardHeader>
              <CardContent>
                {instances.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Plug className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Clique em "Atualizar" para carregar instâncias da API.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {instances.map((inst) => {
                      const name = inst.instanceName || "unknown";
                      const isSaved = savedInstances.some((s) => s.instanceName === name);
                      const isSelected = selectedInstance === name;
                      return (
                        <div
                          key={name}
                          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                            isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                          }`}
                          onClick={() => handleSelectInstance(name)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`h-2.5 w-2.5 rounded-full ${
                              inst.status === "open" ? "bg-green-500" : "bg-muted-foreground/30"
                            }`} />
                            <div>
                              <p className="font-medium text-sm">{name}</p>
                              <p className="text-xs text-muted-foreground">{inst.owner ? `📞 +${inst.owner}` : "Sem número conectado"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {isSelected && <Check className="h-4 w-4 text-primary" />}
                            <Button
                              variant={isSaved ? "secondary" : "outline"}
                              size="sm"
                              className="h-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                saveInstanceToDB(inst);
                              }}
                              disabled={isSaved}
                            >
                              {isSaved ? <><Check className="h-3.5 w-3.5" /> Salva</> : <><Save className="h-3.5 w-3.5" /> Salvar</>}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedInstance && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Instância: {selectedInstance}</CardTitle>
                  <CardDescription>
                    Status: <span className={`font-medium ${connectionState === "open" ? "text-green-600" : "text-yellow-600"}`}>
                      {connectionState || "verificando..."}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => checkConnection(selectedInstance)}>
                      <RefreshCw className="h-4 w-4" /> Verificar Status
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => getQrCode(selectedInstance)} disabled={loadingQr}>
                      {loadingQr ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                      Gerar QR Code
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleLogout(selectedInstance)}>
                      <X className="h-4 w-4" /> Desconectar
                    </Button>
                  </div>

                  {qrCode && (
                    <div className="flex flex-col items-center gap-3 p-4 border rounded-lg bg-card">
                      <p className="text-sm font-medium text-foreground">Escaneie o QR Code com o WhatsApp</p>
                      <img
                        src={qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`}
                        alt="QR Code WhatsApp"
                        className="w-64 h-64 object-contain"
                      />
                      <p className="text-xs text-muted-foreground">
                        Abra o WhatsApp → Menu → Dispositivos conectados → Conectar dispositivo
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ===== DISPATCHER TAB ===== */}
          <TabsContent value="dispatcher" className="space-y-6">
            {/* Active Schedules */}
            <ActiveSchedules refreshKey={scheduleRefreshKey} />

            {/* Instance selector */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" /> Selecionar Instância
                </CardTitle>
                <CardDescription>Escolha uma instância específica ou use rodízio inteligente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {dispatchableInstances.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <p className="text-sm">Nenhuma instância salva.</p>
                    <p className="text-xs mt-1">Vá na aba "Instâncias", atualize da API e salve as desejadas.</p>
                  </div>
                ) : (
                  <>
                    {/* Specific instance option */}
                    <div
                      className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                        dispatchMode === "specific" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                      }`}
                      onClick={() => setDispatchMode("specific")}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          <Smartphone className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Instância</p>
                          <p className="font-bold text-sm">ESPECÍFICA</p>
                        </div>
                      </div>
                      <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                        dispatchMode === "specific" ? "border-primary" : "border-muted-foreground"
                      }`}>
                        {dispatchMode === "specific" && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                      </div>
                    </div>

                    {/* Instance cards when specific mode */}
                    {dispatchMode === "specific" && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {dispatchableInstances.map((inst) => (
                          <div
                            key={inst.instanceName}
                            onClick={() => setDispatchInstance(inst.instanceName)}
                            className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                              dispatchInstance === inst.instanceName
                                ? "border-primary bg-primary/10"
                                : "border-border hover:bg-muted/50"
                            }`}
                          >
                            <div className={`h-9 w-9 rounded-full flex items-center justify-center ${
                              dispatchInstance === inst.instanceName ? "bg-primary/20" : "bg-muted"
                            }`}>
                              <Smartphone className={`h-4 w-4 ${
                                dispatchInstance === inst.instanceName ? "text-primary" : "text-muted-foreground"
                              }`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">{inst.instanceName}</p>
                              {inst.owner && (
                                <p className="text-xs text-muted-foreground">+{inst.owner}</p>
                              )}
                            </div>
                            <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              dispatchInstance === inst.instanceName ? "border-primary" : "border-muted-foreground/40"
                            }`}>
                              {dispatchInstance === inst.instanceName && <div className="h-2 w-2 rounded-full bg-primary" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Round-robin option */}
                    <div
                      className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                        dispatchMode === "roundrobin" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                      }`}
                      onClick={() => { setDispatchMode("roundrobin"); setDispatchInstance(null); }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          <RefreshCcw className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Multi-Instância</p>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm">RODÍZIO INTELIGENTE</p>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/20 text-primary border-0">ANTI-BAN</Badge>
                          </div>
                        </div>
                      </div>
                      <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                        dispatchMode === "roundrobin" ? "border-primary" : "border-muted-foreground"
                      }`}>
                        {dispatchMode === "roundrobin" && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                      </div>
                    </div>

                    {dispatchMode === "roundrobin" && (
                      <p className="text-xs text-muted-foreground px-1">
                        {dispatchableInstances.length} instância(s) salva(s) serão usadas em rodízio. Cada mensagem será enviada por uma instância diferente.
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Mineracao selector */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" /> Selecionar Leads
                </CardTitle>
                <CardDescription>Escolha uma mineração para carregar os leads com telefone</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Mineração</Label>
                  <select
                    value={selectedMineracao || ""}
                    onChange={(e) => handleSelectMineracao(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">Selecione uma mineração...</option>
                    {mineracoes.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.palavra_chave} em {m.cidade} — {m.total_leads} leads ({new Date(m.created_at).toLocaleDateString("pt-BR")})
                      </option>
                    ))}
                  </select>
                </div>

                {loadingLeads && (
                  <div className="flex items-center gap-2 text-muted-foreground py-4">
                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando leads...
                  </div>
                )}

                {!loadingLeads && leads.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{leads.length} leads com telefone</p>
                      <Button variant="outline" size="sm" onClick={toggleAllLeads}>
                        {selectedLeads.size === leads.length ? "Desmarcar todos" : "Selecionar todos"}
                      </Button>
                    </div>
                    <div className="max-h-64 overflow-y-auto border rounded-lg divide-y">
                      {leads.map((lead) => (
                        <label
                          key={lead.id}
                          className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                        >
                          <Checkbox
                            checked={selectedLeads.has(lead.id)}
                            onCheckedChange={() => toggleLead(lead.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{lead.nome}</p>
                            <p className="text-xs text-muted-foreground">{lead.telefone} {lead.nicho ? `• ${lead.nicho}` : ""}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selectedLeads.size} de {leads.length} selecionados
                    </p>
                  </div>
                )}

                {!loadingLeads && selectedMineracao && leads.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum lead com telefone nesta mineração.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Dispatch Groups selector */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" /> Carregar de Grupos de Contatos
                </CardTitle>
                <CardDescription>Selecione um grupo de disparo para incluir seus contatos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {dispatchGroups.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum grupo criado. Vá na aba "Grupos" para criar.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {dispatchGroups.map((group) => (
                      <div
                        key={group.id}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedDispatchGroup === group.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                        }`}
                        onClick={() => handleSelectDispatchGroup(group.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-3 w-3 rounded-full border-2 flex items-center justify-center ${
                            selectedDispatchGroup === group.id ? "border-primary" : "border-muted-foreground"
                          }`}>
                            {selectedDispatchGroup === group.id && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{group.name}</p>
                            <p className="text-xs text-muted-foreground">{group.contactCount} contato(s)</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {loadingGroupContacts && (
                  <div className="flex items-center gap-2 text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando contatos do grupo...
                  </div>
                )}

                {!loadingGroupContacts && selectedDispatchGroup && groupContactsList.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{groupContactsList.length} contatos no grupo</p>
                      <Button variant="outline" size="sm" onClick={toggleAllGroupContacts}>
                        {selectedGroupContacts.size === groupContactsList.length ? "Desmarcar todos" : "Selecionar todos"}
                      </Button>
                    </div>
                    <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                      {groupContactsList.map((contact) => (
                        <label
                          key={contact.id}
                          className="flex items-center gap-3 p-2 cursor-pointer hover:bg-muted/50 transition-colors"
                        >
                          <Checkbox
                            checked={selectedGroupContacts.has(contact.id)}
                            onCheckedChange={() => toggleGroupContact(contact.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{contact.name}</p>
                            <p className="text-xs text-muted-foreground">{contact.phone}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selectedGroupContacts.size} de {groupContactsList.length} selecionados
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" /> Configuração Anti-Ban
                </CardTitle>
                <CardDescription>Ajuste os parâmetros para evitar bloqueio do número</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="minDelay">Delay mínimo (segundos)</Label>
                    <Input
                      id="minDelay"
                      type="number"
                      min={1}
                      max={120}
                      value={minDelay}
                      onChange={(e) => setMinDelay(Number(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">Tempo mínimo entre mensagens</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxDelay">Delay máximo (segundos)</Label>
                    <Input
                      id="maxDelay"
                      type="number"
                      min={1}
                      max={300}
                      value={maxDelay}
                      onChange={(e) => setMaxDelay(Number(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">Tempo máximo entre mensagens</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="batchSize">Mensagens por lote</Label>
                    <Input
                      id="batchSize"
                      type="number"
                      min={1}
                      max={100}
                      value={batchSize}
                      onChange={(e) => setBatchSize(Number(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">Quantidade antes de pausar</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="batchPause">Pausa entre lotes (segundos)</Label>
                    <Input
                      id="batchPause"
                      type="number"
                      min={10}
                      max={600}
                      value={batchPause}
                      onChange={(e) => setBatchPause(Number(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">Pausa longa após cada lote</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <Label htmlFor="dailyLimit">Limite diário de envios</Label>
                  <Input
                    id="dailyLimit"
                    type="number"
                    min={1}
                    max={1000}
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Máximo de mensagens por sessão de disparo</p>
                </div>
                <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3 flex items-center gap-3">
                  <Timer className="h-5 w-5 text-primary shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">
                      Delay: <span className="text-primary">{minDelay}s</span> – <span className="text-primary">{maxDelay}s</span> entre mensagens
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Lote de {batchSize} msgs → pausa de {batchPause}s · Limite: {dailyLimit}/sessão
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Random Variation */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <Smile className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Variação Aleatória</CardTitle>
                      <CardDescription>Adiciona emojis aleatórios no final para tornar cada mensagem única</CardDescription>
                    </div>
                  </div>
                  <Switch checked={variationEnabled} onCheckedChange={setVariationEnabled} />
                </div>
              </CardHeader>
              {variationEnabled && (
                <CardContent>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                      Emojis para usar (separados por vírgula ou espaço)
                    </Label>
                    <Input
                      value={variationEmojis}
                      onChange={(e) => setVariationEmojis(e.target.value)}
                      placeholder="🎯,🔥,✅,🚀,✨"
                      className="text-lg"
                    />
                  </div>
                </CardContent>
              )}
            </Card>

            {/* AI Variation */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">Variação por IA</CardTitle>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">PREMIUM</Badge>
                      </div>
                      <CardDescription>
                        Usa inteligência artificial para reescrever cada mensagem de forma única, simulando comportamento humano
                      </CardDescription>
                    </div>
                  </div>
                  <Switch checked={aiVariationEnabled} onCheckedChange={setAiVariationEnabled} />
                </div>
              </CardHeader>
              {aiVariationEnabled && (
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Modelo de IA OpenAI</Label>
                      <select
                        value={openaiModel}
                        onChange={(e) => setOpenaiModel(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="gpt-4o-mini">GPT-4o Mini (Econômico)</option>
                        <option value="gpt-4o">GPT-4o (Recomendado)</option>
                        <option value="gpt-4">GPT-4 (Avançado)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Chave de API</Label>
                      <Input
                        type="password"
                        value={openaiApiKey}
                        onChange={(e) => setOpenaiApiKey(e.target.value)}
                        placeholder="sk-..."
                      />
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                        Sua chave é armazenada com segurança e nunca exposta no navegador.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={savingOpenaiKey || !openaiApiKey.trim()}
                    onClick={async () => {
                      setSavingOpenaiKey(true);
                      try {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (!user) throw new Error("Não autenticado");
                        const { data: existing } = await supabase
                          .from("user_settings")
                          .select("id")
                          .eq("user_id", user.id)
                          .maybeSingle();
                        if (existing) {
                          await supabase
                            .from("user_settings")
                            .update({ openai_api_key: openaiApiKey.trim(), updated_at: new Date().toISOString() })
                            .eq("user_id", user.id);
                        } else {
                          await supabase
                            .from("user_settings")
                            .insert({ user_id: user.id, openai_api_key: openaiApiKey.trim() });
                        }
                        toast({ title: "Salvo!", description: "Chave da API OpenAI salva com sucesso." });
                      } catch (err: unknown) {
                        const msg = err instanceof Error ? err.message : "Erro ao salvar";
                        toast({ title: "Erro", description: msg, variant: "destructive" });
                      }
                      setSavingOpenaiKey(false);
                    }}
                  >
                    {savingOpenaiKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Salvar Chave
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    A IA irá reescrever cada mensagem com variações naturais, mantendo o sentido original. Isso torna cada envio único e reduz chances de detecção por padrão repetitivo.
                  </p>
                </CardContent>
              )}
            </Card>

            {/* Message composer */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" /> Mensagem
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Dispatch type selector */}
                <div className="flex gap-2">
                  <Button
                    variant={dispatchType === "text" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setDispatchType("text")}
                  >
                    <Type className="h-4 w-4" /> Texto
                  </Button>
                  <Button
                    variant={dispatchType === "media" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setDispatchType("media")}
                  >
                    <Image className="h-4 w-4" /> Mídia
                  </Button>
                </div>

                {/* Template selector as modal */}
                {dispatchTemplates.length > 0 && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <FileText className="h-4 w-4" />
                        Carregar template
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Selecionar Template</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-2 max-h-[60vh] overflow-y-auto pr-1">
                        {dispatchTemplates.map((t) => (
                          <DialogTrigger key={t.id} asChild>
                            <div
                              onClick={() => {
                                setMessageText(t.content);
                                setDispatchType(t.type as "text" | "media");
                                if (t.type === "media" && t.media_url) {
                                  setMediaUrl(t.media_url);
                                  setMediaPreview(t.media_url);
                                }
                                toast({ title: "Template carregado", description: `"${t.name}" aplicado.` });
                              }}
                              className="flex items-center gap-3 p-3 rounded-lg border-2 border-border cursor-pointer transition-all hover:border-primary hover:bg-primary/5"
                            >
                              <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                                {t.type === "media" ? (
                                  <Image className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Type className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm truncate">{t.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{t.content.slice(0, 80)}{t.content.length > 80 ? "..." : ""}</p>
                              </div>
                            </div>
                          </DialogTrigger>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                )}

                {/* Media upload area */}
                {dispatchType === "media" && (
                  <div className="space-y-3">
                    {!mediaPreview ? (
                      <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-6 cursor-pointer hover:bg-muted/50 transition-colors">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Clique para enviar imagem, vídeo, áudio ou documento</p>
                        <p className="text-xs text-muted-foreground">PNG, JPG, MP4, MP3, PDF (máx 20MB)</p>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleMediaUpload(file);
                          }}
                        />
                      </label>
                    ) : (
                      <div className="relative rounded-lg border border-border overflow-hidden">
                        {mediaFile?.type.startsWith("image/") || (!mediaFile && mediaPreview) ? (
                          <img src={mediaPreview!} alt="Preview" className="w-full max-h-48 object-cover" />
                        ) : mediaFile?.type.startsWith("video/") ? (
                          <video src={mediaPreview!} className="w-full max-h-48" controls />
                        ) : (
                          <div className="flex items-center gap-3 p-4 bg-muted/30">
                            <Image className="h-8 w-8 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{mediaFile?.name || "Mídia do template"}</p>
                              <p className="text-xs text-muted-foreground">{mediaFile ? (mediaFile.size / 1024 / 1024).toFixed(2) + " MB" : ""}</p>
                            </div>
                          </div>
                        )}
                        {uploadingMedia && (
                          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          </div>
                        )}
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-7 w-7"
                          onClick={() => {
                            setMediaFile(null);
                            setMediaPreview(null);
                            setMediaUrl(null);
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {dispatchType === "media" ? "A legenda abaixo será enviada junto com a mídia" : ""}
                    </p>
                  </div>
                )}

                <WhatsAppTextEditor
                  value={messageText}
                  onChange={setMessageText}
                  placeholder={dispatchType === "media" ? "Legenda da mídia (opcional)... Use {nome} para personalizar" : "Digite sua mensagem... Use {nome} para personalizar"}
                  rows={dispatchType === "media" ? 2 : 4}
                  showVariables
                />

                {sending && (
                  <div className="space-y-3">
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${sendProgress.total > 0 ? (sendProgress.sent / sendProgress.total) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {dispatchPaused ? "⏸️ Pausado" : "Enviando"} {sendProgress.sent} de {sendProgress.total}
                      </p>
                      {nextDelay > 0 && !dispatchPaused && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Timer className="h-3.5 w-3.5" />
                          <span>Próximo em <strong className="text-foreground">{nextDelay}s</strong></span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={handlePauseResume}
                      >
                        {dispatchPaused ? (
                          <><Play className="h-4 w-4" /> Retomar</>
                        ) : (
                          <><Pause className="h-4 w-4" /> Pausar</>
                        )}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        onClick={handleCancel}
                      >
                        <StopCircle className="h-4 w-4" /> Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleDispatch}
                    disabled={
                      sending ||
                      (selectedLeads.size + selectedGroupContacts.size === 0) ||
                      (dispatchMode === "specific" && !dispatchInstance) ||
                      (dispatchType === "text" && !messageText.trim()) ||
                      (dispatchType === "media" && !mediaUrl) ||
                      uploadingMedia
                    }
                    className="flex-1"
                  >
                    {sending ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
                    ) : (
                      <><Send className="h-4 w-4" /> Disparar agora</>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setScheduleDialogOpen(true)}
                    disabled={
                      sending ||
                      (selectedLeads.size + selectedGroupContacts.size === 0) ||
                      (dispatchMode === "specific" && !dispatchInstance) ||
                      (dispatchType === "text" && !messageText.trim()) ||
                      (dispatchType === "media" && !mediaUrl) ||
                      uploadingMedia
                    }
                  >
                    <Clock className="h-4 w-4" /> Agendar
                  </Button>
                </div>

                <ScheduleDispatchDialog
                  open={scheduleDialogOpen}
                  onOpenChange={setScheduleDialogOpen}
                  onConfirm={handleScheduleDispatch}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== TEMPLATES TAB ===== */}
          <TabsContent value="templates" className="space-y-6">
            <MessageTemplatesTab onLoadTemplate={(content, type, mediaUrlFromTemplate) => {
              setMessageText(content);
              setDispatchType(type);
              if (type === "media" && mediaUrlFromTemplate) {
                setMediaUrl(mediaUrlFromTemplate);
                setMediaPreview(mediaUrlFromTemplate);
              }
            }} />
          </TabsContent>

          {/* ===== GROUPS TAB ===== */}
          <TabsContent value="groups" className="space-y-6">
            <DispatchGroupsTab savedInstances={savedInstances} callEvolution={callEvolution} />
          </TabsContent>

          {/* ===== REPORTS TAB ===== */}
          <TabsContent value="reports" className="space-y-6">
            <DispatchReportsTab />
          </TabsContent>
        </Tabs>
      </motion.main>
    </div>
  );
};

export default WhatsAppPage;
