export const statusLabels = {
  novo: "Novo",
  aguardando_pcp: "Aguardando PCP",
  aguardando_cliente: "Aguardando Cliente",
  ajuste_necessario: "Ajuste Necessario",
  recusado_pcp: "Recusado (PCP)",
  aprovado: "Aprovado",
  em_producao: "Em Producao",
  atraso_producao: "Atraso Producao",
  enviado: "Enviado",
  entregue: "Entregue",
  entregue_divergencia: "Entregue c/ Divergencia",
  cancelado: "Cancelado",
};

export const statusColors = {
  novo: "secondary",
  aguardando_pcp: "info",
  aguardando_cliente: "warning",
  ajuste_necessario: "warning",
  recusado_pcp: "danger",
  aprovado: "primary",
  em_producao: "info",
  atraso_producao: "warning",
  enviado: "primary",
  entregue: "success",
  entregue_divergencia: "warning",
  cancelado: "danger",
};

export const allStatuses = Object.keys(statusLabels);

export const validTransitions = {
  novo:                  ['aguardando_pcp', 'ajuste_necessario', 'cancelado'],
  aguardando_pcp:        ['aguardando_cliente', 'recusado_pcp'],
  aguardando_cliente:    ['aprovado', 'aguardando_pcp', 'cancelado'],
  ajuste_necessario:     ['novo', 'cancelado'],
  recusado_pcp:          ['novo'],
  aprovado:              ['em_producao', 'cancelado'],
  em_producao:           ['enviado', 'atraso_producao', 'cancelado'],
  atraso_producao:       ['aguardando_cliente', 'cancelado'],
  enviado:               ['entregue', 'entregue_divergencia'],
  entregue:              ['novo'],
  entregue_divergencia:  ['novo'],
  cancelado:             ['novo'],
};
