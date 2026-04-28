import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { History, Filter } from "lucide-react";

interface Tx {
  id: string;
  user_id: string;
  amount: number;
  kind: string;
  metadata: any;
  created_at: string;
}

interface User { user_id: string | null; email: string; full_name: string | null; }

export default function UsageHistoryTab({ users }: { users: User[] }) {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [filterUser, setFilterUser] = useState<string>("");
  const [filterKind, setFilterKind] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("credit_transactions").select("*").order("created_at", { ascending: false }).limit(500);
    if (filterUser) q = q.eq("user_id", filterUser);
    if (filterKind) q = q.eq("kind", filterKind);
    const { data } = await q;
    setTxs((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filterUser, filterKind]);

  const totalSpent = txs.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalAdded = txs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const byKind = txs.reduce((acc: Record<string, number>, t) => {
    if (t.amount < 0) acc[t.kind] = (acc[t.kind] || 0) + Math.abs(t.amount);
    return acc;
  }, {});

  const userName = (uid: string) => {
    const u = users.find(u => u.user_id === uid);
    return u ? (u.full_name || u.email) : uid.slice(0, 8);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2"><History className="h-4 w-4 text-primary" /> Histórico de Uso</h3>
        <div className="flex items-center gap-2 text-xs">
          <Filter className="h-3 w-3 text-muted-foreground" />
          <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className="bg-secondary border border-border rounded px-2 py-1">
            <option value="">Todos os usuários</option>
            {users.filter(u => u.user_id).map(u => (
              <option key={u.user_id} value={u.user_id!}>{u.full_name || u.email}</option>
            ))}
          </select>
          <select value={filterKind} onChange={e => setFilterKind(e.target.value)} className="bg-secondary border border-border rounded px-2 py-1">
            <option value="">Todas ações</option>
            <option value="chat_message_text">Chat texto</option>
            <option value="chat_message_long">Chat longo</option>
            <option value="audio_transcribe">Transcrição</option>
            <option value="audio_tts">TTS</option>
            <option value="image_vision">Visão</option>
            <option value="image_generate">Imagem</option>
            <option value="page_generate">Pages</option>
            <option value="form_generate">Forms</option>
            <option value="quiz_generate">Quiz</option>
            <option value="ai_response">Resposta IA</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="surface-card rounded-xl p-3 text-center">
          <div className="text-xl font-bold">{txs.length}</div>
          <div className="text-[10px] text-muted-foreground">Transações</div>
        </div>
        <div className="surface-card rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-destructive">-{totalSpent}</div>
          <div className="text-[10px] text-muted-foreground">Créditos consumidos</div>
        </div>
        <div className="surface-card rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-primary">+{totalAdded}</div>
          <div className="text-[10px] text-muted-foreground">Créditos adicionados</div>
        </div>
      </div>

      <div className="surface-card rounded-xl p-3">
        <p className="text-[10px] uppercase text-muted-foreground mb-2">Consumo por ação</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(byKind).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
            <span key={k} className="text-[11px] px-2 py-1 rounded bg-secondary border border-border">
              {k}: <strong>{v}</strong>
            </span>
          ))}
          {Object.keys(byKind).length === 0 && <span className="text-xs text-muted-foreground">Sem dados</span>}
        </div>
      </div>

      <div className="surface-card rounded-xl overflow-hidden">
        {loading ? (
          <div className="text-center py-8 text-sm text-muted-foreground">Carregando...</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-secondary/50">
              <tr>
                <th className="text-left p-2">Data</th>
                <th className="text-left p-2">Usuário</th>
                <th className="text-left p-2">Ação</th>
                <th className="text-right p-2">Créditos</th>
                <th className="text-left p-2">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {txs.slice(0, 200).map(t => (
                <tr key={t.id} className="border-t border-border hover:bg-secondary/20">
                  <td className="p-2 font-mono text-[10px]">{new Date(t.created_at).toLocaleString("pt-BR")}</td>
                  <td className="p-2">{userName(t.user_id)}</td>
                  <td className="p-2"><span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary">{t.kind}</span></td>
                  <td className={`p-2 text-right font-mono ${t.amount < 0 ? "text-destructive" : "text-primary"}`}>{t.amount > 0 ? "+" : ""}{t.amount}</td>
                  <td className="p-2 text-[10px] text-muted-foreground truncate max-w-[200px]">
                    {t.metadata?.provider && `${t.metadata.provider} `}
                    {t.metadata?.model && `${t.metadata.model} `}
                    {t.metadata?.tokens_in && `in:${t.metadata.tokens_in} `}
                    {t.metadata?.tokens_out && `out:${t.metadata.tokens_out} `}
                    {t.metadata?.would_charge && `(super: ${t.metadata.would_charge}cr)`}
                  </td>
                </tr>
              ))}
              {txs.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma transação</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
