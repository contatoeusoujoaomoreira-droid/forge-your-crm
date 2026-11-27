import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, LogOut } from "lucide-react";

type Course = { token: string; name: string; description?: string; cover?: string | null; category: string; lessons: number };
const KEY = "members_session";

export default function MembersHome() {
  const [session, setSession] = useState<{ email: string; courses: Course[] } | null>(() => { try { return JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch { return null; } });
  const [email, setEmail] = useState(""); const [code, setCode] = useState(""); const [step, setStep] = useState<"email" | "code">("email");
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const request = async () => {
    setBusy(true); setMsg("");
    const { data } = await supabase.functions.invoke("members", { body: { action: "request_code", email } });
    setMsg(data?.message || "Código enviado."); setStep("code"); setBusy(false);
  };
  const verify = async () => {
    setBusy(true); setMsg("");
    const { data, error } = await supabase.functions.invoke("members", { body: { action: "verify", email, code } });
    if (error || !data?.courses) { setMsg(data?.error || "Código incorreto ou expirado."); setBusy(false); return; }
    sessionStorage.setItem(KEY, JSON.stringify(data)); setSession(data); setBusy(false);
  };
  if (!session) return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Área de membros</h1>
        <p className="text-sm text-muted-foreground">Entre com o e-mail usado na compra. Enviaremos um código para o seu WhatsApp.</p>
        {step === "email" ? <>
          <Input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
          <Button className="w-full" disabled={busy || !/^\S+@\S+\.\S+$/.test(email)} onClick={request}>{busy ? "Enviando..." : "Receber código"}</Button>
        </> : <>
          <Input inputMode="numeric" maxLength={6} placeholder="Código de 6 números" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} />
          <Button className="w-full" disabled={busy || code.length !== 6} onClick={verify}>{busy ? "Entrando..." : "Entrar"}</Button>
          <Button variant="ghost" className="w-full" onClick={() => { setStep("email"); setCode(""); }}>Trocar e-mail</Button>
        </>}
        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
      </div>
    </div>
  );
  const featured = session.courses[0];
  const groups = session.courses.reduce<Record<string, Course[]>>((a, c) => { (a[c.category] ||= []).push(c); return a; }, {});
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between px-6 py-4"><span className="text-lg font-bold text-primary">Área de membros</span>
        <Button variant="ghost" size="sm" onClick={() => { sessionStorage.removeItem(KEY); setSession(null); setStep("email"); }}><LogOut className="h-4 w-4 mr-1" />Sair</Button></header>
      {!featured ? <p className="p-6 text-muted-foreground">Nenhum curso encontrado para {session.email}.</p> : <>
        <section className="relative h-[55vh] min-h-[320px] overflow-hidden">
          {featured.cover && <img src={featured.cover} alt={featured.name} className="absolute inset-0 h-full w-full object-cover opacity-60" />}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="relative z-10 flex h-full max-w-2xl flex-col justify-end gap-3 p-6 md:p-12">
            <h1 className="text-3xl md:text-5xl font-bold">{featured.name}</h1>
            {featured.description && <p className="line-clamp-3 text-sm md:text-base text-muted-foreground">{featured.description}</p>}
            <Button asChild size="lg" className="w-fit"><Link to={`/membros/${featured.token}`}><Play className="h-5 w-5 mr-2" />Assistir</Link></Button>
          </div>
        </section>
        <main className="space-y-8 px-6 pb-12">
          {Object.entries(groups).map(([cat, list]) => (
            <section key={cat}><h2 className="mb-3 text-lg font-semibold">{cat}</h2>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {list.map(c => <Link key={c.token} to={`/membros/${c.token}`} className="group w-56 shrink-0">
                  <div className="aspect-video overflow-hidden rounded-md bg-secondary">{c.cover ? <img src={c.cover} alt={c.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" /> : <div className="flex h-full items-center justify-center"><Play className="h-8 w-8 text-muted-foreground" /></div>}</div>
                  <p className="mt-2 text-sm font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{c.lessons} aula(s)</p>
                </Link>)}
              </div></section>
          ))}
        </main>
      </>}
    </div>
  );
}
