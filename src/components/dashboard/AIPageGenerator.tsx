import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Send, Loader2, Monitor, Tablet, Smartphone, Save, Paperclip, X,
  FileText, Image, Sparkles, Code2, Layers, ChevronDown, ChevronUp,
  Wand2, RefreshCw, Eye, Key,
} from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
  attachments?: { type: string; name: string; url?: string }[];
};

interface ApiKeyConfig {
  id: string;
  name: string;
  provider: string;
  key: string;
  isActive: boolean;
}

interface Props {
  onPageCreated: (pageId: string) => void;
  onBack: () => void;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-landing-page`;

const ALL_SECTION_TYPES = [
  "hero", "benefits", "features", "pricing", "cta", "testimonials", "faq",
  "gallery", "contact_form", "custom_html", "video", "image_banner", "countdown",
  "logos", "stats", "divider", "marquee", "accordion", "tabs_section",
  "timeline", "comparison", "social_proof",
];

const buildSystemPrompt = () => `Você é um expert em criação de landing pages de alta conversão para o mercado brasileiro.
Você cria páginas usando um sistema de seções JSON estruturado.

TIPOS DE SEÇÃO DISPONÍVEIS: ${ALL_SECTION_TYPES.join(", ")}

ESTRUTURA DE CADA SEÇÃO:
{ "section_type": "<tipo>", "config": { "bgColor": "#hex", "bgGradient": "linear-gradient(...)", "textColor": "#hex", "accentColor": "#hex", "paddingY": 80, "fontFamily": "Inter", "animation": "fade-in|slide-up|slide-left|scale-in|bounce-in|rotate-in|none", ...campos específicos } }

CAMPOS POR TIPO:
hero: headline, subtitle, badge, ctaText, ctaUrl, ctaAction(link|scroll|whatsapp), cta2Text, cta2Url, headingSize, headingWeight, subtitleSize, gradientText(bool), bgPattern(dots|squares|none), imageUrl
benefits: headline, subtitle, items[{icon,title,desc}], columns(2|3|4)
features: headline, subtitle, items[{icon,title,desc}], layout(grid|list|alternating)
pricing: headline, subtitle, plans[{name,price,period,description,features[],cta,ctaUrl,highlighted,badge}]
cta: headline, subtitle, ctaText, ctaUrl, ctaAction, layout(centered|split|banner)
testimonials: headline, subtitle, items[{name,role,text,avatar,rating}], layout(grid|carousel|masonry)
faq: headline, subtitle, items[{question,answer}]
gallery: headline, subtitle, items[{url,alt}], columns(2|3|4)
contact_form: headline, subtitle, fields(name|email|phone|message|company), ctaText
video: headline, subtitle, videoUrl(embed URL), aspectRatio(16/9|4/3)
image_banner: imageUrl, alt, height(px), overlay(bool), overlayColor, headline
countdown: headline, subtitle, targetDate(ISO), ctaText, ctaUrl
logos: headline, items[{name,url}], grayscale(bool)
stats: headline, items[{value,label}]
divider: style(line|dots|wave), color, height
marquee: items(string[]), speed, direction(left|right), bgColor, textColor, fontSize, fontWeight, gap, pauseOnHover
accordion: headline, subtitle, items[{title,content}], allowMultiple(bool)
tabs_section: headline, subtitle, tabs[{label,icon,content}]
timeline: headline, subtitle, items[{year,title,desc}], layout(vertical|horizontal)
comparison: headline, subtitle, ourLabel, theirLabel, items[{feature,ours(string|bool),theirs(string|bool)}]
social_proof: headline, items[{type(badge|logo|number),text,icon,value}]

REGRAS:
1. Retorne APENAS o JSON dentro de \`\`\`json\`\`\`
2. O JSON deve ser um array de seções
3. Use cores harmoniosas e design profissional
4. Crie pelo menos 5-8 seções para uma landing page completa
5. Use gradientes em bgGradient quando quiser efeitos visuais ricos
6. Sempre inclua animações para melhor UX
7. Adapte o conteúdo ao nicho/produto descrito
8. Use emojis relevantes nos ícones
9. Crie textos persuasivos e específicos para o produto
10. Para imagens, use URLs do Unsplash relevantes ao tema`;

function extractJsonSections(text: string): any[] | null {
  const match = text.match(/```json\s*([\s\S]*?)```/);
  if (match) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (Array.isArray(parsed)) return parsed;
      if (parsed.sections && Array.isArray(parsed.sections)) return parsed.sections;
    } catch {}
  }
  const rawMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (rawMatch) {
    try {
      const parsed = JSON.parse(rawMatch[0]);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return null;
}

function extractHtmlFromMarkdown(text: string): string | null {
  const match = text.match(/```html\s*([\s\S]*?)```/);
  if (match) return match[1].trim();
  if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) return text.trim();
  return null;
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return <Image className="h-3 w-3" />;
  return <FileText className="h-3 w-3" />;
}

const SectionPreviewMini = ({ config, type }: { config: any; type: string }) => {
  const c = config;
  const bg = c.bgGradient || c.bgColor || "#0a0a0a";
  const text = c.textColor || "#fff";
  const accent = c.accentColor || "#84CC16";
  const py = c.paddingY || 40;
  return (
    <div style={{ background: bg, color: text, padding: `${py}px ${c.paddingX || 24}px`, fontFamily: c.fontFamily || "Inter, sans-serif" }}>
      <div className="max-w-4xl mx-auto text-center">
        {c.badge && <span className="inline-block text-xs px-3 py-1 rounded-full mb-4 border" style={{ borderColor: `${accent}40`, color: accent }}>{c.badge}</span>}
        {(c.headline || c.title) && <h2 className="text-2xl font-bold mb-2">{c.headline || c.title}</h2>}
        {(c.subtitle || c.description) && <p className="text-sm opacity-70 mb-4">{c.subtitle || c.description}</p>}
        {c.ctaText && <span className="inline-block px-6 py-2 rounded-lg text-sm font-bold" style={{ background: accent, color: c.bgColor || "#000" }}>{c.ctaText}</span>}
        {c.items && Array.isArray(c.items) && c.items.length > 0 && type !== "timeline" && (
          <div className="grid grid-cols-2 gap-3 mt-4 text-left">
            {c.items.slice(0, 4).map((item: any, i: number) => (
              <div key={i} className="p-3 rounded-lg border" style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)" }}>
                {item.icon && <span className="text-lg">{item.icon}</span>}
                <p className="font-semibold text-xs mt-1">{item.title || item.name || item.question || item.label || item.feature}</p>
                <p className="text-[10px] opacity-60">{item.desc || item.description || item.text || item.answer || item.value}</p>
              </div>
            ))}
          </div>
        )}
        {c.plans && Array.isArray(c.plans) && (
          <div className="flex gap-3 mt-4 justify-center flex-wrap">
            {c.plans.slice(0, 3).map((plan: any, i: number) => (
              <div key={i} className="p-4 rounded-lg border" style={{ borderColor: plan.highlighted ? accent : "rgba(255,255,255,0.15)", background: plan.highlighted ? `${accent}15` : "rgba(255,255,255,0.05)" }}>
                {plan.badge && <span className="text-[9px] px-2 py-0.5 rounded-full font-bold" style={{ background: accent, color: "#000" }}>{plan.badge}</span>}
                <p className="font-bold text-sm mt-1">{plan.name}</p>
                <p className="text-xl font-bold mt-1" style={{ color: accent }}>{plan.price}</p>
              </div>
            ))}
          </div>
        )}
        {c.tabs && Array.isArray(c.tabs) && (
          <div className="flex gap-2 mt-4 justify-center flex-wrap">
            {c.tabs.map((tab: any, i: number) => (
              <span key={i} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: i === 0 ? accent : "rgba(255,255,255,0.1)", color: i === 0 ? "#000" : text }}>{tab.icon} {tab.label}</span>
            ))}
          </div>
        )}
        {type === "timeline" && c.items && (
          <div className="mt-4 space-y-2 text-left">
            {c.items.slice(0, 3).map((item: any, i: number) => (
              <div key={i} className="flex gap-3 items-start">
                <span className="text-xs font-bold px-2 py-1 rounded" style={{ background: accent, color: "#000", minWidth: 40 }}>{item.year}</span>
                <div><p className="text-xs font-semibold">{item.title}</p><p className="text-[10px] opacity-60">{item.desc}</p></div>
              </div>
            ))}
          </div>
        )}
        {type === "comparison" && c.items && (
          <div className="mt-4 space-y-1 text-left text-xs">
            <div className="flex gap-2 font-bold opacity-60 text-[10px] mb-2">
              <span className="flex-1">Recurso</span>
              <span className="w-24 text-center" style={{ color: accent }}>{c.ourLabel || "Nós"}</span>
              <span className="w-24 text-center opacity-50">{c.theirLabel || "Concorrência"}</span>
            </div>
            {c.items.slice(0, 4).map((item: any, i: number) => (
              <div key={i} className="flex gap-2 items-center py-1 border-b border-white/5">
                <span className="flex-1 text-[10px]">{item.feature}</span>
                <span className="w-24 text-center text-[10px] font-semibold" style={{ color: accent }}>{typeof item.ours === "boolean" ? (item.ours ? "✓" : "✗") : item.ours}</span>
                <span className="w-24 text-center text-[10px] opacity-50">{typeof item.theirs === "boolean" ? (item.theirs ? "✓" : "✗") : item.theirs}</span>
              </div>
            ))}
          </div>
        )}
        {type === "marquee" && c.items && (
          <div className="flex gap-4 mt-2 overflow-hidden">
            {c.items.slice(0, 5).map((item: string, i: number) => <span key={i} className="text-sm font-semibold whitespace-nowrap">{item}</span>)}
          </div>
        )}
        <div className="mt-3 text-[9px] opacity-30 uppercase tracking-widest">{type}</div>
      </div>
    </div>
  );
};

const AIPageGenerator = ({ onPageCreated, onBack }: Props) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [generatedSections, setGeneratedSections] = useState<any[] | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [savingPage, setSavingPage] = useState(false);
  const [selectedKeyId, setSelectedKeyId] = useState<string>("builtin");
  const [apiKeys, setApiKeys] = useState<ApiKeyConfig[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [outputMode, setOutputMode] = useState<"sections" | "html">("sections");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [processingFiles, setProcessingFiles] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const saved = localStorage.getItem("forge_api_keys");
    if (saved) { try { setApiKeys(JSON.parse(saved).filter((k: any) => k.isActive)); } catch {} }
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (iframeRef.current && previewHtml) {
      const doc = iframeRef.current.contentDocument;
      if (doc) { doc.open(); doc.write(previewHtml); doc.close(); }
    }
  }, [previewHtml, showPreview]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files].slice(0, 5));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (idx: number) => setAttachments(prev => prev.filter((_, i) => i !== idx));

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    setProcessingFiles(attachments.length > 0);

    let fileContext = "";
    const attachmentInfo: { type: string; name: string; url?: string }[] = [];
    const imageVisionItems: { type: string; image_url: { url: string; detail: string } }[] = [];

    for (const file of attachments) {
      try {
        if (file.type.startsWith("image/")) {
          const b64 = await fileToBase64(file);
          attachmentInfo.push({ type: file.type, name: file.name, url: b64 });
          imageVisionItems.push({ type: "image_url", image_url: { url: b64, detail: "low" } });
          fileContext += `\n[IMAGEM: ${file.name}] Use como referência visual para o design.\n`;
        } else if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
          attachmentInfo.push({ type: file.type, name: file.name });
          fileContext += `\n[PDF: ${file.name}] Extraia a estrutura de conteúdo para criar a página.\n`;
        } else {
          const text = await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsText(file); });
          attachmentInfo.push({ type: file.type, name: file.name });
          fileContext += `\n[ARQUIVO: ${file.name}]\n${text.slice(0, 3000)}\n`;
        }
      } catch (err) { console.error("File error:", err); }
    }

    setProcessingFiles(false);

    const userMsg: Message = { role: "user", content: input.trim(), attachments: attachmentInfo.length > 0 ? attachmentInfo : undefined };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setAttachments([]);
    setIsLoading(true);

    let assistantContent = "";
    const selectedKey = selectedKeyId !== "builtin" ? apiKeys.find(k => k.id === selectedKeyId) : null;

    let userContent = input.trim() + (fileContext ? `\n\n${fileContext}` : "");

    if (generatedSections && newMessages.length > 2 && outputMode === "sections") {
      userContent = `[SEÇÕES ATUAIS]\n\`\`\`json\n${JSON.stringify(generatedSections, null, 2)}\n\`\`\`\n\n[INSTRUÇÃO]: ${userContent}`;
    } else if (previewHtml && newMessages.length > 2 && outputMode === "html") {
      const maxLen = 8000;
      const htmlCtx = previewHtml.length > maxLen ? previewHtml.slice(0, maxLen) + "\n<!-- TRUNCADO -->" : previewHtml;
      userContent = `[HTML ATUAL]\n\`\`\`html\n${htmlCtx}\n\`\`\`\n\n[INSTRUÇÃO]: ${userContent}`;
    }

    if (outputMode === "sections") {
      userContent += `\n\nRETORNE APENAS um array JSON de seções dentro de \`\`\`json\`\`\`. Não inclua texto fora do bloco JSON.`;
    } else {
      userContent += `\n\nRETORNE APENAS o HTML COMPLETO dentro de \`\`\`html\`\`\`. Use Tailwind CSS via CDN, Google Fonts. Design responsivo e moderno.`;
    }

    const contextMessages: any[] = [
      { role: "system", content: buildSystemPrompt() },
      ...newMessages.slice(0, -1).slice(-4).map(m => ({ role: m.role, content: m.content })),
    ];

    if (imageVisionItems.length > 0) {
      contextMessages.push({ role: "user", content: [{ type: "text", text: userContent }, ...imageVisionItems] });
    } else {
      contextMessages.push({ role: "user", content: userContent });
    }

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: contextMessages, ...(selectedKey ? { externalKey: selectedKey.key, externalProvider: selectedKey.provider } : {}) }),
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
          } catch { buffer = line + "\n" + buffer; break; }
        }
      }

      const sections = extractJsonSections(assistantContent);
      if (sections && sections.length > 0) {
        setGeneratedSections(sections);
        setShowPreview(true);
        toast({ title: `✅ ${sections.length} seções geradas!` });
      } else {
        const html = extractHtmlFromMarkdown(assistantContent);
        if (html) { setPreviewHtml(html); setShowPreview(true); toast({ title: "✅ Página HTML gerada!" }); }
      }
    } catch (e: any) {
      toast({ title: e.message || "Erro ao gerar", variant: "destructive" });
      setMessages((prev) => [...prev, { role: "assistant", content: `❌ Erro: ${e.message}` }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, attachments, messages, generatedSections, previewHtml, outputMode, selectedKeyId, apiKeys]);

  const handleSaveAsPage = async () => {
    if (!generatedSections && !previewHtml) return;
    setSavingPage(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const slug = `page-${Date.now()}`;
      const title = generatedSections ? (generatedSections[0]?.config?.headline || "Nova Página").slice(0, 100) : "Nova Página HTML";
      const { data: page, error } = await supabase.from("landing_pages").insert({ user_id: user.id, title, slug, is_published: false, html_content: previewHtml || null } as any).select().single();
      if (error) throw error;
      if (generatedSections && page) {
        const sectionsToInsert = generatedSections.map((sec, i) => ({ page_id: page.id, section_type: sec.section_type, order: i, config: sec.config || {}, is_visible: true }));
        const { error: secError } = await supabase.from("page_sections").insert(sectionsToInsert);
        if (secError) throw secError;
      }
      toast({ title: "✅ Página salva com sucesso!" });
      onPageCreated(page.id);
    } catch (e: any) {
      toast({ title: e.message || "Erro ao salvar", variant: "destructive" });
    } finally {
      setSavingPage(false);
    }
  };

  const quickPrompts = [
    { label: "Landing Page SaaS", icon: "🚀", prompt: "Crie uma landing page completa para um produto SaaS de gestão de projetos. Design dark moderno com gradientes verdes. Inclua hero, benefícios, features, pricing, testimonials, FAQ e CTA." },
    { label: "Curso Online", icon: "🎓", prompt: "Crie uma landing page para um curso online de marketing digital. Inclua hero com countdown, módulos, depoimentos, FAQ e CTA com urgência." },
    { label: "Consultoria", icon: "💼", prompt: "Crie uma landing page para consultoria de negócios premium. Design profissional com tons escuros e dourado. Timeline, comparação e social proof." },
    { label: "E-commerce", icon: "🛍️", prompt: "Crie uma landing page para venda de produto físico premium. Galeria, comparação, depoimentos, countdown de oferta e marquee com benefícios." },
  ];

  const previewWidth = previewDevice === "mobile" ? "375px" : previewDevice === "tablet" ? "768px" : "100%";

  return (
    <div className="flex h-full overflow-hidden">
      {/* Chat Panel */}
      <div className="w-[420px] shrink-0 flex flex-col border-r border-border bg-card h-full">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors text-xs">← Voltar</button>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold">Forge AI</span>
          </div>
          <div className="flex items-center gap-1 ml-2">
            <button onClick={() => setOutputMode("sections")} className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-md font-semibold transition-colors ${outputMode === "sections" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              <Layers className="h-3 w-3" /> Seções
            </button>
            <button onClick={() => setOutputMode("html")} className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-md font-semibold transition-colors ${outputMode === "html" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              <Code2 className="h-3 w-3" /> HTML
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="space-y-4">
              <div className="text-center py-6">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Wand2 className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-bold text-base mb-1">Forge AI Page Builder</h3>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">Descreva sua página e a IA criará uma landing page completa com seções editáveis.</p>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold px-1">Início Rápido</p>
                {quickPrompts.map((qp, i) => (
                  <button key={i} onClick={() => { setInput(qp.prompt); inputRef.current?.focus(); }} className="w-full text-left p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all group">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{qp.icon}</span>
                      <div>
                        <p className="text-xs font-semibold group-hover:text-primary transition-colors">{qp.label}</p>
                        <p className="text-[10px] text-muted-foreground line-clamp-1">{qp.prompt.slice(0, 60)}...</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                <p className="text-[10px] font-semibold text-primary mb-1">💡 Dica Pro</p>
                <p className="text-[10px] text-muted-foreground">Anexe imagens de referência ou PDFs. A IA usará como base visual para criar sua página.</p>
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="h-3 w-3 text-primary" />
                  </div>
                )}
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-secondary text-foreground rounded-tl-sm"}`}>
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {msg.attachments.map((a, j) => (
                        <span key={j} className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-black/20">{getFileIcon(a.type)} {a.name}</span>
                      ))}
                    </div>
                  )}
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {msg.role === "assistant" && msg.content.length > 400 ? msg.content.slice(0, 200) + "... [processado]" : msg.content}
                  </p>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex gap-2 justify-start">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="h-3 w-3 text-primary animate-pulse" />
              </div>
              <div className="bg-secondary rounded-2xl rounded-tl-sm px-3 py-2">
                <div className="flex gap-1 items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                  <span className="text-[10px] text-muted-foreground ml-1">Gerando...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {attachments.length > 0 && (
          <div className="px-3 py-2 border-t border-border flex flex-wrap gap-1.5">
            {attachments.map((f, i) => (
              <div key={i} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-secondary border border-border">
                {getFileIcon(f.type)}
                <span className="max-w-[80px] truncate">{f.name}</span>
                <button onClick={() => removeAttachment(i)} className="text-muted-foreground hover:text-destructive ml-0.5"><X className="h-2.5 w-2.5" /></button>
              </div>
            ))}
          </div>
        )}

        <div className="p-3 border-t border-border shrink-0">
          <div className="mb-2">
            <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
              {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              Opções avançadas
            </button>
            {showAdvanced && (
              <div className="mt-2 p-2 rounded-lg bg-secondary space-y-2">
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Modelo de IA</p>
                  <select value={selectedKeyId} onChange={(e) => setSelectedKeyId(e.target.value)} className="w-full text-[10px] bg-background border border-border rounded-md px-2 py-1">
                    <option value="builtin">Forge AI (Nativo)</option>
                    {apiKeys.map(k => <option key={k.id} value={k.id}>{k.name} ({k.provider})</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <input ref={fileInputRef} type="file" accept="image/*,.pdf,.txt,.md" multiple className="hidden" onChange={handleFileSelect} />
            <button onClick={() => fileInputRef.current?.click()} className="h-11 w-11 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors shrink-0" title="Anexar arquivo">
              {processingFiles ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
            </button>
            <Textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Descreva sua página... (Enter para enviar)"
              className="flex-1 min-h-[44px] max-h-[120px] text-xs resize-none bg-secondary border-border rounded-xl" rows={1}
              onInput={(e) => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 120) + "px"; }}
            />
            <Button onClick={sendMessage} disabled={!input.trim() || isLoading} className="h-11 w-11 rounded-xl shrink-0">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Preview Panel */}
      {showPreview && (previewHtml || generatedSections) ? (
        <div className="flex-1 flex flex-col bg-muted/30 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Preview</span>
              {generatedSections && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{generatedSections.length} seções</span>}
              <div className="flex items-center gap-0.5 ml-2">
                {(["desktop", "tablet", "mobile"] as const).map(d => (
                  <button key={d} onClick={() => setPreviewDevice(d)} className={`p-1.5 rounded-md transition-colors ${previewDevice === d ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                    {d === "desktop" ? <Monitor className="h-3.5 w-3.5" /> : d === "tablet" ? <Tablet className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { setGeneratedSections(null); setPreviewHtml(null); setShowPreview(false); }} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                <RefreshCw className="h-3 w-3" /> Resetar
              </button>
              <Button size="sm" onClick={handleSaveAsPage} disabled={savingPage} className="h-7 font-semibold text-xs gap-1">
                <Save className="h-3.5 w-3.5" />
                {savingPage ? "Salvando..." : generatedSections ? "Abrir no Editor" : "Salvar & Editar"}
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-auto flex items-start justify-center p-4">
            {generatedSections ? (
              <div className="bg-background rounded-xl shadow-2xl overflow-hidden transition-all duration-300" style={{ width: previewWidth, maxWidth: "100%" }}>
                {generatedSections.map((sec, i) => (
                  <div key={i} className="relative border-b border-border/10">
                    <div className="absolute top-1.5 left-1.5 z-10 text-[9px] px-2 py-0.5 rounded-md bg-black/60 text-white backdrop-blur-sm font-mono">{i + 1}. {sec.section_type}</div>
                    <SectionPreviewMini config={sec.config || sec} type={sec.section_type} />
                  </div>
                ))}
              </div>
            ) : (
              <iframe ref={iframeRef} title="Preview HTML" className="bg-white rounded-xl shadow-2xl" style={{ width: previewWidth, height: "100%", minHeight: "600px", border: "none" }} />
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center space-y-3">
            <Eye className="h-12 w-12 mx-auto opacity-20" />
            <p className="text-sm font-medium opacity-40">O preview aparecerá aqui</p>
            <p className="text-xs opacity-30">Envie uma mensagem para gerar sua página</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIPageGenerator;
