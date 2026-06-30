// TC-E3-04 — BDD: Gerar pedido a partir de amostra aprovada
// TC-E3-14 — Link bidirecional amostra ↔ pedido (RF9.13)
describe('TC-E3-04 / TC-E3-14 — Amostra → Pedido', () => {
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
    cy.task('cleanup:clientsByPrefix', { prefix: 'Cliente E2E sample2order' });
    cy.apiCreateClient({ name: 'Cliente E2E sample2order' }).then((c) => {
      clientId = c.id;
    });
  });

  beforeEach(() => {
    cy.loginAs('admin');
  });

  const advanceToAceite = (sampleId) => {
    api(`/samples/${sampleId}/status`, { method: 'PATCH', body: { status: 'em_analise' } });
    api(`/samples/${sampleId}/status`, { method: 'PATCH', body: { status: 'aprovada' } });
    api(`/samples/${sampleId}/confirm-acceptance`, {
      method: 'POST',
      body: {
        acceptance_date: new Date().toISOString().slice(0, 10),
        acceptance_notes: 'Aceite via E2E',
      },
    });
  };

  it('TC-E3-04: amostra aceite_recebido gera pedido e transita para pedido_gerado', () => {
    cy.apiCreateSample(clientId, { description: 'Couro Natural Bege' }).then((sample) => {
      advanceToAceite(sample.id);

      // confirma estado aceite_recebido
      api(`/samples/${sample.id}`)
        .its('body')
        .should((s) => expect(s.status).to.eq('aceite_recebido'));

      api(`/orders`, {
        method: 'POST',
        body: {
          client_id: clientId,
          sample_id: sample.id,
          notes: 'Pedido gerado a partir da amostra',
          items: [{ description: 'Couro Natural Bege', unit: 'm²', quantity: 100, unit_price: 55.0 }],
        },
      }).then(({ body }) => {
        const orderId = body.id || body.orderId;
        expect(orderId).to.exist;

        // TC-E3-14: link bidirecional
        api(`/samples/${sample.id}`)
          .its('body')
          .should((s) => {
            expect(s.status).to.eq('pedido_gerado');
            expect(Number(s.order_id)).to.eq(Number(orderId));
          });

        api(`/orders/${orderId}`)
          .its('body')
          .should((o) => {
            expect(Number(o.sample_id)).to.eq(Number(sample.id));
          });
      });
    });
  });

  it('amostra fora de aceite_recebido não pode gerar pedido', () => {
    cy.apiCreateSample(clientId).then((sample) => {
      api(`/orders`, {
        method: 'POST',
        body: {
          client_id: clientId,
          sample_id: sample.id,
          items: [{ description: 'X', unit: 'm²', quantity: 1, unit_price: 1 }],
        },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(400);
        expect(res.body.message).to.match(/aceite_recebido/i);
      });
    });
  });

  after(() => {
    cy.task('cleanup:clientsByPrefix', { prefix: 'Cliente E2E sample2order' });
  });
});
