// Tasks Node executadas pelo cy.task — usam apenas a API HTTP do backend
// (sem acesso direto a banco), o que mantém os testes alinhados ao
// comportamento real do sistema.
import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';

function request(urlString, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const lib = url.protocol === 'https:' ? https : http;
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: `${url.pathname}${url.search}`,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...headers,
      },
    };
    const req = lib.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let parsed = text;
        try {
          parsed = text ? JSON.parse(text) : null;
        } catch {
          /* deixa como string */
        }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (body !== undefined) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function login(apiUrl, email, password) {
  const { status, body } = await request(`${apiUrl}/auth/login`, {
    method: 'POST',
    body: { email, password },
  });
  if (status !== 200) {
    throw new Error(`Falha no login (${email}): HTTP ${status} ${JSON.stringify(body)}`);
  }
  return body.token;
}

export function registerSeedTasks(on, config) {
  const apiUrl = () =>
    process.env.CYPRESS_API_URL || config.env.apiUrl || 'http://localhost:3000';

  on('task', {
    async 'health:check'() {
      const { status, body } = await request(`${apiUrl()}/health`);
      return { ok: status === 200, status, body };
    },

    async 'seed:loginAdmin'() {
      const email = config.env.adminEmail;
      const password = config.env.adminPassword;
      const token = await login(apiUrl(), email, password);
      return { token, email };
    },

    async 'cleanup:clientsByPrefix'({ prefix }) {
      const token = await login(apiUrl(), config.env.adminEmail, config.env.adminPassword);
      const { body: clients } = await request(`${apiUrl()}/clients`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const list = Array.isArray(clients) ? clients : clients?.rows || clients?.data || [];
      const toDelete = list.filter((c) => (c.name || '').startsWith(prefix) || (c.code || '').startsWith(prefix));
      const results = [];
      for (const c of toDelete) {
        const r = await request(`${apiUrl()}/clients/${c.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        results.push({ id: c.id, status: r.status });
      }
      return { attempted: toDelete.length, results };
    },

    async 'cleanup:ordersByClient'({ clientId }) {
      const token = await login(apiUrl(), config.env.adminEmail, config.env.adminPassword);
      const { body } = await request(`${apiUrl()}/orders?client_id=${clientId}&limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const list = Array.isArray(body) ? body : body?.rows || body?.data || [];
      for (const o of list) {
        await request(`${apiUrl()}/orders/${o.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      return { removed: list.length };
    },
  });
}
