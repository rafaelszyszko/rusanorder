import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { listDeletedOrders, restoreOrder, permanentDeleteOrder } from "../services/orderService";
import DashboardLayout from "../components/DashboardLayout";
import LoadingSpinner from "../components/LoadingSpinner";
import { useBasePath } from "../hooks/useBasePath";
import { statusLabels, statusColors } from "../constants/orderStatus";
import { formatOrderId } from "../utils/formatOrderId";

export default function OrderTrash() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const basePath = useBasePath();

  const load = () => {
    setLoading(true);
    listDeletedOrders()
      .then(setOrders)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleRestore = async (id) => {
    try {
      await restoreOrder(id);
      setError("");
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const handlePermanentDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await permanentDeleteOrder(deleteTarget.id);
      setError("");
      setDeleteTarget(null);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container-fluid px-4 py-4 flex-grow-1">
        <div className="module-header">
          <h3 className="module-title">Módulo de Lixeira</h3>
          <p className="module-subtitle">Pedidos removidos. Restaure ou exclua permanentemente.</p>
        </div>
        <div className="d-flex justify-content-end mb-3">
          <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate(`${basePath}/orders`)}>
            Voltar aos pedidos
          </button>
        </div>

        {error && <div className="alert alert-danger py-2 small">{error}</div>}

        <div className="table-responsive">
          <table className="table table-dark table-hover align-middle mb-0">
            <thead>
              <tr className="text-secondary small">
                <th>#</th>
                <th>Cliente</th>
                <th>Status</th>
                <th>Total</th>
                <th>Removido em</th>
                <th>Dias na lixeira</th>
                <th className="text-end">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan="7"><LoadingSpinner label="Carregando lixeira..." /></td></tr>
              )}
              {!loading && orders.length === 0 && (
                <tr><td colSpan="7" className="text-center text-secondary py-4">Lixeira vazia</td></tr>
              )}
              {!loading && orders.map((o) => (
                <tr key={o.id}>
                  <td>{formatOrderId(o.client_code, o.id)}</td>
                  <td>{o.client_name}</td>
                  <td><span className={`badge bg-${statusColors[o.status]}`}>{statusLabels[o.status]}</span></td>
                  <td>R$ {parseFloat(o.total).toFixed(2)}</td>
                  <td>{new Date(o.deleted_at).toLocaleDateString("pt-BR")}</td>
                  <td>
                    <span className={`badge ${o.days_in_trash >= 30 ? "bg-danger" : o.days_in_trash >= 15 ? "bg-warning text-dark" : "bg-secondary"}`}>
                      {o.days_in_trash} {o.days_in_trash === 1 ? "dia" : "dias"}
                    </span>
                  </td>
                  <td className="text-end text-nowrap">
                    <button className="btn btn-outline-success btn-sm me-1" onClick={() => handleRestore(o.id)}>
                      Restaurar
                    </button>
                    <button className="btn btn-outline-danger btn-sm" onClick={() => setDeleteTarget(o)}>
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de confirmação de exclusão permanente */}
      {deleteTarget && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.7)" }} onClick={() => setDeleteTarget(null)}>
          <div className="modal-dialog modal-dialog-centered modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content bg-dark border-danger">
              <div className="modal-header border-secondary">
                <h6 className="modal-title text-danger">Exclusão permanente</h6>
                <button type="button" className="btn-close btn-close-white" onClick={() => setDeleteTarget(null)} />
              </div>
              <div className="modal-body">
                <p className="text-white small mb-2">
                  Excluir permanentemente o pedido <strong>{formatOrderId(deleteTarget.client_code, deleteTarget.id)}</strong>?
                </p>
                <p className="text-danger small mb-0">
                  Esta ação não pode ser desfeita. O pedido e todos os seus itens serão removidos do banco de dados.
                </p>
              </div>
              <div className="modal-footer border-secondary">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                  Cancelar
                </button>
                <button className="btn btn-danger btn-sm" onClick={handlePermanentDelete} disabled={deleting}>
                  {deleting ? "Excluindo..." : "Excluir permanentemente"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
