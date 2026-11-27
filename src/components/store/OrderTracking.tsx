import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, MessageCircle } from 'lucide-react';
import { reportPaidOrder } from '@/lib/storeTracking';
export default function OrderTracking({ open, onClose, token, store, themeClass, themeStyle }: {open:boolean;onClose:()=>void;token?:string;store:any;themeClass:string;themeStyle:any}) {
  const [code,setCode]=useState(token || '');
  const [order,setOrder]=useState<any>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const check=async (value=code) => {
    setBusy(true);setError('');
    const params=new URLSearchParams(window.location.search);
    const {data,error}=await supabase.functions.invoke('infinitepay',{body:{action:'track',token:value,transaction_nsu:params.get('transaction_nsu') || undefined,slug:params.get('slug') || undefined}});
    if (error || !data?.order) {setError('Pedido não encontrado. Confira o código privado recebido ao comprar.');setOrder(null);}
    else {setOrder(data.order);setCode(value);reportPaidOrder({id:data.order.id,payment_status:data.order.payment_status,total:Number(data.order.total||0)});}
    setBusy(false);
  };
  const pay=async()=>{
    if (!order || busy) return;
    setBusy(true);setError('');
    const {data,error}=await supabase.functions.invoke('infinitepay',{body:{action:'create',order_id:order.id,token:code,redirect_url:`${window.location.origin}${window.location.pathname}?pedido=${code}`}});
    if (error || !data?.url) {setError(data?.error || 'Não foi possível abrir o pagamento.');setBusy(false);return;}
    window.location.assign(data.url);
  };
  useEffect(()=>{if(open && token){setCode(token);check(token);}},[open,token]);
  return <Dialog open={open} onOpenChange={v=>!v && onClose()}><DialogContent className={`max-w-lg ${themeClass}`} style={themeStyle}>
    <DialogHeader><DialogTitle>Acompanhar pedido</DialogTitle></DialogHeader>
    <div className="flex gap-2"><Input aria-label="Código privado do pedido" placeholder="Código privado do pedido" value={code} onChange={e=>setCode(e.target.value)} /><Button aria-label="Consultar pedido" disabled={busy || !code.trim()} onClick={()=>check()}><RefreshCw className={`h-4 w-4 ${busy?'animate-spin':''}`} /></Button></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {order && <div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Pedido #{order.order_no}</h3><Badge variant={order.payment_status==='pago'?'default':'secondary'}>{order.payment_status==='pago'?'Pagamento confirmado':'Aguardando pagamento'}</Badge></div>
      <p className="capitalize text-sm">Situação: <strong>{order.status}</strong></p>
      <div className="divide-y divide-border">{order.items?.map((i:any)=><div key={i.id} className="flex justify-between gap-3 py-2 text-sm"><span>{i.qty}x {i.name}</span><span>{Number(i.unit_price*i.qty).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</span></div>)}</div>
      <p className="font-bold">Total: {Number(order.total).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</p>
      {store.infinitepay_enabled && order.payment_status!=='pago' && order.status!=='cancelado' && <Button className="w-full" disabled={busy} onClick={pay}>{busy?'Abrindo pagamento...':'Pagar agora (Pix ou Cartão)'}</Button>}
      {order.history?.map((h:any,i:number)=><p key={i} className="text-xs text-muted-foreground">{new Date(h.at).toLocaleString('pt-BR')} · {h.status}</p>)}
      <Button variant="outline" className="w-full" asChild><a target="_blank" rel="noreferrer" href={`https://wa.me/${store.whatsapp}?text=${encodeURIComponent(`Olá! Gostaria de acompanhar o pedido #${order.order_no}. Pagamento: ${order.payment_status}.`)}`}><MessageCircle className="mr-2 h-4 w-4" />Falar sobre este pedido</a></Button>
    </div>}
  </DialogContent></Dialog>;
}