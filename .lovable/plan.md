# Plano de Evolução — Omni Builder CRM

Vou dividir em 5 entregas independentes (10 a 14). Cada uma é autocontida e pode ser revisada separadamente. Todas preservam a arquitetura atual (webhook-receiver + ai-agent + tabelas existentes).

---

## 10. Visão Computacional e Processamento de Imagens

**Backend (`webhook-receiver`)**
- Quando chega mídia tipo `image` do Uazapi:
  1. Baixar via `/message/download` (já temos a função).
  2. Fazer upload no bucket `chat-media` em `{user_id}/conversations/{client_id}/{message_id}.{ext}` (storage já existe).
  3. Salvar URL pública/assinada em `messages.media_url` (coluna nova se não existir) e em `messages.metadata.image_url`.
  4. Associar `client_id`, `lead_id` e `conversation_id` (já fazemos).
- Se o agente tiver `vision_enabled = true` (flag nova em `ai_agents`) **e** o modelo suportar visão (`gpt-4o*`, `gemini-*`, `claude-3.5*`):
  - Anexar bloco `image_url` no payload multimodal do `ai-agent` (formato OpenAI-compatible).
  - Caso contrário: gerar `[IMAGEM RECEBIDA — modelo sem visão, não interpretada]` e bloquear qualquer descrição inventada via prompt.

**Frontend (`InboxPage` / chat ao vivo)**
- Renderizar miniatura clicável → modal com imagem ampliada + botão download.
- Setinhas pra navegar entre as imagens da conversa (`prev/next`).

**Migration**
- `ALTER TABLE ai_agents ADD COLUMN vision_enabled boolean DEFAULT true, ADD COLUMN vision_model text;`
- `ALTER TABLE messages ADD COLUMN media_url text, ADD COLUMN media_type text;` (se ainda não existir — checar antes).

---

## 11. Orquestrador de Agentes

**Nova função TS**: `supabase/functions/_shared/agent-orchestrator.ts`

Ordem de decisão (curto-circuito no primeiro match):
1. `conversation_state.assigned_agent_id` existente e não expirado → mantém.
2. `conversation_flow_sessions` ativa → respeita o agente do fluxo.
3. Match em `agent_routing_rules` (tabela nova) por `utm_source/medium/campaign/content/term`, `meta_campaign`, `meta_adset`, `meta_creative` do lead.
4. Match por palavra-chave (`agent_routing_rules.keywords[]`).
5. Intenção detectada via classificador leve (Lovable AI — 1 chamada barata, gemini-flash).
6. Match por `pipeline_id` + `stage_id`.
7. Agente padrão (`ai_agents.is_default = true`).

**Tabela nova `agent_routing_rules`** com colunas:
`agent_id, priority, utm_filters jsonb, keywords text[], pipeline_id, stage_id, enabled, name`.

**Integração**: `webhook-receiver` chama `pickAgent(client, lead, message)` antes de processar resposta. Resultado é persistido em `conversation_state.assigned_agent_id` para evitar reavaliar a cada mensagem.

**UI**: novo painel "Orquestrador" no `AutomationHub` listando regras com drag-to-reorder priority.

---

## 12. Fluxos (módulo opcional)

Já existe `conversation_flows` e `conversation_flow_sessions`. Vou:
- Adicionar tipos de nós: `switch_agent`, `move_stage`, `wait_for_reply`, `trigger_followup`, `handoff_human`, `end`.
- Estender `FlowsBuilder.tsx` com esses nós.
- `webhook-receiver` consulta sessão ativa antes do orquestrador (passo 2 acima).

---

## 13. CRM com rolagem interna por etapa

**Arquivo**: `src/components/dashboard/CRMKanban.tsx`
- Remover `overflow-x` do container externo; manter colunas em `flex` com largura fixa.
- Cada coluna vira `flex flex-col` com header fixo e área `overflow-y-auto max-h-[calc(100vh-280px)]`.
- Lista inicial: render todos, mas a coluna naturalmente vai scrollar interno após ~5 cards.
- Garantir que `@hello-pangea/dnd` (ou lib em uso) continue funcionando — o scroll interno é compatível por padrão.

---

## 14. Tags destacadas nos leads

**Schema** (`leads.tags` já existe como `text[]`):
- Nova tabela `lead_tags` (definições reutilizáveis): `user_id, name, color, emoji, is_active`.
- Tags livres continuam funcionando (string em `leads.tags`), mas se baterem com `lead_tags.name`, herdam cor/emoji.

**UI**
- `LeadViewer`: editor de tags com chips coloridos + autocomplete das predefinidas.
- `CRMKanban` cards: chips visuais no topo.
- `InboxPage` cabeçalho do chat: mostra tags do lead vinculado.
- Filtro de tags no CRM (multi-select).

**Automações**
- Estender `stage_triggers` (ou nova `tag_triggers`) com condição `when tag added/removed`.
- Orquestrador (item 11) lê `lead.tags` como sinal adicional de prioridade.

---

## Ordem de execução

Vou implementar em 4 PRs lógicos (executados sequencialmente nesta conversa):

1. **PR-A — Backend de visão + storage de imagens** (item 10 backend + migration).
2. **PR-B — Orquestrador + tabela de regras + integração webhook** (item 11) e nós de fluxo novos (item 12).
3. **PR-C — UI: chat com imagens, painel Orquestrador, builder de fluxos** (item 10 UI + 11 UI + 12 UI).
4. **PR-D — CRM scroll interno + sistema de tags + filtros + automações por tag** (itens 13 e 14).

---

## Pontos que preciso confirmar antes de codar

1. **Modelo de visão padrão**: posso usar `google/gemini-2.5-flash` (multimodal, barato, já no gateway) como default quando `vision_enabled = true` e o modelo principal do agente não tiver visão? Ou prefere forçar o usuário a escolher um modelo com visão?
2. **Orquestrador — classificação de intenção (passo 5)**: ok cobrar 1 crédito por classificação via Lovable AI? Posso pular se as regras 3/4 já casaram.
3. **Tags pré-definidas**: começo com os 8 exemplos do seu brief (🔥 Quente, 🏠 Alto Padrão, 💰 Investidor, 📞 Retornar, ⚠️ Documentação, ⭐ VIP, 🟢 Novo, 🔴 Urgente) seedadas por usuário, ou só crio a tabela vazia?
4. **CRM scroll**: confirma que pode remover totalmente a scroll horizontal externa? Em telas estreitas (~1280px) com 6+ etapas, o usuário ainda vai precisar scrollar horizontal — só que o scroll vai ficar dentro do container do Kanban, não na página inteira. Ok?

Responde essas 4 perguntas (ou só "vai") e começo pelo PR-A.