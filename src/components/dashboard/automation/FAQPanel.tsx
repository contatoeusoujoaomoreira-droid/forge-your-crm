import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, HelpCircle, Copy, ChevronDown, ChevronRight, Search } from "lucide-react";

type FaqGroup = { id: string; name: string; description: string | null; agent_id: string | null; is_active: boolean; position: number };
type FaqItem = { id: string; group_id: string; agent_id: string | null; question: string; answer: string; keywords: string[] | null; position: number; is_active: boolean };

export default function FAQPanel() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<FaqGroup[]>([]);
  const [items, setItems] = useState<FaqItem[]>([]);
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [openGroupIds, setOpenGroupIds] = useState<Record<string, boolean>>({});
  const [groupOpen, setGroupOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Partial<FaqGroup>>({ name: "", description: "", is_active: true, agent_id: null });
  const [editingItem, setEditingItem] = useState<Partial<FaqItem> & { group_id?: string }>({ question: "", answer: "", keywords: [], is_active: true });
  const [search, setSearch] = useState("");

  const load = async () => {
    if (!user) return;
    const [g, i, a] = await Promise.all([
      supabase.from("agent_faq_groups" as any).select("*").eq("user_id", user.id).order("position").order("created_at"),
      supabase.from("agent_faq_items" as any).select("*").eq("user_id", user.id).order("position").order("created_at"),
      supabase.from("ai_agents").select("id,name").eq("user_id", user.id),
    ]);
    setGroups((g.data as any) || []);
    setItems((i.data as any) || []);
    setAgents((a.data as any) || []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const saveGroup = async () => {
    if (!user || !editingGroup.name?.trim()) return toast.error("Nome obrigatório");
    const payload: any = { ...editingGroup, user_id: user.id, agent_id: editingGroup.agent_id || null };
    const res = editingGroup.id
      ? await supabase.from("agent_faq_groups" as any).update(payload).eq("id", editingGroup.id)
      : await supabase.from("agent_faq_groups" as any).insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success("FAQ salvo"); setGroupOpen(false); setEditingGroup({ name: "", description: "", is_active: true, agent_id: null }); load();
  };
  const removeGroup = async (id: string) => {
    if (!confirm("Excluir este FAQ e todas as perguntas dele?")) return;
    await supabase.from("agent_faq_groups" as any).delete().eq("id", id); load();
  };

  const saveItem = async () => {
    if (!user || !editingItem.group_id) return toast.error("Selecione um FAQ");
    if (!editingItem.question?.trim() || !editingItem.answer?.trim()) return toast.error("Pergunta e resposta obrigatórias");
    const group = groups.find(g => g.id === editingItem.group_id);
    const payload: any = {
      user_id: user.id,
      group_id: editingItem.group_id,
      agent_id: group?.agent_id || null,
      question: editingItem.question,
      answer: editingItem.answer,
      keywords: Array.isArray(editingItem.keywords) ? editingItem.keywords : String(editingItem.keywords || "").split(",").map(s => s.trim()).filter(Boolean),
      is_active: editingItem.is_active !== false,
      position: editingItem.position ?? 0,
    };
    const res = editingItem.id
      ? await supabase.from("agent_faq_items" as any).update(payload).eq("id", editingItem.id)
      : await supabase.from("agent_faq_items" as any).insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success("Pergunta salva"); setItemOpen(false); setEditingItem({ question: "", answer: "", keywords: [], is_active: true }); load();
  };
  const removeItem = async (id: string) => {
    if (!confirm("Excluir pergunta?")) return;
    await supabase.from("agent_faq_items" as any).delete().eq("id", id); load();
  };
  const duplicateItem = async (it: FaqItem) => {
    if (!user) return;
    const { id, ...rest } = it as any;
    await supabase.from("agent_faq_items" as any).insert({ ...rest, user_id: user.id, question: `${it.question} (cópia)` });
    load();
  };
  const toggleItem = async (it: FaqItem) => {
    await supabase.from("agent_faq_items" as any).update({ is_active: !it.is_active }).eq("id", it.id);
    load();
  };

  const filterFn = (it: FaqItem) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return it.question.toLowerCase().includes(s) || it.answer.toLowerCase().includes(s) || (it.keywords || []).some(k => k.toLowerCase().includes(s));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2"><HelpCircle className="h-5 w-5" />Perguntas Frequentes (FAQ)</h3>
          <p className="text-xs text-muted-foreground">O agente interpreta a intenção do lead e responde naturalmente — sem copiar a pergunta cadastrada literalmente.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-7 h-8 w-56" placeholder="Pesquisar pergunta…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button size="sm" variant="outline" onClick={() => { setEditingGroup({ name: "", description: "", is_active: true, agent_id: null }); setGroupOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" />Novo FAQ
          </Button>
          <Button size="sm" onClick={() => { setEditingItem({ question: "", answer: "", keywords: [], is_active: true, group_id: groups[0]?.id }); setItemOpen(true); }} disabled={!groups.length}>
            <Plus className="h-4 w-4 mr-1" />Nova pergunta
          </Button>
        </div>
      </div>

      {groups.length === 0 && (
        <Card className="p-6 text-center text-muted-foreground text-sm">
          Crie seu primeiro FAQ (ex: FAQ Comercial, FAQ Financeiro, FAQ Locação) e adicione perguntas com respostas.
        </Card>
      )}

      <div className="space-y-2">
        {groups.map(g => {
          const groupItems = items.filter(it => it.group_id === g.id).filter(filterFn);
          const open = openGroupIds[g.id] !== false;
          return (
            <Card key={g.id} className="p-3">
              <Collapsible open={open} onOpenChange={(v) => setOpenGroupIds(p => ({ ...p, [g.id]: v }))}>
                <div className="flex items-center justify-between gap-2">
                  <CollapsibleTrigger className="flex items-center gap-2 flex-1 text-left">
                    {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {g.name}
                        <Badge variant={g.is_active ? "default" : "secondary"} className="text-[10px]">{g.is_active ? "Ativo" : "Inativo"}</Badge>
                        <Badge variant="outline" className="text-[10px]">{groupItems.length} pergunta{groupItems.length === 1 ? "" : "s"}</Badge>
                      </div>
                      {g.description && <div className="text-xs text-muted-foreground">{g.description}</div>}
                    </div>
                  </CollapsibleTrigger>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => { setEditingItem({ question: "", answer: "", keywords: [], is_active: true, group_id: g.id }); setItemOpen(true); }}>
                      <Plus className="h-3.5 w-3.5 mr-1" />Pergunta
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => { setEditingGroup(g); setGroupOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => removeGroup(g.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </div>
                <CollapsibleContent className="mt-3 space-y-2">
                  {groupItems.length === 0 && <div className="text-xs text-muted-foreground pl-6">Nenhuma pergunta {search ? "encontrada" : "ainda"}.</div>}
                  {groupItems.map(it => (
                    <div key={it.id} className="border rounded-md p-2 ml-6 bg-muted/30">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{it.question}</div>
                          <div className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{it.answer}</div>
                          {!!it.keywords?.length && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {it.keywords.map(k => <Badge key={k} variant="outline" className="text-[10px]">{k}</Badge>)}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Switch checked={it.is_active} onCheckedChange={() => toggleItem(it)} />
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => { setEditingItem(it); setItemOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => duplicateItem(it)}><Copy className="h-3 w-3" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => removeItem(it.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>

      {/* Group dialog */}
      <Dialog open={groupOpen} onOpenChange={setGroupOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingGroup.id ? "Editar" : "Novo"} FAQ</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={editingGroup.name || ""} onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })} placeholder="FAQ Comercial, FAQ Financeiro…" /></div>
            <div><Label>Descrição</Label><Textarea rows={2} value={editingGroup.description || ""} onChange={(e) => setEditingGroup({ ...editingGroup, description: e.target.value })} placeholder="Breve explicação (opcional)" /></div>
            <div>
              <Label>Agente vinculado (opcional)</Label>
              <Select value={editingGroup.agent_id || "none"} onValueChange={(v) => setEditingGroup({ ...editingGroup, agent_id: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Todos os agentes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Todos os agentes</SelectItem>
                  {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editingGroup.is_active !== false} onCheckedChange={(v) => setEditingGroup({ ...editingGroup, is_active: v })} />
              <Label>Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupOpen(false)}>Cancelar</Button>
            <Button onClick={saveGroup}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item dialog */}
      <Dialog open={itemOpen} onOpenChange={setItemOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editingItem.id ? "Editar" : "Nova"} pergunta</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>FAQ *</Label>
              <Select value={editingItem.group_id || ""} onValueChange={(v) => setEditingItem({ ...editingItem, group_id: v })}>
                <SelectTrigger><SelectValue placeholder="Escolha um FAQ" /></SelectTrigger>
                <SelectContent>
                  {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Pergunta *</Label><Textarea rows={2} value={editingItem.question || ""} onChange={(e) => setEditingItem({ ...editingItem, question: e.target.value })} placeholder="Quais documentos preciso para financiar?" /></div>
            <div><Label>Resposta *</Label><Textarea rows={5} value={editingItem.answer || ""} onChange={(e) => setEditingItem({ ...editingItem, answer: e.target.value })} placeholder="Você precisará apresentar RG, CPF, comprovante de renda e comprovante de residência." /></div>
            <div><Label>Palavras-chave (vírgula)</Label><Input value={Array.isArray(editingItem.keywords) ? editingItem.keywords.join(", ") : (editingItem.keywords || "")} onChange={(e) => setEditingItem({ ...editingItem, keywords: e.target.value.split(",").map(s => s.trim()).filter(Boolean) as any })} placeholder="documentos, financiamento, papelada" /></div>
            <div className="flex items-center gap-2">
              <Switch checked={editingItem.is_active !== false} onCheckedChange={(v) => setEditingItem({ ...editingItem, is_active: v })} />
              <Label>Ativa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemOpen(false)}>Cancelar</Button>
            <Button onClick={saveItem}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
