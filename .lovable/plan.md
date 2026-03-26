

# Plano de Expansão Profissional — Todos os Módulos

## Diagnóstico

Analisei todos os 6 módulos (Pages, Forms, Quiz, Agenda, Checkout, CRM) em detalhe. Abaixo os gaps mais críticos vs. concorrentes como Hotmart, RD Station, Calendly, Kiwify, Pipedrive:

### Gaps Identificados por Módulo

**CRM:** Pipelines são client-side (não persistem no banco), sem import CSV, sem automações, sem bulk actions, sem detecção de duplicados.

**Forms:** Sem lógica condicional, sem upload de arquivo, sem webhook, sem notificação por email, sem proteção anti-spam.

**Quiz:** Sem opções visuais (imagens), sem branching logic, sem integração CRM completa (pipeline_id/stage_id não são salvos), sem compartilhamento de resultado.

**Agenda:** Sem timezone, sem buffer entre agendamentos, sem bloqueio de datas específicas, sem cancelamento pelo convidado, sem múltiplas durações.

**Checkout:** Sem cupom de desconto, sem order bump/upsell, sem parcelas, sem gestão de status de pedidos, sem campos customizados.

**Cross-module:** LeadViewer não integrado em Quiz/Checkout/Agenda, sem notificações unificadas.

---

## Plano de Implementação (4 Fases)

### Fase 1 — Banco de Dados e Infraestrutura

**Migrations necessárias:**
- Tabela `pipelines` (id, user_id, name, created_at) — persistir pipelines no banco
- Alterar `pipeline_stages` para ter `pipeline_id` referenciando `pipelines`
- Alterar `leads` para pipeline_id ser UUID ref pipelines
- Tabela `coupons` (id, user_id, code, discount_type, discount_value, max_uses, used_count, checkout_id, expires_at)
- Adicionar em `schedules`: `buffer_minutes`, `blocked_dates` (jsonb), `timezone`, `allow_cancellation`
- Adicionar em `appointments`: `cancellation_token`, `cancelled_at`
- Adicionar em `orders`: `coupon_code`, `discount_amount`
- Adicionar em `forms`: `webhook_url`, `notification_email`
- Adicionar em `quizzes`: `pipeline_id`, `stage_id`
- RLS em todas as novas tabelas/colunas

### Fase 2 — CRM Profissional

1. **Pipelines persistidos** — CRUD de pipelines no banco, stages vinculados a pipeline_id, migrar de client-side para server
2. **Import CSV** — Upload de arquivo CSV com mapeamento de colunas para campos do lead
3. **Bulk actions** — Selecionar múltiplos leads e aplicar: mover etapa, adicionar tag, excluir
4. **Detecção de duplicados** — Ao criar lead, verificar email/phone existente e alertar
5. **LeadViewer integrado** — Adicionar em Quiz, Checkout e Schedules (já existe em Forms)

### Fase 3 — Forms, Quiz & Checkout Avançados

**Forms:**
- Lógica condicional (show/hide campo baseado em resposta anterior)
- Webhook URL (POST automático ao submeter)
- Notificação por email ao owner (via edge function)
- Campo tipo `file` (upload via Storage)

**Quiz:**
- Opções com imagem (URL de imagem por opção)
- Salvar pipeline_id/stage_id nas settings e criar lead no CRM ao finalizar
- Botão compartilhar resultado (copiar link + texto)

**Checkout:**
- Sistema de cupons (código, % ou valor fixo, limite de uso, expiração)
- Order bump (item adicional com desconto no checkout)
- Gestão de pedidos (atualizar status: pending → confirmed → shipped → delivered)
- Campos customizados no formulário do checkout

### Fase 4 — Agenda Pro & Cross-Module

**Agenda:**
- Buffer entre agendamentos (ex: 10min intervalo)
- Bloqueio de datas específicas (feriados, férias)
- Timezone configurável
- Link de cancelamento para o convidado
- Múltiplas durações opcionais (30min, 60min)

**Cross-module:**
- Activity feed unificado no dashboard (últimos leads, agendamentos, pedidos)
- Contadores em tempo real nos tabs da sidebar (badges com quantidade)

---

## Arquivos a Criar/Editar

| Arquivo | Ação |
|---------|------|
| `supabase/migrations/...` | Nova migration com todas as alterações de schema |
| `src/components/dashboard/CRMKanban.tsx` | Pipelines persistidos, bulk actions, import CSV, duplicados |
| `src/components/dashboard/FormsList.tsx` | Lógica condicional, webhook, notificação, file upload |
| `src/components/dashboard/QuizList.tsx` | Imagens nas opções, CRM integration completa |
| `src/components/dashboard/CheckoutsList.tsx` | Cupons, order bump, gestão de pedidos, campos custom |
| `src/components/dashboard/SchedulesList.tsx` | Buffer, bloqueio de datas, timezone, cancelamento |
| `src/pages/CheckoutPublic.tsx` | Aplicar cupom, order bump UI, campos custom |
| `src/pages/FormPublic.tsx` | Lógica condicional, file upload |
| `src/pages/QuizPublic.tsx` | Imagens nas opções, compartilhar resultado |
| `src/pages/SchedulePublic.tsx` | Timezone, buffer, bloqueio de datas, cancelamento |
| `src/components/dashboard/LeadViewer.tsx` | Já existe, integrar nos módulos faltantes |
| `src/pages/Dashboard.tsx` | Badges nos tabs, activity feed |
| `supabase/functions/form-webhook/index.ts` | Nova edge function para webhook + email notification |

