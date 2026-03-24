import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader, Sparkles, X } from "lucide-react";

interface AIEditorChatProps {
  isOpen: boolean;
  onClose: () => void;
  selectedElement: any;
  editor: any;
  onApplyChange: (css: string, html?: string) => void;
}

export const AIEditorChat = ({
  isOpen,
  onClose,
  selectedElement,
  editor,
  onApplyChange,
}: AIEditorChatProps) => {
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    {
      role: "assistant",
      content: "Olá! Sou seu assistente de design. Descreva o que você quer mudar no elemento selecionado. Exemplos: 'Mude a cor para azul', 'Adicione uma sombra', 'Faça o texto maior'",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateCSSFromPrompt = (prompt: string): string => {
    // Simulação de geração de CSS baseado no prompt
    // Em produção, isso seria uma chamada à IA
    const lowerPrompt = prompt.toLowerCase();

    let css = "";

    // Cores
    if (lowerPrompt.includes("azul")) css += "color: #3b82f6;";
    if (lowerPrompt.includes("vermelho")) css += "color: #ef4444;";
    if (lowerPrompt.includes("verde")) css += "color: #22c55e;";
    if (lowerPrompt.includes("preto")) css += "color: #000000;";
    if (lowerPrompt.includes("branco")) css += "color: #ffffff;";
    if (lowerPrompt.includes("fundo azul")) css += "background-color: #3b82f6;";
    if (lowerPrompt.includes("fundo vermelho")) css += "background-color: #ef4444;";

    // Tamanho
    if (lowerPrompt.includes("maior")) css += "font-size: 1.5rem;";
    if (lowerPrompt.includes("menor")) css += "font-size: 0.875rem;";
    if (lowerPrompt.includes("grande")) css += "font-size: 2rem;";

    // Peso da fonte
    if (lowerPrompt.includes("negrito") || lowerPrompt.includes("bold")) css += "font-weight: bold;";
    if (lowerPrompt.includes("leve")) css += "font-weight: 300;";

    // Sombra
    if (lowerPrompt.includes("sombra")) css += "box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);";
    if (lowerPrompt.includes("sombra grande")) css += "box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);";

    // Borda
    if (lowerPrompt.includes("borda")) css += "border: 1px solid #ccc;";
    if (lowerPrompt.includes("borda arredondada")) css += "border-radius: 8px;";
    if (lowerPrompt.includes("borda redonda")) css += "border-radius: 50%;";

    // Padding
    if (lowerPrompt.includes("espaço interno")) css += "padding: 1rem;";
    if (lowerPrompt.includes("padding")) css += "padding: 1rem;";

    // Margin
    if (lowerPrompt.includes("espaço externo")) css += "margin: 1rem;";

    // Animação
    if (lowerPrompt.includes("animar") || lowerPrompt.includes("animação")) {
      css += "animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;";
    }

    // Gradiente
    if (lowerPrompt.includes("gradiente")) {
      css += "background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);";
    }

    // Hover
    if (lowerPrompt.includes("hover")) {
      css += "transition: all 0.3s ease;";
    }

    return css || "/* Nenhuma mudança detectada */";
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    // Simular delay de processamento
    setTimeout(() => {
      const css = generateCSSFromPrompt(userMessage);

      const assistantMessage = `Entendido! Vou aplicar as seguintes mudanças:\n\n\`\`\`css\n${css}\n\`\`\`\n\nClique em "Aplicar" para confirmar as mudanças.`;

      setMessages((prev) => [...prev, { role: "assistant", content: assistantMessage }]);
      setLoading(false);

      // Aplicar CSS automaticamente
      if (selectedElement && editor) {
        const styles: Record<string, string> = {};
        const declarations = css.split(";").filter((d) => d.trim());
        declarations.forEach((decl) => {
          const [prop, value] = decl.split(":").map((s) => s.trim());
          if (prop && value) {
            // Converter CSS para camelCase
            const camelProp = prop.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
            styles[camelProp] = value;
          }
        });
        selectedElement.setStyle(styles);
      }
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 w-96 h-96 bg-gradient-to-b from-slate-900 to-slate-950 rounded-lg shadow-2xl border border-slate-700 flex flex-col z-40">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-400" />
          <span className="font-semibold text-slate-100">AI Editor</span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded-lg ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-100 border border-slate-700"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 text-slate-100 border border-slate-700 px-4 py-2 rounded-lg flex items-center gap-2">
              <Loader className="h-4 w-4 animate-spin" />
              <span className="text-sm">Processando...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-700 p-4 space-y-2">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Descreva a mudança..."
            className="flex-1 h-9 text-xs bg-slate-800/50 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
            disabled={loading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={loading || !input.trim()}
            size="sm"
            className="h-9 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-slate-500">
          💡 Dica: Descreva mudanças como "mude para azul", "adicione sombra", "faça maior"
        </p>
      </div>
    </div>
  );
};
