import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Megaphone, Play, Pause, Trash2, Plus, Users } from "lucide-react";

export default function CampaignsList() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [showLeads, setShowLeads] = useState<string | null>(null);
  const [leadsAvail, setLeadsAvail] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!user) return;
    const [c, a] = await Promise.all([
      supabase.from("prospecting_campaigns").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("ai_agents").select("*").eq("user_id", user.id).eq("is_active", true),
    ]);
    setCampaigns(c.data || []);
    setAgents(a.data || []);
  };
  useEffect(() => { load(); }, [user]);

  const newCampaign = () => setEditing({
    name: "", description: "", agent_id: "", message_template: "Olá {{name}}, tudo bem?",
    daily_limit: 100, delay_min_seconds: 30, delay_max_seconds: 120, status: "draft", channel: "whatsapp",
  });

  const save = async () => {
    if (!user || !editing.name) { toast.error("Nome obrigatório"); return; }
    const payload: any = { ...editing, user_id: user.id };
    if (!payload.agent_id) delete payload.agent_id;
    delete payload.created_at; delete payload.updated_at;
    const { error } = editing.id
      ? await supabase.from("prospecting_campaigns").update(payload).eq("id", editing.id)
      : await supabase.from("prospecting_campaigns").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Campanha salva");
    setEditing(null); load();
  };

  const setStatus = async (id: string, status: string) => {
    await supabase.from("prospecting_campaigns").update({ status }).eq("id", id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir campanha?")) return;
    await supabase.from("prospecting_campaigns").delete().eq("id", id);
    load();
  };

  const openLeadsPicker = async (campaignId: string) => {
    if (!user) return;
    setShowLeads(campaignId);
    const { data } = await supabase.from("leads").select("id,name,phone,email").eq("user_id", user.id).limit(500);
    setLeadsAvail(data || []);
  };

  const addLeads = async (campaignId: string, leadIds: string[]) => {
    if (!user) return;
    setLoading(true);
    const rows = leadIds.map((leadId) => {
      const lead = leadsAvail.find((l) => l.id === leadId);
      return {
        user_id: user.id, campaign_id: campaignId, lead_id: leadId,
        name: lead?.name, phone: lead?.phone, email: lead?.email, status: "pending",
      };
    });
    const { error } = await supabase.from("campaign_contacts").insert(rows);
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success(`${rows.length} contatos adicionados`);
    setShowLeads(null);
  };

  const runEngine = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("prospecting-engine", { body: {} });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success(`Engine: ${data?.sent || 0} mensagens disparadas`);
    load();
  };

  if (editing) {
    return (
      <Card className="p-6 space-y-3">
        <h3 className="font-semibold">{editing.id ? "Editar" : "Nova"} Campanha</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Nome</Label>
            <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          </div>
          <div>
            <Label>Agente IA</Label>
            <select className="w-full h-10 px-3 rounded-md border border-input bg-background"
              value={editing.agent_id || ""} onChange={(e) => setEditing({ ...editing, agent_id: e.target.value })}>
              <option value="">— Sem IA (template estático) —</option>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <Label>Descrição</Label>
            <Input value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>Mensagem (use {"{{name}}"} e {"{{phone}}"})</Label>
            <Textarea rows={4} value={editing.message_template || ""} onChange={(e) => setEditing({ ...editing, message_template: e.target.value })} />
          </div>
          <div>
            <Label>Limite diário</Label>
            <Input type="number" value={editing.daily_limit} onChange={(e) => setEditing({ ...editing, daily_limit: +e.target.value })} />
          </div>
          <div>
            <Label>Delay min (s)</Label>
            <Input type="number" value={editing.delay_min_seconds} onChange={(e) => setEditing({ ...editing, delay_min_seconds: +e.target.value })} />
          </div>
          <div>
            <Label>Delay max (s)</Label>
            <Input type="number" value={editing.delay_max_seconds} onChange={(e) => setEditing({ ...editing, delay_max_seconds: +e.target.value })} />
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Campanhas de Prospecção</h3>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={runEngine} disabled={loading}>
            <Play className="h-4 w-4 mr-1" />Executar agora
          </Button>
          <Button size="sm" onClick={newCampaign}><Plus className="h-4 w-4 mr-1" />Nova campanha</Button>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">Nenhuma campanha. Crie a primeira.</Card>
      ) : campaigns.map((c) => (
        <Card key={c.id} className="p-4 flex items-center justify-between">
          <div>
            <p className="font-medium">{c.name}</p>
            <p className="text-xs text-muted-foreground">{c.description}</p>
            <div className="flex gap-2 mt-1">
              <Badge>{c.status}</Badge>
              <Badge variant="secondary">enviadas: {c.total_sent || 0}</Badge>
              <Badge variant="secondary">resp: {c.total_replied || 0}</Badge>
            </div>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => openLeadsPicker(c.id)}><Users className="h-4 w-4" /></Button>
            {c.status === "active" ? (
              <Button size="sm" variant="outline" onClick={() => setStatus(c.id, "paused")}><Pause className="h-4 w-4" /></Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setStatus(c.id, "active")}><Play className="h-4 w-4" /></Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setEditing(c)}>Editar</Button>
            <Button size="sm" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </Card>
      ))}

      {showLeads && (
        <Card className="p-4 fixed inset-4 z-50 overflow-auto bg-background border shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Adicionar leads à campanha ({leadsAvail.length} disponíveis)</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowLeads(null)}>Fechar</Button>
          </div>
          <LeadPicker leads={leadsAvail} onAdd={(ids) => addLeads(showLeads, ids)} />
        </Card>
      )}
    </div>
  );
}

function LeadPicker({ leads, onAdd }: { leads: any[]; onAdd: (ids: string[]) => void }) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  return (
    <div>
      <div className="flex gap-2 mb-2">
        <Button size="sm" variant="outline" onClick={() => setSel(new Set(leads.map((l) => l.id)))}>Todos</Button>
        <Button size="sm" variant="outline" onClick={() => setSel(new Set())}>Nenhum</Button>
        <Button size="sm" onClick={() => onAdd([...sel])} disabled={sel.size === 0}>Adicionar {sel.size}</Button>
      </div>
      <div className="space-y-1 max-h-[60vh] overflow-y-auto">
        {leads.map((l) => (
          <label key={l.id} className="flex items-center gap-2 p-2 rounded hover:bg-secondary/50 cursor-pointer">
            <input type="checkbox" checked={sel.has(l.id)} onChange={(e) => {
              const n = new Set(sel); e.target.checked ? n.add(l.id) : n.delete(l.id); setSel(n);
            }} />
            <span className="text-sm">{l.name}</span>
            <span className="text-xs text-muted-foreground">{l.phone}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
