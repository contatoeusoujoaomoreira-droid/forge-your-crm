import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MessageCircle, Key, Bot, Zap, Copy, CheckCircle2, AlertCircle } from "lucide-react";

const PROVIDERS = [
  { id: "z-api", label: "Z-API (recomendado)" },
  { id: "evolution", label: "Evolution API" },
  { id: "ultramsg", label: "UltraMsg" },
  { id: "custom", label: "Custom" },
];

export default function AutomationHub() {
  const { user } = useAuth();
  const [tab, setTab] = useState("whatsapp");
  const [waCfg, setWaCfg] = useState<any>({ api_type: "z-api", base_url: "", api_token: "", instance_id: "", is_active: true, auto_create_lead: true });
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [providerKeys, setProviderKeys] = useState<any[]>([]);
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [agentForm, setAgentForm] = useState({ name: "", type: "atendimento", system_prompt: "", personality: "", tone: "profissional" });
  const [testing, setTesting] = useState(false);

  const webhookUrl = `https://jdsomjwynxetccrcdszt.supabase.co/functions/v1/webhook-receiver`;

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [cfg, keys, ags, providers] = await Promise.all([
        supabase.from("whatsapp_configs").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("api_keys").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("ai_agents").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("ai_provider_configs").select("*").eq("user_id", user.id),
      ]);
      if (cfg.data) setWaCfg(cfg.data);
      setApiKeys(keys.data || []);
      setAgents(ags.data || []);
      setProviderKeys(providers.data || []);
    })();
  }, [user]);

  const saveWa = async () => {
    if (!user) return;
    const payload = { ...waCfg, user_id: user.id };
    delete payload.created_at;
    delete payload.updated_at;
    const { error } = waCfg.id
      ? await supabase.from("whatsapp_configs").update(payload).eq("id", waCfg.id)
      : await supabase.from("whatsapp_configs").insert(payload).select().single().then((r) => { if (r.data) setWaCfg(r.data); return r; });
    if (error) toast.error(error.message);
    else toast.success("Configuração salva!");
  };

  const testWa = async () => {
    setTesting(true);
    const { data, error } = await supabase.functions.invoke("test-whatsapp", { body: waCfg });
    setTesting(false);
    if (error) toast.error(error.message);
    else if (data?.ok) toast.success("Conexão OK!");
    else toast.error(`Falhou: ${data?.body || data?.error || "erro"}`);
  };

  const createApiKey = async () => {
    if (!user || !newKeyLabel) return;
    const raw = `obc_${crypto.randomUUID().replace(/-/g, "")}`;
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
    const { error } = await supabase.from("api_keys").insert({
      user_id: user.id, label: newKeyLabel, key_hash: hash, key_preview: raw.slice(0, 12) + "..." + raw.slice(-4),
    });
    if (error) { toast.error(error.message); return; }
    setNewKeyValue(raw);
    setNewKeyLabel("");
    const { data } = await supabase.from("api_keys").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setApiKeys(data || []);
    toast.success("Chave criada! Copie agora — não será exibida novamente.");
  };

  const createAgent = async () => {
    if (!user || !agentForm.name) return;
    const { error } = await supabase.from("ai_agents").insert({ ...agentForm, user_id: user.id });
    if (error) { toast.error(error.message); return; }
    toast.success("Agente criado!");
    setAgentForm({ name: "", type: "atendimento", system_prompt: "", personality: "", tone: "profissional" });
    const { data } = await supabase.from("ai_agents").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setAgents(data || []);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><Zap className="text-primary" /> Automação</h2>
        <p className="text-sm text-muted-foreground">Conecte WhatsApp, configure agentes IA e dispare campanhas de prospecção ativa.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="whatsapp"><MessageCircle className="h-4 w-4 mr-1" />WhatsApp</TabsTrigger>
          <TabsTrigger value="apikeys"><Key className="h-4 w-4 mr-1" />API Keys</TabsTrigger>
          <TabsTrigger value="agents"><Bot className="h-4 w-4 mr-1" />Agentes IA</TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp" className="space-y-4">
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold">Provedor WhatsApp</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <select className="w-full h-10 px-3 rounded-md border border-input bg-background" value={waCfg.api_type} onChange={(e) => setWaCfg({ ...waCfg, api_type: e.target.value })}>
                  {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <Label>Instance ID</Label>
                <Input value={waCfg.instance_id || ""} onChange={(e) => setWaCfg({ ...waCfg, instance_id: e.target.value })} placeholder="3ABC..." />
              </div>
              <div className="col-span-2">
                <Label>Base URL</Label>
                <Input value={waCfg.base_url || ""} onChange={(e) => setWaCfg({ ...waCfg, base_url: e.target.value })} placeholder="https://api.z-api.io" />
              </div>
              <div className="col-span-2">
                <Label>Token</Label>
                <Input type="password" value={waCfg.api_token || ""} onChange={(e) => setWaCfg({ ...waCfg, api_token: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Headers extras (JSON, ex: Z-API Client-Token)</Label>
                <Textarea rows={2} value={typeof waCfg.extra_headers === "object" ? JSON.stringify(waCfg.extra_headers) : (waCfg.extra_headers || "")} onChange={(e) => { try { setWaCfg({ ...waCfg, extra_headers: JSON.parse(e.target.value || "{}") }); } catch { setWaCfg({ ...waCfg, extra_headers: e.target.value }); } }} placeholder='{"Client-Token":"..."}' />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={waCfg.is_active} onCheckedChange={(v) => setWaCfg({ ...waCfg, is_active: v })} />
                <Label>Ativo</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={waCfg.auto_create_lead} onCheckedChange={(v) => setWaCfg({ ...waCfg, auto_create_lead: v })} />
                <Label>Auto-criar lead</Label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={saveWa}>Salvar</Button>
              <Button variant="outline" onClick={testWa} disabled={testing}>{testing ? "Testando..." : "Testar Conexão"}</Button>
            </div>
          </Card>

          <Card className="p-6 space-y-3 border-primary/30">
            <h3 className="font-semibold flex items-center gap-2"><AlertCircle className="h-4 w-4 text-primary" />Webhook de Recebimento</h3>
            <p className="text-sm text-muted-foreground">No painel da Z-API (ou outro provedor), configure o webhook "ao receber" apontando para a URL abaixo. Inclua sua API Key no parâmetro <code className="bg-muted px-1 rounded">?api_key=SUA_KEY</code>.</p>
            <div className="flex gap-2">
              <Input readOnly value={webhookUrl} className="font-mono text-xs" />
              <Button size="icon" variant="outline" onClick={() => copyToClipboard(webhookUrl)}><Copy className="h-4 w-4" /></Button>
            </div>
            <p className="text-xs text-muted-foreground">Crie uma API Key na próxima aba e cole na URL como query param.</p>
          </Card>
        </TabsContent>

        <TabsContent value="apikeys" className="space-y-4">
          <Card className="p-6 space-y-3">
            <h3 className="font-semibold">Criar nova API Key</h3>
            <div className="flex gap-2">
              <Input placeholder="Ex: WhatsApp Z-API" value={newKeyLabel} onChange={(e) => setNewKeyLabel(e.target.value)} />
              <Button onClick={createApiKey}>Gerar</Button>
            </div>
            {newKeyValue && (
              <div className="p-3 rounded-md bg-primary/10 border border-primary space-y-2">
                <p className="text-xs font-semibold text-primary flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Copie agora — não será exibida novamente:</p>
                <div className="flex gap-2">
                  <code className="flex-1 p-2 rounded bg-background text-xs font-mono break-all">{newKeyValue}</code>
                  <Button size="icon" variant="outline" onClick={() => copyToClipboard(newKeyValue)}><Copy className="h-4 w-4" /></Button>
                </div>
              </div>
            )}
          </Card>
          <Card className="p-4">
            {apiKeys.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">Nenhuma chave criada</p> : (
              <ul className="divide-y divide-border">
                {apiKeys.map(k => (
                  <li key={k.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{k.label}</p>
                      <p className="text-xs text-muted-foreground font-mono">{k.key_preview}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={k.is_active ? "default" : "secondary"}>{k.is_active ? "Ativa" : "Inativa"}</Badge>
                      <Button size="sm" variant="ghost" onClick={async () => {
                        await supabase.from("api_keys").delete().eq("id", k.id);
                        setApiKeys(apiKeys.filter(x => x.id !== k.id));
                      }}>Excluir</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <Card className="p-6 space-y-3">
            <h3 className="font-semibold">Criar agente IA</h3>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Nome (ex: SDR)" value={agentForm.name} onChange={(e) => setAgentForm({ ...agentForm, name: e.target.value })} />
              <select className="h-10 px-3 rounded-md border border-input bg-background" value={agentForm.type} onChange={(e) => setAgentForm({ ...agentForm, type: e.target.value })}>
                <option value="atendimento">Atendimento</option>
                <option value="prospeccao">Prospecção</option>
                <option value="sdr">SDR</option>
                <option value="closer">Closer</option>
                <option value="suporte">Suporte</option>
              </select>
              <Input placeholder="Personalidade (ex: empático, direto)" value={agentForm.personality} onChange={(e) => setAgentForm({ ...agentForm, personality: e.target.value })} />
              <Input placeholder="Tom (ex: profissional, descontraído)" value={agentForm.tone} onChange={(e) => setAgentForm({ ...agentForm, tone: e.target.value })} />
            </div>
            <Textarea rows={5} placeholder="System Prompt — instrução principal do agente" value={agentForm.system_prompt} onChange={(e) => setAgentForm({ ...agentForm, system_prompt: e.target.value })} />
            <Button onClick={createAgent}>Criar Agente</Button>
            <p className="text-xs text-muted-foreground">Por padrão usa Lovable AI (Gemini Flash). Sem custo de setup adicional.</p>
          </Card>
          <Card className="p-4">
            {agents.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">Nenhum agente criado</p> : (
              <ul className="divide-y divide-border">
                {agents.map(a => (
                  <li key={a.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{a.type} · tokens: {a.total_tokens_used || 0}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={a.is_active ? "default" : "secondary"}>{a.is_active ? "Ativo" : "Inativo"}</Badge>
                      <Button size="sm" variant="ghost" onClick={async () => {
                        await supabase.from("ai_agents").delete().eq("id", a.id);
                        setAgents(agents.filter(x => x.id !== a.id));
                      }}>Excluir</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
