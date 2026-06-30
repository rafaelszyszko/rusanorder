// TC-E1-03 — BDD: Criar pedido com itens válidos
// TC-E1-04 — BDD: Bloquear criação sem itens
describe('TC-E1-03 / TC-E1-04 — Criação de pedido', () => {
  let clientId;

  before(() => {
    cy.task('cleanup:clientsByPrefix', { prefix: 'Cliente E2E create' });
    cy.apiCreateClient({ name: 'Cliente E2E create pedido', code: `E2EC${Date.now().toString().slice(-6)}` }).then((c) => {
      clientId = c.id;
    });
  });

  beforeEach(() => {
    cy.loginAs('admin');
  });

  it('TC-E1-03: pedido com 3 itens é criado com status "novo" e total calculado no backend', () => {
    cy.apiToken('admin').then((token) =>
      cy
        .request({
          method: 'POST',
          url: `${Cypress.env('apiUrl')}/orders`,
          headers: { Authorization: `Bearer ${token}` },
          body: {
            client_id: clientId,
            purchase_order: `OC-${Date.now()}`,
            items: [
              { description: 'Couro Acabado Preto 1.2mm', unit: 'm²', quantity: 150, unit_price: 45.0 },
              { description: 'Couro Natural', unit: 'm²', quantity: 80, unit_price: 62.5 },
              { description: 'Forro Sintético', unit: 'm²', quantity: 200, unit_price: 12.0 },
            ],
          },
        })
        .then(({ body }) => {
          const orderId = body.id || body.orderId;
          expect(orderId).to.exist;
          cy.request({
            url: `${Cypress.env('apiUrl')}/orders/${orderId}`,
            headers: { Authorization: `Bearer ${token}` },
          }).then(({ body: full }) => {
            expect(full.status).to.eq('novo');
            // total esperado: 150*45 + 80*62.50 + 200*12 = 6.750 + 5.000 + 2.400 = 14.150,00
            expect(Number(full.total)).to.eq(14150);

            // RF04.5: comentário automático status_change é criado
            const comments = full.comments || full.activity || [];
            expect(comments.some((c) => c.type === 'status_change')).to.eq(true);
          });
        }),
    );
  });

  it('TC-E1-04: criar pedido sem itens é rejeitado pelo backend (400)', () => {
    cy.apiToken('admin').then((token) =>
      cy
        .request({
          method: 'POST',
          url: `${Cypress.env('apiUrl')}/orders`,
          headers: { Authorization: `Bearer ${token}` },
          body: { client_id: clientId, items: [] },
          failOnStatusCode: false,
        })
        .then((res) => {
          expect(res.status).to.eq(400);
          expect(res.body.message).to.match(/item/i);
        }),
    );
  });

  it('TC-E1-04: criar pedido sem cliente é rejeitado (400)', () => {
    cy.apiToken('admin').then((token) =>
      cy
        .request({
          method: 'POST',
          url: `${Cypress.env('apiUrl')}/orders`,
          headers: { Authorization: `Bearer ${token}` },
          body: { items: [{ description: 'X', unit: 'm²', quantity: 1, unit_price: 1 }] },
          failOnStatusCode: false,
        })
        .then((res) => {
          expect(res.status).to.eq(400);
          expect(res.body.message).to.match(/cliente/i);
        }),
    );
  });

  after(() => {
    if (clientId) {
      cy.task('cleanup:ordersByClient', { clientId });
      cy.task('cleanup:clientsByPrefix', { prefix: 'Cliente E2E create' });
    }
  });
});
