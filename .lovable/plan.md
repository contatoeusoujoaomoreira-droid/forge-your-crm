# Plano — Refatoração Arquitetural SaaS (Status)

## Status das ondas
- ✅ Onda 1 — Fundação Event-Driven (webhook_events, job_queue, DLQ, conversation_locks, processed_messages, dispatcher)
- ✅ Onda 2 — Pipeline de áudio em etapas (`audio_jobs` table + stages)
- ✅ Onda 3 — AI Provider Layer + Router + Circuit Breaker (`_shared/ai/*`, `provider_circuit_state`)
- ✅ Onda 4 — Custos, Observabilidade, Rate Limit (`llm_usage`, `provider_pricing`, `structured_logs`, `rate_limit_buckets`, painel "Custos IA")
- ✅ Onda 5 — Multi-tenant explícito + auditoria (`audit_log` + triggers em ai_agents, whatsapp_configs, user_roles)
- ⚙️ Onda 6 — Frontend resiliente: optimistic UI no Inbox + debounce no AgentBuilder + cache React Query → aplicar incrementalmente conforme uso.

## Próximo
Smoke test:
1. Enviar mensagem WhatsApp → conferir aparecer em "Filas & DLQ" e "Custos IA" após resposta.
2. Provocar erro intencional num provedor → ver `provider_circuit_state` abrir e fallback escolher próximo.
3. Auditar criação/edição de agente em `audit_log`.

## Onda 6 — Frontend resiliente ✅
- Optimistic UI no `InboxPage.send()` — mensagem aparece com status `sending` antes do backend confirmar; muda para `sent`/`queued`/`failed`.
- `useDebouncedSave` (400ms) aplicado no `AgentBuilder` para prompt/temperatura/regras/exemplos/objeções.
- `QueryClient` global agora com `staleTime` 30s, `gcTime` 5min, `refetchOnWindowFocus` off, `retry` 1.
