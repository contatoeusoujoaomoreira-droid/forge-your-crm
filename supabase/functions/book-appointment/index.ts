import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { slug, guest_name, guest_email, guest_phone, date, time, notes } = body || {};

    if (!slug || !guest_name || !date || !time) {
      return new Response(JSON.stringify({ error: "missing_fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Load schedule
    const { data: schedule, error: schedErr } = await supabase
      .from("schedules")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .eq("is_published", true)
      .maybeSingle();

    if (schedErr || !schedule) {
      return new Response(JSON.stringify({ error: "schedule_not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Conflict check
    const { data: existingAppts } = await supabase
      .from("appointments")
      .select("id")
      .eq("schedule_id", schedule.id)
      .eq("date", date)
      .eq("time", time)
      .is("cancelled_at", null);
    if (existingAppts && existingAppts.length > 0) {
      return new Response(JSON.stringify({ error: "slot_taken" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const cancellationToken = schedule.allow_cancellation ? crypto.randomUUID() : null;

    // Create or find lead
    let leadId: string | null = null;
    if (schedule.stage_id) {
      const cleanPhone = (guest_phone || "").replace(/\D/g, "") || null;
      let existing: any = null;
      if (guest_email) {
        const { data } = await supabase.from("leads").select("id").eq("user_id", schedule.user_id).eq("email", guest_email).maybeSingle();
        existing = data;
      }
      if (!existing && cleanPhone) {
        const { data } = await supabase.from("leads").select("id").eq("user_id", schedule.user_id).eq("phone", cleanPhone).maybeSingle();
        existing = data;
      }

      const leadNote = `Agendamento em ${date} às ${time} - ${schedule.title}`;
      if (existing) {
        leadId = existing.id;
        await supabase.from("leads").update({
          stage_id: schedule.stage_id,
          pipeline_id: schedule.pipeline_id,
          notes: leadNote,
          source: `agenda:${slug}`,
        }).eq("id", leadId);
      } else {
        const { data: newLead, error: leadErr } = await supabase.from("leads").insert({
          user_id: schedule.user_id,
          name: guest_name,
          email: guest_email || null,
          phone: cleanPhone,
          stage_id: schedule.stage_id,
          pipeline_id: schedule.pipeline_id,
          source: `agenda:${slug}`,
          status: "new",
          tags: ["agendamento"],
          notes: leadNote,
        }).select("id").single();
        if (leadErr) console.error("lead insert error", leadErr);
        leadId = newLead?.id || null;
      }
    }

    // Create appointment
    const { data: appointment, error: apptErr } = await supabase.from("appointments").insert({
      schedule_id: schedule.id,
      lead_id: leadId,
      guest_name,
      guest_email: guest_email || null,
      guest_phone: guest_phone || null,
      date,
      time,
      notes: notes || null,
      status: "confirmed",
      cancellation_token: cancellationToken,
    }).select().single();

    if (apptErr) {
      return new Response(JSON.stringify({ error: "appointment_failed", detail: apptErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Notification for owner
    await supabase.from("notifications").insert({
      user_id: schedule.user_id,
      type: "appointment",
      title: `Novo agendamento: ${guest_name}`,
      message: `${guest_name} agendou para ${date} às ${time}`,
      metadata: { schedule_id: schedule.id, appointment_id: appointment.id, lead_id: leadId, date, time },
    });

    return new Response(JSON.stringify({
      ok: true,
      appointment_id: appointment.id,
      lead_id: leadId,
      cancellation_token: cancellationToken,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: "internal", detail: e?.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
