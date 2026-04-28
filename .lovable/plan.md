# Plano — Pacote 9 itens

## Status atual

✅ **1. Anti-duplicação chat + espelhar WhatsApp**
- Migração: dedup chat_clients + UNIQUE(user_id, phone)
- webhook-receiver: upsert atômico + mirror `from_me` como outbound (força `ai_active=false`, `mode=manual`)
- InboxPage: badge "📱 do celular" em mensagens espelhadas

✅ **2. Analytics → Dashboard no topo**
- Sidebar: "Dashboard" como primeira aba (era "Analytics")
- Tab inicial = analytics

✅ **3. Remoção de "Lovable" da UI**
- AgentBuilder, AIProviderSettings, AutomationHub atualizados

✅ **6/7. Super Admin: Histórico + Solicitações + Custos**
- Tabs novas: Usuários · Solicitações · Custos de crédito · Histórico de uso
- Modal "Solicitar mais créditos" no header (botão + no badge de créditos)

✅ **8. Estratégia de provedores**
- Tabela `credit_costs` com markup 300% configurável
- Função `deduct_credits_by_action` lê da tabela
- Função `approve_credit_request` para super admin
- Super admin não é debitado (registra `amount: 0` com `would_charge` no metadata)

✅ **9. Chat polish**
- Botão X no painel de Copiloto (esconder sugestões)

## Pendente (próximas iterações)

- 4. FlowsBuilder: 8 templates prontos (modal)
- 5. CampaignsList: modal 3 abas (Agente/Fluxo/Template)
- Integrar `deduct_credits_by_action` em todas as edge functions de geração (pages/forms/quiz/audio/image)
- Captura de tokens reais (in/out) no webhook para gravar em `credit_transactions.metadata`
- Inbox: filtros (Grupos, Aguard.), menu 3 pontos por conversa, sidebar direita completa com Ticket Médio
