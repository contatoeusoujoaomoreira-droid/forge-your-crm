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
import { ShoppingCart, ExternalLink, Copy, Globe, Upload, ImageIcon } from "lucide-react";
import StoreOrders from "./StoreOrders";

const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

export default function StoreSettings() {
  const { user } = useAuth();
  const [s, setS] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [ipTest, setIpTest] = useState<{ ok: boolean; message: string } | null>(null);
  const [ipTesting, setIpTesting] = useState(false);
  const testInfinitePay = async () => {
    setIpTesting(true); setIpTest(null);
    const { data, error } = await supabase.functions.invoke("infinitepay?action=test", { body: { handle: s.infinitepay_handle || "" } });
    setIpTest(error ? { ok: false, message: "Não foi possível testar agora. Tente de novo." } : data);
    setIpTesting(false);
  };

  const [uploading, setUploading] = useState<string | null>(null);
  const uploadImg = async (field: "logo_url" | "banner_url", file?: File) => {
    if (!user || !file) return;
    if (!file.type.startsWith("image/")) { toast.error("Escolha um arquivo de imagem"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Imagem muito grande (máx. 5 MB)"); return; }
    setUploading(field);
    const path = `${user.id}/store/${field}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    const { error } = await supabase.storage.from("chat-media").upload(path, file, { upsert: true });
    setUploading(null);
    if (error) { toast.error("Falha ao enviar: " + error.message); return; }
    const { data } = supabase.storage.from("chat-media").getPublicUrl(path);
    setS((x: any) => ({ ...x, [field]: data.publicUrl }));
    toast.success("Imagem enviada! Clique em Salvar loja.");
  };
  const ImgField = ({ field, label, wide }: { field: "logo_url" | "banner_url"; label: string; wide?: boolean }) => (
    <div><Label>{label}</Label>
      <div className="flex items-center gap-3 mt-1">
        {s[field] ? <img src={s[field]} alt="" className={wide ? "h-16 w-32 rounded-md object-cover border border-border" : "h-16 w-16 rounded-full object-cover border border-border"} /> : <div className={`${wide ? "h-16 w-32 rounded-md" : "h-16 w-16 rounded-full"} border border-dashed border-border flex items-center justify-center text-muted-foreground`}><ImageIcon className="h-5 w-5" /></div>}
        <label className="cursor-pointer"><input type="file" accept="image/*" className="hidden" onChange={(e) => { uploadImg(field, e.target.files?.[0]); e.target.value = ""; }} />
          <span className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"><Upload className="h-4 w-4" />{uploading === field ? "Enviando..." : s[field] ? "Trocar imagem" : "Enviar imagem"}</span></label>
        {s[field] && <Button type="button" variant="ghost" size="sm" onClick={() => setS({ ...s, [field]: null })}>Remover</Button>}
      </div>
    </div>
  );

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
    const custom_domain = String(s.custom_domain || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "") || null;
    const infinitepay_handle = String(s.infinitepay_handle || "").trim().replace(/^\$/, "") || null;
    if (s.infinitepay_enabled && !infinitepay_handle) { toast.error("Informe sua InfiniteTag para receber pagamentos"); setSaving(false); return; }
    const payload = { ...s, infinitepay_handle, slug, whatsapp: digits, user_id: user.id, custom_domain };
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
        <ImgField field="logo_url" label="Logo da loja" />
        <ImgField field="banner_url" label="Banner de capa" wide />
        <div><Label>Horário de funcionamento</Label><Input value={s.opening_hours || ""} onChange={(e) => setS({ ...s, opening_hours: e.target.value })} placeholder="Seg a Sáb, 8h às 18h" /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Pedido mínimo (R$)</Label><Input type="number" min={0} value={s.min_order ?? 0} onChange={(e) => setS({ ...s, min_order: Math.max(0, Number(e.target.value) || 0) })} /></div>
          <div><Label>Taxa de entrega (R$)</Label><Input type="number" min={0} value={s.delivery_fee ?? 0} onChange={(e) => setS({ ...s, delivery_fee: Math.max(0, Number(e.target.value) || 0) })} /></div>
        </div>
        <div className="space-y-2 rounded-md border border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <div><Label>Receber pagamento online (InfinitePay)</Label><p className="text-[11px] text-muted-foreground">Cliente paga por Pix ou cartão. A loja e o agente de IA enviam o link de pagamento.</p></div>
            <Switch checked={!!s.infinitepay_enabled} onCheckedChange={(v) => setS({ ...s, infinitepay_enabled: v })} />
          </div>
          {s.infinitepay_enabled && (
            <ol className="text-xs text-muted-foreground list-decimal pl-4 space-y-1 rounded-md bg-muted/40 p-3">
              <li>Ainda não tem conta? <a className="text-primary underline" href="https://www.infinitepay.io" target="_blank" rel="noreferrer">Crie grátis na InfinitePay</a> (baixe o app e cadastre-se com CPF ou CNPJ).</li>
              <li>No app, toque no seu perfil e copie sua <b>InfiniteTag</b> (o nome que começa com $).</li>
              <li>Ative o checkout online: <a className="text-primary underline" href="https://app.infinitepay.io" target="_blank" rel="noreferrer">abra o painel da InfinitePay</a> → Checkout / Link de pagamento → ativar.</li>
              <li>Cole a tag abaixo (sem o $), clique em <b>Testar conexão</b> e depois em <b>Salvar loja</b>.</li>
            </ol>
          )}
          {s.infinitepay_enabled && (
            <div><Label>Sua InfiniteTag</Label><Input value={s.infinitepay_handle || ""} onChange={(e) => setS({ ...s, infinitepay_handle: e.target.value })} placeholder="minha_loja (sem o $)" />
              <p className="text-[11px] text-muted-foreground mt-1">Encontre no app InfinitePay, no seu perfil. O dinheiro cai direto na sua conta InfinitePay.</p>
              <Button type="button" variant="outline" size="sm" className="mt-2" disabled={ipTesting} onClick={testInfinitePay}>{ipTesting ? "Testando..." : "🔍 Testar conexão com a InfinitePay"}</Button>
              {ipTest && <p className={`text-xs mt-2 ${ipTest.ok ? "text-primary" : "text-destructive"}`}>{ipTest.ok ? "✅ " : "⚠️ "}{ipTest.message}</p>}
            </div>
          )}
        </div>
        <div><Label>Fundo da loja</Label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {[["dark", "Escuro"], ["light", "Claro"], ["custom", "Personalizado"]].map(([v, l]) => (
              <Button key={v} type="button" variant={(s.store_theme || "dark") === v ? "default" : "outline"} onClick={() => setS({ ...s, store_theme: v, store_bg_color: v === "custom" ? (s.store_bg_color || "#f5f0e8") : s.store_bg_color })}>{l}</Button>
            ))}
          </div>
          {s.store_theme === "custom" && <div className="flex items-center gap-2 mt-2"><Input type="color" className="h-10 w-24 p-1" value={s.store_bg_color || "#f5f0e8"} onChange={(e) => setS({ ...s, store_bg_color: e.target.value })} /><span className="text-xs text-muted-foreground">Cor do fundo. O texto se ajusta sozinho para ficar legível.</span></div>}
        </div>
        <div><Label>Cor principal</Label><Input type="color" className="h-10 w-24 p-1" value={s.primary_color || "#84cc16"} onChange={(e) => setS({ ...s, primary_color: e.target.value })} /></div>
        <div><Label>Mensagem de boas-vindas</Label><Textarea rows={2} value={s.welcome_text || ""} onChange={(e) => setS({ ...s, welcome_text: e.target.value })} placeholder="Ex: Entregamos em toda a região em até 24h!" /></div>
        <div className="space-y-1 rounded-md border border-border p-3">
          <Label>Domínio próprio (opcional)</Label>
          <Input value={s.custom_domain || ""} onChange={(e) => setS({ ...s, custom_domain: e.target.value })} placeholder="minhaloja.com.br" />
          <p className="text-xs text-muted-foreground">No provedor do domínio (Registro.br, GoDaddy...), crie um registro <b>A</b> para <b>@</b> e <b>www</b> apontando para <b>185.158.133.1</b>. Depois avise o suporte da plataforma para ativar o domínio e o cadeado de segurança (HTTPS). Quando ativo, ao abrir o domínio a sua loja aparece direto.</p>
        </div>
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
      {s.id && <StoreOrders storeName={s.store_name} />}
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
