# Refatoração Forms & Quiz — Omni Builder CRM

Escopo restrito aos módulos **Forms** e **Quiz**. Nenhum outro módulo será alterado. Dados existentes preservados (sem DELETE), apenas migrations aditivas e deduplicação lógica na UI.

---

## PROMPT 1 — Limpeza e Isolamento

**Migration aditiva:**
- `form_submissions` e `quiz_submissions` (timeline) — cada submissão tem `lead_id`, `form_id`/`quiz_id`, `payload jsonb`, UTMs, `submitted_at`. Backfill a partir de `form_responses`/`quiz_responses` existentes (preserva dados).
- Índice único `(user_id, form_id, lead_id_dedupe_key)` em `leads` onde `dedupe_key` = phone OR email (lógica no insert, não constraint).
- Coluna `source_form_id` / `source_quiz_id` em `leads` para isolar atribuição.

**UI — LeadViewer:**
- Detecta múltiplas submissões do mesmo lead no mesmo forms → renderiza **timeline** dentro do perfil (data/hora, payload, UTM por submissão) em vez de duplicar card.
- Refatorar `FormsList` e `QuizList` para que cada item carregue suas próprias métricas via query escopada por `form_id`/`quiz_id`.

---

## PROMPT 2 — Analytics por Formulário

**Novo componente:** `src/components/dashboard/FormAnalyticsPage.tsx` e `QuizAnalyticsPage.tsx`, abertos via botão **"Ver métricas"** na listagem.

Conteúdo (consultando `funnel_events` + `form_submissions` filtrado pelo ID):
- **Cards KPI:** total leads, taxa conversão, tempo médio preenchimento, top UTM source, leads hoje/semana/mês.
- **Funil:** views → starts → steps → completes (já temos `funnel_events`).
- **Gráficos** (recharts): linha 30d, barras por UTM source, funil visual, pizza dispositivos (parse user_agent).
- **Tabela UTM:** combinação source/medium/campaign × contagem.
- **Export CSV:** botão que gera CSV dos leads + UTMs daquele forms/quiz.

---

## PROMPT 3 — Pixels Independentes

**Migration:** mover config de pixel **de `meta_ads_configs` (por user)** para colunas/JSON **por forms/quiz**:
- `forms.pixel_config jsonb` e `quizzes.pixel_config jsonb` com shape:
```json
{
  "meta": { "pixel_id", "access_token", "events": { "PageView": true, "Lead": true, "InitiateCheckout": false, "Custom": {"enabled": false, "name": ""} } },
  "google": { "measurement_id", "api_secret", "events": { "page_view": true, "generate_lead": true, "begin_checkout": false } }
}
```
- Manter `meta_ads_configs` como **fallback global** (não quebra setup atual).

**UI:** nova aba **"Integrações"** no editor de cada forms/quiz com:
- Painel Meta Pixel (ID, token, toggles por evento, custom event name, **Testar pixel** → invoca `meta-capi` em modo test).
- Painel Google GA4 (Measurement ID, API Secret, toggles, **Testar conexão** via Measurement Protocol).

**Edge function:** estender `meta-capi` para aceitar `form_id`/`quiz_id` e ler config local; criar `google-ga4` edge function paralela.

**Public pages (`FormPublic`/`QuizPublic`):** carregar pixel_config do próprio forms (não mais global) e disparar eventos conforme toggles.

---

## PROMPT 4 — Preview, Redirect, Automações

**Preview ao vivo:**
- No editor (`FormsList` edit mode / `QuizList` edit mode), split layout: editor à esquerda + `<iframe>` ou render inline à direita.
- Toggle mobile/desktop (altera width). Atualização instantânea via state compartilhado.

**Redirect pós-envio (`forms.post_submit` jsonb):**
```json
{ "mode": "url" | "thankyou" | "form", "url": "", "thankyou": {"title","message"}, "target_form_id": "", "new_tab": false }
```
- UI na aba "Configurações". `FormPublic`/`QuizPublic` honram a config.

**Mensagem para o lead (já existe `whatsapp_auto_*`)** — expandir editor com chip de variáveis dinâmicas e suporte a campos customizados do forms.

**Alerta para o dono (`forms.owner_alert` jsonb):**
```json
{ "enabled": true, "phone": "5511...", "message": "🔔 Novo lead..." }
```
- Enqueue job `form_owner_alert` no submit → `cron-worker` envia via `send-whatsapp`.
- Botão **"Testar disparo"** invoca `send-whatsapp` direto.

---

## PROMPT 5 — Kanban por Formulário

**Novo componente:** `src/components/dashboard/FormLeadsKanban.tsx` (compartilhado com Quiz via prop `sourceType`).

- Botão **"Ver leads"** em cada item da listagem abre Kanban filtrado por `source_form_id = X` (nunca mistura).
- **Colunas customizáveis por forms:** nova tabela `form_kanban_columns(form_id, name, position, color)` com seed padrão (Novo/Em contato/Qualificado/Convertido/Descartado). Drag-reorder, renomear, cor.
- **Card:** nome, email, telefone (clique → wa.me), data, UTM badge, tags, indicador "novo".
- **Modal lateral (Sheet):** abas Informações (timeline submissões), Atividades (notas + log), Automações (enviar WhatsApp / reenviar / agendar follow-up).
- **Filtros:** período, UTM, tag, status. **Busca:** nome/email/telefone live.
- **Ações em lote:** checkbox seleção → mover coluna / add tag / export CSV / arquivar.

Reusa `lead_tags`, `notifications`, infra de jobs já existente.

---

## Ordem de execução / commits

1. **Migration única** cobrindo: `form_submissions`, `quiz_submissions`, `forms.pixel_config`, `forms.post_submit`, `forms.owner_alert`, `form_kanban_columns` + espelho para quiz, backfill de `form_responses`→`form_submissions`.
2. PROMPT 1 (dedupe LeadViewer + isolamento de queries).
3. PROMPT 2 (Analytics pages + export CSV).
4. PROMPT 3 (Pixels por forms + edge function GA4).
5. PROMPT 4 (Preview + redirect + alerta dono).
6. PROMPT 5 (Kanban por forms).

## Premissas
- Pixel global existente (`meta_ads_configs`) permanece como fallback opcional, não removido.
- WhatsApp usa infra atual (`send-whatsapp` + `cron-worker`).
- Preview ao vivo via render React inline (não iframe sandbox, mais leve).
- Sem mudanças em CRM principal, Inbox, Automation Hub, etc.

## Estimativa
~1 migration grande + ~12 arquivos novos + ~8 edições. Total alto mas escopo confinado a Forms/Quiz.

Pronto para executar na ordem acima assim que aprovado.