import { useEffect, useState, useMemo } from "react";
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
  ChevronDown, ChevronUp, Download, Search, Filter, Clock, History,
  MessageCircle, PhoneCall, CheckSquare, StickyNote, ExternalLink,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#84cc16", "#3b82f6", "#f59e0b", "#8b5cf6", "#10b981", "#ef4444"];
const WON_STAGE_PATTERNS = ["fechado", "convertido", "venda", "ganho", "won", "closed"];

interface Stage { id: string; name: string; position: number; color: string; pipeline_id?: string; }
interface Lead {
  id: string; name: string; email: string | null; phone: string | null;
  company: string | null; value: number; stage_id: string | null;
  position: number; notes: string | null; source: string | null;
  status: string; created_at: string; tags: string[];
}
interface Activity { id: string; lead_id: string | null; description: string; type: string; created_at: string; }
interface Pipeline { id: string; name: string; created_at: string; }

type View = "kanban" | "dashboard";

const activityTypes = [
  { value: "note", label: "Nota", icon: StickyNote },
  { value: "call", label: "Ligação", icon: PhoneCall },
  { value: "email", label: "E-mail", icon: Mail },
  { value: "task", label: "Tarefa", icon: CheckSquare },
  { value: "message", label: "Mensagem", icon: MessageCircle },
];

const statusOptions = [
  { value: "new", label: "Novo" }, { value: "contacted", label: "Contatado" },
  { value: "qualified", label: "Qualificado" }, { value: "proposal", label: "Proposta" },
  { value: "won", label: "Ganho" }, { value: "lost", label: "Perdido" },
];

const isWonStage = (stageName: string) => WON_STAGE_PATTERNS.some(p => stageName.toLowerCase().includes(p));

const CRMKanban = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stages, setStages] = useState<Stage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("kanban");
  
  // ESTADO DE PIPELINES
  const [pipelines, setPipelines] = useState<Pipeline[]>([{ id: "default", name: "Pipeline Principal", created_at: "" }]);
  const [activePipeline, setActivePipeline] = useState("default");
  const [newPipelineName, setNewPipelineName] = useState("");
  const [showPipelineDialog, setShowPipelineDialog] = useState(false);

  // Estados de formulários e UI
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [globalAddOpen, setGlobalAddOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addStageId, setAddStageId] = useState<string | null>(null);
  const [newLead, setNewLead] = useState({ name: "", email: "", phone: "", company: "", value: "", notes: "", source: "", tags: "", stage_id: "" });
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editTab, setEditTab] = useState<"info" | "activity">("info");
  const [newActivity, setNewActivity] = useState({ type: "note", description: "" });
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const [newStageColor, setNewStageColor] = useState("#84cc16");
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [draggedLead, setDraggedLead] = useState<string | null>(null);
  const [newTag, setNewTag] = useState("");

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    // 1. Buscar Estágios FILTRANDO pela Pipeline Ativa
    const stagesRes = await supabase
      .from("pipeline_stages")
      .select("*")
      .eq("user_id", user.id)
      .eq("pipeline_id", activePipeline) // Filtro crucial
      .order("position");

    // 2. Buscar Leads (Os leads são filtrados via useMemo abaixo baseado nos estágios da pipeline)
    const leadsRes = await supabase
      .from("leads")
      .select("*")
      .eq("user_id", user.id)
      .order("position");

    const activitiesRes = await supabase
      .from("activities")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (stagesRes.data) setStages(stagesRes.data);
    if (leadsRes.data) setLeads(leadsRes.data.map((l: any) => ({ ...l, tags: Array.isArray(l.tags) ? l.tags : [] })));
    if (activitiesRes.data) setActivities(activitiesRes.data as Activity[]);
    setLoading(false);
  };

  // Recarrega sempre que trocar de Pipeline
  useEffect(() => { fetchData(); }, [user, activePipeline]);

  // Filtra Leads que pertencem aos estágios da Pipeline Ativa
  const filteredLeads = useMemo(() => {
    const currentStageIds = stages.map(s => s.id);
    return leads.filter(l => {
      if (!l.stage_id || !currentStageIds.includes(l.stage_id)) return false;
      if (searchTerm && !l.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !l.email?.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !l.company?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (filterStatus && l.status !== filterStatus) return false;
      if (filterSource && l.source !== filterSource) return false;
      return true;
    });
  }, [leads, stages, searchTerm, filterStatus, filterSource]);

  const handleAddStage = async () => {
    if (!user || !newStageName) return;
    const maxPos = stages.length > 0 ? Math.max(...stages.map(s => s.position)) + 1 : 0;
    await supabase.from("pipeline_stages").insert({ 
      user_id: user.id, 
      name: newStageName, 
      position: maxPos, 
      color: newStageColor,
      pipeline_id: activePipeline // Salva na pipeline correta
    });
    toast({ title: "Etapa criada!" });
    setNewStageName(""); setNewStageColor("#84cc16"); setStageDialogOpen(false);
    fetchData();
  };

  // ... (Mantenha as outras funções handleUpdateLead, handleDeleteLead, etc. identicas ao original)

  const handleExportLeads = () => {
    const csv = ["Nome,Email,Telefone,Empresa,Valor,Status,Fonte,Tags"].concat(
      filteredLeads.map(l => `"${l.name}","${l.email || ""}","${l.phone || ""}","${l.company || ""}",${l.value},"${l.status}","${l.source || ""}","${(l.tags || []).join(";")}"`)
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `leads-${activePipeline}.csv`; a.click();
    toast({ title: "Leads da pipeline exportados!" });
  };

  if (loading) return <div className="p-8 text-muted-foreground animate-pulse">Carregando CRM...</div>;

  return (
    <div className="space-y-4">
      {/* Seletor de Pipelines */}
      <div className="flex items-center gap-2 flex-wrap bg-background/50 p-2 rounded-lg border border-border/40">
        {pipelines.map(p => (
          <Button 
            key={p.id} 
            variant={activePipeline === p.id ? "default" : "outline"} 
            size="sm" 
            onClick={() => setActivePipeline(p.id)} 
            className="text-xs transition-all"
          >
            {p.name}
          </Button>
        ))}
        <Dialog open={showPipelineDialog} onOpenChange={setShowPipelineDialog}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 text-xs border border-dashed"><Plus className="h-3 w-3 mr-1" /> Nova Pipeline</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Criar Novo Pipeline</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-4">
              <Input value={newPipelineName} onChange={e => setNewPipelineName(e.target.value)} placeholder="Ex: Vendas High Ticket, Recrutamento..." className="bg-secondary/50 border-border" />
              <Button onClick={() => {
                if (!newPipelineName.trim()) return;
                const newId = `pipe-${Date.now()}`;
                setPipelines(prev => [...prev, { id: newId, name: newPipelineName, created_at: new Date().toISOString() }]);
                setActivePipeline(newId);
                setNewPipelineName(""); setShowPipelineDialog(false);
                toast({ title: "Pipeline criado!", description: "Agora adicione as etapas para esta pipeline." });
              }} className="w-full">Criar Pipeline</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ... O restante do código de controles e renderização do Kanban permanece igual, 
          mas agora ele renderizará apenas o que está em 'stages' e 'filteredLeads' 
          que já estão filtrados pela pipeline ativa no useEffect acima. ... */}
    </div>
  );
};

export default CRMKanban;