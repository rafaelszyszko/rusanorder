import { API_BASE } from "./apiBase";
const API = `${API_BASE}/users`;

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export const getProfile = async () => {
  const response = await fetch(`${API}/profile`, {
    headers: authHeaders(),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Erro ao buscar perfil");
  return data;
};

export const updateProfile = async ({ name, email, password }) => {
  const body = { name, email };
  if (password) body.password = password;

  const response = await fetch(`${API}/profile`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Erro ao atualizar perfil");
  return data;
};
