import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock } from "lucide-react";

const SchedulePublic = () => {
  const { slug } = useParams<{ slug: string }>();
  const [schedule, setSchedule] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [existingAppointments, setExistingAppointments] = useState<any[]>([]);

  useEffect(() => {
    const fetchSchedule = async () => {
      const { data } = await supabase.from("schedules").select("*").eq("slug", slug).eq("is_active", true).eq("is_published", true).maybeSingle();
      if (data) {
        setSchedule(data);
        const { data: appts } = await supabase.from("appointments").select("date, time").eq("schedule_id", data.id);
        setExistingAppointments(appts || []);
      }
      setLoading(false);
    };
    fetchSchedule();
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedule || !selectedDate || !selectedTime || !guestName) return;
    await supabase.from("appointments").insert({
      schedule_id: schedule.id, guest_name: guestName, guest_email: guestEmail || null,
      guest_phone: guestPhone || null, date: selectedDate, time: selectedTime,
    });
    setSubmitted(true);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-black text-white"><div className="h-8 w-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" /></div>;
  if (!schedule) return <div className="min-h-screen flex items-center justify-center bg-black text-white"><p>Agenda não encontrada</p></div>;

  const style = schedule.style || {};
  const hours = schedule.available_hours || { start: "09:00", end: "18:00" };
  const availDays = Array.isArray(schedule.available_days) ? schedule.available_days : [1, 2, 3, 4, 5];

  // Generate time slots
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
      current += schedule.duration;
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();
  const bookedTimes = existingAppointments.filter(a => a.date === selectedDate).map(a => a.time);

  // Generate next 30 days
  const generateDates = () => {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      if (availDays.includes(d.getDay())) {
        dates.push(d.toISOString().split("T")[0]);
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
          <div className="flex items-center justify-center gap-2 text-xs opacity-50">
            <Clock className="h-3 w-3" /> {schedule.duration} min
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Date Selection */}
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

          {/* Time Selection */}
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
            </div>
          )}

          {/* Guest Info */}
          {selectedTime && (
            <div className="space-y-3">
              <input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Seu nome *" required className="w-full rounded-lg px-4 py-3 text-sm border border-white/10 bg-white/5 focus:outline-none" />
              <div className="grid grid-cols-2 gap-3">
                <input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="E-mail" className="w-full rounded-lg px-4 py-3 text-sm border border-white/10 bg-white/5 focus:outline-none" />
                <input type="tel" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="WhatsApp" className="w-full rounded-lg px-4 py-3 text-sm border border-white/10 bg-white/5 focus:outline-none" />
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
