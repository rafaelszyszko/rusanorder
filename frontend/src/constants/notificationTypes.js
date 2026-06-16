export const notificationTypeLabels = {
  new_order: "Novo pedido",
  status_change: "Status alterado",
  comment_received: "Comentário recebido",
  production_delay: "Atraso de produção",
  sample_return: "Retorno de amostra",
  sample_no_return: "Amostra sem retorno",
  sample_acceptance: "Aceite registrado",
};

export const notificationTypeIcons = {
  new_order: "bi-clipboard-plus",
  status_change: "bi-arrow-repeat",
  comment_received: "bi-chat-left-text",
  production_delay: "bi-exclamation-triangle",
  sample_return: "bi-box-seam",
  sample_no_return: "bi-hourglass-split",
  sample_acceptance: "bi-check2-circle",
};

export const notificationTypeColors = {
  new_order: "#0d6efd",
  status_change: "#0dcaf0",
  comment_received: "#6f42c1",
  production_delay: "#ffc107",
  sample_return: "#198754",
  sample_no_return: "#fd7e14",
  sample_acceptance: "#20c997",
};

export function resourcePath(notification, basePath) {
  if (notification.resource_type === "order") return `${basePath}/orders/${notification.resource_id}`;
  if (notification.resource_type === "sample") return `${basePath}/samples/${notification.resource_id}`;
  return basePath;
}

export function timeAgo(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  const seg = Math.floor(ms / 1000);
  if (seg < 60) return `há ${seg}s`;
  const min = Math.floor(seg / 60);
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `há ${d}d`;
  const m = Math.floor(d / 30);
  return `há ${m} m.`;
}
