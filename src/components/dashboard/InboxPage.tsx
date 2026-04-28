import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Send, Bot, User, Search, MessageCircle, Sparkles, GitBranch, Tag, ExternalLink, UserCheck, StickyNote, Users as UsersIcon, DollarSign, X, Paperclip, Mic, Check, CheckCheck, FileText, Smile, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface Client { id: string; name: string | null; phone: string | null; lead_id: string | null; tags?: string[] | null; metadata?: any; updated_at?: string; }
interface Message { id: string; client_id: string | null; direction: string; content: string | null; created_at: string; agent_id?: string | null; external_message_id?: string | null; media_url?: string | null; media_type?: string | null; status?: string | null; metadata?: any; is_read?: boolean; }
interface ConvState { id: string; client_id: string; ai_active: boolean; mode: string; assigned_agent_id: string | null; assigned_user_id: string | null; marked_unread?: boolean; pinned?: boolean; }

type FilterTab = "all" | "unread" | "waiting" | "individual" | "groups";

const byCreatedAt = (a: Message, b: Message) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime();

export default function InboxPage() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [convState, setConvState] = useState<ConvState | null>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [lead, setLead] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [copilotSugs, setCopilotSugs] = useState<string[]>([]);
  const [loadingCopilot, setLoadingCopilot] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [noteInput, setNoteInput] = useState("");
  const [composeMode, setComposeMode] = useState<"reply" | "note">("reply");
  const [avgTicket, setAvgTicket] = useState<number>(0);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [unreadByClient, setUnreadByClient] = useState<Record<string, number>>({});
  const [showSidebarMobile, setShowSidebarMobile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initial load
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: cs }, { data: ag }, { data: pls }, { data: sts }, { data: tm }, { data: orders }] = await Promise.all([
        supabase.from("chat_clients").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }),
        supabase.from("ai_agents").select("*").eq("user_id", user.id).eq("is_active", true),
        supabase.from("pipelines").select("*").eq("user_id", user.id),
        supabase.from("pipeline_stages").select("*").eq("user_id", user.id).order("position"),
        supabase.from("team_members").select("*").eq("owner_user_id", user.id).eq("is_active", true),
        supabase.from("orders").select("total").eq("status", "paid").limit(500),
      ]);
      setClients(cs || []); setAgents(ag || []); setPipelines(pls || []); setStages(sts || []);
      setTeamMembers(tm || []);
      const totals = (orders || []).map((o: any) => Number(o.total || 0)).filter((n: number) => n > 0);
      setAvgTicket(totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : 0);
    })();
  }, [user]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("inbox-msgs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `user_id=eq.${user.id}` }, (p) => {
        const m = p.new as Message;
        if (m.client_id === selectedId) {
          setMessages(prev => prev.some(x => x.id === m.id || (!!m.external_message_id && x.external_message_id === m.external_message_id))
            ? prev
            : [...prev, m].sort(byCreatedAt));
        }
        supabase.from("chat_clients").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).then(r => setClients(r.data || []));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_clients", filter: `user_id=eq.${user.id}` }, (p) => {
        const c = p.new as Client;
        setClients(prev => prev.some(x => x.id === c.id) ? prev : [c, ...prev]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_clients", filter: `user_id=eq.${user.id}` }, (p) => {
        const c = p.new as Client;
        setClients(prev => [c, ...prev.filter(x => x.id !== c.id)]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, selectedId]);

  // Load when conversation changes
  useEffect(() => {
    if (!selectedId) { setMessages([]); setConvState(null); setLead(null); setActivities([]); return; }
    (async () => {
      const { data: msgs } = await supabase.from("messages").select("*").eq("client_id", selectedId).order("created_at", { ascending: false }).limit(300);
      setMessages(((msgs || []) as Message[]).sort(byCreatedAt));
      const { data: st } = await supabase.from("conversation_state").select("*").eq("client_id", selectedId).maybeSingle();
      if (st) setConvState(st as any);
      else if (user) {
        const { data: created } = await supabase.from("conversation_state").insert({ user_id: user.id, client_id: selectedId, ai_active: true, mode: "ai" }).select().single();
        if (created) setConvState(created as any);
      }
      const cli = clients.find(c => c.id === selectedId);
      if (cli?.lead_id) {
        const [{ data: ld }, { data: acts }] = await Promise.all([
          supabase.from("leads").select("*").eq("id", cli.lead_id).maybeSingle(),
          supabase.from("activities").select("*").eq("lead_id", cli.lead_id).order("created_at", { ascending: false }).limit(20),
        ]);
        setLead(ld);
        setActivities(acts || []);
      } else {
        setLead(null);
        setActivities([]);
      }
    })();
  }, [selectedId, user, clients]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || !selectedId) return;
    const text = input.trim();
    setInput("");
    const { data, error } = await supabase.functions.invoke("send-whatsapp", { body: { client_id: selectedId, content: text } });
    if (error) toast.error(error.message);
    else if (!data?.external_sent && data?.external_error) toast.warning(`Salva localmente. WhatsApp: ${data.external_error}`);
  };

  const toggleAi = async (active: boolean) => {
    if (!convState) return;
    await supabase.from("conversation_state").update({ ai_active: active, mode: active ? "ai" : "human" }).eq("id", convState.id);
    setConvState({ ...convState, ai_active: active, mode: active ? "ai" : "human" });
    toast.success(active ? "IA ativada para esta conversa" : "IA pausada — assumindo manualmente");
  };

  const setAgent = async (agentId: string) => {
    if (!convState) return;
    await supabase.from("conversation_state").update({ assigned_agent_id: agentId || null }).eq("id", convState.id);
    setConvState({ ...convState, assigned_agent_id: agentId || null });
  };

  const createLeadFromClient = async () => {
    const cli = clients.find(c => c.id === selectedId);
    if (!cli || !user) return;
    const firstStage = stages[0];
    const { data: newLead, error } = await supabase.from("leads").insert({
      user_id: user.id, name: cli.name || cli.phone || "Sem nome", phone: cli.phone,
      stage_id: firstStage?.id, source: "whatsapp_chat", status: "new",
    } as any).select().single();
    if (error) { toast.error(error.message); return; }
    await supabase.from("chat_clients").update({ lead_id: (newLead as any).id }).eq("id", cli.id);
    setLead(newLead);
    setClients(clients.map(c => c.id === cli.id ? { ...c, lead_id: (newLead as any).id } : c));
    toast.success("Lead criado e vinculado ao CRM");
  };

  const movePipeline = async (pipelineId: string) => {
    if (!lead) return;
    const firstStage = stages.find(s => s.pipeline_id === pipelineId);
    await supabase.from("leads").update({ pipeline_id: pipelineId, stage_id: firstStage?.id || null } as any).eq("id", lead.id);
    setLead({ ...lead, pipeline_id: pipelineId, stage_id: firstStage?.id });
    toast.success("Pipeline atualizado");
  };
  const moveStage = async (stageId: string) => {
    if (!lead) return;
    await supabase.from("leads").update({ stage_id: stageId } as any).eq("id", lead.id);
    setLead({ ...lead, stage_id: stageId });
    toast.success("Etapa atualizada");
  };

  const addTag = async () => {
    if (!lead || !tagInput.trim()) return;
    const next = Array.from(new Set([...(lead.tags || []), tagInput.trim()]));
    await supabase.from("leads").update({ tags: next } as any).eq("id", lead.id);
    setLead({ ...lead, tags: next });
    setTagInput("");
  };
  const removeTag = async (t: string) => {
    if (!lead) return;
    const next = (lead.tags || []).filter((x: string) => x !== t);
    await supabase.from("leads").update({ tags: next } as any).eq("id", lead.id);
    setLead({ ...lead, tags: next });
  };

  const askCopilot = async () => {
    if (!selectedId) return;
    setLoadingCopilot(true);
    const history = messages.slice(-10).map(m => ({ role: m.direction === "inbound" ? "user" as const : "assistant" as const, content: m.content || "" }));
    const { data } = await supabase.functions.invoke("ai-agent", { body: { messages: history, mode: "copilot" } });
    setLoadingCopilot(false);
    if (data?.content) {
      const sugs = data.content.split("\n").map((s: string) => s.replace(/^[•\-\*]\s*/, "").trim()).filter(Boolean).slice(0, 3);
      setCopilotSugs(sugs);
    }
  };

  const addInternalNote = async () => {
    if (!noteInput.trim() || !selectedId || !user) return;
    const text = noteInput.trim();
    setNoteInput("");
    const { data, error } = await supabase.from("messages").insert({
      user_id: user.id, client_id: selectedId, lead_id: lead?.id || null,
      content: text, direction: "outbound", channel: "internal",
      is_internal_note: true, status: "sent",
    }).select().single();
    if (error) { toast.error(error.message); return; }
    if (data) setMessages(prev => [...prev, data as any].sort(byCreatedAt));
    if (lead?.id) {
      await supabase.from("activities").insert({
        user_id: user.id, lead_id: lead.id, type: "note", description: `Nota interna: ${text}`,
      });
    }
    toast.success("Nota interna adicionada");
  };

  const transferTo = async (memberUserId: string) => {
    if (!convState) return;
    await supabase.from("conversation_state").update({
      assigned_user_id: memberUserId || null,
      ai_active: false, mode: "human",
    }).eq("id", convState.id);
    setConvState({ ...convState, assigned_user_id: memberUserId || null, ai_active: false, mode: "human" } as any);
    const member = teamMembers.find(m => m.member_user_id === memberUserId);
    toast.success(`Conversa transferida${member ? ` para ${member.full_name || member.member_email}` : ""}. IA pausada.`);
  };

  const onComposerKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); composeMode === "note" ? addInternalNote() : send(); }
    if (e.altKey && e.key.toLowerCase() === "n") { e.preventDefault(); setComposeMode(m => m === "note" ? "reply" : "note"); }
  };

  const filtered = clients.filter(c => !search || (c.name || "").toLowerCase().includes(search.toLowerCase()) || (c.phone || "").includes(search));
  const selected = clients.find(c => c.id === selectedId);
  const currentStages = stages.filter(s => !lead?.pipeline_id || s.pipeline_id === lead.pipeline_id);
  const isClient = (lead?.tags || []).some((t: string) => t.toLowerCase() === "cliente") || lead?.status === "won";

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-3">
      {/* Conversations list */}
      <Card className="w-72 flex flex-col">
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Buscar conversa..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
              Nenhuma conversa.<br /><span className="text-xs">Conecte WhatsApp em Automação.</span>
            </div>
          ) : filtered.map(c => (
            <button key={c.id} onClick={() => setSelectedId(c.id)}
              className={`w-full text-left p-3 border-b border-border hover:bg-secondary/50 ${selectedId === c.id ? "bg-secondary" : ""}`}>
              <p className="font-medium text-sm truncate">{c.name || c.phone}</p>
              <p className="text-xs text-muted-foreground truncate">{c.phone}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Chat */}
      <Card className="flex-1 flex flex-col">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Selecione uma conversa
          </div>
        ) : (
          <>
            <div className="p-3 border-b border-border flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{selected.name || selected.phone}</p>
                  <Badge variant={isClient ? "default" : "secondary"} className="text-[10px]">
                    {isClient ? "Cliente" : "Novo"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{selected.phone}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {avgTicket > 0 && (
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <DollarSign className="h-3 w-3" />
                    Ticket médio R$ {avgTicket.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                  </Badge>
                )}
                <Badge variant={convState?.ai_active ? "default" : "secondary"}>
                  {convState?.ai_active ? <><Bot className="h-3 w-3 mr-1" />IA</> : <><User className="h-3 w-3 mr-1" />Humano</>}
                </Badge>
              </div>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.map(m => {
                const isOut = m.direction === "outbound";
                const isNote = (m as any).is_internal_note === true || (m as any).channel === "internal";
                const transcript = m.metadata?.transcript;
                const imgDesc = m.metadata?.image_description;
                if (isNote) {
                  return (
                    <div key={m.id} className="flex justify-center">
                      <div className="max-w-[85%] rounded-lg px-3 py-2 text-xs bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200">
                        <div className="flex items-center gap-1 mb-1 text-[10px] uppercase font-bold opacity-70">
                          <StickyNote className="h-3 w-3" /> Nota interna
                        </div>
                        <p className="whitespace-pre-wrap">{m.content}</p>
                        <p className="text-[10px] mt-1 opacity-60">{new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={m.id} className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${isOut ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                      {m.media_type === "audio" && m.media_url && (
                        <audio controls src={m.media_url} className="max-w-full mb-1" preload="none" />
                      )}
                      {m.media_type === "image" && m.media_url && (
                        <img src={m.media_url} alt="" className="rounded mb-1 max-h-64 object-contain" loading="lazy" />
                      )}
                      {m.media_type === "video" && m.media_url && (
                        <video controls src={m.media_url} className="rounded mb-1 max-h-64" preload="none" />
                      )}
                      {m.media_type === "document" && m.media_url && (
                        <a href={m.media_url} target="_blank" rel="noreferrer" className="underline text-xs flex items-center gap-1 mb-1">📎 Abrir documento</a>
                      )}
                      {transcript && (
                        <p className="text-[11px] italic opacity-80 mb-1">📝 "{transcript}"</p>
                      )}
                      {imgDesc && (
                        <p className="text-[11px] italic opacity-80 mb-1">🖼️ {imgDesc}</p>
                      )}
                      {m.content && <p className="whitespace-pre-wrap">{m.content}</p>}
                      <p className="text-[10px] mt-1 opacity-60 flex items-center gap-1">
                        {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        {m.agent_id ? " · 🤖" : ""}
                        {m.metadata?.sent_from_phone && <span className="ml-1 text-[9px] px-1 py-0.5 rounded bg-background/30">📱 do celular</span>}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            {copilotSugs.length > 0 && (
              <div className="px-3 py-2 border-t border-border bg-secondary/30 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">✨ Copiloto sugere:</p>
                  <button
                    onClick={() => setCopilotSugs([])}
                    title="Esconder sugestões"
                    className="text-muted-foreground hover:text-foreground p-0.5 rounded hover:bg-background"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {copilotSugs.map((s, i) => (
                  <button key={i} onClick={() => { setInput(s); setCopilotSugs([]); }} className="block w-full text-left text-xs p-2 rounded bg-background hover:bg-primary/10">{s}</button>
                ))}
              </div>
            )}
            <div className="border-t border-border">
              <div className="px-3 pt-2 flex items-center gap-1">
                <button
                  onClick={() => setComposeMode("reply")}
                  className={`text-[11px] px-2 py-1 rounded ${composeMode === "reply" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}
                >Responder</button>
                <button
                  onClick={() => setComposeMode("note")}
                  className={`text-[11px] px-2 py-1 rounded flex items-center gap-1 ${composeMode === "note" ? "bg-amber-500 text-white" : "text-muted-foreground hover:bg-secondary"}`}
                >
                  <StickyNote className="h-3 w-3" /> Nota interna
                </button>
                <span className="text-[10px] text-muted-foreground ml-auto hidden md:block">
                  Enter envia · Alt+N alterna · ✨ copiloto
                </span>
              </div>
              <div className="p-3 flex gap-2">
                <Button size="icon" variant="outline" onClick={askCopilot} disabled={loadingCopilot} title="Modo Copiloto">
                  <Sparkles className="h-4 w-4" />
                </Button>
                {composeMode === "note" ? (
                  <>
                    <Input
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      onKeyDown={onComposerKey}
                      placeholder="Nota interna (visível apenas para sua equipe)..."
                      className="border-amber-500/40 focus-visible:ring-amber-500"
                    />
                    <Button onClick={addInternalNote} variant="secondary" className="bg-amber-500 hover:bg-amber-600 text-white">
                      <StickyNote className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={onComposerKey}
                      placeholder="Digite uma mensagem..."
                    />
                    <Button onClick={send}><Send className="h-4 w-4" /></Button>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Sidebar */}
      {selected && (
        <Card className="w-80 p-4 space-y-4 overflow-y-auto">
          {/* Lead linkage */}
          <div>
            <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">Lead Vinculado</p>
            {lead ? (
              <div className="space-y-1">
                <p className="text-sm font-medium">{lead.name}</p>
                <p className="text-xs text-muted-foreground">R$ {Number(lead.value || 0).toLocaleString("pt-BR")}</p>
                <Button size="sm" variant="outline" className="w-full mt-1" onClick={() => window.location.href = `/dashboard?tab=crm`}>
                  <ExternalLink className="h-3 w-3 mr-1" />Ver no Pipeline
                </Button>
              </div>
            ) : (
              <Button size="sm" className="w-full" onClick={createLeadFromClient}>
                <UserCheck className="h-3 w-3 mr-1" />Criar lead no CRM
              </Button>
            )}
          </div>

          {/* Pipeline transfer */}
          {lead && (
            <div className="border-t border-border pt-3 space-y-2">
              <p className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1"><GitBranch className="h-3 w-3" />Transferir para pipeline</p>
              <select className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm"
                value={lead.pipeline_id || ""} onChange={(e) => movePipeline(e.target.value)}>
                <option value="">Pipeline padrão</option>
                {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <Label className="text-xs">Mover para etapa</Label>
              <select className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm"
                value={lead.stage_id || ""} onChange={(e) => moveStage(e.target.value)}>
                <option value="">Selecione...</option>
                {currentStages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          {/* AI control */}
          <div className="border-t border-border pt-3 space-y-2">
            <p className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1"><Bot className="h-3 w-3" />Automação & IA</p>
            <div className="flex items-center justify-between p-2 rounded-md bg-secondary/40">
              <Label className="text-sm flex flex-col">
                <span>IA Ativa</span>
                <span className="text-[10px] text-muted-foreground font-normal">Agentes podem responder</span>
              </Label>
              <Switch checked={convState?.ai_active || false} onCheckedChange={toggleAi} />
            </div>
            <Label className="text-xs">Agente atribuído</Label>
            <select className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm"
              value={convState?.assigned_agent_id || ""} onChange={(e) => setAgent(e.target.value)}>
              <option value="">Padrão (primeiro ativo)</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
            </select>
          </div>

          {/* Transfer conversation */}
          <div className="border-t border-border pt-3 space-y-2">
            <p className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
              <UsersIcon className="h-3 w-3" /> Transferir Conversa
            </p>
            {teamMembers.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                Sem atendentes ativos. Convide em <strong>Configurações → Equipe</strong>.
              </p>
            ) : (
              <select
                className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm"
                value={convState?.assigned_user_id || ""}
                onChange={(e) => transferTo(e.target.value)}
              >
                <option value="">— Sem atendente atribuído —</option>
                {teamMembers.filter(m => !!m.member_user_id).map((m: any) => (
                  <option key={m.id} value={m.member_user_id}>
                    {m.full_name || m.member_email}
                  </option>
                ))}
              </select>
            )}
            <p className="text-[10px] text-muted-foreground">Transferir pausa a IA e atribui a conversa ao atendente.</p>
          </div>

          {/* Tags */}
          {lead && (
            <div className="border-t border-border pt-3 space-y-2">
              <p className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1"><Tag className="h-3 w-3" />Tags</p>
              <div className="flex flex-wrap gap-1">
                {(lead.tags || []).map((t: string) => (
                  <Badge key={t} variant="secondary" className="cursor-pointer" onClick={() => removeTag(t)}>{t} ×</Badge>
                ))}
              </div>
              <div className="flex gap-1">
                <Input className="h-8" placeholder="Nova tag..." value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTag()} />
                <Button size="sm" variant="outline" onClick={addTag}>+</Button>
              </div>
            </div>
          )}

          {/* Activity timeline */}
          {lead && (
            <div className="border-t border-border pt-3 space-y-2">
              <p className="text-[10px] uppercase font-semibold text-muted-foreground">Atividade</p>
              {activities.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">Sem atividades ainda.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {activities.map(a => (
                    <div key={a.id} className="text-[11px] border-l-2 border-primary/40 pl-2 py-0.5">
                      <p className="text-foreground line-clamp-2">{a.description}</p>
                      <p className="text-muted-foreground/70">{new Date(a.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <p className="text-[10px] text-muted-foreground border-t border-border pt-3">
            Quando IA está ativa, agentes respondem automaticamente. Desative para assumir manualmente. Use o botão ✨ para sugestões em modo copiloto.
          </p>
        </Card>
      )}
    </div>
  );
}
