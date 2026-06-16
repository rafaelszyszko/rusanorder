import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { listOrders, deleteOrder, updateOrderStatus } from "../services/orderService";
import DashboardLayout from "../components/DashboardLayout";
import ConfirmModal from "../components/ConfirmModal";
import LoadingSpinner from "../components/LoadingSpinner";
import { useBasePath } from "../hooks/useBasePath";
import { statusLabels, statusColors, allStatuses, validTransitions } from "../constants/orderStatus";
import { formatOrderId } from "../utils/formatOrderId";

const SORTABLE_COLUMNS = {
  id: { label: "#", getValue: (o) => o.id },
  client_name: { label: "Cliente", getValue: (o) => o.client_name.toLowerCase() },
  status: { label: "Status", getValue: (o) => o.status },
  total: { label: "Total", getValue: (o) => parseFloat(o.total) },
  created_at: { label: "Data / Hora", getValue: (o) => new Date(o.created_at).getTime() },
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function SortHeader({ column, sortKey, sortDir, onSort, className = "" }) {
  const active = sortKey === column;
  const arrow = active ? (sortDir === "asc" ? " \u25B2" : " \u25BC") : "";
  return (
    <th
      role="button"
      className={`user-select-none ${className}`}
      style={{ cursor: "pointer", whiteSpace: "nowrap" }}
      onClick={() => onSort(column)}
    >
      {SORTABLE_COLUMNS[column].label}
      <span style={{ fontSize: "0.65rem", opacity: active ? 1 : 0.3 }}>
        {active ? arrow : " \u25BC"}
      </span>
    </th>
  );
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [error, setError] = useState("");
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const navigate = useNavigate();
  const basePath = useBasePath();
  const isAdmin = localStorage.getItem("role") === "admin";

  // Batch selection state
  const [selected, setSelected] = useState(new Set());
  const [batchStatus, setBatchStatus] = useState("");
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResults, setBatchResults] = useState(null); // { success: [], errors: [] }
  const [confirmModal, setConfirmModal] = useState({ show: false, title: "", message: "", variant: "danger", confirmLabel: "Confirmar", onConfirm: null });

  const load = () => {
    setLoading(true);
    listOrders()
      .then(setOrders)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleDelete = (id) => {
    setConfirmModal({
      show: true,
      title: "Excluir pedido",
      message: `Excluir pedido #${id}?`,
      variant: "danger",
      confirmLabel: "Excluir",
      onConfirm: async () => {
        setConfirmModal((m) => ({ ...m, show: false }));
        try { await deleteOrder(id); load(); } catch (e) { setError(e.message); }
      },
    });
  };

  const handleStatus = async (id, newStatus, currentStatus) => {
    if (newStatus === currentStatus) return;
    try {
      await updateOrderStatus(id, newStatus);
      setError("");
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleSort = (column) => {
    if (sortKey === column) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(column);
      setSortDir(column === "created_at" || column === "total" ? "desc" : "asc");
    }
  };

  // Batch selection handlers
  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setBatchResults(null);
  };

  const toggleSelectAll = () => {
    if (selected.size === paginatedOrders.length && paginatedOrders.every((o) => selected.has(o.id))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paginatedOrders.map((o) => o.id)));
    }
    setBatchResults(null);
  };

  const clearSelection = () => {
    setSelected(new Set());
    setBatchStatus("");
    setBatchResults(null);
  };

  // Batch status change
  const handleBatchStatusChange = () => {
    if (!batchStatus || selected.size === 0) return;

    const targetLabel = statusLabels[batchStatus];
    const count = selected.size;
    setConfirmModal({
      show: true,
      title: "Alteração em lote",
      message: `Alterar ${count} pedido${count > 1 ? "s" : ""} para "${targetLabel}"?`,
      variant: "primary",
      confirmLabel: "Aplicar",
      onConfirm: () => {
        setConfirmModal((m) => ({ ...m, show: false }));
        executeBatchStatusChange();
      },
    });
  };

  const executeBatchStatusChange = async () => {
    const targetLabel = statusLabels[batchStatus];
    setBatchLoading(true);
    setBatchResults(null);
    setError("");

    const selectedOrders = orders.filter((o) => selected.has(o.id));
    const success = [];
    const errors = [];

    // Pre-validate transitions on the frontend
    for (const order of selectedOrders) {
      const allowed = validTransitions[order.status] || [];
      if (!allowed.includes(batchStatus)) {
        errors.push({
          id: order.id,
          orderId: formatOrderId(order.client_code, order.id),
          client: order.client_name,
          currentStatus: statusLabels[order.status],
          message: `Transição inválida: ${statusLabels[order.status]} → ${targetLabel}. Transições permitidas: ${allowed.map((s) => statusLabels[s]).join(", ") || "nenhuma"}`,
        });
        continue;
      }

      try {
        await updateOrderStatus(order.id, batchStatus);
        success.push({
          id: order.id,
          orderId: formatOrderId(order.client_code, order.id),
          client: order.client_name,
        });
      } catch (e) {
        errors.push({
          id: order.id,
          orderId: formatOrderId(order.client_code, order.id),
          client: order.client_name,
          currentStatus: statusLabels[order.status],
          message: e.message,
        });
      }
    }

    setBatchResults({ success, errors });
    setBatchLoading(false);
    setBatchStatus("");

    if (success.length > 0) {
      // Remove successfully changed orders from selection
      setSelected((prev) => {
        const next = new Set(prev);
        success.forEach((s) => next.delete(s.id));
        return next;
      });
      load();
    }
  };

  // Lista de clientes únicos para o filtro
  const clientNames = useMemo(() => {
    const names = [...new Set(orders.map((o) => o.client_name))];
    return names.sort();
  }, [orders]);

  const sortedFiltered = useMemo(() => {
    let list = [...orders];

    // Filtro por status
    if (filterStatus) list = list.filter((o) => o.status === filterStatus);

    // Filtro por cliente
    if (filterClient) list = list.filter((o) => o.client_name === filterClient);

    // Filtro por busca (ID, OC, observações)
    if (filterSearch.trim()) {
      const q = filterSearch.toLowerCase().trim();
      list = list.filter((o) =>
        formatOrderId(o.client_code, o.id).toLowerCase().includes(q) ||
        (o.purchase_order && o.purchase_order.toLowerCase().includes(q)) ||
        (o.notes && o.notes.toLowerCase().includes(q)) ||
        o.client_name.toLowerCase().includes(q)
      );
    }

    // Filtro por data
    if (filterDateFrom) {
      const from = new Date(filterDateFrom + "T00:00:00").getTime();
      list = list.filter((o) => new Date(o.created_at).getTime() >= from);
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo + "T23:59:59").getTime();
      list = list.filter((o) => new Date(o.created_at).getTime() <= to);
    }

    // Ordenação
    const { getValue } = SORTABLE_COLUMNS[sortKey];
    list.sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [orders, filterStatus, filterClient, filterSearch, filterDateFrom, filterDateTo, sortKey, sortDir]);

  // Paginação
  const totalPages = Math.max(1, Math.ceil(sortedFiltered.length / pageSize));
  const safeePage = Math.min(page, totalPages);
  const paginatedOrders = sortedFiltered.slice((safeePage - 1) * pageSize, safeePage * pageSize);

  // Reset para página 1 quando filtros mudam
  useEffect(() => { setPage(1); }, [filterStatus, filterClient, filterSearch, filterDateFrom, filterDateTo, pageSize]);

  // Clear selection when page/filters change
  useEffect(() => { setSelected(new Set()); setBatchResults(null); }, [page, filterStatus, filterClient, filterSearch, filterDateFrom, filterDateTo, pageSize]);

  const hasActiveFilters = filterStatus || filterClient || filterSearch || filterDateFrom || filterDateTo;

  const clearFilters = () => {
    setFilterStatus("");
    setFilterClient("");
    setFilterSearch("");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  const allPageSelected = paginatedOrders.length > 0 && paginatedOrders.every((o) => selected.has(o.id));
  const somePageSelected = paginatedOrders.some((o) => selected.has(o.id));

  // Compute common valid transitions for selected orders
  const batchTransitions = useMemo(() => {
    if (selected.size === 0) return [];
    const selectedOrders = orders.filter((o) => selected.has(o.id));
    // Get union of all possible target statuses from selected orders
    const targetCounts = {};
    selectedOrders.forEach((o) => {
      const allowed = validTransitions[o.status] || [];
      allowed.forEach((s) => {
        targetCounts[s] = (targetCounts[s] || 0) + 1;
      });
    });
    // Return all statuses that at least one selected order can transition to, sorted by frequency
    return Object.entries(targetCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([status, count]) => ({ status, count, total: selectedOrders.length }));
  }, [selected, orders]);

  return (
    <DashboardLayout>
      <div className="container-fluid px-4 py-4 flex-grow-1">
        <div className="module-header">
          <h3 className="module-title">Módulo de Pedidos</h3>
          <p className="module-subtitle">Gerenciamento de pedidos</p>
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
            <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate(`${basePath}/orders/trash`)}>Lixeira</button>
            <button className="btn btn-primary btn-sm" onClick={() => navigate(`${basePath}/orders/new`)}>+ Novo pedido</button>
          </div>
        </div>
        {error && <div className="alert alert-danger py-2 small">{error}</div>}

        {/* Batch results feedback */}
        {batchResults && (
          <div className="mb-3">
            {batchResults.success.length > 0 && (
              <div className="alert alert-success py-2 small mb-2">
                <i className="bi bi-check-circle-fill me-1"></i>
                <strong>{batchResults.success.length}</strong> pedido{batchResults.success.length > 1 ? "s" : ""} alterado{batchResults.success.length > 1 ? "s" : ""} com sucesso.
              </div>
            )}
            {batchResults.errors.length > 0 && (
              <div className="alert alert-danger py-2 small mb-0">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <i className="bi bi-exclamation-triangle-fill me-1"></i>
                    <strong>{batchResults.errors.length}</strong> pedido{batchResults.errors.length > 1 ? "s" : ""} não {batchResults.errors.length > 1 ? "puderam" : "pôde"} ser alterado{batchResults.errors.length > 1 ? "s" : ""}:
                  </div>
                  <button
                    className="btn-close btn-close-white btn-sm"
                    onClick={() => setBatchResults(null)}
                    style={{ fontSize: "0.6rem" }}
                  ></button>
                </div>
                <ul className="mb-0 mt-1 ps-3">
                  {batchResults.errors.map((err) => (
                    <li key={err.id}>
                      <strong>{err.orderId}</strong> ({err.client}) — {err.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Batch action bar */}
        {selected.size > 0 && (
          <div
            className="card border-secondary mb-3"
            style={{
              background: "var(--accent-bg)",
              borderColor: "var(--accent-border)",
            }}
          >
            <div className="card-body py-2 px-3">
              <div className="d-flex align-items-center gap-3 flex-wrap">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-check2-square" style={{ color: "var(--accent)", fontSize: "1.1rem" }}></i>
                  <span className="fw-semibold" style={{ color: "var(--text-h)", fontSize: "0.85rem" }}>
                    {selected.size} pedido{selected.size > 1 ? "s" : ""} selecionado{selected.size > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="d-flex align-items-center gap-2 flex-grow-1">
                  <label className="small mb-0" style={{ color: "var(--text)", whiteSpace: "nowrap" }}>Alterar para:</label>
                  <select
                    className="form-select form-select-sm bg-dark text-light border-secondary"
                    style={{ maxWidth: "220px" }}
                    value={batchStatus}
                    onChange={(e) => setBatchStatus(e.target.value)}
                    disabled={batchLoading}
                  >
                    <option value="">Selecione o status...</option>
                    {batchTransitions.map(({ status, count, total }) => (
                      <option key={status} value={status}>
                        {statusLabels[status]} ({count}/{total} compatíveis)
                      </option>
                    ))}
                  </select>

                  <button
                    className="btn btn-primary btn-sm"
                    disabled={!batchStatus || batchLoading}
                    onClick={handleBatchStatusChange}
                  >
                    {batchLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                        Processando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-arrow-repeat me-1"></i>
                        Aplicar
                      </>
                    )}
                  </button>
                </div>

                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={clearSelection}
                  disabled={batchLoading}
                >
                  Limpar seleção
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="card bg-dark border-secondary mb-3">
          <div className="card-body py-2 px-3">
            <div className="row g-2 align-items-end">
              <div className="col-12 col-md-3">
                <label className="form-label text-secondary small mb-1">Buscar</label>
                <input
                  type="text"
                  className="form-control form-control-sm bg-dark text-light border-secondary"
                  placeholder="ID, OC, cliente, obs..."
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                />
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label text-secondary small mb-1">Status</label>
                <select className="form-select form-select-sm bg-dark text-light border-secondary" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="">Todos</option>
                  {allStatuses.map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}
                </select>
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label text-secondary small mb-1">Cliente</label>
                <select className="form-select form-select-sm bg-dark text-light border-secondary" value={filterClient} onChange={(e) => setFilterClient(e.target.value)}>
                  <option value="">Todos</option>
                  {clientNames.map((n) => <option key={n} value={n}>{n}</option>)}
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

        {/* Contagem de resultados */}
        <div className="d-flex justify-content-between align-items-center mb-2">
          <span className="text-secondary small">
            {sortedFiltered.length} pedido{sortedFiltered.length !== 1 ? "s" : ""} encontrado{sortedFiltered.length !== 1 ? "s" : ""}
            {sortedFiltered.length > pageSize && ` — mostrando ${(safeePage - 1) * pageSize + 1}–${Math.min(safeePage * pageSize, sortedFiltered.length)}`}
          </span>
        </div>

        <div className="table-responsive">
          <table className="table table-dark table-hover align-middle mb-0">
            <thead>
              <tr className="text-secondary small">
                <th style={{ width: "40px" }}>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={allPageSelected}
                    ref={(el) => { if (el) el.indeterminate = somePageSelected && !allPageSelected; }}
                    onChange={toggleSelectAll}
                    title="Selecionar todos da página"
                  />
                </th>
                <SortHeader column="id" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortHeader column="client_name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortHeader column="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortHeader column="total" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortHeader column="created_at" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                {isAdmin && <th className="text-end">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={isAdmin ? 7 : 6}><LoadingSpinner label="Carregando pedidos..." /></td></tr>
              )}
              {!loading && paginatedOrders.length === 0 && (
                <tr><td colSpan={isAdmin ? 7 : 6} className="text-center text-secondary py-4">Nenhum pedido</td></tr>
              )}
              {paginatedOrders.map((o) => {
                const allowed = validTransitions[o.status] || [];
                const dt = new Date(o.created_at);
                const isSelected = selected.has(o.id);
                const rowClick = (e) => {
                  // Don't navigate if clicking on interactive elements
                  if (e.target.closest("input, select, button")) return;
                  navigate(`${basePath}/orders/${o.id}`);
                };
                return (
                  <tr
                    key={o.id}
                    role="button"
                    onClick={rowClick}
                    className={isSelected ? "table-active" : ""}
                    style={{ cursor: "pointer", ...(isSelected ? { background: "var(--accent-bg)" } : {}) }}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={isSelected}
                        onChange={() => toggleSelect(o.id)}
                      />
                    </td>
                    <td>
                      <div>{formatOrderId(o.client_code, o.id)}</div>
                      {o.purchase_order && <div className="text-secondary" style={{ fontSize: "0.7rem" }}>OC: {o.purchase_order}</div>}
                    </td>
                    <td>{o.client_name}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {isAdmin && allowed.length > 0 ? (
                        <select
                          className="form-select form-select-sm bg-dark border-secondary text-light"
                          style={{ width: "200px" }}
                          value={o.status}
                          onChange={(e) => handleStatus(o.id, e.target.value, o.status)}
                        >
                          <option value={o.status}>{statusLabels[o.status]}</option>
                          {allowed.map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}
                        </select>
                      ) : (
                        <span className={`badge bg-${statusColors[o.status]}`}>{statusLabels[o.status]}</span>
                      )}
                    </td>
                    <td>R$ {parseFloat(o.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <div className="text-white">{dt.toLocaleDateString("pt-BR")}</div>
                      <div className="text-secondary" style={{ fontSize: "0.75rem" }}>{dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
                    </td>
                    {isAdmin && (
                      <td className="text-end text-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button className="btn btn-outline-danger btn-sm" onClick={() => handleDelete(o.id)}>Excluir</button>
                      </td>
                    )}
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
              Página {safeePage} de {totalPages}
            </span>
            <div className="d-flex gap-1">
              <button
                className="btn btn-outline-secondary btn-sm"
                disabled={safeePage <= 1}
                onClick={() => setPage(1)}
              >
                &laquo;
              </button>
              <button
                className="btn btn-outline-secondary btn-sm"
                disabled={safeePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                &lsaquo;
              </button>
              {(() => {
                const pages = [];
                let start = Math.max(1, safeePage - 2);
                let end = Math.min(totalPages, safeePage + 2);
                if (end - start < 4) {
                  if (start === 1) end = Math.min(totalPages, start + 4);
                  else start = Math.max(1, end - 4);
                }
                for (let i = start; i <= end; i++) {
                  pages.push(
                    <button
                      key={i}
                      className={`btn btn-sm ${i === safeePage ? "btn-primary" : "btn-outline-secondary"}`}
                      onClick={() => setPage(i)}
                    >
                      {i}
                    </button>
                  );
                }
                return pages;
              })()}
              <button
                className="btn btn-outline-secondary btn-sm"
                disabled={safeePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                &rsaquo;
              </button>
              <button
                className="btn btn-outline-secondary btn-sm"
                disabled={safeePage >= totalPages}
                onClick={() => setPage(totalPages)}
              >
                &raquo;
              </button>
            </div>
          </div>
        )}
      </div>
      <ConfirmModal
        show={confirmModal.show}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        confirmLabel={confirmModal.confirmLabel}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((m) => ({ ...m, show: false }))}
      />
    </DashboardLayout>
  );
}
