import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, Pencil, MessageCircle, Search, Download, Archive, Tag as TagIcon, Trash2, LayoutGrid, List, Save } from "lucide-react";

interface Column { id: string; name: string; color: string; position: number; }
interface Lead {
  id: string; name: string; email: string | null; phone: string | null;
  stage_id: string | null; tags: string[] | null; created_at: string;
  utm_source: string | null; notes: string | null; archived: boolean;
  [k: string]: any;
}
interface Submission { id: string; payload: any; submitted_at: string; utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; }

interface Props {
  sourceType: "form" | "quiz";
  sourceId: string;
  sourceTitle: string;
  onBack: () => void;
}

const FormLeadsKanban = ({ sourceType, sourceId, sourceTitle, onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [columns, setColumns] = useState<Column[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [filterUtm, setFilterUtm] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [period, setPeriod] = useState<"all" | "today" | "week" | "month">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openLead, setOpenLead] = useState<Lead | null>(null);
  const [editForm, setEditForm] = useState<Partial<Lead>>({});
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [newColName, setNewColName] = useState("");
  const [editingCol, setEditingCol] = useState<string | null>(null);
  const [view, setView] = useState<"kanban" | "list">("kanban");

  const colTable = sourceType === "form" ? "form_kanban_columns" : "quiz_kanban_columns";
  const subTable = sourceType === "form" ? "form_submissions" : "quiz_submissions";
  const sourceFk = sourceType === "form" ? "form_id" : "quiz_id";
  const leadFk = sourceType === "form" ? "source_form_id" : "source_quiz_id";

  const fetchAll = async () => {
    if (!user) return;
    const [{ data: cols }, { data: lds }] = await Promise.all([
      (supabase as any).from(colTable).select("*").eq(sourceFk, sourceId).order("position"),
      (supabase as any).from("leads").select("*").eq("user_id", user.id).eq(leadFk, sourceId).eq("archived", false).order("created_at", { ascending: false }),
    ]);
    setColumns((cols || []) as Column[]);
    setLeads((lds || []) as Lead[]);
  };

  useEffect(() => { fetchAll(); }, [user, sourceId]);

  const openLeadDetails = async (lead: Lead) => {
    setOpenLead(lead);
    setEditForm({ name: lead.name, email: lead.email, phone: lead.phone, notes: lead.notes, tags: lead.tags });
    const { data } = await (supabase as any).from(subTable).select("*").eq(sourceFk, sourceId).eq("lead_id", lead.id).order("submitted_at", { ascending: false });
    setSubmissions((data || []) as Submission[]);
  };

  const saveLeadEdits = async () => {
    if (!openLead) return;
    const payload: any = { name: editForm.name, email: editForm.email, phone: editForm.phone, notes: editForm.notes, tags: editForm.tags };
    await (supabase as any).from("leads").update(payload).eq("id", openLead.id);
    setLeads(prev => prev.map(l => l.id === openLead.id ? { ...l, ...payload } : l));
    setOpenLead({ ...openLead, ...payload } as Lead);
    toast({ title: "Lead atualizado" });
  };

  const deleteLead = async () => {
    if (!openLead) return;
    if (!confirm(`Excluir o lead "${openLead.name}"? Esta ação não pode ser desfeita.`)) return;
    await (supabase as any).from("leads").delete().eq("id", openLead.id);
    setLeads(prev => prev.filter(l => l.id !== openLead.id));
    setOpenLead(null);
    toast({ title: "Lead excluído" });
  };

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    const cutoff = period === "today" ? Date.now() - 86400000 : period === "week" ? Date.now() - 7 * 86400000 : period === "month" ? Date.now() - 30 * 86400000 : 0;
    return leads.filter(l => {
      if (s && !`${l.name} ${l.email || ""} ${l.phone || ""}`.toLowerCase().includes(s)) return false;
      if (filterUtm && l.utm_source !== filterUtm) return false;
      if (filterTag && !(l.tags || []).includes(filterTag)) return false;
      if (cutoff && new Date(l.created_at).getTime() < cutoff) return false;
      return true;
    });
  }, [leads, search, filterUtm, filterTag, period]);

  const utmOptions = useMemo(() => Array.from(new Set(leads.map(l => l.utm_source).filter(Boolean))) as string[], [leads]);
  const tagOptions = useMemo(() => Array.from(new Set(leads.flatMap(l => l.tags || []))), [leads]);

  const moveLead = async (leadId: string, colId: string) => {
    await (supabase as any).from("leads").update({ stage_id: colId }).eq("id", leadId);
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage_id: colId } : l));
  };

  const addColumn = async () => {
    if (!newColName || !user) return;
    const pos = columns.length;
    const { data } = await (supabase as any).from(colTable).insert({ user_id: user.id, [sourceFk]: sourceId, name: newColName, position: pos, color: "#84cc16" }).select().single();
    if (data) setColumns(prev => [...prev, data as Column]);
    setNewColName("");
  };
  const renameColumn = async (id: string, name: string) => {
    await (supabase as any).from(colTable).update({ name }).eq("id", id);
    setColumns(prev => prev.map(c => c.id === id ? { ...c, name } : c));
  };
  const setColColor = async (id: string, color: string) => {
    await (supabase as any).from(colTable).update({ color }).eq("id", id);
    setColumns(prev => prev.map(c => c.id === id ? { ...c, color } : c));
  };
  const removeColumn = async (id: string) => {
    if (!confirm("Remover coluna? Os leads dela ficarão sem coluna.")) return;
    await (supabase as any).from(colTable).delete().eq("id", id);
    setColumns(prev => prev.filter(c => c.id !== id));
  };

  const bulkMove = async (colId: string) => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    await (supabase as any).from("leads").update({ stage_id: colId }).in("id", ids);
    setLeads(prev => prev.map(l => selected.has(l.id) ? { ...l, stage_id: colId } : l));
    setSelected(new Set());
    toast({ title: `${ids.length} leads movidos` });
  };
  const bulkArchive = async () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    await (supabase as any).from("leads").update({ archived: true }).in("id", ids);
    setLeads(prev => prev.filter(l => !selected.has(l.id)));
    setSelected(new Set());
    toast({ title: `${ids.length} leads arquivados` });
  };
  const exportCsv = (rows: Lead[]) => {
    const headers = ["name", "email", "phone", "created_at", "utm_source", "utm_medium", "utm_campaign", "tags", "notes"];
    const csv = [headers.join(",")].concat(rows.map(l => headers.map(h => JSON.stringify((l as any)[h] ?? "")).join(","))).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${sourceTitle}-leads.csv`; a.click();
  };

  const toggleSelect = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-foreground">Leads · {sourceTitle}</h2>
          <p className="text-xs text-muted-foreground">{leads.length} leads · {filtered.length} visíveis</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportCsv(filtered)}><Download className="h-3.5 w-3.5 mr-1" /> CSV</Button>
          <Button variant="ghost" size="sm" onClick={onBack}>← Voltar</Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative"><Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nome/email/telefone" className="pl-7 h-8 w-64 text-xs bg-secondary/50" /></div>
        <select value={period} onChange={e => setPeriod(e.target.value as any)} className="h-8 text-xs bg-secondary/50 border border-border rounded px-2"><option value="all">Todo período</option><option value="today">Hoje</option><option value="week">Semana</option><option value="month">Mês</option></select>
        <select value={filterUtm} onChange={e => setFilterUtm(e.target.value)} className="h-8 text-xs bg-secondary/50 border border-border rounded px-2"><option value="">Todas origens</option>{utmOptions.map(u => <option key={u} value={u}>{u}</option>)}</select>
        <select value={filterTag} onChange={e => setFilterTag(e.target.value)} className="h-8 text-xs bg-secondary/50 border border-border rounded px-2"><option value="">Todas tags</option>{tagOptions.map(t => <option key={t} value={t}>{t}</option>)}</select>
        {selected.size > 0 && (
          <div className="flex gap-1 items-center ml-auto">
            <Badge variant="secondary">{selected.size} sel.</Badge>
            <select onChange={e => e.target.value && bulkMove(e.target.value)} className="h-7 text-xs bg-secondary/50 border border-border rounded px-2"><option value="">Mover para...</option>{columns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <Button size="sm" variant="outline" onClick={() => exportCsv(leads.filter(l => selected.has(l.id)))}><Download className="h-3 w-3" /></Button>
            <Button size="sm" variant="outline" onClick={bulkArchive}><Archive className="h-3 w-3" /></Button>
          </div>
        )}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-3" style={{ minHeight: 400 }}>
        {columns.map(col => {
          const colLeads = filtered.filter(l => l.stage_id === col.id);
          return (
            <div key={col.id} className="flex-shrink-0 w-72 bg-secondary/20 rounded-lg p-2"
                 onDragOver={e => e.preventDefault()}
                 onDrop={e => { const lid = e.dataTransfer.getData("text/plain"); if (lid) moveLead(lid, col.id); }}>
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                  {editingCol === col.id ? (
                    <Input autoFocus value={col.name} onChange={e => setColumns(prev => prev.map(c => c.id === col.id ? { ...c, name: e.target.value } : c))} onBlur={() => { renameColumn(col.id, col.name); setEditingCol(null); }} className="h-6 text-xs" />
                  ) : (
                    <span className="text-xs font-semibold text-foreground cursor-pointer" onDoubleClick={() => setEditingCol(col.id)}>{col.name}</span>
                  )}
                  <span className="text-[10px] text-muted-foreground">{colLeads.length}</span>
                </div>
                <div className="flex gap-0.5">
                  <input type="color" value={col.color} onChange={e => setColColor(col.id, e.target.value)} className="w-5 h-5 rounded cursor-pointer bg-transparent border-0" />
                  <button onClick={() => setEditingCol(col.id)} className="text-muted-foreground hover:text-foreground"><Pencil className="h-3 w-3" /></button>
                  <button onClick={() => removeColumn(col.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                </div>
              </div>
              <div className="space-y-2">
                {colLeads.map(l => (
                  <div key={l.id} draggable onDragStart={e => e.dataTransfer.setData("text/plain", l.id)}
                       className={`bg-background rounded-md p-2.5 border cursor-grab hover:border-primary transition-colors ${selected.has(l.id) ? "border-primary" : "border-border"}`}>
                    <div className="flex items-start gap-2">
                      <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggleSelect(l.id)} onClick={e => e.stopPropagation()} className="mt-0.5" />
                      <div className="flex-1 min-w-0" onClick={() => openLeadDetails(l)}>
                        <p className="text-xs font-semibold text-foreground truncate">{l.name}</p>
                        {l.email && <p className="text-[10px] text-muted-foreground truncate">{l.email}</p>}
                        {l.phone && (
                          <a href={`https://wa.me/${l.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1 text-[10px] text-emerald-500 hover:underline mt-0.5">
                            <MessageCircle className="h-2.5 w-2.5" /> {l.phone}
                          </a>
                        )}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {l.utm_source && <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{l.utm_source}</span>}
                          {(l.tags || []).slice(0, 3).map(t => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{t}</span>)}
                        </div>
                        <p className="text-[9px] text-muted-foreground mt-1">{new Date(l.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {colLeads.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-4">vazio</p>}
              </div>
            </div>
          );
        })}
        <div className="flex-shrink-0 w-64 bg-secondary/10 rounded-lg p-3">
          <p className="text-xs font-semibold text-muted-foreground mb-2">+ Nova coluna</p>
          <Input value={newColName} onChange={e => setNewColName(e.target.value)} placeholder="Nome" className="h-7 text-xs mb-2 bg-background" />
          <Button size="sm" onClick={addColumn} disabled={!newColName} className="w-full h-7"><Plus className="h-3 w-3 mr-1" />Adicionar</Button>
        </div>
      </div>

      <Sheet open={!!openLead} onOpenChange={o => !o && setOpenLead(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {openLead && (
            <>
              <SheetHeader><SheetTitle>{openLead.name}</SheetTitle></SheetHeader>
              <Tabs defaultValue="info" className="mt-4">
                <TabsList className="grid grid-cols-3"><TabsTrigger value="info">Informações</TabsTrigger><TabsTrigger value="activities">Atividades</TabsTrigger><TabsTrigger value="automations">Automações</TabsTrigger></TabsList>
                <TabsContent value="info" className="space-y-3 mt-3">
                  <div className="text-xs space-y-1">
                    <p><b>Email:</b> {openLead.email || "-"}</p>
                    <p><b>Telefone:</b> {openLead.phone || "-"}</p>
                    <p><b>Origem UTM:</b> {openLead.utm_source || "-"} / {openLead.utm_medium || "-"} / {openLead.utm_campaign || "-"}</p>
                    <p><b>Criado em:</b> {new Date(openLead.created_at).toLocaleString("pt-BR")}</p>
                    <p><b>Tags:</b> {(openLead.tags || []).join(", ") || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold mb-2">Timeline de submissões ({submissions.length})</p>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {submissions.map(s => (
                        <div key={s.id} className="border border-border rounded-md p-2 text-[11px]">
                          <p className="text-muted-foreground">{new Date(s.submitted_at).toLocaleString("pt-BR")} · {s.utm_source || "direct"}</p>
                          <pre className="mt-1 text-[10px] whitespace-pre-wrap break-all bg-secondary/30 p-1.5 rounded">{JSON.stringify(s.payload, null, 1)}</pre>
                        </div>
                      ))}
                      {submissions.length === 0 && <p className="text-[10px] text-muted-foreground">Nenhuma submissão registrada</p>}
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="activities" className="space-y-3 mt-3">
                  <Textarea placeholder="Adicionar nota..." value={openLead.notes || ""} onChange={e => setOpenLead({ ...openLead, notes: e.target.value })} onBlur={async () => { await (supabase as any).from("leads").update({ notes: openLead.notes }).eq("id", openLead.id); fetchAll(); }} rows={4} className="text-xs" />
                </TabsContent>
                <TabsContent value="automations" className="space-y-2 mt-3">
                  {openLead.phone && <Button size="sm" className="w-full" onClick={() => window.open(`https://wa.me/${openLead.phone!.replace(/\D/g, "")}`, "_blank")}><MessageCircle className="h-3 w-3 mr-1" /> Abrir WhatsApp</Button>}
                  <Button size="sm" variant="outline" className="w-full" onClick={async () => {
                    if (!openLead.phone) return;
                    await (supabase as any).rpc("enqueue_job", { _kind: sourceType === "form" ? "form_whatsapp_auto" : "form_whatsapp_auto", _payload: { user_id: openLead.user_id, phone: openLead.phone.replace(/\D/g, ""), message: `Olá ${openLead.name}!`, source_type: sourceType, source_id: sourceId, lead_id: openLead.id }, _tenant: openLead.user_id, _priority: 3, _max_attempts: 3 });
                    toast({ title: "Mensagem agendada" });
                  }}>Reenviar mensagem automática</Button>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default FormLeadsKanban;
