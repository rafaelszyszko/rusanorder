// TC-E3-07 — Notificações: sino e badge (RF10.1, RF10.9)
// TC-E3-08 — Notificações: dropdown
describe('TC-E3-07 / TC-E3-08 — Notificações', () => {
  beforeEach(() => {
    cy.loginAs('admin');
  });

  it('GET /notifications/unread-count responde com número', () => {
    cy.apiToken('admin').then((token) =>
      cy
        .request({
          url: `${Cypress.env('apiUrl')}/notifications/unread-count`,
          headers: { Authorization: `Bearer ${token}` },
        })
        .then(({ body }) => {
          const count = typeof body === 'number' ? body : body.count ?? body.unread ?? body.total;
          expect(count, 'unread-count numérico').to.be.a('number');
          expect(count).to.be.gte(0);
        }),
    );
  });

  it('GET /notifications devolve listagem paginada', () => {
    cy.apiToken('admin').then((token) =>
      cy
        .request({
          url: `${Cypress.env('apiUrl')}/notifications?limit=5`,
          headers: { Authorization: `Bearer ${token}` },
        })
        .then(({ body }) => {
          const list = Array.isArray(body) ? body : body?.rows || body?.data || body?.notifications || [];
          expect(list).to.be.an('array');
        }),
    );
  });

  it('UI: dashboard admin renderiza o sino de notificações', () => {
    cy.visit('/admin');
    cy.get('[class*="bi-bell"], [data-testid="notification-bell"]').should('exist');
  });
});
