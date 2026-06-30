// TC-E1-06 — Soft delete e Lixeira (RF04.9–RF04.11, RNF05.1)
describe('TC-E1-06 — Soft delete e Lixeira', () => {
  let clientId;
  const api = (path, opts) =>
    cy.apiToken('admin').then((token) =>
      cy.request({
        ...opts,
        url: `${Cypress.env('apiUrl')}${path}`,
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: opts?.failOnStatusCode ?? true,
      }),
    );

  before(() => {
    cy.task('cleanup:clientsByPrefix', { prefix: 'Cliente E2E trash' });
    cy.apiCreateClient({ name: 'Cliente E2E trash' }).then((c) => {
      clientId = c.id;
    });
  });

  beforeEach(() => {
    cy.loginAs('admin');
  });

  it('excluir pedido faz soft delete e aparece na lixeira', () => {
    cy.apiCreateOrder(clientId).then((order) => {
      api(`/orders/${order.id}`, { method: 'DELETE' });

      // não aparece na listagem normal
      api(`/orders?client_id=${clientId}`).then(({ body }) => {
        const list = Array.isArray(body) ? body : body?.rows || body?.data || [];
        expect(list.some((o) => o.id === order.id)).to.eq(false);
      });

      // aparece na lixeira
      api(`/orders/trash/list`).then(({ body }) => {
        const list = Array.isArray(body) ? body : body?.rows || body?.data || [];
        expect(list.some((o) => o.id === order.id), 'pedido presente na lixeira').to.eq(true);
      });
    });
  });

  it('restaurar pedido da lixeira limpa deleted_at', () => {
    cy.apiCreateOrder(clientId).then((order) => {
      api(`/orders/${order.id}`, { method: 'DELETE' });
      api(`/orders/${order.id}/restore`, { method: 'PATCH' });

      api(`/orders?client_id=${clientId}`).then(({ body }) => {
        const list = Array.isArray(body) ? body : body?.rows || body?.data || [];
        expect(list.some((o) => o.id === order.id), 'pedido voltou para listagem').to.eq(true);
      });
    });
  });

  it('excluir permanentemente remove em definitivo (404 ao buscar)', () => {
    cy.apiCreateOrder(clientId).then((order) => {
      api(`/orders/${order.id}`, { method: 'DELETE' });
      api(`/orders/${order.id}/permanent`, { method: 'DELETE' });
      api(`/orders/${order.id}`, { failOnStatusCode: false }).then((res) => {
        expect(res.status).to.eq(404);
      });
    });
  });

  after(() => {
    if (clientId) {
      cy.task('cleanup:ordersByClient', { clientId });
      cy.task('cleanup:clientsByPrefix', { prefix: 'Cliente E2E trash' });
    }
  });
});
