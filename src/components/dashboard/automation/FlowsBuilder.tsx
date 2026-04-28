import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus, Trash2, GitBranch, MessageSquare, Menu as MenuIcon, MousePointerClick,
  Database, Sparkles, Clock, Hourglass, GitFork, Filter, Image as ImgIcon, X, Save, FileText,
} from "lucide-react";
import FlowTemplatesModal, { FlowTemplate } from "./FlowTemplatesModal";

const NODE_TYPES = [
  { id: "message", label: "Mensagem", icon: MessageSquare, color: "#3b82f6" },
  { id: "menu", label: "Menu", icon: MenuIcon, color: "#8b5cf6" },
  { id: "buttons", label: "Botões", icon: MousePointerClick, color: "#ec4899" },
  { id: "collect", label: "Coletar dado", icon: Database, color: "#f59e0b" },
  { id: "ai", label: "IA Contextual", icon: Sparkles, color: "#a855f7" },
  { id: "wait", label: "Espera", icon: Clock, color: "#06b6d4" },
  { id: "delay", label: "Delay Inteligente", icon: Hourglass, color: "#14b8a6" },
  { id: "condition", label: "Condição", icon: GitFork, color: "#84cc16" },
  { id: "filter", label: "Filtro UTM", icon: Filter, color: "#ef4444" },
  { id: "media", label: "Mídia", icon: ImgIcon, color: "#f97316" },
  { id: "crm", label: "Ação CRM", icon: GitBranch, color: "#22c55e" },
  { id: "end", label: "Fim", icon: X, color: "#6b7280" },
];

interface FlowNode {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  data: any;
}
interface FlowEdge { id: string; from: string; to: string; label?: string; }

export default function FlowsBuilder() {
  const { user } = useAuth();
  const [flows, setFlows] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draggingFrom, setDraggingFrom] = useState<string | null>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (!user) return;
    const [{ data }, { data: ag }, { data: st }] = await Promise.all([
      supabase.from("conversation_flows").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("ai_agents").select("id, name").eq("user_id", user.id),
      supabase.from("pipeline_stages").select("*").eq("user_id", user.id).order("position"),
    ]);
    setFlows(data || []);
    setAgents(ag || []);
    setStages(st || []);
  };
  useEffect(() => { load(); }, [user]);

  const newFlow = () => setEditing({
    name: "Novo Fluxo",
    description: "",
    is_active: true,
    nodes: [{ id: "start", type: "message", label: "Início", x: 100, y: 200, data: { content: "Olá! Como posso ajudar?" } }],
    edges: [],
    agent_id: null,
    trigger_keywords: "",
  });

  const save = async () => {
    if (!user || !editing.name) { toast.error("Nome obrigatório"); return; }
    const payload: any = { ...editing, user_id: user.id };
    delete payload.created_at; delete payload.updated_at;
    const result = editing.id
      ? await supabase.from("conversation_flows").update(payload).eq("id", editing.id)
      : await supabase.from("conversation_flows").insert(payload).select().single();
    if (result.error) { toast.error(result.error.message); return; }
    toast.success("Fluxo salvo");
    if (!editing.id && (result as any).data) setEditing({ ...(result as any).data });
    load();
  };

  const addNode = (type: string) => {
    const t = NODE_TYPES.find(n => n.id === type)!;
    const newNode: FlowNode = {
      id: `n_${Date.now()}`,
      type,
      label: t.label,
      x: 250 + Math.random() * 150,
      y: 200 + Math.random() * 100,
      data: getDefaultData(type),
    };
    setEditing({ ...editing, nodes: [...editing.nodes, newNode] });
    setShowAddPanel(false);
    setSelectedNode(newNode.id);
  };

  const getDefaultData = (type: string): any => {
    switch (type) {
      case "message": return { content: "Sua mensagem..." };
      case "menu": return { content: "Escolha uma opção:", options: ["Opção 1", "Opção 2"] };
      case "buttons": return { content: "", buttons: ["Sim", "Não"] };
      case "collect": return { variable: "nome", question: "Qual seu nome?" };
      case "ai": return { agent_id: "", prompt: "" };
      case "wait": return { seconds: 30 };
      case "delay": return { min: 5, max: 15 };
      case "condition": return { variable: "", operator: "equals", value: "" };
      case "filter": return { utm: "source", value: "" };
      case "media": return { url: "", caption: "" };
      case "crm": return { action: "move_stage", stage_id: "" };
      case "end": return {};
      default: return {};
    }
  };

  const updateNode = (id: string, patch: Partial<FlowNode>) => {
    setEditing({ ...editing, nodes: editing.nodes.map((n: FlowNode) => n.id === id ? { ...n, ...patch } : n) });
  };
  const updateNodeData = (id: string, dataPatch: any) => {
    setEditing({ ...editing, nodes: editing.nodes.map((n: FlowNode) => n.id === id ? { ...n, data: { ...n.data, ...dataPatch } } : n) });
  };
  const removeNode = (id: string) => {
    setEditing({
      ...editing,
      nodes: editing.nodes.filter((n: FlowNode) => n.id !== id),
      edges: editing.edges.filter((e: FlowEdge) => e.from !== id && e.to !== id),
    });
    setSelectedNode(null);
  };

  const onNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = editing.nodes.find((n: FlowNode) => n.id === nodeId);
    if (!node) return;
    dragOffset.current = { x: e.clientX - node.x, y: e.clientY - node.y };
    setDraggingNode(nodeId);
    setSelectedNode(nodeId);
  };
  const onCanvasMouseMove = (e: React.MouseEvent) => {
    if (draggingNode) {
      updateNode(draggingNode, { x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    }
  };
  const onCanvasMouseUp = () => { setDraggingNode(null); };

  const startConnection = (nodeId: string) => setDraggingFrom(nodeId);
  const completeConnection = (toId: string) => {
    if (!draggingFrom || draggingFrom === toId) { setDraggingFrom(null); return; }
    if (editing.edges.some((e: FlowEdge) => e.from === draggingFrom && e.to === toId)) { setDraggingFrom(null); return; }
    const newEdge: FlowEdge = { id: `e_${Date.now()}`, from: draggingFrom, to: toId };
    setEditing({ ...editing, edges: [...editing.edges, newEdge] });
    setDraggingFrom(null);
  };
  const removeEdge = (id: string) => setEditing({ ...editing, edges: editing.edges.filter((e: FlowEdge) => e.id !== id) });

  // ============ LIST VIEW ============
  if (!editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2"><GitBranch className="h-5 w-5 text-primary" />Fluxos de Conversa</h3>
            <p className="text-xs text-muted-foreground">Construa fluxos visuais com mensagens, condições, IA, coleta de dados e ações no CRM.</p>
          </div>
          <Button onClick={newFlow}><Plus className="h-4 w-4 mr-1" />Novo Fluxo</Button>
        </div>
        {flows.length === 0 ? (
          <Card className="p-12 text-center">
            <GitBranch className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum fluxo criado ainda</p>
            <Button className="mt-3" onClick={newFlow}><Plus className="h-4 w-4 mr-1" />Criar primeiro fluxo</Button>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {flows.map(f => (
              <Card key={f.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{f.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{f.description || "—"}</p>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      <Badge variant={f.is_active ? "default" : "secondary"}>{f.is_active ? "Ativo" : "Inativo"}</Badge>
                      <Badge variant="outline">{(f.nodes || []).length} nós</Badge>
                      {f.trigger_keywords && <Badge variant="outline">🔑 {f.trigger_keywords}</Badge>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button size="sm" variant="outline" onClick={() => setEditing(f)}>Editar</Button>
                    <Button size="sm" variant="ghost" onClick={async () => {
                      if (!confirm("Excluir fluxo?")) return;
                      await supabase.from("conversation_flows").delete().eq("id", f.id); load();
                    }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ============ EDITOR ============
  const selected = editing.nodes.find((n: FlowNode) => n.id === selectedNode);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <Card className="p-3 flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>← Voltar</Button>
        <Input className="w-48" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Nome do fluxo" />
        <Input className="flex-1 min-w-[200px]" placeholder="Palavras-chave (ativam o fluxo)" value={editing.trigger_keywords || ""} onChange={(e) => setEditing({ ...editing, trigger_keywords: e.target.value })} />
        <select className="h-9 px-2 rounded-md border border-input bg-background text-sm" value={editing.agent_id || ""} onChange={(e) => setEditing({ ...editing, agent_id: e.target.value || null })}>
          <option value="">Sem agente vinculado</option>
          {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <div className="flex items-center gap-1">
          <Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
          <Label className="text-xs">Ativo</Label>
        </div>
        <Button size="sm" onClick={() => setShowAddPanel(true)}><Plus className="h-4 w-4 mr-1" />Adicionar Nó</Button>
        <Button size="sm" onClick={save}><Save className="h-4 w-4 mr-1" />Salvar</Button>
      </Card>

      <div className="flex gap-3" style={{ height: "calc(100vh - 18rem)" }}>
        {/* Canvas */}
        <Card className="flex-1 relative overflow-hidden bg-[radial-gradient(circle,hsl(var(--border))_1px,transparent_1px)] [background-size:20px_20px]">
          <div
            ref={canvasRef}
            className="absolute inset-0 overflow-auto"
            onMouseMove={onCanvasMouseMove}
            onMouseUp={onCanvasMouseUp}
            onClick={() => { setSelectedNode(null); setDraggingFrom(null); }}
          >
            <svg className="absolute inset-0 pointer-events-none" style={{ width: "3000px", height: "2000px" }}>
              {editing.edges.map((e: FlowEdge) => {
                const from = editing.nodes.find((n: FlowNode) => n.id === e.from);
                const to = editing.nodes.find((n: FlowNode) => n.id === e.to);
                if (!from || !to) return null;
                const x1 = from.x + 90, y1 = from.y + 30;
                const x2 = to.x + 10, y2 = to.y + 30;
                const mx = (x1 + x2) / 2;
                return (
                  <g key={e.id} className="pointer-events-auto cursor-pointer" onClick={(ev) => { ev.stopPropagation(); if (confirm("Remover conexão?")) removeEdge(e.id); }}>
                    <path d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`} stroke="hsl(var(--primary))" strokeWidth="2" fill="none" strokeDasharray="4 2" />
                    <circle cx={x2} cy={y2} r="4" fill="hsl(var(--primary))" />
                  </g>
                );
              })}
            </svg>

            {editing.nodes.map((n: FlowNode) => {
              const t = NODE_TYPES.find(x => x.id === n.type) || NODE_TYPES[0];
              const Icon = t.icon;
              const isSel = selectedNode === n.id;
              return (
                <div
                  key={n.id}
                  className={`absolute rounded-xl border-2 bg-card shadow-md cursor-move select-none transition-shadow ${isSel ? "ring-2 ring-primary" : ""}`}
                  style={{ left: n.x, top: n.y, width: 180, borderColor: t.color }}
                  onMouseDown={(e) => onNodeMouseDown(e, n.id)}
                  onClick={(e) => { e.stopPropagation(); if (draggingFrom) completeConnection(n.id); else setSelectedNode(n.id); }}
                >
                  <div className="p-2 flex items-center gap-2 text-sm font-medium" style={{ color: t.color }}>
                    <Icon className="h-4 w-4" />
                    <span className="flex-1 truncate">{n.label}</span>
                  </div>
                  <div className="px-2 pb-2 text-[10px] text-muted-foreground line-clamp-2">
                    {n.data?.content || n.data?.question || n.data?.prompt || n.data?.variable || t.label}
                  </div>
                  {/* connector */}
                  <button
                    onClick={(e) => { e.stopPropagation(); startConnection(n.id); }}
                    className="absolute -right-2 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-primary border-2 border-background hover:scale-125 transition-transform"
                    title="Arrastar para conectar"
                  />
                </div>
              );
            })}

            {editing.nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                Clique em "Adicionar Nó" para começar
              </div>
            )}
          </div>

          {/* Add panel */}
          {showAddPanel && (
            <div className="absolute right-3 top-3 bg-card border border-border rounded-lg shadow-2xl w-56 z-20">
              <div className="flex items-center justify-between p-2 border-b border-border">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground">Adicionar Nó</p>
                <button onClick={() => setShowAddPanel(false)}><X className="h-3 w-3" /></button>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {NODE_TYPES.map(t => {
                  const Icon = t.icon;
                  return (
                    <button key={t.id} onClick={() => addNode(t.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary text-left">
                      <Icon className="h-4 w-4" style={{ color: t.color }} />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {draggingFrom && (
            <div className="absolute bottom-3 left-3 bg-primary text-primary-foreground px-3 py-1 rounded text-xs">
              Clique em outro nó para conectar · ESC para cancelar
            </div>
          )}
        </Card>

        {/* Inspector */}
        <Card className="w-72 p-3 overflow-y-auto">
          {!selected ? (
            <div className="text-xs text-muted-foreground text-center py-8">Selecione um nó para editar</div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase font-semibold text-muted-foreground">Editar Nó</p>
                <Button size="sm" variant="ghost" onClick={() => removeNode(selected.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
              <div>
                <Label className="text-xs">Rótulo</Label>
                <Input value={selected.label} onChange={(e) => updateNode(selected.id, { label: e.target.value })} />
              </div>

              {(selected.type === "message" || selected.type === "menu" || selected.type === "buttons") && (
                <div>
                  <Label className="text-xs">Texto</Label>
                  <Textarea rows={3} value={selected.data?.content || ""} onChange={(e) => updateNodeData(selected.id, { content: e.target.value })} />
                </div>
              )}
              {selected.type === "menu" && (
                <div>
                  <Label className="text-xs">Opções (uma por linha)</Label>
                  <Textarea rows={3} value={(selected.data?.options || []).join("\n")} onChange={(e) => updateNodeData(selected.id, { options: e.target.value.split("\n").filter(Boolean) })} />
                </div>
              )}
              {selected.type === "buttons" && (
                <div>
                  <Label className="text-xs">Botões (uma por linha)</Label>
                  <Textarea rows={3} value={(selected.data?.buttons || []).join("\n")} onChange={(e) => updateNodeData(selected.id, { buttons: e.target.value.split("\n").filter(Boolean) })} />
                </div>
              )}
              {selected.type === "collect" && (
                <>
                  <div><Label className="text-xs">Pergunta</Label><Input value={selected.data?.question || ""} onChange={(e) => updateNodeData(selected.id, { question: e.target.value })} /></div>
                  <div><Label className="text-xs">Variável (ex: nome, email)</Label><Input value={selected.data?.variable || ""} onChange={(e) => updateNodeData(selected.id, { variable: e.target.value })} /></div>
                </>
              )}
              {selected.type === "ai" && (
                <>
                  <div>
                    <Label className="text-xs">Agente IA</Label>
                    <select className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm" value={selected.data?.agent_id || ""} onChange={(e) => updateNodeData(selected.id, { agent_id: e.target.value })}>
                      <option value="">Padrão</option>
                      {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div><Label className="text-xs">Prompt extra</Label><Textarea rows={3} value={selected.data?.prompt || ""} onChange={(e) => updateNodeData(selected.id, { prompt: e.target.value })} /></div>
                </>
              )}
              {selected.type === "wait" && (
                <div><Label className="text-xs">Segundos</Label><Input type="number" value={selected.data?.seconds || 0} onChange={(e) => updateNodeData(selected.id, { seconds: Number(e.target.value) })} /></div>
              )}
              {selected.type === "delay" && (
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Min (s)</Label><Input type="number" value={selected.data?.min || 0} onChange={(e) => updateNodeData(selected.id, { min: Number(e.target.value) })} /></div>
                  <div><Label className="text-xs">Max (s)</Label><Input type="number" value={selected.data?.max || 0} onChange={(e) => updateNodeData(selected.id, { max: Number(e.target.value) })} /></div>
                </div>
              )}
              {selected.type === "condition" && (
                <>
                  <div><Label className="text-xs">Variável</Label><Input value={selected.data?.variable || ""} onChange={(e) => updateNodeData(selected.id, { variable: e.target.value })} /></div>
                  <div>
                    <Label className="text-xs">Operador</Label>
                    <select className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm" value={selected.data?.operator || "equals"} onChange={(e) => updateNodeData(selected.id, { operator: e.target.value })}>
                      <option value="equals">Igual</option><option value="contains">Contém</option><option value="not_contains">Não contém</option><option value="exists">Existe</option>
                    </select>
                  </div>
                  <div><Label className="text-xs">Valor</Label><Input value={selected.data?.value || ""} onChange={(e) => updateNodeData(selected.id, { value: e.target.value })} /></div>
                </>
              )}
              {selected.type === "filter" && (
                <>
                  <div><Label className="text-xs">UTM</Label><Input value={selected.data?.utm || "source"} onChange={(e) => updateNodeData(selected.id, { utm: e.target.value })} /></div>
                  <div><Label className="text-xs">Valor esperado</Label><Input value={selected.data?.value || ""} onChange={(e) => updateNodeData(selected.id, { value: e.target.value })} /></div>
                </>
              )}
              {selected.type === "media" && (
                <>
                  <div><Label className="text-xs">URL da Mídia</Label><Input value={selected.data?.url || ""} onChange={(e) => updateNodeData(selected.id, { url: e.target.value })} /></div>
                  <div><Label className="text-xs">Legenda</Label><Input value={selected.data?.caption || ""} onChange={(e) => updateNodeData(selected.id, { caption: e.target.value })} /></div>
                </>
              )}
              {selected.type === "crm" && (
                <>
                  <div>
                    <Label className="text-xs">Ação</Label>
                    <select className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm" value={selected.data?.action || "move_stage"} onChange={(e) => updateNodeData(selected.id, { action: e.target.value })}>
                      <option value="move_stage">Mover de etapa</option>
                      <option value="add_tag">Adicionar tag</option>
                      <option value="create_task">Criar tarefa</option>
                      <option value="notify">Notificar equipe</option>
                    </select>
                  </div>
                  {selected.data?.action === "move_stage" && (
                    <div>
                      <Label className="text-xs">Etapa</Label>
                      <select className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm" value={selected.data?.stage_id || ""} onChange={(e) => updateNodeData(selected.id, { stage_id: e.target.value })}>
                        <option value="">Selecione</option>
                        {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  )}
                  {selected.data?.action === "add_tag" && (
                    <div><Label className="text-xs">Tag</Label><Input value={selected.data?.tag || ""} onChange={(e) => updateNodeData(selected.id, { tag: e.target.value })} /></div>
                  )}
                </>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
