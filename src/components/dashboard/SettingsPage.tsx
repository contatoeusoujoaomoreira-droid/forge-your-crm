import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import TeamMembersSection from "./settings/TeamMembersSection";
import RequestCreditsModal from "./RequestCreditsModal";
import {
  Globe, Plus, Trash2, ChevronDown, ChevronRight,
  Info, AlertCircle, CheckCircle2, RefreshCw, ExternalLink,
  Loader2, Lock, Link2, User as UserIcon, Coins,
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

interface ProjectOption {
  id: string;
  title: string;
  slug: string;
  type: string;
}

const PROJECT_TYPES = [
  { value: "page", label: "Landing Page" },
  { value: "form", label: "Formulário" },
  { value: "quiz", label: "Quiz" },
  { value: "schedule", label: "Agenda" },
  { value: "checkout", label: "Checkout" },
];

const DNS_INSTRUCTIONS = [
  { provider: "Cloudflare", steps: [
    "Acesse o painel do Cloudflare → DNS → Records",
    'Adicione registro tipo A: Name = @ (raiz), Value = 185.158.133.1',
    'Adicione registro tipo A: Name = www, Value = 185.158.133.1',
    'Adicione registro TXT: Name = _lovable, Value = lovable_verify=[código exibido abaixo]',
    "Desative o proxy (nuvem laranja) para o registro A",
    "Aguarde propagação DNS (até 24h)",
  ]},
  { provider: "GoDaddy", steps: [
    "Acesse My Products → DNS → Manage",
    'Adicione registro A: Host = @, Points to = 185.158.133.1',
    'Adicione registro A: Host = www, Points to = 185.158.133.1',
    'Adicione registro TXT: Host = _lovable, TXT Value = lovable_verify=[código]',
    "TTL: 1 hora. Aguarde propagação.",
  ]},
  { provider: "Registro.br", steps: [
    "Acesse Registro.br → Meus Domínios → DNS",
    "Edite a Zona DNS do domínio",
    'Adicione registro A: @ → 185.158.133.1',
    'Adicione registro A: www → 185.158.133.1',
    'Adicione registro TXT: _lovable → lovable_verify=[código]',
    "Aguarde propagação (pode levar até 72h).",
  ]},
];

const SettingsPage = () => {
  const { user } = useAuth();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [newDomainType, setNewDomainType] = useState("page");
  const [newDomainProject, setNewDomainProject] = useState("");
  const [showAddDomain, setShowAddDomain] = useState(false);
  const [expandedDns, setExpandedDns] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [editingDomain, setEditingDomain] = useState<string | null>(null);
  const [editDomainValue, setEditDomainValue] = useState("");

  // Account
  const [fullName, setFullName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [changingPwd, setChangingPwd] = useState(false);
  const [showReqCredits, setShowReqCredits] = useState(false);
  const [credits, setCredits] = useState<{ balance: number; monthly: number; plan: string } | null>(null);
  const { toast } = useToast();

  const fetchDomains = async () => {
    const { data } = await supabase.from("custom_domains").select("*").order("created_at", { ascending: false });
    if (data) setDomains(data as Domain[]);
  };

  const fetchProjects = async () => {
    if (!user) return;
    const [forms, quizzes, schedules, checkouts] = await Promise.all([
      supabase.from("forms").select("id, title, slug").eq("user_id", user.id),
      supabase.from("quizzes").select("id, title, slug").eq("user_id", user.id),
      supabase.from("schedules").select("id, title, slug").eq("user_id", user.id),
      supabase.from("checkouts").select("id, title, slug").eq("user_id", user.id),
    ]);
    const all: ProjectOption[] = [
      ...(forms.data || []).map((f: any) => ({ ...f, type: "form" })),
      ...(quizzes.data || []).map((q: any) => ({ ...q, type: "quiz" })),
      ...(schedules.data || []).map((s: any) => ({ ...s, type: "schedule" })),
      ...(checkouts.data || []).map((c: any) => ({ ...c, type: "checkout" })),
    ];
    setProjects(all);
  };

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("full_name, credits_balance, credits_monthly, plan").eq("user_id", user.id).maybeSingle();
    if (data) {
      setFullName((data as any).full_name || "");
      setCredits({ balance: (data as any).credits_balance ?? 0, monthly: (data as any).credits_monthly ?? 0, plan: (data as any).plan || "start" });
    }
  };

  useEffect(() => {
    fetchDomains();
    fetchProjects();
    fetchProfile();
  }, [user]);

  const handleSaveName = async () => {
    if (!user) return;
    setSavingName(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("user_id", user.id);
    setSavingName(false);
    if (error) { toast({ title: "Erro ao salvar nome", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Nome atualizado!" });
  };

  const handleAddDomain = async () => {
    if (!newDomain.trim()) return;
    const cleaned = newDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    const { error } = await supabase.from("custom_domains").insert({
      domain: cleaned, project_type: newDomainType, project_id: newDomainProject || null,
      is_active: true, status: "pending",
    });
    if (error) { toast({ title: error.message.includes("unique") ? "Domínio já existe" : error.message, variant: "destructive" }); return; }
    setNewDomain(""); setNewDomainProject(""); setShowAddDomain(false);
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
      await supabase.from("custom_domains").update({ status: newStatus, verified_at: hasCorrectA ? new Date().toISOString() : null }).eq("id", id);
      fetchDomains();
      toast({
        title: hasCorrectA ? "DNS verificado!" : "DNS não verificado",
        description: hasCorrectA ? "O SSL será provisionado automaticamente." : `Registro A de ${domain.domain} não aponta para 185.158.133.1.`,
        variant: hasCorrectA ? "default" : "destructive",
      });
    } catch { toast({ title: "Erro ao verificar DNS.", variant: "destructive" }); }
    setVerifying(null);
  };

  const handleRemoveDomain = async (id: string) => { await supabase.from("custom_domains").delete().eq("id", id); toast({ title: "Domínio removido" }); fetchDomains(); };
  const handleToggleDomain = async (id: string) => { const d = domains.find(x => x.id === id); if (!d) return; await supabase.from("custom_domains").update({ is_active: !d.is_active }).eq("id", id); fetchDomains(); };
  const handleUpdateDomainProject = async (domainId: string, projectType: string, projectId: string) => { await supabase.from("custom_domains").update({ project_type: projectType, project_id: projectId }).eq("id", domainId); fetchDomains(); toast({ title: "Projeto vinculado!" }); };
  const handleEditDomain = (id: string) => { const d = domains.find(x => x.id === id); if (d) { setEditingDomain(id); setEditDomainValue(d.domain); } };
  const handleSaveEditDomain = async (id: string) => {
    const cleaned = editDomainValue.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    if (!cleaned) return;
    await supabase.from("custom_domains").update({ domain: cleaned, status: "pending" }).eq("id", id);
    setEditingDomain(null); toast({ title: "Domínio atualizado!" }); fetchDomains();
  };

  const getStatusBadge = (status: Domain["status"]) => {
    switch (status) {
      case "verified": return <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/15 text-primary"><CheckCircle2 className="h-3 w-3" /> Verificado</span>;
      case "error": return <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-destructive/15 text-destructive"><AlertCircle className="h-3 w-3" /> DNS incorreto</span>;
      default: return <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-500"><RefreshCw className="h-3 w-3" /> Pendente</span>;
    }
  };

  const getProjectUrl = (d: Domain) => {
    if (!d.project_id) return null;
    const p = projects.find(x => x.id === d.project_id);
    if (!p) return null;
    const prefixes: Record<string, string> = { page: "/p/", form: "/form/", quiz: "/quiz/", schedule: "/agendar/", checkout: "/checkout/" };
    return `${prefixes[d.project_type] || "/"}${p.slug}`;
  };

  const filteredProjects = projects.filter(p => p.type === newDomainType);

  const handleChangePassword = async () => {
    if (!newPwd || newPwd.length < 6) { toast({ title: "Senha mínima 6 caracteres", variant: "destructive" }); return; }
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
      {/* Account info */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><UserIcon className="h-5 w-5 text-primary" /> Minha conta</h2>
          <p className="text-sm text-muted-foreground mt-1">Atualize seus dados de acesso e identificação.</p>
        </div>
        <div className="surface-card rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Nome</label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Seu nome" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">E-mail</label>
              <Input value={user?.email || ""} disabled />
            </div>
          </div>
          <Button onClick={handleSaveName} disabled={savingName} size="sm">{savingName ? "Salvando..." : "Salvar nome"}</Button>
        </div>

        <div className="surface-card rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Alterar senha</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Nova senha</label>
              <Input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Confirmar senha</label>
              <Input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="Repita a senha" />
            </div>
          </div>
          <Button onClick={handleChangePassword} disabled={changingPwd} size="sm">{changingPwd ? "Alterando..." : "Alterar senha"}</Button>
        </div>

        {credits && (
          <div className="surface-card rounded-lg p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <Coins className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold">Plano <span className="uppercase">{credits.plan}</span></p>
                <p className="text-[11px] text-muted-foreground">{credits.balance} créditos disponíveis • {credits.monthly} mensais</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowReqCredits(true)}>Solicitar créditos</Button>
          </div>
        )}
        <RequestCreditsModal open={showReqCredits} onOpenChange={setShowReqCredits} />
      </section>

      {/* Team Members */}
      <TeamMembersSection />

      {/* Domains Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Globe className="h-5 w-5 text-primary" /> Domínios próprios</h2>
            <p className="text-sm text-muted-foreground mt-1">Conecte domínios e vincule a projetos (Pages, Forms, Quiz, Agenda, Checkout).</p>
          </div>
          <Button size="sm" onClick={() => setShowAddDomain(!showAddDomain)}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
        </div>

        {showAddDomain && (
          <div className="surface-card rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Domínio</label>
                <Input value={newDomain} onChange={e => setNewDomain(e.target.value)} placeholder="seudominio.com.br" onKeyDown={e => e.key === "Enter" && handleAddDomain()} />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Tipo de projeto</label>
                <select value={newDomainType} onChange={e => { setNewDomainType(e.target.value); setNewDomainProject(""); }} className="w-full h-10 bg-secondary border border-border rounded-md px-3 text-sm">
                  {PROJECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Projeto vinculado</label>
                <select value={newDomainProject} onChange={e => setNewDomainProject(e.target.value)} className="w-full h-10 bg-secondary border border-border rounded-md px-3 text-sm">
                  <option value="">Selecione...</option>
                  {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.title} ({p.slug})</option>)}
                </select>
              </div>
            </div>
            <Button onClick={handleAddDomain}>Adicionar domínio</Button>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">Configuração DNS necessária</p>
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
                          <Input value={editDomainValue} onChange={e => setEditDomainValue(e.target.value)} className="h-7 text-sm" onKeyDown={e => e.key === "Enter" && handleSaveEditDomain(d.id)} />
                          <Button size="sm" className="h-7" onClick={() => handleSaveEditDomain(d.id)}>Salvar</Button>
                          <Button variant="ghost" size="sm" className="h-7" onClick={() => setEditingDomain(null)}>Cancelar</Button>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-foreground">{d.domain}</p>
                          <div className="flex items-center gap-2 mt-0.5">{getStatusBadge(d.status)}</div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleVerifyDomain(d.id)} disabled={verifying === d.id} className="h-7 px-2 text-xs">
                      {verifying === d.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                      <span className="ml-1 hidden sm:inline">Verificar</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEditDomain(d.id)} className="h-7 px-2 text-xs">Editar</Button>
                    <Switch checked={d.is_active} onCheckedChange={() => handleToggleDomain(d.id)} />
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveDomain(d.id)} className="text-destructive h-7 px-2"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50">
                  <Link2 className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Projeto vinculado</p>
                    <div className="flex items-center gap-2">
                      <select value={d.project_type} onChange={e => handleUpdateDomainProject(d.id, e.target.value, d.project_id || "")} className="h-7 text-xs bg-secondary border border-border rounded px-2">
                        {PROJECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      <select value={d.project_id || ""} onChange={e => handleUpdateDomainProject(d.id, d.project_type, e.target.value)} className="h-7 text-xs bg-secondary border border-border rounded px-2 flex-1">
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
    </div>
  );
};

export default SettingsPage;
