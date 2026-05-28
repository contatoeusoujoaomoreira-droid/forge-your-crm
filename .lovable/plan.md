Esta solicitação tem 7 frentes interligadas. Proponho executar em uma única rodada, mas em blocos claros:

## 1. Conexão WhatsApp — UI com abas + auto-conectado
- Refatorar `AutomationHub.tsx` (seção Conexões / OmniConect):
  - Adicionar **abas** dentro da conexão: "OmniConect (QR/Pareamento)" e "Outras opções (avançado)". A aba OmniConect mostra apenas QR Code e Código de Pareamento — nada mais.
  - Dentro do OmniConect, sub-toggle entre **QR Code** e **Código de Pareamento** (input de telefone + `paircode` que já vem da edge function).
  - Após conectar, **polling de status** a cada 3s; quando `connected=true`, fechar modal/painel de QR automaticamente e renderizar o card "CONECTADO" (estilo Z-API igual à imagem: avatar/iniciais, "Operacional · respondendo mensagens", botão Desconectar, agente responsável, webhook ativo, último evento).
  - Esse card "Conectado" já existe em parte — vou consolidar num componente `<WhatsAppConnectedCard />`.

## 2. Código de pareamento funcional
- A edge function `omniconect` já aceita `body.phone` no `action: 'connect'` e retorna `paircode`. UI precisa enviar o telefone e exibir o código formatado (XXXX-XXXX).

## 3. Takeover humano → pausa automática do agente
- Nova tabela `agent_pause` (ou coluna em `conversations`): `conversation_id`, `paused_until` (timestamp nullable; null = permanente), `paused_by`.
- Em `InboxPage.tsx`: ao enviar mensagem manual (humana), chamar `pauseAgent(conversationId, duration)`. UI: dropdown ao lado do input com opções: 30min / 1h / 4h / 24h / Permanente / Não pausar. Salvar preferência por usuário.
- Em `webhook-receiver/index.ts` (ou `ai-agent`): antes de disparar o agente, checar `paused_until > now()` → pular resposta automática.
- Indicador visual no chat: "Agente pausado até HH:MM" com botão "Reativar".

## 4. Avatares/fotos de perfil no chat
- Edge function `sync-chat-avatars` já existe. Garantir que:
  - Webhook salva `profile_pic_url` ao receber mensagem (UAZAPI envia em `chat.imagePreview` ou via `/chat/details`).
  - InboxPage renderiza `<Avatar src={contact.profile_pic_url}>` com fallback de iniciais.
- Adicionar chamada para sincronizar avatar quando um contato novo aparece.

## 5. Tempo de resposta configurado deve ser respeitado
- Hoje em `webhook-receiver` o debounce fixo de ~8s espera o lead terminar de digitar, **e ignora** `agent.response_delay_seconds`.
- Fix: a janela de debounce passa a usar `agent.response_delay_seconds` (com mínimo 1s, máximo 30s). Se configurado 1s → espera 1s e responde. O self-trigger (`EdgeRuntime.waitUntil`) já está em produção, só precisa usar o valor correto.

## 6. Validar fluxo end-to-end
- Após as mudanças, testar: webhook → debounce → ai-agent → send-whatsapp → mensagem aparece no chat em tempo real.
- Logs em cada etapa com `[FLOW]` para facilitar diagnóstico.

## 7. Detalhes técnicos
- Migration: tabela `agent_pause` com RLS + GRANTs.
- Sem novas dependências.
- Preservar lógica existente de multi-instância, mídias, fuso horário.

## Arquivos afetados
- `src/components/dashboard/AutomationHub.tsx` (abas + auto-conectado + pareamento UI)
- novo `src/components/dashboard/automation/WhatsAppConnectedCard.tsx`
- `src/components/dashboard/InboxPage.tsx` (takeover + avatar + dropdown pausa)
- `supabase/functions/webhook-receiver/index.ts` (debounce dinâmico + check pausa + sync avatar)
- `supabase/functions/omniconect/index.ts` (sem mudanças significativas)
- Nova migration: `agent_pause` table

Confirma para eu executar tudo nesta rodada? Ou prefere que eu faça em 2 PRs (1 = UI Conexão + pareamento + auto-conectado; 2 = takeover + avatares + tempo de resposta)?