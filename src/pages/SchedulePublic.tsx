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
      const { data: existingLead } = await supabase
        .from("leads")
        .select("id")
        .eq("user_id", schedule.user_id)
        .or(`email.eq.${guestEmail},phone.eq.${guestPhone}`)
        .maybeSingle();

      let leadId = null;
      if (existingLead) {
        leadId = existingLead.id;
        await supabase.from("leads").update({
          stage_id: schedule.stage_id,
          updated_at: new Date().toISOString()
        }).eq("id", leadId);
      } else {
        const { data: newLead } = await supabase.from("leads").insert({
          name: guestName, email: guestEmail || null, phone: guestPhone || null,
          source: `agenda:${slug}`, status: "new", stage_id: schedule.stage_id,
          user_id: schedule.user_id,
        } as any).select().single();
        if (newLead) leadId = newLead.id;
      }

      if (leadId) {
        const { data: lastAppt } = await supabase
          .from("appointments")
          .select("id")
          .eq("schedule_id", schedule.id)
          .eq("guest_name", guestName)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (lastAppt) {
          await supabase.from("appointments").update({ lead_id: leadId } as any).eq("id", lastAppt.id);
        }
      }
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
    const handleWhatsAppRedirect = () => {
      if (!schedule.whatsapp_number) return;
      const msg = (schedule.whatsapp_message || "Olá! Acabei de realizar um agendamento.")
        .replace(/{nome}/g, guestName)
        .replace(/{data}/g, new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR"))
        .replace(/{hora}/g, selectedTime);
      const phone = schedule.whatsapp_number.replace(/\D/g, "");
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
    };

    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: style.bgColor || "#000", color: style.textColor || "#fff" }}>
        <div className="w-full max-w-md text-center space-y-6 p-8">
          <div className="text-6xl animate-bounce">✅</div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold">Agendamento Confirmado!</h2>
            <p className="text-lg opacity-80">Tudo pronto, {guestName.split(" ")[0]}!</p>
          </div>
          
          {schedule.show_summary && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-left space-y-4 backdrop-blur-sm">
              <h3 className="text-xs font-bold uppercase tracking-widest opacity-50 border-b border-white/10 pb-2">Resumo do Agendamento</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] opacity-50 uppercase">Data</p>
                  <p className="text-sm font-bold">{new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] opacity-50 uppercase">Horário</p>
                  <p className="text-sm font-bold">{selectedTime}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] opacity-50 uppercase">Duração</p>
                  <p className="text-sm font-bold">{schedule.duration} minutos</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] opacity-50 uppercase">Local</p>
                  <p className="text-sm font-bold">Online / Reunião</p>
                </div>
              </div>
              {schedule.timezone && <p className="text-[10px] opacity-30 text-center pt-2">Fuso horário: {schedule.timezone}</p>}
            </div>
          )}

          <div className="space-y-3 pt-4">
            {schedule.whatsapp_redirect && schedule.whatsapp_number && (
              <button 
                onClick={handleWhatsAppRedirect}
                className="w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl"
                style={{ background: "#25D366", color: "#fff" }}
              >
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .004 5.412.001 12.048c0 2.123.554 4.197 1.608 6.037L0 24l6.105-1.602a11.834 11.834 0 005.937 1.598h.005c6.637 0 12.048-5.414 12.051-12.051 0-3.215-1.252-6.238-3.528-8.513z"/></svg>
                Enviar Resumo por WhatsApp
              </button>
            )}
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 rounded-xl font-medium text-xs opacity-50 hover:opacity-100 transition-opacity"
            >
              Fazer outro agendamento
            </button>
          </div>
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
