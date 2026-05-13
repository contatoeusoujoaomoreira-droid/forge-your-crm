import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPlan, PLAN_DEFINITIONS } from "@/hooks/useUserPlan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, UserPlus, Trash2, ShieldCheck, Key, Pencil, X } from "lucide-react";

interface TeamMember {
  id: string;
  member_email: string;
  full_name: string | null;
  role: string;
  hierarchy: string;
  permissions: Record<string, boolean>;
  is_active: boolean;
  member_user_id: string | null;
  created_at: string;
}

const PLAN_LIMITS: Record<string, number> = { start: 0, pro: 5, enterprise: 20 };

const HIERARCHIES = [
  { id: "admin", label: "Admin completo", desc: "Acesso a quase tudo (sem painel super admin)" },
  { id: "manager", label: "Gestor", desc: "CRM, leads, automações, agenda e chat" },
  { id: "attendant", label: "Atendente", desc: "Apenas chat, leads/clientes e agenda" },
  { id: "custom", label: "Personalizado", desc: "Você escolhe módulo a módulo" },
];

const PERMISSION_KEYS: { key: string; label: string }[] = [
  { key: "crm", label: "CRM" },
  { key: "clients", label: "Clientes" },
  { key: "import", label: "Importar" },
  { key: "imported", label: "Listas importadas" },
  { key: "analytics", label: "Analytics" },
  { key: "pages", label: "Pages" },
  { key: "forms", label: "Forms" },
  { key: "quiz", label: "Quiz" },
  { key: "schedules", label: "Agenda" },
  { key: "checkout", label: "Checkout" },
  { key: "automation", label: "Automação" },
  { key: "chat", label: "Chat" },
];

const PRESETS: Record<string, Record<string, boolean>> = {
  admin: Object.fromEntries(PERMISSION_KEYS.map(p => [p.key, true])),
  manager: { crm: true, clients: true, import: true, imported: true, analytics: true, pages: false, forms: true, quiz: true, schedules: true, checkout: false, automation: true, chat: true },
  attendant: { crm: false, clients: true, import: false, imported: false, analytics: false, pages: false, forms: false, quiz: false, schedules: true, checkout: false, automation: false, chat: true },
};

export default function TeamMembersSection() {
  const { user, isSuperAdmin } = useAuth();
  const { plan } = useUserPlan();
  const planLabel = PLAN_DEFINITIONS[plan]?.label || "Start";
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [seatOverride, setSeatOverride] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [pwd, setPwd] = useState("");
  const [hier, setHier] = useState("attendant");
  const [customPerms, setCustomPerms] = useState<Record<string, boolean>>(PRESETS.attendant);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const planLimit = PLAN_LIMITS[plan] ?? 0;
  const limit = isSuperAdmin ? 9999 : Math.max(planLimit, seatOverride ?? 0);
  const canAdd = members.length < limit;

  const call = async (body: any) => {
    const { data, error } = await supabase.functions.invoke("manage-team-members", { body });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const load = async () => {
    if (!user) return;
    try {
      const data = await call({ action: "list" });
      setMembers((data.members || []) as any);
    } catch (e: any) { toast.error(e.message); }
    const { data: prof } = await supabase.from("profiles").select("team_seats").eq("user_id", user.id).maybeSingle();
    setSeatOverride((prof as any)?.team_seats ?? null);
  };
  useEffect(() => { load(); }, [user]);

  const onHierChange = (h: string) => {
    setHier(h);
    if (h !== "custom") setCustomPerms(PRESETS[h] || PRESETS.attendant);
  };

  const create = async () => {
    if (!email.trim() || !pwd || pwd.length < 6) { toast.error("Preencha e-mail e senha (mín. 6)"); return; }
    setLoading(true);
    try {
      await call({
        action: "create",
        email: email.trim(),
        password: pwd,
        full_name: name.trim() || null,
        hierarchy: hier,
        permissions: hier === "custom" ? customPerms : undefined,
      });
      toast.success("Usuário criado e ativado com sucesso!");
      setEmail(""); setPwd(""); setName(""); setHier("attendant"); setCustomPerms(PRESETS.attendant);
      setShowAdd(false); load();
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };

  const setHierarchy = async (m: TeamMember, h: string) => {
    try { await call({ action: "update", id: m.id, hierarchy: h }); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const togglePerm = async (m: TeamMember, key: string) => {
    const next = { ...m.permissions, [key]: !m.permissions[key] };
    try { await call({ action: "update", id: m.id, permissions: next, hierarchy: "custom" }); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const toggleActive = async (m: TeamMember) => {
    try { await call({ action: "update", id: m.id, is_active: !m.is_active }); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const resetPwd = async (m: TeamMember) => {
    const newPwd = prompt("Nova senha (mín. 6 caracteres):");
    if (!newPwd) return;
    try { await call({ action: "set_password", id: m.id, password: newPwd }); toast.success("Senha redefinida!"); }
    catch (e: any) { toast.error(e.message); }
  };

  const renameMember = async (m: TeamMember) => {
    const newName = prompt("Nome:", m.full_name || "");
    if (newName === null) return;
    try { await call({ action: "update", id: m.id, full_name: newName }); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const remove = async (m: TeamMember) => {
    const deleteAuth = confirm("Excluir também o login desse usuário? OK = sim, Cancelar = só remover do time.");
    try { await call({ action: "delete", id: m.id, delete_auth: deleteAuth }); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Usuários da conta
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Crie usuários internos com login próprio e defina a hierarquia. Plano <Badge variant="secondary" className="ml-1">{planLabel}</Badge> permite até <strong>{limit}</strong> ({members.length} usados).
          </p>
        </div>
        <Button size="sm" disabled={!canAdd} onClick={() => setShowAdd(!showAdd)}>
          <UserPlus className="h-4 w-4 mr-1" /> {showAdd ? "Cancelar" : "Criar usuário"}
        </Button>
      </div>

      {!canAdd && limit === 0 && (
        <div className="surface-card rounded-lg p-4 text-sm text-muted-foreground">
          Seu plano atual não inclui usuários extras. Faça upgrade para Pro (5) ou Enterprise (20).
        </div>
      )}

      {showAdd && canAdd && (
        <div className="surface-card rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Nome</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">E-mail *</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@empresa.com" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Senha *</label>
              <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-2">Hierarquia</label>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              {HIERARCHIES.map(h => (
                <button key={h.id} onClick={() => onHierChange(h.id)}
                  className={`text-left p-3 rounded-lg border transition-colors ${hier === h.id ? "bg-primary/10 border-primary text-foreground" : "bg-secondary/30 border-border text-muted-foreground hover:text-foreground"}`}>
                  <p className="text-xs font-bold">{h.label}</p>
                  <p className="text-[10px] mt-1 opacity-80">{h.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {hier === "custom" && (
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-2">Permissões</label>
              <div className="flex flex-wrap gap-2">
                {PERMISSION_KEYS.map(p => (
                  <button key={p.key} onClick={() => setCustomPerms({ ...customPerms, [p.key]: !customPerms[p.key] })}
                    className={`px-3 py-1.5 rounded-lg text-xs border ${customPerms[p.key] ? "bg-primary/10 border-primary/30 text-primary" : "bg-secondary/50 border-border text-muted-foreground"}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button onClick={create} disabled={loading}>{loading ? "Criando..." : "Criar e ativar usuário"}</Button>
        </div>
      )}

      {members.length === 0 ? (
        <div className="surface-card rounded-lg p-6 text-center">
          <Users className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-sm text-muted-foreground">Nenhum usuário cadastrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {members.map(m => (
            <div key={m.id} className="surface-card rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <ShieldCheck className={`h-4 w-4 ${m.is_active ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{m.full_name || m.member_email}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {m.member_email} • {m.member_user_id ? "ativo" : "pendente"}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] uppercase">{HIERARCHIES.find(h => h.id === m.hierarchy)?.label || m.hierarchy}</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <select value={m.hierarchy} onChange={e => setHierarchy(m, e.target.value)} className="h-7 text-xs rounded-md border border-border bg-secondary/50 px-2">
                    {HIERARCHIES.map(h => <option key={h.id} value={h.id}>{h.label}</option>)}
                  </select>
                  <Button variant="ghost" size="sm" onClick={() => renameMember(m)} className="h-7 px-2" title="Renomear"><Pencil className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => resetPwd(m)} className="h-7 px-2" title="Resetar senha"><Key className="h-3 w-3" /></Button>
                  <Switch checked={m.is_active} onCheckedChange={() => toggleActive(m)} />
                  <Button variant="ghost" size="sm" onClick={() => remove(m)} className="text-destructive h-7 px-2"><Trash2 className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(editing === m.id ? null : m.id)} className="h-7 px-2 text-xs">{editing === m.id ? <X className="h-3 w-3" /> : "Permissões"}</Button>
                </div>
              </div>

              {editing === m.id && (
                <div className="pt-2 border-t border-border">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Permissões personalizadas</p>
                  <div className="flex flex-wrap gap-2">
                    {PERMISSION_KEYS.map(p => (
                      <button key={p.key} onClick={() => togglePerm(m, p.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs border ${m.permissions?.[p.key] ? "bg-primary/10 border-primary/30 text-primary" : "bg-secondary/50 border-border text-muted-foreground"}`}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
