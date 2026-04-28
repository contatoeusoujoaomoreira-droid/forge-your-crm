import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPlan, PLAN_DEFINITIONS } from "@/hooks/useUserPlan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, UserPlus, Trash2, ShieldCheck } from "lucide-react";

interface TeamMember {
  id: string;
  member_email: string;
  full_name: string | null;
  role: string;
  permissions: { chat?: boolean; leads?: boolean; campaigns?: boolean };
  is_active: boolean;
  member_user_id: string | null;
  created_at: string;
}

const PLAN_LIMITS: Record<string, number> = { start: 0, pro: 5, enterprise: 20 };

export default function TeamMembersSection() {
  const { user } = useAuth();
  const { plan } = useUserPlan();
  const planLabel = PLAN_DEFINITIONS[plan]?.label || "Start";
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [perms, setPerms] = useState({ chat: true, leads: true, campaigns: false });
  const [loading, setLoading] = useState(false);

  const limit = PLAN_LIMITS[plan] ?? 0;
  const canAdd = members.length < limit;

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("team_members").select("*").eq("owner_user_id", user.id).order("created_at", { ascending: false });
    setMembers((data || []) as any);
  };
  useEffect(() => { load(); }, [user]);

  const add = async () => {
    if (!user || !email.trim()) { toast.error("E-mail obrigatório"); return; }
    setLoading(true);
    const { error } = await supabase.from("team_members").insert({
      owner_user_id: user.id,
      member_email: email.trim().toLowerCase(),
      full_name: name.trim() || null,
      role: "attendant",
      permissions: perms,
      is_active: true,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Atendente convidado. Quando ele criar conta com este e-mail, será vinculado automaticamente.");
    setEmail(""); setName(""); setShowAdd(false); load();
  };

  const togglePerm = async (m: TeamMember, key: keyof typeof perms) => {
    const next = { ...m.permissions, [key]: !m.permissions[key] };
    await supabase.from("team_members").update({ permissions: next as any }).eq("id", m.id);
    load();
  };

  const toggleActive = async (m: TeamMember) => {
    await supabase.from("team_members").update({ is_active: !m.is_active }).eq("id", m.id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remover este atendente?")) return;
    await supabase.from("team_members").delete().eq("id", id);
    load();
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Equipe / Atendentes
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Convide atendentes para responder conversas e gerenciar leads. Plano <Badge variant="secondary" className="ml-1">{planLabel}</Badge> permite até <strong>{limit}</strong> atendentes ({members.length} usados).
          </p>
        </div>
        <Button size="sm" disabled={!canAdd} onClick={() => setShowAdd(!showAdd)}>
          <UserPlus className="h-4 w-4 mr-1" /> Convidar
        </Button>
      </div>

      {!canAdd && limit === 0 && (
        <div className="surface-card rounded-lg p-4 text-sm text-muted-foreground">
          Seu plano atual não inclui atendentes extras. Faça upgrade para Pro (5 atendentes) ou Enterprise (20).
        </div>
      )}

      {showAdd && canAdd && (
        <div className="surface-card rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">E-mail</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="atendente@empresa.com" className="bg-secondary/50 border-border" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Nome (opcional)</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do atendente" className="bg-secondary/50 border-border" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["chat", "leads", "campaigns"] as const).map(k => (
              <label key={k} className="flex items-center justify-between p-2 rounded-md bg-secondary/30 text-sm capitalize">
                <span>{k === "chat" ? "Chat" : k === "leads" ? "Leads/CRM" : "Campanhas"}</span>
                <Switch checked={perms[k]} onCheckedChange={(v) => setPerms({ ...perms, [k]: v })} />
              </label>
            ))}
          </div>
          <Button onClick={add} disabled={loading}>{loading ? "Salvando..." : "Convidar Atendente"}</Button>
        </div>
      )}

      {members.length === 0 ? (
        <div className="surface-card rounded-lg p-6 text-center">
          <Users className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-sm text-muted-foreground">Nenhum atendente cadastrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {members.map(m => (
            <div key={m.id} className="surface-card rounded-lg p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <ShieldCheck className={`h-4 w-4 ${m.is_active ? "text-primary" : "text-muted-foreground"}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{m.full_name || m.member_email}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {m.member_email} • {m.member_user_id ? "ativo" : "pendente registro"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {(["chat", "leads", "campaigns"] as const).map(k => (
                  <label key={k} className="flex items-center gap-1 text-[10px] uppercase">
                    {k}
                    <Switch checked={!!m.permissions[k]} onCheckedChange={() => togglePerm(m, k)} />
                  </label>
                ))}
                <Switch checked={m.is_active} onCheckedChange={() => toggleActive(m)} />
                <Button variant="ghost" size="sm" onClick={() => remove(m.id)} className="text-destructive h-7 px-2">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
