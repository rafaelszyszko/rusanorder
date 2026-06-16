import { API_BASE } from "./apiBase";
const API = `${API_BASE}/samples`;

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const authHeadersNoCT = () => ({
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

export const listSamples = async (filters = {}) => {
  const res = await fetch(`${API}${buildQs(filters)}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro ao listar amostras");
  return data;
};

export const getSampleById = async (id) => {
  const res = await fetch(`${API}/${id}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro ao buscar amostra");
  return data;
};

export const createSample = async (payload) => {
  const res = await fetch(API, { method: "POST", headers: authHeaders(), body: JSON.stringify(payload) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro ao criar amostra");
  return data;
};

export const updateSampleStatus = async (id, status, comment = "", returnedAt = null) => {
  const body = { status, comment };
  if (returnedAt) body.returned_at = returnedAt;
  const res = await fetch(`${API}/${id}/status`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro ao atualizar status");
  return data;
};

export const confirmAcceptance = async (id, acceptanceAt, acceptanceNotes = "") => {
  const res = await fetch(`${API}/${id}/confirm-acceptance`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ acceptance_at: acceptanceAt, acceptance_notes: acceptanceNotes }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro ao registrar aceite");
  return data;
};

export const getSamplePrefill = async (id) => {
  const res = await fetch(`${API}/${id}/prefill`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro ao buscar prefill");
  return data;
};

export const addSampleComment = async (id, content) => {
  const res = await fetch(`${API}/${id}/comments`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ content }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro ao adicionar comentário");
  return data;
};

export const deleteSampleComment = async (sampleId, commentId) => {
  const res = await fetch(`${API}/${sampleId}/comments/${commentId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro ao excluir comentário");
  return data;
};

export const uploadSamplePhoto = async (id, file) => {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API}/${id}/photos`, {
    method: "POST",
    headers: authHeadersNoCT(),
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro ao enviar foto");
  return data;
};

export const getPhotoUrl = (photoId) => {
  // Servimos via fetch para honrar o token
  return `${API}/photos/${photoId}`;
};

export const getPhotoBlobUrl = async (photoId) => {
  const res = await fetch(`${API}/photos/${photoId}`, { headers: authHeadersNoCT() });
  if (!res.ok) throw new Error("Erro ao carregar foto");
  const blob = await res.blob();
  return URL.createObjectURL(blob);
};

export const deleteSamplePhoto = async (photoId) => {
  const res = await fetch(`${API}/photos/${photoId}`, { method: "DELETE", headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro ao excluir foto");
  return data;
};
