import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, XCircle } from "lucide-react";

const SchedulePublic = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const cancelToken = searchParams.get("cancel");
  
  const [schedule, setSchedule] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [existingAppointments, setExistingAppointments] = useState<any[]>([]);

  useEffect(() => {
    // Handle cancellation
    if (cancelToken) {
      const cancelAppointment = async () => {
        const { data } = await supabase.from("appointments").select("*").eq("cancellation_token", cancelToken).maybeSingle();
        if (data && !data.cancelled_at) {
          await supabase.from("appointments").update({ cancelled_at: new Date().toISOString(), status: "cancelled" } as any).eq("id", data.id);
          setCancelled(true);
        }
        setLoading(false);
      };
      cancelAppointment();
      return;
    }

    const fetchSchedule = async () => {
      const { data } = await supabase.from("schedules").select("*").eq("slug", slug).eq("is_active", true).eq("is_published", true).maybeSingle();
      if (data) {
        setSchedule(data);
        const { data: appts } = await supabase.from("appointments").select("date, time").eq("schedule_id", data.id).is("cancelled_at", null);
        setExistingAppointments(appts || []);
      }
      setLoading(false);
    };
    fetchSchedule();
  }, [slug, cancelToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedule || !selectedDate || !selectedTime || !guestName) return;
    
    const cancellationToken = schedule.allow_cancellation ? crypto.randomUUID() : null;
    
    await supabase.from("appointments").insert({
      schedule_id: schedule.id, guest_name: guestName, guest_email: guestEmail || null,
      guest_phone: guestPhone || null, date: selectedDate, time: selectedTime,
      cancellation_token: cancellationToken,
    } as any);

    // Create lead if CRM integration configured
    if (schedule.stage_id) {
      await supabase.from("leads").insert({
        name: guestName, email: guestEmail || null, phone: guestPhone || null,
        source: `agenda:${slug}`, status: "new", stage_id: schedule.stage_id,
        user_id: schedule.user_id,
      } as any);
    }

    setSubmitted(true);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-black text-white"><div className="h-8 w-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" /></div>;
  
  if (cancelled) return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="text-center space-y-4 p-8">
        <XCircle className="h-12 w-12 text-destructive mx-auto" />
        <h2 className="text-2xl font-bold">Agendamento Cancelado</h2>
        <p className="text-sm opacity-70">Seu agendamento foi cancelado com sucesso.</p>
      </div>
    </div>
  );

  if (!schedule) return <div className="min-h-screen flex items-center justify-center bg-black text-white"><p>Agenda não encontrada</p></div>;

  const style = schedule.style || {};
  const hours = schedule.available_hours || { start: "09:00", end: "18:00" };
  const availDays = Array.isArray(schedule.available_days) ? schedule.available_days : [1, 2, 3, 4, 5];
  const bufferMinutes = schedule.buffer_minutes || 0;
  const blockedDates: string[] = Array.isArray(schedule.blocked_dates) ? schedule.blocked_dates : [];

  const generateTimeSlots = () => {
    const slots: string[] = [];
    const [startH, startM] = hours.start.split(":").map(Number);
    const [endH, endM] = hours.end.split(":").map(Number);
    let current = startH * 60 + startM;
    const end = endH * 60 + endM;
    while (current + schedule.duration <= end) {
      const h = Math.floor(current / 60).toString().padStart(2, "0");
      const m = (current % 60).toString().padStart(2, "0");
      slots.push(`${h}:${m}`);
      current += schedule.duration + bufferMinutes;
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();
  const bookedTimes = existingAppointments.filter(a => a.date === selectedDate).map(a => a.time);

  const generateDates = () => {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      if (availDays.includes(d.getDay()) && !blockedDates.includes(dateStr)) {
        dates.push(dateStr);
      }
    }
    return dates;
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: style.bgColor || "#000", color: style.textColor || "#fff" }}>
        <div className="text-center space-y-4 p-8">
          <div className="text-5xl">✅</div>
          <h2 className="text-2xl font-bold">Agendamento Confirmado!</h2>
          <p className="text-sm opacity-70">{selectedDate} às {selectedTime}</p>
          {schedule.timezone && <p className="text-xs opacity-50">Fuso: {schedule.timezone}</p>}
        </div>
      </div>
    );
  }

  const dates = generateDates();

  return (
    <div className="min-h-screen p-4 flex items-center justify-center" style={{ background: style.bgColor || "#000", color: style.textColor || "#fff", fontFamily: "Inter" }}>
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">{schedule.title}</h1>
          {schedule.description && <p className="text-sm opacity-70">{schedule.description}</p>}
          <div className="flex items-center justify-center gap-4 text-xs opacity-50">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {schedule.duration} min</span>
            {schedule.timezone && <span>{schedule.timezone}</span>}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm font-medium flex items-center gap-2 mb-3"><Calendar className="h-4 w-4" /> Escolha uma data</label>
            <div className="grid grid-cols-4 gap-2">
              {dates.slice(0, 12).map(date => {
                const d = new Date(date + "T12:00:00");
                const dayName = d.toLocaleDateString("pt-BR", { weekday: "short" });
                const dayNum = d.getDate();
                const month = d.toLocaleDateString("pt-BR", { month: "short" });
                return (
                  <button key={date} type="button" onClick={() => { setSelectedDate(date); setSelectedTime(""); }}
                    className={`p-3 rounded-lg text-center text-xs border transition-all ${selectedDate === date ? "border-2" : "border-white/10 bg-white/5 hover:border-white/20"}`}
                    style={selectedDate === date ? { borderColor: style.accentColor || "#84CC16", background: `${style.accentColor || "#84CC16"}20` } : {}}>
                    <p className="opacity-60">{dayName}</p>
                    <p className="text-lg font-bold">{dayNum}</p>
                    <p className="opacity-60">{month}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedDate && (
            <div>
              <label className="text-sm font-medium flex items-center gap-2 mb-3"><Clock className="h-4 w-4" /> Horário</label>
              <div className="grid grid-cols-4 gap-2">
                {timeSlots.map(time => {
                  const booked = bookedTimes.includes(time);
                  return (
                    <button key={time} type="button" onClick={() => !booked && setSelectedTime(time)} disabled={booked}
                      className={`py-2.5 rounded-lg text-sm font-medium border transition-all ${booked ? "opacity-30 cursor-not-allowed border-white/5" : selectedTime === time ? "border-2" : "border-white/10 bg-white/5 hover:border-white/20"}`}
                      style={selectedTime === time ? { borderColor: style.accentColor || "#84CC16", background: `${style.accentColor || "#84CC16"}20` } : {}}>
                      {time}
                    </button>
                  );
                })}
              </div>
              {bufferMinutes > 0 && <p className="text-[10px] opacity-40 mt-2">Intervalo de {bufferMinutes}min entre agendamentos</p>}
            </div>
          )}

          {selectedTime && (
            <div className="space-y-3">
              <input type="text" value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Seu nome *" required className="w-full rounded-lg px-4 py-3 text-sm border border-white/10 bg-white/5 focus:outline-none" />
              <div className="grid grid-cols-2 gap-3">
                <input type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder="E-mail" className="w-full rounded-lg px-4 py-3 text-sm border border-white/10 bg-white/5 focus:outline-none" />
                <input type="tel" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} placeholder="WhatsApp" className="w-full rounded-lg px-4 py-3 text-sm border border-white/10 bg-white/5 focus:outline-none" />
              </div>
              <button type="submit" className="w-full py-3 rounded-lg font-semibold text-sm transition-transform hover:scale-105" style={{ background: style.accentColor || "#84CC16", color: style.bgColor || "#000" }}>
                Confirmar Agendamento
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default SchedulePublic;
