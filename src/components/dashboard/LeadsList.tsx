import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Search, Trash2, Pencil } from "lucide-react";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  value: number;
  status: string;
  source: string | null;
  created_at: string;
}

const statusLabels: Record<string, string> = {
  new: "Novo",
  contacted: "Contatado",
  qualified: "Qualificado",
  proposal: "Proposta",
  won: "Ganho",
  lost: "Perdido",
};

const statusColors: Record<string, string> = {
  new: "bg-blue-500/20 text-blue-400",
  contacted: "bg-yellow-500/20 text-yellow-400",
  qualified: "bg-purple-500/20 text-purple-400",
  proposal: "bg-orange-500/20 text-orange-400",
  won: "bg-lime/20 text-lime",
  lost: "bg-destructive/20 text-destructive",
};

const LeadsList = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", value: "", source: "" });
  const [editId, setEditId] = useState<string | null>(null);

  const fetchLeads = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setLeads(data);
    setLoading(false);
  };

  useEffect(() => { fetchLeads(); }, [user]);

  const handleSave = async () => {
    if (!user || !form.name) return;

    const payload = {
      user_id: user.id,
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      company: form.company || null,
      value: parseFloat(form.value) || 0,
      source: form.source || null,
    };

    const { error } = editId
      ? await supabase.from("leads").update(payload).eq("id", editId)
      : await supabase.from("leads").insert(payload);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editId ? "Lead atualizado!" : "Lead adicionado!" });
      resetForm();
      fetchLeads();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (!error) {
      setLeads((prev) => prev.filter((l) => l.id !== id));
      toast({ title: "Lead removido" });
    }
  };

  const handleEdit = (lead: Lead) => {
    setEditId(lead.id);
    setForm({
      name: lead.name,
      email: lead.email || "",
      phone: lead.phone || "",
      company: lead.company || "",
      value: String(lead.value || ""),
      source: lead.source || "",
    });
    setAddOpen(true);
  };

  const resetForm = () => {
    setForm({ name: "", email: "", phone: "", company: "", value: "", source: "" });
    setEditId(null);
    setAddOpen(false);
  };

  const filtered = leads.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.email?.toLowerCase().includes(search.toLowerCase()) ||
      l.company?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="text-muted-foreground">Carregando leads...</div>;

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-secondary/50 border-border"
          />
        </div>
        <Dialog open={addOpen} onOpenChange={(o) => { if (!o) resetForm(); else setAddOpen(true); }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-lime text-primary-foreground hover:opacity-90">
              <Plus className="mr-2 h-4 w-4" /> Novo Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>{editId ? "Editar Lead" : "Novo Lead"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <Label>Nome *</Label>
                <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="mt-1 bg-secondary/50 border-border" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>E-mail</Label><Input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className="mt-1 bg-secondary/50 border-border" /></div>
                <div><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} className="mt-1 bg-secondary/50 border-border" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Empresa</Label><Input value={form.company} onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))} className="mt-1 bg-secondary/50 border-border" /></div>
                <div><Label>Valor (R$)</Label><Input type="number" value={form.value} onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))} className="mt-1 bg-secondary/50 border-border" /></div>
              </div>
              <div>
                <Label>Origem</Label>
                <Input value={form.source} onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))} placeholder="Google, Indicação..." className="mt-1 bg-secondary/50 border-border" />
              </div>
              <Button onClick={handleSave} className="w-full bg-gradient-lime text-primary-foreground hover:opacity-90">
                {editId ? "Salvar" : "Adicionar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <div className="surface-card rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead>Nome</TableHead>
              <TableHead className="hidden md:table-cell">E-mail</TableHead>
              <TableHead className="hidden md:table-cell">Empresa</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead className="hidden sm:table-cell">Status</TableHead>
              <TableHead className="w-20">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                  {search ? "Nenhum lead encontrado" : "Nenhum lead ainda. Clique em \"Novo Lead\" para começar."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((lead) => (
                <TableRow key={lead.id} className="border-border">
                  <TableCell className="font-medium text-foreground">{lead.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{lead.email || "—"}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{lead.company || "—"}</TableCell>
                  <TableCell className="text-lime font-medium">
                    {lead.value ? `R$ ${lead.value.toLocaleString("pt-BR")}` : "—"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[lead.status] || ""}`}>
                      {statusLabels[lead.status] || lead.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => handleEdit(lead)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(lead.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default LeadsList;
