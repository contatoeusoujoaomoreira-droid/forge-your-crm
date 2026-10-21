import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ShoppingCart, ExternalLink, Copy, Globe } from "lucide-react";

const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

export default function StoreSettings() {
  const { user } = useAuth();
  const [s, setS] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("store_settings").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      setS(data || { store_name: "Minha Loja", slug: `loja-${user.id.slice(0, 6)}`, whatsapp: "", logo_url: "", primary_color: "#84cc16", welcome_text: "", is_published: false });
    });
  }, [user]);

  const save = async () => {
    if (!user || !s) return;
    const slug = slugify(s.slug || s.store_name);
    if (!slug) { toast.error("Informe o endereço da loja"); return; }
    const digits = String(s.whatsapp || "").replace(/\D/g, "");
    if (s.is_published && digits.length < 10) { toast.error("Informe o WhatsApp com DDD para receber os pedidos"); return; }
    setSaving(true);
    const payload = { ...s, slug, whatsapp: digits, user_id: user.id };
    delete payload.id; delete payload.created_at; delete payload.updated_at;
    const { data, error } = await supabase.from("store_settings").upsert(payload, { onConflict: "user_id" }).select().single();
    setSaving(false);
    if (error) { toast.error(error.message.includes("slug") ? "Esse endereço já está em uso, escolha outro" : error.message); return; }
    setS(data); toast.success("Loja salva!");
  };

  if (!s) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  const url = `${window.location.origin}/loja/${slugify(s.slug || "")}`;

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><ShoppingCart className="h-6 w-6 text-primary" />Loja Virtual</h2>
        <p className="text-sm text-muted-foreground">Seu catálogo com carrinho. O cliente escolhe os produtos e o pedido chega pronto no seu WhatsApp.</p>
      </div>
      <Card className="p-4 space-y-3">
        <div><Label>Nome da loja</Label><Input value={s.store_name} onChange={(e) => setS({ ...s, store_name: e.target.value })} /></div>
        <div><Label>Endereço da loja</Label>
          <div className="flex items-center gap-1 text-sm"><span className="text-muted-foreground whitespace-nowrap">{window.location.origin}/loja/</span><Input value={s.slug} onChange={(e) => setS({ ...s, slug: slugify(e.target.value) })} /></div>
        </div>
        <div><Label>WhatsApp que recebe os pedidos (com DDD)</Label><Input value={s.whatsapp || ""} onChange={(e) => setS({ ...s, whatsapp: e.target.value })} placeholder="5511999998888" /></div>
        <div><Label>Logo (link da imagem)</Label><Input value={s.logo_url || ""} onChange={(e) => setS({ ...s, logo_url: e.target.value })} placeholder="https://..." /></div>
        <div><Label>Cor principal</Label><Input type="color" className="h-10 w-24 p-1" value={s.primary_color || "#84cc16"} onChange={(e) => setS({ ...s, primary_color: e.target.value })} /></div>
        <div><Label>Mensagem de boas-vindas</Label><Textarea rows={2} value={s.welcome_text || ""} onChange={(e) => setS({ ...s, welcome_text: e.target.value })} placeholder="Ex: Entregamos em toda a região em até 24h!" /></div>
        <div className="flex items-center gap-2"><Switch checked={s.is_published} onCheckedChange={(v) => setS({ ...s, is_published: v })} /><Label>Loja publicada (visível para clientes)</Label></div>
        <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar loja"}</Button>
      </Card>
      {s.id && (
        <Card className="p-4 space-y-2">
          <Label>Link da sua loja</Label>
          <div className="flex gap-2">
            <Input readOnly value={url} />
            <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(url); toast.success("Link copiado!"); }}><Copy className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" asChild><a href={url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a></Button>
          </div>
          {!s.is_published && <p className="text-xs text-destructive">A loja está despublicada — ligue "Loja publicada" para os clientes verem.</p>}
        </Card>
      )}
      <Card className="p-4 space-y-2 text-sm">
        <p className="font-semibold flex items-center gap-2"><Globe className="h-4 w-4" />Quer usar seu próprio domínio?</p>
        <p className="text-muted-foreground">Ex: pedidos.sualoja.com.br. Cadastre o domínio em <b>Configurações → Domínios</b> e vincule à Loja; lá aparecem as instruções do apontamento no Registro.br ou Cloudflare.</p>
      </Card>
    </div>
  );
}
