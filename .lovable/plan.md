## Plano de Implementação — Pacote completo

### 1. Multimídia descontada do provedor do usuário
- **Transcrição (áudio recebido)** e **interpretação de imagem** passam a usar o provedor que o agente tem configurado (`ai_provider_config_id`): se for `groq`, usa Groq Whisper; se `openai`, usa Whisper OpenAI; se `gemini` ou `omni`, usa Gemini multimodal via Lovable AI Gateway (consome créditos Lovable + créditos internos).
- Atualizar `webhook-receiver/index.ts`: helper `transcribeAudio(provider, key, url)` e `analyzeImage(provider, key, url)` com switch por provedor. Fallback gracioso (não bloqueia a conversa).

### 2. Corrigir erro do "Ouvir prévia" (Omni Audio 500)
- `tts-preview/index.ts`: Omni Audio passa a usar o **Lovable AI Gateway** corretamente (`https://ai.gateway.lovable.dev/v1/...`) em vez de chamar `api.openai.com` com `LOVABLE_API_KEY` (que não é uma chave OpenAI). 
- Implementar contenção: em falha, retornar 200 com `{ fallback: true, error }` e o front faz fallback para `SpeechSynthesisUtterance` do navegador, mostrando toast informativo.
- Adicionar provedores extras de TTS: **Groq** (PlayAI/whisper-tts) e voz nativa via Lovable AI quando disponível.

### 3. Agentes de IA — novas opções
Adicionar à tabela `ai_agents`:
- `split_long_messages` (bool, default true) — divide respostas longas em múltiplas mensagens com pequenos delays.
- `max_message_chars` (int, default 350) — tamanho de cada parte.
- `simulate_typing` (bool, default true) — envia presença "digitando…" antes de texto.
- `simulate_recording` (bool, default true) — envia presença "gravando áudio…" antes de áudio.

No `webhook-receiver`/`send-whatsapp` antes de cada mensagem chamar Z-API/Evolution endpoints de **chat-state** (`/send-presence` composing/recording) com duração proporcional ao tamanho.

### 4. Templates prontos de Agentes e Fluxos
- Nova aba/modal "Templates" no AgentBuilder com cards: **Atendimento**, **SDR/Qualificador**, **Suporte N1**, **Follow-up**, **Recuperação de Carrinho**, **Pesquisa NPS**, **Agendador**. Cada um traz `system_prompt`, `tone`, `rules`, `objections`, `examples`, `voice_*` pré-preenchidos. Botão "Usar template" cria um agente pronto para editar/ativar.
- Mesmo conceito em `FlowsBuilder`: templates prontos — **Disparo de Campanha**, **Follow-up 3 toques**, **Boas-vindas + Qualificação**, **Pós-venda**, **Reativação fria**. Editor visual de nós (mensagem → espera → condição → próxima).

### 5. Campanhas — seleção de Pipelines/Etapas de origem
Adicionar à `prospecting_campaigns`:
- `source_pipelines` (jsonb array de `{pipeline_id, stage_ids[]}`) — múltiplos pipelines/etapas que alimentam a campanha.
- `target_pipeline_id` / `target_stage_id` — para onde o lead vai após resposta.

UI em `CampaignsList`: ao criar/editar, multi-select de pipelines e checklist de etapas; preview do total de leads elegíveis em tempo real.

### 6. Painel lateral do Chat (sidebar do contato) — paridade com o print
Refatorar `InboxPage.tsx` painel direito:
- Cabeçalho com avatar, nome, telefone, empresa, tag de status (Novo/Cliente), **Ticket Médio**.
- Bloco **Funil & Etapa**: lead vinculado, transferir pipeline, mover etapa, "Ver Lead no Pipeline".
- **Transferir Conversa** para outro membro/atendente.
- **Automação & IA**: switch IA Ativa, lista de agentes/fluxos vinculados.
- **Tags** editáveis.
- **Notas internas** (privadas para a equipe).
- **Atividade**: timeline de disparos/automações.
- Co-Piloto de Vendas no rodapé (sugestões via Lovable AI).
- Atalhos no input: `Enter enviar · Shift+Enter nova linha · Alt+N nota · 📎 anexar · 🎤 áudio · /` para `quick_replies`.

### 7. Identidade do usuário no header + créditos visíveis e descontáveis
- Header (`Dashboard.tsx` sidebar footer já mostra email): trocar para **nome completo** (`profiles.full_name`) e **plano**.
- Topo do dashboard: badge "⚡ N créditos" sempre visível.
- Tabela `profiles`: adicionar `plan` (`start|pro|enterprise`), `credits_balance` (int), `credits_monthly` (int).
- Tabela nova `credit_transactions` (user_id, amount, reason, ref_id, created_at) para histórico.
- Edge function `consume-credits` (service-role) chamada em: resposta com áudio do agente, geração de imagem, geração de página/quiz/form via IA, transcrição, análise de imagem. Custos default configuráveis pelo super admin.

### 8. Planos e limites
| Plano | Preço | Créditos | Módulos | Atendentes extras |
|---|---|---|---|---|
| **Start** | R$ 197 | 50 | CRM, Analytics, Forms | 0 |
| **Pro** | R$ 397 | 100 | + Quiz, Pages | até 5 |
| **Enterprise** | R$ 497 | 200 | + Agenda, Automação, Agentes IA, Fluxos, Campanhas, Chat | até 20 |

- Coluna `plan` em `profiles` controla acesso aos módulos no `Dashboard.tsx` (esconder itens do menu).
- SuperAdmin define plano e pode override de limites por usuário.

### 9. Atendentes / Sub-usuários por plano
- Tabela nova `team_members` (owner_user_id, member_user_id, role, permissions jsonb, created_at).
- Em `SettingsPage` nova aba **Equipe**: dono do plano (Pro/Enterprise) convida atendentes por email — limite conforme plano (5/20). SuperAdmin pode aumentar manualmente via override.
- Atendentes recebem leads transferidos, conversas, com permissões granulares (ver pipelines, responder, criar campanhas, etc.).
- Filtro em `InboxPage` "Transferir Conversa" lista apenas membros do dono do workspace.

### 10. Novo módulo "Importados" (lista de contatos importados)
- Tabela nova `imported_contact_lists` (id, user_id, file_name, total, pending, converted, created_at).
- Tabela nova `imported_contacts` (id, list_id, user_id, name, email, phone, company, status `pending|converted`, lead_id nullable, raw jsonb, created_at).
- Nova rota/aba **Importados** abaixo de **Importar** no menu lateral, com a UI do print: header "Contatos Importados — N contatos · N pendentes · N convertidos", busca, filtros Pendentes/Data, lista por arquivo expandível com botão "Converter Todos" e "Converter" por linha (cria `lead` e marca status).

### 11. Refatorar "Importar" para o layout do print
- `LeadImporter.tsx`: cabeçalho "Importar Contatos · Importe via arquivo ou cole sua lista", botão "Ver N contatos importados".
- Campo **Tag de campanha (opcional)**.
- **Tipo de lista**: 3 cards selecionáveis — *Leads/Contatos Novos*, *Clientes Efetivados*, *Misto*.
- Toggle **Importar Arquivo / Colar Contatos**.
- Dropzone grande "Arraste seu arquivo aqui" + helper "CSV, TXT, Excel — aceita listas com apenas telefone, email ou nome".
- Após importar grava em `imported_contact_lists` + `imported_contacts` (não cria leads diretamente — conversão é feita em "Importados").

---

### Detalhes técnicos (resumo)

**Migrations principais**
```sql
ALTER TABLE profiles ADD COLUMN plan text DEFAULT 'start',
  ADD COLUMN credits_balance int DEFAULT 50,
  ADD COLUMN credits_monthly int DEFAULT 50;

ALTER TABLE ai_agents
  ADD COLUMN split_long_messages bool DEFAULT true,
  ADD COLUMN max_message_chars int DEFAULT 350,
  ADD COLUMN simulate_typing bool DEFAULT true,
  ADD COLUMN simulate_recording bool DEFAULT true;

ALTER TABLE prospecting_campaigns
  ADD COLUMN source_pipelines jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN target_pipeline_id text,
  ADD COLUMN target_stage_id text;

CREATE TABLE credit_transactions (...);
CREATE TABLE team_members (...);
CREATE TABLE imported_contact_lists (...);
CREATE TABLE imported_contacts (...);
```

**Edge functions novas/atualizadas**
- `consume-credits` (nova) — debita e registra.
- `tts-preview` — fix Omni via Lovable Gateway, fallback gracioso, +Groq.
- `webhook-receiver` — transcrição/visão por provedor do agente, presença typing/recording, split de mensagens longas, cobrança de créditos.
- `send-whatsapp` — suporte a presença e envio fracionado.
- `manage-users` — campos `plan`, `team_member_limit`, `permissions` expandidos.

**Arquivos front principais**
- `Dashboard.tsx` — header com nome+plano+créditos, gating por plano, novo item "Importados".
- `AgentBuilder.tsx` — toggles novos + modal de Templates.
- `FlowsBuilder.tsx` — Templates de fluxo + editor visual.
- `CampaignsList.tsx` — multi-pipeline source/target.
- `InboxPage.tsx` — painel lateral completo conforme print.
- `LeadImporter.tsx` — refator para layout do print.
- Novos: `ImportedContacts.tsx`, `TeamMembers.tsx` (em SettingsPage).

### Ordem de execução
1. Migrations + edge functions (créditos, TTS fix, webhook multimídia).
2. Header de plano/créditos + gating de módulos.
3. AgentBuilder (toggles + templates) e FlowsBuilder (templates).
4. CampaignsList (pipelines source/target).
5. InboxPage painel lateral completo.
6. LeadImporter refatorado + módulo Importados.
7. Equipe/Atendentes em Settings.
