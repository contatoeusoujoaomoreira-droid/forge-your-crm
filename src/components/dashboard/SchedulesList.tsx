import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Calendar, Copy, Pencil, Trash2, Eye, Clock, Users, ChevronLeft, ChevronRight, BarChart3, TrendingUp, Target } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Schedule {
  id: string; title: string; slug: string; description: string | null;
  duration: number; is_active: boolean; is_published: boolean;
  available_days: number[]; available_hours: { start: string; end: string };
  style: any; pipeline_id: string | null; stage_id: string | null;
  created_at: string; _appointmentCount?: number;
}

interface Appointment {
  id: string; guest_name: string; guest_email: string | null;
  guest_phone: string | null; date: string; time: string;
  status: string; notes: string | null; created_at: string;
}

const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type CalendarView = "month" | "week" | "day";

const SchedulesList = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [showAppointments, setShowAppointments] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [calendarView, setCalendarView] = useState<CalendarView>("month");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [stages, setStages] = useState<{ id: string; name: string; pipeline_id?: string | null }[]>([]);
  const [pipelines, setPipelines] = useState<{ id: string; name: string }[]>([]);
  const [manualBooking, setManualBooking] = useState(false);
  const [newBooking, setNewBooking] = useState({ guest_name: "", guest_email: "", guest_phone: "", date: "", time: "", schedule_id: "", notes: "" });
  const { toast } = useToast();

  const fetchSchedules = async () => {
    const { data } = await supabase.from("schedules").select("*").order("created_at", { ascending: false });
    if (!data) return;
    const { data: counts } = await supabase.from("appointments").select("schedule_id");
    const countMap: Record<string, number> = {};
    (counts || []).forEach((r: any) => { countMap[r.schedule_id] = (countMap[r.schedule_id] || 0) + 1; });
    setSchedules(data.map((s: any) => ({
      ...s, available_days: Array.isArray(s.available_days) ? s.available_days : [1, 2, 3, 4, 5],
      available_hours: typeof s.available_hours === "object" && s.available_hours ? s.available_hours : { start: "09:00", end: "18:00" },
      _appointmentCount: countMap[s.id] || 0,
    })));
  };

  const fetchAllAppointments = async () => {
    const { data } = await supabase.from("appointments").select("*").order("date", { ascending: true });
    setAllAppointments((data || []) as Appointment[]);
  };

  const fetchStages = async () => {
    if (!user) return;
    const { data } = await supabase.from("pipeline_stages").select("id, name, pipeline_id").eq("user_id", user.id).order("position");
    if (data) setStages(data as any);
    const { data: pipeData } = await supabase.from("pipelines").select("id, name").eq("user_id", user.id).order("created_at");
    if (pipeData) setPipelines(pipeData);
  };

  useEffect(() => { fetchSchedules(); fetchAllAppointments(); fetchStages(); }, [user]);

  const startNew = () => setEditing({
    id: "", title: "", slug: "", description: "", duration: 30,
    is_active: true, is_published: false, available_days: [1, 2, 3, 4, 5],
    available_hours: { start: "09:00", end: "18:00" },
    style: { bgColor: "#000000", textColor: "#ffffff", accentColor: "#84CC16" },
    pipeline_id: null, stage_id: null, created_at: "",
    buffer_minutes: 0, blocked_dates: [], timezone: "America/Sao_Paulo", allow_cancellation: false,
  } as any);

  const handleSave = async () => {
    if (!editing || !editing.title || !editing.slug) { toast({ title: "Preencha título e slug", variant: "destructive" }); return; }
    const payload = {
      title: editing.title, slug: editing.slug, description: editing.description,
      duration: editing.duration, is_active: editing.is_active, is_published: editing.is_published,
      available_days: editing.available_days as any, available_hours: editing.available_hours as any,
      style: editing.style as any, pipeline_id: editing.pipeline_id, stage_id: editing.stage_id,
      buffer_minutes: (editing as any).buffer_minutes || 0,
      blocked_dates: (editing as any).blocked_dates || [],
      timezone: (editing as any).timezone || "America/Sao_Paulo",
      allow_cancellation: (editing as any).allow_cancellation || false,
    };
    if (editing.id) { await supabase.from("schedules").update(payload).eq("id", editing.id); }
    else { await supabase.from("schedules").insert(payload); }
    toast({ title: "Agenda salva!" }); setEditing(null); fetchSchedules();
  };

  const handleDelete = async (id: string) => { await supabase.from("schedules").delete().eq("id", id); toast({ title: "Agenda excluída" }); fetchSchedules(); };
  const handleCopyLink = (slug: string) => { navigator.clipboard.writeText(`${window.location.origin}/agendar/${slug}`); toast({ title: "Link copiado!" }); };
  const fetchAppointments = async (scheduleId: string) => { setShowAppointments(scheduleId); const { data } = await supabase.from("appointments").select("*").eq("schedule_id", scheduleId).order("date", { ascending: false }); setAppointments((data || []) as Appointment[]); };
  const toggleDay = (day: number) => { if (!editing) return; const days = editing.available_days.includes(day) ? editing.available_days.filter(d => d !== day) : [...editing.available_days, day].sort(); setEditing({ ...editing, available_days: days }); };

  const handleManualBooking = async () => {
    if (!newBooking.guest_name || !newBooking.date || !newBooking.time || !newBooking.schedule_id) {
      toast({ title: "Preencha nome, data, horário e agenda", variant: "destructive" }); return;
    }
    await supabase.from("appointments").insert({
      schedule_id: newBooking.schedule_id,
      guest_name: newBooking.guest_name,
      guest_email: newBooking.guest_email || null,
      guest_phone: newBooking.guest_phone || null,
      date: newBooking.date,
      time: newBooking.time,
      notes: newBooking.notes || null,
      status: "confirmed",
    });
    toast({ title: "Agendamento criado!" });
    setNewBooking({ guest_name: "", guest_email: "", guest_phone: "", date: "", time: "", schedule_id: "", notes: "" });
    setManualBooking(false);
    fetchAllAppointments();
  };

  // Calendar helpers
  const getMonthDays = () => {
    const y = calendarDate.getFullYear(), m = calendarDate.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

  const getAppointmentsForDate = (dateStr: string) => allAppointments.filter(a => a.date === dateStr);

  const navigateCalendar = (dir: number) => {
    const d = new Date(calendarDate);
    if (calendarView === "month") d.setMonth(d.getMonth() + dir);
    else if (calendarView === "week") d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCalendarDate(d);
  };

  // Analytics
  if (showAnalytics) {
    const totalAppts = allAppointments.length;
    const confirmed = allAppointments.filter(a => a.status === "confirmed").length;
    // Group by day of week
    const dayCount: Record<string, number> = {};
    allAppointments.forEach(a => {
      const d = new Date(a.date).getDay();
      const name = dayNames[d];
      dayCount[name] = (dayCount[name] || 0) + 1;
    });
    const dayData = Object.entries(dayCount).map(([name, count]) => ({ name, agendamentos: count }));
    // Group by hour
    const hourCount: Record<string, number> = {};
    allAppointments.forEach(a => { hourCount[a.time] = (hourCount[a.time] || 0) + 1; });
    const hourData = Object.entries(hourCount).sort().slice(0, 10).map(([name, count]) => ({ name, agendamentos: count }));

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">📊 Analytics de Agendamentos</h2>
          <Button variant="ghost" size="sm" onClick={() => setShowAnalytics(false)}>← Voltar</Button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Agendas", value: schedules.length, icon: Calendar, color: "text-blue-400" },
            { label: "Total Agendamentos", value: totalAppts, icon: Users, color: "text-primary" },
            { label: "Confirmados", value: confirmed, icon: Target, color: "text-emerald-400" },
            { label: "Taxa Confirmação", value: totalAppts > 0 ? `${Math.round((confirmed / totalAppts) * 100)}%` : "0%", icon: TrendingUp, color: "text-purple-400" },
          ].map(m => (
            <Card key={m.label} className="surface-card border-border"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">{m.label}</p><p className="text-2xl font-bold text-foreground mt-1">{m.value}</p></div><m.icon className={`h-8 w-8 ${m.color} opacity-60`} /></div></CardContent></Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="surface-card border-border">
            <CardHeader><CardTitle className="text-sm">Agendamentos por Dia da Semana</CardTitle></CardHeader>
            <CardContent>
              {dayData.length > 0 ? <ResponsiveContainer width="100%" height={200}><BarChart data={dayData}><CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 12%)" /><XAxis dataKey="name" stroke="hsl(0 0% 45%)" fontSize={11} /><YAxis stroke="hsl(0 0% 45%)" fontSize={11} /><Tooltip contentStyle={{ background: "hsl(0 0% 4%)", border: "1px solid hsl(0 0% 12%)", borderRadius: 8 }} /><Bar dataKey="agendamentos" fill="hsl(84 81% 44%)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer> : <p className="text-muted-foreground text-sm text-center py-8">Sem dados</p>}
            </CardContent>
          </Card>
          <Card className="surface-card border-border">
            <CardHeader><CardTitle className="text-sm">Horários mais escolhidos</CardTitle></CardHeader>
            <CardContent>
              {hourData.length > 0 ? <ResponsiveContainer width="100%" height={200}><BarChart data={hourData}><CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 12%)" /><XAxis dataKey="name" stroke="hsl(0 0% 45%)" fontSize={11} /><YAxis stroke="hsl(0 0% 45%)" fontSize={11} /><Tooltip contentStyle={{ background: "hsl(0 0% 4%)", border: "1px solid hsl(0 0% 12%)", borderRadius: 8 }} /><Bar dataKey="agendamentos" fill="hsl(217 91% 60%)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer> : <p className="text-muted-foreground text-sm text-center py-8">Sem dados</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Calendar view
  if (showCalendar) {
    const monthDays = getMonthDays();
    const y = calendarDate.getFullYear(), m = calendarDate.getMonth();
    const monthLabel = calendarDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">📅 Calendário</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setManualBooking(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Novo Agendamento</Button>
            {(["month", "week", "day"] as CalendarView[]).map(v => (
              <Button key={v} variant={calendarView === v ? "default" : "outline"} size="sm" onClick={() => setCalendarView(v)} className="text-xs capitalize">{v === "month" ? "Mês" : v === "week" ? "Semana" : "Dia"}</Button>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setShowCalendar(false)}>← Voltar</Button>
          </div>
        </div>

        {/* Manual booking dialog */}
        {manualBooking && (
          <div className="surface-card rounded-lg p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">Novo Agendamento Manual</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[10px]">Nome *</Label><Input value={newBooking.guest_name} onChange={e => setNewBooking({ ...newBooking, guest_name: e.target.value })} className="h-8 text-xs bg-secondary/50 border-border mt-1" /></div>
              <div><Label className="text-[10px]">Agenda *</Label>
                <select value={newBooking.schedule_id} onChange={e => setNewBooking({ ...newBooking, schedule_id: e.target.value })} className="w-full h-8 text-xs bg-secondary border border-border rounded px-2 mt-1 text-foreground">
                  <option value="">Selecione...</option>
                  {schedules.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-[10px]">Data *</Label><Input type="date" value={newBooking.date} onChange={e => setNewBooking({ ...newBooking, date: e.target.value })} className="h-8 text-xs bg-secondary/50 border-border mt-1" /></div>
              <div><Label className="text-[10px]">Horário *</Label><Input type="time" value={newBooking.time} onChange={e => setNewBooking({ ...newBooking, time: e.target.value })} className="h-8 text-xs bg-secondary/50 border-border mt-1" /></div>
              <div><Label className="text-[10px]">Telefone</Label><Input value={newBooking.guest_phone} onChange={e => setNewBooking({ ...newBooking, guest_phone: e.target.value })} className="h-8 text-xs bg-secondary/50 border-border mt-1" /></div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleManualBooking}>Criar</Button>
              <Button variant="ghost" size="sm" onClick={() => setManualBooking(false)}>Cancelar</Button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigateCalendar(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <h3 className="text-sm font-semibold text-foreground capitalize">{monthLabel}</h3>
          <Button variant="ghost" size="sm" onClick={() => navigateCalendar(1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>

        {calendarView === "month" && (
          <div className="grid grid-cols-7 gap-1">
            {dayNames.map(d => <div key={d} className="text-center text-[10px] text-muted-foreground font-bold py-2">{d}</div>)}
            {monthDays.map((day, i) => {
              if (!day) return <div key={i} />;
              const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayAppts = getAppointmentsForDate(dateStr);
              const isToday = new Date().toISOString().split("T")[0] === dateStr;
              return (
                <div key={i} className={`min-h-[80px] rounded-lg p-1.5 text-xs border transition-colors ${isToday ? "border-primary/40 bg-primary/5" : "border-border/50 hover:border-border"}`}>
                  <p className={`font-medium mb-1 ${isToday ? "text-primary" : "text-foreground"}`}>{day}</p>
                  {dayAppts.slice(0, 3).map(a => (
                    <div key={a.id} className="text-[9px] bg-primary/10 text-primary px-1 py-0.5 rounded mb-0.5 truncate">{a.time} {a.guest_name}</div>
                  ))}
                  {dayAppts.length > 3 && <p className="text-[9px] text-muted-foreground">+{dayAppts.length - 3} mais</p>}
                </div>
              );
            })}
          </div>
        )}

        {calendarView === "week" && (() => {
          const startOfWeek = new Date(calendarDate);
          startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
          return (
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }, (_, i) => {
                const d = new Date(startOfWeek); d.setDate(d.getDate() + i);
                const dateStr = d.toISOString().split("T")[0];
                const appts = getAppointmentsForDate(dateStr);
                const isToday = new Date().toISOString().split("T")[0] === dateStr;
                return (
                  <div key={i} className={`rounded-lg p-2 border min-h-[200px] ${isToday ? "border-primary/40 bg-primary/5" : "border-border/50"}`}>
                    <p className={`text-xs font-semibold mb-2 ${isToday ? "text-primary" : "text-foreground"}`}>{dayNames[i]} {d.getDate()}</p>
                    {appts.map(a => (
                      <div key={a.id} className="text-xs bg-primary/10 text-primary px-2 py-1.5 rounded mb-1">
                        <p className="font-medium">{a.time}</p><p className="text-[10px] opacity-80">{a.guest_name}</p>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {calendarView === "day" && (() => {
          const dateStr = calendarDate.toISOString().split("T")[0];
          const appts = getAppointmentsForDate(dateStr);
          return (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">{calendarDate.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</p>
              {appts.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">Nenhum agendamento</p> : appts.map(a => (
                <div key={a.id} className="surface-card rounded-lg p-4 flex items-center gap-4">
                  <div className="text-center"><p className="text-lg font-bold text-primary">{a.time}</p></div>
                  <div><p className="text-sm font-medium text-foreground">{a.guest_name}</p>{a.guest_email && <p className="text-xs text-muted-foreground">{a.guest_email}</p>}{a.guest_phone && <p className="text-xs text-muted-foreground">{a.guest_phone}</p>}</div>
                  <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full ${a.status === "confirmed" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>{a.status}</span>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    );
  }

  // Appointments view
  if (showAppointments) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between"><h2 className="text-xl font-bold text-foreground">Agendamentos</h2><Button variant="ghost" size="sm" onClick={() => setShowAppointments(null)}>← Voltar</Button></div>
        {appointments.length === 0 ? <div className="surface-card rounded-lg p-8 text-center"><p className="text-muted-foreground">Nenhum agendamento</p></div> : (
          <div className="space-y-3">{appointments.map(a => (
            <div key={a.id} className="surface-card rounded-lg p-4">
              <div className="flex items-center justify-between mb-2"><p className="font-medium text-foreground text-sm">{a.guest_name}</p><span className={`text-[10px] px-2 py-0.5 rounded-full ${a.status === "confirmed" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>{a.status}</span></div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(a.date).toLocaleDateString("pt-BR")}</span><span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {a.time}</span></div>
              {(a.guest_email || a.guest_phone) && <p className="text-xs text-muted-foreground mt-1">{a.guest_email} {a.guest_phone && `• ${a.guest_phone}`}</p>}
            </div>
          ))}</div>
        )}
      </div>
    );
  }

  // Editor
  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between"><h2 className="text-xl font-bold text-foreground">{editing.id ? "Editar" : "Nova"} Agenda</h2><div className="flex gap-2"><Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancelar</Button><Button size="sm" onClick={handleSave}>Salvar</Button></div></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label className="text-xs text-muted-foreground">Título</Label><Input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} className="mt-1 bg-secondary/50 border-border" /></div>
          <div><Label className="text-xs text-muted-foreground">Slug</Label><Input value={editing.slug} onChange={e => setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} className="mt-1 bg-secondary/50 border-border" /><p className="text-[10px] text-muted-foreground mt-1">/agendar/{editing.slug || "..."}</p></div>
        </div>
        <div><Label className="text-xs text-muted-foreground">Descrição</Label><Textarea value={editing.description || ""} onChange={e => setEditing({ ...editing, description: e.target.value })} className="mt-1 bg-secondary/50 border-border" rows={2} /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label className="text-xs text-muted-foreground">Duração (min)</Label><Input type="number" value={editing.duration} onChange={e => setEditing({ ...editing, duration: parseInt(e.target.value) || 30 })} className="mt-1 bg-secondary/50 border-border" /></div>
          <div className="flex items-center gap-4 mt-6">
            <label className="flex items-center gap-2 text-xs"><Switch checked={editing.is_active} onCheckedChange={v => setEditing({ ...editing, is_active: v })} /> Ativo</label>
            <label className="flex items-center gap-2 text-xs"><Switch checked={editing.is_published} onCheckedChange={v => setEditing({ ...editing, is_published: v })} /> Publicado</label>
          </div>
        </div>
        <div className="surface-card rounded-lg p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">📅 Dias Disponíveis</p>
          <div className="flex gap-2">{dayNames.map((name, idx) => (<button key={idx} onClick={() => toggleDay(idx)} className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${editing.available_days.includes(idx) ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{name}</button>))}</div>
        </div>
        <div className="surface-card rounded-lg p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">🕐 Horário</p>
          <div className="grid grid-cols-2 gap-4">
            <div><Label className="text-[10px]">Início</Label><Input type="time" value={editing.available_hours.start} onChange={e => setEditing({ ...editing, available_hours: { ...editing.available_hours, start: e.target.value } })} className="mt-1 bg-secondary/50 border-border" /></div>
            <div><Label className="text-[10px]">Fim</Label><Input type="time" value={editing.available_hours.end} onChange={e => setEditing({ ...editing, available_hours: { ...editing.available_hours, end: e.target.value } })} className="mt-1 bg-secondary/50 border-border" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label className="text-[10px]">Buffer entre agendamentos (min)</Label><Input type="number" value={(editing as any).buffer_minutes || 0} onChange={e => setEditing({ ...editing, buffer_minutes: parseInt(e.target.value) || 0 } as any)} className="mt-1 bg-secondary/50 border-border" /></div>
            <div><Label className="text-[10px]">Timezone</Label>
              <select value={(editing as any).timezone || "America/Sao_Paulo"} onChange={e => setEditing({ ...editing, timezone: e.target.value } as any)} className="w-full h-9 text-xs bg-secondary border border-border rounded px-2 mt-1 text-foreground">
                <option value="America/Sao_Paulo">São Paulo (BRT)</option>
                <option value="America/Fortaleza">Fortaleza (BRT)</option>
                <option value="America/Manaus">Manaus (AMT)</option>
                <option value="America/Cuiaba">Cuiabá (AMT)</option>
                <option value="America/New_York">New York (EST)</option>
                <option value="Europe/Lisbon">Lisboa (WET)</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs"><Switch checked={(editing as any).allow_cancellation || false} onCheckedChange={v => setEditing({ ...editing, allow_cancellation: v } as any)} /> Permitir cancelamento pelo convidado</label>
          <div>
            <Label className="text-[10px]">Datas bloqueadas (uma por linha, formato YYYY-MM-DD)</Label>
            <textarea value={((editing as any).blocked_dates || []).join("\n")} onChange={e => setEditing({ ...editing, blocked_dates: e.target.value.split("\n").map((d: string) => d.trim()).filter(Boolean) } as any)} className="w-full text-xs bg-secondary/50 border border-border rounded px-2 py-1 text-foreground mt-1" rows={3} placeholder="2025-12-25&#10;2025-01-01" />
          </div>
        </div>

        {/* Lembrete Anti-Falta */}
        <div className="surface-card rounded-lg p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">🔔 Lembrete Anti-Falta (Para o Lead)</p>
          <label className="flex items-center gap-2 text-xs">
            <Switch checked={(editing as any).reminder_enabled || false} onCheckedChange={v => setEditing({ ...editing, reminder_enabled: v } as any)} />
            Enviar lembrete automático via WhatsApp
          </label>
          {(editing as any).reminder_enabled && (
            <>
              <div>
                <Label className="text-[10px]">Tempo de antecedência (minutos)</Label>
                <Input type="number" value={(editing as any).reminder_minutes_before || 120}
                  onChange={e => setEditing({ ...editing, reminder_minutes_before: parseInt(e.target.value) || 120 } as any)}
                  className="mt-1 bg-secondary/50 border-border h-8 text-xs" />
                <p className="text-[10px] text-muted-foreground mt-1">Ex: 120 = 2 horas antes do agendamento</p>
              </div>
              <div>
                <Label className="text-[10px]">Mensagem de lembrete (variáveis: {"{nome}"}, {"{data}"}, {"{hora}"}, {"{servico}"})</Label>
                <textarea value={(editing as any).reminder_message || "Olá {nome}! 👋 Lembrando que você tem um agendamento hoje às {hora}. Nos vemos em breve!"}
                  onChange={e => setEditing({ ...editing, reminder_message: e.target.value } as any)}
                  className="w-full text-xs bg-secondary/50 border border-border rounded px-2 py-1 text-foreground mt-1" rows={3}
                  placeholder="Olá {nome}! 👋 Lembrando que você tem um agendamento hoje às {hora}. Nos vemos em breve!" />
              </div>
            </>
          )}
        </div>
        {(pipelines.length > 0 || stages.length > 0) && (
          <div className="surface-card rounded-lg p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">🔗 Integração CRM</p>
            {pipelines.length > 0 && (
              <div><Label className="text-[10px]">Pipeline de destino</Label>
                <select value={editing.pipeline_id || ""} onChange={e => {
                  const pid = e.target.value || null;
                  setEditing({ ...editing, pipeline_id: pid, stage_id: null });
                }} className="w-full h-8 text-xs bg-secondary border border-border rounded px-2 mt-1 text-foreground">
                  <option value="">Nenhum</option>{pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
            <div><Label className="text-[10px]">Etapa inicial do lead</Label>
              <select value={editing.stage_id || ""} onChange={e => setEditing({ ...editing, stage_id: e.target.value || null })} className="w-full h-8 text-xs bg-secondary border border-border rounded px-2 mt-1 text-foreground">
                <option value="">Nenhuma</option>
                {stages.filter(s => !editing.pipeline_id || s.pipeline_id === editing.pipeline_id).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        )}
        <div className="surface-card rounded-lg p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">📱 WhatsApp (Pós-agendamento)</p>
          <div><Label className="text-[10px]">Número WhatsApp (com DDI)</Label>
            <Input value={editing.style?.whatsapp_number || ""} onChange={e => setEditing({ ...editing, style: { ...editing.style, whatsapp_number: e.target.value } })} placeholder="5511999999999" className="mt-1 bg-secondary/50 border-border h-8 text-xs" />
          </div>
          <div><Label className="text-[10px]">Mensagem personalizada (variáveis: {"{nome}"}, {"{data}"}, {"{hora}"}, {"{servico}"}, {"{duracao}"})</Label>
            <textarea value={editing.style?.whatsapp_message || ""} onChange={e => setEditing({ ...editing, style: { ...editing.style, whatsapp_message: e.target.value } })} placeholder="Olá! Acabei de agendar:\n👤 {nome}\n📅 {data}\n🕐 {hora}" className="w-full text-xs bg-secondary/50 border border-border rounded px-2 py-1 text-foreground mt-1" rows={4} />
          </div>
        </div>
        <div className="surface-card rounded-lg p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">🎨 Estilo</p>
          <div className="grid grid-cols-3 gap-3">{[{ key: "bgColor", label: "Fundo" }, { key: "textColor", label: "Texto" }, { key: "accentColor", label: "Destaque" }].map(c => (
            <div key={c.key} className="flex items-center gap-2"><input type="color" value={editing.style[c.key] || "#000"} onChange={e => setEditing({ ...editing, style: { ...editing.style, [c.key]: e.target.value } })} className="h-8 w-8 rounded border border-border cursor-pointer" /><p className="text-[10px] text-muted-foreground">{c.label}</p></div>
          ))}</div>
        </div>
      </div>
    );
  }

  // List
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Agenda</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAnalytics(true)}><BarChart3 className="h-4 w-4 mr-1" /> Analytics</Button>
          <Button variant="outline" size="sm" onClick={() => setShowCalendar(true)}><Calendar className="h-4 w-4 mr-1" /> Calendário</Button>
          <Button size="sm" onClick={startNew}><Plus className="h-4 w-4 mr-1" /> Nova Agenda</Button>
        </div>
      </div>
      {schedules.length === 0 ? (
        <div className="surface-card rounded-lg p-8 text-center space-y-3">
          <Calendar className="h-10 w-10 text-muted-foreground mx-auto" /><p className="text-muted-foreground">Nenhuma agenda criada</p><Button size="sm" onClick={startNew}>Criar Primeira Agenda</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {schedules.map(schedule => (
            <div key={schedule.id} className="surface-card rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between"><h3 className="font-semibold text-foreground text-sm">{schedule.title}</h3><span className={`text-[10px] px-2 py-0.5 rounded-full ${schedule.is_published ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>{schedule.is_published ? "Publicado" : "Rascunho"}</span></div>
              {schedule.description && <p className="text-xs text-muted-foreground line-clamp-2">{schedule.description}</p>}
              <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {schedule.duration}min</span><span className="flex items-center gap-1"><Users className="h-3 w-3" /> {schedule._appointmentCount} agendamentos</span></div>
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
