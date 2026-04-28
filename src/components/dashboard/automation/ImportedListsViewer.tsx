import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ListChecks, Trash2, RefreshCcw, Phone, ArrowRight } from "lucide-react";

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

  const loadLists = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("imported_lists")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setLists((data as any) || []);
  };

  useEffect(() => { loadLists(); }, [user]);

  const openList = async (id: string) => {
    setActiveList(id);
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
      }).select("id").single();
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
                    <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30">{l.total_converted} convertidos</Badge>
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
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{active.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {active.total_contacts} contatos • {active.total_converted} convertidos em leads
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => reconvertPending(active.id)}>
                  <RefreshCcw className="h-3.5 w-3.5 mr-1" /> Converter pendentes
                </Button>
              </div>
              {loading && <div className="text-xs text-muted-foreground">Carregando…</div>}
              <div className="max-h-[420px] overflow-auto rounded border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-secondary/40 sticky top-0">
                    <tr>
                      <th className="text-left p-2">Nome</th>
                      <th className="text-left p-2">Telefone</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map((c) => (
                      <tr key={c.id} className="border-t border-border/50">
                        <td className="p-2">{c.name || "—"}</td>
                        <td className="p-2 font-mono flex items-center gap-1">
                          <Phone className="h-3 w-3 text-muted-foreground" />{c.phone || "—"}
                        </td>
                        <td className="p-2">
                          {c.status === "converted" && (
                            <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30">
                              <ArrowRight className="h-2.5 w-2.5 mr-0.5" /> Lead
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
