import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, KeyRound, CheckCircle2 } from "lucide-react";

const PROVIDERS = [
  { id: "lovable", label: "Sistema (incluso — sem chave)", defaultModel: "google/gemini-2.5-flash", needsKey: false },
  { id: "openai", label: "OpenAI", defaultModel: "gpt-4o-mini", needsKey: true },
  { id: "groq", label: "Groq", defaultModel: "llama-3.3-70b-versatile", needsKey: true },
  { id: "gemini", label: "Google Gemini (chave própria)", defaultModel: "gemini-2.0-flash", needsKey: true },
  { id: "anthropic", label: "Anthropic (Claude)", defaultModel: "claude-3-5-haiku-20241022", needsKey: true },
  { id: "openrouter", label: "OpenRouter", defaultModel: "openai/gpt-4o-mini", needsKey: true },
];

const PROVIDER_MODELS: Record<string, { id: string; label: string }[]> = {
  lovable: [
    { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (rápido)" },
    { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { id: "openai/gpt-5-mini", label: "GPT-5 Mini" },
    { id: "openai/gpt-5", label: "GPT-5" },
  ],
  openai: [
    { id: "gpt-4o", label: "GPT-4o" },
    { id: "gpt-4o-mini", label: "GPT-4o Mini" },
    { id: "gpt-4-turbo", label: "GPT-4 Turbo" },
  ],
  groq: [
    { id: "llama-3.3-70b-versatile", label: "LLaMA 3.3 70B" },
    { id: "llama-3.1-8b-instant", label: "LLaMA 3.1 8B (rápido)" },
    { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
  ],
  gemini: [
    { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
  ],
  anthropic: [
    { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku (rápido)" },
    { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
    { id: "claude-3-opus-20240229", label: "Claude 3 Opus" },
  ],
  openrouter: [
    { id: "openai/gpt-4o-mini", label: "GPT-4o Mini (via OpenRouter)" },
    { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet (via OR)" },
    { id: "google/gemini-2.0-flash-exp:free", label: "Gemini 2.0 Flash (free)" },
    { id: "meta-llama/llama-3.3-70b-instruct", label: "LLaMA 3.3 70B (via OR)" },
  ],
};

const normalizeModelForProvider = (provider: string, model?: string | null) => {
  const raw = (model || "").trim();
  if (raw === "google/gemini-3-flash-preview") return provider === "groq" ? "llama-3.3-70b-versatile" : provider === "openai" ? "gpt-4o-mini" : provider === "gemini" ? "gemini-2.0-flash" : "google/gemini-2.5-flash";
  if (raw === "gemini-2.0-flash-exp") return "gemini-2.0-flash";
  const ids = (PROVIDER_MODELS[provider] || []).map((m) => m.id);
  return ids.includes(raw) ? raw : (ids[0] || "google/gemini-2.5-flash");
};

export default function AIProviderSettings() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("ai_provider_configs").select("*").eq("user_id", user.id);
    setItems(data || []);
  };
  useEffect(() => { load(); }, [user]);

  const newItem = () => {
    const p = PROVIDERS[0];
    setEditing({ provider: p.id, api_key_encrypted: "", default_model: p.defaultModel, is_active: true, is_default: false });
  };

  const handleProviderChange = (provId: string) => {
    const p = PROVIDERS.find(x => x.id === provId);
    setEditing({ ...editing, provider: provId, default_model: p?.defaultModel || PROVIDER_MODELS[provId]?.[0]?.id || "" });
  };

  const save = async () => {
    if (!user) return;
    const provider = editing.provider || "lovable";
    const payload: any = {
      ...editing,
      default_model: normalizeModelForProvider(provider, editing.default_model),
      user_id: user.id,
      label: PROVIDERS.find(p => p.id === provider)?.label || provider,
    };
    delete payload.created_at;
    const { error } = editing.id
      ? await supabase.from("ai_provider_configs").update(payload).eq("id", editing.id)
      : await supabase.from("ai_provider_configs").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Salvo");
    setEditing(null); load();
  };

  if (editing) {
    const provInfo = PROVIDERS.find(p => p.id === editing.provider);
    const models = PROVIDER_MODELS[editing.provider] || [];
    return (
      <Card className="p-6 space-y-3">
        <h3 className="font-semibold">{editing.id ? "Editar" : "Novo"} provedor</h3>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <Label>Provedor</Label>
            <select className="w-full h-10 px-3 rounded-md border border-input bg-background"
              value={editing.provider} onChange={(e) => handleProviderChange(e.target.value)}>
              {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>

          {provInfo?.needsKey && (
            <div>
              <Label>API Key</Label>
              <Input type="password" value={editing.api_key_encrypted || ""}
                onChange={(e) => setEditing({ ...editing, api_key_encrypted: e.target.value })} />
            </div>
          )}

          <div>
            <Label>Modelo padrão</Label>
            <select className="w-full h-10 px-3 rounded-md border border-input bg-background"
              value={editing.default_model || ""}
              onChange={(e) => setEditing({ ...editing, default_model: e.target.value })}>
              {models.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={save}>Salvar</Button>
          <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Provedores de IA</h3>
        </div>
        <Button size="sm" onClick={newItem}><Plus className="h-4 w-4 mr-1" />Novo provedor</Button>
      </div>
      <Card className="p-3 bg-primary/5 border-primary/30">
        <p className="text-sm flex items-center gap-2 text-foreground">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          O provedor do sistema já vem incluso. Adicione provedores próprios só se quiser usar OpenAI/Groq/Gemini diretamente.
        </p>
      </Card>
      {items.map((it) => (
        <Card key={it.id} className="p-4 flex items-center justify-between">
          <div>
            <p className="font-medium capitalize">{it.provider}</p>
            <p className="text-xs text-muted-foreground">{it.default_model}</p>
            {it.is_default && <Badge className="mt-1">Padrão</Badge>}
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => setEditing(it)}>Editar</Button>
            <Button size="sm" variant="ghost" onClick={async () => {
              await supabase.from("ai_provider_configs").delete().eq("id", it.id); load();
            }}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
