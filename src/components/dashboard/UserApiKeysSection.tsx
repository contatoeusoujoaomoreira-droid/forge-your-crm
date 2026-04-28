import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { KeyRound, Plus, Trash2, Eye, EyeOff, Info, Coins } from "lucide-react";

interface Props {
  userIdOverride?: string; // super admin pode editar chaves de outro usuário
  onRequestCredits?: () => void;
}

const PROVIDER_LIST = [
  { id: "openai", label: "OpenAI", placeholder: "sk-...", url: "https://platform.openai.com/api-keys", help: ["Acesse platform.openai.com → API Keys.", "Clique em Create new secret key.", "Copie e cole aqui (começa com sk-)."] },
  { id: "groq", label: "Groq", placeholder: "gsk_...", url: "https://console.groq.com/keys", help: ["Entre em console.groq.com → Keys.", "Create API Key.", "Copie e cole aqui (começa com gsk_)."] },
  { id: "gemini", label: "Google Gemini", placeholder: "AIza...", url: "https://aistudio.google.com/app/apikey", help: ["Vá em aistudio.google.com/app/apikey.", "Create API Key.", "Copie a chave (começa com AIza)."] },
  { id: "anthropic", label: "Anthropic Claude", placeholder: "sk-ant-...", url: "https://console.anthropic.com/settings/keys", help: ["console.anthropic.com → Settings → Keys.", "Create Key.", "Cole aqui."] },
  { id: "elevenlabs", label: "ElevenLabs (vozes premium)", placeholder: "xi-api-key", url: "https://elevenlabs.io/app/settings/api-keys", help: ["Acesse elevenlabs.io → Profile → API Keys.", "Create Key.", "Cole aqui — usado para TTS/STT em PT-BR."] },
];

const SCOPES = [
  { id: "all", label: "Tudo (todas as ações)" },
  { id: "chat", label: "Chat / agente IA" },
  { id: "tts", label: "Texto → áudio (TTS)" },
  { id: "stt", label: "Áudio → texto (STT)" },
  { id: "vision", label: "Visão (interpretar imagem)" },
  { id: "image", label: "Geração de imagem" },
  { id: "video", label: "Geração de vídeo" },
  { id: "page_generate", label: "Gerar landing pages" },
  { id: "form_generate", label: "Gerar formulários" },
  { id: "quiz_generate", label: "Gerar quizzes" },
  { id: "knowledge_ingest", label: "Ingestão de base de conhecimento" },
  { id: "campaign_writer", label: "Escrita de campanhas / mensagens" },
];

function HelpHint({ steps, url }: { steps: string[]; url?: string }) {
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="inline-flex items-center justify-center h-5 w-5 rounded-full border border-primary/40 text-primary hover:bg-primary/10">
            <Info className="h-3 w-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-sm">
          <ol className="text-xs space-y-1 list-decimal pl-4">
            {steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
          {url && <a href={url} target="_blank" rel="noreferrer" className="text-[11px] underline text-primary block mt-1">Abrir painel oficial →</a>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function UserApiKeysSection({ userIdOverride, onRequestCredits }: Props) {
  const { user } = useAuth();
  const targetUserId = userIdOverride || user?.id;
  const [items, setItems] = useState<any[]>([]);
  const [provider, setProvider] = useState("openai");
  const [scope, setScope] = useState("all");
  const [apiKey, setApiKey] = useState("");
  const [label, setLabel] = useState("");
  const [showKeyId, setShowKeyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!targetUserId) return;
    const { data } = await supabase.from("user_api_keys").select("*").eq("user_id", targetUserId).order("created_at", { ascending: false });
    setItems(data || []);
  };
  useEffect(() => { load(); }, [targetUserId]);

  const save = async () => {
    if (!targetUserId || !apiKey.trim()) { toast.error("Informe a chave"); return; }
    setSaving(true);
    const { error } = await supabase.from("user_api_keys").insert({
      user_id: targetUserId, provider, scope, label: label || `${provider}-${scope}`, api_key: apiKey.trim(),
    } as any);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Chave salva!");
    setApiKey(""); setLabel("");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta chave?")) return;
    await supabase.from("user_api_keys").delete().eq("id", id);
    load();
  };

  const toggleActive = async (it: any) => {
    await supabase.from("user_api_keys").update({ is_active: !it.is_active }).eq("id", it.id);
    load();
  };

  const current = PROVIDER_LIST.find(p => p.id === provider) || PROVIDER_LIST[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" /> Minhas chaves de provedor (opcional)
          </h3>
          <p className="text-xs text-muted-foreground">Cadastre chaves próprias para usar suas contas. Sem isso, usamos o provedor padrão da plataforma e descontamos créditos.</p>
        </div>
        {onRequestCredits && (
          <Button size="sm" variant="outline" onClick={onRequestCredits}>
            <Coins className="h-3 w-3 mr-1" /> Solicitar mais créditos
          </Button>
        )}
      </div>

      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] uppercase text-muted-foreground block mb-1 flex items-center gap-1">
              Provedor <HelpHint steps={current.help} url={current.url} />
            </label>
            <select value={provider} onChange={(e) => setProvider(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
              {PROVIDER_LIST.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase text-muted-foreground block mb-1">Usar para</label>
            <select value={scope} onChange={(e) => setScope(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
              {SCOPES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase text-muted-foreground block mb-1">Apelido</label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex.: Conta principal" />
          </div>
        </div>
        <div>
          <label className="text-[10px] uppercase text-muted-foreground block mb-1">Chave API</label>
          <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={current.placeholder} className="font-mono text-xs" />
        </div>
        <Button onClick={save} disabled={saving} size="sm">
          <Plus className="h-4 w-4 mr-1" /> {saving ? "Salvando..." : "Adicionar chave"}
        </Button>
      </Card>

      {items.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">Nenhuma chave própria — usaremos o provedor padrão da plataforma.</Card>
      ) : items.map((it) => {
        const masked = (it.api_key || "").slice(0, 6) + "•••••" + (it.api_key || "").slice(-4);
        const showing = showKeyId === it.id;
        return (
          <Card key={it.id} className="p-3 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="capitalize">{it.provider}</Badge>
                <Badge variant="outline" className="text-[10px]">{SCOPES.find(s => s.id === it.scope)?.label || it.scope}</Badge>
                {it.is_active ? <Badge className="text-[10px]">Ativa</Badge> : <Badge variant="outline" className="text-[10px]">Inativa</Badge>}
                {it.label && <span className="text-xs text-muted-foreground">· {it.label}</span>}
              </div>
              <code className="text-[11px] font-mono text-muted-foreground truncate">
                {showing ? it.api_key : masked}
              </code>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => setShowKeyId(showing ? null : it.id)} title={showing ? "Esconder" : "Mostrar"}>
                {showing ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => toggleActive(it)}>{it.is_active ? "Desativar" : "Ativar"}</Button>
              <Button size="icon" variant="ghost" onClick={() => remove(it.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
