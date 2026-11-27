import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, ExternalLink, GraduationCap } from "lucide-react";
import MemberLessons from "./MemberLessons";

export default function MembersAdmin() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [domain, setDomain] = useState<string | null>(null);
  useEffect(() => { if (!user) return; (async () => {
    const { data } = await supabase.from("products_services").select("id,name,images").eq("user_id", user.id).eq("delivery_type", "digital").order("name");
    setItems(data || []); setSel(s => s || data?.[0]?.id || null);
    const { data: st } = await supabase.from("store_settings").select("custom_domain").eq("user_id", user.id).maybeSingle();
    setDomain(st?.custom_domain || null);
  })(); }, [user]);
  const url = `${domain ? `https://${domain}` : window.location.origin}/membros`;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><GraduationCap className="h-6 w-6 text-primary" />Área de Membros</h1>
          <p className="text-sm text-muted-foreground">Endereço dos seus alunos: {url}</p></div>
        <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(url); toast.success("Link copiado"); }}><Copy className="h-4 w-4 mr-1" />Copiar</Button>
          <Button size="sm" asChild><a href="/membros" target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 mr-1" />Abrir</a></Button></div>
      </div>
      {items.length === 0 ? <p className="text-muted-foreground">Nenhum curso ainda. Vá em Produtos → Novo serviço → ligue "Infoproduto / curso digital" e salve. Ele aparece aqui.</p> :
        <div className="grid gap-4 md:grid-cols-[240px_1fr]">
          <div className="space-y-1">{items.map(p => <button key={p.id} onClick={() => setSel(p.id)} className={`w-full rounded-md px-3 py-2 text-left text-sm ${sel === p.id ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>{p.name}</button>)}</div>
          {sel && user && <MemberLessons key={sel} productId={sel} userId={user.id} />}
        </div>}
    </div>
  );
}
