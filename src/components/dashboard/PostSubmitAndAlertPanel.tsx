import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface PostSubmit { mode?: "url" | "thankyou" | "form"; url?: string; thankyou?: { title?: string; message?: string }; target_form_id?: string; new_tab?: boolean; }
interface OwnerAlert { enabled?: boolean; phone?: string; message?: string; }

interface Props {
  postSubmit: PostSubmit;
  onPostSubmitChange: (v: PostSubmit) => void;
  ownerAlert: OwnerAlert;
  onOwnerAlertChange: (v: OwnerAlert) => void;
  userId?: string;
  sourceTitle?: string;
}

const DEFAULT_ALERT = `🔔 Novo lead capturado!\nNome: {{nome}}\nEmail: {{email}}\nTelefone: {{telefone}}\nFormulário: {{nome_do_forms}}\nData: {{data}}\nOrigem: {{utm_source}}`;

const PostSubmitAndAlertPanel = ({ postSubmit, onPostSubmitChange, ownerAlert, onOwnerAlertChange, userId, sourceTitle }: Props) => {
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const ps = postSubmit || {};
  const oa = ownerAlert || {};

  const sendTest = async () => {
    if (!oa.phone || !userId) return;
    setTesting(true);
    try {
      const msg = (oa.message || DEFAULT_ALERT)
        .replace(/\{\{nome\}\}/g, "Teste").replace(/\{\{email\}\}/g, "teste@teste.com")
        .replace(/\{\{telefone\}\}/g, oa.phone).replace(/\{\{nome_do_forms\}\}/g, sourceTitle || "")
        .replace(/\{\{data\}\}/g, new Date().toLocaleString("pt-BR")).replace(/\{\{utm_source\}\}/g, "test");
      await supabase.functions.invoke("send-whatsapp", { body: { user_id: userId, phone: oa.phone.replace(/\D/g, ""), message: msg } });
      toast({ title: "Alerta de teste enviado!" });
    } catch (e: any) { toast({ title: "Erro", description: e?.message, variant: "destructive" }); }
    setTesting(false);
  };

  return (
    <div className="space-y-5">
      <div className="surface-card rounded-lg p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">📤 Após o envio</p>
        <div className="flex gap-2">
          {([
            { v: "thankyou", l: "Página interna" },
            { v: "url", l: "URL personalizada" },
            { v: "form", l: "Outro forms/quiz" },
          ] as const).map(o => (
            <button key={o.v} onClick={() => onPostSubmitChange({ ...ps, mode: o.v })} className={`px-3 py-1.5 rounded text-xs font-medium ${ps.mode === o.v ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{o.l}</button>
          ))}
        </div>
        {ps.mode === "url" && (
          <div><Label className="text-[10px]">URL</Label><Input value={ps.url || ""} onChange={e => onPostSubmitChange({ ...ps, url: e.target.value })} placeholder="https://..." className="h-8 text-xs bg-secondary/50 mt-1" /></div>
        )}
        {ps.mode === "thankyou" && (
          <>
            <div><Label className="text-[10px]">Título</Label><Input value={ps.thankyou?.title || ""} onChange={e => onPostSubmitChange({ ...ps, thankyou: { ...ps.thankyou, title: e.target.value } })} className="h-8 text-xs bg-secondary/50 mt-1" /></div>
            <div><Label className="text-[10px]">Mensagem</Label><Textarea value={ps.thankyou?.message || ""} onChange={e => onPostSubmitChange({ ...ps, thankyou: { ...ps.thankyou, message: e.target.value } })} className="text-xs bg-secondary/50 mt-1" rows={3} /></div>
          </>
        )}
        {ps.mode === "form" && (
          <div><Label className="text-[10px]">ID do forms/quiz destino</Label><Input value={ps.target_form_id || ""} onChange={e => onPostSubmitChange({ ...ps, target_form_id: e.target.value })} placeholder="uuid" className="h-8 text-xs bg-secondary/50 mt-1" /></div>
        )}
        <label className="flex items-center gap-2 text-xs"><Switch checked={!!ps.new_tab} onCheckedChange={c => onPostSubmitChange({ ...ps, new_tab: c })} /> Abrir em nova aba</label>
      </div>

      <div className="surface-card rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">🔔 Alerta interno (dono)</p>
          <Switch checked={!!oa.enabled} onCheckedChange={c => onOwnerAlertChange({ ...oa, enabled: c })} />
        </div>
        {oa.enabled && (
          <>
            <div><Label className="text-[10px]">WhatsApp do responsável</Label><Input value={oa.phone || ""} onChange={e => onOwnerAlertChange({ ...oa, phone: e.target.value })} placeholder="5511999999999" className="h-8 text-xs bg-secondary/50 mt-1" /></div>
            <div><Label className="text-[10px]">Mensagem (use {`{{nome}} {{email}} {{telefone}} {{nome_do_forms}} {{data}} {{utm_source}}`})</Label>
              <Textarea value={oa.message ?? DEFAULT_ALERT} onChange={e => onOwnerAlertChange({ ...oa, message: e.target.value })} rows={6} className="text-xs bg-secondary/50 mt-1 font-mono" />
            </div>
            <Button size="sm" variant="outline" onClick={sendTest} disabled={testing || !oa.phone}>{testing ? "Enviando..." : "Testar disparo"}</Button>
          </>
        )}
      </div>
    </div>
  );
};

export default PostSubmitAndAlertPanel;
