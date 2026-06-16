import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import LoadingSpinner from "../components/LoadingSpinner";
import { useBasePath } from "../hooks/useBasePath";
import { listSamples } from "../services/sampleService";
import { listClients } from "../services/clientService";
import {
  sampleStatusLabels,
  sampleStatusColors,
  allSampleStatuses,
} from "../constants/sampleStatus";

const SORTABLE_COLUMNS = {
  code: { label: "#", getValue: (s) => s.id },
  client_name: { label: "Cliente", getValue: (s) => (s.client_name || "").toLowerCase() },
  description: { label: "Descrição", getValue: (s) => (s.description || "").toLowerCase() },
  status: { label: "Status", getValue: (s) => s.status },
  sent_at: { label: "Envio", getValue: (s) => new Date(s.sent_at).getTime() },
  days_since_sent: { label: "Dias", getValue: (s) => Number(s.days_since_sent || 0) },
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function SortHeader({ column, sortKey, sortDir, onSort, className = "" }) {
  const active = sortKey === column;
  const arrow = active ? (sortDir === "asc" ? " ▲" : " ▼") : "";
  return (
    <th
      role="button"
      className={`user-select-none ${className}`}
      style={{ cursor: "pointer", whiteSpace: "nowrap" }}
      onClick={() => onSort(column)}
    >
      {SORTABLE_COLUMNS[column].label}
      <span style={{ fontSize: "0.65rem", opacity: active ? 1 : 0.3 }}>
        {active ? arrow : " ▼"}
      </span>
    </th>
  );
}

export default function SampleList() {
  const navigate = useNavigate();
  const basePath = useBasePath();

  const [samples, setSamples] = useState([]);
  const [clients, setClients] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const [sortKey, setSortKey] = useState("sent_at");
  const [sortDir, setSortDir] = useState("desc");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const load = () => {
    setLoading(true);
    listSamples()
      .then(setSamples)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { listClients().then(setClients).catch(() => {}); }, []);

  const handleSort = (column) => {
    if (sortKey === column) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(column);
      setSortDir(column === "sent_at" || column === "days_since_sent" || column === "code" ? "desc" : "asc");
    }
  };

  const sortedFiltered = useMemo(() => {
    let list = [...samples];

    if (filterStatus) list = list.filter((s) => s.status === filterStatus);
    if (filterClient) list = list.filter((s) => String(s.client_id) === String(filterClient));

    if (filterSearch.trim()) {
      const q = filterSearch.toLowerCase().trim();
      list = list.filter((s) =>
        (s.code || "").toLowerCase().includes(q) ||
        (s.description || "").toLowerCase().includes(q) ||
        (s.tracking_code || "").toLowerCase().includes(q) ||
        (s.client_name || "").toLowerCase().includes(q)
      );
    }
    if (filterDateFrom) {
      const from = new Date(filterDateFrom + "T00:00:00").getTime();
      list = list.filter((s) => new Date(s.sent_at).getTime() >= from);
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo + "T23:59:59").getTime();
      list = list.filter((s) => new Date(s.sent_at).getTime() <= to);
    }

    const { getValue } = SORTABLE_COLUMNS[sortKey];
    list.sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [samples, filterStatus, filterClient, filterSearch, filterDateFrom, filterDateTo, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedFiltered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = sortedFiltered.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => { setPage(1); }, [filterStatus, filterClient, filterSearch, filterDateFrom, filterDateTo, pageSize]);

  const hasActiveFilters = filterStatus || filterClient || filterSearch || filterDateFrom || filterDateTo;
  const clearFilters = () => {
    setFilterStatus("");
    setFilterClient("");
    setFilterSearch("");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  return (
    <DashboardLayout>
      <div className="container-fluid px-4 py-4 flex-grow-1">
        <div className="module-header">
          <h3 className="module-title">Módulo de Amostras</h3>
          <p className="module-subtitle">Gerenciamento de amostras de couro enviadas a clientes</p>
        </div>

        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex align-items-center gap-2">
            <label className="text-secondary small mb-0">Exibir</label>
            <select
              className="form-select form-select-sm bg-dark text-light border-secondary"
              style={{ width: "75px" }}
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <label className="text-secondary small mb-0">por página</label>
          </div>
          <div className="d-flex gap-2">
            <button className="btn btn-primary btn-sm" onClick={() => navigate(`${basePath}/samples/new`)}>
              + Nova amostra
            </button>
          </div>
        </div>

        {error && <div className="alert alert-danger py-2 small">{error}</div>}

        {/* Filtros */}
        <div className="card bg-dark border-secondary mb-3">
          <div className="card-body py-2 px-3">
            <div className="row g-2 align-items-end">
              <div className="col-12 col-md-3">
                <label className="form-label text-secondary small mb-1">Buscar</label>
                <input
                  type="text"
                  className="form-control form-control-sm bg-dark text-light border-secondary"
                  placeholder="Código, descrição, cliente, rastreio..."
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                />
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label text-secondary small mb-1">Status</label>
                <select
                  className="form-select form-select-sm bg-dark text-light border-secondary"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="">Todos</option>
                  {allSampleStatuses.map((s) => (
                    <option key={s} value={s}>{sampleStatusLabels[s]}</option>
                  ))}
                </select>
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label text-secondary small mb-1">Cliente</label>
                <select
                  className="form-select form-select-sm bg-dark text-light border-secondary"
                  value={filterClient}
                  onChange={(e) => setFilterClient(e.target.value)}
                >
                  <option value="">Todos</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label text-secondary small mb-1">De</label>
                <input
                  type="date"
                  className="form-control form-control-sm bg-dark text-light border-secondary"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                />
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label text-secondary small mb-1">Até</label>
                <input
                  type="date"
                  className="form-control form-control-sm bg-dark text-light border-secondary"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                />
              </div>
              <div className="col-12 col-md-1 d-flex align-items-end">
                {hasActiveFilters && (
                  <button className="btn btn-outline-secondary btn-sm w-100" onClick={clearFilters}>Limpar</button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Contagem */}
        <div className="d-flex justify-content-between align-items-center mb-2">
          <span className="text-secondary small">
            {sortedFiltered.length} amostra{sortedFiltered.length !== 1 ? "s" : ""} encontrada{sortedFiltered.length !== 1 ? "s" : ""}
            {sortedFiltered.length > pageSize && ` — mostrando ${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, sortedFiltered.length)}`}
          </span>
        </div>

        <div className="table-responsive">
          <table className="table table-dark table-hover align-middle mb-0">
            <thead>
              <tr className="text-secondary small">
                <SortHeader column="code" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortHeader column="client_name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortHeader column="description" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortHeader column="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortHeader column="sent_at" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortHeader column="days_since_sent" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan="6"><LoadingSpinner label="Carregando amostras..." /></td></tr>
              )}
              {!loading && paginated.length === 0 && (
                <tr><td colSpan="6" className="text-center text-secondary py-4">Nenhuma amostra encontrada</td></tr>
              )}
              {!loading && paginated.map((s) => {
                const days = Number(s.days_since_sent || 0);
                const isOpen = ["enviada", "recebida_pelo_cliente", "em_analise"].includes(s.status);
                const dayClass = isOpen && days > 15 ? "text-danger" : isOpen && days > 7 ? "text-warning" : "text-light";
                const dt = new Date(s.sent_at);
                return (
                  <tr
                    key={s.id}
                    role="button"
                    style={{ cursor: "pointer" }}
                    onClick={() => navigate(`${basePath}/samples/${s.id}`)}
                  >
                    <td>
                      <div>{s.code}</div>
                      {s.photos_count > 0 && (
                        <div className="text-secondary" style={{ fontSize: "0.7rem" }}>
                          <i className="bi bi-image me-1"></i>{s.photos_count} foto{s.photos_count > 1 ? "s" : ""}
                        </div>
                      )}
                    </td>
                    <td>{s.client_name}</td>
                    <td style={{ maxWidth: 360 }}>
                      <div className="text-truncate">{s.description}</div>
                    </td>
                    <td>
                      <span className={`badge bg-${sampleStatusColors[s.status]}`}>
                        {sampleStatusLabels[s.status]}
                      </span>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <div className="text-white">{dt.toLocaleDateString("pt-BR")}</div>
                    </td>
                    <td className={dayClass} style={{ whiteSpace: "nowrap" }}>
                      {isOpen ? `${days}d` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="d-flex justify-content-between align-items-center mt-3">
            <span className="text-secondary small">
              Página {safePage} de {totalPages}
            </span>
            <div className="d-flex gap-1">
              <button className="btn btn-outline-secondary btn-sm" disabled={safePage <= 1} onClick={() => setPage(1)}>&laquo;</button>
              <button className="btn btn-outline-secondary btn-sm" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>&lsaquo;</button>
              {(() => {
                const pages = [];
                let start = Math.max(1, safePage - 2);
                let end = Math.min(totalPages, safePage + 2);
                if (end - start < 4) {
                  if (start === 1) end = Math.min(totalPages, start + 4);
                  else start = Math.max(1, end - 4);
                }
                for (let i = start; i <= end; i++) {
                  pages.push(
                    <button
                      key={i}
                      className={`btn btn-sm ${i === safePage ? "btn-primary" : "btn-outline-secondary"}`}
                      onClick={() => setPage(i)}
                    >
                      {i}
                    </button>
                  );
                }
                return pages;
              })()}
              <button className="btn btn-outline-secondary btn-sm" disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>&rsaquo;</button>
              <button className="btn btn-outline-secondary btn-sm" disabled={safePage >= totalPages} onClick={() => setPage(totalPages)}>&raquo;</button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
