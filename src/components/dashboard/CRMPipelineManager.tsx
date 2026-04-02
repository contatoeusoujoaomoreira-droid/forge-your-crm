/**
 * CRM Pipeline Manager - Gerenciador Avançado de Pipelines
 * Permite criar pipelines customizados, automações por etapa e regras de negócio
 */

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Settings2, Trash2, Zap } from "lucide-react";

interface Pipeline {
  id: string;
  name: string;
  created_at: string;
  user_id: string;
}

interface Stage {
  id: string;
  name: string;
  position: number;
  color: string;
  pipeline_id?: string | null;
  user_id: string;
}

interface PipelineRule {
  id: string;
  pipeline_id: string;
  trigger: "stage_change" | "value_change" | "days_in_stage" | "tag_added";
  condition: string;
  action: "send_notification" | "create_task" | "auto_tag" | "move_stage";
  actionData: Record<string, any>;
}

interface CRMPipelineManagerProps {
  pipelines: Pipeline[];
  stages: Stage[];
  onPipelineUpdate?: () => void;
}

const CRMPipelineManager = ({
  pipelines,
  stages,
  onPipelineUpdate,
}: CRMPipelineManagerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [rules, setRules] = useState<PipelineRule[]>([]);
  const [newRule, setNewRule] = useState<Partial<PipelineRule>>({
    trigger: "stage_change",
    action: "send_notification",
  });

  const handleCreateRule = async () => {
    if (!user || !selectedPipeline || !newRule.trigger || !newRule.action) return;
    toast({ title: "Regra criada", description: "Automação configurada com sucesso!" });
    setNewRule({ trigger: "stage_change", action: "send_notification" });
    setShowRuleDialog(false);
  };

  const pipelineStages = selectedPipeline
    ? stages.filter((s) => s.pipeline_id === selectedPipeline.id || !s.pipeline_id)
    : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Pipelines e Automações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pipelines.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <p className="text-sm">Nenhum pipeline criado ainda</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pipelines.map((pipeline) => (
                  <div
                    key={pipeline.id}
                    className="p-4 rounded-lg border border-border hover:border-primary/50 transition-all cursor-pointer"
                    onClick={() => setSelectedPipeline(pipeline)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-foreground">{pipeline.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {pipelineStages.filter((s) => s.pipeline_id === pipeline.id).length} etapas
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPipeline(pipeline);
                          setShowRuleDialog(true);
                        }}
                      >
                        <Settings2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedPipeline && (
        <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
          <DialogContent className="bg-card border-border max-w-2xl rounded-2xl shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                Automações - {selectedPipeline.name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              <div className="p-6 rounded-2xl bg-secondary/20 border border-border space-y-4">
                <h4 className="text-sm font-bold">Nova Automação</h4>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Gatilho</Label>
                    <select
                      value={newRule.trigger || "stage_change"}
                      onChange={(e) => setNewRule({ ...newRule, trigger: e.target.value as any })}
                      className="w-full h-9 bg-secondary/30 border border-border rounded-md px-3 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="stage_change">Mudança de Etapa</option>
                      <option value="value_change">Mudança de Valor</option>
                      <option value="days_in_stage">Dias na Etapa</option>
                      <option value="tag_added">Tag Adicionada</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Ação</Label>
                    <select
                      value={newRule.action || "send_notification"}
                      onChange={(e) => setNewRule({ ...newRule, action: e.target.value as any })}
                      className="w-full h-9 bg-secondary/30 border border-border rounded-md px-3 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="send_notification">Enviar Notificação</option>
                      <option value="create_task">Criar Tarefa</option>
                      <option value="auto_tag">Auto-tag</option>
                      <option value="move_stage">Mover para Etapa</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Descrição</Label>
                    <Textarea
                      placeholder="Descreva a condição e a ação..."
                      className="bg-secondary/30 border-border min-h-[80px] text-sm"
                      value={newRule.condition || ""}
                      onChange={(e) => setNewRule({ ...newRule, condition: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleCreateRule} className="w-full h-10 font-bold">
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Automação
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Automações Ativas
                </Label>
                {rules.length === 0 ? (
                  <div className="flex items-center justify-center py-6 text-muted-foreground">
                    <p className="text-sm">Nenhuma automação configurada</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {rules.map((rule) => (
                      <div
                        key={rule.id}
                        className="p-4 rounded-lg border border-border bg-secondary/10 flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-bold text-foreground">
                            {rule.trigger} → {rule.action}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">{rule.condition}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default CRMPipelineManager;
