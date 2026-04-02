/**
 * CRM Event System - Motor de Eventos Internos
 * Arquitetura orientada a eventos para automações entre módulos
 */

import { supabase } from "@/integrations/supabase/client";

// Event Types
export type CRMEventType =
  | "lead_created"
  | "lead_stage_changed"
  | "lead_converted"
  | "appointment_created"
  | "appointment_cancelled"
  | "appointment_noshow"
  | "order_created"
  | "order_completed"
  | "form_submitted"
  | "quiz_completed";

export interface CRMEvent {
  type: CRMEventType;
  userId: string;
  data: Record<string, any>;
  timestamp: Date;
}

// Won stage patterns for auto-conversion
const CONVERSION_PATTERNS = [
  "ganho", "fechado", "convertido", "cliente", "venda realizada", "won", "closed"
];

export const isConversionStage = (stageName: string): boolean =>
  CONVERSION_PATTERNS.some(p => stageName.toLowerCase().includes(p));

// Event Handlers
export const handleCRMEvent = async (event: CRMEvent) => {
  const handlers: Record<CRMEventType, (e: CRMEvent) => Promise<void>> = {
    lead_created: handleLeadCreated,
    lead_stage_changed: handleLeadStageChanged,
    lead_converted: handleLeadConverted,
    appointment_created: handleAppointmentCreated,
    appointment_cancelled: handleAppointmentCancelled,
    appointment_noshow: handleAppointmentNoShow,
    order_created: handleOrderCreated,
    order_completed: handleOrderCompleted,
    form_submitted: handleFormSubmitted,
    quiz_completed: handleQuizCompleted,
  };

  const handler = handlers[event.type];
  if (handler) {
    try {
      await handler(event);
    } catch (err) {
      console.error(`CRM Event Error [${event.type}]:`, err);
    }
  }
};

async function handleLeadCreated(event: CRMEvent) {
  const { userId, data } = event;
  // Auto-create follow-up task
  await supabase.from("activities").insert({
    user_id: userId,
    lead_id: data.leadId,
    type: "task",
    description: `🤖 Tarefa automática: Fazer primeiro contato com ${data.leadName}`,
  });
}

async function handleLeadStageChanged(event: CRMEvent) {
  const { userId, data } = event;
  const { leadId, leadName, newStageName, newStageId, value, revenueType } = data;

  // Log activity
  await supabase.from("activities").insert({
    user_id: userId,
    lead_id: leadId,
    type: "note",
    description: `📋 Lead movido para etapa: ${newStageName}`,
  });

  // Auto-convert if stage matches conversion patterns
  if (isConversionStage(newStageName)) {
    await handleCRMEvent({
      type: "lead_converted",
      userId,
      data: { leadId, leadName, value, revenueType, stageId: newStageId, source: "auto_stage" },
      timestamp: new Date(),
    });
  }
}

async function handleLeadConverted(event: CRMEvent) {
  const { userId, data } = event;
  const { leadId, revenueType } = data;

  // Mark lead as won with conversion date
  await supabase.from("leads").update({
    status: "won",
    revenue_type: revenueType || "one_time",
  } as any).eq("id", leadId);

  // Log conversion activity
  await supabase.from("activities").insert({
    user_id: userId,
    lead_id: leadId,
    type: "note",
    description: `🎉 Lead convertido em cliente! Tipo de receita: ${revenueType === "recorrente" ? "Recorrente" : "Pagamento Único"}`,
  });
}

async function handleAppointmentCreated(event: CRMEvent) {
  const { userId, data } = event;
  const { guestName, guestEmail, guestPhone, stageId, scheduleSlug, date, time } = data;

  // Search for existing lead
  let leadId: string | null = null;
  if (guestEmail || guestPhone) {
    const query = supabase.from("leads").select("id").eq("user_id", userId);
    if (guestEmail) query.eq("email", guestEmail);
    else if (guestPhone) query.eq("phone", guestPhone);
    const { data: existing } = await query.maybeSingle();
    
    if (existing) {
      leadId = existing.id;
      // Update stage if configured
      if (stageId) {
        await supabase.from("leads").update({ stage_id: stageId } as any).eq("id", leadId);
      }
    }
  }

  // Create new lead if not found and stage is configured
  if (!leadId && stageId) {
    const { data: newLead } = await supabase.from("leads").insert({
      user_id: userId,
      name: guestName,
      email: guestEmail || null,
      phone: guestPhone || null,
      source: `agenda:${scheduleSlug}`,
      stage_id: stageId,
      status: "new",
      tags: ["agendamento"],
    } as any).select("id").single();
    leadId = newLead?.id || null;
  }

  // Create follow-up task
  if (leadId) {
    await supabase.from("activities").insert({
      user_id: userId,
      lead_id: leadId,
      type: "task",
      description: `📅 Agendamento confirmado: ${date} às ${time} com ${guestName}`,
    });
  }
}

async function handleAppointmentCancelled(event: CRMEvent) {
  const { userId, data } = event;
  if (data.leadId) {
    await supabase.from("activities").insert({
      user_id: userId,
      lead_id: data.leadId,
      type: "note",
      description: `❌ Agendamento cancelado por ${data.guestName}`,
    });
  }
}

async function handleAppointmentNoShow(event: CRMEvent) {
  const { userId, data } = event;
  if (data.leadId) {
    await supabase.from("activities").insert({
      user_id: userId,
      lead_id: data.leadId,
      type: "task",
      description: `⚠️ No-show: ${data.guestName} não compareceu. Criar follow-up.`,
    });
  }
}

async function handleOrderCreated(event: CRMEvent) {
  const { userId, data } = event;
  const { customerName, customerEmail, customerPhone, total, checkoutId } = data;

  // Find or create lead
  let leadId: string | null = null;
  if (customerEmail || customerPhone) {
    const query = supabase.from("leads").select("id, status").eq("user_id", userId);
    if (customerEmail) query.eq("email", customerEmail);
    const { data: existing } = await query.maybeSingle();
    
    if (existing) {
      leadId = existing.id;
      // Auto-convert to client
      await supabase.from("leads").update({
        status: "won",
        value: total,
        revenue_type: "one_time",
      } as any).eq("id", leadId);
    } else {
      const { data: newLead } = await supabase.from("leads").insert({
        user_id: userId,
        name: customerName,
        email: customerEmail || null,
        phone: customerPhone || null,
        source: "checkout",
        status: "won",
        value: total,
        revenue_type: "one_time",
        tags: ["comprador"],
      } as any).select("id").single();
      leadId = newLead?.id || null;
    }
  }

  if (leadId) {
    await supabase.from("activities").insert({
      user_id: userId,
      lead_id: leadId,
      type: "note",
      description: `💰 Compra realizada! Valor: R$ ${total.toLocaleString("pt-BR")}`,
    });
  }
}

async function handleOrderCompleted(event: CRMEvent) {
  // Future: trigger post-sale automation
}

async function handleFormSubmitted(event: CRMEvent) {
  // Already handled in FormPublic - this is for future extensions
}

async function handleQuizCompleted(event: CRMEvent) {
  // Already handled in QuizPublic - this is for future extensions
}

// Lead Score Calculator
export const calculateLeadScoreAdvanced = (lead: any, activities: any[] = []): number => {
  let score = 0;
  
  // Data completeness (40 points max)
  if (lead.email) score += 8;
  if (lead.phone) score += 8;
  if (lead.company) score += 5;
  if (lead.notes) score += 4;
  if (lead.instagram || lead.linkedin || lead.facebook) score += 5;
  if (lead.utm_source) score += 5;
  if (lead.website) score += 5;
  
  // Engagement (30 points max)
  const activityCount = activities.length;
  if (activityCount >= 5) score += 30;
  else if (activityCount >= 3) score += 20;
  else if (activityCount >= 1) score += 10;
  
  // Financial (20 points max)
  if (lead.value > 10000) score += 20;
  else if (lead.value > 5000) score += 15;
  else if (lead.value > 1000) score += 10;
  else if (lead.value > 0) score += 5;
  
  // Priority & urgency (10 points max)
  if (lead.priority === "high") score += 5;
  if (lead.urgency === "high") score += 5;
  
  return Math.min(score, 100);
};

// Get lead temperature from score
export const getLeadTemperature = (score: number): "hot" | "warm" | "cold" => {
  if (score >= 70) return "hot";
  if (score >= 40) return "warm";
  return "cold";
};
