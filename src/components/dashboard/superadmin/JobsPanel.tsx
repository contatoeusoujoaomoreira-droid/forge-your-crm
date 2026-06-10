import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlertTriangle, ListChecks, Inbox } from "lucide-react";

type Job = { id: string; tenant_id: string | null; kind: string; status: string; attempts: number; max_attempts: number; run_at: string; last_error: string | null; created_at: string };
type Dlq = { id: string; tenant_id: string | null; kind: string; attempts: number; last_error: string | null; reason: string | null; failed_at: string };
type Evt = { id: string; provider: string; event_id: string | null; status: string; created_at: string };

const statusVariant = (s: string): "default" | "destructive" | "secondary" | "outline" => {
  if (s === "done") return "secondary";
  if (s === "dlq" || s === "failed") return "destructive";
  if (s === "running") return "default";
  return "outline";
};

export default function JobsPanel() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [dlq, setDlq] = useState<Dlq[]>([]);
  const [events, setEvents] = useState<Evt[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const [j, d, e] = await Promise.all([
      supabase.from("job_queue").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("job_dead_letter").select("*").order("failed_at", { ascending: false }).limit(50),
      supabase.from("webhook_events").select("id, provider, event_id, status, created_at").order("created_at", { ascending: false }).limit(50),
    ]);
    setJobs((j.data as Job[]) || []);
    setDlq((d.data as Dlq[]) || []);
    setEvents((e.data as Evt[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Filas, Eventos & DLQ</h3>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3 w-3 mr-2 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3 text-sm font-medium"><ListChecks className="h-4 w-4" /> Jobs recentes ({jobs.length})</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground"><tr><th className="text-left p-2">Tipo</th><th className="text-left p-2">Status</th><th className="text-left p-2">Tentativas</th><th className="text-left p-2">Próxima execução</th><th className="text-left p-2">Erro</th></tr></thead>
            <tbody>
              {jobs.map(j => (
                <tr key={j.id} className="border-t border-border/40">
                  <td className="p-2 font-mono">{j.kind}</td>
                  <td className="p-2"><Badge variant={statusVariant(j.status)}>{j.status}</Badge></td>
                  <td className="p-2">{j.attempts}/{j.max_attempts}</td>
                  <td className="p-2">{new Date(j.run_at).toLocaleString("pt-BR")}</td>
                  <td className="p-2 text-destructive max-w-[300px] truncate">{j.last_error || "—"}</td>
                </tr>
              ))}
              {!jobs.length && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Nenhum job na fila.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3 text-sm font-medium"><AlertTriangle className="h-4 w-4 text-destructive" /> Dead Letter Queue ({dlq.length})</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground"><tr><th className="text-left p-2">Tipo</th><th className="text-left p-2">Tentativas</th><th className="text-left p-2">Motivo</th><th className="text-left p-2">Erro</th><th className="text-left p-2">Quando</th></tr></thead>
            <tbody>
              {dlq.map(j => (
                <tr key={j.id} className="border-t border-border/40">
                  <td className="p-2 font-mono">{j.kind}</td>
                  <td className="p-2">{j.attempts}</td>
                  <td className="p-2">{j.reason || "—"}</td>
                  <td className="p-2 text-destructive max-w-[300px] truncate">{j.last_error || "—"}</td>
                  <td className="p-2">{new Date(j.failed_at).toLocaleString("pt-BR")}</td>
                </tr>
              ))}
              {!dlq.length && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Nenhum job na DLQ.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3 text-sm font-medium"><Inbox className="h-4 w-4" /> Webhooks recebidos ({events.length})</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground"><tr><th className="text-left p-2">Provedor</th><th className="text-left p-2">Event ID</th><th className="text-left p-2">Status</th><th className="text-left p-2">Quando</th></tr></thead>
            <tbody>
              {events.map(e => (
                <tr key={e.id} className="border-t border-border/40">
                  <td className="p-2 font-mono">{e.provider}</td>
                  <td className="p-2 font-mono truncate max-w-[280px]">{e.event_id || "—"}</td>
                  <td className="p-2"><Badge variant={statusVariant(e.status)}>{e.status}</Badge></td>
                  <td className="p-2">{new Date(e.created_at).toLocaleString("pt-BR")}</td>
                </tr>
              ))}
              {!events.length && <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">Nenhum evento registrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
