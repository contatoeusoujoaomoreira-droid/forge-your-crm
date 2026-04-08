import { useEffect, useState, useMemo, useRef } from "react";
import { handleCRMEvent, isConversionStage } from "@/lib/crm-events";
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
  Upload, AlertTriangle, CheckCircle, Square, LayoutGrid, List, Settings2,
  Calendar, ArrowRight, Copy, Check, User, Briefcase, Globe, Share2,
  Flame, Snowflake, Thermometer, AlertCircle, Zap, TrendingDown, RefreshCw, Hourglass
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#84cc16", "#3b82f6", "#f59e0b", "#8b5cf6", "#10b981", "#ef4444"];
const WON_STAGE_PATTERNS = ["fechado", "convertido", "venda", "ganho", "won", "closed"];

// Inteligências de Negócio Nativas
const STAGNATION_DAYS = 7;
const RECOMPRA_ALERT_DAYS = 30;
const LEAD_SCORE_WEIGHTS = {
  hasEmail: 10, hasPhone: 10, hasCompany: 5,
  hasUrgency: 15, hasValue: 20, hasProbability: 15,
  hasRedes: 10, hasUTM: 10, hasNotes: 5
};

interface Stage { id: string; name: string; position: number; color: string; pipeline_id?: string | null; }
interface Lead {
  id: string; name: string; email: string | null; phone: string | null;
  company: string | null; value: number; stage_id: string | null;
  position: number; notes: string | null; source: string | null;
  status: string; created_at: string; tags: string[];
  priority?: string | null;
  urgency?: string | null;
  revenue_type?: string | null;
  monthly_value?: number | null;
  contract_months?: number | null;
  probability?: number | null;
  instagram?: string | null;
  facebook?: string | null;
  linkedin?: string | null;
  website?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
}
interface Activity { id: string; lead_id: string | null; description: string; type: string; created_at: string; }
interface Pipeline { id: string; name: string; created_at: string; }

type View = "kanban" | "dashboard" | "list";

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
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [activePipeline, setActivePipeline] = useState<string | null>(null);
  const [newPipelineName, setNewPipelineName] = useState("");
  const [showPipelineDialog, setShowPipelineDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterPriority, setFilterPriority] = useState("Todos");
  
  // Bulk actions
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState("");
  const [bulkStageId, setBulkStageId] = useState("");
  const [bulkTag, setBulkTag] = useState("");
  
  // CSV Import
  const [showImport, setShowImport] = useState(false);
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvMapping, setCsvMapping] = useState<Record<string, string>>({});
  const csvRef = useRef<HTMLInputElement>(null);
  
  // Duplicate detection
  const [duplicateWarning, setDuplicateWarning] = useState<Lead | null>(null);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertRevenueType, setConvertRevenueType] = useState<"one_time" | "recorrente">("one_time");

  const [globalAddOpen, setGlobalAddOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addStageId, setAddStageId] = useState<string | null>(null);
  const [newLead, setNewLead] = useState({ 
    name: "", email: "", phone: "", company: "", value: "", notes: "", source: "", tags: "", stage_id: "",
    priority: "medium", urgency: "medium", revenue_type: "one_time", monthly_value: "", contract_months: "1",
    probability: "50", instagram: "", facebook: "", linkedin: "", website: "",
    utm_source: "", utm_medium: "", utm_campaign: ""
  });
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editTab, setEditTab] = useState<"info" | "activity" | "whatsapp">("info");
  const [newActivity, setNewActivity] = useState({ type: "note", description: "" });
  const [whatsappTemplates, setWhatsappTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: "", content: "" });
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const [newStageColor, setNewStageColor] = useState("#84cc16");
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [draggedLead, setDraggedLead] = useState<string | null>(null);
  const [newTag, setNewTag] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [showNewPipelineDialog, setShowNewPipelineDialog] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    const { data: pipeData } = await supabase.from("pipelines").select("*").eq("user_id", user.id).order("created_at");
    const pips = pipeData || [];
    setPipelines(pips);

    const [stagesRes, leadsRes, activitiesRes] = await Promise.all([
      supabase.from("pipeline_stages").select("*").eq("user_id", user.id).order("position"),
      supabase.from("leads").select("*").eq("user_id", user.id).order("position"),
      supabase.from("activities").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    if (stagesRes.data) setStages(stagesRes.data);
    if (leadsRes.data) setLeads(leadsRes.data.map((l: any) => ({ ...l, tags: Array.isArray(l.tags) ? l.tags : [] })));
    if (activitiesRes.data) setActivities(activitiesRes.data as Activity[]);
    
    const { data: templatesData } = await supabase.from("whatsapp_templates").select("*").eq("user_id", user.id).order("name");
    if (templatesData && templatesData.length > 0) {
      setWhatsappTemplates(templatesData);
    } else {
      // Default templates if none exist
      const defaultTemplates = [
        { name: "Primeira Abordagem", content: "Olá {nome}! 😊 Tudo bem? Sou {user_name} da {user_company}. Vi que você demonstrou interesse em nossos serviços e gostaria de entender melhor como podemos te ajudar. Você tem alguns minutos para conversarmos?" },
        { name: "Follow-up Proposta", content: "Oi {nome}! 👋 Conseguiu analisar a proposta que te enviei? Estou à disposição para esclarecer qualquer dúvida e ajustar o que for necessário para atender suas necessidades. Quando podemos conversar sobre isso?" },
        { name: "Reagendamento", content: "Oi {nome}! Percebi que não conseguimos conversar no horário combinado. Sem problemas! Você prefere remarcar para quando? Estou à disposição! 😊" },
        { name: "Fechamento", content: "Oi {nome}! 🎉 Fico muito feliz que decidiu fechar conosco! Vou te enviar agora as próximas etapas e os documentos necessários. Seja muito bem-vindo(a)! Vamos fazer um excelente trabalho juntos!" }
      ];
      setWhatsappTemplates(defaultTemplates.map((t, i) => ({ ...t, id: `default-${i}` })));
    }

    if (!activePipeline && pips.length > 0) setActivePipeline(pips[0].id);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const pipelineStages = useMemo(() => {
    if (!activePipeline) return stages;
    return stages.filter(s => s.pipeline_id === activePipeline);
  }, [stages, activePipeline]);

  const filteredLeads = useMemo(() => {
    const stageIds = new Set(pipelineStages.map(s => s.id));
    return leads.filter(l => {
      // Pipeline isolation: only show leads belonging to current pipeline stages
      if (!l.stage_id || !stageIds.has(l.stage_id)) return false;
      if (searchTerm && !l.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !l.email?.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !l.company?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (filterStatus && l.stage_id !== filterStatus) return false;
      if (filterSource && l.source !== filterSource) return false;
      if (filterPriority !== "Todos") {
        const pMap: any = { "Quente": "high", "Morno": "medium", "Frio": "low" };
        if (l.priority !== pMap[filterPriority]) return false;
      }
      return true;
    });
  }, [leads, searchTerm, filterStatus, filterSource, filterPriority, pipelineStages]);

  const sources = useMemo(() => [...new Set(leads.map(l => l.source).filter(Boolean))], [leads]);

  const handleAddLead = async (stageId?: string) => {
    if (!user || !newLead.name) return;
    const targetStageId = stageId || newLead.stage_id || addStageId || (pipelineStages[0]?.id);
    if (!targetStageId) return;
    const stageLeads = leads.filter(l => l.stage_id === targetStageId);
    const tags = newLead.tags ? newLead.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
    const { error } = await supabase.from("leads").insert({
      user_id: user.id, name: newLead.name, email: newLead.email || null,
      phone: newLead.phone || null, company: newLead.company || null,
      value: parseFloat(newLead.value) || 0, stage_id: targetStageId,
      position: stageLeads.length, notes: newLead.notes || null,
      source: newLead.source || null, tags,
      priority: newLead.priority, urgency: newLead.urgency, revenue_type: newLead.revenue_type,
      monthly_value: parseFloat(newLead.monthly_value) || 0, contract_months: parseInt(newLead.contract_months) || 1,
      probability: parseInt(newLead.probability) || 50, instagram: newLead.instagram || null,
      facebook: newLead.facebook || null, linkedin: newLead.linkedin || null, website: newLead.website || null,
      utm_source: newLead.utm_source || null, utm_medium: newLead.utm_medium || null, utm_campaign: newLead.utm_campaign || null,
    } as any);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Lead adicionado!" });
    setNewLead({ 
      name: "", email: "", phone: "", company: "", value: "", notes: "", source: "", tags: "", stage_id: "",
      priority: "medium", urgency: "medium", revenue_type: "one_time", monthly_value: "", contract_months: "1",
      probability: "50", instagram: "", facebook: "", linkedin: "", website: "",
      utm_source: "", utm_medium: "", utm_campaign: ""
    });
    setAddOpen(false); setGlobalAddOpen(false);
    fetchData();
  };

  const handleUpdateLead = async () => {
    if (!editLead) return;
    await supabase.from("leads").update({
      name: editLead.name, email: editLead.email, phone: editLead.phone,
      company: editLead.company, value: editLead.value, notes: editLead.notes,
      source: editLead.source, status: editLead.status, tags: editLead.tags,
      stage_id: editLead.stage_id,
      priority: editLead.priority, urgency: editLead.urgency, revenue_type: editLead.revenue_type,
      monthly_value: editLead.monthly_value, contract_months: editLead.contract_months,
      probability: editLead.probability, instagram: editLead.instagram,
      facebook: editLead.facebook, linkedin: editLead.linkedin, website: editLead.website,
      utm_source: editLead.utm_source, utm_medium: editLead.utm_medium, utm_campaign: editLead.utm_campaign,
    } as any).eq("id", editLead.id);
    toast({ title: "Lead atualizado!" });
    setEditOpen(false); setEditLead(null); fetchData();
  };

  const handleSaveTemplate = async () => {
    if (!user || !newTemplate.name || !newTemplate.content) return;
    const { error } = await supabase.from("whatsapp_templates").insert({
      user_id: user.id, name: newTemplate.name, content: newTemplate.content
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Template salvo!" });
    setNewTemplate({ name: "", content: "" });
    setShowTemplateDialog(false);
    fetchData();
  };

  const handleDeleteTemplate = async (id: string) => {
    if (id.startsWith("default-")) return;
    await supabase.from("whatsapp_templates").delete().eq("id", id);
    toast({ title: "Template excluído" });
    fetchData();
  };

  const getWhatsAppLink = (lead: Lead, content: string) => {
    if (!lead.phone) return "";
    let message = content
      .replace(/{nome}/g, lead.name || "")
      .replace(/{empresa}/g, lead.company || "")
      .replace(/{valor}/g, lead.value?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) || "")
      .replace(/{user_name}/g, user?.user_metadata?.full_name || "Consultor")
      .replace(/{user_company}/g, "Nossa Empresa");
    
    const phone = lead.phone.replace(/\D/g, "");
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  const handleBulkWhatsApp = () => {
    if (selectedLeads.size === 0 || !selectedTemplate) return;
    const template = whatsappTemplates.find(t => t.id === selectedTemplate);
    if (!template) return;
    const selectedLeadsList = leads.filter(l => selectedLeads.has(l.id) && l.phone);
    selectedLeadsList.forEach((lead, index) => {
      setTimeout(() => { window.open(getWhatsAppLink(lead, template.content), "_blank"); }, index * 1000);
    });
    toast({ title: "Enviando mensagens...", description: `${selectedLeadsList.length} abas serão abertas.` });
  };

  const handleDeleteLead = async (id: string) => {
    await supabase.from("leads").delete().eq("id", id);
    toast({ title: "Lead excluído" }); fetchData();
  };

  const handleAddActivity = async () => {
    if (!user || !editLead || !newActivity.description) return;
    await supabase.from("activities").insert({ user_id: user.id, lead_id: editLead.id, type: newActivity.type, description: newActivity.description });
    setNewActivity({ type: "note", description: "" });
    toast({ title: "Atividade registrada!" }); fetchData();
  };

  const handleDrop = async (stageId: string) => {
    if (!draggedLead || !user) return;
    const lead = leads.find(l => l.id === draggedLead);
    const stage = pipelineStages.find(s => s.id === stageId);
    const updates: any = { stage_id: stageId };
    if (stage && isConversionStage(stage.name) && lead && lead.value > 0) updates.status = "won";
    await supabase.from("leads").update(updates).eq("id", draggedLead);
    setLeads(prev => prev.map(l => l.id === draggedLead ? { ...l, ...updates } : l));
    setDraggedLead(null);

    // Fire event engine
    if (lead && stage) {
      handleCRMEvent({
        type: "lead_stage_changed",
        userId: user.id,
        data: { leadId: lead.id, leadName: lead.name, newStageName: stage.name, newStageId: stageId, value: lead.value, revenueType: lead.revenue_type },
        timestamp: new Date(),
      });
    }
    if (stage && isConversionStage(stage.name) && lead && lead.value > 0) {
      toast({ title: `🎉 Lead "${lead.name}" convertido! R$ ${lead.value.toLocaleString("pt-BR")}` });
    }
  };

  const handleAddStage = async () => {
    if (!user || !newStageName) return;
    const maxPos = stages.length > 0 ? Math.max(...stages.map(s => s.position)) + 1 : 0;
    await supabase.from("pipeline_stages").insert({ user_id: user.id, name: newStageName, position: maxPos, color: newStageColor, pipeline_id: activePipeline } as any);
    toast({ title: "Etapa criada!" }); setNewStageName(""); setNewStageColor("#84cc16"); setStageDialogOpen(false); fetchData();
  };

  const handleUpdateStage = async () => {
    if (!editingStage) return;
    await supabase.from("pipeline_stages").update({ name: editingStage.name, color: editingStage.color }).eq("id", editingStage.id);
    toast({ title: "Etapa atualizada!" }); setEditingStage(null); fetchData();
  };

  const handleDeleteStage = async (id: string) => {
    await supabase.from("pipeline_stages").delete().eq("id", id);
    toast({ title: "Etapa excluída" }); fetchData();
  };

  const handleMoveStage = async (stageId: string, direction: "up" | "down") => {
    const idx = pipelineStages.findIndex(s => s.id === stageId);
    if (idx === -1 || (direction === "up" && idx === 0) || (direction === "down" && idx === pipelineStages.length - 1)) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const ns = [...pipelineStages];
    [ns[idx], ns[swapIdx]] = [ns[swapIdx], ns[idx]];
    ns.forEach((s, i) => s.position = i);
    setStages(prev => {
      const others = prev.filter(s => !ns.find(n => n.id === s.id));
      return [...others, ...ns].sort((a, b) => a.position - b.position);
    });
    await Promise.all(ns.map(s => supabase.from("pipeline_stages").update({ position: s.position }).eq("id", s.id)));
  };

  const toggleSelectLead = (id: string) => {
    setSelectedLeads(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    if (selectedLeads.size === filteredLeads.length) setSelectedLeads(new Set());
    else setSelectedLeads(new Set(filteredLeads.map(l => l.id)));
  };

  const executeBulkAction = async () => {
    if (selectedLeads.size === 0) return;
    const ids = Array.from(selectedLeads);
    if (bulkAction === "move" && bulkStageId) {
      await Promise.all(ids.map(id => supabase.from("leads").update({ stage_id: bulkStageId } as any).eq("id", id)));
      toast({ title: `${ids.length} leads movidos!` });
    } else if (bulkAction === "tag" && bulkTag) {
      for (const id of ids) {
        const lead = leads.find(l => l.id === id);
        if (lead && !lead.tags.includes(bulkTag)) {
          await supabase.from("leads").update({ tags: [...lead.tags, bulkTag] } as any).eq("id", id);
        }
      }
      toast({ title: `Tag adicionada em ${ids.length} leads!` });
    } else if (bulkAction === "delete") {
      await Promise.all(ids.map(id => supabase.from("leads").delete().eq("id", id)));
      toast({ title: `${ids.length} leads excluídos!` });
    }
    setSelectedLeads(new Set());
    setBulkAction(""); setBulkStageId(""); setBulkTag("");
    fetchData();
  };

  const handleCreatePipeline = async () => {
    if (!user || !newPipelineName.trim()) return;
    const { data, error } = await supabase.from("pipelines").insert({ user_id: user.id, name: newPipelineName } as any).select().single();
    if (error) { toast({ title: "Erro", variant: "destructive" }); return; }
    toast({ title: "Pipeline criado!" });
    setNewPipelineName(""); setShowNewPipelineDialog(false);
    if (data) setActivePipeline(data.id);
    fetchData();
  };

  const addTagToLead = () => {
    if (!editLead || !newTag.trim()) return;
    if (!editLead.tags.includes(newTag.trim())) setEditLead({ ...editLead, tags: [...editLead.tags, newTag.trim()] });
    setNewTag("");
  };

  const removeTagFromLead = (tag: string) => {
    if (!editLead) return;
    setEditLead({ ...editLead, tags: editLead.tags.filter(t => t !== tag) });
  };

  const openWhatsApp = (lead: Lead) => {
    if (!lead.phone) { toast({ title: "Lead sem WhatsApp", variant: "destructive" }); return; }
    const phone = lead.phone.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`Olá ${lead.name}! `)}`, "_blank");
  };

    if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Carregando CRM...</div>;

  const totalLeads = filteredLeads.length;
  const totalValue = filteredLeads.reduce((s, l) => s + (l.value || 0), 0);
  const wonStageIds = pipelineStages.filter(s => isWonStage(s.name)).map(s => s.id);
  const wonLeads = filteredLeads.filter(l => (l.status === "won" || (l.stage_id && wonStageIds.includes(l.stage_id))) && l.value > 0);
  const wonValue = wonLeads.reduce((s, l) => s + (l.value || 0), 0);
  const lostLeads = filteredLeads.filter(l => l.status === "lost");
  const conversionRate = totalLeads > 0 ? ((wonLeads.length / totalLeads) * 100).toFixed(1) : "0";
  const avgDealValue = totalLeads > 0 ? (totalValue / totalLeads).toFixed(2) : "0";
  const stageData = pipelineStages.map(stage => ({ name: stage.name, count: filteredLeads.filter(l => l.stage_id === stage.id).length, value: filteredLeads.filter(l => l.stage_id === stage.id).reduce((s, l) => s + (l.value || 0), 0) }));
  const priorityData = [
    { name: "Quente", value: filteredLeads.filter(l => l.priority === "high").length, color: "#f97316" },
    { name: "Morno", value: filteredLeads.filter(l => l.priority === "medium").length, color: "#3b82f6" },
    { name: "Frio", value: filteredLeads.filter(l => l.priority === "low").length, color: "#06b6d4" }
  ].filter(d => d.value > 0);
  const statusCounts: Record<string, number> = {};
  filteredLeads.forEach(l => { statusCounts[l.status] = (statusCounts[l.status] || 0) + 1; });
  const statusData = Object.entries(statusCounts).map(([k, v]) => ({ name: statusOptions.find(s => s.value === k)?.label || k, value: v }));
  const leadActivities = editLead ? activities.filter(a => a.lead_id === editLead.id) : [];

  const getPriorityBadge = (priority: string | null | undefined) => {
    switch (priority) {
      case "high": return <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-500 text-[10px] font-bold uppercase"><Flame className="h-3 w-3" /> Quente</span>;
      case "medium": return <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-500 text-[10px] font-bold uppercase"><Thermometer className="h-3 w-3" /> Morno</span>;
      case "low": return <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-500 text-[10px] font-bold uppercase"><Snowflake className="h-3 w-3" /> Frio</span>;
      default: return null;
    }
  };

  // Inteligência 1: Detectar Estagnação
  const isStagnated = (lead: Lead, leadActivities: Activity[]) => {
    const lastActivity = leadActivities.length > 0 ? new Date(leadActivities[0].created_at) : new Date(lead.created_at);
    const daysSinceActivity = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceActivity > STAGNATION_DAYS && lead.status !== "won" && lead.status !== "lost";
  };

  // Inteligência 2: Calcular Lead Score
  const calculateLeadScore = (lead: Lead) => {
    let score = 0;
    if (lead.email) score += LEAD_SCORE_WEIGHTS.hasEmail;
    if (lead.phone) score += LEAD_SCORE_WEIGHTS.hasPhone;
    if (lead.company) score += LEAD_SCORE_WEIGHTS.hasCompany;
    if (lead.urgency) score += LEAD_SCORE_WEIGHTS.hasUrgency;
    if (lead.value > 0) score += LEAD_SCORE_WEIGHTS.hasValue;
    if (lead.probability) score += LEAD_SCORE_WEIGHTS.hasProbability;
    if (lead.instagram || lead.linkedin || lead.facebook) score += LEAD_SCORE_WEIGHTS.hasRedes;
    if (lead.utm_source || lead.utm_medium || lead.utm_campaign) score += LEAD_SCORE_WEIGHTS.hasUTM;
    if (lead.notes) score += LEAD_SCORE_WEIGHTS.hasNotes;
    return Math.min(score, 100);
  };

  // Inteligência 3: Alertar Recompra
  const shouldAlertRecompra = (lead: Lead) => {
    if (lead.status !== "won" || !lead.contract_months) return false;
    const createdDate = new Date(lead.created_at);
    const expiryDate = new Date(createdDate.getTime() + lead.contract_months * 30 * 24 * 60 * 60 * 1000);
    const daysUntilExpiry = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 0 && daysUntilExpiry <= RECOMPRA_ALERT_DAYS;
  };

  // Inteligência 4: Sugerir Próxima Ação
  const getSuggestedNextStage = (lead: Lead, currentStages: Stage[]) => {
    const currentStageIndex = currentStages.findIndex(s => s.id === lead.stage_id);
    if (currentStageIndex === -1 || currentStageIndex === currentStages.length - 1) return null;
    return currentStages[currentStageIndex + 1];
  };

  const leadFormFields = (data: any, setData: (d: any) => void, isNew = false, showStageSelect = false) => (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <User className="h-4 w-4 text-primary" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Informações do Lead</h4>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label className="text-xs font-medium">Nome Completo *</Label><Input value={data.name} onChange={e => setData({ ...data, name: e.target.value })} placeholder="Ex: Eduardo Luiza da Silva" className="bg-secondary/30 border-border h-9 text-sm" /></div>
          <div className="space-y-1.5"><Label className="text-xs font-medium">Empresa</Label><Input value={data.company || ""} onChange={e => setData({ ...data, company: e.target.value })} placeholder="Ex: Plástico Geral" className="bg-secondary/30 border-border h-9 text-sm" /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label className="text-xs font-medium">E-mail</Label><Input value={data.email || ""} onChange={e => setData({ ...data, email: e.target.value })} placeholder="eduardo@plasticogeral.com.br" className="bg-secondary/30 border-border h-9 text-sm" /></div>
          <div className="space-y-1.5"><Label className="text-xs font-medium">WhatsApp</Label><Input value={data.phone || ""} onChange={e => setData({ ...data, phone: e.target.value })} placeholder="5511987229212" className="bg-secondary/30 border-border h-9 text-sm" /></div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <Target className="h-4 w-4 text-primary" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Qualificação e Valor</h4>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label className="text-xs font-medium">Prioridade (Temperatura)</Label>
            <select value={data.priority || "medium"} onChange={e => setData({ ...data, priority: e.target.value })} className="w-full h-9 bg-secondary/30 border border-border rounded-md px-3 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary">
              <option value="low">Frio</option>
              <option value="medium">Morno</option>
              <option value="high">Quente</option>
            </select>
          </div>
          <div className="space-y-1.5"><Label className="text-xs font-medium">Urgência</Label>
            <select value={data.urgency || "medium"} onChange={e => setData({ ...data, urgency: e.target.value })} className="w-full h-9 bg-secondary/30 border border-border rounded-md px-3 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary">
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label className="text-xs font-medium">Valor do Negócio (R$)</Label><Input type="number" value={data.value || ""} onChange={e => setData({ ...data, value: e.target.value })} placeholder="2170.00" className="bg-secondary/30 border-border h-9 text-sm" /></div>
          <div className="space-y-1.5"><Label className="text-xs font-medium">Probabilidade (%)</Label><Input type="number" value={data.probability || ""} onChange={e => setData({ ...data, probability: e.target.value })} placeholder="50" className="bg-secondary/30 border-border h-9 text-sm" /></div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <Share2 className="h-4 w-4 text-primary" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Redes Sociais e Origem</h4>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label className="text-xs font-medium">Instagram</Label><Input value={data.instagram || ""} onChange={e => setData({ ...data, instagram: e.target.value })} placeholder="@usuario" className="bg-secondary/30 border-border h-9 text-sm" /></div>
          <div className="space-y-1.5"><Label className="text-xs font-medium">LinkedIn</Label><Input value={data.linkedin || ""} onChange={e => setData({ ...data, linkedin: e.target.value })} placeholder="linkedin.com/in/..." className="bg-secondary/30 border-border h-9 text-sm" /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label className="text-xs font-medium">Fonte do Lead</Label><Input value={data.source || ""} onChange={e => setData({ ...data, source: e.target.value })} placeholder="Ex: Instagram, Google..." className="bg-secondary/30 border-border h-9 text-sm" /></div>
          <div className="space-y-1.5"><Label className="text-xs font-medium">Website</Label><Input value={data.website || ""} onChange={e => setData({ ...data, website: e.target.value })} placeholder="www.site.com" className="bg-secondary/30 border-border h-9 text-sm" /></div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <StickyNote className="h-4 w-4 text-primary" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Observações</h4>
        </div>
        <Textarea value={data.notes || ""} onChange={e => setData({ ...data, notes: e.target.value })} placeholder="Nenhuma característica registrada..." className="bg-secondary/30 border-border min-h-[100px] text-sm" />
      </div>
    </div>
  );

  // Se o Dashboard está ativo, mostrar apenas ele em tela cheia
  if (showDashboard) {
    return (
      <div className="space-y-6 p-6">
        {/* Dashboard Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Dashboard de KPIs</h1>
            <p className="text-sm text-muted-foreground">Análise completa do seu funil de vendas</p>
          </div>
          <Button variant="outline" size="sm" className="h-10 gap-2" onClick={() => setShowDashboard(false)}><X className="h-4 w-4" /> Fechar</Button>
        </div>

        {/* Dashboard Content */}
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary"><Users className="h-6 w-6" /></div>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg">Total</span>
              </div>
              <div><p className="text-3xl font-bold text-foreground">{totalLeads}</p><p className="text-xs text-muted-foreground mt-1">Leads no funil</p></div>
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-green-500"><TrendingUp className="h-6 w-6" /></div>
                <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded-lg">{conversionRate}%</span>
              </div>
              <div><p className="text-3xl font-bold text-foreground">{wonLeads.length}</p><p className="text-xs text-muted-foreground mt-1">Leads Ganhos</p></div>
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-500"><DollarSign className="h-6 w-6" /></div>
                <span className="text-xs font-bold text-blue-500 bg-blue-500/10 px-2 py-1 rounded-lg">Valor Total</span>
              </div>
              <div><p className="text-3xl font-bold text-foreground">R$ {(totalValue / 1000).toFixed(1)}k</p><p className="text-xs text-muted-foreground mt-1">Em negociação</p></div>
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-500"><Target className="h-6 w-6" /></div>
                <span className="text-xs font-bold text-purple-500 bg-purple-500/10 px-2 py-1 rounded-lg">Ticket Médio</span>
              </div>
              <div><p className="text-3xl font-bold text-foreground">R$ {parseFloat(avgDealValue).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</p><p className="text-xs text-muted-foreground mt-1">Por lead</p></div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-secondary/10 border border-border space-y-4">
              <h3 className="text-sm font-bold text-foreground">Distribuição por Etapa</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stageData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" style={{ fontSize: "12px" }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: "12px" }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="p-6 rounded-2xl bg-secondary/10 border border-border space-y-4">
              <h3 className="text-sm font-bold text-foreground">Temperatura dos Leads</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={priorityData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={80} fill="#8884d8" dataKey="value">
                    {priorityData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="p-6 rounded-2xl bg-secondary/10 border border-border space-y-4">
              <h3 className="text-sm font-bold text-foreground">Valor por Etapa</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stageData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" style={{ fontSize: "12px" }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: "12px" }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} formatter={(value) => `R$ ${value.toLocaleString("pt-BR")}`} />
                  <Bar dataKey="value" fill="hsl(var(--primary) / 0.6)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-2">
      {/* Header Section */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 bg-secondary/30 p-1 rounded-lg border border-border">
            <Button variant={activePipeline ? "secondary" : "ghost"} size="sm" className="h-8 text-xs gap-2"><LayoutGrid className="h-3.5 w-3.5" /> Pipeline</Button>
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-2 text-muted-foreground"><Users className="h-3.5 w-3.5" /> Gestão de Clientes</Button>
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">CRM - Gestão de Leads</h1>
          <p className="text-sm text-muted-foreground">Organize e acompanhe seus leads com eficiência</p>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Funil:</span>
              <select value={activePipeline || ""} onChange={e => setActivePipeline(e.target.value)} className="h-10 bg-secondary/50 border border-border rounded-lg px-4 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/20 min-w-[240px]">
                {pipelines.map(p => <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>)}
              </select>
              <Button variant="outline" size="sm" className="h-10 gap-2 border-primary/30 text-primary hover:bg-primary/5" onClick={() => setShowNewPipelineDialog(true)}><Plus className="h-4 w-4" /> Novo Funil</Button>
            </div>
            <div className="flex items-center gap-1 bg-secondary/30 p-1 rounded-lg border border-border">
              <Button variant={view === "kanban" ? "secondary" : "ghost"} size="sm" className="h-8 px-3 gap-2" onClick={() => setView("kanban")}><LayoutGrid className="h-3.5 w-3.5" /> Kanban</Button>
              <Button variant={view === "list" ? "secondary" : "ghost"} size="sm" className="h-8 px-3 gap-2" onClick={() => setView("list")}><List className="h-3.5 w-3.5" /> Lista</Button>
              <Button variant={showDashboard ? "secondary" : "ghost"} size="sm" className="h-8 px-3 gap-2" onClick={() => setShowDashboard(!showDashboard)}><BarChart3 className="h-3.5 w-3.5" /> Dashboard</Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-10 border-primary/30 text-primary hover:bg-primary/5 gap-2" onClick={() => setStageDialogOpen(true)}><Settings2 className="h-4 w-4" /> Gerenciar Etapas</Button>
            <Button variant="outline" size="sm" className="h-10 border-green-500/30 text-green-500 hover:bg-green-500/5 gap-2" onClick={() => setShowTemplateDialog(true)}><MessageSquare className="h-4 w-4" /> Templates WhatsApp</Button>
            <Button size="sm" className="h-10 bg-primary text-primary-foreground hover:bg-primary/90 gap-2 font-bold px-4" onClick={() => setGlobalAddOpen(true)}><Plus className="h-5 w-5" /> Novo Lead</Button>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-secondary/20 p-2 rounded-xl border border-border/50">
          <div className="flex-1 relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar por nome, email ou telefone..." className="h-10 pl-10 bg-transparent border-none focus-visible:ring-0 text-sm" />
          </div>
          <div className="h-6 w-px bg-border" />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="h-10 bg-transparent border-none text-sm text-foreground outline-none px-2 min-w-[160px]">
            <option value="">Todos os estágios</option>
            {pipelineStages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground mr-2">Filtrar por temperatura:</span>
          {["Todos", "Quente", "Morno", "Frio"].map(temp => (
            <button key={temp} onClick={() => setFilterPriority(temp)} className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${filterPriority === temp ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary border border-border"}`}>
              {temp === "Quente" && <Flame className="h-3 w-3 inline mr-1" />}
              {temp === "Morno" && <Thermometer className="h-3 w-3 inline mr-1" />}
              {temp === "Frio" && <Snowflake className="h-3 w-3 inline mr-1" />}
              {temp}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedLeads.size > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 flex items-center gap-4 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2 pr-4 border-r border-primary/20">
            <CheckCircle className="h-5 w-5 text-primary" />
            <span className="text-sm font-bold text-foreground">{selectedLeads.size} leads selecionados</span>
          </div>
          <div className="flex items-center gap-3 flex-1">
            <select value={bulkAction} onChange={e => setBulkAction(e.target.value)} className="h-9 bg-background border border-border rounded-lg px-3 text-xs outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">Ação em massa...</option>
              <option value="whatsapp">Enviar WhatsApp (Massa)</option>
              <option value="move">Mover etapa</option>
              <option value="tag">Adicionar tag</option>
              <option value="delete">Excluir</option>
            </select>
            {bulkAction === "whatsapp" && (
              <select value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)} className="h-9 bg-background border border-border rounded-lg px-3 text-xs min-w-[200px]">
                <option value="">Selecione o template...</option>
                {whatsappTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}
            <Button size="sm" className="h-9 px-4 text-xs font-bold" onClick={bulkAction === "whatsapp" ? handleBulkWhatsApp : executeBulkAction} disabled={!bulkAction}>Aplicar Ação</Button>
          </div>
          <Button variant="ghost" size="sm" className="h-9 text-xs text-muted-foreground" onClick={() => setSelectedLeads(new Set())}>Cancelar</Button>
        </div>
      )}



      {/* Kanban View */}
      {view === "kanban" && (
        <div className="flex gap-6 overflow-x-auto pb-6 custom-scrollbar min-h-[600px]">
          {pipelineStages.map((stage, sIdx) => {
            const stageLeads = filteredLeads.filter(l => l.stage_id === stage.id);
            const stageValue = stageLeads.reduce((s, l) => s + (l.value || 0), 0);
            return (
              <div key={stage.id} className="flex-shrink-0 w-[320px] flex flex-col gap-4" onDragOver={e => e.preventDefault()} onDrop={() => handleDrop(stage.id)}>
                <div className="flex flex-col gap-2 p-4 rounded-xl bg-secondary/10 border-t-4" style={{ borderTopColor: stage.color }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                      <h3 className="text-sm font-bold text-foreground">{stage.name}</h3>
                    </div>
                    <span className="text-xs font-bold bg-secondary/50 px-2 py-0.5 rounded-full text-muted-foreground">{stageLeads.length}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    <span>R$ {stageValue.toLocaleString("pt-BR")}</span>
                  </div>
                </div>

                <div className="flex-1 space-y-3 p-2 rounded-xl bg-secondary/5 border border-border/50 min-h-[400px]">
                  {stageLeads.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground/40 italic text-xs">
                      Nenhum lead neste estágio
                    </div>
                  )}
                  {stageLeads.map(lead => (
                    <div key={lead.id} draggable onDragStart={() => setDraggedLead(lead.id)}
                      onClick={() => { setEditLead({ ...lead }); setEditOpen(true); setEditTab("info"); }}
                      className={`bg-card rounded-xl p-4 border border-border hover:border-primary/40 transition-all cursor-pointer group shadow-sm hover:shadow-md relative ${selectedLeads.has(lead.id) ? "ring-2 ring-primary border-transparent" : ""}`}>
                      
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0 border border-primary/20">
                            {lead.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{lead.name}</p>
                            <div className="flex flex-col gap-0.5 mt-1">
                              {getPriorityBadge(lead.priority)}
                              {lead.company && <p className="text-[10px] text-muted-foreground truncate">{lead.company}</p>}
                            </div>
                          </div>
                        </div>
                        <button onClick={e => { e.stopPropagation(); toggleSelectLead(lead.id); }} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          {selectedLeads.has(lead.id) ? <CheckCircle className="h-5 w-5 text-primary" /> : <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />}
                        </button>
                      </div>

                      <div className="space-y-2 border-t border-border/50 pt-3">
                        {lead.email && <div className="flex items-center gap-2 text-[10px] text-muted-foreground"><Mail className="h-3 w-3" /> <span className="truncate">{lead.email}</span></div>}
                        {lead.phone && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground"><Phone className="h-3 w-3" /> <span>{lead.phone}</span></div>
                            <button onClick={e => { e.stopPropagation(); window.open(`https://wa.me/${lead.phone?.replace(/\D/g, "")}`, "_blank"); }} className="p-1.5 hover:bg-green-500/10 rounded-lg text-green-500 transition-colors"><ExternalLink className="h-3 w-3" /></button>
                          </div>
                        )}
                      </div>

                      {/* Professional Info Section */}
                      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border/50">
                        {lead.urgency && (
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Urgência</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg w-fit ${
                              lead.urgency === "high" ? "bg-red-500/20 text-red-500" :
                              lead.urgency === "medium" ? "bg-orange-500/20 text-orange-500" :
                              "bg-blue-500/20 text-blue-500"
                            }`}>
                              {lead.urgency === "high" ? "Alta" : lead.urgency === "medium" ? "Média" : "Baixa"}
                            </span>
                          </div>
                        )}
                        {lead.probability && (
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Probabilidade</span>
                            <span className="text-[10px] font-bold text-primary">{lead.probability}%</span>
                          </div>
                        )}
                      </div>

                      {/* Tags Section */}
                      {lead.tags && lead.tags.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap gap-1">
                          {lead.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-[9px] bg-accent/20 text-accent-foreground px-2 py-0.5 rounded-full font-bold">{tag}</span>
                          ))}
                          {lead.tags.length > 3 && <span className="text-[9px] text-muted-foreground px-2 py-0.5">+{lead.tags.length - 3}</span>}
                        </div>
                      )}

                      {/* Inteligências de Negócio */}
                      <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                        {isStagnated(lead, activities.filter(a => a.lead_id === lead.id)) && (
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                            <AlertCircle className="h-3.5 w-3.5 text-yellow-500" />
                            <span className="text-[9px] font-bold text-yellow-600">Lead estagnado há {Math.floor((Date.now() - (activities.filter(a => a.lead_id === lead.id).length > 0 ? new Date(activities.filter(a => a.lead_id === lead.id)[0].created_at).getTime() : new Date(lead.created_at).getTime())) / (1000 * 60 * 60 * 24))} dias</span>
                          </div>
                        )}
                        {shouldAlertRecompra(lead) && (
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/30">
                            <RefreshCw className="h-3.5 w-3.5 text-green-600" />
                            <span className="text-[9px] font-bold text-green-600">Alerta de recompra em {Math.floor((new Date(new Date(lead.created_at).getTime() + (lead.contract_months || 0) * 30 * 24 * 60 * 60 * 1000).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} dias</span>
                          </div>
                        )}
                        {calculateLeadScore(lead) > 0 && (
                          <div className="flex items-center justify-between p-2 rounded-lg bg-blue-500/10 border border-blue-500/30">
                            <div className="flex items-center gap-2">
                              <Zap className="h-3.5 w-3.5 text-blue-600" />
                              <span className="text-[9px] font-bold text-blue-600">Score</span>
                            </div>
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-500/20 px-2 py-0.5 rounded">{calculateLeadScore(lead)}/100</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                        <div className="flex items-center gap-1 text-xs font-bold text-primary">
                          <TrendingUp className="h-3.5 w-3.5" />
                          <span>R$ {lead.value.toLocaleString("pt-BR")}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground italic">há {Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30))} meses</span>
                      </div>
                    </div>
                  ))}
                  
                  <button onClick={() => { setAddStageId(stage.id); setAddOpen(true); }} className="w-full py-3 flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-xl border-2 border-dashed border-border/50 transition-all mt-2">
                    <Plus className="h-4 w-4" /> Adicionar Lead
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Lead Dialog - Redesigned */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border max-w-4xl p-0 overflow-hidden rounded-2xl shadow-2xl">
          {editLead && (
            <div className="flex flex-col h-[90vh]">
              {/* Header */}
              <div className="p-6 border-b border-border bg-secondary/10">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-xl font-bold text-primary-foreground shadow-lg shadow-primary/20">
                      {editLead.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">{editLead.name}</h2>
                      <div className="flex items-center gap-3 mt-1">
                        {editLead.status === "won" ? (
                          <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-lg border border-green-500/20">✅ Cliente</span>
                        ) : (
                          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20">
                            {pipelineStages.find(s => s.id === editLead.stage_id)?.name || "Sem etapa"}
                          </span>
                        )}
                        {getPriorityBadge(editLead.priority)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* CONVERT TO CLIENT BUTTON */}
                    {editLead.status !== "won" && (
                      <Button variant="outline" size="sm" className="h-9 gap-2 border-green-500/30 text-green-500 hover:bg-green-500/10 font-bold" onClick={() => { setConvertRevenueType("one_time"); setShowConvertModal(true); }}>
                        <CheckCircle className="h-4 w-4" /> Converter em Cliente
                      </Button>
                    )}

                    {/* Convert to Client Modal */}
                    <Dialog open={showConvertModal} onOpenChange={setShowConvertModal}>
                      <DialogContent className="bg-card border-border max-w-md">
                        <DialogHeader>
                          <DialogTitle className="text-lg flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-500" /> Converter em Cliente
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <p className="text-sm text-muted-foreground">Selecione o tipo de receita para <strong className="text-foreground">{editLead.name}</strong>:</p>
                          <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setConvertRevenueType("one_time")} className={`p-4 rounded-xl border-2 text-center transition-all ${convertRevenueType === "one_time" ? "border-green-500 bg-green-500/10" : "border-border hover:border-green-500/30"}`}>
                              <DollarSign className="h-8 w-8 mx-auto mb-2 text-green-500" />
                              <p className="text-sm font-bold text-foreground">Pagamento Único</p>
                              <p className="text-[10px] text-muted-foreground mt-1">Venda pontual, sem recorrência</p>
                            </button>
                            <button onClick={() => setConvertRevenueType("recorrente")} className={`p-4 rounded-xl border-2 text-center transition-all ${convertRevenueType === "recorrente" ? "border-green-500 bg-green-500/10" : "border-border hover:border-green-500/30"}`}>
                              <RefreshCw className="h-8 w-8 mx-auto mb-2 text-green-500" />
                              <p className="text-sm font-bold text-foreground">Recorrente</p>
                              <p className="text-[10px] text-muted-foreground mt-1">Assinatura mensal / contrato</p>
                            </button>
                          </div>
                          {editLead.value > 0 && (
                            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-center">
                              <p className="text-xs text-muted-foreground">Valor da conversão</p>
                              <p className="text-xl font-bold text-primary">R$ {editLead.value.toLocaleString("pt-BR")}</p>
                              {convertRevenueType === "recorrente" && editLead.monthly_value && editLead.monthly_value > 0 && (
                                <p className="text-xs text-muted-foreground mt-1">MRR: R$ {editLead.monthly_value.toLocaleString("pt-BR")}/mês</p>
                              )}
                            </div>
                          )}
                          <div className="flex gap-2 pt-2">
                            <Button variant="ghost" className="flex-1" onClick={() => setShowConvertModal(false)}>Cancelar</Button>
                            <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold" onClick={async () => {
                              await supabase.from("leads").update({ status: "won", revenue_type: convertRevenueType } as any).eq("id", editLead.id);
                              if (user) {
                                await supabase.from("activities").insert({ user_id: user.id, lead_id: editLead.id, type: "note", description: `🎉 Lead convertido em cliente! Tipo de receita: ${convertRevenueType === "recorrente" ? "Recorrente" : "Pagamento Único"}` });
                              }
                              toast({ title: "🎉 Lead convertido em cliente!" });
                              setEditLead({ ...editLead, status: "won", revenue_type: convertRevenueType });
                              setShowConvertModal(false);
                              fetchData();
                            }}>
                              <CheckCircle className="h-4 w-4 mr-2" /> Confirmar Conversão
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button variant="destructive" size="sm" className="h-9 gap-2" onClick={() => { if (confirm("Excluir este lead?")) { handleDeleteLead(editLead.id); setEditOpen(false); } }}><Trash2 className="h-4 w-4" /> Excluir</Button>
                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => setEditOpen(false)}><X className="h-5 w-5" /></Button>
                  </div>
                </div>
              </div>

              {/* Tabs Navigation */}
              <div className="flex items-center gap-1 px-6 border-b border-border bg-background">
                {[
                  { id: "info", label: "Detalhes do Lead", icon: User },
                  { id: "activity", label: "Histórico", icon: History },
                  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle }
                ].map(tab => (
                  <button key={tab.id} onClick={() => setEditTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all border-b-2 ${editTab === tab.id ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/30"}`}>
                    <tab.icon className="h-4 w-4" /> {tab.label}
                  </button>
                ))}
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-hidden flex">
                {/* Left Side - Form/Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                  {editTab === "info" && (
                    <div className="space-y-8">
                      <div className="grid grid-cols-3 gap-6">
                        <div className="p-4 rounded-2xl bg-secondary/20 border border-border space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status Atual</p>
                          <p className="text-sm font-bold text-foreground flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${editLead.status === "won" ? "bg-green-500" : editLead.status === "lost" ? "bg-red-500" : "bg-blue-500"}`} />
                            {statusOptions.find(s => s.value === editLead.status)?.label || editLead.status}
                          </p>
                        </div>
                        <div className="p-4 rounded-2xl bg-secondary/20 border border-border space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Prioridade</p>
                          <div className="flex items-center gap-2">{getPriorityBadge(editLead.priority)}</div>
                        </div>
                        <div className="p-4 rounded-2xl bg-secondary/20 border border-border space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Score</p>
                          <span className="text-sm font-bold text-primary">{calculateLeadScore(editLead)}/100</span>
                        </div>
                      </div>

                      {leadFormFields(editLead, setEditLead)}
                      
                      <div className="flex gap-4 pt-4">
                        <Button onClick={handleUpdateLead} className="flex-1 h-12 font-bold text-base shadow-lg shadow-primary/20">Salvar Alterações</Button>
                      </div>
                    </div>
                  )}

                  {editTab === "activity" && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-foreground">Linha do Tempo</h3>
                        <div className="flex items-center gap-2">
                          <select value={newActivity.type} onChange={e => setNewActivity({ ...newActivity, type: e.target.value })} className="h-9 bg-secondary/50 border border-border rounded-lg px-3 text-xs outline-none">
                            {activityTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                        </div>
                      </div>
                      
                      <div className="relative space-y-6 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                        <div className="flex gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0 z-10 border-4 border-background"><Plus className="h-5 w-5 text-primary-foreground" /></div>
                          <div className="flex-1 space-y-3">
                            <Textarea value={newActivity.description} onChange={e => setNewActivity({ ...newActivity, description: e.target.value })} placeholder="Registrar nova interação..." className="bg-secondary/30 border-border min-h-[100px]" />
                            <Button onClick={handleAddActivity} size="sm" className="font-bold" disabled={!newActivity.description}>Adicionar ao Histórico</Button>
                          </div>
                        </div>

                        {leadActivities.map(a => {
                          const typeInfo = activityTypes.find(t => t.value === a.type);
                          const Icon = typeInfo?.icon || StickyNote;
                          return (
                            <div key={a.id} className="flex gap-4">
                              <div className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0 z-10 border-4 border-background"><Icon className="h-4 w-4 text-primary" /></div>
                              <div className="flex-1 p-4 rounded-2xl bg-secondary/20 border border-border space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-primary uppercase tracking-wider">{typeInfo?.label}</span>
                                  <span className="text-[10px] text-muted-foreground font-medium">{new Date(a.created_at).toLocaleString("pt-BR")}</span>
                                </div>
                                <p className="text-sm text-foreground leading-relaxed">{a.description}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {editTab === "whatsapp" && (
                    <div className="space-y-8">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-foreground">Follow-up via WhatsApp</h3>
                          <p className="text-sm text-muted-foreground">Selecione um template ou personalize sua mensagem</p>
                        </div>
                        <Button variant="outline" size="sm" className="h-9 gap-2 border-primary/30 text-primary" onClick={() => setShowTemplateDialog(true)}><Settings2 className="h-4 w-4" /> Gerenciar Templates</Button>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Templates Disponíveis</Label>
                        <div className="grid grid-cols-2 gap-4">
                          {whatsappTemplates.map(t => (
                            <button key={t.id} onClick={() => {
                              const msg = t.content
                                .replace(/{nome}/g, editLead.name || "")
                                .replace(/{empresa}/g, editLead.company || "")
                                .replace(/{valor}/g, editLead.value?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) || "")
                                .replace(/{user_name}/g, user?.user_metadata?.full_name || "Consultor")
                                .replace(/{user_company}/g, "Nossa Empresa");
                              setCustomMessage(msg);
                            }} className="flex flex-col text-left p-4 rounded-2xl bg-secondary/20 border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-bold text-foreground group-hover:text-primary">{t.name}</span>
                                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg">Template</span>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-3 italic leading-relaxed">"{t.content}"</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mensagem a ser enviada</Label>
                        <div className="relative">
                          <Textarea value={customMessage} onChange={e => setCustomMessage(e.target.value)} placeholder="Selecione um template acima ou digite sua mensagem personalizada..." className="bg-secondary/30 border-border min-h-[150px] text-sm leading-relaxed p-4" />
                          <div className="absolute bottom-3 right-3 flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground">Você pode editar a mensagem antes de enviar</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 rounded-2xl bg-green-500/5 border border-green-500/20 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-green-500"><Phone className="h-6 w-6" /></div>
                          <div>
                            <p className="text-[10px] font-bold text-green-500 uppercase tracking-wider">Enviar para:</p>
                            <p className="text-lg font-bold text-foreground">{editLead.phone || "Sem telefone"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button variant="ghost" onClick={() => setCustomMessage("")}>Cancelar</Button>
                          <Button className="h-12 px-8 bg-green-600 hover:bg-green-700 text-white font-bold gap-2 shadow-lg shadow-green-600/20" onClick={() => {
                            if (!editLead.phone) return toast({ title: "Erro", description: "Lead sem telefone", variant: "destructive" });
                            const phone = editLead.phone.replace(/\D/g, "");
                            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(customMessage)}`, "_blank");
                          }} disabled={!customMessage || !editLead.phone}><MessageCircle className="h-5 w-5" /> Enviar WhatsApp</Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Side - Quick Info */}
                <div className="w-80 border-l border-border bg-secondary/5 p-8 space-y-8 overflow-y-auto custom-scrollbar">
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Contato Rápido</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border group hover:border-primary/30 transition-all cursor-pointer" onClick={() => editLead.phone && window.open(`tel:${editLead.phone}`, "_blank")}>
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500"><Phone className="h-4 w-4" /></div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Telefone</p>
                          <p className="text-xs font-bold text-foreground truncate">{editLead.phone || "Não informado"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border group hover:border-primary/30 transition-all cursor-pointer" onClick={() => editLead.email && window.open(`mailto:${editLead.email}`, "_blank")}>
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500"><Mail className="h-4 w-4" /></div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">E-mail</p>
                          <p className="text-xs font-bold text-foreground truncate">{editLead.email || "Não informado"}</p>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full h-10 gap-2 border-green-500/30 text-green-500 hover:bg-green-500/5 font-bold" onClick={() => openWhatsApp(editLead)}><MessageCircle className="h-4 w-4" /> Enviar WhatsApp Rápido</Button>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Datas Importantes</h4>
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <Calendar className="h-4 w-4 text-primary shrink-0" />
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Data de Criação</p>
                          <p className="text-xs font-bold text-foreground">{new Date(editLead.created_at).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })} às {new Date(editLead.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Clock className="h-4 w-4 text-primary shrink-0" />
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Última Movimentação</p>
                          <p className="text-xs font-bold text-foreground">{new Date(editLead.created_at).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })} às {new Date(editLead.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Empresa</h4>
                    <div className="p-4 rounded-2xl bg-background border border-border flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground"><Building className="h-5 w-5" /></div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{editLead.company || "Sem empresa"}</p>
                        <p className="text-[10px] text-muted-foreground">Cliente Potencial</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Global Add Lead Dialog */}
      <Dialog open={globalAddOpen} onOpenChange={setGlobalAddOpen}>
        <DialogContent className="bg-card border-border max-w-2xl rounded-2xl shadow-2xl">
          <DialogHeader><DialogTitle className="text-xl font-bold">Novo Lead</DialogTitle></DialogHeader>
          <div className="mt-4">
            {leadFormFields(newLead, setNewLead, true, true)}
            <div className="flex gap-3 mt-8">
              <Button variant="ghost" className="flex-1 h-12 font-bold" onClick={() => setGlobalAddOpen(false)}>Cancelar</Button>
              <Button onClick={() => handleAddLead()} className="flex-1 h-12 font-bold shadow-lg shadow-primary/20">Adicionar Lead</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Management Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="bg-card border-border max-w-2xl rounded-2xl shadow-2xl">
          <DialogHeader><DialogTitle className="text-xl font-bold">Gerenciar Templates WhatsApp</DialogTitle></DialogHeader>
          <div className="space-y-6 mt-4">
            <div className="p-6 rounded-2xl bg-secondary/20 border border-border space-y-4">
              <h4 className="text-sm font-bold">Novo Template</h4>
              <div className="space-y-4">
                <div className="space-y-1.5"><Label className="text-xs font-medium">Nome do Template</Label><Input value={newTemplate.name} onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })} placeholder="Ex: Boas-vindas, Follow-up..." className="bg-background border-border h-10" /></div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Mensagem</Label>
                  <Textarea value={newTemplate.content} onChange={e => setNewTemplate({ ...newTemplate, content: e.target.value })} placeholder="Olá {nome}, vi que você trabalha na {empresa}..." className="bg-background border-border min-h-[120px]" />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {["{nome}", "{empresa}", "{valor}", "{user_name}", "{user_company}"].map(tag => (
                      <button key={tag} onClick={() => setNewTemplate({ ...newTemplate, content: newTemplate.content + tag })} className="text-[10px] font-bold bg-primary/10 text-primary hover:bg-primary/20 px-2 py-1 rounded-lg border border-primary/20 transition-all">{tag}</button>
                    ))}
                  </div>
                </div>
                <Button onClick={handleSaveTemplate} className="w-full h-10 font-bold">Salvar Template</Button>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Templates Salvos</Label>
              <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {whatsappTemplates.map(t => (
                  <div key={t.id} className="p-4 rounded-xl bg-secondary/10 border border-border flex items-center justify-between group">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground truncate italic">"{t.content}"</p>
                    </div>
                    {!t.id.toString().startsWith("default-") && (
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteTemplate(t.id)}><Trash2 className="h-4 w-4" /></Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stage Management Dialog */}
      <Dialog open={stageDialogOpen} onOpenChange={setStageDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md rounded-2xl shadow-2xl">
          <DialogHeader><DialogTitle className="text-xl font-bold">Gerenciar Etapas</DialogTitle></DialogHeader>
          <div className="space-y-6 mt-4">
            <div className="p-6 rounded-2xl bg-secondary/20 border border-border space-y-4">
              <h4 className="text-sm font-bold">Nova Etapa</h4>
              <div className="space-y-4">
                <div className="space-y-1.5"><Label className="text-xs font-medium">Nome da Etapa</Label><Input value={newStageName} onChange={e => setNewStageName(e.target.value)} placeholder="Ex: Proposta, Fechado..." className="bg-background border-border h-10" /></div>
                <div className="space-y-1.5"><Label className="text-xs font-medium">Cor da Etapa</Label><div className="flex gap-2"><input type="color" value={newStageColor} onChange={e => setNewStageColor(e.target.value)} className="h-10 w-10 rounded-lg border border-border cursor-pointer" /><Input value={newStageColor} onChange={e => setNewStageColor(e.target.value)} className="bg-background border-border h-10 flex-1" /></div></div>
                <Button onClick={handleAddStage} className="w-full h-10 font-bold">Criar Etapa</Button>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Etapas Atuais</Label>
              <div className="space-y-2">
                {pipelineStages.map((s, idx) => (
                  <div key={s.id} className="p-3 rounded-xl bg-secondary/10 border border-border flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="text-sm font-bold text-foreground">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleMoveStage(s.id, "up")} disabled={idx === 0} className="p-1.5 hover:bg-secondary rounded-lg disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
                      <button onClick={() => handleMoveStage(s.id, "down")} disabled={idx === pipelineStages.length - 1} className="p-1.5 hover:bg-secondary rounded-lg disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
                      <button onClick={() => setEditingStage(s)} className="p-1.5 hover:bg-secondary rounded-lg text-primary"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => handleDeleteStage(s.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Stage Dialog */}
      <Dialog open={!!editingStage} onOpenChange={open => !open && setEditingStage(null)}>
        <DialogContent className="bg-card border-border max-w-md rounded-2xl shadow-2xl">
          <DialogHeader><DialogTitle className="text-xl font-bold">Editar Etapa</DialogTitle></DialogHeader>
          {editingStage && (
            <div className="space-y-4 mt-4">
              <div className="space-y-1.5"><Label className="text-xs font-medium">Nome</Label><Input value={editingStage.name} onChange={e => setEditingStage({ ...editingStage, name: e.target.value })} className="bg-secondary/30 border-border h-10" /></div>
              <div className="space-y-1.5"><Label className="text-xs font-medium">Cor</Label><div className="flex gap-2"><input type="color" value={editingStage.color} onChange={e => setEditingStage({ ...editingStage, color: e.target.value })} className="h-10 w-10 rounded-lg border border-border cursor-pointer" /><Input value={editingStage.color} onChange={e => setEditingStage({ ...editingStage, color: e.target.value })} className="bg-secondary/30 border-border h-10 flex-1" /></div></div>
              <Button onClick={handleUpdateStage} className="w-full h-10 font-bold mt-4">Salvar Alterações</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Pipeline Dialog */}
      <Dialog open={showNewPipelineDialog} onOpenChange={setShowNewPipelineDialog}>
        <DialogContent className="bg-card border-border max-w-lg rounded-2xl shadow-2xl">
          <DialogHeader><DialogTitle className="text-xl font-bold">Criar Novo Funil</DialogTitle></DialogHeader>
          <div className="space-y-6 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-bold">Nome do Funil</Label>
                <Input value={newPipelineName} onChange={e => setNewPipelineName(e.target.value)} placeholder="Ex: Clientes Ativos, Prospecção, Parceiros..." className="bg-secondary/30 border-border h-10 text-sm" />
              </div>
              <p className="text-xs text-muted-foreground italic">Crie um novo funil para organizar diferentes tipos de leads ou processos de vendas.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1 h-10 font-bold" onClick={() => { setNewPipelineName(""); setShowNewPipelineDialog(false); }}>Cancelar</Button>
              <Button onClick={handleCreatePipeline} className="flex-1 h-10 font-bold shadow-lg shadow-primary/20" disabled={!newPipelineName.trim()}>Criar Funil</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>



      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: hsl(var(--primary) / 0.3); }
      `}} />
    </div>
  );
};

export default CRMKanban;
