import { useState, useEffect, useRef } from "react";
import { API_BASE } from "../services/apiBase";

const POLL_MS = 30000;
const TIMEOUT_MS = 8000;

function classify(latencyMs, ok) {
  if (!ok) return { color: "#dc3545", label: "offline" };          // vermelho
  if (latencyMs > 2000) return { color: "#ffc107", label: "lento" }; // amarelo
  return { color: "#198754", label: "online" };                     // verde
}

export default function ApiStatus() {
  const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;
  const [state, setState] = useState({ ok: null, latency: null });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (role !== "admin") return;

    const ping = async () => {
      const started = performance.now();
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      try {
        const res = await fetch(`${API_BASE}/health`, { signal: ctrl.signal, cache: "no-store" });
        const latency = Math.round(performance.now() - started);
        if (mountedRef.current) setState({ ok: res.ok, latency });
      } catch {
        if (mountedRef.current) setState({ ok: false, latency: null });
      } finally {
        clearTimeout(timer);
      }
    };

    ping();
    const id = setInterval(ping, POLL_MS);
    return () => clearInterval(id);
  }, [role]);

  if (role !== "admin") return null;

  const { ok, latency } = state;
  if (ok === null) return (
    <span className="api-status text-secondary">
      <span className="api-dot" style={{ background: "#6c757d" }} />
      API <span className="opacity-75">verificando…</span>
    </span>
  );

  const { color, label } = classify(latency, ok);
  return (
    <span
      className="api-status"
      title={`Backend: ${API_BASE} · ${label}${latency != null ? ` · ${latency} ms` : ""}`}
    >
      <span className="api-dot" style={{ background: color }} />
      <span>API <span className="opacity-75">{label}{latency != null ? ` · ${latency} ms` : ""}</span></span>
    </span>
  );
}
