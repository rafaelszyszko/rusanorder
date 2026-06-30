# Testes E2E — RusanOrder (Cypress)

Cobertura dos cenários do **Plano de Testes** do documento de especificação do MVPII (seções 11.2, 11.3 e 11.4) que se aplicam ao código atualmente em produção (branch `main`).

## Como rodar

### Pré-requisitos

- Backend rodando (`backend/`) — por padrão `http://localhost:3000`
- Frontend rodando (`frontend/`) — por padrão `http://localhost:5173`
- Banco populado com `database/init.sql` (já cria os usuários `admin@rusan.com` e `user@rusan.com`, ambos com senha `admin123`)

### Configuração

```bash
cp cypress.env.example.json cypress.env.json   # ajuste se necessário
npm install
```

`cypress.env.json` é ignorado pelo git e contém:

```json
{
  "apiUrl": "http://localhost:3000",
  "adminEmail": "admin@rusan.com",
  "adminPassword": "admin123",
  "userEmail": "user@rusan.com",
  "userPassword": "admin123"
}
```

### Rodar contra ambiente local

```bash
npm run cy:open:local   # interativo
npm run cy:run:local    # headless
```

### Rodar contra produção (Vercel + backend hospedado)

```bash
CYPRESS_BASE_URL=https://<seu-vercel>.vercel.app \
CYPRESS_API_URL=https://<sua-api>.example.com \
npm run cy:run
```

Variáveis aceitas:

- `CYPRESS_BASE_URL` — URL do frontend (default `http://localhost:5173`)
- `CYPRESS_API_URL` — URL da API (default `http://localhost:3000`)
- Credenciais podem ser sobrescritas via `CYPRESS_adminEmail`, `CYPRESS_adminPassword`, etc.

## Cobertura por TC

| Arquivo | TCs cobertos |
|---|---|
| `01-auth.cy.js` | TC-E1-01, TC-E1-02 (a/b/c) |
| `02-clients.cy.js` | TC-E1-07 |
| `03-orders-create.cy.js` | TC-E1-03, TC-E1-04 |
| `04-orders-state-machine.cy.js` | TC-E1-05 |
| `05-orders-trash.cy.js` | TC-E1-06 |
| `06-orders-list.cy.js` | TC-E1-10 (subset) |
| `07-samples.cy.js` | TC-E3-01, TC-E3-03, TC-E3-13 |
| `08-samples-to-order.cy.js` | TC-E3-04, TC-E3-14 |
| `09-notifications.cy.js` | TC-E3-07, TC-E3-08 (subset) |

### Limitações conhecidas

- **TC-E2-* (IA / Importação):** não cobertos automaticamente — exigem mock da API do Gemini ou PDFs de exemplo fixos. Sugerido cobrir com Supertest+mock no backend.
- **TC-E1-08 (gráficos Chart.js):** verificação visual completa requer testes de regressão visual (Percy/Cypress Screenshot). O smoke aqui valida apenas a presença do componente.
- **TC-E3-10 (geração de notificações por evento):** requer setup com múltiplos usuários e jobs assíncronos; sugerido cobrir em integração de backend.

## Convenção

- Todos os clientes criados pelos testes usam o prefixo `Cliente E2E …` no `name` para permitir limpeza automatizada pelo `cy.task('cleanup:clientsByPrefix', { prefix })`.
- Os specs preferem chamar a API diretamente (`cy.request` + `cy.apiToken`) e usam UI apenas onde o teste valida UI (login, listagem, detalhe).
