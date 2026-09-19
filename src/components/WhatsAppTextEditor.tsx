import { useRef, useCallback } from "react";
import { Bold, Italic, Strikethrough, Code, Quote, List, User, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface WhatsAppTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  showVariables?: boolean;
}

const WhatsAppTextEditor = ({ value, onChange, placeholder, rows = 4, showVariables = false }: WhatsAppTextEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wrapSelection = useCallback((before: string, after: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.substring(start, end);
    const newText = value.substring(0, start) + before + selected + after + value.substring(end);
    onChange(newText);
    requestAnimationFrame(() => {
      el.focus();
      if (selected) {
        el.setSelectionRange(start, end + before.length + after.length);
      } else {
        const pos = start + before.length;
        el.setSelectionRange(pos, pos);
      }
    });
  }, [value, onChange]);

  const insertAtCursor = useCallback((text: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newText = value.substring(0, start) + text + value.substring(end);
    onChange(newText);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + text.length;
      el.setSelectionRange(pos, pos);
    });
  }, [value, onChange]);

  const formatActions = [
    { icon: Bold, label: "Negrito", action: () => wrapSelection("*", "*") },
    { icon: Italic, label: "Itálico", action: () => wrapSelection("_", "_") },
    { icon: Strikethrough, label: "Riscado", action: () => wrapSelection("~", "~") },
    { icon: Code, label: "Monospace", action: () => wrapSelection("```", "```") },
    { icon: Quote, label: "Citação", action: () => wrapSelection("> ", "") },
    { icon: List, label: "Lista", action: () => wrapSelection("- ", "") },
  ];

  const variables = [
    { key: "{nome}", label: "Nome", icon: User, description: "Nome do lead/contato" },
    { key: "{nicho}", label: "Nicho", icon: Briefcase, description: "Nicho do lead" },
  ];

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-0.5 rounded-t-md border border-b-0 border-input bg-muted/30 px-2 py-1">
        {formatActions.map(({ icon: Icon, label, action }) => (
          <Button
            key={label}
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={action}
            title={label}
          >
            <Icon className="h-4 w-4" />
          </Button>
        ))}

        {showVariables && (
          <>
            <div className="h-5 w-px bg-border mx-1" />
            {variables.map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs gap-1"
                onClick={() => insertAtCursor(key)}
                title={`Inserir variável ${key}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Button>
            ))}
          </>
        )}

        <span className="ml-auto text-[11px] text-muted-foreground hidden sm:inline">
          Selecione o texto e aplique a formatação
        </span>
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="flex w-full rounded-b-md rounded-t-none border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 -mt-1"
      />

      <div className="flex flex-wrap gap-2 pt-1">
        <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">*negrito*</span>
        <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">_itálico_</span>
        <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">~riscado~</span>
        <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">`mono`</span>
        {showVariables && (
          <>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 font-mono">{"{nome}"} = Nome do lead</Badge>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 font-mono">{"{nicho}"} = Nicho do lead</Badge>
          </>
        )}
      </div>
    </div>
  );
};

export default WhatsAppTextEditor;
