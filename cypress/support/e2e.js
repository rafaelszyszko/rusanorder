import './commands.js';

Cypress.on('uncaught:exception', (err) => {
  if (/ResizeObserver loop limit exceeded/.test(err.message)) return false;
  return true;
});
