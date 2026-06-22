import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Users, Mail, Phone, Building, DollarSign, Pencil, Trash2,
  MessageCircle, List, LayoutDashboard, LayoutGrid, Search, X, Tag, Calendar, Target,
} from "lucide-react";

interface LeadTag { id: string; name: string; color: string | null; emoji: string | null; }
const tagBgStyle = (color?: string | null) => {
  const c = color || "#84cc16";
  return { backgroundColor: `${c}22`, color: c, borderColor: `${c}55` };
};

interface Lead {
  id: string; name: string; email: string | null; phone: string | null;
  company: string | null; value: number; stage_id: string | null;
  position: number; notes: string | null; source: string | null;
  status: string; created_at: string; tags: string[];
  utm_source?: string | null; utm_medium?: string | null; utm_campaign?: string | null;
}

interface Stage {
  id: string; name: string; position: number; color: string;
}

interface LeadViewerProps {
  leads: Lead[];
  stages: Stage[];
  onRefresh: () => void;
  title?: string;
}

const LeadViewer = ({ leads, stages, onRefresh, title = "Leads" }: LeadViewerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState<"list" | "kanban" | "boards">(() => {
    const v = typeof window !== "undefined" ? localStorage.getItem("leadviewer-view") : null;
    return (v === "kanban" || v === "boards" || v === "list") ? v : "list";
  });
  const setViewPersist = (v: "list" | "kanban" | "boards") => {
    setView(v);
    try { localStorage.setItem("leadviewer-view", v); } catch {}
  };
  const [search, setSearch] = useState("");
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [tagCatalog, setTagCatalog] = useState<LeadTag[]>([]);
  const [filterTags, setFilterTags] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("lead_tags").select("id, name, color, emoji").eq("user_id", user.id).eq("is_active", true)
      .then(({ data }) => setTagCatalog((data as any) || []));
  }, [user]);

  const catalogByName = useMemo(() => {
    const m = new Map<string, LeadTag>();
    for (const t of tagCatalog) m.set(t.name.toLowerCase(), t);
    return m;
  }, [tagCatalog]);

  const renderTagChip = (name: string) => {
    const meta = catalogByName.get(name.toLowerCase());
    return (
      <span key={name} className="text-[10px] px-1.5 py-0.5 rounded border font-medium" style={tagBgStyle(meta?.color)}>
        {meta?.emoji ? `${meta.emoji} ` : ""}{name}
      </span>
    );
  };

  const toggleFilterTag = (name: string) => {
    setFilterTags(p => p.includes(name) ? p.filter(t => t !== name) : [...p, name]);
  };

  const filtered = leads.filter(l => {
    if (filterTags.length && !filterTags.every(t => (l.tags || []).includes(t))) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return l.name.toLowerCase().includes(s) || l.email?.toLowerCase().includes(s) || l.company?.toLowerCase().includes(s);
  });

  const handleUpdate = async () => {
    if (!editLead) return;
    await supabase.from("leads").update({
      name: editLead.name, email: editLead.email, phone: editLead.phone,
      company: editLead.company, value: editLead.value, notes: editLead.notes,
      source: editLead.source, status: editLead.status, tags: editLead.tags,
      stage_id: editLead.stage_id,
    } as any).eq("id", editLead.id);
    toast({ title: "Lead atualizado!" });
    setEditOpen(false); setEditLead(null); onRefresh();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("leads").delete().eq("id", id);
    toast({ title: "Lead excluído" }); onRefresh();
  };

  const openWhatsApp = (lead: Lead) => {
    if (!lead.phone) return;
    const phone = lead.phone.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`Olá ${lead.name}!`)}`, "_blank");
  };

  const addTag = () => {
    if (!editLead || !newTag.trim()) return;
    if (!editLead.tags.includes(newTag.trim())) setEditLead({ ...editLead, tags: [...editLead.tags, newTag.trim()] });
    setNewTag("");
  };

  const LeadCard = ({ lead }: { lead: Lead }) => (
    <div onClick={() => { setEditLead({ ...lead }); setEditOpen(true); }}
      className="surface-card rounded-lg p-3 cursor-pointer hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
            {lead.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
            {lead.email && <p className="text-[10px] text-muted-foreground truncate">{lead.email}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {lead.phone && <button onClick={e => { e.stopPropagation(); openWhatsApp(lead); }} className="p-1 hover:bg-primary/10 rounded"><MessageCircle className="h-3 w-3 text-primary" /></button>}
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        {lead.source && <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">{lead.source}</span>}
        {lead.utm_campaign && <span className="text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded flex items-center gap-1" title={`Campanha: ${lead.utm_campaign}${lead.utm_source ? ` • ${lead.utm_source}` : ""}`}><Target className="h-2.5 w-2.5" />{lead.utm_campaign}</span>}
        {lead.value > 0 && <span className="text-[10px] text-primary font-medium">R$ {lead.value.toLocaleString("pt-BR")}</span>}
        {(lead.tags || []).slice(0, 3).map(t => renderTagChip(t))}
        <span className="text-[10px] text-muted-foreground ml-auto">{new Date(lead.created_at).toLocaleDateString("pt-BR")}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Users className="h-4 w-4" /> {title} ({filtered.length})</h3>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-3 w-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="h-7 pl-7 w-36 text-xs bg-secondary/50 border-border" />
          </div>
          <Button variant={view === "list" ? "default" : "outline"} size="sm" className="h-7 px-2" onClick={() => setViewPersist("list")} title="Lista"><List className="h-3 w-3" /></Button>
          <Button variant={view === "kanban" ? "default" : "outline"} size="sm" className="h-7 px-2" onClick={() => setViewPersist("kanban")} title="Kanban"><LayoutDashboard className="h-3 w-3" /></Button>
          <Button variant={view === "boards" ? "default" : "outline"} size="sm" className="h-7 px-2" onClick={() => setViewPersist("boards")} title="Quadros"><LayoutGrid className="h-3 w-3" /></Button>
        </div>
      </div>

      {tagCatalog.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-muted-foreground uppercase font-bold mr-1">Filtrar por tag:</span>
          {tagCatalog.map(t => {
            const active = filterTags.includes(t.name);
            return (
              <button key={t.id} onClick={() => toggleFilterTag(t.name)}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-opacity ${active ? "opacity-100" : "opacity-60 hover:opacity-100"}`}
                style={tagBgStyle(t.color)}>
                {t.emoji ? `${t.emoji} ` : ""}{t.name}
              </button>
            );
          })}
          {filterTags.length > 0 && (
            <button onClick={() => setFilterTags([])} className="text-[10px] text-muted-foreground hover:text-foreground underline ml-1">limpar</button>
          )}
        </div>
      )}


      {filtered.length === 0 ? (
        <div className="surface-card rounded-lg p-8 text-center"><p className="text-xs text-muted-foreground">Nenhum lead encontrado</p></div>
      ) : view === "list" ? (
        <div className="space-y-2">{filtered.map(l => <LeadCard key={l.id} lead={l} />)}</div>
      ) : view === "boards" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(l => (
            <div key={l.id} onClick={() => { setEditLead({ ...l }); setEditOpen(true); }}
              className="surface-card rounded-lg p-4 cursor-pointer hover:border-primary/30 transition-colors space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                  {l.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">{l.name}</p>
                  {l.company && <p className="text-[10px] text-muted-foreground truncate">{l.company}</p>}
                </div>
                {l.phone && <button onClick={e => { e.stopPropagation(); openWhatsApp(l); }} className="p-1.5 hover:bg-primary/10 rounded"><MessageCircle className="h-3.5 w-3.5 text-primary" /></button>}
              </div>
              {l.email && <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate"><Mail className="h-3 w-3 shrink-0" />{l.email}</p>}
              {l.phone && <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate"><Phone className="h-3 w-3 shrink-0" />{l.phone}</p>}
              <div className="flex items-center justify-between pt-1 border-t border-border/50">
                {l.value > 0 ? <span className="text-xs text-primary font-semibold">R$ {l.value.toLocaleString("pt-BR")}</span> : <span />}
                <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Calendar className="h-2.5 w-2.5" />{new Date(l.created_at).toLocaleDateString("pt-BR")}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {l.source && <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">{l.source}</span>}
                {(l.tags || []).slice(0, 3).map(t => renderTagChip(t))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {stages.map(stage => {
            const stageLeads = filtered.filter(l => l.stage_id === stage.id);
            return (
              <div key={stage.id} className="flex-shrink-0 w-60">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                  <span className="text-xs font-semibold text-foreground">{stage.name}</span>
                  <span className="text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded">{stageLeads.length}</span>
                </div>
                <div className="space-y-1.5 min-h-[60px] rounded-lg p-1.5 bg-muted/30 border border-border/50">
                  {stageLeads.map(l => <LeadCard key={l.id} lead={l} />)}
                </div>
              </div>
            );
          })}
          {/* Leads without stage */}
          {(() => {
            const noStage = filtered.filter(l => !l.stage_id || !stages.find(s => s.id === l.stage_id));
            if (noStage.length === 0) return null;
            return (
              <div className="flex-shrink-0 w-60">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground">Sem etapa</span>
                  <span className="text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded">{noStage.length}</span>
                </div>
                <div className="space-y-1.5 min-h-[60px] rounded-lg p-1.5 bg-muted/30 border border-border/50">
                  {noStage.map(l => <LeadCard key={l.id} lead={l} />)}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Edit Lead Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editLead && <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">{editLead.name.charAt(0).toUpperCase()}</div>}
              {editLead?.name}
              {editLead?.phone && <button onClick={() => openWhatsApp(editLead!)} className="p-1.5 hover:bg-primary/10 rounded-lg ml-auto"><MessageCircle className="h-4 w-4 text-primary" /></button>}
            </DialogTitle>
          </DialogHeader>
          {editLead && (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Nome</Label><Input value={editLead.name} onChange={e => setEditLead({ ...editLead, name: e.target.value })} className="mt-1 bg-secondary/50 border-border" /></div>
                <div><Label className="text-xs">Empresa</Label><Input value={editLead.company || ""} onChange={e => setEditLead({ ...editLead, company: e.target.value })} className="mt-1 bg-secondary/50 border-border" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">E-mail</Label><Input value={editLead.email || ""} onChange={e => setEditLead({ ...editLead, email: e.target.value })} className="mt-1 bg-secondary/50 border-border" /></div>
                <div><Label className="text-xs">WhatsApp</Label><Input value={editLead.phone || ""} onChange={e => setEditLead({ ...editLead, phone: e.target.value })} className="mt-1 bg-secondary/50 border-border" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Valor (R$)</Label><Input type="number" value={editLead.value || ""} onChange={e => setEditLead({ ...editLead, value: parseFloat(e.target.value) || 0 })} className="mt-1 bg-secondary/50 border-border" /></div>
                <div><Label className="text-xs">Fonte</Label><Input value={editLead.source || ""} onChange={e => setEditLead({ ...editLead, source: e.target.value })} className="mt-1 bg-secondary/50 border-border" /></div>
              </div>
              <div>
                <Label className="text-xs">Etapa</Label>
                <select value={editLead.stage_id || ""} onChange={e => setEditLead({ ...editLead, stage_id: e.target.value })} className="w-full mt-1 h-9 bg-secondary/50 border border-border rounded-md px-3 text-sm text-foreground">
                  <option value="">Sem etapa</option>
                  {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div><Label className="text-xs">Observações</Label><Textarea value={editLead.notes || ""} onChange={e => setEditLead({ ...editLead, notes: e.target.value })} className="mt-1 bg-secondary/50 border-border" rows={2} /></div>
              <div className="space-y-2">
                <Label className="text-xs">Tags</Label>
                <div className="flex flex-wrap gap-1">{(editLead.tags || []).map(tag => {
                  const meta = catalogByName.get(tag.toLowerCase());
                  return (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1 border" style={tagBgStyle(meta?.color)}>
                      {meta?.emoji ? `${meta.emoji} ` : ""}{tag}
                      <button onClick={() => setEditLead({ ...editLead, tags: editLead.tags.filter(t => t !== tag) })}><X className="h-2.5 w-2.5" /></button>
                    </span>
                  );
                })}</div>
                {tagCatalog.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-[10px] text-muted-foreground mr-1 self-center">Catálogo:</span>
                    {tagCatalog.filter(t => !editLead.tags.includes(t.name)).map(t => (
                      <button key={t.id} onClick={() => setEditLead({ ...editLead, tags: [...editLead.tags, t.name] })}
                        className="text-[10px] px-2 py-0.5 rounded-full border opacity-70 hover:opacity-100" style={tagBgStyle(t.color)}>
                        + {t.emoji ? `${t.emoji} ` : ""}{t.name}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Nova tag livre..." className="h-7 text-xs bg-secondary/50 border-border" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())} />
                  <Button variant="outline" size="sm" onClick={addTag} className="h-7"><Tag className="h-3 w-3" /></Button>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleUpdate} className="flex-1">Salvar</Button>
                <Button variant="destructive" onClick={() => { handleDelete(editLead.id); setEditOpen(false); }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeadViewer;
