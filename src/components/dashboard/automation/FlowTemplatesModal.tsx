import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (template: FlowTemplate) => void;
}

export interface FlowTemplate {
  name: string;
  description: string;
  trigger_keywords: string;
  nodes: any[];
  edges: any[];
}

const mkNode = (id: string, type: string, label: string, x: number, y: number, data: any) => ({ id, type, label, x, y, data });
const mkEdge = (from: string, to: string, lbl?: string) => ({ id: `${from}-${to}`, from, to, label: lbl });

export const FLOW_TEMPLATES: FlowTemplate[] = [
  {
    name: "Atendimento Inicial",
    description: "Saudação + menu de opções (vendas/suporte/horários).",
    trigger_keywords: "oi, olá, bom dia, boa tarde, boa noite",
    nodes: [
      mkNode("n1", "message", "Saudação", 80, 120, { content: "Olá {{name}}! 👋 Sou o assistente. Como posso ajudar?" }),
      mkNode("n2", "menu", "Menu", 360, 120, { options: ["Quero comprar", "Suporte", "Horários"] }),
      mkNode("n3", "ai", "IA Vendas", 640, 40, { prompt: "Atue como vendedor consultivo." }),
      mkNode("n4", "ai", "IA Suporte", 640, 200, { prompt: "Atue como suporte técnico." }),
      mkNode("n5", "message", "Horários", 640, 340, { content: "Atendemos seg-sex, 9h às 18h." }),
    ],
    edges: [mkEdge("n1", "n2"), mkEdge("n2", "n3", "1"), mkEdge("n2", "n4", "2"), mkEdge("n2", "n5", "3")],
  },
  {
    name: "Qualificação de Lead (BANT)",
    description: "Coleta orçamento, autoridade, necessidade e timing.",
    trigger_keywords: "interesse, quero saber, preço, orçamento",
    nodes: [
      mkNode("n1", "message", "Abertura", 80, 100, { content: "Oba! Pra te passar a melhor proposta, posso te perguntar 4 coisas?" }),
      mkNode("n2", "collect", "Orçamento", 320, 100, { field: "budget", question: "Qual faixa de investimento você considera?" }),
      mkNode("n3", "collect", "Decisor", 560, 100, { field: "decision", question: "Você é o responsável pela decisão?" }),
      mkNode("n4", "collect", "Necessidade", 800, 100, { field: "need", question: "Qual o principal problema que quer resolver?" }),
      mkNode("n5", "collect", "Prazo", 1040, 100, { field: "timing", question: "Pra quando precisa da solução?" }),
      mkNode("n6", "crm", "Mover etapa", 1280, 100, { action: "move_stage", stage: "Qualificado" }),
    ],
    edges: [mkEdge("n1", "n2"), mkEdge("n2", "n3"), mkEdge("n3", "n4"), mkEdge("n4", "n5"), mkEdge("n5", "n6")],
  },
  {
    name: "Agendamento",
    description: "Coleta dia/hora, confirma e cria appointment.",
    trigger_keywords: "agendar, marcar, horário, consulta",
    nodes: [
      mkNode("n1", "message", "Intro", 80, 120, { content: "Vamos agendar! Qual seu nome completo?" }),
      mkNode("n2", "collect", "Nome", 320, 120, { field: "name", question: "Nome completo" }),
      mkNode("n3", "collect", "Data", 560, 120, { field: "date", question: "Para qual dia?" }),
      mkNode("n4", "collect", "Hora", 800, 120, { field: "time", question: "Que horário?" }),
      mkNode("n5", "crm", "Criar agendamento", 1040, 120, { action: "create_appointment" }),
      mkNode("n6", "message", "Confirmação", 1280, 120, { content: "✅ Agendado! Te aguardamos." }),
    ],
    edges: [mkEdge("n1", "n2"), mkEdge("n2", "n3"), mkEdge("n3", "n4"), mkEdge("n4", "n5"), mkEdge("n5", "n6")],
  },
  {
    name: "Recuperação de Carrinho",
    description: "Reengaja quem abandonou um checkout.",
    trigger_keywords: "abandono, carrinho",
    nodes: [
      mkNode("n1", "message", "Lembrete", 80, 100, { content: "Ei {{name}}, vi que você quase finalizou. Posso te ajudar?" }),
      mkNode("n2", "buttons", "Botões", 360, 100, { buttons: ["Quero finalizar", "Tenho dúvida", "Outra hora"] }),
      mkNode("n3", "message", "Cupom", 640, 20, { content: "Aqui está um cupom de 10%: VOLTA10. Posso te enviar o link?" }),
      mkNode("n4", "ai", "Tira-dúvidas", 640, 160, { prompt: "Resolva objeções sobre o produto." }),
      mkNode("n5", "wait", "Esperar 24h", 640, 300, { hours: 24 }),
    ],
    edges: [mkEdge("n1", "n2"), mkEdge("n2", "n3", "1"), mkEdge("n2", "n4", "2"), mkEdge("n2", "n5", "3")],
  },
  {
    name: "Pesquisa de Satisfação (NPS)",
    description: "Pede nota 0-10 e segue por faixa.",
    trigger_keywords: "feedback, nps, avaliar",
    nodes: [
      mkNode("n1", "message", "Pergunta", 80, 120, { content: "De 0 a 10, quanto recomendaria nosso serviço?" }),
      mkNode("n2", "collect", "Nota", 320, 120, { field: "nps", question: "Sua nota:" }),
      mkNode("n3", "condition", "Faixa", 560, 120, { rules: [{ if: "nps>=9", to: "n4" }, { if: "nps>=7", to: "n5" }, { else: "n6" }] }),
      mkNode("n4", "message", "Promotor", 800, 20, { content: "Que ótimo! Pode deixar um depoimento?" }),
      mkNode("n5", "message", "Neutro", 800, 160, { content: "Obrigado! O que poderíamos melhorar?" }),
      mkNode("n6", "message", "Detrator", 800, 300, { content: "Sentimos muito. Quer falar com um humano agora?" }),
    ],
    edges: [mkEdge("n1", "n2"), mkEdge("n2", "n3"), mkEdge("n3", "n4"), mkEdge("n3", "n5"), mkEdge("n3", "n6")],
  },
  {
    name: "Onboarding Pós-venda",
    description: "Boas-vindas + tutorial em etapas.",
    trigger_keywords: "comprei, novo cliente, primeira vez",
    nodes: [
      mkNode("n1", "message", "Boas-vindas", 80, 120, { content: "🎉 Bem-vindo, {{name}}! Vou te guiar nos primeiros passos." }),
      mkNode("n2", "media", "Vídeo intro", 320, 120, { url: "", caption: "Veja em 2 min como começar" }),
      mkNode("n3", "wait", "Esperar 1h", 560, 120, { hours: 1 }),
      mkNode("n4", "message", "Próximo passo", 800, 120, { content: "Conseguiu acessar? Posso ajudar com algo?" }),
    ],
    edges: [mkEdge("n1", "n2"), mkEdge("n2", "n3"), mkEdge("n3", "n4")],
  },
  {
    name: "Reativação de Inativos",
    description: "Sequência para leads frios voltarem.",
    trigger_keywords: "",
    nodes: [
      mkNode("n1", "message", "Toque 1", 80, 120, { content: "Oi {{name}}, faz tempo! Voltamos com novidade." }),
      mkNode("n2", "wait", "2 dias", 320, 120, { hours: 48 }),
      mkNode("n3", "message", "Toque 2", 560, 120, { content: "Ainda tem interesse no que conversamos?" }),
      mkNode("n4", "wait", "3 dias", 800, 120, { hours: 72 }),
      mkNode("n5", "message", "Última", 1040, 120, { content: "Última chance: cupom 15% válido hoje 👉 VOLTA15" }),
    ],
    edges: [mkEdge("n1", "n2"), mkEdge("n2", "n3"), mkEdge("n3", "n4"), mkEdge("n4", "n5")],
  },
  {
    name: "Captação por Quiz",
    description: "Faz 3 perguntas e recomenda produto.",
    trigger_keywords: "quiz, descobrir, qual ideal",
    nodes: [
      mkNode("n1", "message", "Intro", 80, 120, { content: "Vou te ajudar a descobrir a melhor opção. 3 perguntas rápidas!" }),
      mkNode("n2", "collect", "P1", 320, 120, { field: "objetivo", question: "Qual seu objetivo principal?" }),
      mkNode("n3", "collect", "P2", 560, 120, { field: "tempo", question: "Quanto tempo tem disponível?" }),
      mkNode("n4", "collect", "P3", 800, 120, { field: "investimento", question: "Quanto pretende investir?" }),
      mkNode("n5", "ai", "Recomendar", 1040, 120, { prompt: "Recomende o melhor plano com base nas respostas." }),
    ],
    edges: [mkEdge("n1", "n2"), mkEdge("n2", "n3"), mkEdge("n3", "n4"), mkEdge("n4", "n5")],
  },
];

export default function FlowTemplatesModal({ open, onOpenChange, onPick }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Templates de Fluxo</DialogTitle>
          <DialogDescription>Escolha um modelo para começar — todos editáveis depois.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FLOW_TEMPLATES.map((t) => (
              <Card key={t.name}
                onClick={() => onPick(t)}
                className="p-4 cursor-pointer hover:border-primary hover:bg-primary/5 transition">
                <p className="font-semibold text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                <p className="text-[10px] text-muted-foreground mt-2">{t.nodes.length} nós · {t.edges.length} conexões</p>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
