# Plano completo — STATUS

## ✅ Concluído

### Backend / Migrations
- Tabelas `credit_transactions`, `imported_lists`, `imported_contacts`, `team_members`
- Colunas: `profiles.plan / credits_balance / credits_monthly / team_seats`
- Colunas: `ai_agents.split_long_messages / max_message_chars / simulate_typing / simulate_recording`
- Colunas: `prospecting_campaigns.source_pipelines / target_pipeline_id / target_stage_id`
- Função `deduct_credits(user_id, amount, kind, metadata)`

### Edge Functions
- `tts-preview`: Omni Audio via Lovable AI Gateway + fallback browser SpeechSynthesis
- `webhook-receiver`: transcrição/visão pelo provedor configurado do agente, presença typing/recording, split de mensagens longas, débito de créditos
- `manage-users`: campos plan/credits

### Frontend
- `useUserPlan` hook + gating de módulos por plano
- Header com nome + plano + créditos (CreditsBadge)
- `AgentTemplatesModal` — 7 templates prontos
- `AgentBuilder` — toggles human-like (typing/recording/split)
- `ImportedListsViewer` — gestão de listas importadas + conversão
- `LeadImporter` — refator completo: cards de tipo (Leads/Clientes/Misto), dropzone visual, tag de campanha, modos arquivo/colar
- `CampaignsList` — multi-select de pipelines/etapas de origem + pipeline/etapa destino
- `InboxPage` painel lateral: Lead, Pipeline transfer, Stage move, AI control, Agent assignment, **Transferir Conversa para atendente**, **Notas Internas**, Tags, Atividade, Copiloto
- `InboxPage` header: badge Novo/Cliente + Ticket Médio + status IA
- `InboxPage` composer: modos Responder / Nota Interna com atalho Alt+N
- `SettingsPage` — nova seção **Equipe / Atendentes** com convites, permissões granulares, limites por plano

## ⏭️ Próximos passos sugeridos
- `prospecting-engine`: auto-popular `campaign_contacts` a partir de `source_pipelines`
- `FlowsBuilder`: templates prontos de fluxos
- Rate limiting visual no header (créditos esgotados → upgrade)
