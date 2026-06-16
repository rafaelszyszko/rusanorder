import { API_BASE } from "./apiBase";
const API = `${API_BASE}/clients`;

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export const listClients = async () => {
  const res = await fetch(API, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro ao listar clientes");
  return data;
};

export const getClientById = async (id) => {
  const res = await fetch(`${API}/${id}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro ao buscar cliente");
  return data;
};

export const createClient = async (client) => {
  const res = await fetch(API, { method: "POST", headers: authHeaders(), body: JSON.stringify(client) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro ao criar cliente");
  return data;
};

export const updateClient = async (id, client) => {
  const res = await fetch(`${API}/${id}`, { method: "PUT", headers: authHeaders(), body: JSON.stringify(client) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro ao atualizar cliente");
  return data;
};

export const deleteClient = async (id) => {
  const res = await fetch(`${API}/${id}`, { method: "DELETE", headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro ao excluir cliente");
  return data;
};

export const getClientHistory = async (id) => {
  const res = await fetch(`${API}/${id}/history`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro ao buscar histórico");
  return data;
};
