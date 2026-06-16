export const sampleStatusLabels = {
  enviada: "Enviada",
  recebida_pelo_cliente: "Recebida pelo cliente",
  em_analise: "Em análise",
  aprovada: "Aprovada",
  aceite_recebido: "Aceite recebido",
  rejeitada: "Rejeitada",
  pedido_gerado: "Pedido gerado",
  arquivada: "Arquivada",
};

export const sampleStatusColors = {
  enviada: "primary",
  recebida_pelo_cliente: "info",
  em_analise: "warning",
  aprovada: "success",
  aceite_recebido: "success",
  rejeitada: "danger",
  pedido_gerado: "info",
  arquivada: "secondary",
};

export const allSampleStatuses = Object.keys(sampleStatusLabels);

export const validSampleTransitions = {
  enviada:               ['recebida_pelo_cliente', 'em_analise', 'rejeitada', 'arquivada'],
  recebida_pelo_cliente: ['em_analise', 'aprovada', 'rejeitada', 'arquivada'],
  em_analise:            ['aprovada', 'rejeitada', 'arquivada'],
  aprovada:              ['aceite_recebido', 'arquivada'],
  aceite_recebido:       ['pedido_gerado', 'arquivada'],
  rejeitada:             ['arquivada'],
  pedido_gerado:         ['arquivada'],
  arquivada:             [],
};

export const leatherTypeLabels = {
  bovino: "Bovino",
  ovino: "Ovino",
  caprino: "Caprino",
  suino: "Suíno",
  outros: "Outros",
};
