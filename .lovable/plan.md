
# Plano: Módulos AUTOMAÇÃO + CHAT (CRM Religare)

## Resumo

Adicionar dois módulos completos ao Omni Builder CRM:
1. **AUTOMAÇÃO** — importação de leads, campanhas de prospecção ativa via WhatsApp (Z-API), motor de disparos inteligentes, agentes IA multi-provider, fluxos híbridos.
2. **CHAT** — inbox em tempo real estilo Kommo, controle IA on/off por conversa, intervenção humana, modo copiloto, gestão de lead inline.

Tudo nativo, sem quebrar funcionalidades existentes (CRM, Forms, Quiz, Agenda, Checkout, Pages, Notificações).

---

## Pré-requisito: Z-API (configurado pelo usuário)

A Z-API é externa e requer credenciais do usuário (Instance ID + Token + Client-Token). O sistema:
- Aceita as credenciais via interface (armazenadas em `whatsapp_configs` por usuário)
- Faz envios via Edge Function `send-whatsapp` (server-side, sem expor token)
- Recebe mensagens via Edge Function pública `webhook-receiver` (URL informada na Z-API pelo usuário)

Suporte multi-provider (Z-API default, Evolution, UltraMsg, Custom) — usuário escolhe.

---

## Fase 1 — Schema do Banco (Migration única)

Tabelas novas:

| Tabela | Função |
|---|---|
| `whatsapp_configs` | Config do provedor WhatsApp por usuário (api_type, base_url, api_token, instance_id, extra_headers, default_pipeline_id, default_stage_id, auto_create_lead, is_active) |
| `messages` | Mensagens in/out (client_id, lead_id, direction, content, media_url, media_type, status, external_message_id, channel, metadata) |
| `api_keys` | Chaves de autenticação para webhook-receiver (key_hash SHA-256, label, last_used_at) |
| `ai_provider_configs` | Cofre de API Keys IA (provider: groq/openai/gemini/lovable, label, api_key_encrypted, is_default, is_active) |
| `ai_agents` | Agentes IA (name, type: atendimento/prospeccao/sdr/closer/suporte, personality, tone, system_prompt, ai_provider_config_id, model, max_tokens, is_active) |
| `agent_knowledge` | Base de conhecimento por agente (type: text/url/pdf, content, source_url) |
| `prospecting_campaigns` | Campanhas (name, agent_id, flow_id, pipeline_id, stage_id, channel, status, daily_limit, business_hours, delay_min, delay_max) |
| `campaign_contacts` | Leads vinculados à campanha (status: pending/sent/replied/converted/failed, sent_at, last_message_at) |
| `conversation_flows` | Fluxos visuais (name, nodes JSONB, edges JSONB) |
| `conversation_flow_sessions` | Sessões ativas (client_id, flow_id, current_node_id, variables JSONB) |
| `chat_automations` | Regras gatilho→ação para o chat (trigger_type, trigger_value, actions JSONB, priority, is_active) |
| `conversation_state` | Por conversa: ai_active (bool), assigned_agent_id, assigned_user_id, mode: ai/human/copilot, last_human_reply_at |
| `quick_replies` | Respostas rápidas (shortcut, content) |
| `webhook_logs` | Logs de webhook entrada/saída (direction, event, payload, status, error) |

Todas com RLS por `user_id`. Realtime habilitado para `messages` e `conversation_state`.

---

## Fase 2 — Edge Functions

| Função | Responsabilidade |
|---|---|
| `send-whatsapp` | Envio multi-provider (Z-API, Evolution, UltraMsg, Custom). Sanitiza URL, monta payload, salva em `messages` |
| `webhook-receiver` | Recebe webhooks (autentica via `api_keys` SHA-256). Normaliza payload por provedor. Detecta grupo. Dedup por `external_message_id`. Cria/resolve cliente. Auto-cria lead. Dispara automações + flows + agente IA. Cria notificação |
| `ai-agent` | Proxy IA multi-provider. Lê `ai_provider_configs`, monta histórico (últimas 30 msgs) + system prompt + conhecimento, chama provedor (Lovable AI por default, Groq/OpenAI/Gemini se configurado), retorna resposta. Aplica delay humanizado |
| `prospecting-engine` | Cron-like: busca campanhas ativas, contatos `pending`, respeita horário comercial e daily_limit, randomiza delay, dispara via `send-whatsapp`, marca `sent_at` |
| `test-whatsapp` | Diagnóstico: envia ping para validar credenciais |
| `chat-copilot` | Copiloto: dado histórico, retorna sugestões de resposta + resumo + próximo passo (não envia) |

Todas com `verify_jwt = false` (validação interna via JWT ou API Key). CORS configurado.

---

## Fase 3 — Módulo AUTOMAÇÃO (UI)

Nova entrada na sidebar do `Dashboard.tsx`: **Automação** (ícone Zap).

Componente `AutomationHub.tsx` com sub-abas:

1. **Importação de Leads** (`LeadImporter.tsx`)
   - Upload CSV/XLSX (parse client-side com biblioteca `papaparse` + `xlsx`)
   - Mapeamento de colunas → campos (nome, telefone, email, tags, origem)
   - Seleção: pipeline, etapa, tag inicial
   - Opção: "Adicionar direto a campanha" (escolhe campanha)
   - Preview antes de importar + dedup por telefone/email

2. **Campanhas** (`CampaignsList.tsx` + `CampaignEditor.tsx`)
   - CRUD de campanhas
   - Configuração: nome, lista (importada/CRM), canal (WhatsApp), agente OU fluxo
   - Tipo: disparo único / sequência / baseado em comportamento
   - Regras: delay min/max, horário comercial, limite/dia, randomização
   - Vínculo CRM: pipeline + etapa + ações automáticas (respondeu→mover, sem resposta→follow-up)
   - Botão: Iniciar / Pausar / Duplicar

3. **Agentes IA** (`AgentsLibrary.tsx`)
   - CRUD de múltiplos agentes (SDR, Closer, Suporte etc)
   - Editor com abas: Identidade, Instruções (prompt), Conhecimento (texto/URL/PDF), Configuração (provider, model, delay)
   - Templates pré-prontos (Atendente SAC, Recepcionista, Qualificador)
   - Sandbox de teste (`AgentTestChat.tsx`) — simula conversa
   - Log de tokens consumidos por agente

4. **Fluxos** (`FlowsList.tsx` + `FlowCanvas.tsx`)
   - Construtor visual (React Flow ou implementação custom em SVG)
   - Tipos de nó: message, input, options, condition, action, delay, ai_context, end
   - Templates: Boas-vindas, Prospecção, Pesquisa, Re-engajamento

5. **Cofre de API Keys IA** (`AIProviderSettings.tsx`)
   - CRUD para Lovable AI (default), Groq, OpenAI, Gemini, Claude
   - Teste de conexão
   - Marca padrão por provedor

6. **Automações de Chat** (`ChatAutomationsTab.tsx`)
   - CRUD gatilho→ações (multi-step)
   - Gatilhos: any_message, keyword, regex, first_message, no_response_xh, intent_detected, stage_entry, business_hours/off_hours
   - Ações: ai_agent, auto_reply, pause_agent, add_to_pipeline, move_stage, add_tag, assign_to, start_flow

---

## Fase 4 — Módulo CHAT / INBOX (UI)

Nova entrada na sidebar: **Chat** (ícone MessageCircle).

Layout 3 colunas em `InboxPage.tsx`:

**Coluna esquerda — `ConversationList.tsx` (340px)**
- Lista de conversas agregadas por `client_id`
- Filtros: Todos / Não lidos / Aguardando / Individual / Grupos
- Busca por nome/telefone
- Badges: campanha, tags, IA on/off
- Realtime via subscription em `messages`

**Coluna central — `ChatArea.tsx`**
- Histórico paginado (lazy load no scroll up)
- Envio: texto, mídia (upload bucket `chat-media`), áudio (MediaRecorder)
- Respostas rápidas (`/` abre menu)
- Notas internas (Alt+N)
- Separadores de data
- Indicador "digitando" e status da mensagem
- Banner de aviso se WhatsApp inativo

**Coluna direita — `ChatSidebar.tsx` (288px)**
- Perfil do cliente (avatar, nome editável, telefone)
- Controle IA da conversa:
  - Toggle: **IA Ativa / Pausada / Modo Copiloto**
  - Select: trocar agente
  - Botão: Reiniciar fluxo
- Origem: badge "Veio da campanha X — Etapa Y"
- Funil/Etapa do lead (select inline)
- Tags (toggle)
- Notas internas + Timeline de atividades

**Modo Copiloto (`CopilotPanel.tsx`)**
- Chama `chat-copilot` Edge Function
- Mostra: 3 sugestões de resposta + resumo da conversa + próximo passo recomendado
- Clicar em sugestão → preenche o input

**Intervenção humana**
- Quando usuário responde, IA pausa automaticamente (configurável em `conversation_state.mode`)
- Botão "Devolver para IA" reativa

---

## Fase 5 — Integração com sistema existente

- **Notificações**: nova mensagem inbound gera entrada em `notifications` (já existe)
- **CRM Events** (`crm-events.ts`): novos eventos `lead_imported`, `campaign_started`, `reply_detected`, `intent_detected`
- **Forms/Quiz/Agenda/Checkout**: ao gerar lead, opcionalmente vincular a campanha de boas-vindas
- **CRMKanban**: badge "Veio da campanha" no lead; chat history inline (já existe `LeadViewer`, adicionar aba "Chat")

---

## Fase 6 — Detalhes técnicos

**Hooks/libs a criar:**
- `src/hooks/useInbox.tsx` — estado central do chat (conversations, messages, realtime, paginação)
- `src/lib/whatsapp-providers.ts` — definições e validações por provedor
- `src/lib/flow-engine.ts` — runner de fluxos client-side (preview) e helpers
- `src/lib/ai-router.ts` — abstração de chamada IA (default Lovable AI)

**Bibliotecas a instalar:**
- `papaparse` + `xlsx` (importação)
- `reactflow` (canvas de fluxos) — opcional, fallback custom
- `react-markdown` (renderização de respostas IA no chat)

**Storage bucket:**
- `chat-media` (público) para mídias enviadas/recebidas

**Realtime:**
- Habilitar em `messages` e `conversation_state` via `ALTER PUBLICATION supabase_realtime ADD TABLE`

**IA default:**
- Lovable AI Gateway (Gemini Flash) já disponível via `LOVABLE_API_KEY` — sem custo de setup
- Usuário pode adicionar Groq/OpenAI/Gemini próprios para escalar

---

## Fase 7 — Ordem de execução (sem deixar pela metade)

1. **Migration completa** (todas as tabelas + RLS + realtime + bucket)
2. **Edge Functions base**: `send-whatsapp`, `webhook-receiver`, `ai-agent`, `test-whatsapp`
3. **Sidebar Dashboard**: adicionar entradas "Automação" e "Chat"
4. **Configuração WhatsApp** (sub-aba Automação): permite usuário conectar Z-API
5. **Cofre de API Keys IA** (mesmo painel)
6. **Inbox completo** (3 colunas, realtime, envio/recebimento, controle IA)
7. **Agentes IA** (CRUD + sandbox de teste)
8. **Automações de chat** (gatilho→ação)
9. **Importação de leads** (CSV/XLSX)
10. **Campanhas de prospecção** (CRUD + engine + cron via pg_cron ou trigger periódico)
11. **Fluxos visuais** (canvas + runner)
12. **Modo Copiloto** + integração final com CRM/Notificações

Cada fase entregue completa antes de iniciar a próxima, com QA visual no preview.

---

## Garantias

- ✅ Zero remoção/quebra: todos os módulos atuais permanecem intactos
- ✅ Nativo: nada depende de SaaS externo além da própria Z-API (configurada pelo usuário)
- ✅ Multi-tenant: isolamento via RLS por `user_id`
- ✅ Pronto para IA: arquitetura multi-provider e multi-agente desde o início
- ✅ Escalável: Edge Functions para processamento pesado, realtime para UI

---

## O que o usuário precisará fazer (após aprovar)

1. Criar conta na Z-API (ou outro provedor) e obter Instance ID + Token
2. Colar credenciais na nova aba **Automação → WhatsApp**
3. Copiar a URL do webhook gerada e colar no painel da Z-API
4. (Opcional) Adicionar API Keys próprias de Groq/OpenAI/Gemini se quiser modelos específicos — caso contrário, Lovable AI já funciona out-of-the-box
