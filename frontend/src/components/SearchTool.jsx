import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { globalSearch } from "../services/reportService";
import { useBasePath } from "../hooks/useBasePath";
import { statusLabels, statusColors } from "../constants/orderStatus";
import { sampleStatusLabels, sampleStatusColors } from "../constants/sampleStatus";
import { formatOrderId } from "../utils/formatOrderId";

const MIN_CHARS = 2;
const TOP_N = 4;

export default function SearchTool() {
  const navigate = useNavigate();
  const basePath = useBasePath();
  const isAdmin = localStorage.getItem("role") === "admin";

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => { if (inputRef.current) inputRef.current.focus(); }, 50);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_CHARS) { setResult(null); setError(""); return; }
    setLoading(true);
    setError("");
    const t = setTimeout(async () => {
      try { setResult(await globalSearch(q)); }
      catch (e) { setError(e.message); setResult(null); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const handleSelect = (path) => {
    setOpen(false);
    setQuery("");
    navigate(path);
  };

  const handleGoToFull = () => {
    setOpen(false);
    const q = query.trim();
    navigate(q ? `${basePath}/search?q=${encodeURIComponent(q)}` : `${basePath}/search`);
  };

  const total = result
    ? (result.clients?.length || 0) + (result.orders?.length || 0) + (result.samples?.length || 0) + (result.users?.length || 0)
    : 0;

  return (
    <div className="position-relative" ref={ref}>
      <button
        className="theme-toggle-btn"
        onClick={() => setOpen((v) => !v)}
        title="Pesquisar"
      >
        <i className="bi bi-search"></i>
      </button>

      {open && (
        <div className="dropdown-card shadow-lg"
          style={{ position: "absolute", right: 0, top: "110%", width: 460, zIndex: 1050 }}>
          <div className="p-3" style={{ borderBottom: "1px solid var(--border)" }}>
            <div className="position-relative">
              <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-secondary"></i>
              <input
                ref={inputRef}
                type="text"
                className="form-control bg-dark text-light border-secondary"
                style={{ paddingLeft: 36 }}
                placeholder="Pesquisar em clientes, pedidos, amostras..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {loading && (
                <span className="position-absolute top-50 end-0 translate-middle-y me-3 spinner-border spinner-border-sm text-secondary"
                  style={{ width: "0.85rem", height: "0.85rem" }} />
              )}
              {!loading && query && (
                <button type="button" className="btn btn-link btn-sm text-secondary position-absolute top-50 end-0 translate-middle-y p-0 me-3"
                  style={{ textDecoration: "none" }} onClick={() => setQuery("")}>✕</button>
              )}
            </div>
          </div>

          <div style={{ maxHeight: 420, overflowY: "auto" }}>
            {error && <div className="alert alert-danger py-2 small m-3 mb-0">{error}</div>}

            {!result && query.trim().length < MIN_CHARS && (
              <div className="p-4 text-center text-secondary small">
                <i className="bi bi-search fs-2 d-block mb-2"></i>
                Digite ao menos {MIN_CHARS} caracteres para pesquisar.
              </div>
            )}

            {result && total === 0 && (
              <div className="p-4 text-center text-secondary small">
                Nenhum resultado para "{result.q}"
              </div>
            )}

            {result && result.clients?.length > 0 && (
              <SearchSection title="Clientes" icon="bi-people-fill" color="text-info" count={result.clients.length}>
                {result.clients.slice(0, TOP_N).map((c) => (
                  <button key={c.id} className="search-result"
                    onClick={() => handleSelect(`${basePath}/clients/${c.id}/history`)}>
                    <div className="search-result-main">
                      <span className="text-light">{c.name}</span>
                      <span className="badge bg-secondary ms-2">{c.code}</span>
                    </div>
                    <div className="text-secondary small">
                      {[c.cnpj, c.city && c.state ? `${c.city}/${c.state}` : null].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </button>
                ))}
              </SearchSection>
            )}

            {result && result.orders?.length > 0 && (
              <SearchSection title="Pedidos" icon="bi-clipboard-data-fill" color="text-warning" count={result.orders.length}>
                {result.orders.slice(0, TOP_N).map((o) => (
                  <button key={o.id} className="search-result"
                    onClick={() => handleSelect(`${basePath}/orders/${o.id}`)}>
                    <div className="search-result-main">
                      <span className="text-light">{formatOrderId(o.client_code, o.id)}</span>
                      <span className={`badge bg-${statusColors[o.status]} ms-2`}>{statusLabels[o.status]}</span>
                    </div>
                    <div className="text-secondary small">
                      {o.client_name} · R$ {parseFloat(o.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                  </button>
                ))}
              </SearchSection>
            )}

            {result && result.samples?.length > 0 && (
              <SearchSection title="Amostras" icon="bi-box-seam" color="text-success" count={result.samples.length}>
                {result.samples.slice(0, TOP_N).map((s) => (
                  <button key={s.id} className="search-result"
                    onClick={() => handleSelect(`${basePath}/samples/${s.id}`)}>
                    <div className="search-result-main">
                      <span className="text-light">{s.code}</span>
                      <span className={`badge bg-${sampleStatusColors[s.status]} ms-2`}>{sampleStatusLabels[s.status]}</span>
                    </div>
                    <div className="text-secondary small text-truncate">
                      {s.client_name} · {s.description}
                    </div>
                  </button>
                ))}
              </SearchSection>
            )}

            {isAdmin && result && result.users?.length > 0 && (
              <SearchSection title="Usuários" icon="bi-person-gear" color="text-primary" count={result.users.length}>
                {result.users.slice(0, TOP_N).map((u) => (
                  <button key={u.id} className="search-result"
                    onClick={() => handleSelect(`${basePath}/users/${u.id}/edit`)}>
                    <div className="search-result-main">
                      <span className="text-light">{u.name}{u.deleted_at && <span className="text-secondary"> (inativo)</span>}</span>
                      <span className="badge bg-secondary ms-2">{u.role}</span>
                    </div>
                    <div className="text-secondary small">{u.email}</div>
                  </button>
                ))}
              </SearchSection>
            )}
          </div>

          <div className="p-2 text-center" style={{ borderTop: "1px solid var(--border)" }}>
            <button className="btn btn-link btn-sm w-100" style={{ textDecoration: "none" }} onClick={handleGoToFull}>
              {result && total > 0 ? "Ver todos os resultados →" : "Abrir busca avançada →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SearchSection({ title, icon, color, count, children }) {
  return (
    <div className="px-2 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="d-flex align-items-center gap-2 px-2 mb-1">
        <i className={`bi ${icon} ${color}`}></i>
        <strong className="small" style={{ color: "var(--text-h)" }}>{title}</strong>
        <span className="badge bg-secondary ms-auto" style={{ fontSize: "0.65rem" }}>{count}</span>
      </div>
      {children}
    </div>
  );
}
