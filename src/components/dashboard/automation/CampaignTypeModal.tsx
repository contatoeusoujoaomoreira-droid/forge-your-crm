import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Bot, GitBranch, FileText, PenSquare } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (kind: "agent" | "flow" | "template" | "blank") => void;
}

const OPTIONS = [
  { id: "agent", icon: Bot, title: "Com Agente IA", desc: "A campanha usa um agente que conversa em nome da sua marca." },
  { id: "flow", icon: GitBranch, title: "Com Fluxo de conversa", desc: "Caminho pré-definido com nós: pergunta, condição, ação." },
  { id: "template", icon: FileText, title: "Template pronto", desc: "Modelos de prospecção testados (frio, retenção, reativação...)." },
  { id: "blank", icon: PenSquare, title: "Do zero", desc: "Crie sua mensagem sem ajuda — total controle." },
] as const;

export default function CampaignTypeModal({ open, onOpenChange, onPick }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Como quer criar esta campanha?</DialogTitle>
          <DialogDescription>Escolha o ponto de partida — você poderá ajustar tudo depois.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {OPTIONS.map(({ id, icon: Icon, title, desc }) => (
            <Card key={id} onClick={() => onPick(id as any)}
              className="p-4 cursor-pointer hover:border-primary hover:bg-primary/5 transition">
              <Icon className="h-6 w-6 text-primary mb-2" />
              <p className="font-semibold text-sm">{title}</p>
              <p className="text-xs text-muted-foreground mt-1">{desc}</p>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const CAMPAIGN_TEMPLATES: Record<string, { name: string; description: string; message_template: string }[]> = {
  prospect: [
    { name: "Cold outreach — apresentação", description: "Primeiro contato curto e direto", message_template: "Olá {{name}}! Vi seu trabalho e tenho uma ideia que pode te ajudar. Posso te explicar em 2 linhas?" },
    { name: "Reativação de inativos", description: "Retomar contato com leads frios", message_template: "Oi {{name}}, faz tempo! Voltamos com uma novidade que vai te interessar. Quer ouvir?" },
    { name: "Pós-venda — feedback", description: "Coletar feedback de cliente", message_template: "Oi {{name}}! Tudo certo com sua compra? Posso te perguntar 2 coisas pra melhorar nosso atendimento?" },
    { name: "Carrinho abandonado", description: "Recuperar venda perdida", message_template: "Ei {{name}}, vi que você quase finalizou! Posso te ajudar com algo? Tenho um cupom de 10% pra hoje." },
  ],
};
