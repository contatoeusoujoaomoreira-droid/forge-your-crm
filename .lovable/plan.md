## Limpeza, Renovação e Atualização do Sistema

Operação ampla em 3 frentes. Confirme antes que eu execute (vai mexer em ~30 arquivos, deletar tabelas e edge functions).

---

### 1) Eliminar COMPLETAMENTE o módulo Pages

**Banco de dados (migration drop):**
- `landing_pages`
- `landing_page_sections`
- `page_views`
- Função `generate-landing-page` removida (edge function)

**Manter:** `custom_domains` (ainda usado por outros módulos para roteamento) — mas removendo `project_type='page'` opcionalmente; vou manter a tabela intacta por enquanto.

**Código removido:**
- `src/pages/PageEditor.tsx`, `src/pages/LandingPagePublic.tsx`
- `src/components/dashboard/LandingPagesList.tsx`, `PageAnalytics.tsx`, `PageHTMLEditor.tsx`, `AIPageGenerator.tsx`, `AIEditorChat.tsx`, `GrapesEditor.tsx`, `GrapesEditorPro.tsx`, `GrapesEditorUltra.tsx`, `BlocksLibrary.tsx`, `TemplatesModal.tsx`, `TemplatesLibraryHTML.tsx`
- `src/components/page-builder/` (pasta inteira)
- `src/stores/useEditorStore.ts`, `src/grapes-theme.css`
- `public/templates/*.html`
- `supabase/functions/generate-landing-page/`

**Atualizações:**
- `src/App.tsx`: remover rotas `/editor/:id`, `/p/:slug` e a rota raiz que serve landing principal (volta para `Index`).
- `src/pages/Dashboard.tsx`: remover aba "Pages" e qualquer trigger.
- Remover `grapesjs` e dependências relacionadas do `package.json` (faço via `bun remove`).

---

### 2) Remover provedores WhatsApp obsoletos

**Provedores eliminados** (UI + edge functions + dados): `evolution`, `evolution_go`, `botconversa`, `ultramsg`, `custom`.

- Edge function `evolution-go` deletada.
- Limpeza em `send-whatsapp/index.ts`, `test-whatsapp/index.ts`, `webhook-receiver/index.ts`.
- UI `AutomationHub.tsx`: lista de provedores reduzida.
- Migration: `DELETE FROM whatsapp_configs WHERE api_type IN ('evolution','evolution_go','botconversa','ultramsg','custom')`.

**Mantidos:** `z-api`, `umclique`, `wasender`, e o novo `omniconect`.

---

### 3) Nova integração OmniConect (UAZAPI)

Padrão da UAZAPI (`https://free.uazapi.com` ou self-hosted):
- **Admin token**: necessário só para `/instance/create` e `/instance/all` (configurado por usuário).
- **Instance token**: gerado no create, salvo em `api_token`. Header: `token: <instance_token>`.
- **Endpoints usados:**
  - `POST /instance/init` → QR/paircode (start connect)
  - `GET /instance/status` → estado
  - `POST /instance/disconnect`, `DELETE /instance/`
  - `POST /send/text` `{number, text}`
  - `POST /send/media` `{number, type: image|video|audio|document, file, text, docName}`
  - `POST /webhook` `{url, events:[messages,connection], excludeMessages:[reaction,...]}`

**Mudanças:**
- Nova edge function `omniconect/index.ts`: actions `create`, `qr`, `status`, `set_webhook`, `disconnect`, `delete`.
- `send-whatsapp`: novo case `omniconect` (texto + mídia + áudio).
- `test-whatsapp`: novo case `omniconect` chamando `/instance/status`.
- `webhook-receiver`: normalizador para payloads UAZAPI (`event: messages`, `data.message`, `data.from`, `data.text`, `data.media`).
- `AutomationHub.tsx`: opção "OmniConect · WhatsApp Não Oficial" com modal de QR + polling igual ao Wasender. Campos: Base URL (default `https://free.uazapi.com`), Admin Token, Instance Name.

---

### Plano de execução

1. Migration: drop tabelas Pages + delete provedores obsoletos do `whatsapp_configs`.
2. Deletar edge functions: `generate-landing-page`, `evolution-go`.
3. Criar edge function `omniconect`.
4. Reescrever `send-whatsapp`, `test-whatsapp`, `webhook-receiver` removendo legados + adicionando omniconect.
5. Reescrever `AutomationHub.tsx`: lista enxuta de provedores + fluxo OmniConect.
6. Apagar arquivos do módulo Pages.
7. Atualizar `App.tsx`, `Dashboard.tsx`.
8. `bun remove grapesjs grapesjs-blocks-basic` (e correlatos se houver).

Confirma para eu seguir?