/**
 * CRM Enhancements - Automações e Inteligências Nativas
 * Módulo de funções auxiliares para melhorar a performance e automação do CRM
 */

import { supabase } from "@/integrations/supabase/client";

export interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  value: number;
  stage_id: string | null;
  position: number;
  notes: string | null;
  source: string | null;
  status: string;
  created_at: string;
  tags: string[];
  priority?: string | null;
  urgency?: string | null;
  revenue_type?: string | null;
  monthly_value?: number | null;
  contract_months?: number | null;
  probability?: number | null;
  instagram?: string | null;
  facebook?: string | null;
  linkedin?: string | null;
  website?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
}

export interface Activity {
  id: string;
  lead_id: string | null;
  description: string;
  type: string;
  created_at: string;
}

// ============ DETECÇÃO DE DUPLICATAS ============

/**
 * Verifica se um lead é duplicado por email ou telefone
 */
export const checkDuplicateLead = async (
  userId: string,
  email?: string | null,
  phone?: string | null
): Promise<boolean> => {
  const checks = [];

  if (email) {
    checks.push(
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("email", email)
    );
  }

  if (phone) {
    checks.push(
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("phone", phone)
    );
  }

  if (checks.length === 0) return false;

  const results = await Promise.all(checks);
  return results.some(result => (result.count ?? 0) > 0);
};

// ============ CÁLCULO DE LEAD SCORE ============

const LEAD_SCORE_WEIGHTS = {
  hasEmail: 10,
  hasPhone: 10,
  hasCompany: 5,
  hasUrgency: 15,
  hasValue: 20,
  hasProbability: 15,
  hasRedes: 10,
  hasUTM: 10,
  hasNotes: 5,
};

/**
 * Calcula o score de qualificação do lead (0-100)
 */
export const calculateLeadScore = (lead: Lead): number => {
  let score = 0;

  if (lead.email) score += LEAD_SCORE_WEIGHTS.hasEmail;
  if (lead.phone) score += LEAD_SCORE_WEIGHTS.hasPhone;
  if (lead.company) score += LEAD_SCORE_WEIGHTS.hasCompany;
  if (lead.urgency) score += LEAD_SCORE_WEIGHTS.hasUrgency;
  if (lead.value > 0) score += LEAD_SCORE_WEIGHTS.hasValue;
  if (lead.probability) score += LEAD_SCORE_WEIGHTS.hasProbability;
  if (lead.instagram || lead.facebook || lead.linkedin) score += LEAD_SCORE_WEIGHTS.hasRedes;
  if (lead.utm_source || lead.utm_medium || lead.utm_campaign) score += LEAD_SCORE_WEIGHTS.hasUTM;
  if (lead.notes) score += LEAD_SCORE_WEIGHTS.hasNotes;

  return Math.min(score, 100);
};

// ============ DETECÇÃO DE ESTAGNAÇÃO ============

const STAGNATION_DAYS = 7;

/**
 * Detecta se um lead está estagnado (sem movimento há mais de X dias)
 */
export const isLeadStagnated = (lead: Lead, lastActivityDate?: Date): boolean => {
  const referenceDate = lastActivityDate || new Date(lead.created_at);
  const daysSinceActivity = Math.floor(
    (Date.now() - referenceDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    daysSinceActivity > STAGNATION_DAYS &&
    lead.status !== "won" &&
    lead.status !== "lost"
  );
};

// ============ CÁLCULO DE VALOR PONDERADO (LTV) ============

/**
 * Calcula o Lifetime Value (LTV) projetado do lead
 * Leva em conta valor, probabilidade, tipo de receita e duração do contrato
 */
export const calculateProjectedLTV = (lead: Lead): number => {
  const baseValue = lead.value || 0;
  const probability = (lead.probability || 50) / 100;
  const monthlyValue = lead.monthly_value || 0;
  const contractMonths = lead.contract_months || 1;

  if (lead.revenue_type === "monthly") {
    // Para receita recorrente: valor mensal * meses de contrato * probabilidade
    return monthlyValue * contractMonths * probability;
  }

  // Para receita única: valor * probabilidade
  return baseValue * probability;
};

// ============ AUTOMAÇÃO DE RECOMPRA ============

const RECOMPRA_ALERT_DAYS = 30;

/**
 * Verifica se um lead ganho deve receber alerta de recompra
 */
export const shouldTriggerRecompraAlert = (lead: Lead): boolean => {
  if (lead.status !== "won" || !lead.value) return false;

  const daysSinceWon = Math.floor(
    (Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysSinceWon >= RECOMPRA_ALERT_DAYS;
};

// ============ AUTOMAÇÃO DE ATIVIDADES ============

/**
 * Registra automaticamente uma atividade de mudança de etapa
 */
export const logStageChangeActivity = async (
  userId: string,
  leadId: string,
  fromStageName: string,
  toStageName: string
): Promise<void> => {
  await supabase.from("activities").insert({
    user_id: userId,
    lead_id: leadId,
    type: "status_change",
    description: `Lead movido de "${fromStageName}" para "${toStageName}"`,
  });
};

/**
 * Registra automaticamente uma atividade de atualização de valor
 */
export const logValueChangeActivity = async (
  userId: string,
  leadId: string,
  oldValue: number,
  newValue: number
): Promise<void> => {
  await supabase.from("activities").insert({
    user_id: userId,
    lead_id: leadId,
    type: "note",
    description: `Valor do negócio atualizado de R$ ${oldValue.toLocaleString(
      "pt-BR"
    )} para R$ ${newValue.toLocaleString("pt-BR")}`,
  });
};

// ============ SUBSTITUIÇÃO DE VARIÁVEIS EM TEMPLATES ============

/**
 * Substitui variáveis dinâmicas em templates de mensagem
 */
export const replaceTemplateVariables = (
  template: string,
  lead: Lead,
  userInfo?: { name?: string; company?: string }
): string => {
  let message = template;

  // Variáveis do lead
  message = message.replace(/{nome}/g, lead.name || "");
  message = message.replace(/{empresa}/g, lead.company || "");
  message = message.replace(/{valor}/g, lead.value?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) || "");
  message = message.replace(/{email}/g, lead.email || "");
  message = message.replace(/{telefone}/g, lead.phone || "");
  message = message.replace(/{probabilidade}/g, `${lead.probability || 50}%`);

  // Variáveis do usuário
  message = message.replace(/{user_name}/g, userInfo?.name || "Consultor");
  message = message.replace(/{user_company}/g, userInfo?.company || "Nossa Empresa");

  return message;
};

// ============ IMPORTAÇÃO EM LOTE (CSV) ============

/**
 * Valida e processa importação de leads via CSV
 */
export const importLeadsFromCSV = async (
  userId: string,
  csvData: Record<string, string>[],
  fieldMapping: Record<string, string>,
  defaultStageId: string
): Promise<{ success: number; failed: number; errors: string[] }> => {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < csvData.length; i++) {
    const row = csvData[i];
    const leadData: any = {
      user_id: userId,
      stage_id: defaultStageId,
      position: i,
      value: 0,
      priority: "medium",
      urgency: "medium",
      probability: 50,
      revenue_type: "one_time",
      contract_months: 1,
    };

    // Mapear campos
    for (const [csvField, dbField] of Object.entries(fieldMapping)) {
      const value = row[csvField];
      if (!value) continue;

      if (dbField === "value" || dbField === "monthly_value") {
        leadData[dbField] = parseFloat(value) || 0;
      } else if (dbField === "probability" || dbField === "contract_months") {
        leadData[dbField] = parseInt(value) || (dbField === "probability" ? 50 : 1);
      } else {
        leadData[dbField] = value;
      }
    }

    // Validação mínima
    if (!leadData.name) {
      failed++;
      errors.push(`Linha ${i + 1}: Nome é obrigatório`);
      continue;
    }

    // Verificar duplicata
    const isDuplicate = await checkDuplicateLead(userId, leadData.email, leadData.phone);
    if (isDuplicate) {
      failed++;
      errors.push(`Linha ${i + 1}: Lead duplicado (${leadData.email || leadData.phone})`);
      continue;
    }

    // Inserir lead
    const { error } = await supabase.from("leads").insert(leadData);
    if (error) {
      failed++;
      errors.push(`Linha ${i + 1}: ${error.message}`);
    } else {
      success++;
    }
  }

  return { success, failed, errors };
};

// ============ EXPORTAÇÃO DE DADOS ============

/**
 * Exporta leads para CSV
 */
export const exportLeadsToCSV = (leads: Lead[]): string => {
  const headers = [
    "Nome",
    "Email",
    "Telefone",
    "Empresa",
    "Valor",
    "Probabilidade",
    "Prioridade",
    "Urgência",
    "Fonte",
    "Status",
    "Tags",
  ];

  const rows = leads.map((lead) => [
    lead.name,
    lead.email || "",
    lead.phone || "",
    lead.company || "",
    lead.value || "",
    lead.probability || "",
    lead.priority || "",
    lead.urgency || "",
    lead.source || "",
    lead.status || "",
    (lead.tags || []).join(";"),
  ]);

  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      row
        .map((cell) =>
          typeof cell === "string" && cell.includes(",")
            ? `"${cell.replace(/"/g, '""')}"`
            : cell
        )
        .join(",")
    ),
  ].join("\n");

  return csv;
};

// ============ ATALHOS DE TECLADO ============

/**
 * Mapeia atalhos de teclado para ações do CRM
 */
export const CRM_KEYBOARD_SHORTCUTS = {
  "ctrl+n": "new_lead",
  "ctrl+f": "focus_search",
  "ctrl+e": "edit_lead",
  "ctrl+d": "delete_lead",
  "ctrl+w": "send_whatsapp",
  "ctrl+shift+e": "export_leads",
  "escape": "close_dialog",
} as const;

/**
 * Processa atalho de teclado
 */
export const handleKeyboardShortcut = (
  event: KeyboardEvent,
  callback: (action: string) => void
): void => {
  const key = [
    event.ctrlKey && "ctrl",
    event.shiftKey && "shift",
    event.altKey && "alt",
    event.key.toLowerCase(),
  ]
    .filter(Boolean)
    .join("+");

  const action = (CRM_KEYBOARD_SHORTCUTS as Record<string, string>)[key];
  if (action) {
    event.preventDefault();
    callback(action);
  }
};
