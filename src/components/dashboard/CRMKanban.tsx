import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus, GripVertical, DollarSign, Mail, Phone, Pencil, Trash2, X,
  Users, TrendingUp, Target, BarChart3, Tag, MessageSquare, Building,
  ChevronDown, ChevronUp, Download,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#84cc16", "#3b82f6", "#f59e0b", "#8b5cf6", "#10b981", "#ef4444"];

interface Stage {
  id: string;
  name: string;
  position: number;
  color: string;
}

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  value: number;
  stage_id: string | null;
  position: number;
  notes: string | null;
  source: string | null;
  status: string;
  created_at: string;
}

type View = "kanban" | "dashboard";

const CRMKanban = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stages, setStages] = useState<Stage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("kanban");

  // Add lead
  const [addOpen, setAddOpen] = useState(false);
  const [addStageId, setAddStageId] = useState<string | null>(null);
  const [newLead, setNewLead] = useState({ name: "", email: "", phone: "", company: "", value: "", notes: "", source: "" });

  // Edit lead
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  // Pipeline management
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const [newStageColor, setNewStageColor] = useState("#84cc16");
  const [editingStage, setEditingStage] = useState<Stage | null>(null);

  const [draggedLead, setDraggedLead] = useState<string | null>(null);

  const fetchData = async () => {
    if (!user) return;
    const [stagesRes, leadsRes] = await Promise.all([
      supabase.from("pipeline_stages").select("*").eq("user_id", user.id).order("position"),
      supabase.from("leads").select("*").eq("user_id", user.id).order("position"),
    ]);
    if (stagesRes.data) setStages(stagesRes.data);
    if (leadsRes.data) setLeads(leadsRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  // Lead CRUD
  const handleAddLead = async () => {
    if (!user || !newLead.name || !addStageId) return;
    const stageLeads = leads.filter((l) => l.stage_id === addStageId);
    const { error } = await supabase.from("leads").insert({
      user_id: user.id, name: newLead.name, email: newLead.email || null,
      phone: newLead.phone || null, company: newLead.company || null,
      value: parseFloat(newLead.value) || 0, stage_id: addStageId,
      position: stageLeads.length, notes: newLead.notes || null, source: newLead.source || null,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Lead adicionado!" });
    setNewLead({ name: "", email: "", phone: "", company: "", value: "", notes: "", source: "" });
    setAddOpen(false);
    fetchData();
  };

  const handleUpdateLead = async () => {
    if (!editLead) return;
    const { error } = await supabase.from("leads").update({
      name: editLead.name, email: editLead.email, phone: editLead.phone,
      company: editLead.company, value: editLead.value, notes: editLead.notes,
      source: editLead.source, status: editLead.status,
    }).eq("id", editLead.id);
    if (error) { toast({ title: "Erro", variant: "destructive" }); return; }
    toast({ title: "Lead atualizado!" });
    setEditOpen(false);
    setEditLead(null);
    fetchData();
  };

  const handleDeleteLead = async (id: string) => {
    await supabase.from("leads").delete().eq("id", id);
    toast({ title: "Lead excluído" });
    fetchData();
  };

  const handleDrop = async (stageId: string) => {
    if (!draggedLead) return;
    const { error } = await supabase.from("leads").update({ stage_id: stageId }).eq("id", draggedLead);
    if (!error) setLeads(prev => prev.map(l => l.id === draggedLead ? { ...l, stage_id: stageId } : l));
    setDraggedLead(null);
  };

  // Stage CRUD
  const handleAddStage = async () => {
    if (!user || !newStageName) return;
    const maxPos = stages.length > 0 ? Math.max(...stages.map(s => s.position)) + 1 : 0;
    const { error } = await supabase.from("pipeline_stages").insert({
      user_id: user.id, name: newStageName, position: maxPos, color: newStageColor,
    });
    if (error) { toast({ title: error.message, variant: "destructive" }); return; }
    toast({ title: "Etapa criada!" });
    setNewStageName(""); setNewStageColor("#84cc16"); setStageDialogOpen(false);
    fetchData();
  };

  const handleUpdateStage = async () => {
    if (!editingStage) return;
    const { error } = await supabase.from("pipeline_stages").update({
      name: editingStage.name, color: editingStage.color,
    }).eq("id", editingStage.id);
    if (error) { toast({ title: error.message, variant: "destructive" }); return; }
    toast({ title: "Etapa atualizada!" });
    setEditingStage(null);
    fetchData();
  };

  const handleDeleteStage = async (id: string) => {
    await supabase.from("pipeline_stages").delete().eq("id", id);
    toast({ title: "Etapa excluída" });
    fetchData();
  };

  const handleMoveStage = async (stageId: string, direction: "up" | "down") => {
    const idx = stages.findIndex(s => s.id === stageId);
    if (idx === -1) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === stages.length - 1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const newStages = [...stages];
    [newStages[idx], newStages[swapIdx]] = [newStages[swapIdx], newStages[idx]];
    newStages.forEach((s, i) => s.position = i);
    setStages(newStages);
    await Promise.all(newStages.map(s => supabase.from("pipeline_stages").update({ position: s.position }).eq("id", s.id)));
  };

  const handleExportLeads = () => {
    const csv = ["Nome,Email,Telefone,Empresa,Valor,Status,Fonte"].concat(
      leads.map(l => `"${l.name}","${l.email || ""}","${l.phone || ""}","${l.company || ""}",${l.value},"${l.status}","${l.source || ""}"`)
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "leads.csv"; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Leads exportados!" });
  };

  if (loading) return <div className="text-muted-foreground">Carregando CRM...</div>;

  // Dashboard KPIs
  const totalLeads = leads.length;
  const totalValue = leads.reduce((s, l) => s + (l.value || 0), 0);
  const wonLeads = leads.filter(l => l.status === "won");
  const wonValue = wonLeads.reduce((s, l) => s + (l.value || 0), 0);
  const conversionRate = totalLeads > 0 ? ((wonLeads.length / totalLeads) * 100).toFixed(1) : "0";

  const stageData = stages.map(stage => {
    const stageLeads = leads.filter(l => l.stage_id === stage.id);
    return { name: stage.name, count: stageLeads.length, value: stageLeads.reduce((s, l) => s + (l.value || 0), 0) };
  });

  const statusCounts: Record<string, number> = {};
  leads.forEach(l => { statusCounts[l.status] = (statusCounts[l.status] || 0) + 1; });
  const statusLabels: Record<string, string> = { new: "Novo", contacted: "Contatado", qualified: "Qualificado", proposal: "Proposta", won: "Ganho", lost: "Perdido" };
  const statusData = Object.entries(statusCounts).map(([k, v]) => ({ name: statusLabels[k] || k, value: v }));

  const leadFormFields = (data: any, setData: (d: any) => void) => (
    <div className="space-y-3">
      <div>
        <Label>Nome *</Label>
        <Input value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} placeholder="Nome" className="mt-1 bg-secondary/50 border-border" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>E-mail</Label>
          <Input value={data.email || ""} onChange={(e) => setData({ ...data, email: e.target.value })} placeholder="email@ex.com" className="mt-1 bg-secondary/50 border-border" />
        </div>
        <div>
          <Label>WhatsApp</Label>
          <Input value={data.phone || ""} onChange={(e) => setData({ ...data, phone: e.target.value })} placeholder="(11) 99999-9999" className="mt-1 bg-secondary/50 border-border" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Empresa</Label>
          <Input value={data.company || ""} onChange={(e) => setData({ ...data, company: e.target.value })} placeholder="Empresa" className="mt-1 bg-secondary/50 border-border" />
        </div>
        <div>
          <Label>Valor (R$)</Label>
          <Input type="number" value={data.value || ""} onChange={(e) => setData({ ...data, value: e.target.value })} placeholder="0" className="mt-1 bg-secondary/50 border-border" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Fonte</Label>
          <Input value={data.source || ""} onChange={(e) => setData({ ...data, source: e.target.value })} placeholder="Instagram, Google..." className="mt-1 bg-secondary/50 border-border" />
        </div>
        {data.status !== undefined && (
          <div>
            <Label>Status</Label>
            <select value={data.status} onChange={(e) => setData({ ...data, status: e.target.value })} className="w-full mt-1 h-10 bg-secondary/50 border border-border rounded-md px-3 text-sm text-foreground">
              <option value="new">Novo</option>
              <option value="contacted">Contatado</option>
              <option value="qualified">Qualificado</option>
              <option value="proposal">Proposta</option>
              <option value="won">Ganho</option>
              <option value="lost">Perdido</option>
            </select>
          </div>
        )}
      </div>
      <div>
        <Label>Notas</Label>
        <Textarea value={data.notes || ""} onChange={(e) => setData({ ...data, notes: e.target.value })} placeholder="Observações..." className="mt-1 bg-secondary/50 border-border" rows={2} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Top controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant={view === "kanban" ? "default" : "outline"} size="sm" onClick={() => setView("kanban")}>Kanban</Button>
          <Button variant={view === "dashboard" ? "default" : "outline"} size="sm" onClick={() => setView("dashboard")}>
            <BarChart3 className="h-4 w-4 mr-1" /> Dashboard
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportLeads}><Download className="h-4 w-4 mr-1" /> Exportar</Button>
          <Dialog open={stageDialogOpen} onOpenChange={setStageDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" /> Nova Etapa</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle>Nova Etapa</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div>
                  <Label>Nome</Label>
                  <Input value={newStageName} onChange={(e) => setNewStageName(e.target.value)} placeholder="Nome da etapa" className="mt-1 bg-secondary/50 border-border" />
                </div>
                <div>
                  <Label>Cor</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="color" value={newStageColor} onChange={(e) => setNewStageColor(e.target.value)} className="h-10 w-10 rounded border border-border cursor-pointer" />
                    <Input value={newStageColor} onChange={(e) => setNewStageColor(e.target.value)} className="bg-secondary/50 border-border" />
                  </div>
                </div>
                <Button onClick={handleAddStage} className="w-full">Criar Etapa</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Dashboard View */}
      {view === "dashboard" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total de Leads", value: totalLeads, icon: Users, color: "text-blue-400" },
              { label: "Valor Total", value: `R$ ${totalValue.toLocaleString("pt-BR")}`, icon: DollarSign, color: "text-primary" },
              { label: "Valor Ganho", value: `R$ ${wonValue.toLocaleString("pt-BR")}`, icon: TrendingUp, color: "text-emerald-400" },
              { label: "Conversão", value: `${conversionRate}%`, icon: Target, color: "text-purple-400" },
            ].map((m) => (
              <Card key={m.label} className="surface-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{m.label}</p>
                      <p className="text-2xl font-bold text-foreground mt-1">{m.value}</p>
                    </div>
                    <m.icon className={`h-8 w-8 ${m.color} opacity-60`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="surface-card border-border">
              <CardHeader><CardTitle className="text-sm font-medium">Leads por Etapa</CardTitle></CardHeader>
              <CardContent>
                {stageData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={stageData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 12%)" />
                      <XAxis dataKey="name" stroke="hsl(0 0% 45%)" fontSize={12} />
                      <YAxis stroke="hsl(0 0% 45%)" fontSize={12} />
                      <Tooltip contentStyle={{ background: "hsl(0 0% 4%)", border: "1px solid hsl(0 0% 12%)", borderRadius: 8 }} />
                      <Bar dataKey="count" fill="hsl(84 81% 44%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-muted-foreground text-sm text-center py-12">Sem dados</p>}
              </CardContent>
            </Card>
            <Card className="surface-card border-border">
              <CardHeader><CardTitle className="text-sm font-medium">Status</CardTitle></CardHeader>
              <CardContent>
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                        {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(0 0% 4%)", border: "1px solid hsl(0 0% 12%)", borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-muted-foreground text-sm text-center py-12">Sem dados</p>}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Kanban View */}
      {view === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: "calc(100vh - 260px)" }}>
          {stages.map((stage, sIdx) => {
            const stageLeads = leads.filter((l) => l.stage_id === stage.id);
            const totalValue = stageLeads.reduce((sum, l) => sum + (l.value || 0), 0);

            return (
              <div
                key={stage.id}
                className="flex-shrink-0 w-72 flex flex-col"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(stage.id)}
              >
                {/* Column header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                    <h3 className="text-sm font-semibold text-foreground">{stage.name}</h3>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{stageLeads.length}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {totalValue > 0 && <span className="text-xs text-primary font-medium mr-1">R$ {totalValue.toLocaleString("pt-BR")}</span>}
                    <button onClick={() => handleMoveStage(stage.id, "up")} className="p-0.5 hover:bg-secondary rounded" disabled={sIdx === 0}><ChevronUp className="h-3 w-3 text-muted-foreground" /></button>
                    <button onClick={() => handleMoveStage(stage.id, "down")} className="p-0.5 hover:bg-secondary rounded" disabled={sIdx === stages.length - 1}><ChevronDown className="h-3 w-3 text-muted-foreground" /></button>
                    <button onClick={() => setEditingStage({ ...stage })} className="p-0.5 hover:bg-secondary rounded"><Pencil className="h-3 w-3 text-muted-foreground" /></button>
                    <button onClick={() => handleDeleteStage(stage.id)} className="p-0.5 hover:bg-destructive/20 rounded"><Trash2 className="h-3 w-3 text-destructive" /></button>
                  </div>
                </div>

                {/* Cards container */}
                <div className="flex-1 space-y-2 min-h-[100px] rounded-lg p-2 bg-muted/30 border border-border/50">
                  {stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={() => setDraggedLead(lead.id)}
                      onClick={() => { setEditLead({ ...lead }); setEditOpen(true); }}
                      className="surface-card rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-primary/30 transition-colors group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
                          {lead.company && <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Building className="h-3 w-3" />{lead.company}</p>}
                        </div>
                        <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>

                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {lead.email && <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Mail className="h-3 w-3" /></span>}
                        {lead.phone && <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Phone className="h-3 w-3" /></span>}
                        {lead.source && <span className="flex items-center gap-1 text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded"><Tag className="h-3 w-3" />{lead.source}</span>}
                      </div>

                      {lead.value > 0 && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-primary font-medium">
                          <DollarSign className="h-3 w-3" />R$ {lead.value.toLocaleString("pt-BR")}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add lead button */}
                  <Dialog open={addOpen && addStageId === stage.id} onOpenChange={(open) => { setAddOpen(open); if (open) setAddStageId(stage.id); }}>
                    <DialogTrigger asChild>
                      <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50 transition-colors">
                        <Plus className="h-4 w-4" /> Adicionar
                      </button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border">
                      <DialogHeader><DialogTitle>Novo Lead — {stage.name}</DialogTitle></DialogHeader>
                      {leadFormFields(newLead, setNewLead)}
                      <Button onClick={handleAddLead} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">Adicionar Lead</Button>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Lead Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle>Editar Lead</DialogTitle></DialogHeader>
          {editLead && (
            <>
              {leadFormFields(editLead, setEditLead)}
              <div className="flex gap-2">
                <Button onClick={handleUpdateLead} className="flex-1">Salvar</Button>
                <Button variant="destructive" onClick={() => { handleDeleteLead(editLead.id); setEditOpen(false); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Stage Dialog */}
      <Dialog open={!!editingStage} onOpenChange={(open) => !open && setEditingStage(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Editar Etapa</DialogTitle></DialogHeader>
          {editingStage && (
            <div className="space-y-3 mt-2">
              <div>
                <Label>Nome</Label>
                <Input value={editingStage.name} onChange={(e) => setEditingStage({ ...editingStage, name: e.target.value })} className="mt-1 bg-secondary/50 border-border" />
              </div>
              <div>
                <Label>Cor</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={editingStage.color} onChange={(e) => setEditingStage({ ...editingStage, color: e.target.value })} className="h-10 w-10 rounded border border-border cursor-pointer" />
                  <Input value={editingStage.color} onChange={(e) => setEditingStage({ ...editingStage, color: e.target.value })} className="bg-secondary/50 border-border" />
                </div>
              </div>
              <Button onClick={handleUpdateStage} className="w-full">Salvar Etapa</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CRMKanban;
