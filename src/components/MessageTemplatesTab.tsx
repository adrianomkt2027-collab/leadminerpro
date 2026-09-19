import { useState, useEffect } from "react";
import { FileText, Plus, Trash2, Loader2, Edit2, Save, X, Send, Image, Type, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import WhatsAppTextEditor from "@/components/WhatsAppTextEditor";

interface Template {
  id: string;
  name: string;
  content: string;
  type: "text" | "media";
  media_url?: string | null;
  created_at: string;
}

interface MessageTemplatesTabProps {
  onLoadTemplate: (content: string, type: "text" | "media", mediaUrl?: string) => void;
}

const MessageTemplatesTab = ({ onLoadTemplate }: MessageTemplatesTabProps) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formType, setFormType] = useState<"text" | "media">("text");
  const [formMediaFile, setFormMediaFile] = useState<File | null>(null);
  const [formMediaPreview, setFormMediaPreview] = useState<string | null>(null);
  const [formMediaUrl, setFormMediaUrl] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const loadTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("message_templates")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setTemplates(data as Template[]);
    setLoading(false);
  };

  useEffect(() => { loadTemplates(); }, []);

  const handleMediaUpload = async (file: File) => {
    setFormMediaFile(file);
    setFormMediaPreview(URL.createObjectURL(file));
    setUploadingMedia(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const ext = file.name.split(".").pop() || "jpg";
      const path = `templates/${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("dispatch-media").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("dispatch-media").getPublicUrl(path);
      setFormMediaUrl(urlData.publicUrl);
      toast({ title: "Upload concluído", description: "Mídia pronta." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro no upload";
      toast({ title: "Erro", description: msg, variant: "destructive" });
      setFormMediaFile(null);
      setFormMediaPreview(null);
      setFormMediaUrl(null);
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast({ title: "Erro", description: "Preencha o nome do template", variant: "destructive" });
      return;
    }
    if (formType === "text" && !formContent.trim()) {
      toast({ title: "Erro", description: "Preencha o conteúdo da mensagem", variant: "destructive" });
      return;
    }
    if (formType === "media" && !formMediaUrl) {
      toast({ title: "Erro", description: "Faça upload de uma mídia", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const payload: Record<string, unknown> = {
        name: formName.trim(),
        content: formContent,
        type: formType,
        media_url: formType === "media" ? formMediaUrl : null,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error } = await supabase.from("message_templates").update(payload).eq("id", editingId);
        if (error) throw error;
        toast({ title: "Atualizado!", description: "Template atualizado." });
      } else {
        (payload as Record<string, unknown>).user_id = user.id;
        const { error } = await supabase.from("message_templates").insert([payload as any]);
        if (error) throw error;
        toast({ title: "Salvo!", description: "Template criado." });
      }

      resetForm();
      loadTemplates();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("message_templates").delete().eq("id", id);
      if (error) throw error;
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast({ title: "Removido!", description: "Template excluído." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao excluir";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    }
  };

  const handleEdit = (t: Template) => {
    setEditingId(t.id);
    setFormName(t.name);
    setFormContent(t.content);
    setFormType(t.type);
    setFormMediaUrl(t.media_url || null);
    setFormMediaPreview(t.media_url || null);
    setFormMediaFile(null);
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormName("");
    setFormContent("");
    setFormType("text");
    setFormMediaFile(null);
    setFormMediaPreview(null);
    setFormMediaUrl(null);
  };

  return (
    <div className="space-y-6">
      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {editingId ? "Editar Template" : "Novo Template"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do template</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Prospecção Tráfego Pago" />
            </div>

            {/* Type selector */}
            <div className="space-y-2">
              <Label>Tipo de disparo</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={formType === "text" ? "default" : "outline"}
                  onClick={() => setFormType("text")}
                  className="flex-1"
                >
                  <Type className="h-4 w-4" /> Texto
                </Button>
                <Button
                  type="button"
                  variant={formType === "media" ? "default" : "outline"}
                  onClick={() => setFormType("media")}
                  className="flex-1"
                >
                  <Image className="h-4 w-4" /> Mídia
                </Button>
              </div>
            </div>

            {/* Media upload for media type */}
            {formType === "media" && (
              <div className="space-y-2">
                <Label>Mídia</Label>
                {formMediaPreview ? (
                  <div className="relative border border-border rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <Image className="h-8 w-8 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{formMediaFile?.name || "Mídia carregada"}</p>
                        {formMediaUrl && <p className="text-xs text-muted-foreground truncate">{formMediaUrl}</p>}
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setFormMediaFile(null); setFormMediaPreview(null); setFormMediaUrl(null); }}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:bg-muted/30 transition-colors">
                    {uploadingMedia ? (
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">Clique para enviar mídia</span>
                        <span className="text-xs text-muted-foreground mt-1">PNG, JPG, MP4, MP3, PDF (max 20MB)</span>
                      </>
                    )}
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,video/*,audio/*,.pdf"
                      onChange={(e) => { if (e.target.files?.[0]) handleMediaUpload(e.target.files[0]); }}
                      disabled={uploadingMedia}
                    />
                  </label>
                )}
              </div>
            )}

            {/* Message content */}
            <div className="space-y-2">
              <Label>{formType === "media" ? "Legenda (opcional)" : "Conteúdo da mensagem"}</Label>
              <WhatsAppTextEditor
                value={formContent}
                onChange={setFormContent}
                placeholder={formType === "media" ? "Legenda da mídia... Use {nome} para personalizar" : "Digite o template da mensagem... Use {nome} para personalizar"}
                rows={6}
                showVariables
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving || uploadingMedia}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editingId ? "Atualizar" : "Salvar"}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                <X className="h-4 w-4" /> Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" /> Novo Template
        </Button>
      )}

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Templates Salvos
          </CardTitle>
          <CardDescription>Clique em "Carregar" para usar no disparador</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 justify-center py-6 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum template criado.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((t) => (
                <div key={t.id} className="border border-border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm">{t.name}</h3>
                      <Badge variant={t.type === "media" ? "secondary" : "outline"} className="text-[10px]">
                        {t.type === "media" ? "📷 Mídia" : "📝 Texto"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onLoadTemplate(t.content, t.type, t.media_url || undefined);
                          toast({ title: "Carregado!", description: `Template "${t.name}" carregado no disparador.` });
                        }}
                      >
                        <Send className="h-3.5 w-3.5" /> Carregar
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(t)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(t.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">{t.content || "(sem texto)"}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MessageTemplatesTab;
