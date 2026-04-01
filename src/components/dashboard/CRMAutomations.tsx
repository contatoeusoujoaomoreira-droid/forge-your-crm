/**
 * CRM Automations - Componente de Inteligências e Automações Nativas
 * Integra detecção de estagnação, lead scoring, recompra e atalhos
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  AlertCircle,
  TrendingUp,
  Zap,
  Clock,
  Target,
  BarChart3,
  RefreshCw,
  Hourglass,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  calculateLeadScore,
  isLeadStagnated,
  calculateProjectedLTV,
  shouldTriggerRecompraAlert,
  logStageChangeActivity,
} from "@/lib/crm-enhancements";

interface Lead {
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

interface Activity {
  id: string;
  lead_id: string | null;
  description: string;
  type: string;
  created_at: string;
}

interface AutomationAlert {
  id: string;
  type: "stagnation" | "recompra" | "low_score" | "high_value";
  leadId: string;
  leadName: string;
  message: string;
  severity: "info" | "warning" | "critical";
  actionable: boolean;
}

interface CRMAutomationsProps {
  leads: Lead[];
  activities: Activity[];
  onLeadUpdate?: (leadId: string) => void;
}

const CRMAutomations = ({
  leads,
  activities,
  onLeadUpdate,
}: CRMAutomationsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<AutomationAlert[]>([]);
  const [leadScores, setLeadScores] = useState<Record<string, number>>({});
  const [projectedValues, setProjectedValues] = useState<Record<string, number>>({});
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  // Calcular scores e valores projetados
  useEffect(() => {
    const scores: Record<string, number> = {};
    const projected: Record<string, number> = {};

    leads.forEach((lead) => {
      scores[lead.id] = calculateLeadScore(lead);
      projected[lead.id] = calculateProjectedLTV(lead);
    });

    setLeadScores(scores);
    setProjectedValues(projected);
  }, [leads]);

  // Detectar alertas de automação
  useEffect(() => {
    const newAlerts: AutomationAlert[] = [];

    leads.forEach((lead) => {
      const leadActivities = activities.filter((a) => a.lead_id === lead.id);
      const lastActivity =
        leadActivities.length > 0
          ? new Date(leadActivities[0].created_at)
          : new Date(lead.created_at);
      const score = leadScores[lead.id] || 0;
      const projectedLTV = projectedValues[lead.id] || 0;

      // Alerta 1: Estagnação
      if (isLeadStagnated(lead, lastActivity)) {
        newAlerts.push({
          id: `stagnation-${lead.id}`,
          type: "stagnation",
          leadId: lead.id,
          leadName: lead.name,
          message: `${lead.name} está estagnado há mais de 7 dias. Considere um follow-up.`,
          severity: "warning",
          actionable: true,
        });
      }

      // Alerta 2: Recompra
      if (shouldTriggerRecompraAlert(lead)) {
        newAlerts.push({
          id: `recompra-${lead.id}`,
          type: "recompra",
          leadId: lead.id,
          leadName: lead.name,
          message: `${lead.name} completou ${Math.floor(
            (Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24)
          )} dias. Ideal para recompra!`,
          severity: "info",
          actionable: true,
        });
      }

      // Alerta 3: Lead com baixo score
      if (score < 30 && lead.status !== "lost") {
        newAlerts.push({
          id: `low-score-${lead.id}`,
          type: "low_score",
          leadId: lead.id,
          leadName: lead.name,
          message: `${lead.name} tem score baixo (${score}/100). Faltam informações importantes.`,
          severity: "info",
          actionable: true,
        });
      }

      // Alerta 4: Lead de alto valor
      if (projectedLTV > 10000 && lead.status !== "won") {
        newAlerts.push({
          id: `high-value-${lead.id}`,
          type: "high_value",
          leadId: lead.id,
          leadName: lead.name,
          message: `${lead.name} tem valor projetado de R$ ${projectedLTV.toLocaleString(
            "pt-BR"
          )}. Priorize!`,
          severity: "critical",
          actionable: false,
        });
      }
    });

    // Filtrar alertas já descartados
    const filteredAlerts = newAlerts.filter((a) => !dismissedAlerts.has(a.id));
    setAlerts(filteredAlerts);
  }, [leads, activities, leadScores, projectedValues, dismissedAlerts]);

  const handleDismissAlert = (alertId: string) => {
    setDismissedAlerts((prev) => new Set([...prev, alertId]));
  };

  const handleTakeAction = async (alert: AutomationAlert) => {
    if (!user) return;

    switch (alert.type) {
      case "stagnation":
        // Criar tarefa de follow-up
        await supabase.from("activities").insert({
          user_id: user.id,
          lead_id: alert.leadId,
          type: "task",
          description: `Follow-up automático: ${alert.leadName} está estagnado.`,
        });
        toast({ title: "Tarefa criada", description: "Follow-up agendado!" });
        break;

      case "recompra":
        // Criar oportunidade de recompra
        await supabase.from("activities").insert({
          user_id: user.id,
          lead_id: alert.leadId,
          type: "note",
          description: `Oportunidade de recompra identificada automaticamente.`,
        });
        toast({
          title: "Oportunidade detectada",
          description: "Recompra sugerida!",
        });
        break;

      case "low_score":
        // Sugerir preenchimento de dados
        toast({
          title: "Dados incompletos",
          description: "Complete as informações do lead para melhorar o score.",
        });
        break;

      case "high_value":
        // Marcar como prioritário
        const lead = leads.find((l) => l.id === alert.leadId);
        if (lead) {
          await supabase.from("leads").update({ priority: "high" }).eq("id", lead.id);
          toast({ title: "Prioridade atualizada", description: "Lead marcado como quente!" });
          if (onLeadUpdate) onLeadUpdate(lead.id);
        }
        break;
    }

    handleDismissAlert(alert.id);
  };

  const getAlertIcon = (type: AutomationAlert["type"]) => {
    switch (type) {
      case "stagnation":
        return <Clock className="h-4 w-4" />;
      case "recompra":
        return <TrendingUp className="h-4 w-4" />;
      case "low_score":
        return <AlertCircle className="h-4 w-4" />;
      case "high_value":
        return <Zap className="h-4 w-4" />;
    }
  };

  const getAlertColor = (severity: AutomationAlert["severity"]) => {
    switch (severity) {
      case "critical":
        return "border-red-500/30 bg-red-500/5";
      case "warning":
        return "border-yellow-500/30 bg-yellow-500/5";
      case "info":
        return "border-blue-500/30 bg-blue-500/5";
    }
  };

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
          Automações e Alertas
        </h3>
        <Badge variant="secondary">{alerts.length}</Badge>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`p-4 rounded-lg border flex items-start gap-3 transition-all ${getAlertColor(
              alert.severity
            )}`}
          >
            <div className="mt-1">{getAlertIcon(alert.type)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{alert.message}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              {alert.actionable && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs"
                  onClick={() => handleTakeAction(alert)}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Agir
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs text-muted-foreground"
                onClick={() => handleDismissAlert(alert.id)}
              >
                ✕
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CRMAutomations;
