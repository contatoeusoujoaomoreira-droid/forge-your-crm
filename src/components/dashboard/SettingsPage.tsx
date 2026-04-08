import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Globe, Key, Plus, Trash2, Copy, ChevronDown, ChevronRight,
  Info, AlertCircle, CheckCircle2, RefreshCw, ExternalLink, Shield,
  Loader2, Lock, Link2,
} from "lucide-react";

interface Domain {
  id: string;
  domain: string;
  project_type: string;
  project_id: string | null;
  is_active: boolean;
  status: "pending" | "verified" | "error";
  created_at: string;
}

interface ApiKey {
  id: string;
  name: string;
  provider: string;
  key: string;
  isActive: boolean;
}

interface ProjectOption {
  id: string;
  title: string;
  slug: string;
  type: string;
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

const PROJECT_TYPES = [
  { value: "page", label: "Landing Page" },
  { value: "form", label: "Formulário" },
  { value: "quiz", label: "Quiz" },
  { value: "schedule", label: "Agenda" },
  { value: "checkout", label: "Checkout" },
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
  const { user } = useAuth();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [newDomainType, setNewDomainType] = useState("page");
  const [newDomainProject, setNewDomainProject] = useState("");
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

  const fetchDomains = async () => {
    const { data } = await supabase.from("custom_domains").select("*").order("created_at", { ascending: false });
    if (data) setDomains(data as Domain[]);
  };

  const fetchProjects = async () => {
    if (!user) return;
    const [pages, forms, quizzes, schedules, checkouts] = await Promise.all([
      supabase.from("landing_pages").select("id, title, slug").eq("user_id", user.id),
      supabase.from("forms").select("id, title, slug").eq("user_id", user.id),
      supabase.from("quizzes").select("id, title, slug").eq("user_id", user.id),
      supabase.from("schedules").select("id, title, slug").eq("user_id", user.id),
      supabase.from("checkouts").select("id, title, slug").eq("user_id", user.id),
    ]);
    const all: ProjectOption[] = [
      ...(pages.data || []).map((p: any) => ({ ...p, type: "page" })),
      ...(forms.data || []).map((f: any) => ({ ...f, type: "form" })),
      ...(quizzes.data || []).map((q: any) => ({ ...q, type: "quiz" })),
      ...(schedules.data || []).map((s: any) => ({ ...s, type: "schedule" })),
      ...(checkouts.data || []).map((c: any) => ({ ...c, type: "checkout" })),
    ];
    setProjects(all);
  };

  useEffect(() => {
    fetchDomains();
    fetchProjects();
    const savedKeys = localStorage.getItem("forge_api_keys");
    if (savedKeys) setApiKeys(JSON.parse(savedKeys));
  }, [user]);

  const saveApiKeys = (k: ApiKey[]) => {
    setApiKeys(k);
    localStorage.setItem("forge_api_keys", JSON.stringify(k));
  };

  const handleAddDomain = async () => {
    if (!newDomain.trim()) return;
    const cleaned = newDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    const { error } = await supabase.from("custom_domains").insert({
      domain: cleaned,
      project_type: newDomainType,
      project_id: newDomainProject || null,
      is_active: true,
      status: "pending",
    });
    if (error) {
      toast({ title: error.message.includes("unique") ? "Domínio já existe" : error.message, variant: "destructive" });
      return;
    }
    setNewDomain("");
    setNewDomainProject("");
    setShowAddDomain(false);
    toast({ title: "Domínio adicionado! Configure os registros DNS." });
    fetchDomains();
  };

  const handleVerifyDomain = async (id: string) => {
    setVerifying(id);
    const domain = domains.find(d => d.id === id);
    if (!domain) return;
    try {
      const resp = await fetch(`https://dns.google/resolve?name=${domain.domain}&type=A`);
      const data = await resp.json();
      const hasCorrectA = data.Answer?.some((a: any) => a.data === "185.158.133.1");
      const newStatus = hasCorrectA ? "verified" : "error";
      await supabase.from("custom_domains").update({
        status: newStatus,
        verified_at: hasCorrectA ? new Date().toISOString() : null,
      }).eq("id", id);
      fetchDomains();
      toast({
        title: hasCorrectA ? "DNS verificado! Domínio apontando corretamente." : "DNS não verificado",
        description: hasCorrectA ? "O SSL será provisionado automaticamente." : `O registro A de ${domain.domain} não aponta para 185.158.133.1.`,
        variant: hasCorrectA ? "default" : "destructive",
      });
    } catch {
      toast({ title: "Erro ao verificar DNS. Tente novamente.", variant: "destructive" });
    }
    setVerifying(null);
  };

  const handleRemoveDomain = async (id: string) => {
    await supabase.from("custom_domains").delete().eq("id", id);
    toast({ title: "Domínio removido" });
    fetchDomains();
  };

  const handleToggleDomain = async (id: string) => {
    const d = domains.find(x => x.id === id);
    if (!d) return;
    await supabase.from("custom_domains").update({ is_active: !d.is_active }).eq("id", id);
    fetchDomains();
  };

  const handleUpdateDomainProject = async (domainId: string, projectType: string, projectId: string) => {
    await supabase.from("custom_domains").update({ project_type: projectType, project_id: projectId }).eq("id", domainId);
    fetchDomains();
    toast({ title: "Projeto vinculado ao domínio!" });
  };

  const handleEditDomain = (id: string) => {
    const domain = domains.find(d => d.id === id);
    if (domain) {
      setEditingDomain(id);
      setEditDomainValue(domain.domain);
    }
  };

  const handleSaveEditDomain = async (id: string) => {
    const cleaned = editDomainValue.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    if (!cleaned) return;
    await supabase.from("custom_domains").update({ domain: cleaned, status: "pending" }).eq("id", id);
    setEditingDomain(null);
    toast({ title: "Domínio atualizado!" });
    fetchDomains();
  };

  const getStatusBadge = (status: Domain["status"]) => {
    switch (status) {
      case "verified":
        return <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/15 text-primary"><CheckCircle2 className="h-3 w-3" /> Verificado</span>;
      case "error":
        return <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-destructive/15 text-destructive"><AlertCircle className="h-3 w-3" /> DNS incorreto</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-500"><RefreshCw className="h-3 w-3" /> Pendente</span>;
    }
  };

  const getProjectLabel = (d: Domain) => {
    if (!d.project_id) return "Nenhum projeto vinculado";
    const p = projects.find(x => x.id === d.project_id);
    if (!p) return d.project_id;
    const typeLabel = PROJECT_TYPES.find(t => t.value === d.project_type)?.label || d.project_type;
    return `${typeLabel}: ${p.title}`;
  };

  const getProjectUrl = (d: Domain) => {
    if (!d.project_id) return null;
    const p = projects.find(x => x.id === d.project_id);
    if (!p) return null;
    const prefixes: Record<string, string> = { page: "/p/", form: "/form/", quiz: "/quiz/", schedule: "/agendar/", checkout: "/checkout/" };
    return `${prefixes[d.project_type] || "/"}${p.slug}`;
  };

  const filteredProjects = projects.filter(p => p.type === newDomainType);

  // Password
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

  const handleAddApiKey = () => {
    if (!newApiName.trim() || !newApiKey.trim()) return;
    const key: ApiKey = { id: crypto.randomUUID(), name: newApiName.trim(), provider: newApiProvider, key: newApiKey.trim(), isActive: true };
    saveApiKeys([...apiKeys, key]);
    setNewApiName(""); setNewApiKey(""); setNewApiProvider("openai"); setShowAddApi(false);
    toast({ title: "Chave API adicionada!" });
  };

  const handleRemoveApiKey = (id: string) => { saveApiKeys(apiKeys.filter(k => k.id !== id)); toast({ title: "Chave removida" }); };
  const handleToggleApiKey = (id: string) => { saveApiKeys(apiKeys.map(k => k.id === id ? { ...k, isActive: !k.isActive } : k)); };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Password Section */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Lock className="h-5 w-5 text-primary" /> Alterar Senha</h2>
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
          <Button onClick={handleChangePassword} disabled={changingPwd} size="sm">{changingPwd ? "Alterando..." : "Alterar Senha"}</Button>
        </div>
      </section>

      {/* Domains Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Globe className="h-5 w-5 text-primary" /> Domínios Próprios</h2>
            <p className="text-sm text-muted-foreground mt-1">Conecte domínios e vincule a projetos específicos (Pages, Forms, Quiz, Agenda, Checkout).</p>
          </div>
          <Button size="sm" onClick={() => setShowAddDomain(!showAddDomain)}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
        </div>

        {showAddDomain && (
          <div className="surface-card rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Domínio</label>
                <Input value={newDomain} onChange={e => setNewDomain(e.target.value)} placeholder="seudominio.com.br" className="bg-secondary/50 border-border" onKeyDown={e => e.key === "Enter" && handleAddDomain()} />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Tipo de projeto</label>
                <select value={newDomainType} onChange={e => { setNewDomainType(e.target.value); setNewDomainProject(""); }} className="w-full h-10 bg-secondary border border-border rounded-md px-3 text-sm text-foreground">
                  {PROJECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Projeto vinculado</label>
                <select value={newDomainProject} onChange={e => setNewDomainProject(e.target.value)} className="w-full h-10 bg-secondary border border-border rounded-md px-3 text-sm text-foreground">
                  <option value="">Selecione...</option>
                  {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.title} ({p.slug})</option>)}
                </select>
              </div>
            </div>
            <Button onClick={handleAddDomain}>Adicionar Domínio</Button>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">Configuração DNS necessária</p>
                <p>Após adicionar, configure os seguintes registros DNS:</p>
                <div className="space-y-1 mt-2 font-mono text-[11px]">
                  <p><strong className="text-primary">A</strong> → @ → <code className="px-1 py-0.5 rounded bg-primary/10">185.158.133.1</code></p>
                  <p><strong className="text-primary">A</strong> → www → <code className="px-1 py-0.5 rounded bg-primary/10">185.158.133.1</code></p>
                  <p><strong className="text-primary">TXT</strong> → _lovable → <code className="px-1 py-0.5 rounded bg-primary/10">lovable_verify=...</code></p>
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
              <div key={d.id} className="surface-card rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${d.is_active ? "bg-primary" : "bg-muted-foreground"}`} />
                    <div>
                      {editingDomain === d.id ? (
                        <div className="flex gap-2">
                          <Input value={editDomainValue} onChange={e => setEditDomainValue(e.target.value)} className="h-7 text-sm bg-secondary/50 border-border" onKeyDown={e => e.key === "Enter" && handleSaveEditDomain(d.id)} />
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
                    <Button variant="ghost" size="sm" onClick={() => handleVerifyDomain(d.id)} disabled={verifying === d.id} className="h-7 px-2 text-xs" title="Verificar DNS">
                      {verifying === d.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                      <span className="ml-1 hidden sm:inline">Verificar</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEditDomain(d.id)} className="h-7 px-2 text-xs">Editar</Button>
                    <Switch checked={d.is_active} onCheckedChange={() => handleToggleDomain(d.id)} />
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveDomain(d.id)} className="text-destructive h-7 px-2"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>

                {/* Project linking */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50">
                  <Link2 className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Projeto vinculado</p>
                    <div className="flex items-center gap-2">
                      <select value={d.project_type} onChange={e => handleUpdateDomainProject(d.id, e.target.value, d.project_id || "")} className="h-7 text-xs bg-secondary border border-border rounded px-2 text-foreground">
                        {PROJECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      <select value={d.project_id || ""} onChange={e => handleUpdateDomainProject(d.id, d.project_type, e.target.value)} className="h-7 text-xs bg-secondary border border-border rounded px-2 text-foreground flex-1">
                        <option value="">Selecione projeto...</option>
                        {projects.filter(p => p.type === d.project_type).map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                      </select>
                    </div>
                    {d.project_id && (
                      <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" />
                        {d.status === "verified" ? (
                          <a href={`https://${d.domain}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{d.domain}</a>
                        ) : (
                          <span>Rota interna: {getProjectUrl(d)}</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                {d.status === "error" && (
                  <div className="flex items-start gap-2 p-2 rounded text-xs bg-destructive/5 text-destructive">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>O registro A não aponta para 185.158.133.1. Verifique as configurações DNS no seu provedor e aguarde a propagação (até 72h).</span>
                  </div>
                )}
                {d.status === "verified" && (
                  <div className="flex items-start gap-2 p-2 rounded text-xs bg-primary/5 text-primary">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>Domínio verificado e ativo! SSL provisionado automaticamente.</span>
                  </div>
                )}

                {/* DNS instructions toggle */}
                <button onClick={() => setExpandedDns(expandedDns === d.id ? null : d.id)} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                  {expandedDns === d.id ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  Instruções DNS
                </button>
                {expandedDns === d.id && (
                  <div className="space-y-3">
                    {DNS_INSTRUCTIONS.map(inst => (
                      <div key={inst.provider} className="p-3 rounded-lg bg-secondary/20 border border-border/50">
                        <p className="text-xs font-bold text-foreground mb-2">{inst.provider}</p>
                        <ol className="text-[11px] text-muted-foreground space-y-1 list-decimal list-inside">
                          {inst.steps.map((s, i) => <li key={i}>{s}</li>)}
                        </ol>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* API Keys Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Key className="h-5 w-5 text-primary" /> Chaves de API</h2>
            <p className="text-sm text-muted-foreground mt-1">Configure chaves de API para integrações com LLMs e serviços externos.</p>
          </div>
          <Button size="sm" onClick={() => setShowAddApi(!showAddApi)}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
        </div>

        {showAddApi && (
          <div className="surface-card rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Nome</label>
                <Input value={newApiName} onChange={e => setNewApiName(e.target.value)} placeholder="Minha chave" className="bg-secondary/50 border-border" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Provedor</label>
                <select value={newApiProvider} onChange={e => setNewApiProvider(e.target.value)} className="w-full h-10 bg-secondary border border-border rounded-md px-3 text-sm text-foreground">
                  {LLM_PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Chave</label>
                <Input type="password" value={newApiKey} onChange={e => setNewApiKey(e.target.value)} placeholder={LLM_PROVIDERS.find(p => p.id === newApiProvider)?.placeholder || "..."} className="bg-secondary/50 border-border" />
              </div>
            </div>
            <Button onClick={handleAddApiKey}>Salvar Chave</Button>
          </div>
        )}

        {apiKeys.length === 0 ? (
          <div className="surface-card rounded-lg p-6 text-center">
            <Key className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">Nenhuma chave configurada</p>
          </div>
        ) : (
          <div className="space-y-2">
            {apiKeys.map(k => (
              <div key={k.id} className="surface-card rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className={`h-4 w-4 ${k.isActive ? "text-primary" : "text-muted-foreground"}`} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{k.name}</p>
                    <p className="text-[10px] text-muted-foreground">{LLM_PROVIDERS.find(p => p.id === k.provider)?.name || k.provider} • {k.key.substring(0, 8)}...{k.key.slice(-4)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(k.key); toast({ title: "Chave copiada!" }); }} className="h-7 px-2"><Copy className="h-3 w-3" /></Button>
                  <Switch checked={k.isActive} onCheckedChange={() => handleToggleApiKey(k.id)} />
                  <Button variant="ghost" size="sm" onClick={() => handleRemoveApiKey(k.id)} className="text-destructive h-7 px-2"><Trash2 className="h-3 w-3" /></Button>
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
