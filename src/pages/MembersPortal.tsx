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
  if (data.product?.members_external_url) return <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center"><h1 className="text-2xl font-bold">{data.product.name}</h1><p className="text-muted-foreground">Seu conteúdo está em outra plataforma.</p><Button asChild size="lg"><a href={data.product.members_external_url} target="_blank" rel="noreferrer">Acessar conteúdo</a></Button><Link to="/membros" className="text-xs text-primary">← Todos os meus cursos</Link></div>;
  const mods = (data.modules || []) as any[];
  const order = (m: any) => m ? mods.findIndex(x => x.id === m) : 9999;
  const lessons = [...(data.lessons as any[])].sort((a, b) => order(a.module_id) - order(b.module_id) || a.position - b.position); const lesson = lessons[current];
  const src = lesson?.video_url && (lesson.content_type || 'video') === 'video' ? embed(lesson.video_url) : null;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-4 py-4"><Link to="/membros" className="text-xs text-primary">← Todos os meus cursos</Link><p className="text-xs text-muted-foreground">{data.store?.store_name} · Área de membros</p><h1 className="text-xl font-bold">{data.product.name}</h1>{data.customer_name && <p className="text-sm text-muted-foreground">Olá, {data.customer_name}!</p>}</header>
      <main className="max-w-6xl mx-auto p-4 grid gap-6 md:grid-cols-[1fr_300px]">
        <section className="space-y-3">
          {!lesson ? <p className="text-muted-foreground">As aulas serão liberadas em breve.</p> : <>
            {src ? <div className="aspect-video w-full overflow-hidden rounded-lg bg-secondary"><iframe src={src} title={lesson.title} className="h-full w-full" allow="autoplay; fullscreen" allowFullScreen /></div>
              : lesson.content_type === "pdf" && lesson.file_url ? <iframe src={lesson.file_url} title={lesson.title} className="h-[70vh] w-full rounded-lg bg-secondary" />
              : (lesson.file_url || lesson.video_url) && <Button asChild><a href={lesson.file_url || lesson.video_url} target="_blank" rel="noreferrer">{lesson.file_url ? "Baixar material" : "Abrir conteúdo"}</a></Button>}
            {lesson.content_type === "pdf" && lesson.file_url && <Button variant="outline" size="sm" asChild><a href={lesson.file_url} target="_blank" rel="noreferrer">Baixar PDF</a></Button>}
            <h2 className="text-lg font-semibold">{lesson.title}</h2>
            {lesson.description && <p className="text-sm text-muted-foreground whitespace-pre-line">{lesson.description}</p>}
            <div className="flex gap-2"><Button variant={done.includes(lesson.id) ? "default" : "outline"} onClick={() => toggle(lesson.id)}><CheckCircle2 className="h-4 w-4 mr-1" />{done.includes(lesson.id) ? "Concluída" : "Marcar como concluída"}</Button>
              {current < lessons.length - 1 && <Button variant="ghost" onClick={() => setCurrent(current + 1)}>Próxima aula</Button>}</div>
          </>}
        </section>
        <aside className="space-y-1"><p className="text-sm font-semibold mb-2">Aulas · {done.length}/{lessons.length} concluídas</p>
          {lessons.map((l, i) => <div key={l.id}>{l.module_id && l.module_id !== lessons[i - 1]?.module_id && (() => { const m = mods.find(x => x.id === l.module_id); return m && <div className="mt-3 mb-1 overflow-hidden rounded-md bg-secondary">{m.cover_url && <img src={m.cover_url} alt={m.title} className="aspect-video w-full object-cover" />}<p className="px-3 py-2 text-xs font-semibold uppercase">{m.title}</p></div>; })()}<button key={l.id} onClick={() => setCurrent(i)} className={`w-full text-left flex items-center gap-2 rounded-md px-3 py-2 text-sm ${i === current ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>{done.includes(l.id) ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <PlayCircle className="h-4 w-4 shrink-0" />}<span>{i + 1}. {l.title}</span></button></div>)}
          {data.store?.whatsapp && <Button variant="outline" className="w-full mt-4" asChild><a href={`https://wa.me/${data.store.whatsapp}`} target="_blank" rel="noreferrer">Suporte no WhatsApp</a></Button>}
        </aside>
      </main>
    </div>
  );
}
