# RusanOrder

Sistema de gestão de pedidos para o escritório de representação do **Curtume Rusan** (Novo Hamburgo, RS).

Centraliza pedidos, clientes, amostras de couro, notificações in-app e importação assistida por IA de PDFs de ordens de compra, substituindo o controle disperso por e-mail/WhatsApp/planilha.

---

## Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 19 + Vite 8 · Bootstrap 5 · Chart.js |
| Backend | Node.js 20+ · Express 5 · JWT · bcryptjs · Multer |
| Banco | MySQL 8 (local via Docker · TiDB Serverless em produção) |
| IA | Google Gemini (`@google/genai`) para extração de PDFs |

---

## Funcionalidades

- **Autenticação** com JWT e dois papéis (`admin`, `user`)
- **Pedidos** com máquina de estados de 12 status, comentários, lixeira (soft delete) e fluxograma visual
- **Clientes** com múltiplos e-mails, código único (prefixo do ID do pedido) e histórico
- **Importação por IA** — upload de PDFs de ordens de compra, extração via Gemini Vision e tela de revisão com indicador de confiança por campo
- **Amostras de couro** com máquina de estados de 8 status, fotos (até 5), aceite manual e geração de pedido pré-preenchido
- **Notificações in-app** com sino no header, badge de não lidas, página dedicada e preferências por tipo de evento
- **Busca global** no header — pesquisa em clientes, pedidos, amostras e usuários com filtros de tipo e período

---

## Estrutura do repositório

```
.
├── backend/                 # API Node.js + Express
│   ├── src/
│   │   ├── config/          # conexão MySQL
│   │   ├── controllers/     # handlers das rotas
│   │   ├── middleware/      # auth, upload
│   │   ├── routes/          # endpoints
│   │   ├── services/        # IA, notificações
│   │   └── index.js         # bootstrap do servidor
│   ├── uploads/             # PDFs e fotos (gitignored)
│   └── .env.example
├── frontend/                # SPA React + Vite
│   ├── src/
│   │   ├── components/      # layout, sino, busca, modais
│   │   ├── pages/           # uma página por rota
│   │   ├── services/        # client HTTP por entidade
│   │   ├── constants/       # status, transições
│   │   └── routes/          # roteamento
│   └── .env.example
├── database/
│   ├── init.sql                          # schema + seed completo (dev)
│   ├── production-init.sql               # schema sem seed (produção)
│   └── migrations/                       # migrações incrementais
├── docker-compose.yml       # MySQL local
└── start.sh                 # sobe DB + backend + frontend em iTerm
```

---

## Setup local

Pré-requisitos: **Docker**, **Node.js 20+**, **macOS/Linux** (no Windows funciona via WSL).

```bash
# 1. Clonar e instalar
git clone git@github.com:rafaelszyszko/rusanorder.git
cd rusanorder
(cd backend && npm install)
(cd frontend && npm install)

# 2. Configurar variáveis
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edite backend/.env: gere o JWT_SECRET e cole sua GEMINI_API_KEY

# 3. Subir o MySQL e aplicar o schema
docker compose up -d
docker exec -i rusanorder-database mysql -uroot -proot rusanorder \
  < database/init.sql

# 4. Subir backend e frontend
(cd backend  && npm run dev)   # http://localhost:3000
(cd frontend && npm run dev)   # http://localhost:5173
```

Ou tudo de uma vez (macOS, iTerm):

```bash
./start.sh
```

Credenciais de seed (dev): `admin@rusan.com` / `admin123`.

---

## Variáveis de ambiente

### Backend (`backend/.env`)

| Variável | Descrição | Obrigatória |
|----------|-----------|-------------|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Conexão MySQL | ✅ |
| `DB_SSL` | `true` em providers gerenciados (TiDB, Aiven) | — |
| `JWT_SECRET` | Segredo HS256 (≥32 bytes) | ✅ |
| `JWT_EXPIRES_IN` | Validade do token. Default `1d` | — |
| `CORS_ORIGIN` | URL do frontend (CSV para múltiplas) | ✅ em produção |
| `PORT` | Porta do servidor. Default `3000` | — |
| `GEMINI_API_KEY` | Chave do Google AI Studio | apenas para importação por IA |

### Frontend (`frontend/.env`)

| Variável | Descrição |
|----------|-----------|
| `VITE_API_URL` | URL do backend (sem barra final) |

---

## Deploy (free tier)

Stack alvo: **Vercel** (frontend) + **Render** (backend) + **TiDB Cloud Serverless** (banco).

### 1. TiDB Cloud
1. Criar Serverless Cluster em [tidbcloud.com](https://tidbcloud.com).
2. **Connect → MySQL** — copiar host, user, password (TLS obrigatório).
3. No SQL Editor:
   - Editar `database/production-init.sql` substituindo `REPLACE_ADMIN_*` por seus valores (gere o bcrypt da senha com 10 rounds).
   - Colar e executar.

### 2. Backend no Render
- **New Web Service** → conectar ao repo → root `backend/`
- Build: `npm install` · Start: `npm start`
- Environment variables:
  ```
  DB_HOST=gateway01.<region>.prod.aws.tidbcloud.com
  DB_PORT=4000
  DB_USER=<tidb-user>
  DB_PASSWORD=<tidb-pass>
  DB_NAME=rusanorder
  DB_SSL=true
  JWT_SECRET=<openssl rand -base64 32>
  CORS_ORIGIN=<URL do Vercel, preenche depois do passo 3>
  GEMINI_API_KEY=<sua chave>
  ```

### 3. Frontend no Vercel
- **Import Project** → root `frontend/`
- Environment variable: `VITE_API_URL=https://<seu-backend>.onrender.com`

### 4. Conectar pontas
Atualize `CORS_ORIGIN` no Render com a URL definitiva do Vercel.

---

## Scripts

| Diretório | Script | O que faz |
|-----------|--------|-----------|
| `backend` | `npm run dev` | nodemon em `src/index.js` |
| `backend` | `npm start` | produção, `node src/index.js` |
| `frontend` | `npm run dev` | Vite dev server |
| `frontend` | `npm run build` | build estático em `dist/` |
| `frontend` | `npm run preview` | preview do build |
| `frontend` | `npm run lint` | ESLint |

---

## Limitações conhecidas

- **Filesystem efêmero**: o backend salva PDFs e fotos de amostra em `backend/uploads/`. Em PaaS sem volume persistente (Render free), todo deploy/restart apaga esses arquivos. Migrar para S3/Cloudflare R2 antes de produção real.
- **Cold-start**: serviços free do Render dormem após 15 min sem tráfego. Primeira requisição depois disso demora ~30s. Mitigar com cron ping (ex.: [UptimeRobot](https://uptimerobot.com) free).
- **Rate limit da IA**: o tier free do Gemini tem limites diários — produção real precisa do tier pago ou cache de extrações.

---

## Licença

Projeto acadêmico/comercial sob acordo bilateral. Sem licença open-source pública neste momento.
