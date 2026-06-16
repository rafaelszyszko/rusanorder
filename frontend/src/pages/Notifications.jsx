import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import LoadingSpinner from "../components/LoadingSpinner";
import { useBasePath } from "../hooks/useBasePath";
import {
  listNotifications,
  markAsRead,
  markAllAsRead,
  archiveBulk,
  archiveNotification,
} from "../services/notificationService";
import {
  notificationTypeLabels,
  notificationTypeIcons,
  notificationTypeColors,
  resourcePath,
  timeAgo,
} from "../constants/notificationTypes";

function groupByDay(items) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7);
  const monthAgo = new Date(today); monthAgo.setDate(today.getDate() - 30);

  const groups = { Hoje: [], Ontem: [], "Esta semana": [], "Este mês": [], "Mais antigas": [] };
  for (const n of items) {
    const d = new Date(n.created_at);
    if (d >= today) groups["Hoje"].push(n);
    else if (d >= yesterday) groups["Ontem"].push(n);
    else if (d >= weekAgo) groups["Esta semana"].push(n);
    else if (d >= monthAgo) groups["Este mês"].push(n);
    else groups["Mais antigas"].push(n);
  }
  return groups;
}

export default function Notifications() {
  const navigate = useNavigate();
  const basePath = useBasePath();
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [selected, setSelected] = useState(new Set());

  const load = () => {
    setLoading(true);
    listNotifications({
      type: filterType || undefined,
      status: filterStatus || undefined,
      search: filterSearch || undefined,
    })
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [filterType, filterStatus, filterSearch]);

  const groups = useMemo(() => groupByDay(items), [items]);

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleClick = async (n) => {
    if (!n.read_at) {
      try { await markAsRead(n.id); } catch { /* ignore */ }
    }
    navigate(resourcePath(n, basePath));
  };

  const handleMarkAll = async () => {
    try { await markAllAsRead(); load(); } catch (e) { setError(e.message); }
  };

  const handleArchiveSelected = async () => {
    if (selected.size === 0) return;
    try {
      await archiveBulk(Array.from(selected));
      setSelected(new Set());
      load();
    } catch (e) { setError(e.message); }
  };

  const handleArchive = async (id) => {
    try { await archiveNotification(id); load(); } catch (e) { setError(e.message); }
  };

  return (
    <DashboardLayout>
      <div className="container-fluid px-4 py-4 flex-grow-1">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3 gap-2">
          <div>
            <h3 className="text-white mb-0">Notificações</h3>
            <p className="text-secondary small mb-0">Sua central de notificações in-app</p>
          </div>
          <div className="d-flex gap-2">
            <button className="btn btn-outline-secondary btn-sm"
              onClick={() => navigate(`${basePath}/notifications/preferences`)}>
              <i className="bi bi-gear me-2"></i>Preferências
            </button>
          </div>
        </div>

        {error && <div className="alert alert-danger py-2 small">{error}</div>}

        {/* Ações em lote */}
        <div className="d-flex flex-wrap gap-2 mb-3">
          <button className="btn btn-outline-primary btn-sm" onClick={handleMarkAll}>
            Marcar todas como lidas
          </button>
          <button className="btn btn-outline-secondary btn-sm" disabled={selected.size === 0} onClick={handleArchiveSelected}>
            Arquivar selecionadas ({selected.size})
          </button>
        </div>

        {/* Filtros */}
        <div className="card bg-dark border-secondary mb-3">
          <div className="card-body py-3">
            <div className="row g-2 align-items-end">
              <div className="col-md-3">
                <label className="form-label small text-secondary mb-1">Tipo</label>
                <select className="form-select form-select-sm bg-dark text-light border-secondary"
                  value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                  <option value="">Todos</option>
                  {Object.entries(notificationTypeLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label small text-secondary mb-1">Estado</label>
                <select className="form-select form-select-sm bg-dark text-light border-secondary"
                  value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="">Não arquivadas</option>
                  <option value="unread">Não lidas</option>
                  <option value="read">Lidas</option>
                  <option value="archived">Arquivadas</option>
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label small text-secondary mb-1">Buscar</label>
                <input type="text" className="form-control form-control-sm bg-dark text-light border-secondary"
                  placeholder="Título ou descrição..."
                  value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* Lista agrupada */}
        {loading && <LoadingSpinner label="Carregando notificações..." />}
        {!loading && items.length === 0 && (
          <p className="text-center text-secondary py-4">Você não tem notificações com esses filtros.</p>
        )}

        {!loading && Object.entries(groups).map(([groupName, list]) => list.length > 0 && (
          <div key={groupName} className="mb-3">
            <h6 className="text-secondary small text-uppercase mb-2">{groupName}</h6>
            <div className="card bg-dark border-secondary">
              {list.map((n) => (
                <div key={n.id} className="d-flex gap-2 p-3 border-bottom border-secondary"
                  style={{ background: n.read_at ? "transparent" : "rgba(13,110,253,0.05)" }}>
                  <input type="checkbox" className="form-check-input" checked={selected.has(n.id)} onChange={() => toggleSelect(n.id)} />
                  <div style={{ width: 28, textAlign: "center" }}>
                    <i className={`bi ${notificationTypeIcons[n.type] || "bi-bell"}`}
                       style={{ color: notificationTypeColors[n.type], fontSize: "1.2rem" }} />
                  </div>
                  <div className="flex-grow-1" role="button" onClick={() => handleClick(n)}>
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <div className="text-light" style={{ fontWeight: n.read_at ? 400 : 600 }}>{n.title}</div>
                        {n.description && <div className="text-secondary small">{n.description}</div>}
                      </div>
                      <span className="text-secondary small ms-2">{timeAgo(n.created_at)}</span>
                    </div>
                    <div className="small text-secondary mt-1">
                      {notificationTypeLabels[n.type] || n.type} · {new Date(n.created_at).toLocaleString("pt-BR")}
                    </div>
                  </div>
                  <div className="d-flex gap-1 align-items-start">
                    {!n.archived_at && (
                      <button className="btn btn-sm btn-link text-secondary p-0"
                        onClick={() => handleArchive(n.id)} title="Arquivar"
                        style={{ textDecoration: "none" }}>
                        <i className="bi bi-archive"></i>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
