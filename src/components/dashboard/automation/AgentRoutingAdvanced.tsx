/**
 * AgentRoutingAdvanced - Advanced routing rules, handoff, follow-up, schedule linking
 * Used inside AgentBuilder as a sub-section of the Roteamento tab
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, GitBranch, Bell, Calendar, Clock, Shield, Zap, UserCheck, AlertTriangle, ArrowRightLeft } from "lucide-react";
import TeamRadarSettings from "./TeamRadarSettings";

interface IntentRoutingRule {
  intent: string;
  target_agent_id: string;
  description: string;
}

interface Props {
  form: any;
  setForm: (f: any) => void;
  agents: any[];
  schedules: any[];
  pipelines: any[];
  stages: any[];
}

export default function AgentRoutingAdvanced({ form, setForm, agents, schedules, pipelines, stages }: Props) {
  const intentRules: IntentRoutingRule[] = form.intent_routing_rules || [];

  const addIntentRule = () => {
    setForm({
      ...form,
      intent_routing_rules: [...intentRules, { intent: "", target_agent_id: "", description: "" }],
    });
  };

  const updateIntentRule = (i: number, patch: Partial<IntentRoutingRule>) => {
    const next = [...intentRules];
    next[i] = { ...next[i], ...patch };
    setForm({ ...form, intent_routing_rules: next });
  };

  const removeIntentRule = (i: number) => {
    setForm({ ...form, intent_routing_rules: intentRules.filter((_, idx) => idx !== i) });
  };

  const stageOptions = stages.filter((s: any) => !form.followup_rescue_stage_id || true);

  return (
    <div className="space-y-4">
      {/* ── Intent-based agent routing ── */}
      <Card className="p-4 space-y-3 border-blue-500/30">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold flex items-center gap-2 text-blue-400">
              <ArrowRightLeft className="h-4 w-4" /> Regras de Transição (Roteamento Dinâmico)
            </h4>
            <p className="text-xs text-muted-foreground">
              Rotear a conversa para outro agente quando detectar palavra-chave ou intenção específica.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={addIntentRule}>
            <Plus className="h-4 w-4 mr-1" /> Nova regra
          </Button>
        </div>

        {intentRules.length === 0 ? (
          <div className="text-center py-6 border border-dashed rounded-lg">
            <ArrowRightLeft className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma regra de transição configurada</p>
            <p className="text-xs text-muted-foreground">
              Ex: Se o lead disser "suporte" → trocar para Agente de Suporte silenciosamente.
            </p>
          </div>
        ) : (
          intentRules.map((r, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-end p-3 rounded-md border border-border/60 bg-muted/20">
              <div>
                <Label className="text-xs">Palavra-chave / Intenção</Label>
                <Input
                  value={r.intent}
                  onChange={(e) => updateIntentRule(i, { intent: e.target.value })}
                  placeholder="Ex: suporte, reclamação, cancelar"
                />
              </div>
              <div>
                <Label className="text-xs">Trocar para Agente</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  value={r.target_agent_id || ""}
                  onChange={(e) => updateIntentRule(i, { target_agent_id: e.target.value })}
                >
                  <option value="">Selecione o agente destino</option>
                  {agents.filter((a) => a.id !== form.id).map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <Button size="icon" variant="ghost" onClick={() => removeIntentRule(i)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </Card>

      {/* ── Handoff Humano ── */}
      <Card className="p-4 space-y-3 border-amber-500/30">
        <h4 className="font-semibold flex items-center gap-2 text-amber-400">
          <UserCheck className="h-4 w-4" /> Handoff Humano (comportamento ao assumir)
        </h4>
        <p className="text-xs text-muted-foreground">
          Configure o que acontece quando um humano assume o chat (via sistema ou WhatsApp direto).
        </p>

        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">🤝 Ativar transferência para humano</Label>
          <Switch
            checked={form.handoff_enabled}
            onCheckedChange={(v) => setForm({ ...form, handoff_enabled: v })}
          />
        </div>

        {form.handoff_enabled && (
          <>
            <Input
              placeholder="Palavras-chave (separe por vírgula): atendente, humano, gerente"
              value={form.handoff_keywords || ""}
              onChange={(e) => setForm({ ...form, handoff_keywords: e.target.value })}
            />

            <div className="space-y-2 border-t pt-3">
              <Label className="text-xs font-semibold">Modo de pausa do bot</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className={`p-3 rounded-lg border text-left text-xs transition-all ${form.handoff_mode === "pause" ? "border-primary bg-primary/10" : "border-border"}`}
                  onClick={() => setForm({ ...form, handoff_mode: "pause" })}
                >
                  <p className="font-semibold">⏸️ Pausar por tempo</p>
                  <p className="text-muted-foreground mt-1">Bot volta após X minutos/horas</p>
                </button>
                <button
                  className={`p-3 rounded-lg border text-left text-xs transition-all ${form.handoff_mode === "permanent" ? "border-primary bg-primary/10" : "border-border"}`}
                  onClick={() => setForm({ ...form, handoff_mode: "permanent" })}
                >
                  <p className="font-semibold">🚫 Desativar permanente</p>
                  <p className="text-muted-foreground mt-1">Bot para completamente para este lead</p>
                </button>
              </div>

              {form.handoff_mode === "pause" && (
                <div>
                  <Label className="text-xs">Tempo de pausa (minutos)</Label>
                  <Input
                    type="number"
                    min={5}
                    value={form.handoff_pause_minutes || 30}
                    onChange={(e) => setForm({ ...form, handoff_pause_minutes: Number(e.target.value) })}
                    placeholder="30"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Após {form.handoff_pause_minutes || 30} min sem resposta humana, o bot retoma automaticamente.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      {/* ── Radar da Equipe (multi-telefone, eventos selecionáveis) ── */}
      <TeamRadarSettings />

      {/* ── Follow-Up Anti-Vácuo ── */}
      <Card className="p-4 space-y-3 border-purple-500/30">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold flex items-center gap-2 text-purple-400">
              <AlertTriangle className="h-4 w-4" /> Motor de Follow-Up (Anti-Vácuo)
            </h4>
            <p className="text-xs text-muted-foreground">
              Resgate inteligente quando o lead para de responder. A IA gera follow-up contextual baseado na última interação.
            </p>
          </div>
          <Switch
            checked={form.followup_enabled || false}
            onCheckedChange={(v) => setForm({ ...form, followup_enabled: v })}
          />
        </div>

        {form.followup_enabled && (
          <div className="space-y-3 border-t pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Máximo de tentativas</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={form.followup_max_attempts || 3}
                  onChange={(e) => setForm({ ...form, followup_max_attempts: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label className="text-xs">Intervalo entre tentativas (min)</Label>
                <Input
                  type="number"
                  min={15}
                  value={form.followup_interval_minutes || 120}
                  onChange={(e) => setForm({ ...form, followup_interval_minutes: Number(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Mensagem de resgate (opcional)</Label>
              <Textarea
                rows={3}
                value={form.followup_rescue_message || ""}
                onChange={(e) => setForm({ ...form, followup_rescue_message: e.target.value })}
                placeholder="Deixe vazio para que a IA gere automaticamente com base no contexto da última conversa. Ou escreva um template: 'Oi {nome}, vi que ficou pendente...'"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Se vazio, a IA lê o contexto da última interação e gera um gancho natural (ex: quebra objeção de preço).
              </p>
            </div>

            <div className="text-xs p-2 rounded-md bg-muted/40 border border-dashed leading-relaxed">
              <strong>Como funciona:</strong><br />
              1) Lead para de responder → timer inicia<br />
              2) Após {form.followup_interval_minutes || 120} min → IA gera follow-up contextual<br />
              3) Máx. {form.followup_max_attempts || 3} tentativas → para de insistir<br />
              4) Qualquer resposta do lead → timer reseta imediatamente
            </div>
          </div>
        )}
      </Card>

      {/* ── Vinculação com Agenda ── */}
      <Card className="p-4 space-y-3 border-cyan-500/30">
        <h4 className="font-semibold flex items-center gap-2 text-cyan-400">
          <Calendar className="h-4 w-4" /> Vincular Agenda
        </h4>
        <p className="text-xs text-muted-foreground">
          Permita que este agente consulte e confirme agendamentos automaticamente.
        </p>

        <div>
          <Label className="text-xs">Agenda vinculada</Label>
          <select
            className="w-full h-10 px-3 rounded-md border border-input bg-background"
            value={form.linked_schedule_id || ""}
            onChange={(e) => setForm({ ...form, linked_schedule_id: e.target.value || null })}
          >
            <option value="">Nenhuma</option>
            {schedules.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>

        {form.linked_schedule_id && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-2 rounded-md border">
                <Label className="text-xs">📋 Consultar horários</Label>
                <Switch
                  checked={form.schedule_can_query !== false}
                  onCheckedChange={(v) => setForm({ ...form, schedule_can_query: v })}
                />
              </div>
              <div className="flex items-center justify-between p-2 rounded-md border">
                <Label className="text-xs">✅ Confirmar agendamentos</Label>
                <Switch
                  checked={form.schedule_can_book || false}
                  onCheckedChange={(v) => setForm({ ...form, schedule_can_book: v })}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Palavras-chave para acionar agenda</Label>
              <Input
                value={form.schedule_keywords || ""}
                onChange={(e) => setForm({ ...form, schedule_keywords: e.target.value })}
                placeholder="agendar, horário, marcar, disponibilidade, consulta"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Quando o lead usar essas palavras, o agente inicia o fluxo de busca de horários e agendamento.
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
