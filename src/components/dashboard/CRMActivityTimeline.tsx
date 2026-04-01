/**
 * CRM Activity Timeline - Timeline Completa de Atividades do Lead
 * Registra automaticamente todas as mudanças, interações e eventos
 */

import { useMemo } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Phone,
  Mail,
  MessageCircle,
  CheckSquare,
  StickyNote,
  ArrowRight,
  DollarSign,
  Tag,
  User,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Activity {
  id: string;
  lead_id: string | null;
  description: string;
  type: string;
  created_at: string;
}

interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: Date;
  icon: React.ReactNode;
  color: string;
  metadata?: Record<string, any>;
}

interface CRMActivityTimelineProps {
  activities: Activity[];
  leadId?: string;
}

const CRMActivityTimeline = ({ activities, leadId }: CRMActivityTimelineProps) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "call":
        return <Phone className="h-4 w-4" />;
      case "email":
        return <Mail className="h-4 w-4" />;
      case "message":
        return <MessageCircle className="h-4 w-4" />;
      case "task":
        return <CheckSquare className="h-4 w-4" />;
      case "note":
        return <StickyNote className="h-4 w-4" />;
      case "status_change":
        return <ArrowRight className="h-4 w-4" />;
      case "value_change":
        return <DollarSign className="h-4 w-4" />;
      case "tag_added":
        return <Tag className="h-4 w-4" />;
      case "contact_added":
        return <User className="h-4 w-4" />;
      case "automation":
        return <Zap className="h-4 w-4" />;
      default:
        return <StickyNote className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "call":
        return "bg-blue-500/10 border-blue-500/20 text-blue-500";
      case "email":
        return "bg-purple-500/10 border-purple-500/20 text-purple-500";
      case "message":
        return "bg-green-500/10 border-green-500/20 text-green-500";
      case "task":
        return "bg-yellow-500/10 border-yellow-500/20 text-yellow-500";
      case "note":
        return "bg-gray-500/10 border-gray-500/20 text-gray-500";
      case "status_change":
        return "bg-orange-500/10 border-orange-500/20 text-orange-500";
      case "value_change":
        return "bg-emerald-500/10 border-emerald-500/20 text-emerald-500";
      case "tag_added":
        return "bg-indigo-500/10 border-indigo-500/20 text-indigo-500";
      case "contact_added":
        return "bg-cyan-500/10 border-cyan-500/20 text-cyan-500";
      case "automation":
        return "bg-pink-500/10 border-pink-500/20 text-pink-500";
      default:
        return "bg-gray-500/10 border-gray-500/20 text-gray-500";
    }
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case "call":
        return "Ligação";
      case "email":
        return "E-mail";
      case "message":
        return "Mensagem";
      case "task":
        return "Tarefa";
      case "note":
        return "Nota";
      case "status_change":
        return "Mudança de Status";
      case "value_change":
        return "Atualização de Valor";
      case "tag_added":
        return "Tag Adicionada";
      case "contact_added":
        return "Contato Adicionado";
      case "automation":
        return "Automação";
      default:
        return "Atividade";
    }
  };

  const filteredActivities = useMemo(() => {
    let filtered = activities;
    if (leadId) {
      filtered = filtered.filter((a) => a.lead_id === leadId);
    }
    return filtered.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [activities, leadId]);

  const timelineEvents: TimelineEvent[] = filteredActivities.map((activity) => ({
    id: activity.id,
    type: activity.type,
    title: getActivityLabel(activity.type),
    description: activity.description,
    timestamp: new Date(activity.created_at),
    icon: getActivityIcon(activity.type),
    color: getActivityColor(activity.type),
  }));

  // Agrupar por data
  const groupedByDate = useMemo(() => {
    const groups: Record<string, TimelineEvent[]> = {};

    timelineEvents.forEach((event) => {
      const dateKey = format(event.timestamp, "dd/MM/yyyy", { locale: ptBR });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(event);
    });

    return Object.entries(groups).sort(
      ([, a], [, b]) =>
        new Date(b[0].timestamp).getTime() - new Date(a[0].timestamp).getTime()
    );
  }, [timelineEvents]);

  if (timelineEvents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold">Timeline de Atividades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <p className="text-sm">Nenhuma atividade registrada ainda</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-bold">Timeline de Atividades</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {groupedByDate.map(([dateKey, events]) => (
            <div key={dateKey}>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-bold text-muted-foreground uppercase px-2">
                  {dateKey}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="space-y-4">
                {events.map((event, index) => (
                  <div key={event.id} className="relative flex gap-4">
                    {/* Timeline connector */}
                    {index < events.length - 1 && (
                      <div className="absolute left-4 top-10 bottom-0 w-px bg-border" />
                    )}

                    {/* Timeline dot */}
                    <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 flex-shrink-0 ${event.color}`}>
                      {event.icon}
                    </div>

                    {/* Event content */}
                    <div className="flex-1 pt-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-foreground">
                            {event.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {event.description}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {formatDistanceToNow(event.timestamp, {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CRMActivityTimeline;
