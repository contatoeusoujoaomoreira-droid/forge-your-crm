import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Send, Bot, User, Loader2, Save, Eye,
  Monitor, Tablet, Smartphone, Sparkles, Key, ChevronDown,
  Upload, Image, FileText, X,
} from "lucide-react";

interface Props {
  onPageCreated: (pageId: string) => void;
  onBack: () => void;
}

type Message = { role: "user" | "assistant"; content: string; attachments?: { type: string; name: string; url?: string }[] };

interface ApiKeyConfig {
  id: string;
  name: string;
  provider: string;
  key: string;
  isActive: boolean;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-landing-page`;

function extractHtmlFromMarkdown(text: string): string | null {
  const match = text.match(/```html\s*([\s\S]*?)```/);
  if (match) return match[1].trim();
  if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) return text.trim();
  return null;
}

function extractJsonSections(text: string): any[] | null {
  const match = text.match(/```json\s*([\s\S]*?)```/);
  if (match) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (Array.isArray(parsed)) return parsed;
      if (parsed.sections) return parsed.sections;
    } catch {}
  }
  return null;
}

const AIPageGenerator = ({ onPageCreated, onBack }: Props) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [generatedSections, setGeneratedSections] = useState<any[] | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [savingPage, setSavingPage] = useState(false);
  const [showKeySelector, setShowKeySelector] = useState(false);
  const [selectedKeyId, setSelectedKeyId] = useState<string>("builtin");
  const [apiKeys, setApiKeys] = useState<ApiKeyConfig[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [outputMode, setOutputMode] = useState<"html" | "sections">("sections");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const saved = localStorage.getItem("forge_api_keys");
    if (saved) {
      try { setApiKeys(JSON.parse(saved).filter((k: any) => k.isActive)); } catch {}
    }
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (iframeRef.current && previewHtml) {
      const doc = iframeRef.current.contentDocument;
      if (doc) { doc.open(); doc.write(previewHtml); doc.close(); }
    }
  }, [previewHtml, showPreview]);

  const getSelectedKeyInfo = () => {
    if (selectedKeyId === "builtin") return { name: "Forge AI (Nativo)", provider: "builtin" };
    const key = apiKeys.find(k => k.id === selectedKeyId);
    return key ? { name: key.name, provider: key.provider } : { name: "Forge AI (Nativo)", provider: "builtin" };
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files].slice(0, 5));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (idx: number) => setAttachments(prev => prev.filter((_, i) => i !== idx));

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const attachmentInfo = attachments.map(f => ({ type: f.type, name: f.name }));
    const userMsg: Message = { role: "user", content: input.trim(), attachments: attachmentInfo.length > 0 ? attachmentInfo : undefined };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setAttachments([]);
    setIsLoading(true);

    let assistantContent = "";

    const contextMessages = [...newMessages].map(m => ({ role: m.role, content: m.content }));
    const selectedKey = selectedKeyId !== "builtin" ? apiKeys.find(k => k.id === selectedKeyId) : null;

    // Add output mode instruction
    const modeInstruction = outputMode === "sections"
      ? `\n\nIMPORTANTE: Retorne a página como um array JSON de seções compatíveis com o editor. Cada seção deve ter: { "section_type": "hero|benefits|features|pricing|cta|testimonials|faq|gallery|contact_form|custom_html|video|image_banner|countdown|logos|stats|divider", "config": { ...propriedades } }. Use os tipos disponíveis e configure cores, textos, itens, animações etc. Retorne APENAS o JSON dentro de \`\`\`json\`\`\`.`
      : `\n\nIMPORTANTE: Retorne o HTML COMPLETO da página. Use Tailwind CSS via CDN, fontes do Google Fonts, e crie um design responsivo e moderno. Retorne APENAS o HTML dentro de \`\`\`html\`\`\`.`;

    if (previewHtml && newMessages.length > 2) {
      const lastUserMsg = contextMessages[contextMessages.length - 1];
      const maxHtmlLen = selectedKey ? 4000 : 50000;
      const htmlContext = previewHtml.length > maxHtmlLen ? previewHtml.slice(0, maxHtmlLen) + "\n<!-- TRUNCADO -->" : previewHtml;
      lastUserMsg.content = `[CONTEXTO: HTML atual]\n\`\`\`html\n${htmlContext}\n\`\`\`\n\n[INSTRUÇÃO]: ${lastUserMsg.content}\n\nRetorne o HTML COMPLETO com alterações.`;
    } else if (generatedSections && newMessages.length > 2 && outputMode === "sections") {
      const lastUserMsg = contextMessages[contextMessages.length - 1];
      lastUserMsg.content = `[CONTEXTO: Seções atuais]\n\`\`\`json\n${JSON.stringify(generatedSections, null, 2)}\n\`\`\`\n\n[INSTRUÇÃO]: ${lastUserMsg.content}${modeInstruction}`;
    } else {
      const lastUserMsg = contextMessages[contextMessages.length - 1];
      lastUserMsg.content += modeInstruction;
    }

    if (selectedKey && contextMessages.length > 4) {
      const first = contextMessages[0];
      const lastTwo = contextMessages.slice(-2);
      contextMessages.length = 0;
      contextMessages.push(first, ...lastTwo);
    }

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({
          messages: contextMessages,
          ...(selectedKey ? { externalKey: selectedKey.key, externalProvider: selectedKey.provider } : {}),
        }),
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
                if (last?.role === "assistant") return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Try to extract sections first, then HTML
      const sections = extractJsonSections(assistantContent);
      if (sections) {
        setGeneratedSections(sections);
        setShowPreview(true);
      } else {
        const html = extractHtmlFromMarkdown(assistantContent);
        if (html) { setPreviewHtml(html); setShowPreview(true); }
      }
    } catch (e: any) {
      toast({ title: e.message || "Erro ao gerar", variant: "destructive" });
      setMessages((prev) => [...prev, { role: "assistant", content: `❌ Erro: ${e.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAsPage = async () => {
    setSavingPage(true);
    const slug = "ai-page-" + Date.now().toString(36);

    if (generatedSections && generatedSections.length > 0) {
      // Save as sections-based page
      const { data, error } = await supabase.from("landing_pages").insert({
        title: "Página gerada com IA", slug, is_published: false,
      } as any).select("id").single();
      if (error) { toast({ title: error.message, variant: "destructive" }); setSavingPage(false); return; }

      // Insert sections
      const sectionInserts = generatedSections.map((s, i) => ({
        page_id: data.id, section_type: s.section_type || "custom_html", order: i,
        config: s.config || s, is_visible: true,
      }));
      await supabase.from("landing_page_sections").insert(sectionInserts);
      toast({ title: "Página salva com seções editáveis!" });
      onPageCreated(data.id);
    } else if (previewHtml) {
      const { data, error } = await supabase.from("landing_pages").insert({
        title: "Página gerada com IA", slug, is_published: false, html_content: previewHtml,
      } as any).select("id").single();
      if (error) { toast({ title: error.message, variant: "destructive" }); setSavingPage(false); return; }
      toast({ title: "Página salva! Abrindo no editor..." });
      onPageCreated(data.id);
    }
    setSavingPage(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const previewWidth = previewDevice === "mobile" ? "375px" : previewDevice === "tablet" ? "768px" : "100%";
  const keyInfo = getSelectedKeyInfo();

  const suggestions = [
    "Crie uma landing page de alta conversão para um curso de marketing digital com hero, benefícios, depoimentos, preços e CTA",
    "Crie uma página para agência de design minimalista com tons escuros e neon",
    "Crie uma squeeze page para capturar emails com countdown e prova social",
    "Crie uma página de vendas completa com hero, features, pricing e FAQ",
  ];

  return (
    <div className="h-[calc(100vh-3.5rem)] flex bg-background">
      {/* Chat Panel */}
      <div className="flex flex-col border-r border-border" style={{ width: showPreview ? "420px" : "100%", maxWidth: showPreview ? "420px" : "800px", margin: showPreview ? 0 : "0 auto" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onBack} className="h-7 px-2">
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Forge AI Builder</h3>
              <p className="text-[10px] text-muted-foreground">{previewHtml || generatedSections ? "Peça alterações ou gere nova" : "Descreva a página"}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Output mode */}
            <div className="flex items-center gap-0.5 bg-secondary/50 rounded-lg p-0.5 mr-1">
              <button onClick={() => setOutputMode("sections")} className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${outputMode === "sections" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Seções</button>
              <button onClick={() => setOutputMode("html")} className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${outputMode === "html" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>HTML</button>
            </div>
            {/* Key selector */}
            <div className="relative">
              <button onClick={() => setShowKeySelector(!showKeySelector)} className="flex items-center gap-1 h-7 px-2 rounded text-[10px] bg-secondary/50 border border-border text-muted-foreground hover:text-foreground transition-colors">
                <Key className="h-3 w-3" />
                <span className="max-w-[80px] truncate">{keyInfo.name}</span>
                <ChevronDown className="h-3 w-3" />
              </button>
              {showKeySelector && (
                <div className="absolute right-0 top-full mt-1 w-56 rounded-lg shadow-xl z-50 bg-card border border-border overflow-hidden">
                  <div className="p-1">
                    <button onClick={() => { setSelectedKeyId("builtin"); setShowKeySelector(false); }} className={`w-full flex items-center gap-2 px-3 py-2 rounded text-xs transition-colors ${selectedKeyId === "builtin" ? "bg-primary/10 text-primary" : "text-foreground hover:bg-secondary"}`}>
                      <Sparkles className="h-3.5 w-3.5" />
                      <div><p className="font-medium">Forge AI (Nativo)</p><p className="text-[10px] text-muted-foreground">Gemini & GPT</p></div>
                    </button>
                    {apiKeys.map(key => (
                      <button key={key.id} onClick={() => { setSelectedKeyId(key.id); setShowKeySelector(false); }} className={`w-full flex items-center gap-2 px-3 py-2 rounded text-xs transition-colors ${selectedKeyId === key.id ? "bg-primary/10 text-primary" : "text-foreground hover:bg-secondary"}`}>
                        <Key className="h-3.5 w-3.5" />
                        <div><p className="font-medium">{key.name}</p><p className="text-[10px] text-muted-foreground">{key.provider}</p></div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {(previewHtml || generatedSections) && (
              <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)} className="h-7 text-primary">
                <Eye className="h-3.5 w-3.5 mr-1" /> {showPreview ? "Ocultar" : "Preview"}
              </Button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-6 py-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-primary-foreground" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold mb-2">Crie páginas com IA</h3>
                <p className="text-sm text-muted-foreground max-w-md">Descreva a landing page que deseja. A IA gera {outputMode === "sections" ? "seções editáveis no editor visual" : "HTML completo"}.</p>
              </div>
              <div className="grid grid-cols-1 gap-2 w-full max-w-md">
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => { setInput(s); inputRef.current?.focus(); }}
                    className="text-left px-4 py-3 rounded-lg text-xs bg-secondary/50 border border-border hover:border-primary/30 transition-all text-foreground/70">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
              )}
              <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary border border-border text-foreground"}`}>
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex gap-1 mb-2 flex-wrap">
                    {msg.attachments.map((a, j) => (
                      <span key={j} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-background/20">
                        {a.type.startsWith("image") ? <Image className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                        {a.name}
                      </span>
                    ))}
                  </div>
                )}
                {msg.content
                  .replace(/```html[\s\S]*?```/g, "📄 [HTML gerado — veja no preview →]")
                  .replace(/```json[\s\S]*?```/g, "📋 [Seções geradas — veja no preview →]")}
              </div>
              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-1">
                  <User className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center shrink-0">
                <Bot className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <div className="px-4 py-3 rounded-xl bg-secondary border border-border">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Edit hints */}
        {(previewHtml || generatedSections) && !isLoading && messages.length > 0 && (
          <div className="px-4 pb-2">
            <div className="flex gap-1.5 flex-wrap">
              {["Mude as cores", "Adicione depoimentos", "Melhore o CTA", "Adicione animações", "Troque textos"].map(hint => (
                <button key={hint} onClick={() => { setInput(hint); inputRef.current?.focus(); }}
                  className="text-[10px] px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors">
                  {hint}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Attachments preview */}
        {attachments.length > 0 && (
          <div className="px-4 pb-2 flex gap-2 flex-wrap">
            {attachments.map((f, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs bg-secondary/50 border border-border rounded-lg px-2.5 py-1.5">
                {f.type.startsWith("image") ? <Image className="h-3 w-3 text-primary" /> : <FileText className="h-3 w-3 text-primary" />}
                <span className="truncate max-w-[100px]">{f.name}</span>
                <button onClick={() => removeAttachment(i)} className="p-0.5 hover:bg-destructive/20 rounded"><X className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="p-3 border-t border-border">
          <div className="flex gap-2 items-end">
            <div className="flex gap-1 shrink-0">
              <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.html" onChange={handleFileSelect} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-lg bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="Anexar arquivo">
                <Upload className="h-4 w-4" />
              </button>
            </div>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={previewHtml || generatedSections ? "Peça alterações..." : "Descreva a página..."}
              rows={1}
              className="flex-1 resize-none rounded-xl px-4 py-3 text-sm bg-secondary border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              style={{ minHeight: "44px", maxHeight: "120px" }}
              onInput={(e) => { const t = e.target as HTMLTextAreaElement; t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 120) + "px"; }}
            />
            <Button onClick={sendMessage} disabled={!input.trim() || isLoading} className="h-11 w-11 rounded-xl shrink-0">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Preview Panel */}
      {showPreview && (previewHtml || generatedSections) && (
        <div className="flex-1 flex flex-col bg-muted/30">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">PREVIEW</span>
              {generatedSections && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{generatedSections.length} seções</span>}
              {(["desktop", "tablet", "mobile"] as const).map(d => (
                <button key={d} onClick={() => setPreviewDevice(d)} className={`p-1 rounded ${previewDevice === d ? "text-primary" : "text-muted-foreground"}`}>
                  {d === "desktop" ? <Monitor className="h-3.5 w-3.5" /> : d === "tablet" ? <Tablet className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>
            <Button size="sm" onClick={handleSaveAsPage} disabled={savingPage} className="h-7 font-semibold text-xs gap-1">
              <Save className="h-3.5 w-3.5" /> {savingPage ? "..." : generatedSections ? "Salvar como Seções" : "Salvar & Editar"}
            </Button>
          </div>
          <div className="flex-1 flex items-start justify-center overflow-auto p-4">
            {generatedSections ? (
              <div className="bg-background rounded-lg shadow-2xl overflow-hidden" style={{ width: previewWidth, maxWidth: "100%" }}>
                {generatedSections.map((sec, i) => (
                  <div key={i} className="relative border-b border-border/20">
                    <div className="absolute top-1 left-1 z-10 text-[9px] px-1.5 py-0.5 rounded bg-black/50 text-white backdrop-blur-sm">
                      {sec.section_type}
                    </div>
                    <SectionPreviewMini config={sec.config || sec} type={sec.section_type} />
                  </div>
                ))}
              </div>
            ) : (
              <iframe ref={iframeRef} title="Preview" className="bg-white rounded-lg shadow-2xl" style={{ width: previewWidth, height: "100%", border: "none" }} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Mini section preview for AI-generated sections
const SectionPreviewMini = ({ config, type }: { config: any; type: string }) => {
  const c = config;
  return (
    <div style={{ background: c.bgGradient || c.bgColor || "#0a0a0a", color: c.textColor || "#fff", padding: `${c.paddingY || 40}px ${c.paddingX || 24}px`, fontFamily: c.fontFamily || "Inter, sans-serif" }}>
      <div className="max-w-4xl mx-auto text-center">
        {c.badge && <span className="inline-block text-xs px-3 py-1 rounded-full mb-4 border border-white/20">{c.badge}</span>}
        {c.headline && <h2 className="text-2xl font-bold mb-2">{c.headline}</h2>}
        {c.title && <h2 className="text-2xl font-bold mb-2">{c.title}</h2>}
        {c.subtitle && <p className="text-sm opacity-70 mb-4">{c.subtitle}</p>}
        {c.description && <p className="text-sm opacity-70 mb-4">{c.description}</p>}
        {c.ctaText && (
          <span className="inline-block px-6 py-2 rounded-lg text-sm font-bold" style={{ background: c.accentColor || "#84CC16", color: c.bgColor || "#000" }}>
            {c.ctaText}
          </span>
        )}
        {c.items && (
          <div className="grid grid-cols-2 gap-3 mt-4 text-left">
            {c.items.slice(0, 4).map((item: any, i: number) => (
              <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/10">
                {item.icon && <span className="text-lg">{item.icon}</span>}
                <p className="font-semibold text-xs mt-1">{item.title || item.name}</p>
                <p className="text-[10px] opacity-60">{item.description || item.text}</p>
              </div>
            ))}
          </div>
        )}
        {c.plans && (
          <div className="flex gap-3 mt-4 justify-center">
            {c.plans.slice(0, 3).map((plan: any, i: number) => (
              <div key={i} className={`p-4 rounded-lg border ${plan.highlight ? "border-primary bg-primary/10" : "border-white/10 bg-white/5"}`}>
                <p className="font-bold text-sm">{plan.name}</p>
                <p className="text-xl font-bold mt-1">R${plan.price}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AIPageGenerator;
