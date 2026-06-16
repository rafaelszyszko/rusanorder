// URL base da API. Pode ser sobrescrita em build via VITE_API_URL.
// Em dev local sem env, cai pra http://localhost:3000.
export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";
