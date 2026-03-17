import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, GripVertical, DollarSign, Mail, Phone } from "lucide-react";

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
}

const CRMKanban = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stages, setStages] = useState<Stage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [addStageId, setAddStageId] = useState<string | null>(null);
  const [newLead, setNewLead] = useState({ name: "", email: "", phone: "", company: "", value: "" });
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

  const handleAddLead = async () => {
    if (!user || !newLead.name || !addStageId) return;
    const stageLeads = leads.filter((l) => l.stage_id === addStageId);
    const { error } = await supabase.from("leads").insert({
      user_id: user.id,
      name: newLead.name,
      email: newLead.email || null,
      phone: newLead.phone || null,
      company: newLead.company || null,
      value: parseFloat(newLead.value) || 0,
      stage_id: addStageId,
      position: stageLeads.length,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Lead adicionado!" });
      setNewLead({ name: "", email: "", phone: "", company: "", value: "" });
      setAddOpen(false);
      fetchData();
    }
  };

  const handleDrop = async (stageId: string) => {
    if (!draggedLead) return;
    const { error } = await supabase
      .from("leads")
      .update({ stage_id: stageId })
      .eq("id", draggedLead);
    if (!error) {
      setLeads((prev) =>
        prev.map((l) => (l.id === draggedLead ? { ...l, stage_id: stageId } : l))
      );
    }
    setDraggedLead(null);
  };

  if (loading) return <div className="text-muted-foreground">Carregando pipeline...</div>;

  return (
    <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: "calc(100vh - 180px)" }}>
      {stages.map((stage) => {
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
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {stageLeads.length}
                </span>
              </div>
              {totalValue > 0 && (
                <span className="text-xs text-lime font-medium">
                  R$ {totalValue.toLocaleString("pt-BR")}
                </span>
              )}
            </div>

            {/* Cards container */}
            <div className="flex-1 space-y-2 min-h-[100px] rounded-lg p-2 bg-muted/30 border border-border/50">
              {stageLeads.map((lead) => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={() => setDraggedLead(lead.id)}
                  className="surface-card rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-lime/30 transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
                      {lead.company && (
                        <p className="text-xs text-muted-foreground mt-0.5">{lead.company}</p>
                      )}
                    </div>
                    <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>

                  <div className="flex items-center gap-3 mt-2">
                    {lead.email && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Mail className="h-3 w-3" /> {lead.email}
                      </span>
                    )}
                    {lead.phone && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Phone className="h-3 w-3" />
                      </span>
                    )}
                  </div>

                  {lead.value > 0 && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-lime font-medium">
                      <DollarSign className="h-3 w-3" />
                      R$ {lead.value.toLocaleString("pt-BR")}
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
                  <DialogHeader>
                    <DialogTitle>Novo Lead — {stage.name}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 mt-2">
                    <div>
                      <Label>Nome *</Label>
                      <Input
                        value={newLead.name}
                        onChange={(e) => setNewLead((p) => ({ ...p, name: e.target.value }))}
                        placeholder="Nome do lead"
                        className="mt-1 bg-secondary/50 border-border"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>E-mail</Label>
                        <Input
                          value={newLead.email}
                          onChange={(e) => setNewLead((p) => ({ ...p, email: e.target.value }))}
                          placeholder="email@ex.com"
                          className="mt-1 bg-secondary/50 border-border"
                        />
                      </div>
                      <div>
                        <Label>Telefone</Label>
                        <Input
                          value={newLead.phone}
                          onChange={(e) => setNewLead((p) => ({ ...p, phone: e.target.value }))}
                          placeholder="(11) 99999-9999"
                          className="mt-1 bg-secondary/50 border-border"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Empresa</Label>
                        <Input
                          value={newLead.company}
                          onChange={(e) => setNewLead((p) => ({ ...p, company: e.target.value }))}
                          placeholder="Empresa"
                          className="mt-1 bg-secondary/50 border-border"
                        />
                      </div>
                      <div>
                        <Label>Valor (R$)</Label>
                        <Input
                          type="number"
                          value={newLead.value}
                          onChange={(e) => setNewLead((p) => ({ ...p, value: e.target.value }))}
                          placeholder="0"
                          className="mt-1 bg-secondary/50 border-border"
                        />
                      </div>
                    </div>
                    <Button onClick={handleAddLead} className="w-full bg-gradient-lime text-primary-foreground hover:opacity-90">
                      Adicionar Lead
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CRMKanban;
