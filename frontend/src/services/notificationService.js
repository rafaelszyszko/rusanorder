import { API_BASE } from "./apiBase";
const API = `${API_BASE}/notifications`;

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const buildQs = (params) => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params || {})) {
    if (v !== "" && v !== null && v !== undefined) qs.set(k, v);
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
};

export const listNotifications = async (filters = {}) => {
  const res = await fetch(`${API}${buildQs(filters)}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro ao listar notificações");
  return data;
};

export const getUnreadCount = async () => {
  const token = localStorage.getItem("token");
  if (!token) return { count: 0 };
  const res = await fetch(`${API}/unread-count`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro");
  return data;
};

export const markAsRead = async (id) => {
  const res = await fetch(`${API}/${id}/read`, { method: "PATCH", headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro");
  return data;
};

export const markAsUnread = async (id) => {
  const res = await fetch(`${API}/${id}/unread`, { method: "PATCH", headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro");
  return data;
};

export const markAllAsRead = async () => {
  const res = await fetch(`${API}/mark-all-read`, { method: "PATCH", headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro");
  return data;
};

export const archiveNotification = async (id) => {
  const res = await fetch(`${API}/${id}/archive`, { method: "PATCH", headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro");
  return data;
};

export const archiveBulk = async (ids) => {
  const res = await fetch(`${API}/archive-bulk`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ ids }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro");
  return data;
};

export const getPreferences = async () => {
  const res = await fetch(`${API}/preferences`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro");
  return data;
};

export const updatePreference = async (eventType, enabled) => {
  const res = await fetch(`${API}/preferences`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ event_type: eventType, enabled }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro");
  return data;
};

export const resetPreferences = async () => {
  const res = await fetch(`${API}/preferences/reset`, { method: "POST", headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro");
  return data;
};
