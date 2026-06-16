import { API_BASE } from "./apiBase";
const API = `${API_BASE}/users`;

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export const listUsers = async () => {
  const response = await fetch(API, { headers: authHeaders() });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Erro ao listar usuários");
  return data;
};

export const listDeletedUsers = async () => {
  const response = await fetch(`${API}/inactive`, { headers: authHeaders() });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Erro ao listar usuários inativos");
  return data;
};

export const getUserById = async (id) => {
  const response = await fetch(`${API}/${id}`, { headers: authHeaders() });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Erro ao buscar usuário");
  return data;
};

export const getUserOrders = async (id) => {
  const response = await fetch(`${API}/${id}/orders`, { headers: authHeaders() });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Erro ao buscar pedidos do usuário");
  return data;
};

export const createUser = async (user) => {
  const response = await fetch(API, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(user),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Erro ao criar usuário");
  return data;
};

export const updateUser = async (id, user) => {
  const response = await fetch(`${API}/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(user),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Erro ao atualizar usuário");
  return data;
};

export const deleteUser = async (id) => {
  const response = await fetch(`${API}/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Erro ao desativar usuário");
  return data;
};

export const restoreUser = async (id) => {
  const response = await fetch(`${API}/${id}/restore`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Erro ao restaurar usuário");
  return data;
};
