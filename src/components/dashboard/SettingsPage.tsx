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
  { value: "page", label: "Loja / Sistema" },
];

const DNS_INSTRUCTIONS = [
  { provider: "GoDaddy", steps: [
    "Acesse Meus Produtos → DNS do domínio",
    "Se já existir um registro com o mesmo Nome (ex.: www), clique no lápis para editar em vez de criar outro",
    "Tipo CNAME · Nome conforme o quadro acima (use www se for o domínio principal) · Valor cname.omnibuildercrm.online",
    "Salve e clique em \"Verificar conexão\" aqui no sistema",
  ]},
  { provider: "Registro.br", steps: [
    "Acesse Meus Domínios → Editar zona DNS",
    "Crie um registro CNAME com o Nome do quadro acima apontando para cname.omnibuildercrm.online",
    "Salve e clique em \"Verificar conexão\" (pode levar algumas horas)",
  ]},
  { provider: "Hostinger / outros", steps: [
    "Abra a área de DNS / Zona DNS do domínio",
    "Apague registros A ou CNAME antigos com o mesmo Nome",
    "Crie o CNAME do quadro acima e clique em \"Verificar conexão\"",
  ]},
];

const CF_TARGET = "cname.omnibuildercrm.online";
const cnameName = (domain: string) => { const parts = domain.split("."); const br = /\.(com|net|org|art|blog|eco|edu|gov|ind|inf|log|med|nom|wiki)\.br$/.test(domain); const base = br ? 3 : 2; return parts.length > base ? parts.slice(0, parts.length - base).join(".") : "@"; };

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
    setProjects([]);
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
    if (user) await supabase.from("store_settings").update({ custom_domain: cleaned.replace(/^www\./, "") }).eq("user_id", user.id);
    setNewDomain(""); setNewDomainProject(""); setShowAddDomain(false);
    toast({ title: "Domínio adicionado! Agora crie o registro CNAME no seu provedor." });
    const { data: row } = await supabase.from("custom_domains").select("id").eq("domain", cleaned).maybeSingle();
    if (row) { try { await callCf("create", row.id); } catch (e) { toast({ title: "Aviso", description: (e as Error).message, variant: "destructive" }); } }
    fetchDomains();
  };

  const callCf = async (action: "create" | "check" | "delete", id: string) => {
    const { data, error } = await supabase.functions.invoke("cloudflare-domain", { body: { action, domain_id: id } });
    if (error) {
      let msg = error.message;
      try { msg = JSON.parse(await (error as any).context.text()).error || msg; } catch { /* keep */ }
      throw new Error(typeof msg === "string" ? msg : "Erro na Cloudflare");
    }
    return data as { status: string; ssl_status: string; errors?: string[] };
  };

  const handleVerifyDomain = async (id: string) => {
    setVerifying(id);
    try {
      const r = await callCf("create", id);
      fetchDomains();
      toast({
        title: r.status === "verified" ? "Domínio ativo com cadeado (SSL)!" : "Aguardando o apontamento",
        description: r.status === "verified" ? "Sua loja já abre nesse endereço." : `Crie o registro CNAME → ${CF_TARGET} e clique em Verificar de novo em alguns minutos.`,
      });
    } catch (e) { toast({ title: "Não foi possível verificar", description: (e as Error).message, variant: "destructive" }); }
    setVerifying(null);
  };

  const handleRemoveDomain = async (id: string) => { const d = domains.find(x => x.id === id); if (!confirm(`Remover ${d?.domain}? O endereço deixa de abrir sua loja.`)) return; try { await callCf("delete", id); } catch (e) { toast({ title: "Não foi possível remover", description: (e as Error).message, variant: "destructive" }); return; } if (user && d) await supabase.from("store_settings").update({ custom_domain: null }).eq("user_id", user.id).eq("custom_domain", d.domain.replace(/^www\./, "")); await supabase.from("custom_domains").delete().eq("id", id); toast({ title: "Domínio removido" }); fetchDomains(); };
  const handleToggleDomain = async (id: string) => { const d = domains.find(x => x.id === id); if (!d) return; await supabase.from("custom_domains").update({ is_active: !d.is_active }).eq("id", id); fetchDomains(); };
  const handleUpdateDomainProject = async (domainId: string, projectType: string, projectId: string) => { await supabase.from("custom_domains").update({ project_type: projectType, project_id: projectId }).eq("id", domainId); fetchDomains(); toast({ title: "Projeto vinculado!" }); };
  const handleEditDomain = (id: string) => { const d = domains.find(x => x.id === id); if (d) { setEditingDomain(id); setEditDomainValue(d.domain); } };
  const handleSaveEditDomain = async (id: string) => {
    const cleaned = editDomainValue.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    if (!cleaned) return;
    try { await callCf("delete", id); } catch { /* ignore */ }
    await supabase.from("custom_domains").update({ domain: cleaned, status: "pending", cf_hostname_id: null }).eq("id", id);
    try { await callCf("create", id); } catch { /* user can click Verificar */ }
    if (user) await supabase.from("store_settings").update({ custom_domain: cleaned.replace(/^www\./, "") }).eq("user_id", user.id);
    setEditingDomain(null); toast({ title: "Domínio atualizado!" }); fetchDomains();
  };

  const getStatusBadge = (status: Domain["status"]) => {
    switch (status) {
      case "verified": return <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/15 text-primary"><CheckCircle2 className="h-3 w-3" /> Ativo com cadeado</span>;
      case "error": return <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-destructive/15 text-destructive"><AlertCircle className="h-3 w-3" /> DNS incorreto</span>;
      default: return <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-500"><RefreshCw className="h-3 w-3" /> Aguardando apontamento</span>;
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
            <p className="text-sm text-muted-foreground mt-1">Use seu domínio (ex: minhaloja.com.br) ou subdomínio (ex: loja.minhaloja.com.br). Ele abre sua Loja Virtual, a Área de Membros (/membros) e o acompanhamento de pedidos.</p>
          </div>
          <Button size="sm" onClick={() => setShowAddDomain(!showAddDomain)}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
        </div>

        {showAddDomain && (
          <div className="surface-card rounded-lg p-4 space-y-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Domínio ou subdomínio</label>
              <Input value={newDomain} onChange={e => setNewDomain(e.target.value)} placeholder="minhaloja.com.br ou loja.minhaloja.com.br" onKeyDown={e => e.key === "Enter" && handleAddDomain()} />
              <p className="text-[11px] text-muted-foreground mt-1">O domínio é ligado automaticamente à sua Loja Virtual.</p>
            </div>
            <Button onClick={handleAddDomain}>Adicionar domínio</Button>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">Passo a passo</p>
                <p>1. Adicione o domínio aqui. 2. No site onde comprou o domínio (GoDaddy, Registro.br, Hostinger...), crie <b>um registro CNAME</b> apontando para <b>{CF_TARGET}</b>. 3. Clique em "Verificar conexão". O cadeado (SSL) é gerado sozinho em poucos minutos.</p>
                <p>Recomendado: use um subdomínio, como <b>loja.minhaloja.com.br</b> ou <b>www.minhaloja.com.br</b>.</p>
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
                      <span className="ml-1 hidden sm:inline">Verificar conexão</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEditDomain(d.id)} className="h-7 px-2 text-xs">Editar</Button>
                    <Switch checked={d.is_active} onCheckedChange={() => handleToggleDomain(d.id)} />
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveDomain(d.id)} className="text-destructive h-7 px-2"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>

                {d.status !== "verified" && (
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-[11px] text-muted-foreground space-y-2">
                    <p className="font-semibold text-foreground text-xs">Crie este registro no site onde comprou o domínio:</p>
                    <div className="grid grid-cols-3 gap-2 font-mono">
                      <div><p className="text-[10px] uppercase">Tipo</p><p className="text-foreground font-bold">CNAME</p></div>
                      <div><p className="text-[10px] uppercase">Nome</p><p className="text-foreground font-bold">{cnameName(d.domain)}</p></div>
                      <div><p className="text-[10px] uppercase">Valor</p><p className="text-foreground font-bold break-all">{CF_TARGET}</p></div>
                    </div>
                    {cnameName(d.domain) === "@" && <p className="text-foreground">Dica: a GoDaddy não aceita CNAME com Nome "@". Cadastre aqui o domínio com www (ex.: www.{d.domain}) e use Nome "www".</p>}
                    <p>Se já existir outro registro com esse mesmo Nome (A ou CNAME), edite ou exclua antes. Depois clique em "Verificar conexão".</p>
                    {(d as any).ssl_status && <p>Cadeado (SSL): <b className="text-foreground">{(d as any).ssl_status === "active" ? "ativo" : "aguardando"}</b></p>}
                    {(d as any).cf_error && <p className="text-destructive">{/does not CNAME/i.test((d as any).cf_error) ? "Ainda não encontramos o CNAME apontando para cname.omnibuildercrm.online. Confira o registro e aguarde alguns minutos." : /quota/i.test((d as any).cf_error) ? "A automação de domínios ainda está sendo ativada. Tente novamente em instantes." : (d as any).cf_error}</p>}
                  </div>
                )}

                <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50">
                  <Link2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div className="flex-1 text-[11px] text-muted-foreground space-y-0.5">
                    <p className="text-[10px] uppercase tracking-wider font-bold mb-1">Ligado à sua Loja Virtual</p>
                    <p>Loja: <a href={`https://${d.domain}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{d.domain}</a></p>
                    <p>Área de membros: <a href={`https://${d.domain}/membros`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{d.domain}/membros</a></p>
                    <p>Acompanhar pedido: {d.domain}/?pedido=...</p>
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
