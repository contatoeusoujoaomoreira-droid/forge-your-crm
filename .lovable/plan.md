# Plano — Refatoração Arquitetural SaaS (Event-Driven, Escalável, Multi-Tenant)

> **Regra mestra**: zero remoção de funcionalidade. Toda mudança é aditiva ou substitui internamente preservando contratos (UI, rotas, edge functions públicas, webhooks).

## Restrições da plataforma (importante ler antes)

O backend roda no Lovable Cloud (Supabase). Algumas exigências do briefing precisam ser adaptadas — **não** é falha, é a forma correta no ambiente:

- **Filas/Workers**: não há Redis/SQS/RabbitMQ. Usamos tabelas Postgres como fila (`job_queue`) + `pg_cron` invocando `cron-worker` a cada minuto + `EdgeRuntime.waitUntil` para fan-out imediato. Concurrency lock via `SELECT ... FOR UPDATE SKIP LOCKED`.
- **Rate limiting**: o backend não tem primitivo padrão. Implementamos *ad-hoc* por tenant em tabela `rate_limit_buckets` (token bucket), como exceção justificada por requisito explícito do usuário.
- **WebSocket/Realtime**: usar Supabase Realtime (já disponível) — sem servidor WS próprio.
- **Multi-tenant**: hoje o "tenant" é `user_id` (RLS por `auth.uid()`). Mantemos isso; adicionamos coluna `tenant_id` como **alias gerado** (=`user_id`) para clareza semântica, sem quebrar nada.
- **Circuit breaker / cache / locks**: in-memory por instância é proibido pelo briefing → tudo persistido em tabelas (`provider_circuit_state`, `conversation_locks`).

---

## ONDA 1 — Fundação Event-Driven + Idempotência (deploy 1)

**Objetivo**: webhook nunca mais chama IA dentro da request.

### Migrations
- `webhook_events` (id, tenant_id, provider, event_id UNIQUE, payload jsonb, status, attempts, error, created_at, processed_at) + índices.
- `job_queue` (id, tenant_id, kind, payload, status [queued|running|done|failed|dlq], priority, run_at, attempts, max_attempts, last_error, locked_by, locked_at, created_at). Index `(status, run_at)` parcial.
- `job_dead_letter` (espelho + motivo).
- `conversation_locks` (conversation_id PK, locked_by, locked_at, expires_at).
- `processed_messages` (provider, message_id) UNIQUE — idempotência.
- GRANTs + RLS (`tenant_id = auth.uid()`; service_role full).

### Refator `webhook-receiver`
- Reescrito para: validar → `INSERT` em `webhook_events` (ON CONFLICT event_id DO NOTHING) → enfileirar job `process_webhook` → responder 200 em <100ms.
- Toda lógica atual (parsers UAZAPI/Evolution/Z-API, dedupe lead, group filter, attribution, avatar, ai-agent call, áudio) **movida para worker** `process_webhook` sem alteração funcional.

### `cron-worker` vira dispatcher
- A cada tick: `SELECT ... FOR UPDATE SKIP LOCKED LIMIT N` em `job_queue` → executa handler por `kind` → marca done/failed → retry exponencial (30s, 2m, 10m, 30m) → DLQ após `max_attempts`.
- Handlers registrados: `process_webhook`, `ai_reply`, `audio_pipeline`, `send_message`, `automation_run`, `followup_step`.
- Lock de conversa: antes de `ai_reply`, tenta `INSERT` em `conversation_locks` com `expires_at = now()+2min`; se falhar, reenfileira com `run_at = now()+5s`.

---

## ONDA 2 — Pipeline de Áudio em etapas (deploy 2)

- Tabela `audio_jobs` (id, message_id, tenant_id, stage [download|transcribe|llm|tts|upload|send], status, audio_original_url, transcript, response_text, audio_response_url, duration_ms, attempts, error).
- Cada etapa = job próprio na `job_queue`, encadeado pelo handler anterior.
- Mantém cascata atual Groq → OpenAI → ElevenLabs → Gemini.

---

## ONDA 3 — AI Provider Layer + Fallback + Circuit Breaker (deploy 3)

- Nova pasta `supabase/functions/_shared/ai/`:
  - `provider.ts` — interface `AIProvider { generateResponse, embeddings, transcription, tts }`.
  - `openai.ts`, `anthropic.ts`, `gemini.ts`, `groq.ts`, `lovable.ts`, `openrouter.ts` (reaproveitam código atual de `ai-agent`).
  - `router.ts` — escolhe provider + aplica fallback chain configurável por agente.
- Tabela `provider_circuit_state` (provider, model, state [closed|open|half_open], consecutive_failures, opened_at, next_retry_at). Lógica: 5 falhas → open por 60s → half_open → testa.
- `ai-agent` edge function refatorada para usar o router (mantém payload/response atual — frontend não muda).

---

## ONDA 4 — Custos, Observabilidade, Rate Limit (deploy 4)

- Tabela `llm_usage` (tenant_id, agent_id, provider, model, input_tokens, output_tokens, total_tokens, estimated_cost_usd, duration_ms, request_id, created_at). Index `(tenant_id, created_at)`.
  - Tabela `provider_pricing` (provider, model, input_per_1k, output_per_1k) seed inicial.
  - Painel novo em SuperAdmin: custos por dia/agente/tenant/modelo.
- Tabela `structured_logs` (tenant_id, trace_id, level, category, message, meta jsonb). Helper `log()` em `_shared/log.ts` usado por todas as functions.
- Tabela `rate_limit_buckets` (tenant_id, scope [minute|hour|day], window_start, count). Função `check_rate_limit(tenant, scope, limit)` em SQL. Aplicada em `webhook-receiver` ingest e `ai-agent`.

---

## ONDA 5 — Multi-tenant explícito + segurança (deploy 5)

- Adicionar coluna `tenant_id uuid GENERATED ALWAYS AS (user_id) STORED` nas tabelas chave (`leads`, `messages`, `chat_clients`, `appointments`, `orders`, `ai_agents`, `whatsapp_configs`). Mantém RLS atual; novas queries podem usar `tenant_id` semanticamente.
- Auditoria: tabela `audit_log` (tenant_id, actor_id, action, entity, entity_id, diff). Trigger genérico em tabelas sensíveis (`ai_agents`, `whatsapp_configs`, `user_roles`).
- Confirmar que nenhum secret (OpenAI, Anthropic, Gemini, ElevenLabs, UAZAPI) chega ao frontend — auditar `src/` por leitura indevida.

---

## ONDA 6 — Frontend resiliente (deploy 6)

- `InboxPage` + simulador WhatsApp: optimistic UI (mensagem aparece com status `sending` antes da confirmação do backend).
- Realtime já existe — garantir subscriptions em `messages`, `job_queue` (para UI mostrar "processando"), `audio_jobs`.
- Debounce de 400ms em `AgentBuilder` (prompt, temperatura, ferramentas) com `useDebouncedSave`.
- Cache cliente-side via React Query com `staleTime` apropriado para `ai_agents`, `whatsapp_configs`, histórico de mensagens paginado.

---

## Critérios de aceite (mapeados ao briefing)

| Requisito | Onda |
|---|---|
| Webhook desacoplado, responde <200ms | 1 |
| Idempotência (event_id, message_id) | 1 |
| Filas + retry exponencial + DLQ | 1 |
| Lock por conversa | 1 |
| Pipeline áudio em etapas | 2 |
| AI Provider Layer único | 3 |
| Fallback de modelos | 3 |
| Circuit breaker persistido | 3 |
| llm_usage + dashboard custos | 4 |
| Logs estruturados + tracing | 4 |
| Rate limit por tenant | 4 |
| tenant_id explícito + auditoria | 5 |
| Frontend optimistic + realtime + debounce + cache | 6 |
| Zero remoção de feature | todas |

---

## Riscos e mitigações

- **Migração de workers** — fazer feature flag `USE_QUEUE` no `webhook-receiver` para rollback rápido na onda 1.
- **pg_cron** já em uso — adicionamos só novos jobs, sem mexer nos existentes.
- **Tipos Supabase** regenerados após cada onda; pausar onda seguinte até types prontos.
- **Volume de `webhook_events`/`structured_logs`** — política de retenção 30d via `pg_cron` cleanup.

---

## Próximo passo

Confirme para eu iniciar pela **Onda 1** (fundação event-driven). Cada onda termina com smoke test e validação sua antes da próxima.
