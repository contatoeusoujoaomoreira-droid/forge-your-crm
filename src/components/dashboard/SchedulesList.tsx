import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Calendar, Copy, Pencil, Trash2, Eye, Clock, Users } from "lucide-react";

interface Schedule {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  duration: number;
  is_active: boolean;
  is_published: boolean;
  available_days: number[];
  available_hours: { start: string; end: string };
  style: any;
  pipeline_id: string | null;
  stage_id: string | null;
  created_at: string;
  _appointmentCount?: number;
}

interface Appointment {
  id: string;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  date: string;
  time: string;
  status: string;
  notes: string | null;
  created_at: string;
}

const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const SchedulesList = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [showAppointments, setShowAppointments] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const { toast } = useToast();

  const fetchSchedules = async () => {
    const { data } = await supabase.from("schedules").select("*").order("created_at", { ascending: false });
    if (!data) return;
    const { data: counts } = await supabase.from("appointments").select("schedule_id");
    const countMap: Record<string, number> = {};
    (counts || []).forEach((r: any) => { countMap[r.schedule_id] = (countMap[r.schedule_id] || 0) + 1; });
    setSchedules(data.map((s: any) => ({
      ...s,
      available_days: Array.isArray(s.available_days) ? s.available_days : [1, 2, 3, 4, 5],
      available_hours: typeof s.available_hours === "object" && s.available_hours ? s.available_hours : { start: "09:00", end: "18:00" },
      _appointmentCount: countMap[s.id] || 0,
    })));
  };

  useEffect(() => { fetchSchedules(); }, []);

  const startNew = () => setEditing({
    id: "", title: "", slug: "", description: "", duration: 30,
    is_active: true, is_published: false,
    available_days: [1, 2, 3, 4, 5],
    available_hours: { start: "09:00", end: "18:00" },
    style: { bgColor: "#000000", textColor: "#ffffff", accentColor: "#84CC16" },
    pipeline_id: null, stage_id: null, created_at: "",
  });

  const handleSave = async () => {
    if (!editing || !editing.title || !editing.slug) {
      toast({ title: "Preencha título e slug", variant: "destructive" }); return;
    }
    const payload = {
      title: editing.title, slug: editing.slug, description: editing.description,
      duration: editing.duration, is_active: editing.is_active, is_published: editing.is_published,
      available_days: editing.available_days as any,
      available_hours: editing.available_hours as any,
      style: editing.style as any,
      pipeline_id: editing.pipeline_id, stage_id: editing.stage_id,
    };
    if (editing.id) {
      const { error } = await supabase.from("schedules").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Erro ao salvar", variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("schedules").insert(payload);
      if (error) { toast({ title: error.message, variant: "destructive" }); return; }
    }
    toast({ title: "Agenda salva!" });
    setEditing(null);
    fetchSchedules();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("schedules").delete().eq("id", id);
    toast({ title: "Agenda excluída" });
    fetchSchedules();
  };

  const handleCopyLink = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/agendar/${slug}`);
    toast({ title: "Link copiado!" });
  };

  const fetchAppointments = async (scheduleId: string) => {
    setShowAppointments(scheduleId);
    const { data } = await supabase.from("appointments").select("*").eq("schedule_id", scheduleId).order("date", { ascending: false });
    setAppointments((data || []) as Appointment[]);
  };

  const toggleDay = (day: number) => {
    if (!editing) return;
    const days = editing.available_days.includes(day)
      ? editing.available_days.filter(d => d !== day)
      : [...editing.available_days, day].sort();
    setEditing({ ...editing, available_days: days });
  };

  // Appointments view
  if (showAppointments) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Agendamentos</h2>
          <Button variant="ghost" size="sm" onClick={() => setShowAppointments(null)}>← Voltar</Button>
        </div>
        {appointments.length === 0 ? (
          <div className="surface-card rounded-lg p-8 text-center">
            <p className="text-muted-foreground">Nenhum agendamento</p>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((a) => (
              <div key={a.id} className="surface-card rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-foreground text-sm">{a.guest_name}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${a.status === "confirmed" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {a.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(a.date).toLocaleDateString("pt-BR")}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {a.time}</span>
                </div>
                {(a.guest_email || a.guest_phone) && (
                  <p className="text-xs text-muted-foreground mt-1">{a.guest_email} {a.guest_phone && `• ${a.guest_phone}`}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Editor view
  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">{editing.id ? "Editar" : "Nova"} Agenda</h2>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button size="sm" onClick={handleSave}>Salvar</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Título</Label>
            <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="mt-1 bg-secondary/50 border-border" placeholder="Consultoria 30min" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Slug (URL)</Label>
            <Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} className="mt-1 bg-secondary/50 border-border" />
            <p className="text-[10px] text-muted-foreground mt-1">/agendar/{editing.slug || "..."}</p>
          </div>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Descrição</Label>
          <Textarea value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="mt-1 bg-secondary/50 border-border" rows={2} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Duração (minutos)</Label>
            <Input type="number" value={editing.duration} onChange={(e) => setEditing({ ...editing, duration: parseInt(e.target.value) || 30 })} className="mt-1 bg-secondary/50 border-border" />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
              <Label className="text-xs text-muted-foreground">Ativo</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editing.is_published} onCheckedChange={(v) => setEditing({ ...editing, is_published: v })} />
              <Label className="text-xs text-muted-foreground">Publicado</Label>
            </div>
          </div>
        </div>

        {/* Available Days */}
        <div className="surface-card rounded-lg p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">📅 Dias Disponíveis</p>
          <div className="flex gap-2">
            {dayNames.map((name, idx) => (
              <button
                key={idx}
                onClick={() => toggleDay(idx)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  editing.available_days.includes(idx)
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Available Hours */}
        <div className="surface-card rounded-lg p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">🕐 Horário</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[10px]">Início</Label>
              <Input type="time" value={editing.available_hours.start} onChange={(e) => setEditing({ ...editing, available_hours: { ...editing.available_hours, start: e.target.value } })} className="mt-1 bg-secondary/50 border-border" />
            </div>
            <div>
              <Label className="text-[10px]">Fim</Label>
              <Input type="time" value={editing.available_hours.end} onChange={(e) => setEditing({ ...editing, available_hours: { ...editing.available_hours, end: e.target.value } })} className="mt-1 bg-secondary/50 border-border" />
            </div>
          </div>
        </div>

        {/* Style */}
        <div className="surface-card rounded-lg p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">🎨 Estilo</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: "bgColor", label: "Fundo" },
              { key: "textColor", label: "Texto" },
              { key: "accentColor", label: "Destaque" },
            ].map((c) => (
              <div key={c.key} className="flex items-center gap-2">
                <input type="color" value={editing.style[c.key] || "#000000"} onChange={(e) => setEditing({ ...editing, style: { ...editing.style, [c.key]: e.target.value } })} className="h-8 w-8 rounded border border-border cursor-pointer" />
                <p className="text-[10px] text-muted-foreground">{c.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Agenda</h2>
        <Button size="sm" onClick={startNew}><Plus className="h-4 w-4 mr-1" /> Nova Agenda</Button>
      </div>

      {schedules.length === 0 ? (
        <div className="surface-card rounded-lg p-8 text-center space-y-3">
          <Calendar className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Nenhuma agenda criada</p>
          <Button size="sm" onClick={startNew}>Criar Primeira Agenda</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {schedules.map((schedule) => (
            <div key={schedule.id} className="surface-card rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground text-sm">{schedule.title}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${schedule.is_active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {schedule.is_active ? "Ativo" : "Inativo"}
                </span>
              </div>
              {schedule.description && <p className="text-xs text-muted-foreground line-clamp-2">{schedule.description}</p>}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {schedule.duration}min</span>
                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {schedule._appointmentCount} agendamentos</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setEditing({ ...schedule })}><Pencil className="h-3 w-3" /></Button>
                <Button variant="ghost" size="sm" onClick={() => handleCopyLink(schedule.slug)}><Copy className="h-3 w-3" /></Button>
                <Button variant="ghost" size="sm" onClick={() => fetchAppointments(schedule.id)}><Eye className="h-3 w-3" /></Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(schedule.id)} className="text-destructive"><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SchedulesList;
