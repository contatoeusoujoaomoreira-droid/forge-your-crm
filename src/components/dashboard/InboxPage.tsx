import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Send, Bot, User, Search, MessageCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Client { id: string; name: string | null; phone: string | null; lead_id: string | null; }
interface Message { id: string; client_id: string | null; direction: string; content: string | null; created_at: string; agent_id?: string | null; }
interface ConvState { id: string; client_id: string; ai_active: boolean; mode: string; assigned_agent_id: string | null; }

export default function InboxPage() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [convState, setConvState] = useState<ConvState | null>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [copilotSugs, setCopilotSugs] = useState<string[]>([]);
  const [loadingCopilot, setLoadingCopilot] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load clients
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("chat_clients").select("*").eq("user_id", user.id).order("updated_at", { ascending: false });
      setClients(data || []);
      const { data: ag } = await supabase.from("ai_agents").select("*").eq("user_id", user.id).eq("is_active", true);
      setAgents(ag || []);
    })();

    const ch = supabase.channel("inbox-msgs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `user_id=eq.${user.id}` }, (p) => {
        const m = p.new as Message;
        if (m.client_id === selectedId) setMessages(prev => [...prev, m]);
        // refresh client order
        supabase.from("chat_clients").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).then(r => setClients(r.data || []));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, selectedId]);

  // Load messages + state when client changes
  useEffect(() => {
    if (!selectedId) { setMessages([]); setConvState(null); return; }
    (async () => {
      const { data: msgs } = await supabase.from("messages").select("*").eq("client_id", selectedId).order("created_at", { ascending: true }).limit(200);
      setMessages(msgs || []);
      const { data: st } = await supabase.from("conversation_state").select("*").eq("client_id", selectedId).maybeSingle();
      if (st) setConvState(st);
      else if (user) {
        const { data: created } = await supabase.from("conversation_state").insert({ user_id: user.id, client_id: selectedId, ai_active: true, mode: "ai" }).select().single();
        if (created) setConvState(created);
      }
    })();
  }, [selectedId, user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

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
  };

  const setAgent = async (agentId: string) => {
    if (!convState) return;
    await supabase.from("conversation_state").update({ assigned_agent_id: agentId }).eq("id", convState.id);
    setConvState({ ...convState, assigned_agent_id: agentId });
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

  const filtered = clients.filter(c => !search || (c.name || "").toLowerCase().includes(search.toLowerCase()) || (c.phone || "").includes(search));
  const selected = clients.find(c => c.id === selectedId);

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-3">
      {/* List */}
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
            <div className="p-3 border-b border-border flex items-center justify-between">
              <div>
                <p className="font-medium">{selected.name || selected.phone}</p>
                <p className="text-xs text-muted-foreground">{selected.phone}</p>
              </div>
              <Badge variant={convState?.ai_active ? "default" : "secondary"}>
                {convState?.ai_active ? <><Bot className="h-3 w-3 mr-1" />IA Ativa</> : <><User className="h-3 w-3 mr-1" />Humano</>}
              </Badge>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${m.direction === "outbound" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                    {m.content}
                    <p className={`text-[10px] mt-1 opacity-60`}>{new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}{m.agent_id ? " · 🤖" : ""}</p>
                  </div>
                </div>
              ))}
            </div>
            {copilotSugs.length > 0 && (
              <div className="px-3 py-2 border-t border-border bg-secondary/30 space-y-1">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground">Copiloto sugere:</p>
                {copilotSugs.map((s, i) => (
                  <button key={i} onClick={() => { setInput(s); setCopilotSugs([]); }} className="block w-full text-left text-xs p-2 rounded bg-background hover:bg-primary/10">{s}</button>
                ))}
              </div>
            )}
            <div className="p-3 border-t border-border flex gap-2">
              <Button size="icon" variant="outline" onClick={askCopilot} disabled={loadingCopilot} title="Modo Copiloto">
                <Sparkles className="h-4 w-4" />
              </Button>
              <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Digite uma mensagem..." />
              <Button onClick={send}><Send className="h-4 w-4" /></Button>
            </div>
          </>
        )}
      </Card>

      {/* Sidebar */}
      {selected && (
        <Card className="w-72 p-4 space-y-4">
          <div>
            <p className="text-xs uppercase font-semibold text-muted-foreground mb-2">Controle IA</p>
            <div className="flex items-center gap-2">
              <Switch checked={convState?.ai_active || false} onCheckedChange={toggleAi} />
              <Label className="text-sm">IA responde automaticamente</Label>
            </div>
          </div>
          <div>
            <Label className="text-xs">Agente atribuído</Label>
            <select className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm mt-1" value={convState?.assigned_agent_id || ""} onChange={(e) => setAgent(e.target.value)}>
              <option value="">Padrão (primeiro ativo)</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
            </select>
          </div>
          {selected.lead_id && (
            <div>
              <Badge variant="outline">Lead vinculado</Badge>
            </div>
          )}
          <p className="text-xs text-muted-foreground border-t border-border pt-3">
            Quando IA está ativa, agentes respondem automaticamente. Desative para assumir manualmente. Use o botão ✨ para receber sugestões em modo copiloto.
          </p>
        </Card>
      )}
    </div>
  );
}
