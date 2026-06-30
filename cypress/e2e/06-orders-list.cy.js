// TC-E1-10 — Listagem de pedidos (subset)
// listOrders() em produção devolve TODOS os pedidos sem aceitar filtros via
// querystring; a verificação por cliente/status é feita no array recebido.
describe('TC-E1-10 — Listagem de pedidos', () => {
  let clientA, clientB;

  before(() => {
    cy.task('cleanup:clientsByPrefix', { prefix: 'Cliente E2E list' });
    cy.apiCreateClient({ name: 'Cliente E2E list A' }).then((c) => {
      clientA = c;
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

  const getAll = () =>
    cy.apiToken('admin').then((token) =>
      cy
        .request({ url: `${Cypress.env('apiUrl')}/orders`, headers: { Authorization: `Bearer ${token}` } })
        .then(({ body }) => (Array.isArray(body) ? body : body?.rows || body?.data || [])),
    );

  it('listagem contém pedidos do cliente A criados no setup', () => {
    getAll().then((all) => {
      const ofA = all.filter((o) => o.client_id === clientA.id);
      expect(ofA.length, 'pedidos do cliente A').to.be.gte(2);
    });
  });

  it('listagem contém ao menos 1 pedido cancelado do cliente A', () => {
    getAll().then((all) => {
      const cancelled = all.filter((o) => o.client_id === clientA.id && o.status === 'cancelado');
      expect(cancelled.length, 'cancelado do cliente A').to.be.gte(1);
    });
  });

  it('UI: tela de pedidos renderiza o ID do pedido (formato {CODE}-{N})', () => {
    cy.apiCreateOrder(clientA.id).then((order) => {
      cy.visit('/admin/orders');
      cy.contains(new RegExp(`${clientA.code}-${order.id}`)).should('be.visible');
    });
  });

  after(() => {
    if (clientA) cy.task('cleanup:ordersByClient', { clientId: clientA.id });
    if (clientB) cy.task('cleanup:ordersByClient', { clientId: clientB.id });
    cy.task('cleanup:clientsByPrefix', { prefix: 'Cliente E2E list' });
  });
});
