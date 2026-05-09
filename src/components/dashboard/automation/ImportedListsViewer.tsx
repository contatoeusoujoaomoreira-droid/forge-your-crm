import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ListChecks, Trash2, RefreshCcw, Phone, ArrowRight, Send } from "lucide-react";

interface ImportedList {
  id: string;
  name: string;
  list_type: string;
  tag: string | null;
  total_contacts: number;
  total_converted: number;
  created_at: string;
}

interface ImportedContact {
  id: string;
  phone: string | null;
  email: string | null;
  name: string | null;
  status: string;
  lead_id: string | null;
  created_at: string;
}

export default function ImportedListsViewer() {
  const { user } = useAuth();
  const [lists, setLists] = useState<ImportedList[]>([]);
  const [activeList, setActiveList] = useState<string | null>(null);
  const [contacts, setContacts] = useState<ImportedContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pipelines, setPipelines] = useState<{ id: string; name: string }[]>([]);
  const [stages, setStages] = useState<{ id: string; name: string; pipeline_id: string | null }[]>([]);
  const [pipelineId, setPipelineId] = useState<string>("");
  const [stageId, setStageId] = useState<string>("");
  const [transferring, setTransferring] = useState(false);

  const loadLists = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("imported_lists")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setLists((data as any) || []);
  };

  const loadCrm = async () => {
    if (!user) return;
    const [{ data: pipes }, { data: stgs }] = await Promise.all([
      supabase.from("pipelines").select("id, name").eq("user_id", user.id).order("created_at"),
      supabase.from("pipeline_stages").select("id, name, pipeline_id").eq("user_id", user.id).order("position"),
    ]);
    setPipelines(pipes || []);
    setStages((stgs as any) || []);
  };

  useEffect(() => { loadLists(); loadCrm(); }, [user]);

  const openList = async (id: string) => {
    setActiveList(id);
    setSelected(new Set());
    setLoading(true);
    const { data } = await supabase
      .from("imported_contacts")
      .select("*")
      .eq("list_id", id)
      .order("created_at");
    setContacts((data as any) || []);
    setLoading(false);
  };

  const deleteList = async (id: string) => {
    if (!confirm("Excluir esta lista e todos os contatos importados? Os leads do CRM não serão afetados.")) return;
    await supabase.from("imported_contacts").delete().eq("list_id", id);
    await supabase.from("imported_lists").delete().eq("id", id);
    toast.success("Lista removida");
    if (activeList === id) { setActiveList(null); setContacts([]); }
    loadLists();
  };

  const toggleAll = () => {
    if (selected.size === contacts.length) setSelected(new Set());
    else setSelected(new Set(contacts.map((c) => c.id)));
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const transferToCrm = async () => {
    if (!user || !activeList) return;
    if (!stageId) { toast.error("Selecione a etapa do CRM"); return; }
    const target = contacts.filter((c) => selected.has(c.id));
    if (target.length === 0) { toast.error("Selecione ao menos um contato"); return; }

    setTransferring(true);
    let converted = 0, dup = 0;
    for (const c of target) {
      const cleanPhone = (c.phone || "").replace(/\D/g, "") || null;
      // Skip if already converted
      if (c.status === "converted" && c.lead_id) {
        await supabase.from("leads").update({ stage_id: stageId, pipeline_id: pipelineId || null }).eq("id", c.lead_id);
        converted++;
        continue;
      }
      // Find existing lead by phone or email
      let existing: any = null;
      if (cleanPhone) {
        const { data } = await supabase.from("leads").select("id").eq("user_id", user.id).eq("phone", cleanPhone).maybeSingle();
        existing = data;
      }
      if (!existing && c.email) {
        const { data } = await supabase.from("leads").select("id").eq("user_id", user.id).eq("email", c.email).maybeSingle();
        existing = data;
      }
      if (existing) {
        await supabase.from("leads").update({ stage_id: stageId, pipeline_id: pipelineId || null }).eq("id", existing.id);
        await supabase.from("imported_contacts").update({ status: "duplicated", lead_id: existing.id }).eq("id", c.id);
        dup++;
        continue;
      }
      const { data: lead } = await supabase.from("leads").insert({
        user_id: user.id,
        name: c.name || cleanPhone || "Importado",
        phone: cleanPhone,
        email: c.email,
        stage_id: stageId,
        pipeline_id: pipelineId || null,
        source: "import",
        status: "new",
        tags: ["importado"],
      } as any).select("id").single();
      if (lead) {
        await supabase.from("imported_contacts").update({ status: "converted", lead_id: lead.id }).eq("id", c.id);
        converted++;
      }
    }
    // Update list counter
    const { count } = await supabase.from("imported_contacts").select("id", { count: "exact", head: true }).eq("list_id", activeList).eq("status", "converted");
    await supabase.from("imported_lists").update({ total_converted: count || 0 }).eq("id", activeList);

    toast.success(`${converted} transferidos para o CRM${dup ? ` (${dup} já existiam, etapa atualizada)` : ""}`);
    setSelected(new Set());
    openList(activeList);
    loadLists();
    setTransferring(false);
  };

  const reconvertPending = async (listId: string) => {
    if (!user) return;
    const pending = contacts.filter((c) => c.status === "pending");
    if (pending.length === 0) { toast.info("Nenhum contato pendente"); return; }
    let ok = 0;
    for (const c of pending) {
      if (!c.phone) continue;
      const { data: existing } = await supabase
        .from("leads").select("id").eq("user_id", user.id).eq("phone", c.phone).maybeSingle();
      if (existing) {
        await supabase.from("imported_contacts").update({ status: "duplicated", lead_id: existing.id }).eq("id", c.id);
        continue;
      }
      const { data: lead } = await supabase.from("leads").insert({
        user_id: user.id, name: c.name || c.phone, phone: c.phone, email: c.email,
        source: "import", status: "new",
      } as any).select("id").single();
      if (lead) {
        await supabase.from("imported_contacts").update({ status: "converted", lead_id: lead.id }).eq("id", c.id);
        ok++;
      }
    }
    toast.success(`${ok} contatos convertidos em leads`);
    openList(listId);
    loadLists();
  };

  const active = lists.find((l) => l.id === activeList);
  const filteredStages = pipelineId ? stages.filter((s) => s.pipeline_id === pipelineId) : stages;
  const allSelected = contacts.length > 0 && selected.size === contacts.length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1 space-y-2">
          <h3 className="font-semibold flex items-center gap-2 text-sm">
            <ListChecks className="h-4 w-4" /> Listas Importadas
          </h3>
          {lists.length === 0 && (
            <Card className="p-4 text-xs text-muted-foreground">
              Nenhuma lista ainda. Importe contatos na aba "Importar Leads".
            </Card>
          )}
          {lists.map((l) => (
            <Card
              key={l.id}
              className={`p-3 cursor-pointer hover:border-primary/40 transition ${activeList === l.id ? "border-primary" : ""}`}
              onClick={() => openList(l.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{l.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {new Date(l.created_at).toLocaleDateString("pt-BR")}
                  </div>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    <Badge variant="secondary" className="text-[10px]">{l.total_contacts} contatos</Badge>
                    <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30">{l.total_converted} no CRM</Badge>
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); deleteList(l.id); }}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <div className="md:col-span-2">
          {!active && (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              Selecione uma lista à esquerda para ver os contatos.
            </Card>
          )}
          {active && (
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="font-semibold">{active.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {active.total_contacts} contatos • {active.total_converted} no CRM • {selected.size} selecionados
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => reconvertPending(active.id)}>
                  <RefreshCcw className="h-3.5 w-3.5 mr-1" /> Converter pendentes
                </Button>
              </div>

              {/* Bulk transfer panel */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3">
                <p className="text-xs font-semibold text-foreground">📤 Transferir para o CRM</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">Pipeline</Label>
                    <select
                      value={pipelineId}
                      onChange={(e) => { setPipelineId(e.target.value); setStageId(""); }}
                      className="w-full h-8 text-xs bg-secondary border border-border rounded px-2 mt-1 text-foreground"
                    >
                      <option value="">Qualquer pipeline</option>
                      {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-[10px]">Etapa *</Label>
                    <select
                      value={stageId}
                      onChange={(e) => setStageId(e.target.value)}
                      className="w-full h-8 text-xs bg-secondary border border-border rounded px-2 mt-1 text-foreground"
                    >
                      <option value="">Selecione...</option>
                      {filteredStages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelected(new Set(contacts.map((c) => c.id)));
                    }}
                    variant="outline"
                  >
                    Selecionar todos ({contacts.length})
                  </Button>
                  <Button
                    size="sm"
                    onClick={transferToCrm}
                    disabled={transferring || !stageId || selected.size === 0}
                  >
                    <Send className="h-3.5 w-3.5 mr-1" />
                    {transferring ? "Transferindo..." : `Transferir ${selected.size || ""} para o CRM`}
                  </Button>
                </div>
              </div>

              {loading && <div className="text-xs text-muted-foreground">Carregando…</div>}
              <div className="max-h-[420px] overflow-auto rounded border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-secondary/40 sticky top-0">
                    <tr>
                      <th className="text-left p-2 w-8">
                        <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                      </th>
                      <th className="text-left p-2">Nome</th>
                      <th className="text-left p-2">Telefone</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map((c) => (
                      <tr key={c.id} className={`border-t border-border/50 ${selected.has(c.id) ? "bg-primary/5" : ""}`}>
                        <td className="p-2">
                          <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggleOne(c.id)} />
                        </td>
                        <td className="p-2">{c.name || "—"}</td>
                        <td className="p-2 font-mono flex items-center gap-1">
                          <Phone className="h-3 w-3 text-muted-foreground" />{c.phone || "—"}
                        </td>
                        <td className="p-2">
                          {c.status === "converted" && (
                            <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30">
                              <ArrowRight className="h-2.5 w-2.5 mr-0.5" /> No CRM
                            </Badge>
                          )}
                          {c.status === "duplicated" && <Badge variant="secondary" className="text-[10px]">Duplicado</Badge>}
                          {c.status === "pending" && <Badge variant="outline" className="text-[10px]">Pendente</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
