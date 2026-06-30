// TC-E3-01 — Registrar amostra
// TC-E3-03 — Máquina de estados de amostra
// TC-E3-13 — Bloquear pulo de status "aprovada → pedido_gerado" direto
describe('TC-E3-01 / TC-E3-03 / TC-E3-13 — Amostras', () => {
  // Transições válidas do sampleController.
  const validTransitions = {
    enviada: ['recebida_pelo_cliente', 'em_analise', 'rejeitada', 'arquivada'],
    recebida_pelo_cliente: ['em_analise', 'aprovada', 'rejeitada', 'arquivada'],
    em_analise: ['aprovada', 'rejeitada', 'arquivada'],
    aprovada: ['aceite_recebido', 'arquivada'],
    aceite_recebido: ['pedido_gerado', 'arquivada'],
    rejeitada: ['arquivada'],
    pedido_gerado: ['arquivada'],
    arquivada: [],
  };

  let clientId;

  before(() => {
    cy.task('cleanup:clientsByPrefix', { prefix: 'Cliente E2E sample' });
    cy.apiCreateClient({ name: 'Cliente E2E sample' }).then((c) => {
      clientId = c.id;
    });
  });

  beforeEach(() => {
    cy.loginAs('admin');
  });

  it('TC-E3-01: cria amostra com status inicial "enviada"', () => {
    cy.apiCreateSample(clientId, {
      description: 'Couro Acabado Marrom 1.4mm',
      leather_type: 'bovino',
      thickness: '1.4 mm',
      color_finish: 'marrom natural',
      carrier: 'Correios',
    }).then((sample) => {
      cy.apiToken('admin').then((token) =>
        cy
          .request({ url: `${Cypress.env('apiUrl')}/samples/${sample.id}`, headers: { Authorization: `Bearer ${token}` } })
          .its('body')
          .then((full) => {
            expect(full.status).to.eq('enviada');
            expect(full.description).to.eq('Couro Acabado Marrom 1.4mm');
          }),
      );
    });
  });

  it('TC-E3-03: GET /samples/transitions/:status devolve as transições válidas', () => {
    cy.apiToken('admin').then((token) => {
      Object.entries(validTransitions).forEach(([status, expected]) => {
        cy.request({
          url: `${Cypress.env('apiUrl')}/samples/transitions/${status}`,
          headers: { Authorization: `Bearer ${token}` },
        }).then(({ body }) => {
          expect(body.transitions).to.have.members(expected);
        });
      });
    });
  });

  it('TC-E3-13: PATCH /samples/:id/status com aprovada → pedido_gerado é rejeitado (400)', () => {
    cy.apiCreateSample(clientId).then((sample) => {
      cy.apiToken('admin').then((token) => {
        // chega até "aprovada"
        cy.request({
          method: 'PATCH',
          url: `${Cypress.env('apiUrl')}/samples/${sample.id}/status`,
          headers: { Authorization: `Bearer ${token}` },
          body: { status: 'em_analise' },
        });
        cy.request({
          method: 'PATCH',
          url: `${Cypress.env('apiUrl')}/samples/${sample.id}/status`,
          headers: { Authorization: `Bearer ${token}` },
          body: { status: 'aprovada' },
        });

        // pulo direto para pedido_gerado é bloqueado
        cy.request({
          method: 'PATCH',
          url: `${Cypress.env('apiUrl')}/samples/${sample.id}/status`,
          headers: { Authorization: `Bearer ${token}` },
          body: { status: 'pedido_gerado' },
          failOnStatusCode: false,
        }).then((res) => {
          expect(res.status).to.eq(400);
          expect(res.body.message).to.match(/aceite|inválida/i);
        });
      });
    });
  });

  after(() => {
    cy.task('cleanup:clientsByPrefix', { prefix: 'Cliente E2E sample' });
  });
});
