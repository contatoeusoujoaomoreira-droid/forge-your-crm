import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Globe, Key, Plus, Trash2, ExternalLink, Copy, ChevronDown, ChevronRight,
  Info, AlertCircle, CheckCircle2,
} from "lucide-react";

interface Domain {
  id: string;
  domain: string;
  isActive: boolean;
}

interface ApiKey {
  id: string;
  name: string;
  provider: string;
  key: string;
  isActive: boolean;
}

const LLM_PROVIDERS = [
  { id: "openai", name: "OpenAI (GPT)", placeholder: "sk-..." },
  { id: "anthropic", name: "Anthropic (Claude)", placeholder: "sk-ant-..." },
  { id: "google", name: "Google (Gemini)", placeholder: "AIza..." },
  { id: "groq", name: "Groq", placeholder: "gsk_..." },
  { id: "mistral", name: "Mistral AI", placeholder: "..." },
  { id: "cohere", name: "Cohere", placeholder: "..." },
  { id: "deepseek", name: "DeepSeek", placeholder: "sk-..." },
  { id: "together", name: "Together AI", placeholder: "..." },
  { id: "fireworks", name: "Fireworks AI", placeholder: "..." },
  { id: "perplexity", name: "Perplexity", placeholder: "pplx-..." },
  { id: "openrouter", name: "OpenRouter", placeholder: "sk-or-..." },
  { id: "huggingface", name: "Hugging Face", placeholder: "hf_..." },
  { id: "custom", name: "Outro / Custom", placeholder: "..." },
];

const DNS_INSTRUCTIONS = [
  {
    provider: "Cloudflare",
    steps: [
      "Acesse o painel do Cloudflare → DNS → Records",
      "Adicione um registro CNAME apontando seu domínio para o endereço fornecido pelo sistema",
      "Desative o proxy (nuvem laranja) se necessário",
      "Aguarde propagação DNS (até 24h)",
    ],
  },
  {
    provider: "GoDaddy",
    steps: [
      "Acesse My Products → DNS → Manage",
      "Adicione um registro CNAME com Host = @ e Value = endereço do sistema",
      "Para www, adicione outro CNAME com Host = www",
      "TTL: 1 hora. Aguarde propagação.",
    ],
  },
  {
    provider: "Namecheap",
    steps: [
      "Acesse Domain List → Manage → Advanced DNS",
      "Adicione registro CNAME: Host = @, Value = endereço do sistema",
      "Para www: Host = www, Value = endereço do sistema",
      "Aguarde até 48h para propagação.",
    ],
  },
  {
    provider: "HostGator",
    steps: [
      "Acesse cPanel → Zone Editor",
      "Adicione registro CNAME apontando para o endereço do sistema",
      "Salve e aguarde propagação.",
    ],
  },
  {
    provider: "Registro.br",
    steps: [
      "Acesse Registro.br → Meus Domínios → DNS",
      "Edite a Zona DNS do domínio",
      "Adicione registro CNAME apontando para o endereço do sistema",
      "Aguarde propagação (pode levar até 72h).",
    ],
  },
  {
    provider: "Google Domains",
    steps: [
      "Acesse Google Domains → DNS → Custom Records",
      "Adicione CNAME: Host = @, Data = endereço do sistema",
      "Adicione outro para www se desejado",
      "Aguarde propagação.",
    ],
  },
  {
    provider: "AWS Route 53",
    steps: [
      "Acesse Route 53 → Hosted Zones → seu domínio",
      "Crie Record Set → Type: CNAME",
      "Value: endereço do sistema",
      "TTL: 300. Aguarde propagação.",
    ],
  },
];

const SettingsPage = () => {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [newApiName, setNewApiName] = useState("");
  const [newApiProvider, setNewApiProvider] = useState("openai");
  const [newApiKey, setNewApiKey] = useState("");
  const [showAddDomain, setShowAddDomain] = useState(false);
  const [showAddApi, setShowAddApi] = useState(false);
  const [expandedDns, setExpandedDns] = useState<string | null>(null);
  const { toast } = useToast();

  // Load from localStorage (user-scoped settings)
  useEffect(() => {
    const savedDomains = localStorage.getItem("forge_domains");
    const savedKeys = localStorage.getItem("forge_api_keys");
    if (savedDomains) setDomains(JSON.parse(savedDomains));
    if (savedKeys) setApiKeys(JSON.parse(savedKeys));
  }, []);

  const saveDomains = (d: Domain[]) => {
    setDomains(d);
    localStorage.setItem("forge_domains", JSON.stringify(d));
  };

  const saveApiKeys = (k: ApiKey[]) => {
    setApiKeys(k);
    localStorage.setItem("forge_api_keys", JSON.stringify(k));
  };

  const handleAddDomain = () => {
    if (!newDomain.trim()) return;
    const domain: Domain = { id: crypto.randomUUID(), domain: newDomain.trim().toLowerCase(), isActive: true };
    saveDomains([...domains, domain]);
    setNewDomain("");
    setShowAddDomain(false);
    toast({ title: "Domínio adicionado!" });
  };

  const handleRemoveDomain = (id: string) => {
    saveDomains(domains.filter(d => d.id !== id));
    toast({ title: "Domínio removido" });
  };

  const handleToggleDomain = (id: string) => {
    saveDomains(domains.map(d => d.id === id ? { ...d, isActive: !d.isActive } : d));
  };

  const handleAddApiKey = () => {
    if (!newApiName.trim() || !newApiKey.trim()) return;
    const key: ApiKey = { id: crypto.randomUUID(), name: newApiName.trim(), provider: newApiProvider, key: newApiKey.trim(), isActive: true };
    saveApiKeys([...apiKeys, key]);
    setNewApiName("");
    setNewApiKey("");
    setNewApiProvider("openai");
    setShowAddApi(false);
    toast({ title: "Chave API adicionada!" });
  };

  const handleRemoveApiKey = (id: string) => {
    saveApiKeys(apiKeys.filter(k => k.id !== id));
    toast({ title: "Chave removida" });
  };

  const handleToggleApiKey = (id: string) => {
    saveApiKeys(apiKeys.map(k => k.id === id ? { ...k, isActive: !k.isActive } : k));
  };

  const systemDomain = typeof window !== "undefined" ? window.location.host : "app.forgeai.com";

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Domains Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" /> Domínios Próprios
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Conecte seus domínios ao sistema para usar em landing pages.
            </p>
          </div>
          <Button size="sm" onClick={() => setShowAddDomain(!showAddDomain)}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar Domínio
          </Button>
        </div>

        {showAddDomain && (
          <div className="surface-card rounded-lg p-4 space-y-3">
            <div className="flex gap-2">
              <Input
                value={newDomain}
                onChange={e => setNewDomain(e.target.value)}
                placeholder="seudominio.com.br"
                className="flex-1 bg-secondary/50 border-border"
              />
              <Button onClick={handleAddDomain}>Adicionar</Button>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: "hsl(var(--primary) / 0.05)" }}>
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p className="font-semibold text-foreground mb-1">Apontamento DNS necessário</p>
                <p>Após adicionar, configure um registro <strong>CNAME</strong> apontando para: <code className="px-1.5 py-0.5 rounded text-primary" style={{ background: "hsl(var(--primary) / 0.1)" }}>{systemDomain}</code></p>
              </div>
            </div>
          </div>
        )}

        {domains.length === 0 ? (
          <div className="surface-card rounded-lg p-6 text-center">
            <Globe className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">Nenhum domínio configurado</p>
          </div>
        ) : (
          <div className="space-y-2">
            {domains.map((d) => (
              <div key={d.id} className="surface-card rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${d.isActive ? "bg-primary" : "bg-muted-foreground"}`} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{d.domain}</p>
                    <p className="text-[10px] text-muted-foreground">
                      CNAME → {systemDomain}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={d.isActive} onCheckedChange={() => handleToggleDomain(d.id)} />
                  <Button variant="ghost" size="sm" onClick={() => handleRemoveDomain(d.id)} className="text-destructive h-7 px-2">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* DNS Instructions */}
        <div className="surface-card rounded-lg overflow-hidden">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              Instruções de DNS por Provedor
            </h3>
            <p className="text-xs text-muted-foreground mt-1">Clique no seu provedor para ver as instruções detalhadas.</p>
          </div>
          <div className="divide-y divide-border">
            {DNS_INSTRUCTIONS.map((dns) => (
              <div key={dns.provider}>
                <button
                  onClick={() => setExpandedDns(expandedDns === dns.provider ? null : dns.provider)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors text-left"
                >
                  <span className="text-sm font-medium text-foreground">{dns.provider}</span>
                  {expandedDns === dns.provider ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </button>
                {expandedDns === dns.provider && (
                  <div className="px-4 pb-4">
                    <ol className="space-y-2">
                      {dns.steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                    <div className="mt-3 flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Apontar para:</span>
                      <code className="px-2 py-1 rounded text-primary text-[11px] font-mono" style={{ background: "hsl(var(--primary) / 0.1)" }}>{systemDomain}</code>
                      <button
                        onClick={() => { navigator.clipboard.writeText(systemDomain); toast({ title: "Copiado!" }); }}
                        className="text-primary hover:text-primary/80"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* API Keys Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" /> Chaves de API Externas
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Adicione chaves de API de provedores LLM para usar na geração com IA.
            </p>
          </div>
          <Button size="sm" onClick={() => setShowAddApi(!showAddApi)}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar Chave
          </Button>
        </div>

        {/* Built-in AI notice */}
        <div className="flex items-start gap-3 p-4 rounded-lg" style={{ background: "hsl(var(--primary) / 0.05)", border: "1px solid hsl(var(--primary) / 0.15)" }}>
          <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">IA Nativa incluída</p>
            <p className="text-xs text-muted-foreground mt-1">
              O sistema já inclui IA nativa (Gemini & GPT) sem necessidade de chave. Adicione chaves externas apenas se quiser usar seus próprios tokens ou modelos específicos.
            </p>
          </div>
        </div>

        {showAddApi && (
          <div className="surface-card rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Nome</label>
                <Input value={newApiName} onChange={e => setNewApiName(e.target.value)} placeholder="Minha chave GPT" className="bg-secondary/50 border-border" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Provedor</label>
                <select
                  value={newApiProvider}
                  onChange={e => setNewApiProvider(e.target.value)}
                  className="w-full h-10 rounded-md border border-border bg-secondary/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {LLM_PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">API Key</label>
                <Input
                  type="password"
                  value={newApiKey}
                  onChange={e => setNewApiKey(e.target.value)}
                  placeholder={LLM_PROVIDERS.find(p => p.id === newApiProvider)?.placeholder || "..."}
                  className="bg-secondary/50 border-border"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleAddApiKey}>Salvar Chave</Button>
              <div className="flex items-start gap-1 text-xs text-muted-foreground">
                <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                <span>Suas chaves são armazenadas localmente no navegador.</span>
              </div>
            </div>
          </div>
        )}

        {apiKeys.length === 0 ? (
          <div className="surface-card rounded-lg p-6 text-center">
            <Key className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">Nenhuma chave API configurada</p>
            <p className="text-xs text-muted-foreground mt-1">A IA nativa do sistema será utilizada.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {apiKeys.map((k) => (
              <div key={k.id} className="surface-card rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${k.isActive ? "bg-primary" : "bg-muted-foreground"}`} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{k.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {LLM_PROVIDERS.find(p => p.id === k.provider)?.name || k.provider} • {k.key.slice(0, 8)}...{k.key.slice(-4)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={k.isActive} onCheckedChange={() => handleToggleApiKey(k.id)} />
                  <Button variant="ghost" size="sm" onClick={() => handleRemoveApiKey(k.id)} className="text-destructive h-7 px-2">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default SettingsPage;
