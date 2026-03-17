import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Send, Bot, User, Loader2, Save, Eye, Code,
  Monitor, Tablet, Smartphone, Sparkles,
} from "lucide-react";

interface Props {
  onPageCreated: (pageId: string) => void;
  onBack: () => void;
}

type Message = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-landing-page`;

function extractHtmlFromMarkdown(text: string): string | null {
  const match = text.match(/```html\s*([\s\S]*?)```/);
  if (match) return match[1].trim();
  // Try to detect raw HTML
  if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) return text.trim();
  return null;
}

const AIPageGenerator = ({ onPageCreated, onBack }: Props) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [savingPage, setSavingPage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Update iframe when previewHtml changes
  useEffect(() => {
    if (iframeRef.current && previewHtml) {
      const doc = iframeRef.current.contentDocument;
      if (doc) { doc.open(); doc.write(previewHtml); doc.close(); }
    }
  }, [previewHtml, showPreview]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Check if response contains HTML
      const html = extractHtmlFromMarkdown(assistantContent);
      if (html) {
        setPreviewHtml(html);
        setShowPreview(true);
      }
    } catch (e: any) {
      toast({ title: e.message || "Erro ao gerar página", variant: "destructive" });
      setMessages((prev) => [...prev, { role: "assistant", content: `❌ Erro: ${e.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAsPage = async () => {
    if (!previewHtml) return;
    setSavingPage(true);
    const slug = "ai-page-" + Date.now().toString(36);
    const { data, error } = await supabase.from("landing_pages").insert({
      title: "Página gerada com IA",
      slug,
      is_published: false,
      html_content: previewHtml,
    } as any).select("id").single();
    setSavingPage(false);
    if (error) {
      toast({ title: error.message, variant: "destructive" });
    } else {
      toast({ title: "Página salva! Abrindo no editor..." });
      onPageCreated(data.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const previewWidth = previewDevice === "mobile" ? "375px" : previewDevice === "tablet" ? "768px" : "100%";

  const suggestions = [
    "Crie uma landing page de alta conversão para um curso de marketing digital",
    "Crie uma página para uma agência de design com estilo minimalista",
    "Crie uma squeeze page para capturar emails com tema escuro e neon",
    "Crie uma página de vendas de um e-book com urgência e escassez",
  ];

  return (
    <div className="h-[calc(100vh-3.5rem)] flex" style={{ background: "#0a0a0a" }}>
      {/* Chat Panel */}
      <div className="flex flex-col" style={{ width: showPreview ? "420px" : "100%", maxWidth: showPreview ? "420px" : "800px", margin: showPreview ? 0 : "0 auto", borderRight: showPreview ? "1px solid #1a1a1a" : "none" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid #1a1a1a" }}>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack} className="h-7 px-2" style={{ color: "white" }}>
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #84CC16, #22d3ee)" }}>
                <Sparkles className="h-4 w-4" style={{ color: "#000" }} />
              </div>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: "white" }}>Forge AI Builder</h3>
                <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>Descreva a página que deseja criar</p>
              </div>
            </div>
          </div>
          {previewHtml && (
            <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)} className="h-7" style={{ color: "#a3e635" }}>
              <Eye className="h-3.5 w-3.5 mr-1" /> {showPreview ? "Ocultar" : "Preview"}
            </Button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-6 py-8">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #84CC16, #22d3ee)" }}>
                <Sparkles className="h-8 w-8" style={{ color: "#000" }} />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold mb-2" style={{ color: "white" }}>Crie páginas com IA</h3>
                <p className="text-sm max-w-md" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Descreva o tipo de landing page, site ou página que deseja criar. A IA vai gerar o HTML completo para você.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 w-full max-w-md">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(s); inputRef.current?.focus(); }}
                    className="text-left px-4 py-3 rounded-lg text-xs transition-all"
                    style={{ background: "#151515", border: "1px solid #2a2a2a", color: "rgba(255,255,255,0.7)" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "#84CC16")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "#2a2a2a")}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-1" style={{ background: "linear-gradient(135deg, #84CC16, #22d3ee)" }}>
                  <Bot className="h-3.5 w-3.5" style={{ color: "#000" }} />
                </div>
              )}
              <div
                className="max-w-[85%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap"
                style={{
                  background: msg.role === "user" ? "#84CC16" : "#1a1a1a",
                  color: msg.role === "user" ? "#000" : "rgba(255,255,255,0.9)",
                  border: msg.role === "assistant" ? "1px solid #2a2a2a" : "none",
                }}
              >
                {msg.content.replace(/```html[\s\S]*?```/g, "📄 [Código HTML gerado — veja no preview →]")}
              </div>
              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-1" style={{ background: "#333" }}>
                  <User className="h-3.5 w-3.5" style={{ color: "white" }} />
                </div>
              )}
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #84CC16, #22d3ee)" }}>
                <Bot className="h-3.5 w-3.5" style={{ color: "#000" }} />
              </div>
              <div className="px-4 py-3 rounded-xl" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
                <Loader2 className="h-4 w-4 animate-spin" style={{ color: "#84CC16" }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4" style={{ borderTop: "1px solid #1a1a1a" }}>
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Descreva a página que deseja criar..."
              rows={1}
              className="flex-1 resize-none rounded-xl px-4 py-3 text-sm focus:outline-none"
              style={{
                background: "#151515",
                border: "1px solid #2a2a2a",
                color: "white",
                minHeight: "44px",
                maxHeight: "120px",
              }}
              onInput={(e) => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = "auto";
                t.style.height = Math.min(t.scrollHeight, 120) + "px";
              }}
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="h-11 w-11 rounded-xl shrink-0"
              style={{ background: "#84CC16", color: "#000" }}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Preview Panel */}
      {showPreview && previewHtml && (
        <div className="flex-1 flex flex-col" style={{ background: "#111" }}>
          <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: "1px solid #2a2a2a" }}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>PREVIEW</span>
              {(["desktop", "tablet", "mobile"] as const).map(d => (
                <button key={d} onClick={() => setPreviewDevice(d)} className="p-1 rounded" style={{ color: previewDevice === d ? "#a3e635" : "rgba(255,255,255,0.3)" }}>
                  {d === "desktop" ? <Monitor className="h-3.5 w-3.5" /> : d === "tablet" ? <Tablet className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>
            <Button size="sm" onClick={handleSaveAsPage} disabled={savingPage} className="h-7 font-semibold" style={{ background: "#84CC16", color: "#000" }}>
              <Save className="h-3.5 w-3.5 mr-1" /> {savingPage ? "Salvando..." : "Salvar & Editar"}
            </Button>
          </div>
          <div className="flex-1 flex items-start justify-center overflow-auto p-4">
            <iframe
              ref={iframeRef}
              title="Preview"
              className="bg-white rounded-lg shadow-2xl"
              style={{ width: previewWidth, height: "100%", border: "none" }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AIPageGenerator;
