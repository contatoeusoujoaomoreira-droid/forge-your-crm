# PLANO FUTURO DE EXPORTAÇÃO PARA VPS

> Status: documento estratégico. Nada aqui foi executado.
> Pré-requisito: a camada `src/services/*` (criada na Fase 3) já isola toda a
> lógica de Automação, WhatsApp, Agentes e CRM-events da UI. A migração
> consiste em **substituir o transporte** (`supabase.functions.invoke`) por
> chamadas HTTP a um worker Node rodando na VPS, sem alterar a UI.

---

## 1. Por que sair (parcialmente) das edge functions

As edge functions Deno do Supabase são ótimas para:
- requisições HTTP curtas (<10s),
- baixo volume,
- chamadas síncronas vindas do navegador.

Elas **não** são ideais para:
- workers persistentes (consumo contínuo de fila),
- jobs longos (>30s) — transcrição de áudio, scraping, follow-ups encadeados,
- alto volume de webhooks WhatsApp simultâneos,
- conexões WebSocket persistentes com provedores (Z-API/WaSender).

Estes últimos são exatamente os gargalos que estouraram nosso plano atual.

---

## 2. Arquitetura alvo

```text
┌───────────────────────┐        ┌──────────────────────────────────┐
│  Frontend (Lovable)   │ HTTPS  │  VPS Worker (Node 20 + Fastify)  │
│  - React + services/* │ ─────► │  - /send-whatsapp                │
│                       │        │  - /webhook-receiver             │
└───────┬───────────────┘        │  - /ai-agent  /cron              │
        │                        │  - BullMQ + Redis (fila)         │
        │ SDK direto             │  - PM2 ou Docker Compose         │
        ▼                        └────────────┬─────────────────────┘
┌───────────────────────┐                     │ Postgres + SDK
│ Lovable Cloud         │ ◄───────────────────┘
│ - Postgres (RLS)      │
│ - Auth                │
│ - Storage             │
│ - Realtime            │
└───────────────────────┘
```

- Banco, Auth, Storage e Realtime **continuam no Lovable Cloud**. Não migramos.
- Apenas processamento pesado vai para a VPS.
- O frontend nem percebe a diferença — `src/services/whatsappService.ts`
  passa a chamar `https://api.seudominio.com/send-whatsapp` em vez de
  `supabase.functions.invoke`.

---

## 3. Escolha da VPS — comparativo

| Provedor             | Plano sugerido         | vCPU | RAM   | SSD    | Tráfego | €/mês | Quando usar                          |
|----------------------|------------------------|------|-------|--------|---------|-------|--------------------------------------|
| **Hetzner Cloud**    | CX22 (Ashburn/Falken.) | 2    | 4 GB  | 40 GB  | 20 TB   | ~4    | Melhor custo-benefício hoje. Começa aqui. |
| **Hetzner Cloud**    | CX32                   | 4    | 8 GB  | 80 GB  | 20 TB   | ~7    | Quando passar de ~200 msgs/min.      |
| **Contabo**          | VPS S SSD              | 4    | 8 GB  | 200 GB | 32 TB   | ~6    | Mais RAM/disco barato, mas CPU pior. |
| **DigitalOcean**     | Droplet Premium 4GB    | 2    | 4 GB  | 80 GB  | 4 TB    | ~24   | Se já usa DO/marketplace.            |
| **Vultr**            | HF 4GB                 | 2    | 4 GB  | 128 GB | 4 TB    | ~24   | Quando precisa de POP local Brasil.  |
| **AWS Lightsail BR** | 4 GB                   | 2    | 4 GB  | 80 GB  | 4 TB    | ~22   | Compliance/latência Brasil.          |

**Recomendação inicial: Hetzner CX22 (Ashburn, US-East)**. Latência ~120 ms
até São Paulo, preço imbatível, snapshots inclusos. Subir para CX32 só
quando o `htop` mostrar CPU >70% sustentado.

> Observação: a Z-API e a WaSender são APIs HTTP externas — a latência
> entre VPS e elas é o que importa, não entre VPS e cliente final.
> Ashburn é geograficamente próximo aos PoPs dessas APIs.

---

## 4. Estrutura do projeto Node na VPS

```
omni-worker/
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml
├── ecosystem.config.js          # PM2
├── .env
├── src/
│   ├── server.ts                # Fastify HTTP
│   ├── lib/supabase.ts          # createClient(SERVICE_ROLE)
│   ├── queue/index.ts           # BullMQ + Redis
│   ├── workers/
│   │   ├── whatsappWorker.ts    # consome fila "whatsapp:send"
│   │   ├── webhookWorker.ts     # processa webhooks recebidos
│   │   ├── agentWorker.ts       # IA / handoff
│   │   └── followupWorker.ts    # follow-ups agendados
│   └── providers/
│       ├── zapi.ts
│       ├── wasender.ts
│       └── umclique.ts
```

Os arquivos `providers/*.ts` são **portados linha-a-linha** das edge functions
atuais (`send-whatsapp/index.ts`, `webhook-receiver/index.ts`). Como já estão
isolados por `if (provider === "...")`, basta recortar cada bloco para um
módulo.

---

## 5. Passo a passo da migração

### Passo 1 — Provisionar VPS
```bash
# Hetzner Console → New Server → CX22 → Ubuntu 24.04 LTS → SSH key
ssh root@<IP>
apt update && apt upgrade -y
adduser deploy && usermod -aG sudo deploy
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw enable
```

### Passo 2 — Stack base
```bash
# Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git nginx certbot python3-certbot-nginx redis-server
npm i -g pm2

# Docker (alternativa ao PM2)
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin
```

### Passo 3 — Clonar e empacotar o worker
```bash
sudo -iu deploy
git clone git@github.com:seu-usuario/omni-worker.git
cd omni-worker
npm ci
npm run build
```

### Passo 4 — Variáveis de ambiente (`.env`)
```env
# Lovable Cloud (mesmas do projeto atual, mas usar SERVICE_ROLE no servidor)
SUPABASE_URL=https://jdsomjwynxetccrcdszt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # NUNCA expor no frontend
SUPABASE_ANON_KEY=eyJ...

# Redis local
REDIS_URL=redis://127.0.0.1:6379

# WhatsApp providers (rotacionáveis por usuário no DB, estes são só fallback)
WASENDER_DEFAULT_KEY=
ZAPI_DEFAULT_INSTANCE=
ZAPI_DEFAULT_TOKEN=

# Lovable AI Gateway
LOVABLE_API_KEY=

# HTTP
PORT=3000
PUBLIC_BASE_URL=https://api.omnibuildercrm.online
WEBHOOK_SECRET=<gerar com openssl rand -hex 32>
```

### Passo 5a — Subir com PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd            # gera unit file
```
`ecosystem.config.js`:
```js
module.exports = {
  apps: [
    { name: "api",       script: "dist/server.js",            instances: 2, exec_mode: "cluster" },
    { name: "wa-worker", script: "dist/workers/whatsappWorker.js", instances: 2 },
    { name: "agent",     script: "dist/workers/agentWorker.js" },
    { name: "followup",  script: "dist/workers/followupWorker.js" },
  ],
};
```

### Passo 5b — OU subir com Docker Compose
```yaml
# docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    restart: always
    volumes: [redis-data:/data]
  api:
    build: .
    env_file: .env
    ports: ["127.0.0.1:3000:3000"]
    depends_on: [redis]
    restart: always
  wa-worker:
    build: .
    command: node dist/workers/whatsappWorker.js
    env_file: .env
    depends_on: [redis]
    deploy: { replicas: 2 }
    restart: always
volumes:
  redis-data:
```

### Passo 6 — Nginx + SSL
```nginx
server {
  server_name api.omnibuildercrm.online;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_read_timeout 120s;
  }
}
```
```bash
certbot --nginx -d api.omnibuildercrm.online
```

### Passo 7 — Apontar o frontend
No projeto Lovable, criar variável de ambiente pública:
```
VITE_WORKER_BASE_URL=https://api.omnibuildercrm.online
```
Em `src/services/whatsappService.ts`, trocar o `invoke` por um `fetch` ao worker
**apenas para os providers migrados**. Manter fallback para `invoke` para o
que ainda estiver na edge function. Isso permite migração gradual.

### Passo 8 — Apontar webhooks dos provedores
- WaSender → `https://api.omnibuildercrm.online/webhook/wasender`
- Z-API → idem (`/webhook/zapi`)
- umClique → idem (`/webhook/umclique`)

Cada URL inclui `?secret=$WEBHOOK_SECRET` validado no servidor.

### Passo 9 — Substituir o `cron-worker` por BullMQ repeat jobs
```ts
queue.add("scan-followups", {}, { repeat: { every: 60_000 } });
```
Desativar o pg_cron / cron-worker antigo só depois de 48h estável.

### Passo 10 — Cutover seguro
1. Subir VPS em paralelo (shadow mode) por 24h, escutando webhooks de teste.
2. Migrar 1 usuário piloto.
3. Migrar por grupos de 10 usuários.
4. Após 7 dias estável → desligar as edge functions migradas.

---

## 6. Custos estimados (cenário 50 usuários ativos)

| Item                | €/mês |
|---------------------|-------|
| Hetzner CX32        | 7     |
| Backup automático   | 1     |
| Domínio (api.*)     | —     |
| Total               | **~8** |

Comparado a escalar o Lovable Cloud para suportar a mesma carga de jobs
pesados, a economia esperada é de ~70%.

---

## 7. Riscos e mitigação

| Risco                                          | Mitigação                                              |
|------------------------------------------------|--------------------------------------------------------|
| VPS cai → mensagens perdidas                   | BullMQ persiste em Redis com AOF; retry exponencial    |
| SERVICE_ROLE_KEY vaza                          | Nunca commitar; usar `.env` com permissão 600; rotacionar trimestral |
| Latência maior que a edge function             | Manter VPS em Ashburn; usar HTTP/2 keep-alive          |
| Divergência de schema banco vs worker          | CI roda `supabase gen types` semanal contra o worker   |
| Bug regressivo no provider portado             | Migração gradual por usuário + feature flag por user_id|

---

## 8. Checklist de "pronto para migrar"

- [ ] `src/services/*` cobre 100% das chamadas a edge functions de automação (✅ feito na Fase 3)
- [ ] Repo `omni-worker` criado e com testes de integração contra Z-API sandbox
- [ ] VPS provisionada, monitorada (Uptime Kuma) e com backups
- [ ] Domínio `api.omnibuildercrm.online` apontado e com SSL
- [ ] Documento de rollback testado (reapontar webhooks de volta às edge functions)
