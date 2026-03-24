import { useState } from "react";
import { Sparkles, Send, Loader, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SectionAIAssistantProps {
  sectionType: string;
  isOpen: boolean;
  onClose: () => void;
  onApplySuggestion: (suggestion: string) => void;
}

const SECTION_SUGGESTIONS: Record<string, string[]> = {
  hero: [
    "Adicione um badge com 'Novo' ou 'Exclusivo' para chamar atenção",
    "Use um CTA mais urgente como 'Comece Agora' ou 'Acesso Imediato'",
    "Considere adicionar números (ex: '+10k clientes') para credibilidade",
    "Adicione um vídeo de fundo para mais impacto visual",
  ],
  features: [
    "Organize as features em grupos de 3 para melhor visual",
    "Adicione ícones visuais para cada feature",
    "Use números (ex: '10x mais rápido') para destacar benefícios",
    "Considere adicionar um 'Saiba mais' para cada feature",
  ],
  pricing: [
    "Destaque o plano mais popular com uma cor diferente",
    "Adicione 'Mais Popular' ou 'Recomendado' ao plano principal",
    "Inclua um botão de CTA diferente para cada plano",
    "Considere adicionar uma garantia de 30 dias de reembolso",
  ],
  testimonials: [
    "Adicione fotos de perfil dos depoentes",
    "Inclua a profissão/cargo de cada pessoa",
    "Use estrelas (⭐⭐⭐⭐⭐) para rating visual",
    "Considere adicionar o nome da empresa/marca",
  ],
  cta: [
    "Use cores contrastantes para o botão",
    "Adicione urgência: 'Oferta válida por 48 horas'",
    "Inclua um ícone de seta (→) no texto do botão",
    "Considere adicionar um contador regressivo",
  ],
  faq: [
    "Ordene as perguntas por frequência/importância",
    "Adicione ícones para cada categoria de pergunta",
    "Use linguagem clara e objetiva nas respostas",
    "Considere adicionar um 'Não encontrou sua resposta?' com CTA",
  ],
};

export const SectionAIAssistant = ({
  sectionType,
  isOpen,
  onClose,
  onApplySuggestion,
}: SectionAIAssistantProps) => {
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  const suggestions = SECTION_SUGGESTIONS[sectionType] || [];

  const handleApply = (suggestion: string) => {
    setLoading(true);
    setTimeout(() => {
      onApplySuggestion(suggestion);
      setLoading(false);
      setSelectedSuggestion(null);
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 w-96 max-h-96 bg-gradient-to-b from-slate-900 to-slate-950 rounded-lg shadow-2xl border border-slate-700 flex flex-col z-40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-400 animate-pulse" />
          <span className="font-semibold text-slate-100">IA Sugestões</span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="text-xs text-slate-400 mb-3">
          Sugestões para melhorar sua seção <strong>{sectionType}</strong>:
        </div>

        {suggestions.map((suggestion, idx) => (
          <div
            key={idx}
            className="p-3 bg-slate-800/30 rounded border border-slate-700/50 hover:border-slate-600 transition cursor-pointer"
            onClick={() => setSelectedSuggestion(suggestion)}
          >
            <p className="text-xs text-slate-200 leading-relaxed">{suggestion}</p>
            {selectedSuggestion === suggestion && (
              <Button
                onClick={() => handleApply(suggestion)}
                disabled={loading}
                size="sm"
                className="mt-2 w-full h-7 text-xs bg-yellow-600 hover:bg-yellow-700"
              >
                {loading ? <Loader className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                Aplicar Sugestão
              </Button>
            )}
          </div>
        ))}

        {suggestions.length === 0 && (
          <div className="text-xs text-slate-500 text-center py-4">
            Nenhuma sugestão disponível para este tipo de seção
          </div>
        )}
      </div>

      {/* Custom Prompt */}
      <div className="border-t border-slate-700 p-3 space-y-2 bg-slate-800/30">
        <div className="flex gap-2">
          <Input
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Descreva uma melhoria..."
            className="h-8 text-xs bg-slate-700/50 border-slate-600 text-slate-100 placeholder-slate-500 focus:border-yellow-500 focus:ring-yellow-500/20"
          />
          <Button
            onClick={() => handleApply(customPrompt)}
            disabled={!customPrompt.trim() || loading}
            size="sm"
            className="h-8 px-2 bg-yellow-600 hover:bg-yellow-700"
          >
            <Send className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};
