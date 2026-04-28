## Plano completo — 9 itens

### 1. Chat: parar duplicação + espelhar WhatsApp 100%
- **Migração**: índice único `(user_id, phone)` em `chat_clients` + de-dup das linhas existentes (mantém a mais antiga, migra `messages.client_id` e `conversation_state.client_id` das duplicadas).
- **`webhook-receiver`**:
  - Lookup do client passa a fazer **upsert atômico** (`onConflict: 'user_id,phone'`) — elimina race condition que cria 2 conversas quando o agente demora a responder.
  - **Remover o early-return** quando `msg.from_me === true`. Em vez disso, salvar a mensagem como `direction: 'outbound'`, `channel: 'whatsapp'`, `metadata.sent_from_phone: true`, **sem disparar IA** e **forçando** `conversation_state.ai_active = false` + `mode = 'manual'` (resposta humana pelo celular = humano assumiu).
  - Suporte completo a mídia recebida E enviada de fora: áudio (`audioMessage`), imagem (`imageMessage`), vídeo, documento, sticker, reactions e emojis (texto já é UTF-8). Salvar `media_url`, `media_type`, `metadata.mimetype`, `metadata.duration`, `metadata.caption`, `metadata.reaction`.
  - Para Z-API/Evolution: ler também eventos `message.fromMe`, `messages.upsert` com fromMe, e `message-status` para sincronizar ✓✓.
- **InboxPage**: renderizar mensagens `outbound` com `metadata.sent_from_phone` com badge "📱 Enviado pelo celular" e renderer único para áudio (`<audio>`), imagem (`<img>`), documento (link), reaction (emoji sobreposto na bolha alvo).

### 2. Renomear Analytics → Dashboard e mover para o topo
- `Dashboard.tsx`: reordenar nav — `dashboard` (antigo `analytics`) vira o **primeiro item**, acima do CRM.
- Reescrever `Analytics.tsx` como **Dashboard executivo** com KPIs do sistema:
  - Conversas ativas / novas hoje / 7d / 30d
  - Mensagens enviadas vs recebidas
  - Créditos consumidos (hoje / mês) + saldo
  - Agentes ativos, fluxos rodando, campanhas em execução
  - Leads no pipeline, taxa de conversão por etapa
  - MRR/LTV (já existente em CRMForecast — reusar widget)
  - Gráfico de uso de créditos por dia (últimos 30d) — query em `credit_transactions`

### 3. Remover toda menção a "Lovable" da UI
- `AgentBuilder.tsx`: "Omni Audio (nativo Lovable)" → "Omni Audio (nativo — recomendado)"; "Lovable AI (padrão — sem chave)" → "Padrão do sistema (sem chave)".
- `AIProviderSettings.tsx`: provider `lovable` exibido como **"Sistema (incluso)"**; remover textos "Lovable AI já está incluso…".
- `AutomationHub.tsx`: descrições "(Lovable, OpenAI, Groq, Gemini)" → "(Sistema, OpenAI, Groq, Gemini)".
- Grep final em todo `src/components/dashboard/**` para garantir zero ocorrências user-facing.

### 4. FlowsBuilder: templates prontos de automação
- Novo `FlowTemplatesModal.tsx` com 8 templates editáveis:
  1. **Boas-vindas** (saudação + qualificação)
  2. **Prospecção fria** (apresentação + interesse + agendamento)
  3. **Follow-up 3 toques** (D+1, D+3, D+7 com mensagens diferentes)
  4. **Recuperação de carrinho** (lembrete + objeção + desconto)
  5. **Confirmação de agendamento** (24h antes + lembrete 1h)
  6. **Pós-venda / NPS** (agradecimento + pesquisa)
  7. **Reativação de cliente inativo** (90d sem compra)
  8. **Qualificação SDR** (BANT)
- Cada template = `nodes`+`edges` JSON pré-montado com mensagens, delays, condicionais. Botão "Usar template" abre o builder já preenchido para edição.

### 5. Campanhas: escolher Fluxo, Agente, ou template
- `CampaignsList.tsx` ganha **modal de criação em 3 abas**:
  - **🤖 Agente IA**: select de `ai_agents` ativos
  - **🔀 Fluxo**: select de `conversation_flows`
  - **📋 Template pronto**: cards com 6 modelos (Prospecção, Follow-up, Recuperação, Reativação, Convite Webinar, Pesquisa) — cada um cria automaticamente um flow + a campanha
- Cada opção tem **descrição "Para que serve"** e ícone. Após criada, tudo continua editável.
- Migração: garantir colunas `flow_id` e `agent_id` em `prospecting_campaigns` (flow_id já existe; confirmar agent_id).

### 6. Super Admin: planos manuais + créditos + canal de suporte
- **Migração**: garantir colunas `plan`, `credits_balance`, `credits_monthly` em `managed_users` (espelham `profiles`); edge `manage-users` com novas actions `set_plan` e `set_credits` que atualizam **ambas** as tabelas.
- `SuperAdminPanel.tsx`: por usuário expandido, **select de plano** (Start/Pro/Enterprise) — ao trocar, créditos mensais são pré-preenchidos do plano, mas campo continua **editável manualmente**. Botão "Resetar mensal" reabastece para o valor do plano.
- **Suporte para comprar créditos**: novo botão "Solicitar mais créditos" no `CreditsBadge` (header do user) → modal com WhatsApp/email do super admin (lido de `mem://` ou env). No painel super admin: aba **"Solicitações de créditos"** — nova tabela `credit_requests` (user_id, amount, message, status, created_at) + RLS; super admin aprova → soma em `credits_balance` automaticamente.

### 7. Histórico de uso por usuário no Super Admin
- Já existe `credit_transactions` (kind, amount, metadata). Estender o `metadata` no `webhook-receiver` para gravar: `provider`, `model`, `tokens_in`, `tokens_out`, `agent_id`, `client_id`, `cost_native_tokens`.
- Nova aba no Super Admin **"Histórico de uso"** com filtro por usuário (incluindo o próprio super admin que é ilimitado mas é registrado mesmo assim):
  - Tabela paginada de transações
  - Agregados: tokens por provedor/modelo, conversas, custo equivalente
  - Gráfico de uso 30d
- Para super admin: como não há débito real, registrar `amount: 0` mas com `metadata` completo, para preservar o histórico.

### 8. Estratégia de provedores (recomendação + implementação)
**Recomendação**: manter o modelo híbrido atual + adicionar **modo "provedor gerenciado pelo super admin"** por usuário. Justificativa:
- Cliente final não precisa saber de chaves; super admin atribui um `ai_provider_config_id` ao usuário (ou ao agente), e o sistema desconta tokens reais da chave do super admin **e** créditos do usuário (markup ≥3x).
- **Pages/Forms/Quiz**: continuam usando provedor "sistema" (Lovable AI Gateway), nunca exposto. Sem domínio próprio para esses módulos — somente subdomínio nosso `slug.omnibuildercrm.online`.
- **Tabela de custo de créditos** (`credit_costs` — nova): linhas com `action` (`page_generate`, `form_generate`, `quiz_generate`, `chat_message`, `audio_transcribe`, `image_vision`, `tts`), `credits_per_unit`, `unit` (msg, 1k tokens, segundo). Editável só por super admin. Markup default 3x sobre custo estimado.
- `deduct_credits` passa a ler dessa tabela em vez de valores hardcoded.
- Toda geração em pages/forms/quiz chama `deduct_credits` com o action correspondente, e fica no histórico.

### 9. Chat: alinhar UI ao print enviado
Pelos prints, o usuário quer (e a maior parte já existe — completar gaps):
- **Lista esquerda**: abas Todos / N. lidos (com badge) / Aguard. / Indiv. / Grupos. **Adicionar contador "Grupos 17"** e filtro real por `metadata.is_group`.
- **Menu de 3 pontos por conversa** (já mostrado no print 3): "📌 Fixar no topo", "✉️ Marcar como não lido", "🗑 Excluir conversa". Implementar no `InboxPage` usando `conversation_state.pinned` e `marked_unread` (já existem).
- **Header da conversa**: telefone formatado abaixo do nome, badge "Novo"/"Cliente" (já existe), botões 🔍 buscar mensagens, ✨ copiloto, 🕐 histórico.
- **Sidebar direita**: avatar grande, nome, empresa, badge Novo, **Ticket Médio** destacado, telefone, email, Funil & Etapa com barra de progresso, "Lead vinculado" com nome+score, **Transferir para pipeline** (select), **Mover para etapa** (select), **Ver Lead no Pipeline** (botão), **Transferir Conversa** (já existe).
- **Composer**: barra inferior com "Enter enviar • Shift+Enter nova linha • Alt+N nota • 📎 anexar • 🎤 áudio • / atalhos", ícones ⚡ atalhos rápidos, 📎 anexo, 📄 nota, microfone à direita.
- **Co-Piloto de Vendas**: barra acima do composer com "Sugestão" e contador de uso (`⚡-3-5`).

### Detalhes técnicos por arquivo

```text
Migrations:
  - chat_clients: dedup + UNIQUE(user_id, phone)
  - credit_requests (nova) + RLS
  - credit_costs (nova) + RLS (read all auth, write super_admin)
  - managed_users: add plan, credits_balance, credits_monthly

Edge functions:
  - webhook-receiver: upsert client, mirror from_me como outbound, mídia completa, presence/status events, log de tokens em metadata
  - manage-users: actions set_plan, set_credits, approve_credit_request

Frontend novos:
  - src/components/dashboard/automation/FlowTemplatesModal.tsx
  - src/components/dashboard/automation/CampaignTemplatesModal.tsx
  - src/components/dashboard/RequestCreditsModal.tsx
  - src/components/dashboard/superadmin/UsageHistoryTab.tsx
  - src/components/dashboard/superadmin/CreditRequestsTab.tsx

Frontend editados:
  - Dashboard.tsx (reorder nav, rename Analytics→Dashboard)
  - Analytics.tsx → reescrita como dashboard executivo
  - InboxPage.tsx (menu 3 pontos, mídia outbound, badge "do celular")
  - FlowsBuilder.tsx + CampaignsList.tsx (botões de templates)
  - SuperAdminPanel.tsx (plano, créditos, abas Histórico+Solicitações)
  - AgentBuilder.tsx, AIProviderSettings.tsx, AutomationHub.tsx (remover "Lovable")
```

### Ordem de execução
1. Migrations (dedup + uniques + novas tabelas)
2. Webhook-receiver (anti-dup + espelhamento + métricas)
3. Remoção de "Lovable" da UI
4. Dashboard (rename + KPIs)
5. Templates de Fluxos
6. Templates de Campanhas
7. Super Admin (planos/créditos/suporte/histórico/credit_costs)
8. InboxPage (menu 3 pontos + mídia outbound + polish da sidebar)
