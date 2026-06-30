// TC-E1-05 — Máquina de estados de pedidos (RF04.3, RF04.4, RF04.5)
describe('TC-E1-05 — Máquina de estados de pedidos', () => {
  // Transições válidas do backend (orderController.js).
  const validTransitions = {
    novo: ['aguardando_pcp', 'ajuste_necessario', 'cancelado'],
    aguardando_pcp: ['aguardando_cliente', 'recusado_pcp'],
    aguardando_cliente: ['aprovado', 'aguardando_pcp', 'cancelado'],
    ajuste_necessario: ['novo', 'cancelado'],
    recusado_pcp: ['novo'],
    aprovado: ['em_producao', 'cancelado'],
    em_producao: ['enviado', 'atraso_producao', 'cancelado'],
    atraso_producao: ['aguardando_cliente', 'cancelado'],
    enviado: ['entregue', 'entregue_divergencia'],
    entregue: ['novo'],
    entregue_divergencia: ['novo'],
    cancelado: ['novo'],
  };

  let clientId;

  before(() => {
    cy.task('cleanup:clientsByPrefix', { prefix: 'Cliente E2E states' });
    cy.apiCreateClient({ name: 'Cliente E2E states' }).then((c) => {
      clientId = c.id;
    });
  });

  beforeEach(() => {
    cy.loginAs('admin');
  });

  it('transição válida (novo → aguardando_pcp) retorna 200 e gera comentário status_change', () => {
    cy.apiCreateOrder(clientId).then((order) => {
      cy.apiUpdateOrderStatus(order.id, 'aguardando_pcp').then((res) => {
        expect(res.status).to.eq(200);
      });
      cy.apiToken('admin').then((token) =>
        cy
          .request({ url: `${Cypress.env('apiUrl')}/orders/${order.id}`, headers: { Authorization: `Bearer ${token}` } })
          .its('body')
          .then((full) => {
            expect(full.status).to.eq('aguardando_pcp');
            const comments = full.comments || full.activity || [];
            const status_changes = comments.filter((c) => c.type === 'status_change');
            expect(status_changes.length, 'pelo menos uma entrada status_change').to.be.greaterThan(0);
          }),
      );
    });
  });

  it('transição inválida (novo → entregue) retorna 400 com mensagem descritiva', () => {
    cy.apiCreateOrder(clientId).then((order) => {
      cy.apiToken('admin').then((token) =>
        cy
          .request({
            method: 'PATCH',
            url: `${Cypress.env('apiUrl')}/orders/${order.id}/status`,
            headers: { Authorization: `Bearer ${token}` },
            body: { status: 'entregue' },
            failOnStatusCode: false,
          })
          .then((res) => {
            expect(res.status).to.eq(400);
            expect(res.body.message).to.match(/transição inválida|inválida/i);
          }),
      );
    });
  });

  it('GET /orders/transitions/:status devolve exatamente as transições válidas', () => {
    cy.apiToken('admin').then((token) => {
      Object.entries(validTransitions).forEach(([status, expected]) => {
        cy.request({
          url: `${Cypress.env('apiUrl')}/orders/transitions/${status}`,
          headers: { Authorization: `Bearer ${token}` },
        }).then(({ body }) => {
          expect(body.transitions).to.have.members(expected);
        });
      });
    });
  });

  it('transição para cancelado é aceita e registra comentário', () => {
    cy.apiCreateOrder(clientId).then((order) => {
      cy.apiUpdateOrderStatus(order.id, 'cancelado', { comment: 'Cancelado por testes E2E' });
      cy.apiToken('admin').then((token) =>
        cy
          .request({ url: `${Cypress.env('apiUrl')}/orders/${order.id}`, headers: { Authorization: `Bearer ${token}` } })
          .its('body')
          .then((full) => {
            expect(full.status).to.eq('cancelado');
            const comments = full.comments || full.activity || [];
            expect(comments.some((c) => /cancelado por testes/i.test(c.content || ''))).to.eq(true);
          }),
      );
    });
  });

  after(() => {
    if (clientId) {
      cy.task('cleanup:ordersByClient', { clientId });
      cy.task('cleanup:clientsByPrefix', { prefix: 'Cliente E2E states' });
    }
  });
});
