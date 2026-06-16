import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { globalSearch } from "../services/reportService";
import DashboardLayout from "../components/DashboardLayout";
import LoadingSpinner from "../components/LoadingSpinner";
import { useBasePath } from "../hooks/useBasePath";

import { statusLabels, statusColors } from "../constants/orderStatus";
import { sampleStatusLabels, sampleStatusColors } from "../constants/sampleStatus";
import { formatOrderId } from "../utils/formatOrderId";

export default function AdminReports() {
  const navigate = useNavigate();
  const basePath = useBasePath();
  const isAdmin = localStorage.getItem("role") === "admin";
  const [searchParams] = useSearchParams();

  // --- Busca global ---
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [filterType, setFilterType] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const hasActiveFilters = filterType !== "all" || filterDateFrom || filterDateTo;
  const clearFilters = () => {
    setFilterType("all");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setSearchResult(null); setSearchError(""); return; }
    setSearching(true);
    setSearchError("");
    const t = setTimeout(async () => {
      try {
        const data = await globalSearch(q, {
          type: filterType,
          dateFrom: filterDateFrom || undefined,
          dateTo: filterDateTo || undefined,
        });
        setSearchResult(data);
      } catch (e) {
        setSearchError(e.message);
        setSearchResult(null);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query, filterType, filterDateFrom, filterDateTo]);

  const totalResults = searchResult
    ? (searchResult.clients?.length || 0) +
      (searchResult.orders?.length || 0) +
      (searchResult.samples?.length || 0) +
      (searchResult.users?.length || 0)
    : 0;

  return (
    <DashboardLayout>
      <div className="container-fluid px-4 py-4 flex-grow-1">
        <div className="module-header">
          <h3 className="module-title">Busca avançada</h3>
          <p className="module-subtitle">Pesquise em clientes, pedidos, amostras{isAdmin ? " e usuários" : ""} com filtros</p>
        </div>

        {/* Filtros */}
        <div className="card bg-dark border-secondary mb-3">
          <div className="card-body py-2 px-3">
            <div className="row g-2 align-items-end">
              <div className="col-12 col-md-4">
                <label className="form-label text-secondary small mb-1">Buscar</label>
                <div className="position-relative">
                  <input
                    type="text"
                    className="form-control form-control-sm bg-dark text-light border-secondary"
                    placeholder="Ao menos 2 caracteres..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                  />
                  {searching && (
                    <span className="position-absolute top-50 end-0 translate-middle-y me-2 spinner-border spinner-border-sm text-secondary" style={{ width: "0.85rem", height: "0.85rem" }} />
                  )}
                  {query && !searching && (
                    <button
                      type="button"
                      className="btn btn-sm btn-link position-absolute top-50 end-0 translate-middle-y text-secondary p-0 me-2"
                      style={{ textDecoration: "none", fontSize: "0.85rem" }}
                      onClick={() => setQuery("")}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label text-secondary small mb-1">Tipo</label>
                <select
                  className="form-select form-select-sm bg-dark text-light border-secondary"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="all">Todos</option>
                  <option value="clients">Clientes</option>
                  <option value="orders">Pedidos</option>
                  <option value="samples">Amostras</option>
                  {isAdmin && <option value="users">Usuários</option>}
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

        {searchError && <div className="alert alert-danger py-2 small">{searchError}</div>}
        {searching && !searchResult && (
          <LoadingSpinner label="Pesquisando..." />
        )}
        {searchResult && (
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="text-secondary small">
              {totalResults === 0
                ? `Nenhum resultado para "${searchResult.q}"`
                : `${totalResults} resultado${totalResults > 1 ? "s" : ""} para "${searchResult.q}"`}
            </span>
          </div>
        )}

        {/* --- SEÇÕES POR ENTIDADE --- */}
        {searchResult && totalResults > 0 && (
          <>
            {/* Clientes */}
            {searchResult.clients?.length > 0 && (
              <div className="mb-4">
                <h5 className="text-light mb-2">
                  <i className="bi bi-people-fill me-2 text-info"></i>
                  Clientes
                  <span className="badge bg-secondary ms-2">{searchResult.clients.length}</span>
                </h5>
                <div className="table-responsive">
                  <table className="table table-dark table-hover align-middle mb-0">
                    <thead>
                      <tr className="text-secondary small">
                        <th>Nome</th>
                        <th>Código</th>
                        <th className="d-none d-md-table-cell">CNPJ</th>
                        <th className="d-none d-md-table-cell">Emails</th>
                        <th className="d-none d-lg-table-cell">Cidade/UF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchResult.clients.map((c) => (
                        <tr key={c.id} role="button" style={{ cursor: "pointer" }}
                          onClick={() => navigate(`${basePath}/clients/${c.id}/history`)}>
                          <td>{c.name}</td>
                          <td><span className="badge bg-secondary">{c.code || "—"}</span></td>
                          <td className="d-none d-md-table-cell">{c.cnpj || "—"}</td>
                          <td className="d-none d-md-table-cell">{c.emails || "—"}</td>
                          <td className="d-none d-lg-table-cell">{c.city && c.state ? `${c.city}/${c.state}` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pedidos */}
            {searchResult.orders?.length > 0 && (
              <div className="mb-4">
                <h5 className="text-light mb-2">
                  <i className="bi bi-clipboard-data-fill me-2 text-warning"></i>
                  Pedidos
                  <span className="badge bg-secondary ms-2">{searchResult.orders.length}</span>
                </h5>
                <div className="table-responsive">
                  <table className="table table-dark table-hover align-middle mb-0">
                    <thead>
                      <tr className="text-secondary small">
                        <th>#</th>
                        <th>Cliente</th>
                        <th>Status</th>
                        <th>Total</th>
                        <th className="d-none d-md-table-cell">OC</th>
                        <th>Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchResult.orders.map((o) => (
                        <tr key={o.id} role="button" style={{ cursor: "pointer" }}
                          onClick={() => navigate(`${basePath}/orders/${o.id}`)}>
                          <td>{formatOrderId(o.client_code, o.id)}</td>
                          <td>{o.client_name}</td>
                          <td>
                            <span className={`badge bg-${statusColors[o.status]}`}>
                              {statusLabels[o.status]}
                            </span>
                          </td>
                          <td>R$ {parseFloat(o.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                          <td className="d-none d-md-table-cell">{o.purchase_order || "—"}</td>
                          <td>{new Date(o.created_at).toLocaleDateString("pt-BR")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Amostras */}
            {searchResult.samples?.length > 0 && (
              <div className="mb-4">
                <h5 className="text-light mb-2">
                  <i className="bi bi-box-seam me-2 text-success"></i>
                  Amostras
                  <span className="badge bg-secondary ms-2">{searchResult.samples.length}</span>
                </h5>
                <div className="table-responsive">
                  <table className="table table-dark table-hover align-middle mb-0">
                    <thead>
                      <tr className="text-secondary small">
                        <th>Código</th>
                        <th>Cliente</th>
                        <th>Descrição</th>
                        <th>Status</th>
                        <th className="d-none d-md-table-cell">Envio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchResult.samples.map((s) => (
                        <tr key={s.id} role="button" style={{ cursor: "pointer" }}
                          onClick={() => navigate(`${basePath}/samples/${s.id}`)}>
                          <td>{s.code}</td>
                          <td>{s.client_name}</td>
                          <td style={{ maxWidth: 360 }}>
                            <div className="text-truncate">{s.description}</div>
                          </td>
                          <td>
                            <span className={`badge bg-${sampleStatusColors[s.status]}`}>
                              {sampleStatusLabels[s.status]}
                            </span>
                          </td>
                          <td className="d-none d-md-table-cell">
                            {new Date(s.sent_at).toLocaleDateString("pt-BR")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Usuários (admin) */}
            {isAdmin && searchResult.users?.length > 0 && (
              <div className="mb-4">
                <h5 className="text-light mb-2">
                  <i className="bi bi-person-gear me-2 text-primary"></i>
                  Usuários
                  <span className="badge bg-secondary ms-2">{searchResult.users.length}</span>
                </h5>
                <div className="table-responsive">
                  <table className="table table-dark table-hover align-middle mb-0">
                    <thead>
                      <tr className="text-secondary small">
                        <th>Nome</th>
                        <th>Email</th>
                        <th>Papel</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchResult.users.map((u) => (
                        <tr key={u.id} role="button" style={{ cursor: "pointer" }}
                          onClick={() => navigate(`${basePath}/users/${u.id}/edit`)}>
                          <td>{u.name}{u.deleted_at && <span className="text-secondary"> (inativo)</span>}</td>
                          <td>{u.email}</td>
                          <td><span className="badge bg-secondary">{u.role}</span></td>
                          <td>{u.deleted_at ? <span className="text-danger small">inativo</span> : <span className="text-success small">ativo</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
