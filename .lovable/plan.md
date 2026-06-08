# Plano — Refatoração e novas features Omni Builder CRM

Entrega em **3 fases sequenciais**, cada fase é um deploy independente e validável. Nada é começado sem a anterior estar estável.

---

## FASE 1 — Dashboard, Forms e Provedores IA

### 1.1 Dashboard focado em CRM/Chat
- Remover `Pages` por completo: KPIs, gráficos, queries, rotas, componentes e tabelas órfãs (`pages`, `page_views`, etc.) após auditoria de dependências.
- Refatorar `Analytics.tsx` / `DashboardAnalytics.tsx`:
  - **Filtro global de período** (Hoje, Ontem, 7d, 30d, mês atual, mês anterior, custom) com estado compartilhado via context.
  - **Grupo KPIs CRM**: negócios ativos, ganhos, perdidos, taxa conversão, ticket médio, tempo médio fechamento, valor pipeline, valor ponderado.
  - **Grupo KPIs Leads**: total, hoje, semana, mês, por origem, convertidos, perdidos.
  - **Grupo KPIs Chat**: conversas iniciadas, ativas, encerradas, tempo médio 1ª resposta, tempo médio atendimento, conversões originadas do chat (lead criado a partir de `messages`).
- Todas as queries respeitam o filtro de período (parâmetros `from`/`to`).

### 1.2 Forms — visualização profissional de leads
- Novo `FormLeadsViewer` reaproveitando `LeadViewer` compartilhado:
  - **3 modos**: Kanban, Lista, Quadros (toggle persistente).
  - **Drawer detalhado** ao clicar no lead: dados completos, origem, UTM, criado em, status, observações, **timeline** (de `activities` + `messages` + mudanças de stage).
- **Anti-duplicidade** no ingest público (`ContactFormRenderer` + edge de submissão):
  - Match por telefone normalizado (E.164), email lowercase, fallback nome+canal.
  - Em duplicata: atualiza lead existente, adiciona activity "novo contato via form X", não cria duplicado.
- **Garantia de sync com CRM**: form deve ter `user_id`, `pipeline_id`, `stage_id` obrigatórios; lead cai na stage configurada; trigger valida.

### 1.3 Provedores de IA — expansão de modelos
- Atualizar catálogo em `AIProviderSettings.tsx` e `model_credit_costs` para incluir os modelos atuais do Lovable AI Gateway (Gemini 3.x, GPT-5.4/5.5 família).
- Remover modelos depreciados/inativos.
- Validar custo (`credits_per_message`) por modelo com super admin antes do seed.

---

## FASE 2 — Super Admin (Saúde) + Segurança/Backup ✅

### 2.1 Central de Saúde da Plataforma — entregue
- `HealthPanel` em `SuperAdminPanel` consumindo RPC `platform_health_snapshot()`.
- Infra: tamanho do banco, % de conexões, deadlocks, rollbacks.
- Operacional 24h: usuários ativos, msgs in/out, leads, créditos consumidos.
- Top 10 por mensagens e por créditos consumidos.
- Tabela `platform_alerts` (super_admin only) listada nas últimas 24h.

### 2.2 Segurança / Higiene — entregue
- Linter rodado; warnings restantes são pré-existentes (RLS policies legadas e funções SECURITY DEFINER expostas a public role — não regressões desta fase).
- `model_credit_costs` ampliado para cobrir Gemini 3.x e GPT-5.2/5.4/5.5 (cobrança real por modelo via `deduct_credits_by_action`).
- `whatsapp_configs.hide_group_messages` adicionado — grupos são descartados antes de gravar mensagem quando ligado.
- QR Code OmniConect: polling de status agora roda a cada 3s e só renova o QR a cada 30s (antes invalidava o QR em uso a cada 4s).

---

## FASE 3 — Agenda + Rastreador Inteligente ✅ (MVP)

### 3.1 Agenda
- Mantida estrutura atual (já cobre Cal.com-style com views Month/Week/Day, capacidade, cancelamento via token, agendamento manual, analytics).
- Polimento visual incremental virá conforme feedback de uso.

### 3.2 Rastreador Inteligente (MVP UTM) — entregue
- Tabela `attribution_touchpoints` (RLS por user, INSERT público para ingest).
- Captura automática em `FormPublic`: lê `utm_*`, `fbclid`, `gclid`, `ctwa_clid` da URL + landing_url + referrer; grava no lead (utm_source/medium/campaign) e cria touchpoint vinculado.
- Novo tab "Rastreador" em `Dashboard` com `TrackingDashboard`:
  - Filtros de período (Hoje, 7d, 30d, Mês, Tudo).
  - KPIs (toques, leads atribuídos, campanhas ativas, receita atribuída).
  - Breakdown source/medium.
  - Árvore Campanha → Conjunto (`utm_content`) → Anúncio (`utm_term`).
  - Input manual de gasto por campanha → ROAS calculado.
  - Tooltips `<InfoTip>` em cada métrica + bloco "Como configurar" com exemplo.
- Componente reutilizável `InfoTip` para ajuda contextual.
- **Pendente futura**: captura no checkout/quiz, parser de `referral` no `webhook-receiver`, integração Meta API oficial.


---

## Detalhes técnicos

### Migrations
- `DROP TABLE` Pages-related (após confirmar zero referências em código).
- `CREATE TABLE attribution_touchpoints`, `attribution_conversions`, `platform_alerts` — todas com GRANTs + RLS (`user_id = auth.uid()` para attribution; super_admin only para platform_alerts).
- Index em `messages(user_id, created_at)`, `leads(user_id, created_at, status)`.

### Edge functions novas
- `platform-health` — agrega db_health + logs (super_admin only, JWT verify in-code).
- `attribution-ingest` — opcional, para postback de conversões.

### Frontend
- Novo context `DashboardFilterContext` com período global.
- Componentes: `KpiGroup`, `PeriodFilter`, `InfoTip`, `TrackingTable`, `HealthPanel`, `FormLeadsViewer`.
- Reaproveita shadcn (Tabs, Card, Dialog, Drawer, Calendar).

### Não-objetivos / riscos
- Não altera lógica core de `ai-agent`, `webhook-receiver` (apenas adiciona captura attribution).
- Não introduz Meta Ads API agora.
- Drop de Pages é irreversível — backup verificado antes.

---

## Validação por fase
Cada fase termina com:
1. `supabase--linter` sem findings críticos.
2. Smoke test manual dos fluxos afetados.
3. Verificação de console/network sem erros.
4. Confirmação do usuário antes da próxima fase.

Confirme para começar a **Fase 1**.