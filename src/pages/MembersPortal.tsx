import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, PlayCircle } from "lucide-react";

const embed = (url: string) => {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
};

export default function MembersPortal() {
  const { token } = useParams();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [current, setCurrent] = useState(0);
  const [done, setDone] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem(`member_done_${token}`) || "[]"); } catch { return []; } });
  useEffect(() => { (async () => {
    const { data, error } = await supabase.functions.invoke("members", { body: { token } });
    if (error || !data?.product) setError("Acesso não encontrado. Confira o link recebido no WhatsApp."); else setData(data);
  })(); }, [token]);
  const toggle = (id: string) => { const n = done.includes(id) ? done.filter(x => x !== id) : [...done, id]; setDone(n); localStorage.setItem(`member_done_${token}`, JSON.stringify(n)); };
  if (error) return <div className="min-h-screen flex items-center justify-center text-muted-foreground p-6 text-center">{error}</div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  const lessons = data.lessons as any[]; const lesson = lessons[current];
  const src = lesson?.video_url ? embed(lesson.video_url) : null;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-4 py-4"><Link to="/membros" className="text-xs text-primary">← Todos os meus cursos</Link><p className="text-xs text-muted-foreground">{data.store?.store_name} · Área de membros</p><h1 className="text-xl font-bold">{data.product.name}</h1>{data.customer_name && <p className="text-sm text-muted-foreground">Olá, {data.customer_name}!</p>}</header>
      <main className="max-w-6xl mx-auto p-4 grid gap-6 md:grid-cols-[1fr_300px]">
        <section className="space-y-3">
          {!lesson ? <p className="text-muted-foreground">As aulas serão liberadas em breve.</p> : <>
            {src ? <div className="aspect-video w-full overflow-hidden rounded-lg bg-secondary"><iframe src={src} title={lesson.title} className="h-full w-full" allow="autoplay; fullscreen" allowFullScreen /></div>
              : lesson.video_url && <Button asChild><a href={lesson.video_url} target="_blank" rel="noreferrer">Abrir conteúdo</a></Button>}
            <h2 className="text-lg font-semibold">{lesson.title}</h2>
            {lesson.description && <p className="text-sm text-muted-foreground whitespace-pre-line">{lesson.description}</p>}
            <div className="flex gap-2"><Button variant={done.includes(lesson.id) ? "default" : "outline"} onClick={() => toggle(lesson.id)}><CheckCircle2 className="h-4 w-4 mr-1" />{done.includes(lesson.id) ? "Concluída" : "Marcar como concluída"}</Button>
              {current < lessons.length - 1 && <Button variant="ghost" onClick={() => setCurrent(current + 1)}>Próxima aula</Button>}</div>
          </>}
        </section>
        <aside className="space-y-1"><p className="text-sm font-semibold mb-2">Aulas · {done.length}/{lessons.length} concluídas</p>
          {lessons.map((l, i) => <button key={l.id} onClick={() => setCurrent(i)} className={`w-full text-left flex items-center gap-2 rounded-md px-3 py-2 text-sm ${i === current ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>{done.includes(l.id) ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <PlayCircle className="h-4 w-4 shrink-0" />}<span>{i + 1}. {l.title}</span></button>)}
          {data.store?.whatsapp && <Button variant="outline" className="w-full mt-4" asChild><a href={`https://wa.me/${data.store.whatsapp}`} target="_blank" rel="noreferrer">Suporte no WhatsApp</a></Button>}
        </aside>
      </main>
    </div>
  );
}
