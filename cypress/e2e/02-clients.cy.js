// TC-E1-07 — Integridade referencial de clientes (RF03.3, RNF05.2)
describe('TC-E1-07 — Integridade referencial de clientes', () => {
  before(() => {
    cy.task('cleanup:clientsByPrefix', { prefix: 'Cliente E2E' });
  });

  beforeEach(() => {
    cy.loginAs('admin');
  });

  it('cliente sem pedidos pode ser excluído', () => {
    cy.apiCreateClient({ name: 'Cliente E2E sem pedido' }).then((client) => {
      cy.apiToken('admin').then((token) =>
        cy
          .request({
            method: 'DELETE',
            url: `${Cypress.env('apiUrl')}/clients/${client.id}`,
            headers: { Authorization: `Bearer ${token}` },
          })
          .then((res) => {
            expect(res.status).to.eq(200);
          }),
      );
    });
  });

  it('cliente com pedido vinculado retorna 409 com mensagem clara', () => {
    cy.apiCreateClient({ name: 'Cliente E2E com pedido' }).then((client) => {
      cy.apiCreateOrder(client.id).then(() => {
        cy.apiToken('admin').then((token) =>
          cy
            .request({
              method: 'DELETE',
              url: `${Cypress.env('apiUrl')}/clients/${client.id}`,
              headers: { Authorization: `Bearer ${token}` },
              failOnStatusCode: false,
            })
            .then((res) => {
              expect(res.status).to.eq(409);
              expect(res.body.message).to.match(/pedidos vinculados/i);
            }),
        );
      });
    });
  });

  it('listagem de clientes na UI exibe cliente recém-criado', () => {
    cy.apiCreateClient({ name: 'Cliente E2E na UI' }).then((client) => {
      cy.visit('/admin/clients');
      cy.contains(client.name).should('be.visible');
      cy.contains(client.code).should('be.visible');
    });
  });

  after(() => {
    cy.task('cleanup:clientsByPrefix', { prefix: 'Cliente E2E' });
  });
});
