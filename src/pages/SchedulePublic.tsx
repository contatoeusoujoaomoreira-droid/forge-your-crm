import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, XCircle, CheckCircle, PartyPopper, MessageCircle, Star } from "lucide-react";

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
  const [cancellationLink, setCancellationLink] = useState<string | null>(null);

  useEffect(() => {
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
    
    const { data: appointment } = await supabase.from("appointments").insert({
      schedule_id: schedule.id, guest_name: guestName, guest_email: guestEmail || null,
      guest_phone: guestPhone || null, date: selectedDate, time: selectedTime,
      cancellation_token: cancellationToken,
    } as any).select().single();

    // Notification for schedule owner
    await supabase.from("notifications").insert({
      user_id: schedule.user_id,
      type: "appointment",
      title: `Novo agendamento: ${guestName}`,
      message: `${guestName} agendou para ${selectedDate} às ${selectedTime}`,
      metadata: { schedule_id: schedule.id, date: selectedDate, time: selectedTime },
    } as any);

    if (cancellationToken && appointment) {
      setCancellationLink(`${window.location.origin}/agendar/${slug}?cancel=${cancellationToken}`);
    }

    // Create lead if CRM integration configured
    if (schedule.stage_id) {
      // Check if lead already exists
      let leadId: string | null = null;
      if (guestEmail || guestPhone) {
        const query = supabase.from("leads").select("id").eq("user_id", schedule.user_id);
        if (guestEmail) query.eq("email", guestEmail);
        else if (guestPhone) query.eq("phone", guestPhone);
        const { data: existing } = await query.maybeSingle();
        if (existing) {
          leadId = existing.id;
          await supabase.from("leads").update({ stage_id: schedule.stage_id } as any).eq("id", leadId);
        }
      }
      if (!leadId) {
        await supabase.from("leads").insert({
          name: guestName, email: guestEmail || null, phone: guestPhone || null,
          source: `agenda:${slug}`, status: "new", stage_id: schedule.stage_id,
          user_id: schedule.user_id, tags: ["agendamento"],
        } as any);
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

  // Build WhatsApp message
  const buildWhatsAppLink = () => {
    const whatsNumber = style.whatsapp_number;
    if (!whatsNumber) return null;
    
    let message = style.whatsapp_message || "Olá! Acabei de agendar:\n\n👤 {nome}\n📅 {data}\n🕐 {hora}\n📋 {servico}\n⏱️ {duracao} minutos";
    
    const dateFormatted = selectedDate ? new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" }) : "";
    
    message = message
      .replace(/{nome}/g, guestName)
      .replace(/{data}/g, dateFormatted)
      .replace(/{hora}/g, selectedTime)
      .replace(/{servico}/g, schedule.title)
      .replace(/{duracao}/g, String(schedule.duration));
    
    return `https://wa.me/${whatsNumber.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
  };

  // Gamified Confirmation Screen
  if (submitted) {
    const dateFormatted = new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const whatsAppLink = buildWhatsAppLink();
    
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: style.bgColor || "#000", color: style.textColor || "#fff" }}>
        <div className="w-full max-w-md text-center space-y-8">
          {/* Success Animation */}
          <div className="relative">
            <div className="w-24 h-24 mx-auto rounded-full flex items-center justify-center animate-bounce" 
              style={{ background: `${style.accentColor || "#84CC16"}20`, border: `3px solid ${style.accentColor || "#84CC16"}` }}>
              <CheckCircle className="h-12 w-12" style={{ color: style.accentColor || "#84CC16" }} />
            </div>
            <div className="absolute -top-2 -right-2 animate-pulse">
              <PartyPopper className="h-8 w-8 text-yellow-400" />
            </div>
            <div className="absolute -top-2 -left-2 animate-pulse delay-150">
              <Star className="h-6 w-6 text-yellow-400" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Agendamento Confirmado! 🎉</h1>
            <p className="text-sm opacity-70">Sua reserva foi realizada com sucesso</p>
          </div>

          {/* Booking Details Card */}
          <div className="rounded-2xl p-6 space-y-4 text-left" style={{ background: `${style.textColor || "#fff"}08`, border: `1px solid ${style.textColor || "#fff"}15` }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg"
                style={{ background: `${style.accentColor || "#84CC16"}20`, color: style.accentColor || "#84CC16" }}>
                {guestName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold">{guestName}</p>
                {guestEmail && <p className="text-xs opacity-60">{guestEmail}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl p-3" style={{ background: `${style.accentColor || "#84CC16"}10` }}>
                <p className="text-[10px] opacity-50 uppercase tracking-wider mb-1">📅 Data</p>
                <p className="text-sm font-bold capitalize">{dateFormatted}</p>
              </div>
              <div className="rounded-xl p-3" style={{ background: `${style.accentColor || "#84CC16"}10` }}>
                <p className="text-[10px] opacity-50 uppercase tracking-wider mb-1">🕐 Horário</p>
                <p className="text-sm font-bold">{selectedTime}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl p-3" style={{ background: `${style.accentColor || "#84CC16"}10` }}>
                <p className="text-[10px] opacity-50 uppercase tracking-wider mb-1">📋 Serviço</p>
                <p className="text-sm font-bold">{schedule.title}</p>
              </div>
              <div className="rounded-xl p-3" style={{ background: `${style.accentColor || "#84CC16"}10` }}>
                <p className="text-[10px] opacity-50 uppercase tracking-wider mb-1">⏱️ Duração</p>
                <p className="text-sm font-bold">{schedule.duration} minutos</p>
              </div>
            </div>

            {schedule.timezone && (
              <p className="text-[10px] opacity-40 text-center">Fuso horário: {schedule.timezone}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {whatsAppLink && (
              <a href={whatsAppLink} target="_blank" rel="noopener noreferrer"
                className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-transform hover:scale-105"
                style={{ background: "#25D366", color: "#fff" }}>
                <MessageCircle className="h-5 w-5" />
                Avisar no WhatsApp
              </a>
            )}

            {cancellationLink && (
              <p className="text-[10px] opacity-40">
                Precisa cancelar? <a href={cancellationLink} className="underline">Clique aqui</a>
              </p>
            )}
          </div>

          {/* Achievement Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold" 
            style={{ background: `${style.accentColor || "#84CC16"}15`, border: `1px solid ${style.accentColor || "#84CC16"}30`, color: style.accentColor || "#84CC16" }}>
            <Star className="h-3.5 w-3.5" /> Reserva #1 Confirmada
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
