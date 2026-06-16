import { API_BASE } from "./apiBase";
const API = `${API_BASE}/orders`;

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export const listOrders = async () => {
  const res = await fetch(API, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro ao listar pedidos");
  return data;
};

export const getOrderById = async (id) => {
  const res = await fetch(`${API}/${id}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro ao buscar pedido");
  return data;
};

export const createOrder = async (order) => {
  const res = await fetch(API, { method: "POST", headers: authHeaders(), body: JSON.stringify(order) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro ao criar pedido");
  return data;
};

export const updateOrderStatus = async (id, status, comment = "") => {
  const res = await fetch(`${API}/${id}/status`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ status, comment }) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro ao atualizar status");
  return data;
};

export const addComment = async (id, content) => {
  const res = await fetch(`${API}/${id}/comments`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ content }) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro ao adicionar comentário");
  return data;
};

export const deleteComment = async (orderId, commentId) => {
  const res = await fetch(`${API}/${orderId}/comments/${commentId}`, { method: "DELETE", headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro ao excluir comentário");
  return data;
};

export const getValidTransitions = async (status) => {
  const res = await fetch(`${API}/transitions/${status}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro ao buscar transições");
  return data;
};

export const deleteOrder = async (id) => {
  const res = await fetch(`${API}/${id}`, { method: "DELETE", headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro ao excluir pedido");
  return data;
};

export const listDeletedOrders = async () => {
  const res = await fetch(`${API}/trash/list`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro ao listar lixeira");
  return data;
};

export const restoreOrder = async (id) => {
  const res = await fetch(`${API}/${id}/restore`, { method: "PATCH", headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro ao restaurar pedido");
  return data;
};

export const permanentDeleteOrder = async (id) => {
  const res = await fetch(`${API}/${id}/permanent`, { method: "DELETE", headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro ao excluir permanentemente");
  return data;
};
