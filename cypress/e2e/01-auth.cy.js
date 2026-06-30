// TC-E1-01 — Autenticação válida (RF01.1–RF01.7)
// TC-E1-02 — Autenticação inválida (RNF02.6)
describe('TC-E1-01 / TC-E1-02 — Autenticação', () => {
  beforeEach(() => {
    cy.task('health:check').then((r) => expect(r.ok, 'backend acessível').to.eq(true));
  });

  it('TC-E1-01: admin é redirecionado ao dashboard de admin com JWT em localStorage', () => {
    cy.visit('/');
    cy.get('#email').type(Cypress.env('adminEmail'));
    cy.get('#password').type(Cypress.env('adminPassword'));
    cy.contains('button', /entrar/i).click();
    cy.location('pathname').should('match', /^\/admin(\/.*)?$/);
    cy.window().its('localStorage.token').should('be.a', 'string');
    cy.window().its('localStorage.role').should('eq', 'admin');
  });

  it('TC-E1-01: usuário comum é redirecionado ao dashboard de user', () => {
    cy.visit('/');
    cy.get('#email').type(Cypress.env('userEmail'));
    cy.get('#password').type(Cypress.env('userPassword'));
    cy.contains('button', /entrar/i).click();
    cy.location('pathname').should('match', /^\/user(\/.*)?$/);
    cy.window().its('localStorage.role').should('eq', 'user');
  });

  it('TC-E1-02 (a): senha errada → 401 "Credenciais inválidas"', () => {
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/auth/login`,
      body: { email: Cypress.env('adminEmail'), password: 'senha-errada-123' },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(401);
      expect(res.body.message).to.match(/credenciais inválidas/i);
    });
  });

  it('TC-E1-02 (b): email inexistente → 401 mesma mensagem genérica', () => {
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/auth/login`,
      body: { email: `nao-existe-${Date.now()}@example.com`, password: 'qualquer' },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(401);
      expect(res.body.message).to.match(/credenciais inválidas/i);
    });
  });

  it('TC-E1-02 (c): usuário desativado (deleted_at) → 403 e não autentica', () => {
    const email = `tc-e1-02c-${Date.now()}@example.com`;
    const password = 'TempPass123';
    cy.apiToken('admin').then((token) => {
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/users`,
        headers: { Authorization: `Bearer ${token}` },
        body: { name: 'Usuário a desativar', email, password, role: 'user' },
      });
      // createUser não devolve id; buscamos pelo email na listagem
      cy.request({
        url: `${Cypress.env('apiUrl')}/users`,
        headers: { Authorization: `Bearer ${token}` },
      }).then(({ body }) => {
        const list = Array.isArray(body) ? body : body?.rows || body?.data || [];
        const created = list.find((u) => u.email === email);
        expect(created, 'usuário criado encontrado').to.exist;
        cy.request({
          method: 'DELETE',
          url: `${Cypress.env('apiUrl')}/users/${created.id}`,
          headers: { Authorization: `Bearer ${token}` },
        });
        cy.request({
          method: 'POST',
          url: `${Cypress.env('apiUrl')}/auth/login`,
          body: { email, password },
          failOnStatusCode: false,
        }).then((res) => {
          expect(res.status).to.eq(403);
          expect(res.body.message).to.match(/desativad/i);
        });
      });
    });
  });

  it('rota protegida sem token redireciona para /', () => {
    cy.clearLocalStorage();
    cy.visit('/admin');
    cy.location('pathname').should('eq', '/');
  });
});
