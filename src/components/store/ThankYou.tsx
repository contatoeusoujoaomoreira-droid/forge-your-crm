import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, GraduationCap, RefreshCw } from 'lucide-react';
import { reportPaidOrder } from '@/lib/storeTracking';
const brl = (v: number) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
// Post-purchase page for digital products/services: access + upsell instead of order tracking.
export default function ThankYou({ token, products, onBuy, onClose, themeClass, themeStyle }: { token: string; products: any[]; onBuy: (p: any) => void; onClose: () => void; themeClass: string; themeStyle: any }) {
  const [order, setOrder] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const check = async () => {
    setBusy(true);
    const params = new URLSearchParams(window.location.search);
    const { data } = await supabase.functions.invoke('infinitepay', { body: { action: 'track', token, transaction_nsu: params.get('transaction_nsu') || undefined, slug: params.get('slug') || undefined } });
    if (data?.order) { setOrder(data.order); reportPaidOrder({ id: data.order.id, payment_status: data.order.payment_status, total: Number(data.order.total || 0) }); }
    setBusy(false);
  };
  useEffect(() => { check(); }, [token]);
  const paid = ['pago', 'paid'].includes(order?.payment_status);
  const bought = new Set((order?.items || []).map((i: any) => i.id));
  const offers = products.filter((p) => (p.delivery_type === 'digital' || p.item_type === 'service') && !bought.has(p.id) && p.price != null).slice(0, 3);
  return <Dialog open onOpenChange={(v) => !v && onClose()}><DialogContent className={`max-w-lg max-h-[90vh] overflow-y-auto ${themeClass}`} style={themeStyle}>
    <DialogHeader><DialogTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-primary" />{paid ? 'Compra confirmada!' : 'Obrigado pela compra!'}</DialogTitle></DialogHeader>
    {!order ? <p className="text-sm text-muted-foreground">Confirmando seu pagamento...</p> : <div className="space-y-4">
      <p className="text-sm">{paid ? `Olá ${order.customer_name || ''}! Seu acesso já foi liberado e enviado no seu WhatsApp.` : 'Estamos aguardando a confirmação do pagamento. Assim que for aprovado, o acesso chega no seu WhatsApp.'}</p>
      {order.items?.map((i: any) => <p key={i.id} className="text-sm font-medium">• {i.name}</p>)}
      {paid ? <Button className="w-full" asChild><a href={`${window.location.origin}/membros`}><GraduationCap className="h-4 w-4 mr-2" />Acessar minha área de membros</a></Button>
        : <Button variant="outline" className="w-full" disabled={busy} onClick={check}><RefreshCw className={`h-4 w-4 mr-2 ${busy ? 'animate-spin' : ''}`} />Verificar pagamento</Button>}
      {offers.length > 0 && <div className="space-y-2 border-t border-border pt-4"><p className="font-semibold">Aproveite também</p>
        {offers.map((p) => <div key={p.id} className="flex items-center gap-3 rounded-md border border-border p-2">
          {p.images?.[0] && <img src={p.images[0]} alt={p.name} className="h-12 w-12 rounded object-cover" />}
          <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{p.name}</p><p className="text-xs text-muted-foreground">{brl(Number(p.price))}</p></div>
          <Button size="sm" onClick={() => onBuy(p)}>Quero</Button></div>)}
      </div>}
    </div>}
  </DialogContent></Dialog>;
}
