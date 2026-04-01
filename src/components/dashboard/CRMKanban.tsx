import { useEffect, useState, useMemo, useRef } from "react";
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
  Upload, AlertTriangle, CheckCircle, Square,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#84cc16", "#3b82f6", "#f59e0b", "#8b5cf6", "#10b981", "#ef4444"];
const WON_STAGE_PATTERNS = ["fechado", "convertido", "venda", "ganho", "won", "closed"];

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
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [activePipeline, setActivePipeline] = useState<string | null>(null);
  const [newPipelineName, setNewPipelineName] = useState("");
  const [showPipelineDialog, setShowPipelineDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSource, setFilterSource] = useState("");
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

  const fetchData = async () => {
    if (!user) return;
    // Fetch pipelines
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
    if (templatesData) setWhatsappTemplates(templatesData);

    // Set active pipeline
    if (!activePipeline && pips.length > 0) setActivePipeline(pips[0].id);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  // Filtered stages by pipeline
  const pipelineStages = useMemo(() => {
    if (!activePipeline) return stages;
    return stages.filter(s => s.pipeline_id === activePipeline || !s.pipeline_id);
  }, [stages, activePipeline]);

  const filteredLeads = useMemo(() => {
    const stageIds = new Set(pipelineStages.map(s => s.id));
    return leads.filter(l => {
      if (l.stage_id && !stageIds.has(l.stage_id)) return false;
      if (searchTerm && !l.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !l.email?.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !l.company?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (filterStatus && l.status !== filterStatus) return false;
      if (filterSource && l.source !== filterSource) return false;
      return true;
    });
  }, [leads, searchTerm, filterStatus, filterSource, pipelineStages]);

  const sources = useMemo(() => [...new Set(leads.map(l => l.source).filter(Boolean))], [leads]);

  // Duplicate detection
  const checkDuplicate = (email: string, phone: string) => {
    if (!email && !phone) return null;
    return leads.find(l => (email && l.email?.toLowerCase() === email.toLowerCase()) || (phone && l.phone === phone)) || null;
  };

  const handleAddLead = async (stageId?: string) => {
    if (!user || !newLead.name) return;
    // Check duplicates
    const dup = checkDuplicate(newLead.email, newLead.phone);
    if (dup && !duplicateWarning) {
      setDuplicateWarning(dup);
      return;
    }
    setDuplicateWarning(null);
    
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
    await supabase.from("whatsapp_templates").delete().eq("id", id);
    toast({ title: "Template excluído" });
    fetchData();
  };

  const getWhatsAppLink = (lead: Lead, content: string) => {
    if (!lead.phone) return "";
    let message = content
      .replace(/{nome}/g, lead.name || "")
      .replace(/{empresa}/g, lead.company || "")
      .replace(/{valor}/g, lead.value?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) || "");
    
    const phone = lead.phone.replace(/\D/g, "");
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  const handleBulkWhatsApp = () => {
    if (selectedLeads.size === 0 || !selectedTemplate) return;
    const template = whatsappTemplates.find(t => t.id === selectedTemplate);
    if (!template) return;

    const selectedLeadsList = leads.filter(l => selectedLeads.has(l.id) && l.phone);
    if (selectedLeadsList.length === 0) {
      toast({ title: "Aviso", description: "Nenhum lead selecionado possui telefone.", variant: "destructive" });
      return;
    }

    selectedLeadsList.forEach((lead, index) => {
      setTimeout(() => {
        window.open(getWhatsAppLink(lead, template.content), "_blank");
      }, index * 1000);
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
    if (!draggedLead) return;
    const lead = leads.find(l => l.id === draggedLead);
    const stage = pipelineStages.find(s => s.id === stageId);
    const updates: any = { stage_id: stageId };
    if (stage && isWonStage(stage.name) && lead && lead.value > 0) updates.status = "won";
    await supabase.from("leads").update(updates).eq("id", draggedLead);
    setLeads(prev => prev.map(l => l.id === draggedLead ? { ...l, ...updates } : l));
    setDraggedLead(null);
    if (stage && isWonStage(stage.name) && lead && lead.value > 0) {
      toast({ title: `🎉 Lead "${lead.name}" marcado como ganho! R$ ${lead.value.toLocaleString("pt-BR")}` });
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

  const handleExportLeads = () => {
    const csv = ["Nome,Email,Telefone,Empresa,Valor,Status,Fonte,Tags"].concat(
      leads.map(l => `"${l.name}","${l.email || ""}","${l.phone || ""}","${l.company || ""}",${l.value},"${l.status}","${l.source || ""}","${(l.tags || []).join(";")}"`)
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "leads.csv"; a.click();
    toast({ title: "Leads exportados!" });
  };

  // CSV Import
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length < 2) return;
      const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
      setCsvHeaders(headers);
      const rows = lines.slice(1).map(line => {
        const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = vals[i] || ""; });
        return row;
      });
      setCsvData(rows);
      // Auto-map common fields
      const autoMap: Record<string, string> = {};
      headers.forEach(h => {
        const hl = h.toLowerCase();
        if (hl.includes("nome") || hl === "name") autoMap[h] = "name";
        else if (hl.includes("email") || hl === "e-mail") autoMap[h] = "email";
        else if (hl.includes("telefone") || hl.includes("phone") || hl.includes("whatsapp")) autoMap[h] = "phone";
        else if (hl.includes("empresa") || hl.includes("company")) autoMap[h] = "company";
        else if (hl.includes("valor") || hl.includes("value")) autoMap[h] = "value";
        else if (hl.includes("fonte") || hl.includes("source")) autoMap[h] = "source";
      });
      setCsvMapping(autoMap);
      setShowImport(true);
    };
    reader.readAsText(file);
  };

  const handleImportCsv = async () => {
    if (!user || csvData.length === 0) return;
    const firstStageId = pipelineStages[0]?.id;
    if (!firstStageId) { toast({ title: "Crie uma etapa primeiro", variant: "destructive" }); return; }

    const reverseMap: Record<string, string> = {};
    Object.entries(csvMapping).forEach(([csvCol, field]) => { reverseMap[field] = csvCol; });

    const leadsToInsert = csvData.map(row => ({
      user_id: user.id,
      name: row[reverseMap["name"]] || "Importado",
      email: row[reverseMap["email"]] || null,
      phone: row[reverseMap["phone"]] || null,
      company: row[reverseMap["company"]] || null,
      value: parseFloat(row[reverseMap["value"]]) || 0,
      source: row[reverseMap["source"]] || "csv-import",
      stage_id: firstStageId,
      position: 0,
      status: "new" as const,
    }));

    const { error } = await supabase.from("leads").insert(leadsToInsert as any);
    if (error) { toast({ title: "Erro na importação", description: error.message, variant: "destructive" }); return; }
    toast({ title: `${leadsToInsert.length} leads importados!` });
    setShowImport(false); setCsvData([]); setCsvHeaders([]); setCsvMapping({});
    fetchData();
  };

  // Bulk actions
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

  // Pipeline CRUD (persistent)
  const handleCreatePipeline = async () => {
    if (!user || !newPipelineName.trim()) return;
    const { data, error } = await supabase.from("pipelines").insert({ user_id: user.id, name: newPipelineName } as any).select().single();
    if (error) { toast({ title: "Erro", variant: "destructive" }); return; }
    toast({ title: "Pipeline criado!" });
    setNewPipelineName(""); setShowPipelineDialog(false);
    if (data) setActivePipeline(data.id);
    fetchData();
  };

  const openWhatsApp = (lead: Lead) => {
    if (!lead.phone) { toast({ title: "Lead sem WhatsApp", variant: "destructive" }); return; }
    const phone = lead.phone.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`Olá ${lead.name}! `)}`, "_blank");
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

  if (loading) return <div className="text-muted-foreground">Carregando CRM...</div>;

  const totalLeads = leads.length;
  const totalValue = leads.reduce((s, l) => s + (l.value || 0), 0);
  const wonStageIds = pipelineStages.filter(s => isWonStage(s.name)).map(s => s.id);
  const wonLeads = leads.filter(l => (l.status === "won" || (l.stage_id && wonStageIds.includes(l.stage_id))) && l.value > 0);
  const wonValue = wonLeads.reduce((s, l) => s + (l.value || 0), 0);
  const conversionRate = totalLeads > 0 ? ((wonLeads.length / totalLeads) * 100).toFixed(1) : "0";
  const stageData = pipelineStages.map(stage => ({ name: stage.name, count: leads.filter(l => l.stage_id === stage.id).length, value: leads.filter(l => l.stage_id === stage.id).reduce((s, l) => s + (l.value || 0), 0) }));
  const statusCounts: Record<string, number> = {};
  leads.forEach(l => { statusCounts[l.status] = (statusCounts[l.status] || 0) + 1; });
  const statusData = Object.entries(statusCounts).map(([k, v]) => ({ name: statusOptions.find(s => s.value === k)?.label || k, value: v }));
  const leadActivities = editLead ? activities.filter(a => a.lead_id === editLead.id) : [];

  const leadFormFields = (data: any, setData: (d: any) => void, isNew = false, showStageSelect = false) => (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
      <div className="space-y-3">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Informações Básicas</h4>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Nome *</Label><Input value={data.name} onChange={e => { setData({ ...data, name: e.target.value }); }} placeholder="Nome completo" className="mt-1 bg-secondary/50 border-border" /></div>
          <div><Label className="text-xs">Empresa</Label><Input value={data.company || ""} onChange={e => setData({ ...data, company: e.target.value })} placeholder="Empresa" className="mt-1 bg-secondary/50 border-border" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">E-mail</Label><Input value={data.email || ""} onChange={e => setData({ ...data, email: e.target.value })} placeholder="email@ex.com" className="mt-1 bg-secondary/50 border-border" /></div>
          <div><Label className="text-xs">WhatsApp</Label><Input value={data.phone || ""} onChange={e => setData({ ...data, phone: e.target.value })} placeholder="5511999999999" className="mt-1 bg-secondary/50 border-border" /></div>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Qualificação Profissional</h4>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Prioridade</Label>
            <select value={data.priority || "medium"} onChange={e => setData({ ...data, priority: e.target.value })} className="w-full mt-1 h-10 bg-secondary/50 border border-border rounded-md px-3 text-sm text-foreground">
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
            </select>
          </div>
          <div><Label className="text-xs">Urgência</Label>
            <select value={data.urgency || "medium"} onChange={e => setData({ ...data, urgency: e.target.value })} className="w-full mt-1 h-10 bg-secondary/50 border border-border rounded-md px-3 text-sm text-foreground">
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Tipo de Receita</Label>
            <select value={data.revenue_type || "one_time"} onChange={e => setData({ ...data, revenue_type: e.target.value })} className="w-full mt-1 h-10 bg-secondary/50 border border-border rounded-md px-3 text-sm text-foreground">
              <option value="one_time">Única</option>
              <option value="recurring">Recorrente</option>
            </select>
          </div>
          <div><Label className="text-xs">Probabilidade (%)</Label><Input type="number" value={data.probability || ""} onChange={e => setData({ ...data, probability: e.target.value })} placeholder="50" className="mt-1 bg-secondary/50 border-border" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Valor Mensal (R$)</Label><Input type="number" value={data.monthly_value || ""} onChange={e => setData({ ...data, monthly_value: e.target.value })} placeholder="0" className="mt-1 bg-secondary/50 border-border" /></div>
          <div><Label className="text-xs">Duração Contrato (meses)</Label><Input type="number" value={data.contract_months || ""} onChange={e => setData({ ...data, contract_months: e.target.value })} placeholder="1" className="mt-1 bg-secondary/50 border-border" /></div>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Financeiro e Origem</h4>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Valor Total (R$)</Label><Input type="number" value={data.value || ""} onChange={e => setData({ ...data, value: e.target.value })} placeholder="0" className="mt-1 bg-secondary/50 border-border" /></div>
          <div><Label className="text-xs">Fonte</Label><Input value={data.source || ""} onChange={e => setData({ ...data, source: e.target.value })} placeholder="Instagram, Google..." className="mt-1 bg-secondary/50 border-border" /></div>
        </div>
        {(data.status !== undefined || showStageSelect) && (
          <div className="grid grid-cols-2 gap-3">
            {data.status !== undefined && (
              <div><Label className="text-xs">Status</Label>
                <select value={data.status} onChange={e => setData({ ...data, status: e.target.value })} className="w-full mt-1 h-10 bg-secondary/50 border border-border rounded-md px-3 text-sm text-foreground">
                  {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            )}
            <div><Label className="text-xs">Etapa</Label>
              <select value={data.stage_id || ""} onChange={e => setData({ ...data, stage_id: e.target.value })} className="w-full mt-1 h-10 bg-secondary/50 border border-border rounded-md px-3 text-sm text-foreground">
                {!data.stage_id && <option value="">Selecione...</option>}
                {pipelineStages.map(s => <option key={s.id} value={s.id}>{s.name} {isWonStage(s.name) ? "🏆" : ""}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Redes Sociais e Web</h4>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Instagram</Label><Input value={data.instagram || ""} onChange={e => setData({ ...data, instagram: e.target.value })} placeholder="@usuario" className="mt-1 bg-secondary/50 border-border" /></div>
          <div><Label className="text-xs">LinkedIn</Label><Input value={data.linkedin || ""} onChange={e => setData({ ...data, linkedin: e.target.value })} placeholder="linkedin.com/in/..." className="mt-1 bg-secondary/50 border-border" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Facebook</Label><Input value={data.facebook || ""} onChange={e => setData({ ...data, facebook: e.target.value })} placeholder="facebook.com/..." className="mt-1 bg-secondary/50 border-border" /></div>
          <div><Label className="text-xs">Website</Label><Input value={data.website || ""} onChange={e => setData({ ...data, website: e.target.value })} placeholder="www.site.com" className="mt-1 bg-secondary/50 border-border" /></div>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Rastreamento UTM</h4>
        <div className="grid grid-cols-3 gap-3">
          <div><Label className="text-xs">Source</Label><Input value={data.utm_source || ""} onChange={e => setData({ ...data, utm_source: e.target.value })} placeholder="google" className="mt-1 bg-secondary/50 border-border" /></div>
          <div><Label className="text-xs">Medium</Label><Input value={data.utm_medium || ""} onChange={e => setData({ ...data, utm_medium: e.target.value })} placeholder="cpc" className="mt-1 bg-secondary/50 border-border" /></div>
          <div><Label className="text-xs">Campaign</Label><Input value={data.utm_campaign || ""} onChange={e => setData({ ...data, utm_campaign: e.target.value })} placeholder="black_friday" className="mt-1 bg-secondary/50 border-border" /></div>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Outros</h4>
        {isNew && <div><Label className="text-xs">Tags (separadas por vírgula)</Label><Input value={data.tags || ""} onChange={e => setData({ ...data, tags: e.target.value })} placeholder="vip, urgente, novo" className="mt-1 bg-secondary/50 border-border" /></div>}
        <div><Label className="text-xs">Observações</Label><Textarea value={data.notes || ""} onChange={e => setData({ ...data, notes: e.target.value })} placeholder="Observações..." className="mt-1 bg-secondary/50 border-border" rows={2} /></div>
      </div>

      {/* Duplicate warning */}
      {duplicateWarning && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-destructive">Lead duplicado encontrado!</p>
            <p className="text-[10px] text-muted-foreground mt-1">"{duplicateWarning.name}" já existe com e-mail/telefone similar.</p>
            <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={() => { setDuplicateWarning(null); handleAddLead(); }}>Adicionar mesmo assim</Button>
          </div>
        </div>
      )}
    </div>
  );

  // CSV Import Dialog
  if (showImport) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">📥 Importar Leads (CSV)</h2>
          <Button variant="ghost" size="sm" onClick={() => setShowImport(false)}>← Voltar</Button>
        </div>
        <div className="surface-card rounded-lg p-4 space-y-4">
          <p className="text-sm text-foreground font-medium">Mapeamento de colunas ({csvData.length} linhas)</p>
          <div className="grid grid-cols-2 gap-3">
            {csvHeaders.map(h => (
              <div key={h}>
                <Label className="text-[10px] text-muted-foreground">{h}</Label>
                <select value={csvMapping[h] || ""} onChange={e => setCsvMapping({ ...csvMapping, [h]: e.target.value })} className="w-full h-8 text-xs bg-secondary border border-border rounded px-2 mt-1 text-foreground">
                  <option value="">Ignorar</option>
                  <option value="name">Nome</option>
                  <option value="email">E-mail</option>
                  <option value="phone">Telefone</option>
                  <option value="company">Empresa</option>
                  <option value="value">Valor</option>
                  <option value="source">Fonte</option>
                </select>
              </div>
            ))}
          </div>
          {/* Preview */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-border">{csvHeaders.map(h => <th key={h} className="text-left py-2 px-2 text-muted-foreground">{h}{csvMapping[h] && <span className="text-primary ml-1">→ {csvMapping[h]}</span>}</th>)}</tr></thead>
              <tbody>{csvData.slice(0, 5).map((row, i) => <tr key={i} className="border-b border-border/50">{csvHeaders.map(h => <td key={h} className="py-1.5 px-2 text-foreground">{row[h]}</td>)}</tr>)}</tbody>
            </table>
            {csvData.length > 5 && <p className="text-[10px] text-muted-foreground mt-2">+{csvData.length - 5} linhas</p>}
          </div>
          <Button onClick={handleImportCsv} disabled={!Object.values(csvMapping).includes("name")}>
            <Upload className="h-4 w-4 mr-2" /> Importar {csvData.length} Leads
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pipeline Selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {pipelines.map(p => (
          <Button key={p.id} variant={activePipeline === p.id ? "default" : "outline"} size="sm" onClick={() => setActivePipeline(p.id)} className="text-xs">{p.name}</Button>
        ))}
        {pipelines.length === 0 && <Button variant="default" size="sm" className="text-xs" onClick={async () => {
          if (!user) return;
          const { data } = await supabase.from("pipelines").insert({ user_id: user.id, name: "Pipeline Principal" } as any).select().single();
          if (data) { setActivePipeline(data.id); fetchData(); }
        }}>Criar Pipeline Principal</Button>}
        <Dialog open={showPipelineDialog} onOpenChange={setShowPipelineDialog}>
          <DialogTrigger asChild><Button variant="ghost" size="sm" className="h-8 text-xs"><Plus className="h-3 w-3 mr-1" /> Pipeline</Button></DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Novo Pipeline</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input value={newPipelineName} onChange={e => setNewPipelineName(e.target.value)} placeholder="Nome do pipeline" className="bg-secondary/50 border-border" />
              <Button onClick={handleCreatePipeline} className="w-full">Criar Pipeline</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant={view === "kanban" ? "default" : "outline"} size="sm" onClick={() => setView("kanban")}>Kanban</Button>
          <Button variant={view === "dashboard" ? "default" : "outline"} size="sm" onClick={() => setView("dashboard")}><BarChart3 className="h-4 w-4 mr-1" /> Dashboard</Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar lead..." className="h-8 pl-8 w-48 text-xs bg-secondary/50 border-border" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="h-8 text-xs bg-secondary/50 border border-border rounded-md px-2 text-foreground">
            <option value="">Todos status</option>
            {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {sources.length > 0 && (
            <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className="h-8 text-xs bg-secondary/50 border border-border rounded-md px-2 text-foreground">
              <option value="">Todas fontes</option>
              {sources.map(s => <option key={s} value={s!}>{s}</option>)}
            </select>
          )}
          <Button variant="outline" size="sm" onClick={handleExportLeads} className="h-8"><Download className="h-3.5 w-3.5 mr-1" /> CSV</Button>
          <Button variant="outline" size="sm" onClick={() => csvRef.current?.click()} className="h-8"><Upload className="h-3.5 w-3.5 mr-1" /> Importar</Button>
          <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
          <Dialog open={stageDialogOpen} onOpenChange={setStageDialogOpen}>
            <DialogTrigger asChild><Button variant="outline" size="sm" className="h-8"><Plus className="h-3.5 w-3.5 mr-1" /> Etapa</Button></DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle>Nova Etapa</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div><Label>Nome</Label><Input value={newStageName} onChange={e => setNewStageName(e.target.value)} className="mt-1 bg-secondary/50 border-border" placeholder="Ex: Fechado, Convertido..." /></div>
                <p className="text-[10px] text-muted-foreground">💡 Etapas com nomes como "Fechado" contabilizam automaticamente como receita ganha.</p>
                <div><Label>Cor</Label><div className="flex items-center gap-2 mt-1"><input type="color" value={newStageColor} onChange={e => setNewStageColor(e.target.value)} className="h-10 w-10 rounded border border-border cursor-pointer" /><Input value={newStageColor} onChange={e => setNewStageColor(e.target.value)} className="bg-secondary/50 border-border" /></div></div>
                <Button onClick={handleAddStage} className="w-full">Criar Etapa</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={globalAddOpen} onOpenChange={setGlobalAddOpen}>
            <DialogTrigger asChild><Button size="sm" className="h-8 gap-1"><Plus className="h-3.5 w-3.5" /> Novo Lead</Button></DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle>Novo Lead</DialogTitle></DialogHeader>
              {leadFormFields(newLead, setNewLead, true, true)}
              <Button onClick={() => handleAddLead()} className="w-full">Adicionar Lead</Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedLeads.size > 0 && (
        <div className="surface-card rounded-lg p-3 flex items-center gap-3 flex-wrap">
          <p className="text-xs font-medium text-foreground"><CheckCircle className="h-3.5 w-3.5 inline mr-1 text-primary" />{selectedLeads.size} selecionados</p>
          <select value={bulkAction} onChange={e => setBulkAction(e.target.value)} className="h-7 text-xs bg-secondary border border-border rounded px-2 text-foreground">
            <option value="">Ação em massa...</option>
            <option value="move">Mover etapa</option>
            <option value="tag">Adicionar tag</option>
            <option value="delete">Excluir</option>
          </select>
          {bulkAction === "move" && (
            <select value={bulkStageId} onChange={e => setBulkStageId(e.target.value)} className="h-7 text-xs bg-secondary border border-border rounded px-2 text-foreground">
              <option value="">Etapa...</option>
              {pipelineStages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          {bulkAction === "tag" && <Input value={bulkTag} onChange={e => setBulkTag(e.target.value)} placeholder="Tag..." className="h-7 w-32 text-xs bg-secondary/50 border-border" />}
          <Button size="sm" className="h-7 text-xs" onClick={executeBulkAction} disabled={!bulkAction}>Aplicar</Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedLeads(new Set())}>Cancelar</Button>
        </div>
      )}

      {/* Dashboard */}
      {view === "dashboard" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total de Leads", value: totalLeads, icon: Users, color: "text-blue-400" },
              { label: "Valor Total", value: `R$ ${totalValue.toLocaleString("pt-BR")}`, icon: DollarSign, color: "text-primary" },
              { label: "Valor Ganho", value: `R$ ${wonValue.toLocaleString("pt-BR")}`, icon: TrendingUp, color: "text-emerald-400" },
              { label: "Conversão", value: `${conversionRate}%`, icon: Target, color: "text-purple-400" },
            ].map(m => (
              <Card key={m.label} className="surface-card border-border"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">{m.label}</p><p className="text-2xl font-bold text-foreground mt-1">{m.value}</p></div><m.icon className={`h-8 w-8 ${m.color} opacity-60`} /></div></CardContent></Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="surface-card border-border"><CardHeader><CardTitle className="text-sm">Leads por Etapa</CardTitle></CardHeader><CardContent>
              {stageData.length > 0 ? <ResponsiveContainer width="100%" height={250}><BarChart data={stageData}><CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 12%)" /><XAxis dataKey="name" stroke="hsl(0 0% 45%)" fontSize={12} /><YAxis stroke="hsl(0 0% 45%)" fontSize={12} /><Tooltip contentStyle={{ background: "hsl(0 0% 4%)", border: "1px solid hsl(0 0% 12%)", borderRadius: 8 }} /><Bar dataKey="count" fill="hsl(84 81% 44%)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer> : <p className="text-muted-foreground text-sm text-center py-12">Sem dados</p>}
            </CardContent></Card>
            <Card className="surface-card border-border"><CardHeader><CardTitle className="text-sm">Status</CardTitle></CardHeader><CardContent>
              {statusData.length > 0 ? <ResponsiveContainer width="100%" height={250}><PieChart><Pie data={statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>{statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip contentStyle={{ background: "hsl(0 0% 4%)", border: "1px solid hsl(0 0% 12%)", borderRadius: 8 }} /></PieChart></ResponsiveContainer> : <p className="text-muted-foreground text-sm text-center py-12">Sem dados</p>}
            </CardContent></Card>
          </div>
        </div>
      )}

      {/* Kanban */}
      {view === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: "calc(100vh - 300px)" }}>
          {/* Select all toggle */}
          <div className="absolute">
            <button onClick={selectAllVisible} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1">
              {selectedLeads.size === filteredLeads.length && filteredLeads.length > 0 ? <CheckCircle className="h-3 w-3 text-primary" /> : <Square className="h-3 w-3" />}
              Selecionar todos
            </button>
          </div>
          {pipelineStages.map((stage, sIdx) => {
            const stageLeads = filteredLeads.filter(l => l.stage_id === stage.id);
            const stageValue = stageLeads.reduce((s, l) => s + (l.value || 0), 0);
            const isWon = isWonStage(stage.name);
            return (
              <div key={stage.id} className="flex-shrink-0 w-72 flex flex-col" onDragOver={e => e.preventDefault()} onDrop={() => handleDrop(stage.id)}>
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                    <h3 className="text-sm font-semibold text-foreground">{stage.name}</h3>
                    {isWon && <span className="text-xs">🏆</span>}
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{stageLeads.length}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {stageValue > 0 && <span className="text-xs text-primary font-medium mr-1">R$ {stageValue.toLocaleString("pt-BR")}</span>}
                    <button onClick={() => handleMoveStage(stage.id, "up")} className="p-0.5 hover:bg-secondary rounded" disabled={sIdx === 0}><ChevronUp className="h-3 w-3 text-muted-foreground" /></button>
                    <button onClick={() => handleMoveStage(stage.id, "down")} className="p-0.5 hover:bg-secondary rounded" disabled={sIdx === pipelineStages.length - 1}><ChevronDown className="h-3 w-3 text-muted-foreground" /></button>
                    <button onClick={() => setEditingStage({ ...stage })} className="p-0.5 hover:bg-secondary rounded"><Pencil className="h-3 w-3 text-muted-foreground" /></button>
                    <button onClick={() => handleDeleteStage(stage.id)} className="p-0.5 hover:bg-destructive/20 rounded"><Trash2 className="h-3 w-3 text-destructive" /></button>
                  </div>
                </div>
                <div className="flex-1 space-y-2 min-h-[100px] rounded-lg p-2 bg-muted/30 border border-border/50">
                  {stageLeads.map(lead => (
                    <div key={lead.id} draggable onDragStart={() => setDraggedLead(lead.id)}
                      onClick={() => { setEditLead({ ...lead }); setEditOpen(true); setEditTab("info"); }}
                      className={`surface-card rounded-lg p-3 cursor-pointer hover:border-primary/30 transition-colors group ${selectedLeads.has(lead.id) ? "ring-2 ring-primary" : ""}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <button onClick={e => { e.stopPropagation(); toggleSelectLead(lead.id); }} className="shrink-0">
                            {selectedLeads.has(lead.id) ? <CheckCircle className="h-4 w-4 text-primary" /> : <div className="w-4 h-4 rounded-full border border-muted-foreground/30 group-hover:border-primary/50" />}
                          </button>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
                            {lead.company && <p className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Building className="h-2.5 w-2.5" />{lead.company}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          {lead.phone && <button onClick={e => { e.stopPropagation(); openWhatsApp(lead); }} className="p-1 hover:bg-primary/10 rounded"><MessageCircle className="h-3 w-3 text-primary" /></button>}
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {lead.email && <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex items-center gap-0.5"><Mail className="h-2.5 w-2.5" /></span>}
                        {lead.phone && <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex items-center gap-0.5"><Phone className="h-2.5 w-2.5" /></span>}
                        {lead.source && <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">{lead.source}</span>}
                        {(lead.tags || []).slice(0, 2).map(tag => <span key={tag} className="text-[10px] bg-accent/20 text-accent-foreground px-1.5 py-0.5 rounded">{tag}</span>)}
                      </div>
                      {lead.value > 0 && (
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-primary font-medium flex items-center gap-0.5"><DollarSign className="h-3 w-3" />R$ {lead.value.toLocaleString("pt-BR")}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(lead.created_at).toLocaleDateString("pt-BR")}</span>
                        </div>
                      )}
                    </div>
                  ))}
                  <Dialog open={addOpen && addStageId === stage.id} onOpenChange={open => { setAddOpen(open); if (open) setAddStageId(stage.id); }}>
                    <DialogTrigger asChild>
                      <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50 transition-colors"><Plus className="h-4 w-4" /> Adicionar</button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border">
                      <DialogHeader><DialogTitle>Novo Lead — {stage.name}</DialogTitle></DialogHeader>
                      {leadFormFields(newLead, setNewLead, true)}
                      <Button onClick={() => handleAddLead(stage.id)} className="w-full">Adicionar Lead</Button>
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
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">{editLead?.name.charAt(0).toUpperCase()}</div>
              <span className="flex-1">{editLead?.name}</span>
              {editLead?.phone && <button onClick={() => window.open(`https://wa.me/${editLead.phone?.replace(/\D/g, "")}?text=Olá ${editLead.name}!`, "_blank")} className="p-2 hover:bg-primary/10 rounded-lg"><MessageCircle className="h-4 w-4 text-primary" /></button>}
            </DialogTitle>
          </DialogHeader>
          {editLead && (
            <>
              <div className="flex gap-1 border-b border-border mb-3">
                <button onClick={() => setEditTab("info")} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${editTab === "info" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>Informações</button>
                <button onClick={() => setEditTab("activity")} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${editTab === "activity" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                  <History className="h-3.5 w-3.5 inline mr-1" />Atividades ({leadActivities.length})
                </button>
                <button onClick={() => setEditTab("whatsapp")} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${editTab === "whatsapp" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                  <MessageCircle className="h-3.5 w-3.5 inline mr-1" />WhatsApp
                </button>
              </div>
              {editTab === "info" && (
                <>
                  {leadFormFields(editLead, setEditLead)}
                  <div className="space-y-2 mt-2">
                    <Label className="text-xs">Tags</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {(editLead.tags || []).map(tag => (
                        <span key={tag} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full flex items-center gap-1">
                          {tag} <button onClick={() => removeTagFromLead(tag)} className="hover:text-destructive"><X className="h-2.5 w-2.5" /></button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Nova tag..." className="h-8 text-xs bg-secondary/50 border-border" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTagToLead())} />
                      <Button variant="outline" size="sm" onClick={addTagToLead} className="h-8"><Tag className="h-3 w-3" /></Button>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button onClick={handleUpdateLead} className="flex-1">Salvar</Button>
                    <Button variant="destructive" onClick={() => { handleDeleteLead(editLead.id); setEditOpen(false); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </>
              )}
              {editTab === "activity" && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <select value={newActivity.type} onChange={e => setNewActivity({ ...newActivity, type: e.target.value })} className="h-9 text-xs bg-secondary/50 border border-border rounded-md px-2 text-foreground">
                      {activityTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <Input value={newActivity.description} onChange={e => setNewActivity({ ...newActivity, description: e.target.value })} placeholder="Descreva a atividade..." className="h-9 text-xs bg-secondary/50 border-border flex-1" onKeyDown={e => e.key === "Enter" && handleAddActivity()} />
                    <Button size="sm" onClick={handleAddActivity} className="h-9"><Plus className="h-3.5 w-3.5" /></Button>
                  </div>
                  <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                    {leadActivities.length === 0 ? <p className="text-xs text-muted-foreground text-center py-8">Nenhuma atividade registrada</p> : leadActivities.map(a => {
                      const typeInfo = activityTypes.find(t => t.value === a.type);
                      const Icon = typeInfo?.icon || StickyNote;
                      return (
                        <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><Icon className="h-3.5 w-3.5 text-primary" /></div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-medium text-primary uppercase">{typeInfo?.label}</span>
                              <span className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleString("pt-BR")}</span>
                            </div>
                            <p className="text-xs text-foreground mt-0.5">{a.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {editTab === "whatsapp" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Templates de WhatsApp</h4>
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowTemplateDialog(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Novo Template</Button>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3 max-h-[40vh] overflow-y-auto pr-1">
                    {whatsappTemplates.length === 0 && <p className="text-center text-muted-foreground text-xs py-8">Nenhum template criado.</p>}
                    {whatsappTemplates.map(t => (
                      <div key={t.id} className="p-3 rounded-lg bg-secondary/30 border border-border flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-primary">{t.name}</span>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteTemplate(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" className="h-7 text-[10px] bg-green-600 hover:bg-green-700 text-white" onClick={() => { if (editLead) window.open(getWhatsAppLink(editLead, t.content), "_blank"); }} disabled={!editLead?.phone}><MessageCircle className="h-3 w-3 mr-1" /> Enviar</Button>
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-2 italic">"{t.content}"</p>
                      </div>
                    ))}
                  </div>

                  {!editLead?.phone && (
                    <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <p className="text-[10px] text-yellow-500 font-medium">Este lead não possui número de telefone cadastrado.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Stage Dialog */}
      <Dialog open={!!editingStage} onOpenChange={open => !open && setEditingStage(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Editar Etapa</DialogTitle></DialogHeader>
          {editingStage && (
            <div className="space-y-3 mt-2">
              <div><Label>Nome</Label><Input value={editingStage.name} onChange={e => setEditingStage({ ...editingStage, name: e.target.value })} className="mt-1 bg-secondary/50 border-border" /></div>
              <div><Label>Cor</Label><div className="flex items-center gap-2 mt-1"><input type="color" value={editingStage.color} onChange={e => setEditingStage({ ...editingStage, color: e.target.value })} className="h-10 w-10 rounded border border-border cursor-pointer" /><Input value={editingStage.color} onChange={e => setEditingStage({ ...editingStage, color: e.target.value })} className="bg-secondary/50 border-border" /></div></div>
              <Button onClick={handleUpdateStage} className="w-full">Salvar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CRMKanban;
