import { API_BASE } from "./apiBase";
const API = `${API_BASE}/reports`;

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export const getDashboardStats = async () => {
  const res = await fetch(`${API}/dashboard`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro ao buscar estatísticas");
  return data;
};

export const getAdminDashboardStats = async () => {
  const res = await fetch(`${API}/admin-dashboard`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro ao buscar estatísticas");
  return data;
};

export const globalSearch = async (q, { type, dateFrom, dateTo } = {}) => {
  const params = new URLSearchParams({ q });
  if (type && type !== "all") params.set("type", type);
  if (dateFrom) params.set("date_from", dateFrom);
  if (dateTo) params.set("date_to", dateTo);
  const res = await fetch(`${API}/search?${params.toString()}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro na busca");
  return data;
};
