const apiUrl = () => Cypress.env('apiUrl');

const credentials = (role) => {
  if (role === 'admin') {
    return {
      email: Cypress.env('adminEmail'),
      password: Cypress.env('adminPassword'),
    };
  }
  return {
    email: Cypress.env('userEmail'),
    password: Cypress.env('userPassword'),
  };
};

Cypress.Commands.add('apiLogin', (role = 'admin') => {
  const { email, password } = credentials(role);
  return cy
    .request('POST', `${apiUrl()}/auth/login`, { email, password })
    .then(({ body }) => body);
});

Cypress.Commands.add('loginAs', (role = 'admin') => {
  cy.session(
    [`role:${role}`, Cypress.env('apiUrl')],
    () => {
      cy.apiLogin(role).then(({ token, role: r, name, userId }) => {
        window.localStorage.setItem('token', token);
        window.localStorage.setItem('role', r);
        window.localStorage.setItem('name', name);
        window.localStorage.setItem('userId', String(userId));
      });
    },
    { cacheAcrossSpecs: true },
  );
});

Cypress.Commands.add('apiToken', (role = 'admin') => {
  return cy.apiLogin(role).its('token');
});

Cypress.Commands.add('apiCreateClient', (overrides = {}) => {
  const ts = Date.now();
  const payload = {
    name: `Cliente E2E ${ts}`,
    code: `E2E${ts.toString().slice(-6)}`,
    cnpj: '',
    phone: '',
    emails: [`e2e+${ts}@example.com`],
    address: '',
    city: 'Porto Alegre',
    state: 'RS',
    ...overrides,
  };
  return cy.apiToken('admin').then((token) =>
    cy
      .request({
        method: 'POST',
        url: `${apiUrl()}/clients`,
        headers: { Authorization: `Bearer ${token}` },
        body: payload,
      })
      .then(({ body }) => ({ ...payload, ...body })),
  );
});

Cypress.Commands.add('apiCreateOrder', (clientId, overrides = {}) => {
  const ts = Date.now();
  const payload = {
    client_id: clientId,
    purchase_order: `OC-${ts}`,
    notes: 'Pedido criado por teste E2E',
    items: [
      {
        description: 'Couro bovino acabado preto 1.2 mm',
        unit: 'm²',
        quantity: 30,
        unit_price: 50,
      },
    ],
    ...overrides,
  };
  return cy.apiToken('admin').then((token) =>
    cy
      .request({
        method: 'POST',
        url: `${apiUrl()}/orders`,
        headers: { Authorization: `Bearer ${token}` },
        body: payload,
      })
      .then(({ body }) => body),
  );
});

Cypress.Commands.add('apiUpdateOrderStatus', (orderId, status, extra = {}) => {
  return cy.apiToken('admin').then((token) =>
    cy.request({
      method: 'PATCH',
      url: `${apiUrl()}/orders/${orderId}/status`,
      headers: { Authorization: `Bearer ${token}` },
      body: { status, ...extra },
    }),
  );
});

Cypress.Commands.add('apiCreateSample', (clientId, overrides = {}) => {
  const ts = Date.now();
  const payload = {
    client_id: clientId,
    description: 'Couro bovino acabado',
    leather_type: 'bovino',
    thickness_mm: 1.2,
    color: 'preto',
    finish: 'natural',
    carrier: 'Transportadora E2E',
    tracking_code: `TRK-${ts}`,
    sent_at: new Date().toISOString().slice(0, 10),
    notes: 'Amostra criada por teste E2E',
    ...overrides,
  };
  return cy.apiToken('admin').then((token) =>
    cy
      .request({
        method: 'POST',
        url: `${apiUrl()}/samples`,
        headers: { Authorization: `Bearer ${token}` },
        body: payload,
      })
      .then(({ body }) => body),
  );
});
