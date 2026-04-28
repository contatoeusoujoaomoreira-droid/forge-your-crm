import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Plus, Trash2, Users, Shield, Key,
  BarChart3, Globe, FileText, FileQuestion, Calendar, ShoppingCart, LayoutDashboard,
  RefreshCw, UserPlus, ChevronDown, ChevronRight, Zap, MessageCircle, Upload, History, Coins, Settings,
} from "lucide-react";
import UsageHistoryTab from "./superadmin/UsageHistoryTab";
import CreditRequestsTab from "./superadmin/CreditRequestsTab";
import CreditCostsTab from "./superadmin/CreditCostsTab";

interface ManagedUser {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  ai_credits: number;
  permissions: Record<string, boolean>;
  created_at: string;
  user_id: string | null;
}

const PERMISSION_LABELS: Record<string, { label: string; icon: any }> = {
  crm: { label: "CRM", icon: LayoutDashboard },
  clients: { label: "Clientes", icon: Users },
  import: { label: "Importar", icon: Upload },
  analytics: { label: "Analytics", icon: BarChart3 },
  pages: { label: "Pages", icon: Globe },
  forms: { label: "Forms", icon: FileText },
  quiz: { label: "Quiz", icon: FileQuestion },
  schedules: { label: "Agenda", icon: Calendar },
  checkout: { label: "Checkout", icon: ShoppingCart },
  automation: { label: "Automação", icon: Zap },
  chat: { label: "Chat", icon: MessageCircle },
};

const SuperAdminPanel = () => {
  const { session } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // Create form
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newCredits, setNewCredits] = useState(100);
  const [newPerms, setNewPerms] = useState<Record<string, boolean>>({
    crm: true, clients: true, import: true, analytics: true, pages: true, forms: true, quiz: true, schedules: true, checkout: true, automation: true, chat: true,
  });
  const [creating, setCreating] = useState(false);

  const callEdge = async (body: any) => {
    const { data, error } = await supabase.functions.invoke("manage-users", { body });
    if (error) throw error;
    return data;
  };

  const fetchUsers = async () => {
    try {
      const data = await callEdge({ action: "list_users" });
      setUsers(data.users || []);
    } catch (e: any) {
      toast({ title: "Erro ao carregar usuários", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async () => {
    if (!newEmail || !newPassword || newPassword.length < 6) {
      toast({ title: "Preencha e-mail e senha (mín. 6 caracteres)", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      await callEdge({
        action: "create_user",
        email: newEmail,
        password: newPassword,
        full_name: newName || null,
        permissions: newPerms,
        ai_credits: newCredits,
      });
      toast({ title: "Usuário criado com sucesso!" });
      setNewEmail(""); setNewPassword(""); setNewName(""); setNewCredits(100);
      setShowCreate(false);
      fetchUsers();
    } catch (e: any) {
      toast({ title: "Erro ao criar usuário", description: e.message, variant: "destructive" });
    }
    setCreating(false);
  };

  const handleToggleActive = async (u: ManagedUser) => {
    try {
      await callEdge({ action: "update_user", managed_user_id: u.id, is_active: !u.is_active });
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_active: !x.is_active } : x));
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleUpdatePerms = async (u: ManagedUser, key: string) => {
    const newPerms = { ...u.permissions, [key]: !u.permissions[key] };
    try {
      await callEdge({ action: "update_user", managed_user_id: u.id, permissions: newPerms });
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, permissions: newPerms } : x));
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleUpdateCredits = async (u: ManagedUser, credits: number) => {
    try {
      await callEdge({ action: "update_user", managed_user_id: u.id, ai_credits: credits });
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, ai_credits: credits } : x));
      toast({ title: "Créditos atualizados!" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (u: ManagedUser) => {
    if (!confirm(`Remover ${u.email}? Isso excluirá a conta permanentemente.`)) return;
    try {
      await callEdge({ action: "delete_user", managed_user_id: u.id });
      setUsers(prev => prev.filter(x => x.id !== u.id));
      toast({ title: "Usuário removido" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleResetPassword = async (u: ManagedUser) => {
    const newPwd = prompt("Nova senha (mín. 6 caracteres):");
    if (!newPwd || newPwd.length < 6) return;
    try {
      await callEdge({ action: "reset_password", managed_user_id: u.id, new_password: newPwd });
      toast({ title: "Senha redefinida!" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> Super Admin
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Gerencie usuários, permissões e créditos de IA.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            <UserPlus className="h-4 w-4 mr-1" /> Novo Usuário
          </Button>
        </div>
      </div>

      {showCreate && (
        <div className="surface-card rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" /> Criar Novo Acesso
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Nome</label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome completo" className="bg-secondary/50 border-border" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">E-mail *</label>
              <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@exemplo.com" className="bg-secondary/50 border-border" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Senha *</label>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="bg-secondary/50 border-border" />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-2">Créditos de IA</label>
            <Input type="number" value={newCredits} onChange={e => setNewCredits(Number(e.target.value))} className="w-32 bg-secondary/50 border-border" />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-2">Permissões</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(PERMISSION_LABELS).map(([key, { label, icon: Icon }]) => (
                <button
                  key={key}
                  onClick={() => setNewPerms(p => ({ ...p, [key]: !p[key] }))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                    newPerms[key]
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-secondary/50 border-border text-muted-foreground"
                  }`}
                >
                  <Icon className="h-3 w-3" /> {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Criando..." : "Criar Usuário"}
            </Button>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="surface-card rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-foreground">{users.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Total de Usuários</div>
        </div>
        <div className="surface-card rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-primary">{users.filter(u => u.is_active).length}</div>
          <div className="text-xs text-muted-foreground mt-1">Ativos</div>
        </div>
        <div className="surface-card rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-muted-foreground">{users.filter(u => !u.is_active).length}</div>
          <div className="text-xs text-muted-foreground mt-1">Inativos</div>
        </div>
      </div>

      {/* Users List */}
      {loading ? (
        <div className="text-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>
      ) : users.length === 0 ? (
        <div className="surface-card rounded-xl p-12 text-center">
          <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-sm text-muted-foreground">Nenhum usuário criado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="surface-card rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold ${u.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {(u.full_name || u.email)[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{u.full_name || "Sem nome"}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${u.is_active ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                    {u.is_active ? "Ativo" : "Inativo"}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">
                    {u.ai_credits} créditos IA
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                    {expandedUser === u.id ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  <Switch checked={u.is_active} onCheckedChange={() => handleToggleActive(u)} />
                  <Button variant="ghost" size="sm" onClick={() => handleResetPassword(u)} className="h-7 px-2 text-xs">
                    <Key className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(u)} className="h-7 px-2 text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {expandedUser === u.id && (
                <div className="px-4 pb-4 pt-0 space-y-3 border-t border-border mt-0">
                  <div className="pt-3">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-2">Permissões</label>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(PERMISSION_LABELS).map(([key, { label, icon: Icon }]) => (
                        <button
                          key={key}
                          onClick={() => handleUpdatePerms(u, key)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                            u.permissions[key]
                              ? "bg-primary/10 border-primary/30 text-primary"
                              : "bg-secondary/50 border-border text-muted-foreground"
                          }`}
                        >
                          <Icon className="h-3 w-3" /> {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Créditos IA:</label>
                    <Input
                      type="number"
                      defaultValue={u.ai_credits}
                      onBlur={e => {
                        const v = Number(e.target.value);
                        if (v !== u.ai_credits) handleUpdateCredits(u, v);
                      }}
                      className="w-24 h-7 text-xs bg-secondary/50 border-border"
                    />
                  </div>

                  <div className="text-[10px] text-muted-foreground">
                    Criado em {new Date(u.created_at).toLocaleDateString("pt-BR")} • ID: {u.user_id ? u.user_id.slice(0, 8) + "..." : "Aguardando primeiro login"}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SuperAdminPanel;
