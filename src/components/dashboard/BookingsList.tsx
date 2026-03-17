import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Calendar, Clock, User, Trash2, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Booking {
  id: string;
  title: string;
  description: string | null;
  date: string;
  duration: number;
  status: string;
  guest_name: string | null;
  guest_email: string | null;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-yellow-500/20 text-yellow-400" },
  confirmed: { label: "Confirmada", color: "bg-lime/20 text-lime" },
  cancelled: { label: "Cancelada", color: "bg-destructive/20 text-destructive" },
  completed: { label: "Concluída", color: "bg-blue-500/20 text-blue-400" },
};

const BookingsList = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", date: "", duration: "30", guest_name: "", guest_email: "" });

  const fetchBookings = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: true });
    if (data) setBookings(data);
    setLoading(false);
  };

  useEffect(() => { fetchBookings(); }, [user]);

  const handleAdd = async () => {
    if (!user || !form.title || !form.date) return;
    const { error } = await supabase.from("bookings").insert({
      user_id: user.id,
      title: form.title,
      description: form.description || null,
      date: new Date(form.date).toISOString(),
      duration: parseInt(form.duration) || 30,
      guest_name: form.guest_name || null,
      guest_email: form.guest_email || null,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Reserva criada!" });
      setForm({ title: "", description: "", date: "", duration: "30", guest_name: "", guest_email: "" });
      setAddOpen(false);
      fetchBookings();
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("bookings").update({ status }).eq("id", id);
    fetchBookings();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("bookings").delete().eq("id", id);
    setBookings((p) => p.filter((b) => b.id !== id));
    toast({ title: "Reserva removida" });
  };

  if (loading) return <div className="text-muted-foreground">Carregando reservas...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-muted-foreground">{bookings.length} reserva(s)</p>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-lime text-primary-foreground hover:opacity-90">
              <Plus className="mr-2 h-4 w-4" /> Nova Reserva
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Nova Reserva</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <div><Label>Título *</Label><Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className="mt-1 bg-secondary/50 border-border" /></div>
              <div><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="mt-1 bg-secondary/50 border-border" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Data/Hora *</Label><Input type="datetime-local" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} className="mt-1 bg-secondary/50 border-border" /></div>
                <div><Label>Duração (min)</Label><Input type="number" value={form.duration} onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))} className="mt-1 bg-secondary/50 border-border" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Nome do convidado</Label><Input value={form.guest_name} onChange={(e) => setForm((p) => ({ ...p, guest_name: e.target.value }))} className="mt-1 bg-secondary/50 border-border" /></div>
                <div><Label>E-mail do convidado</Label><Input value={form.guest_email} onChange={(e) => setForm((p) => ({ ...p, guest_email: e.target.value }))} className="mt-1 bg-secondary/50 border-border" /></div>
              </div>
              <Button onClick={handleAdd} className="w-full bg-gradient-lime text-primary-foreground hover:opacity-90">Criar Reserva</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>Nenhuma reserva ainda.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {bookings.map((b) => {
            const sc = statusConfig[b.status] || statusConfig.pending;
            return (
              <Card key={b.id} className="surface-card border-border">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium text-foreground truncate">{b.title}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${sc.color}`}>{sc.label}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(b.date), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {b.duration}min
                      </span>
                      {b.guest_name && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" /> {b.guest_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0 ml-3">
                    {b.status === "pending" && (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-lime" onClick={() => updateStatus(b.id, "confirmed")}>
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => updateStatus(b.id, "cancelled")}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(b.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BookingsList;
