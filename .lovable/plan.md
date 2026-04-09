

# Plano: Notificações, Forms Pro, e Rebrand para Omni Builder CRM

## Resumo

Implementar sistema de notificações centralizado, evoluir Forms para nível Typeform (tela inicial, validação real, preview por etapa, elementos de conversão), corrigir integração CRM nos forms, e rebrandar todo o projeto de "Forge AI" para "Omni Builder CRM".

---

## Fase 1 — Rebrand "Forge AI" → "Omni Builder CRM"

Substituição em todos os arquivos que contêm "Forge AI" ou "Forge":

| Arquivo | Alteração |
|---------|-----------|
| `index.html` | Title e meta tags |
| `src/components/landing/Navbar.tsx` | Logo text |
| `src/components/landing/Footer.tsx` | Brand name |
| `src/components/landing/HeroSection.tsx` | WhatsApp message |
| `src/components/landing/CTASection.tsx` | Brand text |
| `src/components/landing/LogosSection.tsx` | "confiam no..." text |
| `src/pages/Dashboard.tsx` | Sidebar logo |
| `src/components/dashboard/AIPageGenerator.tsx` | "Forge AI" references |
| `src/components/dashboard/LandingPagesList.tsx` | Default template content |

---

## Fase 2 — Sistema de Notificações

**Migration:** Criar tabela `notifications`:
- `id`, `user_id`, `type` (lead, appointment, form_response, quiz_response, order), `title`, `message`, `is_read`, `metadata` (jsonb), `created_at`
- RLS: users manage own notifications

**Dashboard:**
- Adicionar ícone de sino (Bell) no header do Dashboard com badge de contagem de não-lidas
- Dropdown/panel com lista de notificações recentes
- Marcar como lida ao clicar

**Geração de notificações** — No `FormPublic.tsx`, `QuizPublic.tsx`, `SchedulePublic.tsx`, `CheckoutPublic.tsx`:
- Após cada submissão, inserir registro na tabela `notifications` para o `user_id` do owner

---

## Fase 3 — Forms Pro (Estilo Typeform)

### 3.1 Tela Inicial (Welcome Screen)

No `FormsList.tsx` (editor), adicionar na aba Editor:
- Toggle "Tela Inicial" (on/off) em `settings.welcomeScreen.enabled`
- Campos: título, subtítulo, texto do botão, URL de imagem/vídeo de fundo
- Salvo em `settings.welcomeScreen`

No `FormPublic.tsx`:
- Antes de exibir o primeiro campo, renderizar a welcome screen se configurada
- Botão "Começar" avança para o step 0

### 3.2 Validação Real de Campos

No `FormPublic.tsx`, adicionar validação antes de avançar:
- **Email:** regex `^[^\s@]+@[^\s@]+\.[^\s@]+$` — mostrar erro inline se inválido
- **Telefone:** regex para formato brasileiro `(XX) XXXXX-XXXX` ou `+55...` — verificar mínimo 10 dígitos numéricos
- **Obrigatório:** bloquear avanço se campo required está vazio
- Exibir mensagem de erro estilizada abaixo do campo

### 3.3 Preview Real por Etapa

No `FormsList.tsx`, o preview atual mostra apenas 3 campos estáticos. Refatorar para:
- Exibir preview interativo que simula o modo sequencial (uma pergunta por vez)
- Navegação de preview com botões "Próximo"/"Voltar"
- Renderizar cada tipo de campo com o estilo real (cores, fontes, accent)
- Mostrar contador de etapa e barra de progresso

### 3.4 Elementos de Conversão

Adicionar em `settings`:
- `countdown` (object): `enabled`, `text`, `minutes` — Contador de urgência no topo
- `socialProof` (object): `enabled`, `text` — Ex: "127 pessoas preencheram hoje"

No `FormPublic.tsx`:
- Renderizar contador regressivo animado no topo se ativo
- Renderizar texto de prova social se ativo

### 3.5 Redirecionamento Pós-Envio

Já existe `settings.redirectUrl` — garantir que funciona corretamente junto com WhatsApp redirect. Prioridade: WhatsApp > redirectUrl > tela de sucesso.

### 3.6 Question Piping

Permitir usar `{campo_anterior}` no texto de perguntas seguintes. No `FormPublic.tsx`, ao renderizar o label de cada campo, substituir `{NomeDoCampo}` pelo valor respondido.

---

## Fase 4 — Fix CRM Integration nos Forms

**Problema atual:** No `FormPublic.tsx`, o lead só é criado se `stageId` existe. Mas o `pipeline_id` e `stage_id` são salvos como strings no form.

**Fix:**
- Garantir que ao salvar o form com pipeline_id e stage_id selecionados, esses valores são persistidos corretamente
- No `FormPublic.tsx`, ao submeter: se `form.pipeline_id` OU `form.stage_id` existem, criar o lead com ambos os campos
- Se apenas `pipeline_id` existe (sem stage), buscar a primeira etapa daquele pipeline

---

## Arquivos a Criar/Editar

| Arquivo | Ação |
|---------|------|
| Migration SQL | Criar tabela `notifications` |
| `src/pages/Dashboard.tsx` | Rebrand + bell icon + notifications panel |
| `src/components/landing/Navbar.tsx` | Rebrand |
| `src/components/landing/Footer.tsx` | Rebrand |
| `src/components/landing/HeroSection.tsx` | Rebrand |
| `src/components/landing/CTASection.tsx` | Rebrand |
| `src/components/landing/LogosSection.tsx` | Rebrand |
| `src/components/dashboard/AIPageGenerator.tsx` | Rebrand |
| `src/components/dashboard/LandingPagesList.tsx` | Rebrand |
| `src/components/dashboard/FormsList.tsx` | Welcome screen, preview real, countdown, social proof |
| `src/pages/FormPublic.tsx` | Welcome screen, validação, countdown, social proof, question piping, fix CRM |
| `src/pages/QuizPublic.tsx` | Inserir notificação ao submeter |
| `src/pages/SchedulePublic.tsx` | Inserir notificação ao submeter |
| `src/pages/CheckoutPublic.tsx` | Inserir notificação ao submeter |
| `index.html` | Rebrand title/meta |

**Nenhuma funcionalidade existente será removida ou alterada — apenas expandida.**

