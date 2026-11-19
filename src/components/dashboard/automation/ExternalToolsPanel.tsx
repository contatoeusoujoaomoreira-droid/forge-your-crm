import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { Plus, Trash2, Save, FlaskConical, Plug, Filter, BookOpen, ChevronDown, ChevronUp, Link2 } from "lucide-react";

type Param = { name: string; description: string; type: "string" | "number"; required?: boolean };
type Tool = { id?: string; name: string; description: string; kind: "search" | "lead_push" | "action"; method: string; url: string; headers: Record<string, string>; params: Param[]; active: boolean; auth_type?: "api_key" | "bearer" | "none"; auth_header?: string; credential?: string; credential_configured?: boolean; last_test_status?: number | null };

const db = supabase as any;
const PRODUCTS_API = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/products-sync`;
const IMOVEIS_PARAMS: Param[] = [
  { name: "q", description: "Texto livre do que o cliente procura", type: "string" },
  { name: "categoria", description: "Categoria ou tipo do item procurado", type: "string" },
  { name: "preco_max", description: "Valor máximo em reais", type: "number" },
];
const LEAD_PARAMS: Param[] = [
  { name: "interesse", description: "Resumo do que o cliente procura", type: "string", required: true },
  { name: "codigo_item", description: "Código do produto/item de interesse, se houver", type: "string" },
];
const blank = (kind: Tool["kind"]): Tool => ({
  name: kind === "search" ? "buscar_itens" : "enviar_lead",
  description: kind === "search" ? "Busca itens disponíveis no sistema externo (produtos, catálogo, estoque). Use sempre que o cliente procurar algo." : "Envia o lead para o CRM do sistema externo quando o cliente demonstrar interesse.",
  kind, method: kind === "search" ? "GET" : "POST", url: "", headers: { "x-api-key": "" },
  params: kind === "search" ? IMOVEIS_PARAMS : kind === "lead_push" ? LEAD_PARAMS : [], active: true, auth_type: "api_key", auth_header: "x-api-key", credential: "",
});

export default function ExternalToolsPanel() {
  const { user } = useAuth();
  const [tools, setTools] = useState<Tool[]>([]);
  const [triage, setTriage] = useState<any>(null);
  const [agentList, setAgentList] = useState<any[]>([]);
  useEffect(() => { if (!user) return; (supabase as any).from("ai_agents").select("id, name").eq("user_id", user.id).eq("is_active", true).then(({ data }: any) => setAgentList(data || [])); }, [user?.id]);
  const [testArgs, setTestArgs] = useState<Record<number, string>>({});
  const [testOut, setTestOut] = useState<Record<number, string>>({});
  const [showGuide, setShowGuide] = useState(false);
  const [openRows, setOpenRows] = useState<Record<string, boolean>>({});
  const [wizard, setWizard] = useState<null | { system: string; searchUrl: string; leadUrl: string; key: string; header: string; search: boolean; lead: boolean; saving?: boolean }>(null);
  const rowKey = (t: Tool, i: number) => t.id || `new-${i}`;
  const isOpen = (t: Tool, i: number) => !t.id || !!openRows[rowKey(t, i)];

  const saveWizard = async () => {
    if (!wizard) return;
    const slug = (wizard.system || "sistema").toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "sistema";
    const jobs: any[] = [];
    if (wizard.search) jobs.push({ name: `consultar_${slug}`, description: `Consulta itens disponíveis no ${wizard.system || "sistema externo"} (catálogo, produtos, estoque). Use quando o cliente procurar algo ou informar um código.`, kind: "search", method: "GET", url: wizard.searchUrl.trim(), params: IMOVEIS_PARAMS });
    if (wizard.lead) jobs.push({ name: `enviar_lead_${slug}`, description: `Envia o contato para o CRM do ${wizard.system || "sistema externo"} quando o cliente demonstrar interesse.`, kind: "lead_push", method: "POST", url: (wizard.leadUrl || wizard.searchUrl).trim(), params: LEAD_PARAMS });
    if (!jobs.length) return toast.error("Marque pelo menos uma opção");
    if (jobs.some(j => !/^https:\/\//i.test(j.url))) return toast.error("Os endereços precisam começar com https://");
    setWizard({ ...wizard, saving: true });
    for (const j of jobs) {
      const { data, error } = await supabase.functions.invoke("external-tool-save", { body: { ...j, active: true, auth_type: wizard.key ? "api_key" : "none", auth_header: wizard.header || "x-api-key", credential: wizard.key || undefined } });
      if (error || !data?.ok) { setWizard({ ...wizard, saving: false }); const d = error instanceof FunctionsHttpError ? await error.context.json().catch(() => ({})) : {}; return toast.error(d.error || data?.error || "Não foi possível salvar"); }
    }
    toast.success("Sistema conectado"); setWizard(null); load();
  };

  const load = async () => {
    if (!user) return;
    const [{ data: t }, { data: tr }] = await Promise.all([
      db.from("external_tools").select("*").eq("user_id", user.id).order("created_at"),
      db.from("ai_triage_settings").select("*").eq("user_id", user.id).maybeSingle(),
    ]);
    setTools(previous => [...(t || []), ...previous.filter(tool => !tool.id)]);
    setTriage({ enabled: false, keywords: "", ignore_known_clients: true, triage_message: "", menu_enabled: false, menu_message: "Olá! Como podemos te ajudar? Escolha uma opção:", menu_options: [], menu_only_new: true, ad_auto_detect: true, ad_keywords: "", ad_match_mode: "contains", ...(tr || {}) });
  };
  useEffect(() => { load(); }, [user?.id]);

  const upd = (i: number, patch: Partial<Tool>) => setTools((p) => p.map((t, j) => (j === i ? { ...t, ...patch } : t)));

  const save = async (i: number) => {
    if (!user) return;
    const t = tools[i];
    if (!/^https:\/\//i.test(t.url)) return toast.error("O endereço precisa começar com https://");
    const row = { id: t.id, name: t.name, description: t.description, kind: t.kind, method: t.method, url: t.url.trim(), params: t.params, active: t.active, auth_type: t.auth_type || "api_key", auth_header: t.auth_header || "x-api-key", credential: t.credential || undefined };
    const { error, data } = await supabase.functions.invoke("external-tool-save", { body: row });
    if (error) {
      const detail = error instanceof FunctionsHttpError ? await error.context.json().catch(() => ({})) : {};
      return toast.error(detail.error || "Não foi possível salvar. Confira sua sessão.");
    }
    if (!data?.ok) return toast.error(data?.error || "Não foi possível salvar");
    setTools(previous => previous.filter((_, index) => index !== i));
    toast.success("Integração salva"); load();
  };
  const remove = async (i: number) => {
    const t = tools[i];
    if (t.id) { const { error } = await db.from("external_tools").delete().eq("id", t.id); if (error) return toast.error("Não foi possível excluir a integração."); }
    setTools((p) => p.filter((_, j) => j !== i));
  };
  const test = async (i: number) => {
    const t = tools[i];
    if (!t.id) return toast.error("Salve antes de testar");
    let args: any = {};
    try { args = testArgs[i] ? JSON.parse(testArgs[i]) : {}; } catch { return toast.error('Exemplo inválido. Use: {"q":"exemplo"}'); }
    setTestOut((p) => ({ ...p, [i]: "Testando..." }));
    const { data, error } = await supabase.functions.invoke("external-tool-test", { body: { tool_id: t.id, args } });
    const detail = error instanceof FunctionsHttpError ? await error.context.json().catch(() => ({})) : {};
    setTestOut((p) => ({ ...p, [i]: error ? `Erro: ${detail.error || error.message}` : `Status ${data?.status ?? "-"} em ${data?.ms ?? "?"}ms\n${data?.data ?? data?.error ?? ""}` }));
  };
  const saveTriage = async () => {
    if (!user) return;
    const { error } = await db.from("ai_triage_settings").upsert({ ...triage, user_id: user.id, updated_at: new Date().toISOString() });
    error ? toast.error(error.message) : toast.success("Triagem salva");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button size="sm" variant="ghost" onClick={() => setShowGuide(v => !v)}><BookOpen className="h-4 w-4 mr-1" />{showGuide ? "Fechar guia" : "Guia de ajuda"}</Button></div>
      {showGuide && <Card className="p-4 space-y-4 border-primary/30">
        <h3 className="font-semibold">Como funciona (passo a passo)</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 rounded-md border border-border p-3">
            <Badge>A — Outro sistema usa os SEUS dados</Badge>
            <p className="text-sm text-muted-foreground">Ex.: Tray, loja externa ou ERP enviando/puxando seus produtos.</p>
            <ol className="text-sm list-decimal pl-4 space-y-1">
              <li>Vá na aba <b>API Keys</b> e clique em criar chave. Copie a chave (ela é a sua "senha" da API).</li>
              <li>No outro sistema, cole este endereço:</li>
            </ol>
            <div className="flex gap-2"><Input readOnly value={PRODUCTS_API} className="font-mono text-xs" /><Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(PRODUCTS_API); toast.success("Endereço copiado"); }}>Copiar</Button></div>
            <ol start={3} className="text-sm list-decimal pl-4 space-y-1">
              <li>No campo de cabeçalho/header, use o nome <b>x-api-key</b> e cole a sua chave.</li>
              <li><b>Puxar produtos</b>: método GET. <b>Enviar produtos</b>: método POST.</li>
            </ol>
          </div>
          <div className="space-y-2 rounded-md border border-border p-3">
            <Badge variant="secondary">B — Sua IA usa os dados do OUTRO sistema</Badge>
            <p className="text-sm text-muted-foreground">Ex.: a IA consulta produtos no ERP, na Tray ou em outro sistema e envia o lead para o CRM de lá.</p>
            <ol className="text-sm list-decimal pl-4 space-y-1">
              <li>Peça ao outro sistema (ou a quem fez) o <b>endereço da API</b> e a <b>chave de acesso</b> DELE.</li>
              <li>Abaixo, clique em <b>Conectar sistema</b>, marque o que a IA pode fazer (consultar e/ou enviar contatos).</li>
              <li>Cole o endereço e a chave de lá e clique em <b>Conectar</b>. Pronto — não precisa escolher GET ou POST.</li>
            </ol>
            <p className="text-xs text-muted-foreground">Resumo: em A a chave é <b>daqui</b>; em B a chave é <b>de lá</b>.</p>
          </div>
        </div>
      </Card>}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-primary" /><h3 className="font-semibold">Menu de boas-vindas e direcionamento</h3></div>
          {triage && <Switch checked={!!triage.menu_enabled} onCheckedChange={(v) => setTriage({ ...triage, menu_enabled: v })} />}
        </div>
        <p className="text-sm text-muted-foreground">Quando ligado, quem chama no WhatsApp recebe uma mensagem com opções para tocar. Cada opção leva a um destino: um agente de IA, a equipe humana ou só uma resposta.</p>
        {triage?.menu_enabled && (<>
          <div><Label>Mensagem inicial</Label><Textarea rows={2} value={triage.menu_message || ""} onChange={(e) => setTriage({ ...triage, menu_message: e.target.value })} /></div>
          {(triage.menu_options || []).map((o: any, k: number) => {
            const up = (patch: any) => setTriage({ ...triage, menu_options: triage.menu_options.map((x: any, n: number) => n === k ? { ...x, ...patch } : x) });
            return (
              <div key={k} className="border rounded-md p-3 space-y-2">
                <div className="flex items-center gap-2"><Badge className="shrink-0 whitespace-nowrap">Opção {k + 1}</Badge><Input placeholder="Texto da opção (até 20 letras vira botão; maior vira lista para tocar)" maxLength={80} value={o.label || ""} onChange={(e) => up({ label: e.target.value })} />
                  <Button size="icon" variant="ghost" onClick={() => setTriage({ ...triage, menu_options: triage.menu_options.filter((_: any, n: number) => n !== k) })}><Trash2 className="h-4 w-4" /></Button></div>
                <div className="grid sm:grid-cols-2 gap-2">
                  <div><Label className="text-xs">O que acontece</Label>
                    <Select value={o.action || "agent"} onValueChange={(v) => up({ action: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="agent">Agente de IA atende</SelectItem>
                        <SelectItem value="human">Pausar IA e passar para a equipe</SelectItem>
                        <SelectItem value="message">Só enviar uma resposta</SelectItem>
                      </SelectContent>
                    </Select></div>
                  {(o.action || "agent") === "agent" && <div><Label className="text-xs">Qual agente</Label>
                    <Select value={o.agent_id || ""} onValueChange={(v) => up({ agent_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Escolha o agente" /></SelectTrigger>
                      <SelectContent>{agentList.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                    </Select></div>}
                </div>
                <div><Label className="text-xs">Mensagem enviada depois da escolha (opcional)</Label><Textarea rows={2} value={o.reply || ""} onChange={(e) => up({ reply: e.target.value })} placeholder={(o.action || "agent") === "agent" ? "Vazio = o agente responde direto" : "Ex: Certo! Um atendente vai falar com você."} /></div>
              </div>
            );
          })}
          {(triage.menu_options || []).length < 10 && <Button size="sm" variant="outline" onClick={() => setTriage({ ...triage, menu_options: [...(triage.menu_options || []), { label: "", action: "agent", agent_id: "", reply: "" }] })}><Plus className="h-4 w-4 mr-1" />Adicionar opção</Button>}
        </>)}
        {triage && (<div className="border-t pt-3 space-y-2">
          <p className="text-sm font-medium">Atendimento direto (anúncios Meta/Instagram e mensagens prontas)</p>
          <p className="text-xs text-muted-foreground">Quando a primeira mensagem bater com estas regras, o menu de boas-vindas não é enviado e a IA atende na hora.</p>
          <div className="flex items-center gap-2"><Switch checked={triage.ad_auto_detect !== false} onCheckedChange={(v) => setTriage({ ...triage, ad_auto_detect: v })} /><span className="text-sm">Reconhecer anúncios automaticamente (código, link, "tenho interesse", texto pronto do anúncio)</span></div>
          <div><Label className="text-xs">Suas palavras ou frases (uma por linha)</Label><Textarea rows={3} placeholder={"tenho interesse\nvi o anúncio\nDetergente Neutro 5L"} value={triage.ad_keywords || ""} onChange={(e) => setTriage({ ...triage, ad_keywords: e.target.value })} /></div>
          <div><Label className="text-xs">Como comparar</Label>
            <select className="w-full h-9 rounded-md border bg-background px-2 text-sm" value={triage.ad_match_mode || "contains"} onChange={(e) => setTriage({ ...triage, ad_match_mode: e.target.value })}>
              <option value="contains">A mensagem contém a palavra ou frase</option>
              <option value="starts">A mensagem começa com a frase</option>
              <option value="exact">A mensagem é exatamente igual (texto completo do anúncio)</option>
            </select></div>
        </div>)}
        {triage && (<>
          <div className="flex items-center justify-between border-t pt-3"><span className="text-sm font-medium">A IA pode passar a conversa para a equipe quando o assunto não for com ela</span><Switch checked={triage.enabled} onCheckedChange={(v) => setTriage({ ...triage, enabled: v })} /></div>
          {triage.enabled && <>
            <div><Label>Palavras que a IA atende direto, sem perguntar (separe por vírgula)</Label><Textarea rows={2} value={triage.keywords || ""} onChange={(e) => setTriage({ ...triage, keywords: e.target.value })} /></div>
          </>}
          <div className="flex items-center gap-2"><Switch checked={triage.ignore_known_clients} onCheckedChange={(v) => setTriage({ ...triage, ignore_known_clients: v })} /><span className="text-sm">Clientes já fechados no CRM vão direto para a equipe</span></div>
          <Button size="sm" onClick={saveTriage}><Save className="h-4 w-4 mr-1" />Salvar</Button>
        </>)}
      </Card>

      <Card className="p-4 space-y-2">
        <div className="flex items-center gap-2"><Plug className="h-4 w-4 text-primary" /><h3 className="font-semibold">Integrações com outros sistemas (API)</h3></div>
        <p className="text-sm text-muted-foreground">O agente de IA usa estas integrações para buscar dados (produtos, estoque, catálogo, pedidos) e enviar leads para o CRM do outro sistema.</p>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" onClick={() => setWizard({ system: "", searchUrl: "", leadUrl: "", key: "", header: "x-api-key", search: true, lead: true })}><Link2 className="h-4 w-4 mr-1" />Conectar sistema</Button>
          <Button size="sm" variant="ghost" onClick={() => setTools((p) => [...p, { ...blank("action"), name: "acao_externa", description: "", method: "POST" }])}><Plus className="h-4 w-4 mr-1" />Ação personalizada</Button>
        </div>
        {wizard && <div className="border rounded-md p-3 space-y-3 mt-2">
          <div><Label>Nome do sistema</Label><Input placeholder="Ex: Meu ERP, Tray, CRM da empresa" value={wizard.system} onChange={e => setWizard({ ...wizard, system: e.target.value })} /></div>
          <Label>O que a IA pode fazer</Label>
          <div className="flex items-center gap-2"><Switch checked={wizard.search} onCheckedChange={v => setWizard({ ...wizard, search: v })} /><span className="text-sm">Consultar itens (produtos, catálogo, estoque)</span></div>
          {wizard.search && <div><Label className="text-xs">Endereço para consultar (https://...)</Label><Input value={wizard.searchUrl} onChange={e => setWizard({ ...wizard, searchUrl: e.target.value })} /></div>}
          <div className="flex items-center gap-2"><Switch checked={wizard.lead} onCheckedChange={v => setWizard({ ...wizard, lead: v })} /><span className="text-sm">Enviar contatos interessados para o CRM de lá</span></div>
          {wizard.lead && <div><Label className="text-xs">Endereço para enviar contatos (vazio = mesmo da consulta)</Label><Input value={wizard.leadUrl} onChange={e => setWizard({ ...wizard, leadUrl: e.target.value })} /></div>}
          <div><Label>Chave de acesso do outro sistema (vazio se não tiver)</Label><Input type="password" autoComplete="new-password" value={wizard.key} onChange={e => setWizard({ ...wizard, key: e.target.value })} /></div>
          <div className="flex gap-2"><Button size="sm" disabled={wizard.saving} onClick={saveWizard}><Save className="h-4 w-4 mr-1" />{wizard.saving ? "Conectando..." : "Conectar"}</Button><Button size="sm" variant="ghost" onClick={() => setWizard(null)}>Cancelar</Button></div>
        </div>}
      </Card>

      {tools.map((t, i) => (
        <Card key={t.id || i} className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {t.id && <span className="font-medium truncate">{t.name}</span>}
              <Badge variant="secondary">{t.kind === "search" ? "Busca" : t.kind === "lead_push" ? "Envio de lead" : "Ação externa"}</Badge>
              {t.last_test_status ? <Badge variant={t.last_test_status < 300 ? "default" : "destructive"}>Último teste: {t.last_test_status}</Badge> : null}
            </div>
            <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Ativa</span><Switch checked={t.active} onCheckedChange={(v) => upd(i, { active: v })} />
              {t.id && <Button size="sm" variant="ghost" onClick={() => setOpenRows(p => ({ ...p, [rowKey(t, i)]: !p[rowKey(t, i)] }))}>{isOpen(t, i) ? <ChevronUp className="h-4 w-4" /> : <><ChevronDown className="h-4 w-4 mr-1" />Editar</>}</Button>}</div>
          </div>
          {isOpen(t, i) && <>
          <div><Label>Nome</Label><Input value={t.name} onChange={(e) => upd(i, { name: e.target.value })} /></div>
          <div><Label>Quando a IA deve usar</Label><Textarea rows={2} value={t.description} onChange={(e) => upd(i, { description: e.target.value })} /></div>
          <div><Label>Endereço da API (https://...)</Label><Input value={t.url} placeholder="https://api.sistema.com/v1/itens" onChange={(e) => upd(i, { url: e.target.value })} /></div>
          <div><Label>Tipo de acesso</Label><Select value={t.auth_type || "api_key"} onValueChange={(v) => upd(i, { auth_type: v as Tool["auth_type"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="api_key">Chave de API</SelectItem><SelectItem value="bearer">Token Bearer</SelectItem><SelectItem value="none">API pública, sem chave</SelectItem></SelectContent></Select></div>
          {(t.auth_type || "api_key") === "api_key" && <div><Label>Nome do campo de autenticação</Label><Input value={t.auth_header || "x-api-key"} onChange={e => upd(i, { auth_header: e.target.value })} /></div>}
          {t.auth_type !== "none" && <div><Label htmlFor={`credential-${i}`}>Chave de acesso do outro sistema</Label><Input id={`credential-${i}`} type="password" autoComplete="new-password" value={t.credential || ""} placeholder={t.credential_configured ? "Chave salva — preencha somente para substituir" : "Cole aqui a chave gerada no outro sistema"} onChange={(e) => upd(i, { credential: e.target.value })} />{t.credential_configured && <Badge variant="secondary" className="mt-2">Chave protegida salva</Badge>}</div>}
          <details className="rounded-md border p-2"><summary className="text-sm cursor-pointer text-muted-foreground">Opções avançadas</summary><div className="space-y-2 pt-2">
          <div><Label>Método (preenchido automaticamente)</Label>
            <Select value={t.method} onValueChange={(v) => upd(i, { method: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["GET", "POST", "PUT", "PATCH", "DELETE"].map(method => <SelectItem key={method} value={method}>{method}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="space-y-1">
            <Label>Filtros que a IA pode preencher</Label>
            {t.params.map((p, k) => (
              <div key={k} className="grid grid-cols-[1fr_2fr_auto] gap-2">
                <Input value={p.name} onChange={(e) => upd(i, { params: t.params.map((x, z) => (z === k ? { ...x, name: e.target.value } : x)) })} />
                <Input value={p.description} onChange={(e) => upd(i, { params: t.params.map((x, z) => (z === k ? { ...x, description: e.target.value } : x)) })} />
                <Button size="icon" variant="ghost" onClick={() => upd(i, { params: t.params.filter((_, z) => z !== k) })}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button size="sm" variant="ghost" onClick={() => upd(i, { params: [...t.params, { name: "", description: "", type: "string" }] })}><Plus className="h-4 w-4 mr-1" />Filtro</Button>
          </div></div></details>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={() => save(i)}><Save className="h-4 w-4 mr-1" />Salvar</Button>
            <Button size="sm" variant="outline" onClick={() => test(i)}><FlaskConical className="h-4 w-4 mr-1" />Testar</Button>
            <Button size="sm" variant="ghost" onClick={() => remove(i)}><Trash2 className="h-4 w-4 mr-1" />Excluir</Button>
          </div>
          <Input placeholder='Exemplo para testar: {"q":"exemplo"}' value={testArgs[i] || ""} onChange={(e) => setTestArgs((p) => ({ ...p, [i]: e.target.value }))} />
          {testOut[i] && <pre className="text-xs bg-muted p-2 rounded max-h-60 overflow-auto whitespace-pre-wrap">{testOut[i]}</pre>}
          </>}
        </Card>
      ))}
    </div>
  );
}
