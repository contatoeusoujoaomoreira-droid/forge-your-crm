import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Globe, Key, Plus, Trash2, Copy, ChevronDown, ChevronRight,
  Info, AlertCircle, CheckCircle2, RefreshCw, ExternalLink, Shield,
  Loader2, Lock,
} from "lucide-react";

interface Domain {
  id: string;
  domain: string;
  isActive: boolean;
  status: "pending" | "verified" | "error";
  addedAt: string;
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
      'Adicione registro tipo A: Name = @ (raiz), Value = 185.158.133.1',
      'Adicione registro tipo A: Name = www, Value = 185.158.133.1',
      'Adicione registro TXT: Name = _lovable, Value = lovable_verify=[código exibido abaixo]',
      "Desative o proxy (nuvem laranja) para o registro A",
      "Aguarde propagação DNS (até 24h)",
    ],
  },
  {
    provider: "GoDaddy",
    steps: [
      "Acesse My Products → DNS → Manage",
      'Adicione registro A: Host = @, Points to = 185.158.133.1',
      'Adicione registro A: Host = www, Points to = 185.158.133.1',
      'Adicione registro TXT: Host = _lovable, TXT Value = lovable_verify=[código]',
      "TTL: 1 hora. Aguarde propagação.",
    ],
  },
  {
    provider: "Namecheap",
    steps: [
      "Acesse Domain List → Manage → Advanced DNS",
      'Adicione registro A: Host = @, Value = 185.158.133.1',
      'Adicione registro A: Host = www, Value = 185.158.133.1',
      'Adicione registro TXT: Host = _lovable, Value = lovable_verify=[código]',
      "Aguarde até 48h para propagação.",
    ],
  },
  {
    provider: "HostGator",
    steps: [
      "Acesse cPanel → Zone Editor",
      'Adicione registro A apontando para 185.158.133.1',
      'Adicione registro A para www apontando para 185.158.133.1',
      'Adicione registro TXT: _lovable com valor lovable_verify=[código]',
      "Salve e aguarde propagação.",
    ],
  },
  {
    provider: "Registro.br",
    steps: [
      "Acesse Registro.br → Meus Domínios → DNS",
      "Edite a Zona DNS do domínio",
      'Adicione registro A: @ → 185.158.133.1',
      'Adicione registro A: www → 185.158.133.1',
      'Adicione registro TXT: _lovable → lovable_verify=[código]',
      "Aguarde propagação (pode levar até 72h).",
    ],
  },
  {
    provider: "Google Domains",
    steps: [
      "Acesse Google Domains → DNS → Custom Records",
      'Adicione A Record: Host = @, Data = 185.158.133.1',
      'Adicione A Record: Host = www, Data = 185.158.133.1',
      'Adicione TXT Record: Host = _lovable, Data = lovable_verify=[código]',
      "Aguarde propagação.",
    ],
  },
  {
    provider: "AWS Route 53",
    steps: [
      "Acesse Route 53 → Hosted Zones → seu domínio",
      'Crie Record Set → Type: A → Value: 185.158.133.1',
      'Crie Record Set → Type: A → Name: www → Value: 185.158.133.1',
      'Crie Record Set → Type: TXT → Name: _lovable → Value: "lovable_verify=[código]"',
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
  const [verifying, setVerifying] = useState<string | null>(null);
  const [editingDomain, setEditingDomain] = useState<string | null>(null);
  const [editDomainValue, setEditDomainValue] = useState("");
  const { toast } = useToast();

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
    const cleaned = newDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    if (domains.some(d => d.domain === cleaned)) {
      toast({ title: "Domínio já existe", variant: "destructive" });
      return;
    }
    const domain: Domain = {
      id: crypto.randomUUID(),
      domain: cleaned,
      isActive: true,
      status: "pending",
      addedAt: new Date().toISOString(),
    };
    saveDomains([...domains, domain]);
    setNewDomain("");
    setShowAddDomain(false);
    toast({ title: "Domínio adicionado! Configure os registros DNS." });
  };

  const handleVerifyDomain = async (id: string) => {
    setVerifying(id);
    const domain = domains.find(d => d.id === id);
    if (!domain) return;

    try {
      // Check DNS via public DNS API
      const resp = await fetch(`https://dns.google/resolve?name=${domain.domain}&type=A`);
      const data = await resp.json();
      const hasCorrectA = data.Answer?.some((a: any) => a.data === "185.158.133.1");

      if (hasCorrectA) {
        saveDomains(domains.map(d => d.id === id ? { ...d, status: "verified" as const } : d));
        toast({ title: "DNS verificado! Domínio apontando corretamente.", description: "O SSL será provisionado automaticamente." });
      } else {
        saveDomains(domains.map(d => d.id === id ? { ...d, status: "error" as const } : d));
        toast({
          title: "DNS não verificado",
          description: `O registro A de ${domain.domain} não está apontando para 185.158.133.1. Verifique a configuração e aguarde a propagação.`,
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Erro ao verificar DNS. Tente novamente.", variant: "destructive" });
    }
    setVerifying(null);
  };

  const handleEditDomain = (id: string) => {
    const domain = domains.find(d => d.id === id);
    if (domain) {
      setEditingDomain(id);
      setEditDomainValue(domain.domain);
    }
  };

  const handleSaveEditDomain = (id: string) => {
    const cleaned = editDomainValue.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    if (!cleaned) return;
    saveDomains(domains.map(d => d.id === id ? { ...d, domain: cleaned, status: "pending" as const } : d));
    setEditingDomain(null);
    toast({ title: "Domínio atualizado!" });
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

  const getStatusBadge = (status: Domain["status"]) => {
    switch (status) {
      case "verified":
        return <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(132,204,22,0.15)", color: "#a3e635" }}><CheckCircle2 className="h-3 w-3" /> Verificado</span>;
      case "error":
        return <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}><AlertCircle className="h-3 w-3" /> DNS incorreto</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24" }}><RefreshCw className="h-3 w-3" /> Pendente</span>;
    }
  };

  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [changingPwd, setChangingPwd] = useState(false);

  const handleChangePassword = async () => {
    if (!newPwd || newPwd.length < 6) { toast({ title: "Senha deve ter no mínimo 6 caracteres", variant: "destructive" }); return; }
    if (newPwd !== confirmPwd) { toast({ title: "Senhas não conferem", variant: "destructive" }); return; }
    setChangingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setChangingPwd(false);
    if (error) { toast({ title: "Erro ao alterar senha", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Senha alterada com sucesso!" });
    setNewPwd(""); setConfirmPwd("");
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Password Section */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" /> Alterar Senha
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Atualize a senha da sua conta.</p>
        </div>
        <div className="surface-card rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Nova Senha</label>
              <Input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Mínimo 6 caracteres" className="bg-secondary/50 border-border" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Confirmar Senha</label>
              <Input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="Repita a senha" className="bg-secondary/50 border-border" />
            </div>
          </div>
          <Button onClick={handleChangePassword} disabled={changingPwd} size="sm">
            {changingPwd ? "Alterando..." : "Alterar Senha"}
          </Button>
        </div>
      </section>
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" /> Domínios Próprios
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Conecte seus domínios para usar em landing pages.
            </p>
          </div>
          <Button size="sm" onClick={() => setShowAddDomain(!showAddDomain)}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar
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
                onKeyDown={e => e.key === "Enter" && handleAddDomain()}
              />
              <Button onClick={handleAddDomain}>Adicionar</Button>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: "hsl(var(--primary) / 0.05)" }}>
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">Configuração DNS necessária</p>
                <p>Após adicionar, configure os seguintes registros DNS:</p>
                <div className="space-y-1 mt-2 font-mono text-[11px]">
                  <p><strong className="text-primary">A</strong> → @ → <code className="px-1 py-0.5 rounded" style={{ background: "hsl(var(--primary) / 0.1)" }}>185.158.133.1</code></p>
                  <p><strong className="text-primary">A</strong> → www → <code className="px-1 py-0.5 rounded" style={{ background: "hsl(var(--primary) / 0.1)" }}>185.158.133.1</code></p>
                  <p><strong className="text-primary">TXT</strong> → _lovable → <code className="px-1 py-0.5 rounded" style={{ background: "hsl(var(--primary) / 0.1)" }}>lovable_verify=...</code></p>
                </div>
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
              <div key={d.id} className="surface-card rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${d.isActive ? "bg-primary" : "bg-muted-foreground"}`} />
                    <div>
                      {editingDomain === d.id ? (
                        <div className="flex gap-2">
                          <Input
                            value={editDomainValue}
                            onChange={e => setEditDomainValue(e.target.value)}
                            className="h-7 text-sm bg-secondary/50 border-border"
                            onKeyDown={e => e.key === "Enter" && handleSaveEditDomain(d.id)}
                          />
                          <Button size="sm" className="h-7" onClick={() => handleSaveEditDomain(d.id)}>Salvar</Button>
                          <Button variant="ghost" size="sm" className="h-7" onClick={() => setEditingDomain(null)}>Cancelar</Button>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-foreground">{d.domain}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {getStatusBadge(d.status)}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => handleVerifyDomain(d.id)}
                      disabled={verifying === d.id}
                      className="h-7 px-2 text-xs"
                      title="Verificar DNS"
                    >
                      {verifying === d.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                      <span className="ml-1 hidden sm:inline">Verificar</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEditDomain(d.id)} className="h-7 px-2 text-xs">Editar</Button>
                    <Switch checked={d.isActive} onCheckedChange={() => handleToggleDomain(d.id)} />
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveDomain(d.id)} className="text-destructive h-7 px-2">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {d.status === "error" && (
                  <div className="flex items-start gap-2 p-2 rounded text-xs" style={{ background: "rgba(239,68,68,0.05)", color: "rgba(248,113,113,0.8)" }}>
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>O registro A não aponta para 185.158.133.1. Verifique as configurações DNS no seu provedor e aguarde a propagação (até 72h).</span>
                  </div>
                )}
                {d.status === "verified" && (
                  <div className="flex items-start gap-2 p-2 rounded text-xs" style={{ background: "rgba(132,204,22,0.05)", color: "rgba(163,230,53,0.8)" }}>
                    <Shield className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>DNS verificado. SSL será provisionado automaticamente. Seu site estará disponível em breve via HTTPS.</span>
                  </div>
                )}
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
                    <div className="mt-3 p-2 rounded" style={{ background: "hsl(var(--primary) / 0.05)" }}>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">IP para registros A</p>
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 rounded text-primary text-xs font-mono font-semibold" style={{ background: "hsl(var(--primary) / 0.1)" }}>185.158.133.1</code>
                        <button
                          onClick={() => { navigator.clipboard.writeText("185.158.133.1"); toast({ title: "IP copiado!" }); }}
                          className="text-primary hover:text-primary/80"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <a
                      href="https://dnschecker.org"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary mt-2 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> Verificar propagação no DNSChecker.org
                    </a>
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
              Adicione chaves de provedores LLM para usar na geração de páginas com IA.
            </p>
          </div>
          <Button size="sm" onClick={() => setShowAddApi(!showAddApi)}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </div>

        <div className="flex items-start gap-3 p-4 rounded-lg" style={{ background: "hsl(var(--primary) / 0.05)", border: "1px solid hsl(var(--primary) / 0.15)" }}>
          <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">IA Nativa incluída</p>
            <p className="text-xs text-muted-foreground mt-1">
              O sistema já inclui IA nativa (Gemini & GPT) sem necessidade de chave. Adicione chaves externas para usar seus próprios tokens. Você pode selecionar qual chave usar no chat de criação com IA.
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
                <span>Suas chaves são armazenadas localmente no navegador e enviadas diretamente ao provedor.</span>
              </div>
            </div>
          </div>
        )}

        {apiKeys.length === 0 ? (
          <div className="surface-card rounded-lg p-6 text-center">
            <Key className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">Nenhuma chave API configurada</p>
            <p className="text-xs text-muted-foreground mt-1">A IA nativa do sistema será utilizada por padrão.</p>
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
