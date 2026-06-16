import { API_BASE } from "./apiBase";
const API = `${API_BASE}/imports`;

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const authHeadersMultipart = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export const createSession = async () => {
  const res = await fetch(`${API}/sessions`, { method: "POST", headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro ao criar sessão");
  return data;
};

export const uploadPdf = async (sessionId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API}/sessions/${sessionId}/files`, {
    method: "POST",
    headers: authHeadersMultipart(),
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro ao processar PDF");
  return data;
};

export const getImport = async (id) => {
  const res = await fetch(`${API}/${id}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro ao buscar importação");
  return data;
};

export const getPdfUrl = (id) =>
  `${API}/${id}/file?token=${encodeURIComponent(localStorage.getItem("token") || "")}`;

// Returns a Blob URL for iframe preview (auth header can't be added to iframe src)
export const getPdfBlobUrl = async (id) => {
  const res = await fetch(`${API}/${id}/file`, { headers: authHeadersMultipart() });
  if (!res.ok) throw new Error("Erro ao baixar PDF");
  const blob = await res.blob();
  return URL.createObjectURL(blob);
};

export const confirmImport = async (id, payload) => {
  const res = await fetch(`${API}/${id}/confirm`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro ao confirmar importação");
  return data;
};

export const skipImport = async (id) => {
  const res = await fetch(`${API}/${id}/skip`, { method: "PATCH", headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro ao pular importação");
  return data;
};

export const reprocessImport = async (id) => {
  const res = await fetch(`${API}/${id}/reprocess`, { method: "POST", headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro ao reprocessar");
  return data;
};

export const listImports = async ({ status, date_from, date_to, search } = {}) => {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (date_from) params.set("date_from", date_from);
  if (date_to) params.set("date_to", date_to);
  if (search) params.set("search", search);
  const qs = params.toString();
  const res = await fetch(`${API}${qs ? `?${qs}` : ""}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro ao listar importações");
  return data;
};

export const getImportByOrder = async (orderId) => {
  const res = await fetch(`${API}/order/${orderId}`, { headers: authHeaders() });
  if (res.status === 404) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro ao buscar documento original");
  return data;
};
