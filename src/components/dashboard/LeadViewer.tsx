import { useState } from "react";
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
  MessageCircle, List, LayoutDashboard, Search, X, Tag,
} from "lucide-react";

interface Lead {
  id: string; name: string; email: string | null; phone: string | null;
  company: string | null; value: number; stage_id: string | null;
  position: number; notes: string | null; source: string | null;
  status: string; created_at: string; tags: string[];
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
  const [view, setView] = useState<"list" | "kanban">("list");
  const [search, setSearch] = useState("");
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [newTag, setNewTag] = useState("");

  const filtered = leads.filter(l => {
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
        {lead.value > 0 && <span className="text-[10px] text-primary font-medium">R$ {lead.value.toLocaleString("pt-BR")}</span>}
        {(lead.tags || []).slice(0, 2).map(tag => <span key={tag} className="text-[10px] bg-accent/20 text-accent-foreground px-1.5 py-0.5 rounded">{tag}</span>)}
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
          <Button variant={view === "list" ? "default" : "outline"} size="sm" className="h-7 px-2" onClick={() => setView("list")}><List className="h-3 w-3" /></Button>
          <Button variant={view === "kanban" ? "default" : "outline"} size="sm" className="h-7 px-2" onClick={() => setView("kanban")}><LayoutDashboard className="h-3 w-3" /></Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="surface-card rounded-lg p-8 text-center"><p className="text-xs text-muted-foreground">Nenhum lead encontrado</p></div>
      ) : view === "list" ? (
        <div className="space-y-2">{filtered.map(l => <LeadCard key={l.id} lead={l} />)}</div>
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
                <div className="flex flex-wrap gap-1">{(editLead.tags || []).map(tag => (
                  <span key={tag} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">{tag} <button onClick={() => setEditLead({ ...editLead, tags: editLead.tags.filter(t => t !== tag) })}><X className="h-2.5 w-2.5" /></button></span>
                ))}</div>
                <div className="flex gap-2">
                  <Input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Nova tag..." className="h-7 text-xs bg-secondary/50 border-border" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())} />
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
