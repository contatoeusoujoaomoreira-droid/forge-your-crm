
# Plano de Evolução Completa

## Prioridade 1 — CRM: Automações Visuais + Converter em Cliente

### 1.1 Botão "Converter em Cliente" no modal do lead
- Adicionar botão no LeadViewer/modal de edição do lead
- Modal de conversão com seleção de tipo de receita (pagamento único / recorrente)
- Ao converter: status → "won", salvar revenue_type, criar activity log
- Integrar com motor de eventos (`lead_converted`)

### 1.2 Automações visuais no CRM
- Componente `CRMAutomations` já existe — integrar no Dashboard/CRM
- Ao mudar etapa → criar tarefa automática (já implementado no motor de eventos)
- Detectar estagnação (7+ dias sem atividade) → badge visual no card do lead
- Sugerir follow-up com botão de ação rápida

### 1.3 Isolamento de Pipelines
- Cada pipeline mostra APENAS seus leads e etapas
- Filtro de pipeline no CRMKanban filtra por `pipeline_id`
- Leads criados herdam o `pipeline_id` do pipeline selecionado
- Stages filtrados por `pipeline_id`

## Prioridade 2 — Agenda: Pipeline + Etapa

### 2.1 Seleção de Pipeline e Etapa na Agenda
- No editor de agenda (SchedulesList), adicionar seletores de pipeline e stage
- Ao agendar, criar lead no pipeline/etapa configurados
- Salvar `pipeline_id` e `stage_id` na tabela `schedules`

## Prioridade 3 — Pages: SEO + Pixel + CTA operacionais

### 3.1 Corrigir salvamento de SEO
- Verificar e corrigir o fluxo de save de: título, slug, meta_title, meta_description, custom_domain
- Garantir que alterações persistem no banco

### 3.2 Pixel Meta e Google operacionais
- Verificar injeção de pixel nas páginas públicas (LandingPagePublic)
- Adicionar eventos PageView, Lead, Purchase nos pixels
- Garantir compatibilidade com Meta Pixel Helper

### 3.3 CTAs com URL/WhatsApp
- Nos botões CTA das seções, adicionar opção de: URL externa, WhatsApp (wa.me), âncora
- Interface no editor para configurar destino do botão

## Prioridade 4 — Checkout Evolução (estilo Hotmart/Kiwify)

### 4.1 Melhorias visuais
- Timer de urgência (countdown)
- Selos de segurança
- Prova social (X pessoas compraram)
- Depoimentos no checkout

### 4.2 Funcionalidades
- Order bump melhorado com preview visual
- Campo de observações do cliente
- Múltiplos métodos de pagamento (visual)
- Status de pedido mais granular (pending → confirmed → shipped → delivered)

## Prioridade 5 — Domínios (análise)

O sistema de domínios customizados requer infraestrutura de DNS/proxy que não é possível implementar nativamente no frontend. O Lovable já oferece domínios customizados via Project Settings → Domains. Para domínios por página individual, precisamos avaliar a viabilidade separadamente.

---

## Arquivos principais a editar

| Arquivo | Mudança |
|---------|---------|
| `CRMKanban.tsx` | Isolamento de pipeline, badge estagnação |
| `LeadViewer.tsx` | Botão converter em cliente |
| `Dashboard.tsx` | Integrar CRMAutomations |
| `SchedulesList.tsx` | Pipeline/stage selector |
| `LandingPagesList.tsx` | Fix SEO save |
| `LandingPagePublic.tsx` | Pixel events operacionais |
| `CheckoutPublic.tsx` | Timer, selos, prova social |
| Seções do page builder | CTA com URL/WhatsApp config |
