// TC-E1-10 — Listagem de pedidos: filtros e paginação (RF04.13)
describe('TC-E1-10 — Listagem de pedidos: filtros', () => {
  let clientA, clientB;

  before(() => {
    cy.task('cleanup:clientsByPrefix', { prefix: 'Cliente E2E list' });
    cy.apiCreateClient({ name: 'Cliente E2E list A' }).then((c) => {
      clientA = c;
      // pedidos do cliente A em status variados
      cy.apiCreateOrder(c.id);
      cy.apiCreateOrder(c.id).then((o) => cy.apiUpdateOrderStatus(o.id, 'cancelado'));
    });
    cy.apiCreateClient({ name: 'Cliente E2E list B' }).then((c) => {
      clientB = c;
      cy.apiCreateOrder(c.id);
    });
  });

  beforeEach(() => {
    cy.loginAs('admin');
  });

  it('filtra pedidos por cliente', () => {
    cy.apiToken('admin').then((token) =>
      cy
        .request({
          url: `${Cypress.env('apiUrl')}/orders?client_id=${clientA.id}`,
          headers: { Authorization: `Bearer ${token}` },
        })
        .then(({ body }) => {
          const list = Array.isArray(body) ? body : body?.rows || body?.data || [];
          expect(list.length, 'pedidos do cliente A').to.be.gte(2);
          expect(list.every((o) => o.client_id === clientA.id || o.client?.id === clientA.id)).to.eq(true);
        }),
    );
  });

  it('filtra pedidos por status', () => {
    cy.apiToken('admin').then((token) =>
      cy
        .request({
          url: `${Cypress.env('apiUrl')}/orders?status=cancelado&client_id=${clientA.id}`,
          headers: { Authorization: `Bearer ${token}` },
        })
        .then(({ body }) => {
          const list = Array.isArray(body) ? body : body?.rows || body?.data || [];
          expect(list.length, 'ao menos 1 pedido cancelado do cliente A').to.be.gte(1);
          expect(list.every((o) => o.status === 'cancelado')).to.eq(true);
        }),
    );
  });

  it('UI: tela de pedidos renderiza pedido criado', () => {
    cy.visit('/admin/orders');
    cy.contains(clientA.name).should('be.visible');
  });

  after(() => {
    if (clientA) {
      cy.task('cleanup:ordersByClient', { clientId: clientA.id });
    }
    if (clientB) {
      cy.task('cleanup:ordersByClient', { clientId: clientB.id });
    }
    cy.task('cleanup:clientsByPrefix', { prefix: 'Cliente E2E list' });
  });
});
