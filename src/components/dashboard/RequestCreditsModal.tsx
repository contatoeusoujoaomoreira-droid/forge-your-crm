import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Coins, MessageCircle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const SUPPORT_WHATSAPP = "5511999999999"; // ajustável pelo super admin
const SUPPORT_EMAIL = "suporte@omnibuildercrm.online";

export default function RequestCreditsModal({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState(500);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!user || amount <= 0) return;
    setLoading(true);
    const { error } = await supabase.from("credit_requests").insert({
      user_id: user.id, amount, message, status: "pending",
    } as any);
    setLoading(false);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Solicitação enviada!", description: "Nosso time revisará em breve." });
    onOpenChange(false);
  };

  const waLink = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(`Olá! Quero comprar ${amount} créditos. ${message}`)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Coins className="h-5 w-5 text-primary" /> Solicitar mais créditos</DialogTitle>
          <DialogDescription>Informe quantos créditos deseja e nosso time entrará em contato para confirmar a compra.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Quantidade de créditos</label>
            <Input type="number" min={50} step={50} value={amount} onChange={(e) => setAmount(Math.max(50, Number(e.target.value) || 0))} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Mensagem (opcional)</label>
            <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ex.: preciso para campanha de fim de mês..." />
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={submit} disabled={loading} className="w-full">
              {loading ? "Enviando..." : "Enviar solicitação ao super admin"}
            </Button>
            <a href={waLink} target="_blank" rel="noreferrer">
              <Button variant="outline" className="w-full">
                <MessageCircle className="h-4 w-4 mr-2" /> Falar no WhatsApp ({SUPPORT_WHATSAPP})
              </Button>
            </a>
            <a href={`mailto:${SUPPORT_EMAIL}?subject=Compra de créditos&body=${encodeURIComponent(`Quero ${amount} créditos. ${message}`)}`}>
              <Button variant="ghost" className="w-full text-xs">📧 {SUPPORT_EMAIL}</Button>
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
