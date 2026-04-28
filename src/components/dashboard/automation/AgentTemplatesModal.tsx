import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Headphones, Target, LifeBuoy, Repeat, ShoppingBag, Star, CalendarClock } from "lucide-react";

export interface AgentTemplate {
  id: string;
  name: string;
  display_name: string;
  type: string;
  tone: string;
  icon: any;
  color: string;
  description: string;
  system_prompt: string;
  rules?: string;
  objections?: string;
  examples?: string;
  voice_enabled?: boolean;
  reply_to_audio_with_audio?: boolean;
  split_long_messages?: boolean;
  simulate_typing?: boolean;
  simulate_recording?: boolean;
}

export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: "atendimento",
    name: "Atendimento Cordial",
    display_name: "Sofia",
    type: "atendimento",
    tone: "amigavel",
    icon: Headphones,
    color: "bg-blue-500/20 text-blue-500 border-blue-500/30",
    description: "Recepção calorosa, esclarece dúvidas e direciona o cliente.",
    system_prompt:
      "Você é Sofia, assistente de atendimento da empresa. Sua missão é receber bem cada cliente, entender o que ele precisa e direcioná-lo da melhor forma. Use linguagem cordial, próxima e clara. Sempre confirme dados antes de prosseguir e quando não souber algo, ofereça encaminhar para um atendente humano.",
    rules: "- Nunca prometa o que não pode cumprir.\n- Sempre cumprimente pelo nome.\n- Confirme entendimento antes de encerrar.",
    examples: "Cliente: 'Oi, vi vocês no Instagram'\nSofia: 'Olá! Que bom te ver por aqui 😊 Posso saber seu nome? Assim deixo nosso atendimento mais pessoal.'",
    split_long_messages: true,
    simulate_typing: true,
  },
  {
    id: "sdr",
    name: "SDR / Qualificador",
    display_name: "Marcus",
    type: "qualificacao",
    tone: "profissional",
    icon: Target,
    color: "bg-primary/20 text-primary border-primary/30",
    description: "Faz perguntas BANT (orçamento, autoridade, necessidade, prazo) e qualifica leads.",
    system_prompt:
      "Você é Marcus, SDR responsável por qualificar leads. Faça perguntas inteligentes e progressivas para descobrir: 1) qual a dor/necessidade real do lead, 2) tamanho da empresa/orçamento, 3) quem é o decisor, 4) prazo de decisão. Não venda — qualifique. Ao identificar lead quente, peça melhor horário para agendar uma conversa com o consultor.",
    rules: "- Uma pergunta por vez.\n- Nunca insista mais de 2 vezes na mesma pergunta.\n- Marque a conversa como 'quente' apenas se BANT estiver completo.",
    objections: "Se 'não tenho tempo agora': 'Entendo! Posso te enviar 2 horários e você escolhe?'",
    split_long_messages: true,
    simulate_typing: true,
  },
  {
    id: "suporte",
    name: "Suporte N1",
    display_name: "Helena",
    type: "suporte",
    tone: "tecnico",
    icon: LifeBuoy,
    color: "bg-amber-500/20 text-amber-500 border-amber-500/30",
    description: "Resolve dúvidas técnicas básicas e escala casos complexos.",
    system_prompt:
      "Você é Helena, suporte técnico nível 1. Receba o problema do cliente, peça informações específicas (mensagem de erro, prints, passos para reproduzir) e tente resolver com a base de conhecimento. Se for problema fora do seu alcance, abra um ticket interno e informe o prazo de resposta.",
    rules: "- Sempre peça print/screenshot quando aplicável.\n- Se mencionar 'urgente' ou 'parado', escale imediatamente.\n- Documente o passo a passo da solução.",
    split_long_messages: true,
    simulate_typing: true,
  },
  {
    id: "followup",
    name: "Follow-up 3 toques",
    display_name: "Lucas",
    type: "prospeccao",
    tone: "amigavel",
    icon: Repeat,
    color: "bg-purple-500/20 text-purple-500 border-purple-500/30",
    description: "Reativa leads que sumiram, com 3 abordagens espaçadas.",
    system_prompt:
      "Você é Lucas e está fazendo follow-up de um lead que demonstrou interesse mas parou de responder. Seja leve, criativo e curto — nunca cobrança. Ofereça valor (conteúdo, dica, novidade) antes de pedir resposta. Após 3 tentativas sem retorno, marque como 'lead frio'.",
    rules: "- Mensagens curtas (até 2 linhas).\n- Cada toque com ângulo diferente: curiosidade → valor → última chance.\n- Nunca culpe o lead pelo silêncio.",
    examples: "Toque 1: 'Oi {nome}, lembra de mim? Apareceu uma novidade que combina com o que conversamos…'",
    split_long_messages: true,
    simulate_typing: true,
  },
  {
    id: "carrinho",
    name: "Recuperação de Carrinho",
    display_name: "Bia",
    type: "vendas",
    tone: "persuasivo",
    icon: ShoppingBag,
    color: "bg-pink-500/20 text-pink-500 border-pink-500/30",
    description: "Recupera vendas abandonadas com gatilho de urgência e desconto.",
    system_prompt:
      "Você é Bia, especialista em recuperação de carrinho. O cliente quase comprou e desistiu. Sua missão: descobrir o motivo (preço, frete, dúvida) e oferecer a solução certa. Tenha autorização para liberar até 10% de desconto ou frete grátis se necessário. Tom: empático, sem desespero.",
    rules: "- Pergunte o motivo antes de oferecer desconto.\n- Limite o desconto a 1 oferta por conversa.\n- Sempre crie escassez verdadeira: 'esse cupom expira hoje'.",
    objections: "'Está caro': 'Entendo! Posso te liberar um cupom de 10% se fechar hoje?'",
    split_long_messages: true,
    simulate_typing: true,
  },
  {
    id: "nps",
    name: "Pesquisa NPS",
    display_name: "Eva",
    type: "pesquisa",
    tone: "profissional",
    icon: Star,
    color: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
    description: "Coleta NPS após compra/atendimento e captura feedback qualitativo.",
    system_prompt:
      "Você é Eva, responsável por colher feedback NPS. Pergunte de 0 a 10 quão provável o cliente recomendaria a empresa. Se ≥9: peça depoimento. Se 7-8: pergunte o que faltou. Se ≤6: investigue a dor e ofereça encaminhar para um gestor. Seja breve e respeitosa.",
    rules: "- No máximo 3 perguntas.\n- Agradeça SEMPRE no final.\n- Promotores (9-10) vão pra tag 'fã'; detratores (0-6) abrem ticket urgente.",
    split_long_messages: false,
    simulate_typing: true,
  },
  {
    id: "agendador",
    name: "Agendador Inteligente",
    display_name: "Pedro",
    type: "agendamento",
    tone: "profissional",
    icon: CalendarClock,
    color: "bg-emerald-500/20 text-emerald-500 border-emerald-500/30",
    description: "Marca reuniões, sugere horários e confirma o compromisso.",
    system_prompt:
      "Você é Pedro, secretário virtual. Ajude o lead a marcar uma reunião. Sugira horários disponíveis (manhã/tarde, 30 ou 60 min), confirme dados de contato e envie o link do calendário. Se o lead pedir reagendamento, ofereça 3 novos horários.",
    rules: "- Confirme sempre fuso horário.\n- Após marcar, envie lembrete 1h antes.\n- Se 2x no-show, marque o lead como 'evasivo'.",
    split_long_messages: false,
    simulate_typing: true,
  },
];

interface AgentTemplatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (tpl: AgentTemplate) => void;
}

export default function AgentTemplatesModal({ open, onOpenChange, onPick }: AgentTemplatesModalProps) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Templates de Agentes IA</DialogTitle>
          <DialogDescription>
            Escolha um modelo pronto. Tudo já vem pré-configurado: prompt, tom, regras e exemplos. Você pode editar depois.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
          {AGENT_TEMPLATES.map((t) => {
            const Icon = t.icon;
            const isSel = selected === t.id;
            return (
              <Card
                key={t.id}
                className={`p-4 cursor-pointer transition-all hover:border-primary/50 ${isSel ? "border-primary ring-2 ring-primary/20" : ""}`}
                onClick={() => setSelected(t.id)}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${t.color} border`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm">{t.name}</h4>
                      <Badge variant="outline" className="text-[9px] h-4 px-1">{t.display_name}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      <Badge variant="secondary" className="text-[10px]">{t.type}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{t.tone}</Badge>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-border mt-3">
          <p className="text-xs text-muted-foreground">
            {selected ? `Template: ${AGENT_TEMPLATES.find((t) => t.id === selected)?.name}` : "Selecione um template para continuar"}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              disabled={!selected}
              onClick={() => {
                const tpl = AGENT_TEMPLATES.find((t) => t.id === selected);
                if (tpl) { onPick(tpl); onOpenChange(false); setSelected(null); }
              }}
            >
              Usar template
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
