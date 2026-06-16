import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import LoadingSpinner from "../components/LoadingSpinner";
import { useBasePath } from "../hooks/useBasePath";
import { listImports, reprocessImport } from "../services/importService";
import { formatOrderId } from "../utils/formatOrderId";

const STATUS_BADGE = {
  em_processamento: { label: "Processando", className: "bg-info text-dark" },
  aguardando_revisao: { label: "Aguardando revisão", className: "bg-warning text-dark" },
  concluida: { label: "Concluída", className: "bg-success" },
  erro: { label: "Erro", className: "bg-danger" },
  cancelada: { label: "Cancelada", className: "bg-secondary" },
};

function formatDateTime(s) {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function ImportHistory() {
  const navigate = useNavigate();
  const basePath = useBasePath();

  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ status: "", search: "", date_from: "", date_to: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reprocessing, setReprocessing] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listImports({
        status: filters.status || undefined,
        search: filters.search || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
      });
      setItems(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.search, filters.date_from, filters.date_to]);

  const handleReprocess = async (id) => {
    setReprocessing(id);
    try {
      const result = await reprocessImport(id);
      navigate(`${basePath}/imports/${result.id}/review`);
    } catch (e) {
      setError(e.message);
      setReprocessing(null);
    }
  };

  const counts = items.reduce(
    (acc, it) => {
      acc.total++;
      acc[it.status] = (acc[it.status] || 0) + 1;
      return acc;
    },
    { total: 0 }
  );

  return (
    <DashboardLayout>
      <div className="container-fluid px-4 py-4 flex-grow-1">
        <div className="module-header">
          <h3 className="module-title">Histórico de Importações</h3>
          <p className="module-subtitle">
            {counts.total} {counts.total === 1 ? "importação" : "importações"} ·
            {" "}<span className="text-success">{counts.concluida || 0} concluída(s)</span> ·
            {" "}<span className="text-warning">{counts.aguardando_revisao || 0} aguardando</span> ·
            {" "}<span className="text-danger">{counts.erro || 0} com erro</span>
          </p>
        </div>

        <div className="d-flex justify-content-end mb-3">
          <button className="btn btn-primary btn-sm" onClick={() => navigate(`${basePath}/imports/new`)}>
            <i className="bi bi-cloud-arrow-up me-1"></i>
            Nova Importação
          </button>
        </div>

        {error && <div className="alert alert-danger py-2 small">{error}</div>}

        <div className="row g-2 mb-3">
          <div className="col-md-3">
            <select
              className="form-select form-select-sm bg-dark text-light border-secondary"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">Todos os status</option>
              {Object.entries(STATUS_BADGE).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <input
              type="date"
              className="form-control form-control-sm bg-dark text-light border-secondary"
              value={filters.date_from}
              onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
            />
          </div>
          <div className="col-md-3">
            <input
              type="date"
              className="form-control form-control-sm bg-dark text-light border-secondary"
              value={filters.date_to}
              onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
            />
          </div>
          <div className="col-md-3">
            <input
              type="search"
              className="form-control form-control-sm bg-dark text-light border-secondary"
              placeholder="Buscar por nome do arquivo…"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-dark table-hover align-middle mb-0">
            <thead>
              <tr className="text-secondary small">
                <th>Data/Hora</th>
                <th>Arquivo</th>
                <th>Usuário</th>
                <th>Status</th>
                <th>Confiança</th>
                <th>Pedido</th>
                <th className="text-end">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7}><LoadingSpinner label="Carregando importações..." /></td></tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-secondary py-4">
                    Você ainda não importou nenhum PDF. Clique em "Nova Importação" para começar.
                  </td>
                </tr>
              )}
              {!loading && items.map((it) => {
                const badge = STATUS_BADGE[it.status] || STATUS_BADGE.erro;
                return (
                  <tr key={it.id}>
                    <td className="small">{formatDateTime(it.created_at)}</td>
                    <td>
                      <i className="bi bi-file-earmark-pdf text-danger me-2"></i>
                      <span className="text-truncate d-inline-block align-middle" style={{ maxWidth: 260 }} title={it.filename}>
                        {it.filename}
                      </span>
                    </td>
                    <td className="small">{it.user_name}</td>
                    <td><span className={`badge ${badge.className}`}>{badge.label}</span></td>
                    <td className="small">
                      {it.confidence_score !== null ? `${Math.round(Number(it.confidence_score) * 100)}%` : "—"}
                    </td>
                    <td>
                      {it.linked_order_id ? (
                        <a
                          href={`${basePath}/orders/${it.linked_order_id}`}
                          className="text-decoration-none"
                          style={{ color: "var(--accent)" }}
                        >
                          {formatOrderId(it.linked_client_code, it.linked_order_id)} <i className="bi bi-arrow-right"></i>
                        </a>
                      ) : (
                        <span className="text-secondary small">—</span>
                      )}
                    </td>
                    <td className="text-end text-nowrap">
                      {it.status === "aguardando_revisao" && (
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => navigate(`${basePath}/imports/${it.id}/review`)}
                        >
                          Revisar
                        </button>
                      )}
                      {it.status === "erro" && (
                        <button
                          className="btn btn-sm btn-outline-warning"
                          onClick={() => handleReprocess(it.id)}
                          disabled={reprocessing === it.id}
                        >
                          {reprocessing === it.id ? "Reprocessando…" : "Reprocessar"}
                        </button>
                      )}
                      {it.status === "erro" && it.error_message && (
                        <i className="bi bi-exclamation-circle text-danger ms-2" title={it.error_message}></i>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
