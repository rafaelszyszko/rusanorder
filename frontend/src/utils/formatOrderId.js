export function formatOrderId(clientCode, orderId) {
  if (clientCode) return `${clientCode}-${orderId}`;
  return `#${orderId}`;
}
